import { kernel } from '../core/Kernel';
import { eventBus } from '../core/events';
import { keyService } from './KeyService';
import type { ApiKey } from '../types/metrics';
import type { RouterWeights, SystemState } from '../types/metrics';

export type RoutingStrategy = 'broadcast' | 'performance' | 'reliability' | 'latency' | 'auto' | 'race';

class RouterService {
  getRankedProviders(strategy: RoutingStrategy, prompt: string): ApiKey[] {
    const state = kernel.getState();
    const activeKeys = keyService.getKeys().filter(k => k.status === 'active');
    
    if (activeKeys.length === 0) return [];

    const weights = this.getEffectiveWeights(strategy, prompt, state);

    const rankedItems = [...activeKeys]
      .map(key => {
        // Use key.id instead of provider.toLowerCase() for more granular lookup in future
        // but for now Kernel tracks by provider name. We can enhance score by key stats.
        const providerId = key.provider.toLowerCase();
        const m = state.providers[providerId];
        
        // Base Score from Kernel state (shared for provider)
        const baseScore = this.calculateScore(providerId, state, weights);
        
        // Key-specific reputation boost
        const keyReputationBonus = ((key.stats?.extended?.reputationScore || 100) / 100) * 0.2;
        
        // UCB1 Exploration Bonus (per key!)
        const explorationBonus = state.totalRequests > 0 
          ? state.explorationFactor * Math.sqrt(Math.log(state.totalRequests) / ((key.stats?.successCount || 0) + 1))
          : 0.2;

        return { key, score: baseScore + explorationBonus + keyReputationBonus };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    // Emit decision trace (Kernel will pick it up and store it)
    if (rankedItems.length > 0) {
      eventBus.emit('system:decision', {
        requestId: crypto.randomUUID().slice(0, 8),
        strategy,
        weights,
        selected: rankedItems[0].key.provider,
        secondBest: rankedItems[1]?.key.provider || null,
        scores: rankedItems.slice(0, 3).map(i => ({ p: i.key.provider, s: i.score.toFixed(3) })),
        timestamp: Date.now()
      });
    }

    return rankedItems.map(item => item.key);
  }

  getRaceCandidates(prompt: string): ApiKey[] {
    return this.getRankedProviders('latency', prompt).slice(0, 2);
  }

  private getEffectiveWeights(strategy: RoutingStrategy, prompt: string, state: SystemState): RouterWeights {
    const isLong = prompt.length > 800;
    const isShort = prompt.length < 100;

    // Use current adaptive weights from Kernel
    let w = { ...state.weights.effective };

    if (strategy === 'latency') {
      w = { ttft: 0.8, tps: 0.0, reliability: 0.2 };
    } else if (strategy === 'reliability') {
      w = { ttft: 0.1, tps: 0.1, reliability: 0.8 };
    } else if (strategy === 'performance') {
      w = { ttft: 0.1, tps: 0.7, reliability: 0.2 };
    } else if (strategy === 'race') {
      w = { ttft: 0.9, tps: 0.0, reliability: 0.1 };
    } else {
      // For 'auto', we already have effective weights in Kernel, just apply contextual shift
      if (isShort) { w.ttft += 0.2; w.tps -= 0.1; }
      if (isLong)  { w.tps += 0.3; w.ttft -= 0.2; }
      
      // Bonus: stability-aware routing
      w.reliability += 0.1; // Bias towards stable providers
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
    
    // Incorporate advanced metrics
    const stabilityBonus = (m.stabilityIndex || 1.0) * 0.1;
    const reputationBonus = ((m.reputationScore || 100) / 100) * 0.1;

    const baseScore = (m.reliability * weights.reliability) + (ttftScore * weights.ttft) + (tpsScore * weights.tps);
    return baseScore + stabilityBonus + reputationBonus;
  }

  getCurrentAutoWeights() { return kernel.getState().weights.effective; }
}

export const routerService = new RouterService();
