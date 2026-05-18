import { createServiceProxy } from './create-service-proxy';
import { CacheService as KernelCacheService } from '../kernel/services/cache-service';

export type { CacheEntry } from '../kernel/services/cache-service';

export const cacheService = createServiceProxy('cacheService', KernelCacheService);
export { KernelCacheService as CacheService };
