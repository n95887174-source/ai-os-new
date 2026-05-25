import type { ApiKey, RouterWeights, SystemState } from '../types/metrics-types';
import type { RouterConfig, WeightProfile, ABTestConfig } from '../types/routing-types';
import type { FallbackLink, RoutingPolicyPreview, RoutingPolicyPreviewInput, RoutingPolicySnapshot } from '../contracts/routing-policy';
import { CONFIG } from './config-registry';
import { EVENTS } from '../events/event-names';
import type { ProbeResult } from '../contracts/probe';
import type { IKeyStateStore } from '../contracts/key-state';

const CONFIG_KEY = 'router_config';
const DEFAULT_PROFILE_NAME = 'default';

export type RoutingStrategy = 'broadcast' | 'performance' | 'reliability' | 'latency' | 'auto' | 'race' | 'cost' | 'free_first' | 'content';

export interface ScoringComponents {
  raw: number;
  stabilityBonus: number;
  reputationBonus: number;
  explorationBonus: number;
  keyReputationBonus: number;
  affinityBonus: number;
  priorityBonus: number;
  costPenalty: number;
  latencyPenalty: number;
  budgetPenalty: number;
}

export interface SkippedKeyEntry {
  provider: string;
  keyLabel: string;
  keyId?: string;
  reason: string;
  stage: 'status' | 'policy' | 'quota' | 'score' | 'budget' | 'unavailable' | 'circuit' | 'ratelimit' | 'backoff';
}

export interface RouterDecision {
  requestId: string;
  strategy: RoutingStrategy;
  classification: { complexity: 'simple' | 'medium' | 'complex'; isCode: boolean; isLong: boolean; isMultimodal: boolean };
  weights: RouterWeights;
  selected: string;
  secondBest: string | null;
  scores: { provider: string; score: number; components: ScoringComponents }[];
  skipped: SkippedKeyEntry[];
  timestamp: number;
  promptLength: number;
  estimatedCost?: number;
}

export interface RouterServiceDeps {
  kernel: {
    getState: () => SystemState;
    setBaseWeights: (weights: RouterWeights) => void;
  };
  keyService: {
    getKeys: () => ApiKey[];
    getPoolKeys: (provider: string) => ApiKey[];
    selectFromPool: (provider: string) => ApiKey | undefined;
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
    emit: (event: string, data?: unknown) => void;
  };
  budgetService: {
    canUseProvider: (provider: string) => boolean;
  };
  policyService: {
    checkAgentPolicy: (agentId: string, provider: string, model?: string) => { allowed: boolean };
  };
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
  private config: RouterConfig = routerConfigFromCONFIG();
  private latencyUnsub: (() => void) | null = null;
  private streamEndUnsub: (() => void) | null = null;
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private latencyWindows = new Map<string, number[]>();
  private deps: RouterServiceDeps;

  constructor(deps: RouterServiceDeps) {
    this.deps = deps;
  }

  async init() {
    await this.loadConfig();
    this.startLatencyMonitoring();
  }

  getActiveProfile(): WeightProfile {
    const profile = this.config.weightProfiles[this.config.activeProfile];
    if (profile) return profile;
    return this.config.weightProfiles[DEFAULT_PROFILE_NAME];
  }

  getConfig(): RouterConfig {
    return { ...this.config };
  }

  async updateConfig(partial: Partial<RouterConfig>): Promise<void> {
    this.config = { ...this.config, ...partial };
    await this.deps.database.setKv(CONFIG_KEY, this.config);
  }

  /** Return a list of all weight profile names. */
  getProfileNames(): string[] {
    return Object.keys(this.config.weightProfiles);
  }

  /** Return a specific profile, or null if not found. */
  getProfile(name: string): WeightProfile | null {
    return this.config.weightProfiles[name] ?? null;
  }

  /** Create or replace a weight profile. */
  async setProfile(name: string, profile: WeightProfile): Promise<void> {
    this.config.weightProfiles[name] = profile;
    await this.deps.database.setKv(CONFIG_KEY, this.config);
  }

  /** Delete a weight profile (cannot delete the active profile). */
  async deleteProfile(name: string): Promise<boolean> {
    if (name === this.config.activeProfile || !this.config.weightProfiles[name]) return false;
    delete this.config.weightProfiles[name];
    await this.deps.database.setKv(CONFIG_KEY, this.config);
    return true;
  }

