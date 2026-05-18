import { resolve } from './service-resolver';
import { HealthService as KernelHealth } from '../kernel/services/health-service';
export { KernelHealth as HealthService };
export type { KeyHealthCheckResult, KeyHealthSummary } from '../kernel/contracts/health';
export const healthCheckService = resolve<KernelHealth>('healthCheckService');
