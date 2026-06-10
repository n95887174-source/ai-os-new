/**
 * KeyRepository — DAL wrapper for API keys
 * 
 * Provides typed access to provider credentials.
 */

import type { DatabaseService } from '../services/database-service';
import type { ApiKey } from '../../types/metrics';

const MAX_KEYS = 100;

export class KeyRepository {
  private cache: Map<string, ApiKey> = new Map();
  private cacheLoaded = false;
  private cachePromise: Promise<void> | null = null;
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  private async ensureCache(): Promise<void> {
    if (this.cacheLoaded) return;
    if (!this.cachePromise) {
      this.cachePromise = this._loadCache().catch(err => { this.cachePromise = null; throw err; });
    }
    await this.cachePromise;
  }

  private async _loadCache(): Promise<void> {
    const keys = await this.db.apiKeys.toArray();
    
    this.cache.clear();
    for (const key of keys) {
      this.cache.set(key.id, key);
    }
    this.cacheLoaded = true;
  }

  async getAll(): Promise<ApiKey[]> {
    await this.ensureCache();
    return Array.from(this.cache.values());
  }

  async get(id: string): Promise<ApiKey | undefined> {
    await this.ensureCache();
    
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    const key = await this.db.apiKeys.get(id);
    if (key) {
      this.cache.set(key.id, key);
    }
    return key;
  }

  async save(key: ApiKey): Promise<void> {
    await this.db.apiKeys.put(key);
    this.cache.set(key.id, key);
    await this.enforceLimit();
  }

  async delete(id: string): Promise<void> {
    await this.db.apiKeys.delete(id);
    this.cache.delete(id);
  }

  async listByProvider(provider: string): Promise<ApiKey[]> {
    await this.ensureCache();
    
    return Array.from(this.cache.values())
      .filter(k => k.provider === provider);
  }

  private async enforceLimit(): Promise<void> {
    if (this.cache.size <= MAX_KEYS) return;
    
    // H-28: Use lastUsed as primary key (higher = more recently used)
    // Fall back to createdAt for keys without lastUsed to avoid evicting new keys
    const sorted = Array.from(this.cache.values())
      .sort((a, b) => {
        const aTime = a.lastUsed ?? a.createdAt ?? 0;
        const bTime = b.lastUsed ?? b.createdAt ?? 0;
        return bTime - aTime; // descending: most recently used first
      })
      .slice(0, MAX_KEYS);

    this.cache.clear();
    for (const key of sorted) {
      this.cache.set(key.id, key);
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheLoaded = false;
  }
}