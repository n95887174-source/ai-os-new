import { container } from '../core/Container';
import { SandboxService as KernelSandboxService } from '../kernel/services/sandbox-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const sandboxService = new Proxy({} as KernelSandboxService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelSandboxService>('sandboxService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelSandboxService.prototype as any)[prop];
    }
  }
});

export { KernelSandboxService as SandboxService };
export function initSandboxToolService(ts: any) {
  // Legacy hook no longer needed with unified DI, but kept for compatibility
}