  /** Switch the active weight profile. */
  async setActiveProfile(name: string): Promise<boolean> {
    if (!this.config.weightProfiles[name]) return false;
    this.config.activeProfile = name;
    await this.deps.database.setKv(CONFIG_KEY, this.config);
    return true;
  }

  /** Start an A/B test between two profiles. Returns false if names don't exist. */
  async startABTest(control: string, experiment: string, splitPercent: number): Promise<boolean> {
    if (!this.config.weightProfiles[control] || !this.config.weightProfiles[experiment]) return false;
    if (splitPercent < 1 || splitPercent > 99) return false;
    this.config.abTest = {
      enabled: true, controlProfile: control, experimentProfile: experiment,
      splitPercent, startedAt: Date.now(),
      metrics: { control: { requests: 0, avgLatency: 0, successRate: 0, avgScore: 0 }, experiment: { requests: 0, avgLatency: 0, successRate: 0, avgScore: 0 } },
    };
    await this.deps.database.setKv(CONFIG_KEY, this.config);
    return true;
  }

  /** Stop and clear the A/B test. */
  async stopABTest(): Promise<void> {
    this.config.abTest = null;
    await this.deps.database.setKv(CONFIG_KEY, this.config);
  }

  /** Get the current A/B test config, or null. */
  getABTest(): ABTestConfig | null {
    return this.config.abTest ? { ...this.config.abTest } : null;
  }

  /** Record an A/B test result. Called after a routing decision completes. */
  recordABTestResult(usedExperiment: boolean, latency: number, success: boolean, score: number): void {
    const ab = this.config.abTest;
    if (!ab || !ab.enabled) return;
    const bucket = usedExperiment ? 'experiment' : 'control';
    const m = ab.metrics[bucket];
    const count = m.requests + 1;
    m.requests = count;
    m.avgLatency = m.avgLatency + (latency - m.avgLatency) / count;
    m.successRate = m.successRate + ((success ? 1 : 0) - m.successRate) / count;
    m.avgScore = m.avgScore + (score - m.avgScore) / count;
  }

  /** Return the profile to use for this request (respects A/B split). */
  resolveProfileForRequest(): string {
    const ab = this.config.abTest;
    if (ab && ab.enabled && ab.splitPercent > 0) {
      const roll = Math.random() * 100;
      if (roll < ab.splitPercent) return ab.experimentProfile;
    }
    return this.config.activeProfile;
  }

  private startLatencyMonitoring() {
    this.latencyUnsub = this.deps.eventBus.on(EVENTS.KEY_LATENCY_BURST, (data: unknown) => {
      const d = data as { id: string; provider: string; latency: number };
      this.recordLatency(d.provider, d.latency);
      const newWeights = this.getLatencyBalancedWeights();
      this.deps.kernel.setBaseWeights(newWeights);
    });

    this.streamEndUnsub = this.deps.eventBus.on(EVENTS.STREAM_END, (data: unknown) => {
      const d = data as { provider?: string; latency?: number };
      if (d.provider && d.latency != null) {
        this.recordLatency(d.provider, d.latency);
      }
    });

    this.monitorInterval = setInterval(() => {
      this.checkLatencyHealth();
    }, this.config.latency.monitorIntervalMs);
  }

  private recordLatency(provider: string, latency: number) {
    const key = provider.toLowerCase();
    if (!this.latencyWindows.has(key)) {
      this.latencyWindows.set(key, []);
    }
    const window = this.latencyWindows.get(key)!;
    window.push(latency);
    if (window.length > this.config.latency.slidingWindowSize) {
      window.shift();
    }
  }

