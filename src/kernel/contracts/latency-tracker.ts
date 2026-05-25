import type { RouterWeights } from '../types/metrics-types';

export interface ILatencyTracker {
  startMonitoring(): void;
  getProviderAvgLatency(provider: string): number;
  getLatencyBalancedWeights(): RouterWeights;
  stopMonitoring(): void;
}

export interface LatencyTrackerDeps {
  kernel: {
    getState: () => { providers: Record<string, { avgTTFT: number; status: string }> };
    setBaseWeights: (weights: RouterWeights) => void;
  };
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  config: {
    latency: {
      monitorIntervalMs: number;
      slidingWindowSize: number;
      degradationRatio: number;
    };
  };
}
