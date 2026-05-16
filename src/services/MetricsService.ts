import { kernel } from '../core/Kernel';
import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';
import { MetricsService as KernelMetrics } from '../kernel/services/metrics-service';

export type { TimeSeriesPoint, AggregatedMetrics, ProviderMetricSummary, MetricsReport, MetricsThreshold, MetricAlert } from '../kernel/services/metrics-service';

export class MetricsService extends KernelMetrics {
  constructor() {
    super({ eventBus, database: db, kernel });
  }
}

export const metricsService = new MetricsService();
