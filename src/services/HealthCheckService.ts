import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';
import { adapterRegistry } from './providers/AdapterRegistry';
import { HealthService as KernelHealth } from '../kernel/services/health-service';

export type { HealthCheckResult, HealthSummary } from '../kernel/services/health-service';

export class HealthCheckService extends KernelHealth {
  constructor() {
    super({ eventBus, keyService: keyService as any, adapterRegistry: adapterRegistry as any });
    this.init().catch(() => {});
  }
}

export const healthCheckService = new HealthCheckService();
