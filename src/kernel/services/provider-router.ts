import type { ApiKey, RouterWeights, SystemState } from '../types/metrics-types';
import type { RouterConfig, WeightProfile, ABTestConfig } from '../types/routing-types'
import type { FallbackLink, RoutingPolicyPreview, RoutingPolicyPreviewInput, RoutingPolicySnapshot } from '../contracts/routing-policy';
import { EVENTS } from '../events/event-names';
import type { ProbeResult } from '../contracts/probe';
import type { IKeyStateStore } from '../contracts/key-state';
import type { ISessionAffinityStore } from '../contracts/session-affinity';
import { RouterConfigManager } from './router-config-manager';
import { matchSemanticRule, DEFAULT_SEMANTIC_RULES } from './route-rules';
import type { SemanticRouteRule } from './route-rules';
import type { Result } from '../contracts/results';
import { classifyRequest as classifyRequestPrompt } from './router-request-classifier';
import {
  calculateProviderScore,
  estimateRequestCost,
  getContentAffinity,
  getEffectiveWeights,
} from './router-scoring';

export type {
  RequestIntent,
  RequestLanguage,
  RoutingStrategy,
  ScoringComponents,
  SkippedKeyEntry,
  DecisionOrigin,
  PipelineStep,
  RequestClassification,
  RouterDecision,
} from './router-types';

import type {
  RoutingStrategy,
  SkippedKeyEntry,
  PipelineStep,
  RouterDecision,
  DecisionOrigin,
} from './router-types';

export interface RouterServiceDeps {
  kernel: {
    getState: () => SystemState;
    setBaseWeights: (weights: RouterWeights) => void;
  };
  keyService: {
    getKeys: () => ApiKey[];
    getPoolKeys: (provider: string) => ApiKey[];
    selectFromPool: (provider: string) => ApiKey | undefined;
    selectWithBurst?: (provider: string) => ApiKey | undefined;
    canUseKey: (keyId: string) => { can: boolean; reason?: string };
    isKeyInBackoff: (keyId: string) => { backoff: boolean; remainingMs: number };
    isProviderCircuitOpen: (provider: string) => boolean;
    isProviderRateLimited: (provider: string) => boolean;
  };
  pricingService: {
    getBudgetInfo: () => { providerBudgets: { provider: string; monthlyBudget: number; spentThisMonth: number }[] };
    getPricingForModel: (model: string) => { input?: number; output?: number } | undefined;
  };
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  budgetService: {
    canUseProvider: (provider: string) => boolean;
  };
  policyService: {
    checkAgentPolicy: (agentId: string, provider: string, model?: string) => { allowed: boolean; reason?: string };
  };
  sessionAffinityStore?: ISessionAffinityStore;
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
  routingPolicyService: {
    getSnapshot: () => RoutingPolicySnapshot;
    preview: (input: RoutingPolicyPreviewInput) => RoutingPolicyPreview;
    getFallbackChain: (strategy: string) => FallbackLink[];
    setFallbackChain: (strategy: string, chain: FallbackLink[]) => void;
    getDowngradeChain: (model: string) => string[];
    setDowngradeChain: (model: string, chain: string[]) => void;
    getDowngradedModel: (model: string) => string | null;
    getDeepDowngradedModel: (model: string, steps: number) => string | null;
    calculateLatencyPenalty: (providerId: string, avgLatency: number, medianLatency: number) => number;
    calculateCostPenalty: (model: string, promptLength: number) => number;
    calculateBudgetPenalty: (provider: string, spentThisMonth: number, monthlyBudget: number) => number;
    recordPenalty: (provider: string, type: string, amount: number) => void;
  };
  keyStateStore?: IKeyStateStore;
}

export class RouterService {
  private decisionHistory: RouterDecision[] = [];
  private simulationHistory: RouterDecision[] = [];
  private config: RouterConfig;
  private configManager: RouterConfigManager;
  private latencyUnsub: (() => void) | null = null;
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private deps: RouterServiceDeps;

  constructor(deps: RouterServiceDeps) {
    this.deps = deps;
    this.configManager = new RouterConfigManager({ database: deps.database });
    this.config = this.configManager.raw;
  }

  async init() {
    await this.configManager.init();
    this.config = this.configManager.raw;
    this.startLatencyMonitoring();
  }

  getActiveProfile(): WeightProfile {
    return this.configManager.getActiveProfile();
  }

  getConfig(): RouterConfig {
    return this.configManager.getConfig();
  }

  async updateConfig(partial: Partial<RouterConfig>): Promise<void> {
    await this.configManager.updateConfig(partial);
    this.config = this.configManager.raw;
  }

