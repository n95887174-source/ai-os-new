import { createServiceProxy } from './create-service-proxy';
import { MetricsService as KernelMetrics } from '../kernel/services/metrics-service';

export type { TimeSeriesPoint, AggregatedMetrics, ProviderMetricSummary, MetricsReport } from '../kernel/services/metrics-service';
export type { MetricsThreshold, MetricAlert } from '../kernel/services/metrics-service';

export const metricsService = createServiceProxy('metricsService', KernelMetrics);
export { KernelMetrics as MetricsService };
