import { createServiceProxy } from './create-service-proxy';
import { HealthService as KernelHealth } from '../kernel/services/health-service';

export type { KeyHealthCheckResult, KeyHealthSummary } from '../kernel/contracts/health';

export const healthCheckService = createServiceProxy('healthCheckService', KernelHealth);
export { KernelHealth as HealthCheckService };
