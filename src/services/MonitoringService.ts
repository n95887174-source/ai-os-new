import { eventBus } from '../core/events';
import { MonitoringService as KernelMonitoring } from '../kernel/services/monitoring-service';
import { traceService } from './TraceService';
import { metricsService } from './MetricsService';
import { timelineService } from './TimelineService';

export type { MonitoringServiceDeps } from '../kernel/services/monitoring-service';
export type { SystemHealthIndicators } from '../kernel/state/observability-state';

export class MonitoringService extends KernelMonitoring {
  constructor() {
    super({
      eventBus,
      traceService,
      metricsService,
      timelineService,
    });
  }
}

export const monitoringService = new MonitoringService();
