import type { SystemState, ProviderState } from '../types/metrics';
import { pricingService } from '../services/PricingService';

const ALPHA = 0.15;

export function updateProviderMetric(state: SystemState, data: any): void {
  const p = data.provider.toLowerCase();
  const prev = state.providers[p] || getDefaultProvider(data.provider);

  const tokens = data.tokens || Math.ceil((data.fullContent || '').length / 4);
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

  const model = (data.model || '').toLowerCase();
  const costPerMillion = pricingService.getInputCost(model);

  state.estimatedCost += (tokens / 1000000) * costPerMillion;

  const now = Date.now();
  state.history.push({ timestamp: now, ttft: prev.avgTTFT, tps: prev.avgTPS, reliability: prev.reliability });
  if (state.history.length > 100) state.history.shift();
}

export function updateProviderError(state: SystemState, data: any): void {
  const p = data.provider.toLowerCase();
  const prev = state.providers[p] || getDefaultProvider(data.provider);
  prev.reliability = (ALPHA * 0) + (1 - ALPHA) * prev.reliability;

  prev.stabilityIndex = Math.max(0, (ALPHA * 0) + (1 - ALPHA) * prev.stabilityIndex);
  prev.reputationScore = Math.max(0, (ALPHA * 0) + (1 - ALPHA) * prev.reputationScore);

  prev.totalRequests++;
  state.providers[p] = { ...prev };
  state.totalRequests++;
}

export function calculateSelectionRates(state: SystemState): void {
  const counts: Record<string, number> = {};
  state.decisions.forEach(d => { counts[d.selected] = (counts[d.selected] || 0) + 1; });
  const total = state.decisions.length;
  Object.keys(state.providers).forEach(p => { state.providers[p].selectionRate = (counts[p] || 0) / total; });
}

function getDefaultProvider(id: string): ProviderState {
  return {
    id,
    avgTTFT: 800,
    avgTPS: 20,
    reliability: 1,
    stabilityIndex: 1.0,
    reputationScore: 100,
    totalRequests: 0,
    selectionRate: 0,
    status: 'healthy'
  };
}
