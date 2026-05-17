import type { ApiKey, RouterWeights, SystemState } from '../../types/metrics';
import type { RouterConfig } from '../../types/routing';
import { DEFAULT_ROUTER_CONFIG } from '../../types/routing';
import { EVENTS } from '../events/event-names';

const CONFIG_KEY = 'router_config';

export type RoutingStrategy = 'broadcast' | 'performance' | 'reliability' | 'latency' | 'auto' | 'race' | 'cost' | 'free_first' | 'content';

export interface RouterDecision {
  requestId: string;
  strategy: RoutingStrategy;
  weights: RouterWeights;
  selected: string;
  secondBest: string | null;
  scores: { provider: string; score: number; breakdown: { ttft: number; tps: number; reliability: number; cost: number } }[];
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
  settingsService: {
    getSettings: () => { fallbackChains: Record<string, any>; modelDowngradeChains: Record<string, string[]> };
  };
}

export class RouterService {
  private decisionHistory: RouterDecision[] = [];
  private config: RouterConfig = DEFAULT_ROUTER_CONFIG;
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

  getConfig(): RouterConfig {
    return { ...this.config };
  }

  async updateConfig(partial: Partial<RouterConfig>): Promise<void> {
    this.config = { ...this.config, ...partial };
    await this.deps.database.setKv(CONFIG_KEY, this.config);
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
      if (saved) this.config = { ...DEFAULT_ROUTER_CONFIG, ...saved };
    } catch (e) {
      console.warn('[RouterService] Failed to load config from DB', e);
    }
  }

  private get fallbackChains() {
    return this.deps.settingsService.getSettings().fallbackChains;
  }

  private get modelDowngradeChains() {
    return this.deps.settingsService.getSettings().modelDowngradeChains;
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
    return this.modelDowngradeChains[model] || [];
  }

  getDowngradedModel(model: string): string | null {
    const chain = this.getDowngradeChain(model);
    return chain.length > 0 ? chain[0] : null;
  }

  getDeepDowngradedModel(model: string, steps: number): string | null {
    const chain = this.getDowngradeChain(model);
    if (chain.length === 0) return null;
    const idx = Math.min(steps - 1, chain.length - 1);
    return chain[idx];
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

  getFallbackChain(strategy: RoutingStrategy): Array<{ provider: string; model?: string }> {
    return this.fallbackChains[strategy] || this.fallbackChains.default;
  }

  resolveWithFallback(strategy: RoutingStrategy, agentId?: string): { key: ApiKey; provider: string } | null {
    const chain = this.getFallbackChain(strategy);
    for (const link of chain) {
      if (!this.deps.budgetService.canUseProvider(link.provider)) continue;
      if (agentId && !this.deps.policyService.checkAgentPolicy(agentId, link.provider).allowed) continue;
      const pool = this.deps.keyService.getPoolKeys(link.provider);
      const usable = pool.filter(k => this.deps.keyService.canUseKey(k.id).can);
      if (usable.length > 0) {
        return { key: this.deps.keyService.selectFromPool(link.provider)!, provider: link.provider };
      }
    }
    const allActive = this.deps.keyService.getKeys().filter(k => k.status === 'active');
    if (allActive.length > 0) {
      return { key: allActive[0], provider: allActive[0].provider };
    }
    return null;
  }

  getRankedProviders(strategy: RoutingStrategy, prompt: string, priority: 'low' | 'normal' | 'high' = 'normal', agentId?: string): ApiKey[] {
    const state = this.deps.kernel.getState();
    const activeKeys = this.deps.keyService.getKeys().filter(k => k.status === 'active');
    if (activeKeys.length === 0) return [];

    const filteredByPolicy = agentId
      ? activeKeys.filter(k => this.deps.policyService.checkAgentPolicy(agentId, k.provider, k.model).allowed)
      : activeKeys;
    if (agentId && filteredByPolicy.length === 0) return [];

    const keys = agentId ? filteredByPolicy : activeKeys;

    if (strategy === 'free_first') {
      const freeKeys = keys.filter(k =>
        k.tags?.some(t => t === 'tier:free') || k.label.toLowerCase().includes('free')
      );
      const paidKeys = keys.filter(k =>
        !(k.tags?.some(t => t === 'tier:free') || k.label.toLowerCase().includes('free'))
      );
      const usableFree = freeKeys.filter(k => this.deps.keyService.canUseKey(k.id).can);
      if (usableFree.length > 0) return usableFree;
      return paidKeys;
    }

    const weights = this.getEffectiveWeights(strategy, prompt, state);
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

    const rankedItems = [...keys]
      .map(key => {
        const providerId = key.provider.toLowerCase();
        const rawScore = this.calculateScore(providerId, state, weights);
        const keyReputationBonus = ((key.stats?.extended?.reputationScore || 100) / 100) * this.config.scoring.keyReputationBonus;
        const explorationBonus = state.totalRequests > 0
          ? state.explorationFactor * Math.sqrt(Math.log(state.totalRequests) / ((key.stats?.successCount || 0) + 1))
          : 0.2;
        const costPenalty = strategy === 'cost' ? this.getCostPenalty(key, prompt) : 0;
        const budgetPenalty = this.getBudgetPenalty(providerId);
        const affinityBonus = this.getContentAffinity(providerId, cls, prompt);
        const prioCfg = this.config.priority;
        const priorityBonus = priority === 'high' ? (prioCfg.high[providerId] || 0) :
                              priority === 'low' ? (prioCfg.low[providerId] || 0) : 0;
        const provLat = providerLats.get(providerId) || 0;
        const lpCfg = this.config.scoring.latencyPenalty;
        const latencyPenalty = medianLat > 0 && provLat > medianLat * lpCfg.thresholdRatio
          ? Math.min(lpCfg.max, ((provLat / medianLat) - lpCfg.thresholdRatio) * lpCfg.slope)
          : 0;
        return { key, score: rawScore + explorationBonus + keyReputationBonus + affinityBonus + priorityBonus - costPenalty - latencyPenalty - budgetPenalty };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (rankedItems.length > 0) {
      const decision: RouterDecision = {
        requestId: crypto.randomUUID().slice(0, 8),
        strategy,
        weights,
        selected: rankedItems[0].key.provider,
        secondBest: rankedItems[1]?.key.provider || null,
        scores: rankedItems.slice(0, 3).map(i => ({
          provider: i.key.provider,
          score: i.score,
          breakdown: {
            ttft: weights.ttft,
            tps: weights.tps,
            reliability: weights.reliability,
            cost: this.getCostPenalty(i.key, prompt),
          },
        })),
        timestamp: Date.now(),
        promptLength: prompt.length,
        estimatedCost: this.estimateCost(rankedItems[0].key, prompt),
      };
      this.decisionHistory.unshift(decision);
      if (this.decisionHistory.length > this.config.history.maxDecisions) this.decisionHistory.pop();
      this.deps.eventBus.emit('system:decision', {
        requestId: decision.requestId,
        strategy,
        weights,
        selected: decision.selected,
        secondBest: decision.secondBest,
        scores: decision.scores.map(s => ({ p: s.provider, s: s.score.toFixed(3) })),
        timestamp: Date.now(),
      });
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
    if (!provInfo || provInfo.monthlyBudget <= 0) return 0;
    const pct = provInfo.spentThisMonth / provInfo.monthlyBudget;
    if (pct >= 1) return 100;
    if (pct >= 0.9) return 50;
    if (pct >= 0.8) return 20;
    return 0;
  }

  private getCostPenalty(key: ApiKey, prompt: string): number {
    const model = key.model || 'auto';
    const pricing = this.deps.pricingService.getPricingForModel(model);
    if (!pricing) return 0;
    const inputTokens = prompt.length / 4;
    const estimatedCost = (inputTokens / 1000) * (pricing.input || 0.0001);
    return estimatedCost * 100;
  }

  private estimateCost(key: ApiKey, prompt: string): number {
    const model = key.model || 'auto';
    const pricing = this.deps.pricingService.getPricingForModel(model);
    if (!pricing) return 0;
    const inputTokens = prompt.length / 4;
    const outputTokens = inputTokens * 2;
    return (inputTokens / 1000) * (pricing.input || 0.0001) + (outputTokens / 1000) * (pricing.output || 0.0001);
  }

  private getEffectiveWeights(strategy: RoutingStrategy, prompt: string, state: SystemState): RouterWeights {
    const isLong = prompt.length > 800;
    const isShort = prompt.length < 100;
    const adj = this.config.autoDynamicAdjustment;

    if (strategy !== 'auto') {
      const sw = this.config.strategyWeights[strategy];
      if (sw) return sw;
    }

    let w = { ...state.weights.effective };

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

  private calculateScore(providerId: string, state: SystemState, weights: RouterWeights): number {
    const m = state.providers[providerId];
    const sc = this.config.scoring;
    if (!m) return 0.2;
    if (m.reliability < sc.reliability.floor || m.status === 'offline') return 0;

    const ttftScore = Math.max(0, 1 - (m.avgTTFT / sc.ttft.maxMs));
    const tpsScore = Math.min(1, m.avgTPS / sc.tps.max);
    const stabilityBonus = (m.stabilityIndex || 1.0) * sc.stabilityBonus;
    const reputationBonus = ((m.reputationScore || 100) / 100) * sc.reputationBonus;

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
    if (providers.length === 0) return this.config.defaultWeights;

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

    for (const band of this.config.latencyVarianceBands) {
      if (variance > band.minVariance) return band.weights;
    }
    return state.weights.effective;
  }

  getDecisionHistory(limit = 20): RouterDecision[] {
    return this.decisionHistory.slice(0, limit);
  }

  getDebateProviders(count: number): Array<{ provider: string; key: ApiKey }> {
    const activeKeys = this.deps.keyService.getKeys().filter(k => k.status === 'active');
    const uniqueProviders = new Map<string, ApiKey>();
    for (const k of activeKeys) {
      if (!uniqueProviders.has(k.provider)) {
        uniqueProviders.set(k.provider, k);
      }
    }
    const shuffled = Array.from(uniqueProviders.entries()).sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length)).map(([provider, key]) => ({ provider, key }));
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

  setFallbackChain(strategy: string, chain: Array<{ provider: string; model?: string }>) {
    this.deps.settingsService.updateSettings({ fallbackChains: { ...this.fallbackChains, [strategy]: chain } });
  }

  setDowngradeChain(model: string, chain: string[]) {
    this.deps.settingsService.updateSettings({ modelDowngradeChains: { ...this.modelDowngradeChains, [model]: chain } });
  }

  getRawConfig() {
    return {
      fallbackChains: this.fallbackChains,
      modelDowngradeChains: this.modelDowngradeChains
    };
  }
}
