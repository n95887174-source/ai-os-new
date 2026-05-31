import type { SystemState, ProviderState } from '../types/metrics-types';
import type { ICostCalculator } from '../contracts/pricing';
import { estimateTokens } from '../utils/tokenEstimate';

const ALPHA = 0.15;

export interface ProviderMetricData {
  provider: string;
  tokens?: number;
  fullContent?: string;
  latency: number;
  ttft?: number;
  model?: string;
}

export interface IProviderTracker {
  updateProviderMetric(state: SystemState, data: ProviderMetricData): void;
  updateProviderError(state: SystemState, data: { provider: string }): void;
  calculateSelectionRates(state: SystemState): void;
}

export interface ProviderTrackerDeps {
  costCalculator?: ICostCalculator;
  database?: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
}

export type HealthEventType = 'latency_spike' | 'error_burst' | 'status_change' | 'rate_limit' | 'recovery';

export interface HealthEvent {
  provider: string;
  type: HealthEventType;
  detail: string;
  timestamp: number;
}

export class ProviderTracker implements IProviderTracker {
  private costCalculator?: ICostCalculator;
  private database?: { getKv: <T>(id: string) => Promise<T | null>; setKv: <T>(id: string, value: T) => Promise<void> };
  private healthEvents: HealthEvent[] = [];
  private prevStatuses = new Map<string, string>();
  private latencyWarnings = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private static readonly MAX_HEALTH_EVENTS = 200;
  private static readonly STORAGE_KEY = 'provider_tracker_health_events';
  private static readonly METRICS_KEY = 'provider_tracker_metrics';

  constructor(deps?: ProviderTrackerDeps) {
    this.costCalculator = deps?.costCalculator;
    this.database = deps?.database;
    void this.loadHealthEvents();
  }

  async hydrateState(state: SystemState): Promise<void> {
    if (!this.database) return;
    try {
      const saved = await this.database.getKv<Record<string, ProviderState>>(ProviderTracker.METRICS_KEY);
      if (saved && typeof saved === 'object') {
        for (const [id, prov] of Object.entries(saved)) {
          if (!state.providers[id]) state.providers[id] = prov;
          else state.providers[id] = { ...state.providers[id], ...prov };
        }
      }
    } catch { /* silent */ }
  }

  persistProviderMetrics(state: SystemState): void {
    if (!this.database) return;
    void this.database.setKv(ProviderTracker.METRICS_KEY, state.providers).catch(() => {});
  }

  getHealthEvents(provider?: string, limit = 100): HealthEvent[] {
    const events = provider
      ? this.healthEvents.filter(e => e.provider === provider)
      : [...this.healthEvents];
    return events.reverse().slice(0, limit);
  }

  /** Mutates `state` in-place — caller owns the state object (internal kernel state). */
  updateProviderMetric(state: SystemState, data: ProviderMetricData): void {
    const p = data.provider.toLowerCase();
    const base = state.providers[p] || this.getDefaultProvider(data.provider);
    const prev = { ...base };

    const tokens = data.tokens || estimateTokens(data.fullContent || '');
    const genTime = (data.latency - (data.ttft || 0)) / 1000;
    const currentTPS = genTime > 0 ? tokens / genTime : prev.avgTPS;

    prev.avgTTFT = data.ttft ? (ALPHA * data.ttft) + (1 - ALPHA) * prev.avgTTFT : prev.avgTTFT;
    prev.avgTPS = (ALPHA * currentTPS) + (1 - ALPHA) * prev.avgTPS;
    const quality = data.ttft && data.latency ? Math.max(0, Math.min(1, 1 - (data.ttft / data.latency))) : 0.9;
    prev.reliability = (ALPHA * quality) + (1 - ALPHA) * prev.reliability;
    prev.stabilityIndex = Math.min(1.0, (ALPHA * quality) + (1 - ALPHA) * prev.stabilityIndex);
    prev.reputationScore = Math.min(100, (ALPHA * 100) + (1 - ALPHA) * prev.reputationScore);
    prev.status = prev.reliability > 0.8 ? 'healthy' : prev.reliability > 0.4 ? 'degraded' : 'offline';
    prev.totalRequests++;
    state.providers[p] = prev;
    state.totalRequests++;
    state.totalTokens += tokens;

    if (this.costCalculator && data.model) {
      const model = data.model.toLowerCase();
      const inputTokens = Math.ceil(tokens * 0.3);
      const outputTokens = tokens - inputTokens;
      const requestCost = this.costCalculator.calculateCost(model, inputTokens, outputTokens);
      state.estimatedCost += requestCost;
      prev.estimatedCost = (prev.estimatedCost || 0) + requestCost;
      state.providers[p] = prev;
    }

    state.history.push({ timestamp: Date.now(), ttft: prev.avgTTFT, tps: prev.avgTPS, reliability: prev.reliability });
    if (state.history.length > 100) state.history.shift();

    this.detectLatencySpike(p, data);
    if (data.ttft && this.detectRecovery(p, prev, base)) this.recordHealthEvent(p, 'recovery', `TTFT improved to ${data.ttft}ms`);
    this.detectStatusChange(p, base.status, prev.status);
  }