  private checkLatencyHealth() {
    const state = this.deps.kernel.getState();
    const providerIds = Object.keys(state.providers);
    if (providerIds.length < 2) return;

    const entries: { provider: string; avg: number }[] = [];
    for (const p of providerIds) {
      const window = this.latencyWindows.get(p);
      const avg = window && window.length > 0
        ? window.reduce((a, b) => a + b, 0) / window.length
        : state.providers[p]?.avgTTFT || 0;
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
    const window = this.latencyWindows.get(key);
    if (window && window.length > 0) {
      return window.reduce((a, b) => a + b, 0) / window.length;
    }
    return this.deps.kernel.getState().providers[key]?.avgTTFT || 0;
  }

  stopMonitoring() {
    if (this.latencyUnsub) { this.latencyUnsub(); this.latencyUnsub = null; }
    if (this.streamEndUnsub) { this.streamEndUnsub(); this.streamEndUnsub = null; }
    if (this.monitorInterval) { clearInterval(this.monitorInterval); this.monitorInterval = null; }
  }

  private async loadConfig() {
    try {
      const saved = await this.deps.database.getKv<Partial<RouterConfig>>(CONFIG_KEY);
      if (saved) {
        const defaults = routerConfigFromCONFIG();
        this.config = {
          ...defaults,
          ...saved,
          weightProfiles: { ...defaults.weightProfiles, ...(saved.weightProfiles || {}) },
          abTest: saved.abTest !== undefined ? saved.abTest : defaults.abTest,
        };
        if (!this.config.weightProfiles[this.config.activeProfile]) {
          this.config.activeProfile = DEFAULT_PROFILE_NAME;
        }
      }
    } catch (e) {
      console.warn('[RouterService] Failed to load config from DB', e);
    }
  }

  classifyRequest(prompt: string): { complexity: 'simple' | 'medium' | 'complex'; isCode: boolean; isLong: boolean; isMultimodal: boolean } {
    const cfg = this.config.classification;
    const codePatterns = new RegExp(cfg.codePatterns, 'i');
    const reasoningPatterns = new RegExp(cfg.reasoningPatterns, 'i');
    const multimodalPatterns = new RegExp(cfg.multimodalPatterns, 'i');
    const length = prompt.length;
    return {
      complexity: length > cfg.complexThreshold || reasoningPatterns.test(prompt) ? 'complex' : length > cfg.mediumThreshold ? 'medium' : 'simple',
      isCode: codePatterns.test(prompt),
      isLong: length > cfg.longThreshold,
      isMultimodal: multimodalPatterns.test(prompt),
    };
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

  resolveWithFallback(strategy: RoutingStrategy, agentId?: string): { key: ApiKey; provider: string } | null {
    const chain = this.getFallbackChain(strategy);
    const skipped: SkippedKeyEntry[] = [];
    for (const link of chain) {
      if (!this.deps.budgetService.canUseProvider(link.provider)) {
        skipped.push({ provider: link.provider, keyLabel: link.provider, keyId: undefined, reason: 'Over budget', stage: 'budget' });
        continue;
      }
      if (agentId && !this.deps.policyService.checkAgentPolicy(agentId, link.provider).allowed) {
        skipped.push({ provider: link.provider, keyLabel: link.provider, keyId: undefined, reason: 'Blocked by policy', stage: 'policy' });
        continue;
      }
      if (this.deps.keyService.isProviderCircuitOpen(link.provider)) {
        skipped.push({ provider: link.provider, keyLabel: link.provider, keyId: undefined, reason: 'Circuit breaker open', stage: 'circuit' });
        continue;
      }
      if (this.deps.keyService.isProviderRateLimited(link.provider)) {
        skipped.push({ provider: link.provider, keyLabel: link.provider, keyId: undefined, reason: 'Rate limited', stage: 'ratelimit' });
        continue;
      }
      const pool = this.deps.keyService.getPoolKeys(link.provider);
      const usable = pool.filter(k => {
        const u = this.deps.keyService.canUseKey(k.id);
        if (!u.can) skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: u.reason || 'Not usable', stage: 'quota' });
        return u.can;
      });
      if (usable.length > 0) {
        const selectedKey = this.deps.keyService.selectFromPool(link.provider);
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
  private readonly MAX_DECISIONS = 50;

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

  private recordDecision(opts: { strategy: RoutingStrategy; skipped: SkippedKeyEntry[]; selected: string; prompt: string }): void {
    this.lastDecisions.unshift({
      requestId: crypto.randomUUID().slice(0, 8),
      strategy: opts.strategy,
      classification: { complexity: 'simple', isCode: false, isLong: false, isMultimodal: false },
      weights: this.getEffectiveWeights(opts.strategy, opts.prompt, this.deps.kernel.getState(), this.getActiveProfile()),
      selected: opts.selected,
      secondBest: null,
      scores: [],
      skipped: opts.skipped,
      timestamp: Date.now(),
      promptLength: opts.prompt.length,
    });
    if (this.lastDecisions.length > this.MAX_DECISIONS) this.lastDecisions.pop();
  }

  getRankedProviders(strategy: RoutingStrategy, prompt: string, priority: 'low' | 'normal' | 'high' = 'normal', agentId?: string, probeResults?: Map<string, ProbeResult>): ApiKey[] {
    const state = this.deps.kernel.getState();
    const allKeys = this.deps.keyService.getKeys();

    const skipped: SkippedKeyEntry[] = [];
    const activeKeys = allKeys.filter(k => {
      if (k.status !== 'active') {
        skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Status: ${k.status}`, stage: 'status' });
        return false;
      }
      // Probe eligibility check
      if (probeResults) {
        const probe = probeResults.get(k.id);
        if (probe && (probe.status === 'broken' || probe.status === 'limited')) {
          skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Probe: ${probe.status} — ${probe.error || 'not eligible'}`, stage: 'unavailable' });
          return false;
        }
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
      return true;
    });
    if (activeKeys.length === 0) {
      this.recordDecision({ strategy, skipped, selected: '', prompt });
      return [];
    }

    const filteredByPolicy = agentId
      ? activeKeys.filter(k => {
          const p = this.deps.policyService.checkAgentPolicy(agentId, k.provider, k.model);
          if (!p.allowed) {
            skipped.push({ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: p.reason || 'Blocked by policy', stage: 'policy' });
            return false;
          }
          return true;
        })
      : activeKeys;
    if (agentId && filteredByPolicy.length === 0) {
      this.recordDecision({ strategy, skipped, selected: '', prompt });
      return [];
    }

    const keys = agentId ? filteredByPolicy : activeKeys;

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
    const weights = this.getEffectiveWeights(strategy, prompt, state, profile);
    const cls = this.classifyRequest(prompt);

    const providerLats = new Map<string, number>();
    for (const key of keys) {
      const pid = key.provider.toLowerCase();
      const window = this.latencyWindows.get(pid);
      const avg = window && window.length > 0
        ? window.reduce((a, b) => a + b, 0) / window.length
        : state.providers[pid]?.avgTTFT || 0;
      providerLats.set(pid, avg);
    }
    const latValues = [...providerLats.values()].sort((a, b) => a - b);
    const medianLat = latValues[Math.floor(latValues.length / 2)] || 0;

    const sc = profile.scoring;

    const rankedItems = [...keys]
      .map(key => {
        const providerId = key.provider.toLowerCase();
        const m = state.providers[providerId];
        const rawScore = m ? this.calculateScore(providerId, state, weights, sc) : 0.2;
        if (!m || rawScore <= 0) {
          skipped.push({ provider: key.provider, keyLabel: key.label, keyId: key.id, reason: !m ? 'No provider metrics' : `Score floor (${rawScore.toFixed(2)})`, stage: 'score' });
        }
        const stabilityBonus = m ? (m.stabilityIndex || 1.0) * sc.stabilityBonus : 0;
        const reputationBonus = m ? ((m.reputationScore || 100) / 100) * sc.reputationBonus : 0;
        const keyReputationBonus = ((key.stats?.extended?.reputationScore || 100) / 100) * sc.keyReputationBonus;
        const explorationBonus = state.totalRequests > 0
          ? state.explorationFactor * Math.sqrt(Math.log(state.totalRequests) / ((key.stats?.successCount || 0) + 1))
          : 0.2;
        const costPenalty = strategy === 'cost' ? this.getCostPenalty(key, prompt) : 0;
        const budgetPenalty = this.getBudgetPenalty(providerId);
        if (budgetPenalty > 0) {
          skipped.push({ provider: key.provider, keyLabel: key.label, keyId: key.id, reason: `Budget penalty: ${budgetPenalty.toFixed(2)}`, stage: 'budget' });
        }
        const affinityBonus = this.getContentAffinity(providerId, cls, prompt);
        const prioCfg = this.config.priority;
        const priorityBonus = priority === 'high' ? (prioCfg.high[providerId] || 0) :
                              priority === 'low' ? (prioCfg.low[providerId] || 0) : 0;
        const provLat = providerLats.get(providerId) || 0;
        const latencyPenalty = this.deps.routingPolicyService.calculateLatencyPenalty(providerId, provLat, medianLat);
        return { key, score: rawScore + explorationBonus + keyReputationBonus + affinityBonus + priorityBonus - costPenalty - latencyPenalty - budgetPenalty, components: { raw: rawScore, stabilityBonus, reputationBonus, explorationBonus, keyReputationBonus, affinityBonus, priorityBonus, costPenalty, latencyPenalty, budgetPenalty } };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (rankedItems.length > 0) {
      const decision: RouterDecision = {
        requestId: crypto.randomUUID().slice(0, 8),
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
        timestamp: Date.now(),
        promptLength: prompt.length,
        estimatedCost: this.estimateCost(rankedItems[0].key, prompt),
      };
      this.decisionHistory.unshift(decision);
      if (this.decisionHistory.length > this.config.history.maxDecisions) this.decisionHistory.pop();
      const isExperiment = usedProfile !== this.config.activeProfile;
      this.deps.eventBus.emit('system:decision', {
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

    // Shadow mode: compare with KeyStateStore routing
    if (this.deps.keyStateStore && rankedItems.length > 0) {
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
    return this.getRankedProviders('latency', prompt).slice(0, 2);
  }

  private getContentAffinity(providerId: string, cls: ReturnType<RouterService['classifyRequest']>, prompt: string): number {
    const len = prompt.length;
    const aff = this.config.affinity;
    let bonus = 0;
    if (cls.isMultimodal) bonus += aff.multimodal[providerId] || 0;
    if (cls.isCode) bonus += aff.code[providerId] || 0;
    if (len > aff.longPrompt.minLength) bonus += aff.longPrompt.values[providerId] || 0;
    else if (len < aff.shortPrompt.maxLength) bonus += aff.shortPrompt.values[providerId] || 0;
    if (cls.complexity === 'complex') bonus += aff.complexity.complex[providerId] || 0;
    else if (cls.complexity === 'simple') bonus += aff.complexity.simple[providerId] || 0;
    return bonus;
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

  private estimateCost(key: ApiKey, prompt: string): number {
    const model = key.model || 'auto';
    const pricing = this.deps.pricingService.getPricingForModel(model);
    if (!pricing) return 0;
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = inputTokens * 2;
    return (inputTokens / 1_000_000) * (pricing.input || 0.0001) + (outputTokens / 1_000_000) * (pricing.output || 0.0001);
  }

  private getEffectiveWeights(strategy: RoutingStrategy, prompt: string, state: SystemState, profile?: WeightProfile): RouterWeights {
    const p = profile || this.getActiveProfile();
    const isLong = prompt.length > 800;
    const isShort = prompt.length < 100;
    const adj = p.autoDynamicAdjustment;

    if (strategy !== 'auto') {
      const sw = p.strategyWeights[strategy as keyof typeof p.strategyWeights];
      if (sw) return sw;
    }

    const w = { ...state.weights.effective };

    if (isShort) {
      w.ttft += adj.short.ttftDelta;
      w.tps += adj.short.tpsDelta;
      w.reliability += adj.short.reliabilityDelta;
    }
    if (isLong) {
      w.ttft += adj.long.ttftDelta;
      w.tps += adj.long.tpsDelta;
      w.reliability += adj.long.reliabilityDelta;
    }

    if (strategy === 'auto') {
      w.reliability += 0.1;
    }

    return this.normalize(w);
  }

  private normalize(w: RouterWeights): RouterWeights {
    const sum = Math.max(0.01, w.ttft + w.tps + w.reliability);
    return { ttft: w.ttft / sum, tps: w.tps / sum, reliability: w.reliability / sum };
  }

  private calculateScore(providerId: string, state: SystemState, weights: RouterWeights, sc?: ScoringConfig): number {
    const m = state.providers[providerId];
    const scoring = sc || this.getActiveProfile().scoring;
    if (!m) return 0.2;
    if (m.reliability < scoring.reliability.floor || m.status === 'offline') return 0;

    const ttftScore = Math.max(0, 1 - (m.avgTTFT / scoring.ttft.maxMs));
    const tpsScore = Math.min(1, m.avgTPS / scoring.tps.max);
    const stabilityBonus = (m.stabilityIndex || 1.0) * scoring.stabilityBonus;
    const reputationBonus = ((m.reputationScore || 100) / 100) * scoring.reputationBonus;

    return (m.reliability * weights.reliability) + (ttftScore * weights.ttft) + (tpsScore * weights.tps) + stabilityBonus + reputationBonus;
  }

  setStrategy(strategy: RoutingStrategy) {
    const w = this.config.strategyWeights[strategy];
    if (w) this.deps.kernel.setBaseWeights(w);
  }

  getCurrentAutoWeights() { return this.deps.kernel.getState().weights.effective; }

  getLatencyBalancedWeights(): RouterWeights {
    const state = this.deps.kernel.getState();
    const providers = Object.values(state.providers);
    const profile = this.getActiveProfile();
    if (providers.length === 0) return profile.defaultWeights;

    const allLats = providers.map(p => {
      const window = this.latencyWindows.get(p.id);
      if (window && window.length > 0) {
        return window.reduce((a, b) => a + b, 0) / window.length;
      }
      return p.avgTTFT;
    });

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

  getDebateProviders(count: number): Array<{ provider: string; key: ApiKey }> {
    const allKeys = this.deps.keyService.getKeys();
    const activeKeys = allKeys.filter(k => {
      if (k.status !== 'active') {
        this.lastDecisions.unshift({
          requestId: crypto.randomUUID().slice(0, 8),
          strategy: 'latency',
          classification: { complexity: 'simple', isCode: false, isLong: false, isMultimodal: false },
          weights: this.getEffectiveWeights('latency', '', this.deps.kernel.getState(), this.getActiveProfile()),
          selected: '',
          secondBest: null,
          scores: [],
          skipped: [{ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: `Status: ${k.status}`, stage: 'status' }],
          timestamp: Date.now(),
          promptLength: 0,
        });
        return false;
      }
      if (this.deps.keyService.isProviderCircuitOpen(k.provider)) {
        this.lastDecisions.unshift({
          requestId: crypto.randomUUID().slice(0, 8),
          strategy: 'latency',
          classification: { complexity: 'simple', isCode: false, isLong: false, isMultimodal: false },
          weights: this.getEffectiveWeights('latency', '', this.deps.kernel.getState(), this.getActiveProfile()),
          selected: '',
          secondBest: null,
          scores: [],
          skipped: [{ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: 'Circuit breaker open', stage: 'circuit' }],
          timestamp: Date.now(),
          promptLength: 0,
        });
        return false;
      }
      if (this.deps.keyService.isProviderRateLimited(k.provider)) {
        this.lastDecisions.unshift({
          requestId: crypto.randomUUID().slice(0, 8),
          strategy: 'latency',
          classification: { complexity: 'simple', isCode: false, isLong: false, isMultimodal: false },
          weights: this.getEffectiveWeights('latency', '', this.deps.kernel.getState(), this.getActiveProfile()),
          selected: '',
          secondBest: null,
          scores: [],
          skipped: [{ provider: k.provider, keyLabel: k.label, keyId: k.id, reason: 'Rate limited', stage: 'ratelimit' }],
          timestamp: Date.now(),
          promptLength: 0,
        });
        return false;
      }
      return true;
    });
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

  getRawConfig(): RoutingPolicySnapshot {
    return this.getRoutingPolicySurface();
  }
}

function buildDefaultProfile(r: typeof CONFIG.router): WeightProfile {
  return {
    name: DEFAULT_PROFILE_NAME,
    description: 'Default system profile based on CONFIG.router defaults',
    defaultWeights: r.defaultWeights,
    strategyWeights: { ...r.strategyWeights, free_first: r.strategyWeights.freeFirst },
    autoDynamicAdjustment: r.autoDynamicAdjustment,
    latencyVarianceBands: r.latencyVarianceBands,
    scoring: {
      ttft: { maxMs: r.scoring.ttftMaxMs },
      tps: { max: r.scoring.tpsMax },
      reliability: { floor: r.scoring.reliabilityFloor },
      stabilityBonus: r.scoring.stabilityBonus,
      reputationBonus: r.scoring.reputationBonus,
      keyReputationBonus: r.scoring.keyReputationBonus,
      latencyPenalty: r.scoring.latencyPenalty,
      costPenalty: r.scoring.costPenalty,
    },
  };
}

function routerConfigFromCONFIG(): RouterConfig {
  const r = CONFIG.router;
  const defaultProfile = buildDefaultProfile(r);
  return {
    history: r.history,
    latency: r.latency,
    activeProfile: DEFAULT_PROFILE_NAME,
    weightProfiles: { [DEFAULT_PROFILE_NAME]: defaultProfile },
    abTest: null,
    classification: {
      complexThreshold: r.classification.complexThreshold,
      mediumThreshold: r.classification.mediumThreshold,
      longThreshold: r.classification.longThreshold,
      codePatterns: r.classification.codePatterns,
      reasoningPatterns: r.classification.reasoningPatterns,
      multimodalPatterns: r.classification.multimodalPatterns,
    },
    affinity: r.affinity,
    priority: r.priority,
    providerByComplexity: r.providerByComplexity,
  };
}
