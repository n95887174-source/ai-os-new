import { resolve } from './service-resolver';
import { CacheService as KernelCacheService } from '../kernel/services/cache-service';
export { KernelCacheService as CacheService };
export type { CacheEntry } from '../kernel/services/cache-service';
export const cacheService = resolve<KernelCacheService>('cacheService');
