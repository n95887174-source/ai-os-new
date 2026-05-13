import { kernel } from '../core/Kernel';
import { eventBus } from '../core/events';
import { keyService } from './KeyService';
import type { ApiKey } from '../types/metrics';
import type { RouterWeights, SystemState } from '../types/metrics';
import { pricingService } from './PricingService';

export type RoutingStrategy = 'broadcast' | 'performance' | 'reliability' | 'latency' | 'auto' | 'race' | 'cost';

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

class RouterService {
  private decisionHistory: RouterDecision[] = [];
  private readonly MAX_DECISIONS = 100;

  getRankedProviders(strategy: RoutingStrategy, prompt: string): ApiKey[] {
    const state = kernel.getState();
    const activeKeys = keyService.getKeys().filter(k => k.status === 'active');
    if (activeKeys.length === 0) return [];

    const weights = this.getEffectiveWeights(strategy, prompt, state);

    const rankedItems = [...activeKeys]
      .map(key => {
        const providerId = key.provider.toLowerCase();
        const rawScore = this.calculateScore(providerId, state, weights);
        const keyReputationBonus = ((key.stats?.extended?.reputationScore || 100) / 100) * 0.15;
        const explorationBonus = state.totalRequests > 0
          ? state.explorationFactor * Math.sqrt(Math.log(state.totalRequests) / ((key.stats?.successCount || 0) + 1))
          : 0.2;
        const costPenalty = strategy === 'cost' ? this.getCostPenalty(key, prompt) : 0;
        return { key, score: rawScore + explorationBonus + keyReputationBonus - costPenalty };
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
      eventBus.emit('system:decision', {
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

  private getCostPenalty(key: ApiKey, prompt: string): number {
    const model = key.model || 'auto';
    const pricing = pricingService.getPricingForModel(model);
    if (!pricing) return 0;
    const inputTokens = prompt.length / 4;
    const estimatedCost = (inputTokens / 1000) * (pricing.input || 0.0001);
    return estimatedCost * 100;
  }

  private estimateCost(key: ApiKey, prompt: string): number {
    const model = key.model || 'auto';
    const pricing = pricingService.getPricingForModel(model);
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
    if (w) kernel.setBaseWeights(w);
  }

  getCurrentAutoWeights() { return kernel.getState().weights.effective; }

  getDecisionHistory(limit = 20): RouterDecision[] {
    return this.decisionHistory.slice(0, limit);
  }

  getProviderStats() {
    const state = kernel.getState();
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
}

export const routerService = new RouterService();
