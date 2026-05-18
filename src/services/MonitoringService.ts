import { resolve } from './service-resolver';
import { MonitoringService as KernelMonitoring } from '../kernel/services/monitoring-service';
export { KernelMonitoring as MonitoringService };
export type { MonitoringServiceDeps } from '../kernel/services/monitoring-service';
export type { SystemHealthIndicators } from '../kernel/state/observability-state';
export const monitoringService = resolve<KernelMonitoring>('monitoringService');
