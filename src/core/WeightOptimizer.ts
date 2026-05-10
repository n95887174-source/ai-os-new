import type { SystemState, SLAMode } from '../types/metrics';

const ADAPTIVE_RATE = 0.005;

export function updateAdaptiveWeights(state: SystemState, signal: { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number }): void {
  const d = state.weights.adaptiveDelta;
  if (signal.wasRaceWinner) { d.ttft += ADAPTIVE_RATE; d.reliability -= ADAPTIVE_RATE / 2; }
  if (signal.wasFallback || !signal.success) { d.reliability += ADAPTIVE_RATE * 2; d.ttft -= ADAPTIVE_RATE * 2; }

  state.weights.adaptiveDelta = { ...d };
  recalculateEffectiveWeights(state);
}

export function recalculateEffectiveWeights(state: SystemState): void {
  const combined = {
    ttft: state.weights.base.ttft + state.weights.adaptiveDelta.ttft,
    tps: state.weights.base.tps + state.weights.adaptiveDelta.tps,
    reliability: state.weights.base.reliability + state.weights.adaptiveDelta.reliability
  };
  const sum = Math.max(0.01, combined.ttft + combined.tps + combined.reliability);
  state.weights.effective = {
    ttft: combined.ttft / sum,
    tps: combined.tps / sum,
    reliability: combined.reliability / sum
  };
}

export function setSLAMode(state: SystemState, mode: string): void {
  state.activeSLA = mode as SLAMode;

  const weights: Record<string, { ttft: number; tps: number; reliability: number }> = {
    'LOW_LATENCY': { ttft: 0.7, tps: 0.1, reliability: 0.2 },
    'HIGH_QUALITY': { ttft: 0.1, tps: 0.2, reliability: 0.7 },
    'BALANCED': { ttft: 0.4, tps: 0.2, reliability: 0.4 },
    'ECONOMY': { ttft: 0.2, tps: 0.6, reliability: 0.2 }
  };

  if (weights[mode]) {
    state.weights.base = weights[mode];
    recalculateEffectiveWeights(state);
  }
}

export function setExplorationFactor(state: SystemState, val: number): void {
  state.explorationFactor = val;
}
