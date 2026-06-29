import { CONFIG } from './config-registry';
import { rootLogger } from './logger-service';
import type { CacheEntry, ICacheService } from '../contracts/cache';
import { EVENTS } from '../events/event-names';
export type { CacheEntry } from '../contracts/cache';

const LOGGER = rootLogger.child('CacheService');

export interface CacheServiceDeps {
    database: {
        getKv: <T>(id: string) => Promise<T | null>;
        setKv: <T>(id: string, value: T) => Promise<void>;
    };
    eventBus?: {
        on: (event: string, cb: (...args: unknown[]) => void) => () => void;
        emit: (event: string, data?: unknown) => void;
    };
}

export class CacheService implements ICacheService {
    private deps: CacheServiceDeps;
    private cache = new Map<string, CacheEntry>();
    private hits = 0;
    private misses = 0;
    /** EMA-based hit rate (alpha=0.1) — prefers recent behavior over lifetime average */
    private emaHitRate = 0;
    private static readonly EMA_ALPHA = 0.1;
    private maxEntries = CONFIG?.services?.cache?.maxEntries ?? 500;
    private defaultTTL = CONFIG?.services?.cache?.defaultTTLMs ?? 5 * 60 * 1000;
    private persistTimer: ReturnType<typeof setTimeout> | null = null;
    private evictionTimer: ReturnType<typeof setInterval> | null = null;
    private dirty = false;
    private inFlight = new Map<string, Promise<CacheEntry | null>>();
    private unsub?: () => void;
    private _initialized = false;

    constructor(deps: CacheServiceDeps) {
        this.deps = deps;
    }

    async init() {
        if (this._initialized) return;
        this._initialized = true;
        this.evictionTimer = setInterval(() => this.evictExpired(), 60000);
        try {
            const entries = await this.deps.database.getKv<CacheEntry[]>('super_agents_llm_cache');
            if (entries) {
                const now = Date.now();
                for (const entry of entries) {
                    if (now - entry.timestamp < entry.ttl) {
                        this.cache.set(entry.key, entry);
                    }
                }
            }
        } catch (e) {
            LOGGER.warn('CacheService', 'Failed to load cache', { error: e });
        }

        if (this.deps.eventBus) {
            this.unsub = this.deps.eventBus.on(EVENTS.CACHE_INVALIDATED, () => {
                this.clear();
            });
        }
    }

    /** Stampede-proof fetch: dedup concurrent requests for the same key. */
    async getOrFetch(
        key: string,
        fetchFn: () => Promise<CacheEntry | null>,
    ): Promise<CacheEntry | null> {
        const existing = this.get(key);
        if (existing !== null) return existing;

        const pending = this.inFlight.get(key);
        if (pending) return pending;

        const promise = fetchFn()
            .then((entry) => {
                this.inFlight.delete(key);
                if (entry)
                    this.set(
                        key,
                        entry.response,
                        entry.model,
                        entry.provider,
                        entry.promptTokens,
                        entry.completionTokens,
                        entry.ttl,
                    );
                return entry;
            })
            .catch((e) => {
                this.inFlight.delete(key);
                throw e;
            });
        this.inFlight.set(key, promise);
        return promise;
    }

    private evictExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > entry.ttl) this.cache.delete(key);
        }
    }

    private async flush(): Promise<void> {
        if (this.cache.size === 0) return;
        const entries = Array.from(this.cache.values()).slice(-500);
        try {
            await this.deps.database.setKv('super_agents_llm_cache', entries);
        } catch (e) {
            LOGGER.warn('CacheService', 'Flush failed', {
                error: e instanceof Error ? e.message : String(e),
            });
        }
    }

    async destroy(): Promise<void> {
        this._initialized = false;
        await this.flush();
        this.cache.clear();
        this.inFlight.clear();
        this.unsub?.();
        if (this.persistTimer) clearTimeout(this.persistTimer);
        if (this.evictionTimer) clearInterval(this.evictionTimer);
    }

    private persist() {
        if (this.persistTimer) return;
        this.dirty = true;
        this.persistTimer = setTimeout(() => {
            this.persistTimer = null;
            if (!this.dirty) return;
            this.dirty = false;
            const entries = Array.from(this.cache.values())
                .slice(-500)
                .map((e) => ({ ...e }));
            this.deps.database.setKv('super_agents_llm_cache', entries).catch((e: unknown) => {
                LOGGER.warn('CacheService', 'Persist failed', {
                    error: e instanceof Error ? e.message : String(e),
                });
                this.dirty = true;
            });
        }, 2000);
    }

    async generateKey(
        messages: Array<{ role: string; content: string }>,
        model: string,
    ): Promise<string> {
        const combined = `${model}|${messages.map((m) => `${m.role}:${m.content}`).join('||')}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(combined);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const hex = Array.from(new Uint8Array(hash))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        return `cache_${hex.slice(0, 32)}`;
    }

    get(key: string): CacheEntry | null {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            this.emaHitRate = (1 - CacheService.EMA_ALPHA) * this.emaHitRate;
            return null;
        }
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.misses++;
            this.emaHitRate = (1 - CacheService.EMA_ALPHA) * this.emaHitRate;
            return null;
        }

        // Mutate the original entry in the map for LRU and stats
        entry.hitCount++;
        this.hits++;
        this.emaHitRate =
            CacheService.EMA_ALPHA * 1 + (1 - CacheService.EMA_ALPHA) * this.emaHitRate;
        this.cache.delete(key);
        this.cache.set(key, entry);

        // Return a shallow copy to prevent external mutation of the cached object
        return { ...entry };
    }

    set(
        key: string,
        response: string,
        model: string,
        provider: string,
        promptTokens: number,
        completionTokens: number,
        ttl?: number,
    ) {
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

    clear(): void {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
        this.emaHitRate = 0;
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

    getConfig(): { level: string; ttl: number; maxEntries: number; persistence: string } {
        return {
            level: 'Kernel CacheService',
            ttl: this.defaultTTL,
            maxEntries: this.maxEntries,
            persistence: 'IndexedDB (2s debounce)',
        };
    }

    getStats(): {
        size: number;
        hits: number;
        misses: number;
        hitRate: number;
        emaHitRate: number;
    } {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
            emaHitRate: this.emaHitRate,
        };
    }
}