  updateProviderError(state: SystemState, data: { provider: string }): void {
    const p = data.provider.toLowerCase();
    const base = state.providers[p] || this.getDefaultProvider(data.provider);
    const prev = { ...base };
    prev.reliability = (ALPHA * 0) + (1 - ALPHA) * prev.reliability;
    prev.stabilityIndex = Math.max(0, (ALPHA * 0) + (1 - ALPHA) * prev.stabilityIndex);
    prev.reputationScore = Math.max(0, (ALPHA * 0) + (1 - ALPHA) * prev.reputationScore);
    prev.totalRequests++;
    state.providers[p] = prev;
    state.totalRequests++;
    this.detectErrorBurst(p, prev);
    this.detectStatusChange(p, base.status, prev.status);
  }

  calculateSelectionRates(state: SystemState): void {
    const total = state.decisions.length;
    if (total === 0) return;
    const counts: Record<string, number> = {};
    state.decisions.forEach(d => { counts[d.selected] = (counts[d.selected] || 0) + 1; });
    Object.keys(state.providers).forEach(p => { state.providers[p].selectionRate = (counts[p] || 0) / total; });
  }

  private recordHealthEvent(provider: string, type: HealthEventType, detail: string): void {
    this.healthEvents.push({ provider, type, detail, timestamp: Date.now() });
    if (this.healthEvents.length > ProviderTracker.MAX_HEALTH_EVENTS) this.healthEvents.shift();
    this.saveHealthEvents();
  }

  private async saveHealthEvents(): Promise<void> {
    if (!this.database) return;
    try {
      await this.database.setKv(ProviderTracker.STORAGE_KEY, this.healthEvents);
    } catch { /* silent */ }
  }

  private async loadHealthEvents(): Promise<void> {
    if (!this.database) return;
    try {
      const saved = await this.database.getKv<HealthEvent[]>(ProviderTracker.STORAGE_KEY);
      if (saved && Array.isArray(saved)) this.healthEvents = saved.slice(-ProviderTracker.MAX_HEALTH_EVENTS);
    } catch { /* silent */ }
  }

  private detectLatencySpike(provider: string, data: ProviderMetricData): void {
    if (!data.ttft) return;
    const prev = this.latencyWarnings.get(provider) ?? 0;
    if (data.ttft > 5000 && Date.now() - prev > 30_000) {
      this.recordHealthEvent(provider, 'latency_spike', `TTFT spike: ${data.ttft}ms`);
      this.latencyWarnings.set(provider, Date.now());
    }
  }

  private detectErrorBurst(provider: string, state: ProviderState): void {
    const count = (this.errorCounts.get(provider) ?? 0) + 1;
    this.errorCounts.set(provider, count);
    if (count === 5) {
      this.recordHealthEvent(provider, 'error_burst', `5 consecutive errors, reliability: ${state.reliability.toFixed(2)}`);
      this.errorCounts.set(provider, 0);
    }
  }

  private detectRecovery(provider: string, current: ProviderState, previous: ProviderState): boolean {
    return previous.reliability < 0.4 && current.reliability >= 0.4;
  }

  private detectStatusChange(provider: string, oldStatus: string, newStatus: string): void {
    const prev = this.prevStatuses.get(provider) ?? oldStatus;
    if (prev !== newStatus) {
      this.recordHealthEvent(provider, 'status_change', `${prev} → ${newStatus}`);
      this.prevStatuses.set(provider, newStatus);
    }
  }

