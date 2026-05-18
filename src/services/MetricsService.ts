import { resolve } from './service-resolver';
import { MetricsService as KernelMetrics } from '../kernel/services/metrics-service';
export { KernelMetrics as MetricsService };
export type { TimeSeriesPoint, AggregatedMetrics, ProviderMetricSummary, MetricsReport } from '../kernel/services/metrics-service';
export type { MetricsThreshold, MetricAlert } from '../kernel/services/metrics-service';
export const metricsService = resolve<KernelMetrics>('metricsService');
