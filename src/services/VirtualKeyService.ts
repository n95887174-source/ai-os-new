import { container } from '../core/Container';
import { VirtualKeyService as KernelVirtualKeyService } from '../kernel/services/virtual-key-service';

export type { VirtualKey } from '../kernel/contracts/virtual-key';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const virtualKeyService = new Proxy({} as KernelVirtualKeyService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelVirtualKeyService>('virtualKeyService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelVirtualKeyService.prototype as any)[prop];
    }
  }
});

export { KernelVirtualKeyService as VirtualKeyService };