  getProfileNames(): string[] {
    return this.configManager.getProfileNames();
  }

  getProfile(name: string): WeightProfile | null {
    return this.configManager.getProfile(name);
  }

  async setProfile(name: string, profile: WeightProfile): Promise<void> {
    await this.configManager.setProfile(name, profile);
    this.config = this.configManager.raw;
  }

  async deleteProfile(name: string): Promise<boolean> {
    const ok = await this.configManager.deleteProfile(name);
    if (ok) this.config = this.configManager.raw;
    return ok;
  }

  async setActiveProfile(name: string): Promise<boolean> {
    const ok = await this.configManager.setActiveProfile(name);
    if (ok) this.config = this.configManager.raw;
    return ok;
  }

  async updateActiveProfileWeights(weights: { ttft: number; tps: number; reliability: number }): Promise<void> {
    await this.configManager.updateActiveProfileWeights(weights);
    this.config = this.configManager.raw;
    this.deps.kernel.setBaseWeights(weights);
  }

  async startABTest(control: string, experiment: string, splitPercent: number): Promise<boolean> {
    const ok = await this.configManager.startABTest(control, experiment, splitPercent);
    if (ok) this.config = this.configManager.raw;
    return ok;
  }

  async stopABTest(): Promise<void> {
    await this.configManager.stopABTest();
    this.config = this.configManager.raw;
  }

  getABTest(): ABTestConfig | null {
    return this.configManager.getABTest();
  }

  recordABTestResult(usedExperiment: boolean, latency: number, success: boolean, score: number): void {
    this.configManager.recordABTestResult(usedExperiment, latency, success, score);
  }

  resolveProfileForRequest(): string {
    return this.configManager.resolveProfileForRequest();
  }

  private startLatencyMonitoring() {
    this.latencyUnsub = this.deps.eventBus.onSafe<{ provider: string }>(EVENTS.KEY_LATENCY_BURST, () => {
      this.checkLatencyHealth();
    });

    this.monitorInterval = setInterval(() => {
      this.checkLatencyHealth();
    }, this.config.latency.monitorIntervalMs);
  }

