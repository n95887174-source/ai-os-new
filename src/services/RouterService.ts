import { db } from '../core/DatabaseService';
import type { SystemKernel } from '../core/Kernel';
import type { KeyService } from './KeyService';
import type { ApiKey } from '../types/metrics';
import type { RouterWeights, SystemState } from '../types/metrics';
import type { PricingService } from './PricingService';

export type RoutingStrategy = 'broadcast' | 'performance' | 'reliability' | 'latency' | 'auto' | 'race' | 'cost' | 'free_first';

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

export class RouterService {
  private decisionHistory: RouterDecision[] = [];
  private readonly MAX_DECISIONS = 100;

  constructor(
    private deps: {
      kernel: SystemKernel;
      keyService: KeyService;
      pricingService: PricingService;
      eventBus: any;
    }
  ) {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const fb = await db.getKv<Record<string, Array<{ provider: string; model?: string }>>>('router_fallback_chains');
      if (fb) this.fallbackChains = fb;
      const dg = await db.getKv<Record<string, string[]>>('router_downgrade_chains');
      if (dg) this.modelDowngradeChains = dg;
    } catch (e) {
      console.warn('[RouterService] Failed to load config from DB', e);
    }
  }

  private async saveConfig() {
    try {
      await db.setKv('router_fallback_chains', this.fallbackChains);
      await db.setKv('router_downgrade_chains', this.modelDowngradeChains);
    } catch (e) {
      console.error('[RouterService] Failed to save config to DB', e);
    }
  }

  private fallbackChains: Record<string, Array<{ provider: string; model?: string }>> = {
    free_first: [
      { provider: 'groq', model: 'llama-3.3-70b' },
      { provider: 'gemini', model: 'gemini-2.0-flash' },
      { provider: 'openrouter', model: ':free' },
      { provider: 'nvidia', model: 'llama-3.1-70b' },
    ],
    cost: [
      { provider: 'groq' },
      { provider: 'gemini' },
      { provider: 'openrouter' },
    ],
    default: [
      { provider: 'groq' },
      { provider: 'gemini' },
      { provider: 'openrouter' },
      { provider: 'nvidia' },
    ],
  };

  private modelDowngradeChains: Record<string, string[]> = {
    'gemini-2.0-pro': ['gemini-2.0-flash', 'gemini-1.5-flash'],
    'gemini-1.5-pro': ['gemini-1.5-flash'],
    'gemini-2.0-flash': ['gemini-1.5-flash'],
    'gpt-4o': ['gpt-4o-mini', 'gpt-3.5-turbo'],
    'gpt-4-turbo': ['gpt-4o-mini', 'gpt-3.5-turbo'],
    'claude-3-5-sonnet': ['claude-3-haiku'],
    'claude-3-opus': ['claude-3-5-sonnet', 'claude-3-haiku'],
    'llama-3.3-70b': ['llama-3.1-8b'],
    'llama-3.1-70b': ['llama-3.1-8b'],
  };

  classifyRequest(prompt: string): { complexity: 'simple' | 'medium' | 'complex'; isCode: boolean; isLong: boolean; isMultimodal: boolean } {
    const codePatterns = /(function|class|const|import|export|def |```|SELECT|CREATE TABLE|async |await )/i;
    const reasoningPatterns = /(why|explain|analyze|compare|contrast|what if|how does|reason|think step|solve)/i;
    const multimodalPatterns = /(image|picture|photo|diagram|chart|graph|visual|render|draw)/i;
    const length = prompt.length;
    return {
      complexity: length > 2000 || reasoningPatterns.test(prompt) ? 'complex' : length > 500 ? 'medium' : 'simple',
      isCode: codePatterns.test(prompt),
      isLong: length > 4000,
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
    if (cls.isMultimodal) return { provider: 'gemini', model: 'gemini-2.0-flash' };
    if (cls.isLong) return { provider: 'gemini', model: 'gemini-2.0-flash' };
    if (cls.complexity === 'complex' && cls.isCode) return { provider: 'gemini', model: 'gemini-2.0-pro' };
    if (cls.complexity === 'complex') return { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' };
    if (cls.complexity === 'medium') return { provider: 'groq', model: 'llama-3.3-70b' };
    return { provider: 'groq', model: 'llama-3.1-8b' };
  }

  getFallbackChain(strategy: RoutingStrategy): Array<{ provider: string; model?: string }> {
    return this.fallbackChains[strategy] || this.fallbackChains.default;
  }

  resolveWithFallback(strategy: RoutingStrategy): { key: ApiKey; provider: string } | null {
    const chain = this.getFallbackChain(strategy);
    for (const link of chain) {
      const pool = this.deps.keyService.getPoolKeys(link.provider);
      const usable = pool.filter(k => this.deps.keyService.canUseKey(k.id).can);
      if (usable.length > 0) {
        return { key: this.deps.keyService.selectFromPool(link.provider, 'round-robin')!, provider: link.provider };
      }
    }
    const allActive = this.deps.keyService.getKeys().filter(k => k.status === 'active');
    if (allActive.length > 0) {
      return { key: allActive[0], provider: allActive[0].provider };
    }
    return null;
  }

  getRankedProviders(strategy: RoutingStrategy, prompt: string, priority: 'low' | 'normal' | 'high' = 'normal'): ApiKey[] {
    const state = this.deps.kernel.getState();
    const activeKeys = this.deps.keyService.getKeys().filter(k => k.status === 'active');
    if (activeKeys.length === 0) return [];

    if (strategy === 'free_first') {
      const freeKeys = activeKeys.filter(k =>
        k.tags?.some(t => t === 'tier:free') || k.label.toLowerCase().includes('free')
      );
      const paidKeys = activeKeys.filter(k =>
        !(k.tags?.some(t => t === 'tier:free') || k.label.toLowerCase().includes('free'))
      );
      const usableFree = freeKeys.filter(k => this.deps.keyService.canUseKey(k.id).can);
      if (usableFree.length > 0) return usableFree;
      return paidKeys;
    }

    const weights = this.getEffectiveWeights(strategy, prompt, state);

    const cls = this.classifyRequest(prompt);

    const rankedItems = [...activeKeys]
      .map(key => {
        const providerId = key.provider.toLowerCase();
        const rawScore = this.calculateScore(providerId, state, weights);
        const keyReputationBonus = ((key.stats?.extended?.reputationScore || 100) / 100) * 0.15;
        const explorationBonus = state.totalRequests > 0
          ? state.explorationFactor * Math.sqrt(Math.log(state.totalRequests) / ((key.stats?.successCount || 0) + 1))
          : 0.2;
        const costPenalty = strategy === 'cost' ? this.getCostPenalty(key, prompt) : 0;
        const affinityBonus = this.getContentAffinity(providerId, cls, prompt);
        const priorityBonus = priority === 'high' ? (providerId === 'groq' ? 0.4 : providerId === 'gemini' ? 0.2 : 0) :
                              priority === 'low' ? (providerId === 'groq' ? -0.2 : 0) : 0;
        return { key, score: rawScore + explorationBonus + keyReputationBonus + affinityBonus + priorityBonus - costPenalty };
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
      if (this.decisionHistory.length > this.MAX_DECISIONS) this.decisionHistory.pop();
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
    let bonus = 0;

    if (cls.isMultimodal) {
      if (providerId === 'gemini') bonus += 0.5;
      if (providerId === 'openrouter') bonus += 0.3;
    }

    if (cls.isCode) {
      if (providerId === 'gemini') bonus += 0.3;
      if (providerId === 'openrouter') bonus += 0.3;
      if (providerId === 'groq') bonus += 0.2;
    }

    if (len > 8000) {
      if (providerId === 'gemini') bonus += 0.4;
      if (providerId === 'openrouter') bonus += 0.2;
    } else if (len < 200) {
      if (providerId === 'groq') bonus += 0.3;
      if (providerId === 'gemini') bonus += 0.15;
    }

    if (cls.complexity === 'complex') {
      if (providerId === 'openrouter') bonus += 0.3;
      if (providerId === 'gemini') bonus += 0.2;
    } else if (cls.complexity === 'simple') {
      if (providerId === 'groq') bonus += 0.25;
    }

    return bonus;
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
    let w = { ...state.weights.effective };

    switch (strategy) {
      case 'latency':
        w = { ttft: 0.8, tps: 0.0, reliability: 0.2 }; break;
      case 'reliability':
        w = { ttft: 0.1, tps: 0.1, reliability: 0.8 }; break;
      case 'performance':
        w = { ttft: 0.1, tps: 0.7, reliability: 0.2 }; break;
      case 'race':
        w = { ttft: 0.9, tps: 0.0, reliability: 0.1 }; break;
      case 'cost':
        w = { ttft: 0.1, tps: 0.3, reliability: 0.1 }; break;
      case 'free_first':
        w = { ttft: 0.1, tps: 0.1, reliability: 0.8 }; break;
      default:
        if (isShort) { w.ttft += 0.2; w.tps -= 0.1; }
        if (isLong) { w.tps += 0.3; w.ttft -= 0.2; }
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
    if (!m) return 0.2;
    if (m.reliability < 0.4 || m.status === 'offline') return 0;

    const ttftScore = Math.max(0, 1 - (m.avgTTFT / 2000));
    const tpsScore = Math.min(1, m.avgTPS / 100);
    const stabilityBonus = (m.stabilityIndex || 1.0) * 0.1;
    const reputationBonus = ((m.reputationScore || 100) / 100) * 0.1;

    return (m.reliability * weights.reliability) + (ttftScore * weights.ttft) + (tpsScore * weights.tps) + stabilityBonus + reputationBonus;
  }

  setStrategy(strategy: RoutingStrategy) {
    const weightsMap: Record<string, { ttft: number; tps: number; reliability: number }> = {
      'broadcast': { ttft: 0.33, tps: 0.33, reliability: 0.34 },
      'performance': { ttft: 0.1, tps: 0.7, reliability: 0.2 },
      'reliability': { ttft: 0.1, tps: 0.1, reliability: 0.8 },
      'latency': { ttft: 0.8, tps: 0.0, reliability: 0.2 },
      'auto': { ttft: 0.4, tps: 0.2, reliability: 0.4 },
      'race': { ttft: 0.9, tps: 0.0, reliability: 0.1 },
      'cost': { ttft: 0.1, tps: 0.3, reliability: 0.1 },
    };
    const w = weightsMap[strategy];
    if (w) this.deps.kernel.setBaseWeights(w);
  }

  getCurrentAutoWeights() { return this.deps.kernel.getState().weights.effective; }

  getLatencyBalancedWeights(): RouterWeights {
    const state = this.deps.kernel.getState();
    const providers = Object.values(state.providers);
    if (providers.length === 0) return { ttft: 0.4, tps: 0.3, reliability: 0.3 };
    const avgLatency = providers.reduce((s, p) => s + p.avgTTFT, 0) / providers.length;
    const maxLatency = Math.max(...providers.map(p => p.avgTTFT), 1);
    const variance = (maxLatency - avgLatency) / avgLatency || 0.1;
    if (variance > 0.5) {
      return { ttft: 0.7, tps: 0.2, reliability: 0.1 };
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
    this.fallbackChains[strategy] = chain;
    this.saveConfig();
  }

  setDowngradeChain(model: string, chain: string[]) {
    this.modelDowngradeChains[model] = chain;
    this.saveConfig();
  }

  getRawConfig() {
    return {
      fallbackChains: this.fallbackChains,
      modelDowngradeChains: this.modelDowngradeChains
    };
  }
}

export const routerService = new RouterService();
