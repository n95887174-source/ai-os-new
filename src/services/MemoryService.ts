import { container } from '../core/Container';
import { MemoryService as KernelMemory } from '../kernel/services/memory-engine';

export type { SearchMode } from '../kernel/services/memory-engine';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const memoryService = new Proxy({} as KernelMemory, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelMemory>('memoryService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelMemory.prototype as any)[prop];
    }
  }
});

export { KernelMemory as MemoryService };
