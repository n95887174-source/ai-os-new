import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';

export interface CacheEntry {
  key: string;
  response: string;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  timestamp: number;
  ttl: number;
  hitCount: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private maxEntries = 500;
  private defaultTTL = 5 * 60 * 1000;

  async init() {
    try {
      const entries = await db.getKv<CacheEntry[]>('super_agents_llm_cache');
      if (entries) {
        const now = Date.now();
        for (const entry of entries) {
          if (now - entry.timestamp < entry.ttl) {
            this.cache.set(entry.key, entry);
          }
        }
      }
    } catch (e) {
      console.warn('[CacheService] Failed to load cache:', e);
    }
  }

  private persist() {
    const entries = Array.from(this.cache.values()).slice(0, 500);
    db.setKv('super_agents_llm_cache', entries).catch(e => console.warn('[CacheService] Persist failed:', e));
  }

  generateKey(messages: Array<{ role: string; content: string }>, model: string): string {
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const userMsg = messages.find(m => m.role === 'user')?.content || '';
    const combined = `${model}|${systemMsg.slice(0, 200)}|${userMsg.slice(0, 500)}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `cache_${Math.abs(hash).toString(36)}`;
  }

  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    entry.hitCount++;
    this.hits++;
    this.persist();
    return entry;
  }

  set(key: string, response: string, model: string, provider: string, promptTokens: number, completionTokens: number, ttl?: number) {
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.entries().next().value;
      if (oldest) this.cache.delete(oldest[0]);
    }
    this.cache.set(key, {
      key,
      response,
      model,
      provider,
      promptTokens,
      completionTokens,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hitCount: 0,
    });
    this.persist();
  }

  invalidate(model?: string) {
    if (model) {
      for (const [key, entry] of this.cache) {
        if (entry.model === model) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
    this.persist();
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

export const cacheService = new CacheService();