  getProviderRankings(
    state: SystemState,
    catalogProviders: string[] = [],
  ): Array<{
    provider: string; score: number; reliability: number; avgLatency: number; requests: number;
    costPerRequest: number; recommendation: 'recommended' | 'good' | 'fair' | 'avoid';
    installed: boolean;
  }> {
    const installed = new Set(catalogProviders.map(p => p.toLowerCase()));
    const seen = new Set<string>();
    const rankings: Array<{
      provider: string; score: number; reliability: number; avgLatency: number; requests: number;
      costPerRequest: number; recommendation: 'recommended' | 'good' | 'fair' | 'avoid';
      installed: boolean;
    }> = [];

    const pushRanking = (id: string, p: ProviderState) => {
      const norm = id.toLowerCase();
      if (seen.has(norm)) return;
      seen.add(norm);
      const reliability = p.reliability || 0;
      const latencyPenalty = Math.min(1, p.avgTTFT / 3000);
      const hasTraffic = p.totalRequests > 0;
      const score = hasTraffic
        ? reliability * 0.5 + (1 - latencyPenalty) * 0.3 + (p.selectionRate || 0) * 0.2
        : installed.has(norm) ? 0.45 : 0;
      const costPerRequest = hasTraffic && (p.estimatedCost || 0) > 0
        ? (p.estimatedCost || 0) / p.totalRequests
        : 0;
      const recommendation = !hasTraffic
        ? (installed.has(norm) ? 'fair' : 'fair')
        : score > 0.8 ? 'recommended' : score > 0.6 ? 'good' : score > 0.3 ? 'fair' : 'avoid';
      rankings.push({
        provider: norm,
        score,
        reliability,
        avgLatency: p.avgTTFT,
        requests: p.totalRequests,
        costPerRequest,
        recommendation,
        installed: installed.has(norm),
      });
    };

    for (const [id, p] of Object.entries(state.providers)) {
      if (p.totalRequests > 0 || installed.has(id.toLowerCase())) {
        pushRanking(id, p);
      }
    }

    for (const raw of catalogProviders) {
      const id = raw.toLowerCase();
      if (seen.has(id)) continue;
      pushRanking(id, state.providers[id] || this.getDefaultProvider(raw));
    }

    return rankings.sort((a, b) => b.score - a.score);
  }

  getCollaborativeSuggestions(
    state: SystemState,
    installedProviders: string[] = [],
  ): Array<{ provider: string; reason: string; matchScore: number }> {
    const installed = new Set(installedProviders.map(p => p.toLowerCase()));
    const suggestions: Array<{ provider: string; reason: string; matchScore: number }> = [];
    const coOccurrence = new Map<string, Map<string, number>>();

    for (const decision of state.decisions) {
      const top = decision.scores.slice(0, 4).map(s => s.p.toLowerCase());
      for (let i = 0; i < top.length; i++) {
        for (let j = i + 1; j < top.length; j++) {
          this.bumpCoOccurrence(coOccurrence, top[i], top[j]);
        }
      }
    }

    for (const prov of installed) {
      const partners = coOccurrence.get(prov);
      if (!partners) continue;
      const ranked = [...partners.entries()].sort((a, b) => b[1] - a[1]);
      for (const [candidate, weight] of ranked) {
        if (installed.has(candidate)) continue;
        const matchScore = Math.min(0.95, 0.55 + weight * 0.08);
        suggestions.push({
          provider: candidate,
          reason: `Often competes with ${prov} in routing (${weight} co-ranked decisions)`,
          matchScore,
        });
        break;
      }
    }

    const heuristicPairs: Array<[string, string, string, number]> = [
      ['openai', 'anthropic', 'Pairs well for reasoning diversity', 0.82],
      ['gemini', 'groq', 'Low-latency complement to Gemini', 0.75],
      ['openrouter', 'nvidia', 'Self-hosted NIM alternative to OpenRouter', 0.68],
      ['groq', 'deepseek', 'Cost-effective coding alongside Groq', 0.71],
    ];
    for (const [a, b, reason, score] of heuristicPairs) {
      if (installed.has(a) && !installed.has(b)) {
        suggestions.push({ provider: b, reason, matchScore: score });
      }
    }

    const knownProviders = ['openai', 'anthropic', 'gemini', 'groq', 'nvidia', 'openrouter', 'deepseek', 'mistral', 'cohere', 'cloudflare', 'together', 'fireworks', 'cerebras'];
    for (const p of knownProviders) {
      if (!installed.has(p) && !suggestions.some(s => s.provider === p)) {
        const used = state.providers[p]?.totalRequests || 0;
        if (used > 0) {
          suggestions.push({ provider: p, reason: 'Had traffic before — consider re-adding keys', matchScore: 0.58 });
        }
      }
    }

    const deduped = new Map<string, { provider: string; reason: string; matchScore: number }>();
    for (const s of suggestions.sort((a, b) => b.matchScore - a.matchScore)) {
      const prev = deduped.get(s.provider);
      if (!prev || prev.matchScore < s.matchScore) deduped.set(s.provider, s);
    }
    return [...deduped.values()].sort((a, b) => b.matchScore - a.matchScore);
  }

  private bumpCoOccurrence(map: Map<string, Map<string, number>>, a: string, b: string): void {
    if (!a || !b || a === b) return;
    const bump = (x: string, y: string) => {
      if (!map.has(x)) map.set(x, new Map());
      const inner = map.get(x)!;
      inner.set(y, (inner.get(y) || 0) + 1);
    };
    bump(a, b);
    bump(b, a);
  }

  private getDefaultProvider(id: string): ProviderState {
    return {
      id,
      avgTTFT: 800,
      avgTPS: 20,
      reliability: 1,
      stabilityIndex: 1.0,
      reputationScore: 100,
      totalRequests: 0,
      selectionRate: 0,
      status: 'healthy',
    };
  }
}
