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
}

export class ProviderTracker implements IProviderTracker {
  private costCalculator?: ICostCalculator;

  constructor(deps?: ProviderTrackerDeps) {
    this.costCalculator = deps?.costCalculator;
  }

  updateProviderMetric(state: SystemState, data: ProviderMetricData): void {
    const p = data.provider.toLowerCase();
    const prev = state.providers[p] || this.getDefaultProvider(data.provider);

    const tokens = data.tokens || estimateTokens(data.fullContent || '');
    const genTime = (data.latency - (data.ttft || 0)) / 1000;
    const currentTPS = genTime > 0 ? tokens / genTime : prev.avgTPS;

    prev.avgTTFT = data.ttft ? (ALPHA * data.ttft) + (1 - ALPHA) * prev.avgTTFT : prev.avgTTFT;
    prev.avgTPS = (ALPHA * currentTPS) + (1 - ALPHA) * prev.avgTPS;
    prev.reliability = (ALPHA * 1) + (1 - ALPHA) * prev.reliability;
    prev.stabilityIndex = Math.min(1.0, (ALPHA * 1.0) + (1 - ALPHA) * prev.stabilityIndex);
    prev.reputationScore = Math.min(100, (ALPHA * 100) + (1 - ALPHA) * prev.reputationScore);
    prev.status = prev.reliability > 0.8 ? 'healthy' : prev.reliability > 0.4 ? 'degraded' : 'offline';
    prev.totalRequests++;
    state.providers[p] = { ...prev };
    state.totalRequests++;
    state.totalTokens += tokens;

    if (this.costCalculator && data.model) {
      const model = data.model.toLowerCase();
      const inputTokens = Math.ceil(tokens * 0.3);
      const outputTokens = tokens - inputTokens;
      state.estimatedCost += this.costCalculator.calculateCost(model, inputTokens, outputTokens);
    }

    state.history.push({ timestamp: Date.now(), ttft: prev.avgTTFT, tps: prev.avgTPS, reliability: prev.reliability });
    if (state.history.length > 100) state.history.shift();
  }

  updateProviderError(state: SystemState, data: { provider: string }): void {
    const p = data.provider.toLowerCase();
    const prev = state.providers[p] || this.getDefaultProvider(data.provider);
    prev.reliability = (ALPHA * 0) + (1 - ALPHA) * prev.reliability;
    prev.stabilityIndex = Math.max(0, (ALPHA * 0) + (1 - ALPHA) * prev.stabilityIndex);
    prev.reputationScore = Math.max(0, (ALPHA * 0) + (1 - ALPHA) * prev.reputationScore);
    prev.totalRequests++;
    state.providers[p] = { ...prev };
    state.totalRequests++;
  }

  calculateSelectionRates(state: SystemState): void {
    const total = state.decisions.length;
    if (total === 0) return;
    const counts: Record<string, number> = {};
    state.decisions.forEach(d => { counts[d.selected] = (counts[d.selected] || 0) + 1; });
    Object.keys(state.providers).forEach(p => { state.providers[p].selectionRate = (counts[p] || 0) / total; });
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
