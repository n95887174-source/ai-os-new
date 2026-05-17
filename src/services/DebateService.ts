import { container } from '../core/Container';
import { DebateService as KernelDebateService } from '../kernel/services/debate-service';

export type { DebateSession, DebateParticipant, DebateArgument, DebateConfig } from '../kernel/services/debate-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const debateService = new Proxy({} as KernelDebateService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelDebateService>('debateService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelDebateService.prototype as any)[prop];
    }
  }
});

export { KernelDebateService as DebateService };
