import { container } from '../core/Container';
import { CacheService as KernelCacheService } from '../kernel/services/cache-service';

export type { CacheEntry } from '../kernel/services/cache-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const cacheService = new Proxy({} as KernelCacheService, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelCacheService>('cacheService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelCacheService.prototype as any)[prop];
    }
  }
});

export { KernelCacheService as CacheService };