  private checkLatencyHealth() {
    const state = this.deps.kernel.getState();
    const providerIds = Object.keys(state.providers);
    if (providerIds.length < 2) return;

    const entries: { provider: string; avg: number }[] = [];
    for (const p of providerIds) {
      const avg = state.providers[p]?.avgTTFT || 0;
      entries.push({ provider: p, avg });
    }

    const sorted = [...entries].sort((a, b) => a.avg - b.avg);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1].avg + sorted[sorted.length / 2].avg) / 2
      : sorted[Math.floor(sorted.length / 2)]?.avg || 0;
    if (median === 0) return;

    const degraded = sorted.filter(e => e.avg > median * this.config.latency.degradationRatio && e.avg > 0);
    for (const d of degraded) {
      const prevState = state.providers[d.provider];
      if (prevState && prevState.status === 'healthy') {
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
          message: `Latency degradation on ${d.provider}: ${Math.round(d.avg)}ms (median ${Math.round(median)}ms)`,
          type: 'warning',
        });
      }
    }

    if (degraded.length > 0) {
      const newWeights = this.getLatencyBalancedWeights();
      this.deps.kernel.setBaseWeights(newWeights);
    }
  }

  getProviderAvgLatency(provider: string): number {
    const key = provider.toLowerCase();
    return this.deps.kernel.getState().providers[key]?.avgTTFT || 0;
  }

  /** Alias for lifecycle compatibility */
  destroy(): void {
    this.stopMonitoring();
  }

  stopMonitoring() {
    if (this.latencyUnsub) { this.latencyUnsub(); this.latencyUnsub = null; }
    if (this.monitorInterval) { clearInterval(this.monitorInterval); this.monitorInterval = null; }
  }

  classifyRequest(prompt: string) {
    return classifyRequestPrompt(this.config.classification, prompt);
  }

  getDowngradeChain(model: string): string[] {
    return this.deps.routingPolicyService.getDowngradeChain(model);
  }

  getDowngradedModel(model: string): string | null {
    return this.deps.routingPolicyService.getDowngradedModel(model);
  }

  getDeepDowngradedModel(model: string, steps: number): string | null {
    return this.deps.routingPolicyService.getDeepDowngradedModel(model, steps);
  }

  smartDowngrade(model: string, metrics: { avgLatency: number; p95Latency: number; costPerRequest: number; quotaUsed: number; quotaLimit: number }) {
    return (this.deps.routingPolicyService as unknown as { smartDowngrade?: (m: string, mt: { avgLatency: number; p95Latency: number; costPerRequest: number; quotaUsed: number; quotaLimit: number }) => string | null }).smartDowngrade?.(model, metrics) ?? null;
  }

  smartDowngradeDeep(model: string, metrics: { avgLatency: number; p95Latency: number; costPerRequest: number; quotaUsed: number; quotaLimit: number }, maxSteps = 3) {
    return (this.deps.routingPolicyService as unknown as { smartDowngradeDeep?: (m: string, mt: { avgLatency: number; p95Latency: number; costPerRequest: number; quotaUsed: number; quotaLimit: number }, s: number) => string | null }).smartDowngradeDeep?.(model, metrics, maxSteps) ?? null;
  }

  trySelectProvider(prompt: string): Result<{ provider: string; model: string; confidence: number; reasoning: string }, { code: string; message: string }> {
    const cls = this.classifyRequest(prompt);
    const customRules: SemanticRouteRule[] = this.config.semanticRouteRules || DEFAULT_SEMANTIC_RULES;
    const match = matchSemanticRule(customRules, cls);
    if (match) {
      const confidence = cls.complexity === 'simple' ? 0.9 : cls.complexity === 'medium' ? 0.75 : 0.6;
      return { ok: true, value: { provider: match.target.provider, model: match.target.model || '', confidence, reasoning: `Semantic rule matched: ${match.label || match.id} (intent=${cls.intent}, lang=${cls.language})` } };
    }
    try {
      const result = this.selectProviderByComplexity(prompt);
      return { ok: true, value: { provider: result.provider, model: result.model, confidence: 0.5, reasoning: 'Fallback to complexity-based routing' } };
    } catch (e) {
      return { ok: false, error: { code: 'NO_MATCH', message: `No semantic route matched: ${(e as Error).message || 'unknown'}` } };
    }
  }

  selectProviderByComplexity(prompt: string): { provider: string; model: string } {
    const cls = this.classifyRequest(prompt);
    const pbc = this.config.providerByComplexity;
    if (cls.isMultimodal) return pbc.multimodal;
    if (cls.isLong) return pbc.long;
    if (cls.complexity === 'complex' && cls.isCode) return pbc.complexCode;
    if (cls.complexity === 'complex') return pbc.complex;
    if (cls.complexity === 'medium') return pbc.medium;
    return pbc.default;
  }

  getFallbackChain(strategy: RoutingStrategy): FallbackLink[] {
    return this.deps.routingPolicyService.getFallbackChain(strategy);
  }

  resolveWithFallback(strategy: RoutingStrategy, excludeProvider?: string, excludeKeyId?: string): { key: ApiKey; provider: string } | null {
    const chain = this.getFallbackChain(strategy);
    const skipped: SkippedKeyEntry[] = [];
    for (const link of chain) {
      if (excludeProvider && link.provider.toLowerCase() === excludeProvider.toLowerCase()) {
        // Try another key from the same provider before skipping the entire provider
        const pool = this.deps.keyService.getPoolKeys(link.provider);
        const usable = pool.filter(k => {
          if (excludeKeyId && k.id === excludeKeyId) return false;
          return this.deps.keyService.canUseKey(k.id).can;
        });
        if (usable.length > 0) {
          const selectedKey = usable[0];
          return { key: selectedKey, provider: link.provider };
        }
        skipped.push({ provider: link.provider, keyLabel: link.provider, keyId: undefined, reason: 'Excluded (same as failed provider) — no fallback key available', stage: 'exclusion' });
        continue;
      }
      if (!this.deps.budgetService.canUseProvider(link.provider)) {
        skipped.push({ provider: link.provider, keyLabel: link.provider, keyId: undefined, reason: 'Over budget', stage: 'budget' });
        continue;
      }
      const pool = this.deps.keyService.getPoolKeys(link.provider);
      const usable = pool.filter(k => {
        const u = this.deps.keyService.canUseKey(k.id);
        if (!u.can) skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: u.reason || 'Not usable', stage: 'quota' });
        return u.can;
      });
      if (usable.length > 0) {
        const selectedKey = this.deps.keyService.selectWithBurst?.(link.provider)
          ?? this.deps.keyService.selectFromPool(link.provider);
        if (!selectedKey) continue;
        return { key: selectedKey, provider: link.provider };
      }
    }
    const allActive = this.deps.keyService.getKeys().filter(k => k.status === 'active');
    if (allActive.length > 0) {
      return { key: allActive[0], provider: allActive[0].provider };
    }
    return null;
  }

  private lastDecisions: RouterDecision[] = [];
  private readonly MAX_DECISIONS = 30;

  getSelectionTrace(keyId?: string): readonly RouterDecision[] {
    if (!keyId) return this.lastDecisions;
    const key = this.deps.keyService.getKeys().find(k => k.id === keyId);
    return this.lastDecisions.filter(d =>
      d.skipped.some(s => s.keyId === keyId) ||
      (key !== undefined && d.selected === key.provider) ||
      (key !== undefined && d.secondBest === key.provider) ||
      (key !== undefined && d.scores.some(s => s.provider === key.provider))
    );
  }

  private logDebateSkip(key: ApiKey, reason: string, stage: SkippedKeyEntry['stage']): void {
    this.lastDecisions.unshift({
      requestId: crypto.randomUUID(),
      strategy: 'latency',
      classification: { complexity: 'simple', isCode: false, isLong: false, isMultimodal: false, intent: 'general' as const, language: 'en' as const },
      weights: getEffectiveWeights('latency', '', this.deps.kernel.getState(), this.getActiveProfile()),
      selected: '',
      secondBest: null,
      scores: [],
      skipped: [{ provider: key.provider, keyLabel: key.label, keyId: key.id, reason, stage }],
      steps: [{ name: `${stage}:check`, status: 'blocked', provider: key.provider, detail: reason }],
      timestamp: Date.now(),
      promptLength: 0,
      origin: 'live',
    });
  }

  private recordDecision(opts: { strategy: RoutingStrategy; skipped: SkippedKeyEntry[]; selected: string; prompt: string }): void {
    this.lastDecisions.unshift({
      requestId: crypto.randomUUID(),
      strategy: opts.strategy,
      classification: { complexity: 'simple', isCode: false, isLong: false, isMultimodal: false, intent: 'general' as const, language: 'en' as const },
      weights: getEffectiveWeights(opts.strategy, opts.prompt, this.deps.kernel.getState(), this.getActiveProfile()),
      selected: opts.selected,
      secondBest: null,
      scores: [],
      skipped: opts.skipped,
      steps: opts.skipped.length > 0
        ? opts.skipped.slice(0, 5).map(s => ({ name: `${s.stage}:check` as const, status: 'blocked' as const, provider: s.provider, detail: s.reason }))
        : [{ name: 'scoring', status: 'passed', detail: 'Auto-selected (free-tier)' }],
      timestamp: Date.now(),
      promptLength: opts.prompt.length,
      origin: 'live',
    });
    if (this.lastDecisions.length > this.MAX_DECISIONS) this.lastDecisions.pop();
  }

  getRankedProviders(strategy: RoutingStrategy, prompt: string, priority: 'low' | 'normal' | 'high' = 'normal', agentId?: string, probeResults?: Map<string, ProbeResult>, overrideState?: SystemState, suppressEmit?: boolean, origin?: DecisionOrigin, sessionId?: string): ApiKey[] {
    const state = overrideState ?? this.deps.kernel.getState();
    const allKeys = this.deps.keyService.getKeys();

    // Session affinity: if session is bound to a specific key, prefer it
    if (sessionId && this.deps.sessionAffinityStore) {
      const binding = this.deps.sessionAffinityStore.getBoundKey(sessionId);
      if (binding) {
        const boundKey = allKeys.find(k => k.id === binding.keyId);
        if (boundKey) {
          const ks = this.deps.keyStateStore?.get(boundKey.id);
          const healthOk = ks ? ks.healthScore >= 75 : (boundKey.status === 'active' && !this.deps.keyService.isKeyInBackoff(boundKey.id).backoff && !this.deps.keyService.isProviderCircuitOpen(boundKey.provider) && !this.deps.keyService.isProviderRateLimited(boundKey.provider));
          if (healthOk) {
            return [boundKey];
          }
        }
        // Bound key is unhealthy — try another key from the same provider first
        const sameProvider = allKeys.filter(k => {
          if (k.provider.toLowerCase() !== binding.provider.toLowerCase() || k.id === binding.keyId) return false;
          const kks = this.deps.keyStateStore?.get(k.id);
          return kks ? kks.healthScore >= 75 : (k.status === 'active' && !this.deps.keyService.isKeyInBackoff(k.id).backoff && !this.deps.keyService.isProviderCircuitOpen(k.provider) && !this.deps.keyService.isProviderRateLimited(k.provider));
        });
        if (sameProvider.length > 0) {
          this.deps.sessionAffinityStore.bind(sessionId, sameProvider[0].id, sameProvider[0].provider);
          return [sameProvider[0]];
        }
        // No same-provider key available — evict and fall through to normal routing
        this.deps.sessionAffinityStore.unbind(sessionId);
      }
    }

    const skipped: SkippedKeyEntry[] = [];
    const activeKeys = allKeys.filter(k => {
      const ks = this.deps.keyStateStore?.get(k.id);
      if (ks) {
        if (ks.healthScore < 75) {
          skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Health score: ${ks.healthScore}/100`, stage: 'status' });
          return false;
        }
      } else {
        // Legacy fallback when KeyStateStore is not available
        if (k.status !== 'active') {
          skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Status: ${k.status}`, stage: 'status' });
          return false;
        }
        const backoff = this.deps.keyService.isKeyInBackoff(k.id);
        if (backoff.backoff) {
          skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Exponential backoff: ${backoff.remainingMs}ms remaining`, stage: 'backoff' });
          return false;
        }
        if (this.deps.keyService.isProviderCircuitOpen(k.provider)) {
          skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: 'Circuit breaker open — provider temporarily disabled', stage: 'circuit' });
          return false;
        }
        if (this.deps.keyService.isProviderRateLimited(k.provider)) {
          skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: 'Rate limit threshold reached — tokens exhausted', stage: 'ratelimit' });
          return false;
        }
        // Probe eligibility check (legacy path)
        if (probeResults) {
          const probe = probeResults.get(k.id);
          if (probe && (probe.status === 'broken' || probe.status === 'limited')) {
            skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Probe: ${probe.status} — ${probe.error || 'not eligible'}`, stage: 'unavailable' });
            return false;
          }
        }
      }
      return true;
    });
    let keys = activeKeys;
    if (keys.length === 0) {
      // Grace fallback: allow degraded/limited keys with penalty
      keys = allKeys.filter(k => {
        const ks = this.deps.keyStateStore?.get(k.id);
        if (ks) {
          if (ks.healthScore < 25) {
            skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Fallback skipped — health score ${ks.healthScore}/100`, stage: 'status' });
            return false;
          }
        } else {
          if (k.status === 'error') {
            skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Fallback skipped — Status: ${k.status}`, stage: 'status' });
            return false;
          }
          const backoff = this.deps.keyService.isKeyInBackoff(k.id);
          if (backoff.backoff) {
            skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Fallback skipped — backoff ${backoff.remainingMs}ms`, stage: 'backoff' });
            return false;
          }
        }
        return true;
      });
    }

    const filteredByPolicy = agentId
      ? keys.filter(k => {
          const p = this.deps.policyService.checkAgentPolicy(agentId, k.provider, k.model);
          if (!p.allowed) {
            skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: p.reason || 'Blocked by policy', stage: 'policy' });
            return false;
          }
          return true;
        })
      : keys;
    if (agentId && filteredByPolicy.length === 0) {
      this.recordDecision({ strategy, skipped, selected: '', prompt });
      return [];
    }

    keys = agentId ? filteredByPolicy : keys;

    if (strategy === 'free_first') {
      const freeKeys = keys.filter(k =>
        k.tags?.some(t => t === 'tier:free') || k.label.toLowerCase().includes('free')
      );
      const paidKeys = keys.filter(k =>
        !(k.tags?.some(t => t === 'tier:free') || k.label.toLowerCase().includes('free'))
      );
      const usableFree = freeKeys.filter(k => {
        const u = this.deps.keyService.canUseKey(k.id);
        if (!u.can) skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: u.reason || 'Quota exhausted', stage: 'quota' });
        return u.can;
      });
      if (usableFree.length > 0) {
        this.recordDecision({ strategy, skipped, selected: usableFree[0].provider, prompt });
        return usableFree;
      }
      const usablePaid = paidKeys.filter(k => {
        const u = this.deps.keyService.canUseKey(k.id);
        if (!u.can) skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: u.reason || 'Quota exhausted', stage: 'quota' });
        return u.can;
      });
      this.recordDecision({ strategy, skipped, selected: usablePaid[0]?.provider || '', prompt });
      return usablePaid;
    }

    const usedProfile = this.resolveProfileForRequest();
    const profile = this.config.weightProfiles[usedProfile] || this.getActiveProfile();
    const weights = getEffectiveWeights(strategy, prompt, state, profile);
    const cls = this.classifyRequest(prompt);

    const providerLats = new Map<string, number>();
    for (const key of keys) {
      const pid = key.provider.toLowerCase();
      const avg = state.providers[pid]?.avgTTFT || 0;
      providerLats.set(pid, avg);
    }
    const latValues = [...providerLats.values()].sort((a, b) => a - b);
    const medianLat = latValues.length % 2 === 0
      ? (latValues[latValues.length / 2 - 1] + latValues[latValues.length / 2]) / 2
      : latValues[Math.floor(latValues.length / 2)] || 0;

    const sc = profile.scoring;
    const uniqueKeys = this.deduplicateCandidates(keys, skipped);

    const rankedItems = [...uniqueKeys]
      .map(key => {
        const providerId = key.provider.toLowerCase();
        const m = state.providers[providerId];
        const rawScore = m ? calculateProviderScore(providerId, state, weights, sc) : 0.2;
        if (!m || rawScore <= 0) {
          skipped.push({ provider: key.provider, keyLabel: key.label, keyId: key.id, reason: !m ? 'No provider metrics' : `Score floor (${rawScore.toFixed(2)})`, stage: 'score' });
        }
        const keyReputationBonus = ((key.stats?.extended?.reputationScore || 100) / 100) * sc.keyReputationBonus;
        const explorationBonus = state.totalRequests > 0
          ? state.explorationFactor * Math.sqrt(Math.log(state.totalRequests) / ((key.stats?.successCount || 0) + 1))
          : 0.2;
        const costPenalty = strategy === 'cost' ? this.getCostPenalty(key, prompt) : 0;
        const budgetPenalty = this.getBudgetPenalty(providerId);
        const affinityBonus = getContentAffinity(this.config.affinity, providerId, cls, prompt);
        const prioCfg = this.config.priority;
        const priorityBonus = priority === 'high' ? (prioCfg.high[providerId] || 0) :
                              priority === 'low' ? (prioCfg.low[providerId] || 0) : 0;
        const provLat = providerLats.get(providerId) || 0;
        const latencyPenalty = this.deps.routingPolicyService.calculateLatencyPenalty(providerId, provLat, medianLat);
        return { key, score: rawScore + explorationBonus + keyReputationBonus + affinityBonus + priorityBonus - costPenalty - latencyPenalty - budgetPenalty, components: { raw: rawScore, stabilityBonus: 0, reputationBonus: 0, explorationBonus, keyReputationBonus, affinityBonus, priorityBonus, costPenalty, latencyPenalty, budgetPenalty } };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const decisionOrigin = origin ?? 'live';

    if (rankedItems.length > 0) {
      const blockedSteps: PipelineStep[] = [];
      for (const s of skipped) {
        if (s.stage === 'status' || s.stage === 'circuit' || s.stage === 'ratelimit' || s.stage === 'backoff') {
          blockedSteps.push({
            name: s.stage === 'circuit' ? 'circuit:check' : s.stage === 'ratelimit' ? 'ratelimit:check' : s.stage === 'backoff' ? 'backoff:check' : 'provider:check',
            status: 'blocked' as const,
            provider: s.provider,
            detail: s.reason,
          });
        } else if (s.stage === 'policy' && agentId) {
          blockedSteps.push({ name: 'policy:check', status: 'blocked' as const, provider: s.provider, detail: s.reason });
        } else if (s.stage === 'quota') {
          blockedSteps.push({ name: 'quota:check', status: 'blocked' as const, provider: s.provider, detail: s.reason });
        } else if (s.stage === 'budget') {
          blockedSteps.push({ name: 'budget:check', status: 'blocked' as const, provider: s.provider, detail: s.reason });
        }
      }
      const steps: PipelineStep[] = [
        { name: 'providers:scan', status: 'passed', detail: `Scanned ${allKeys.length} keys` },
        ...blockedSteps,
        { name: 'scoring', status: 'passed', detail: `${rankedItems.length} keys scored` },
        { name: 'selection', status: 'passed', provider: rankedItems[0].key.provider, detail: `Score: ${rankedItems[0].score.toFixed(3)}` },
      ];

      const decision: RouterDecision = {
        requestId: crypto.randomUUID(),
        strategy,
        classification: cls,
        weights,
        selected: rankedItems[0].key.provider,
        secondBest: rankedItems[1]?.key.provider || null,
        scores: rankedItems.slice(0, 3).map(i => ({
          provider: i.key.provider,
          score: i.score,
          components: i.components,
        })),
        skipped,
        steps,
        timestamp: Date.now(),
        promptLength: prompt.length,
        estimatedCost: estimateRequestCost(rankedItems[0].key, prompt, (model) => this.deps.pricingService.getPricingForModel(model)),
        origin: decisionOrigin,
      };

      if (decisionOrigin === 'live') {
        this.decisionHistory.unshift(decision);
        if (this.decisionHistory.length > this.config.history.maxDecisions) this.decisionHistory.pop();
      } else {
        this.simulationHistory.unshift(decision);
        if (this.simulationHistory.length > this.config.history.maxDecisions) this.simulationHistory.pop();
      }

      const isExperiment = usedProfile !== this.config.activeProfile;
      if (!suppressEmit && decisionOrigin === 'live') this.deps.eventBus.emit(EVENTS.DECISION, {
        requestId: decision.requestId,
        strategy,
        classification: cls,
        weights,
        selected: decision.selected,
        secondBest: decision.secondBest,
        scores: decision.scores.map(s => ({ p: s.provider, s: s.score.toFixed(3), c: s.components })),
        skipped: skipped.map(s => ({ provider: s.provider, keyLabel: s.keyLabel, keyId: s.keyId, reason: s.reason, stage: s.stage })),
        timestamp: Date.now(),
        profile: usedProfile,
        isExperiment,
      });
    }

    // Shadow mode: compare with KeyStateStore routing (live only)
    if (decisionOrigin === 'live' && this.deps.keyStateStore && rankedItems.length > 0) {
      const selectedKey = rankedItems[0].key;
      const shadow = this.deps.keyStateStore.getForRouting();
      const shadowTop = shadow[0];
      if (shadowTop && (shadowTop.id !== selectedKey.id || shadowTop.provider !== selectedKey.provider)) {
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
          message: `[Shadow] KeyState would route to ${shadowTop.provider}/${shadowTop.label} (id=${shadowTop.id}), legacy picked ${selectedKey.provider}/${selectedKey.label}`,
          type: 'info',
          source: 'router-shadow',
        });
      }
    }

    return rankedItems.map(item => item.key);
  }

  getRaceCandidates(prompt: string): ApiKey[] {
    return this.getRankedProviders('race', prompt).slice(0, 2);
  }

  getRaceCandidateDetails(prompt: string): Array<{ provider: string; model: string; keyId: string }> {
    const cls = this.classifyRequest(prompt);
    const pbc = this.config.providerByComplexity;
    const ranked = this.getRankedProviders('race', prompt);
    return ranked.slice(0, 3).map(key => {
      let model = key.model || '';
      if (!model) {
        if (cls.isMultimodal) model = pbc.multimodal.model;
        else if (cls.isLong) model = pbc.long.model;
        else if (cls.complexity === 'complex' && cls.isCode) model = pbc.complexCode.model;
        else if (cls.complexity === 'complex') model = pbc.complex.model;
        else if (cls.complexity === 'medium') model = pbc.medium.model;
        else model = pbc.default.model;
      }
      return { provider: key.provider, model, keyId: key.id };
    });
  }

  private getBudgetPenalty(provider: string): number {
    const info = this.deps.pricingService.getBudgetInfo();
    const provInfo = info.providerBudgets.find(p => p.provider === provider);
    if (!provInfo) return 0;
    return this.deps.routingPolicyService.calculateBudgetPenalty(provider, provInfo.spentThisMonth, provInfo.monthlyBudget);
  }

  private getCostPenalty(key: ApiKey, prompt: string): number {
    return this.deps.routingPolicyService.calculateCostPenalty(key.model || 'auto', prompt.length);
  }

  setStrategy(strategy: RoutingStrategy) {
    const w = this.getActiveProfile().strategyWeights[strategy];
    if (w) this.deps.kernel.setBaseWeights(w);
  }

  getCurrentAutoWeights() { return this.deps.kernel.getState().weights.effective; }

  getLatencyBalancedWeights(): RouterWeights {
    const state = this.deps.kernel.getState();
    const providers = Object.values(state.providers);
    const profile = this.getActiveProfile();
    if (providers.length === 0) return profile.defaultWeights;

    const allLats = providers.map(p => p.avgTTFT);

    const sorted = [...allLats].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)] || 0;
    const max = sorted[sorted.length - 1] || 0;
    if (median === 0) return state.weights.effective;

    const variance = (max - median) / median;

    for (const band of profile.latencyVarianceBands) {
      if (variance > band.minVariance) return band.weights;
    }
    return state.weights.effective;
  }

  getDecisionHistory(limit = 20): RouterDecision[] {
    return this.decisionHistory.slice(0, limit);
  }

  /** Get the last live decision */
  getLastDecision(): RouterDecision | undefined {
    return this.decisionHistory[0];
  }

  /** Get the last simulation/replay decision (used by CounterfactualEngine, TemporalReplay) */
  getSimulationDecision(): RouterDecision | undefined {
    return this.simulationHistory[0];
  }

  getStateSnapshotForSimulation(): SystemState {
    return structuredClone(this.deps.kernel.getState());
  }

  getDebateProviders(count: number): Array<{ provider: string; key: ApiKey }> {
    const allKeys = this.deps.keyService.getKeys();
    let activeKeys = allKeys.filter(k => {
      const ks = this.deps.keyStateStore?.get(k.id);
      if (ks) {
        if (ks.healthScore < 75) {
          this.logDebateSkip(k, `Health score: ${ks.healthScore}/100`, 'status');
          return false;
        }
      } else {
        if (k.status !== 'active') {
          this.logDebateSkip(k, `Status: ${k.status}`, 'status');
          return false;
        }
        if (this.deps.keyService.isProviderCircuitOpen(k.provider)) {
          this.logDebateSkip(k, 'Circuit breaker open', 'circuit');
          return false;
        }
        if (this.deps.keyService.isProviderRateLimited(k.provider)) {
          this.logDebateSkip(k, 'Rate limited', 'ratelimit');
          return false;
        }
      }
      return true;
    });
    if (activeKeys.length === 0) {
      // Grace fallback: allow degraded/limited keys
      activeKeys = allKeys.filter(k => {
        const ks = this.deps.keyStateStore?.get(k.id);
        if (ks) {
          if (ks.healthScore < 25) {
            this.logDebateSkip(k, `Fallback skipped — health score ${ks.healthScore}/100`, 'status');
            return false;
          }
        } else {
          if (k.status === 'error') {
            this.logDebateSkip(k, `Fallback skipped — Status: ${k.status}`, 'status');
            return false;
          }
          const backoff = this.deps.keyService.isKeyInBackoff(k.id);
          if (backoff.backoff) {
            this.logDebateSkip(k, `Fallback skipped — backoff ${backoff.remainingMs}ms`, 'backoff');
            return false;
          }
        }
        return true;
      });
    }
    const uniqueProviders = new Map<string, ApiKey>();
    for (const k of activeKeys) {
      if (!uniqueProviders.has(k.provider)) {
        uniqueProviders.set(k.provider, k);
      }
    }
    const PRIORITY = ['groq', 'gemini', 'openrouter', 'nvidia', 'deepseek', 'cohere', 'blackboxapi', 'cometapi'];
    const sorted = Array.from(uniqueProviders.entries()).sort(([a], [b]) => {
      const ia = PRIORITY.indexOf(a); const ib = PRIORITY.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return sorted.slice(0, Math.min(count, sorted.length)).map(([provider, key]) => ({ provider, key }));
  }

  private deduplicateCandidates(keys: ApiKey[], skipped: SkippedKeyEntry[]): ApiKey[] {
    const bestPerProvider = new Map<string, ApiKey>();
    for (const k of keys) {
      const existing = bestPerProvider.get(k.provider);
      if (!existing) {
        bestPerProvider.set(k.provider, k);
        continue;
      }
      const existingRep = existing.stats?.extended?.reputationScore ?? 100;
      const currentRep = k.stats?.extended?.reputationScore ?? 100;
      if (currentRep > existingRep) {
        skipped.push({ provider: existing.provider, keyLabel: existing.label, keyId: existing.id, reason: `Deduplicated: lower reputation (${existingRep}) vs ${currentRep}`, stage: 'normalization' });
        bestPerProvider.set(k.provider, k);
      } else {
        skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Deduplicated: lower reputation (${currentRep}) vs ${existingRep}`, stage: 'normalization' });
      }
    }
    return Array.from(bestPerProvider.values());
  }

  getProviderStats() {
    const state = this.deps.kernel.getState();
    return Object.entries(state.providers).map(([id, p]) => ({
      id,
      avgTTFT: p.avgTTFT,
      avgTPS: p.avgTPS,
      reliability: p.reliability,
      totalRequests: p.totalRequests,
      selectionRate: p.selectionRate,
      status: p.status,
    }));
  }

  setFallbackChain(strategy: string, chain: FallbackLink[]) {
    this.deps.routingPolicyService.setFallbackChain(strategy, chain);
  }

  setDowngradeChain(model: string, chain: string[]) {
    this.deps.routingPolicyService.setDowngradeChain(model, chain);
  }

  getRoutingPolicySurface(): RoutingPolicySnapshot {
    return this.deps.routingPolicyService.getSnapshot();
  }

  previewRoutingPolicy(input: RoutingPolicyPreviewInput): RoutingPolicyPreview {
    return this.deps.routingPolicyService.preview(input);
  }

  getRawConfig(): RoutingPolicySnapshot & Pick<RouterConfig, 'activeProfile' | 'weightProfiles'> {
    return {
      ...this.getRoutingPolicySurface(),
      activeProfile: this.config.activeProfile,
      weightProfiles: this.config.weightProfiles,
    };
  }
}
