import { container } from '../core/Container';
import { OrchestrationService as KernelOrchestrationService } from '../kernel/services/orchestration-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const orchestrator = new Proxy({} as KernelOrchestrationService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelOrchestrationService>('orchestrationService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelOrchestrationService.prototype as any)[prop];
    }
  }
});

export { KernelOrchestrationService as OrchestrationService };
