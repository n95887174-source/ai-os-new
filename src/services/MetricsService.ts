import { kernel } from '../core/Kernel';

/**
 * MetricsService is now a proxy for the System Kernel.
 * It provides read-only access to the canonical system state.
 */
class MetricsService {
  getHistory() {
    return kernel.getState().decisions;
  }

  getAllMetrics() {
    return kernel.getState().providers;
  }
}

export const metricsService = new MetricsService();
export type { ProviderMetrics, DecisionTrace } from '../types/metrics';
