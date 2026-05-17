import { container } from '../core/Container';
import { MetricsService as KernelMetrics } from '../kernel/services/metrics-service';

export type { TimeSeriesPoint, AggregatedMetrics, ProviderMetricSummary, MetricsReport, MetricsThreshold, MetricAlert } from '../kernel/services/metrics-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const metricsService = new Proxy({} as KernelMetrics, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelMetrics>('metricsService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelMetrics.prototype as any)[prop];
    }
  }
});

export { KernelMetrics as MetricsService };
