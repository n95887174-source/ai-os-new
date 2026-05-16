import { db } from '../core/DatabaseService';
import { CacheService as KernelCacheService } from '../kernel/services/cache-service';

export type { CacheEntry } from '../kernel/services/cache-service';

export class CacheService extends KernelCacheService {
  constructor() {
    super({ database: db });
  }
}

export const cacheService = new CacheService();
