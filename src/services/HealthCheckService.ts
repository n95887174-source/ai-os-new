import { container } from '../core/Container';
import { HealthService as KernelHealth } from '../kernel/services/health-service';

export type { HealthCheckResult, HealthSummary } from '../kernel/services/health-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const healthCheckService = new Proxy({} as KernelHealth, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelHealth>('healthService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelHealth.prototype as any)[prop];
    }
  }
});

export { KernelHealth as HealthCheckService };
