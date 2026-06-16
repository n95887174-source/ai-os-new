import type { SystemState, ProviderState } from '../types/metrics-types';
import type { ICostCalculator } from '../contracts/pricing';
import type { IKeyStateStore, KeyState } from '../contracts/key-state';
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
  keyStateStore?: IKeyStateStore;
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
  private keyStateStore?: IKeyStateStore;
  private database?: { getKv: <T>(id: string) => Promise<T | null>; setKv: <T>(id: string, value: T) => Promise<void> };
  private transientHealthEvents: HealthEvent[] = [];
  private latencyWarnings = new Map<string, number>();
  private errorCounts = new Map<string, number>();
  private static readonly MAX_HEALTH_EVENTS = 100;
  private static readonly METRICS_KEY = 'provider_tracker_metrics';

  constructor(deps?: ProviderTrackerDeps) {
    this.costCalculator = deps?.costCalculator;
    this.keyStateStore = deps?.keyStateStore;
    this.database = deps?.database;
  }

  async hydrateState(state: SystemState): Promise<void> {
    if (!this.database) return;
    try {
      const saved = await this.database.getKv<Record<string, ProviderState>>(ProviderTracker.METRICS_KEY);
      if (saved && typeof saved === 'object') {
        for (const [id, prov] of Object.entries(saved)) {
          if (!state.providers[id]) {
            state.providers[id] = prov;
          } else {
            // B10-117: Prefer saved state only if it's newer (has more requests or recent timestamp)
            const savedTs = (prov as unknown as { _savedAt?: number })._savedAt ?? 0;
            const curTs = (state.providers[id] as unknown as { _savedAt?: number })._savedAt ?? 0;
            if (savedTs >= curTs) state.providers[id] = { ...state.providers[id], ...prov };
          }
        }
      }
    } catch (e) { console.warn('[ProviderTracker] Failed to restore persisted state', e); }
  }

  persistProviderMetrics(state: SystemState): void {
    if (!this.database) return;
    void this.database.setKv(ProviderTracker.METRICS_KEY, state.providers).catch(e => console.warn('[ProviderTracker] Persist metrics failed:', e));
  }

  getHealthEvents(provider?: string, limit = 100): HealthEvent[] {
    const normalizedProvider = provider?.toLowerCase();
    const events = [
      ...this.deriveHealthEventsFromKeyState(),
      ...this.transientHealthEvents,
    ];
    return events
      .filter(event => !normalizedProvider || event.provider.toLowerCase() === normalizedProvider)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /** Mutates `state` in-place — caller owns the state object (internal kernel state). */
  updateProviderMetric(state: SystemState, data: ProviderMetricData): void {
    const p = data.provider.toLowerCase();
    const base = state.providers[p] || this.getDefaultProvider(data.provider);
    const prev = { ...base };

    const tokens = data.tokens || estimateTokens(data.fullContent || '');
    const genTime = (data.latency - (data.ttft || 0)) / 1000;
    // B10-118: Guard against negative/infinite TPS from malformed probe responses
    let currentTPS = prev.avgTPS;
    if (genTime > 0 && tokens > 0) {
      const raw = tokens / genTime;
      if (isFinite(raw) && raw >= 0) currentTPS = raw;
    }

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
      // SI-25: Derive global estimatedCost from per-provider sum instead of incrementing separately
      prev.estimatedCost = (prev.estimatedCost || 0) + requestCost;
      state.providers[p] = prev;
      state.estimatedCost = 0;
      for (const prov of Object.values(state.providers)) {
        state.estimatedCost += prov.estimatedCost ?? 0;
      }
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
    this.transientHealthEvents.push({ provider, type, detail, timestamp: Date.now() });
    if (this.transientHealthEvents.length > ProviderTracker.MAX_HEALTH_EVENTS) {
      this.transientHealthEvents.shift();
    }
  }

  private deriveHealthEventsFromKeyState(): HealthEvent[] {
    const states = this.keyStateStore?.getAll() ?? [];
    return states.flatMap(state => this.keyStateToHealthEvents(state));
  }

  private keyStateToHealthEvents(state: KeyState): HealthEvent[] {
    const events: HealthEvent[] = [];
    const provider = state.provider.toLowerCase();

    events.push({
      provider,
      type: state.healthScore >= 75 ? 'recovery' : 'status_change',
      detail: `${state.label || state.id}: ${state.status}, health ${Math.round(state.healthScore)}/100`,
      timestamp: state.updatedAt,
    });

    if (state.flags.rateLimited) {
      events.push({
        provider,
        type: 'rate_limit',
        detail: `${state.label || state.id}: rate limit active`,
        timestamp: state.updatedAt,
      });
    }

    if (state.health.consecutiveErrors >= 3 || state.flags.authFailed || state.flags.circuitOpen) {
      const reason = state.flags.authFailed
        ? 'auth failure'
        : state.flags.circuitOpen
          ? 'circuit open'
          : `${state.health.consecutiveErrors} consecutive errors`;
      events.push({
        provider,
        type: 'error_burst',
        detail: `${state.label || state.id}: ${reason}`,
        timestamp: state.updatedAt,
      });
    }

    if (state.lastProbe.latency > 5000) {
      events.push({
        provider,
        type: 'latency_spike',
        detail: `${state.label || state.id}: probe latency ${state.lastProbe.latency}ms`,
        timestamp: state.lastProbe.timestamp,
      });
    }

    return events;
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

  private detectRecovery(_provider: string, current: ProviderState, previous: ProviderState): boolean {
    return previous.reliability < 0.4 && current.reliability >= 0.4;
  }

  /** SI-45: Use oldStatus from SystemState directly instead of separate prevStatuses Map */
  private detectStatusChange(provider: string, oldStatus: string, newStatus: string): void {
    if (oldStatus !== newStatus) {
      this.recordHealthEvent(provider, 'status_change', `${oldStatus} → ${newStatus}`);
    }
  }

  getMetrics(_provider: string, keyId: string): {
    errors: number;
    totalRequests: number;
    avgLatency: number;
    quotaRemaining: number;
    quotaLimit: number;
    reputation: number;
    lastUsed: number;
  } | null {
    const state = this.keyStateStore?.get(keyId);
    if (!state) return null;
    const p = state.provider.toLowerCase();
    const providerState = this.keyStateStore?.getAll()
      .filter(s => s.provider.toLowerCase() === p);
    const totalRequests = providerState?.reduce((sum, s) => sum + (s.health.consecutiveErrors || 0), 0) ?? 0;
    return {
      errors: state.health.consecutiveErrors,
      totalRequests,
      avgLatency: state.lastProbe.latency,
      quotaRemaining: state.quota.limitTokens - state.quota.usedTokens,
      quotaLimit: state.quota.limitTokens,
      reputation: state.healthScore,
      lastUsed: state.updatedAt,
    };
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
        ? (installed.has(norm) ? 'fair' : 'avoid')
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
      avgTTFT: 0,
      avgTPS: 0,
      reliability: 0,
      stabilityIndex: 0,
      reputationScore: 0,
      totalRequests: 0,
      selectionRate: 0,
      status: 'unknown',
    };
  }
}
