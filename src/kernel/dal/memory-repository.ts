/**
 * MemoryRepository — DAL wrapper for memory entries
 *
 * Provides typed access to conversation context and learned patterns.
 * Uses Dexie as the backing store with read-through caching.
 */

import type { DatabaseService } from '../services/database-service';
import type { MemoryEntry } from '../types/memory-types';
import { rootLogger } from '../services/logger-service';

const LOGGER = rootLogger.child('MemoryRepository');

const MAX_ENTRIES = 1000;

export class MemoryRepository {
    private cache: Map<string, MemoryEntry> = new Map();
    private cacheLoaded = false;
    private cachePromise: Promise<void> | null = null;
    private db: DatabaseService;

    constructor(db: DatabaseService) {
        this.db = db;
    }

    /** Load all memories from Dexie into cache (read-through) */
    private async ensureCache(): Promise<void> {
        if (this.cacheLoaded) return;
        if (!this.cachePromise) {
            this.cachePromise = this._loadCache().catch((err) => {
                this.cachePromise = null;
                throw err;
            });
        }
        await this.cachePromise;
    }

    private async _loadCache(): Promise<void> {
        const entries = await this.db.memories
            .orderBy('[metadata.timestamp]')
            .reverse()
            .limit(MAX_ENTRIES)
            .toArray();

        this.cache.clear();
        for (const entry of entries) {
            this.cache.set(entry.id, entry);
        }
        this.cacheLoaded = true;
    }

    /** Get all memories, sorted by timestamp descending */
    async getAll(): Promise<MemoryEntry[]> {
        await this.ensureCache();
        return Array.from(this.cache.values());
    }

    /** Get a single memory by ID */
    async get(id: string): Promise<MemoryEntry | undefined> {
        await this.ensureCache();

        // Check cache first
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        // Fallback to Dexie
        const entry = await this.db.memories.get(id);
        if (entry) {
            this.cache.set(entry.id, entry);
        }
        return entry;
    }

    /** Store a new memory entry */
    async store(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
        const newEntry: MemoryEntry = {
            ...entry,
            id: crypto.randomUUID(),
        } as MemoryEntry;

        // Dexie first (source of truth)
        await this.db.memories.put(newEntry);

        // Update cache after successful persist
        this.cache.set(newEntry.id, newEntry);
        await this.enforceLimit();

        return newEntry;
    }

    /** Update or insert a memory entry with deterministic ID */
    async upsert(entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
        const id = this.computeId(entry.content, entry.metadata.source, entry.metadata.type);
        const existed = this.cache.has(id);
        // H4: Wrap in Dexie transaction to prevent TOCTOU race
        const dexie = this.db.db;
        await dexie.transaction('rw', dexie.memories, async () => {
            const existing = await this.db.memories.get(id);
            const m: MemoryEntry = existing
                ? { ...existing, ...entry, id, vector: entry.vector ?? existing.vector }
                : ({ ...entry, id } as MemoryEntry);
            await this.db.memories.put(m);
        });
        const merged = await this.db.memories.get(id);
        if (!merged) {
            LOGGER.error('MemoryRepository', 'upsert: record vanished after write', { id });
            return entry as MemoryEntry;
        }
        this.cache.set(merged.id, merged);
        if (!existed) await this.enforceLimit();

        return merged;
    }

    /** Delete a memory entry */
    async delete(id: string): Promise<void> {
        await this.db.memories.delete(id);
        this.cache.delete(id);
    }

    /** Get total count of stored memories */
    async getCount(): Promise<number> {
        return this.db.memories.count();
    }

    /** Partially update a memory entry */
    async update(id: string, changes: Partial<MemoryEntry>): Promise<void> {
        await this.db.memories.update(id, changes as Partial<MemoryEntry>);
        if (this.cache.has(id)) {
            const existing = this.cache.get(id)!;
            this.cache.set(id, { ...existing, ...changes });
        }
    }

    /** Save an entry with its existing ID (unlike store() which generates a new ID) */
    async save(entry: MemoryEntry): Promise<void> {
        await this.db.memories.put(entry);
        this.cache.set(entry.id, entry);
        await this.enforceLimit();
    }

    /** Store multiple entries in batch */
    async storeBatch(entries: Omit<MemoryEntry, 'id'>[]): Promise<MemoryEntry[]> {
        const newEntries: MemoryEntry[] = entries.map((e) => ({
            ...e,
            id: crypto.randomUUID(),
        })) as MemoryEntry[];
        await Promise.all(newEntries.map((e) => this.db.memories.put(e)));
        for (const entry of newEntries) {
            this.cache.set(entry.id, entry);
        }
        await this.enforceLimit();
        return newEntries;
    }

    /** Search memories by keyword (simple substring match) */
    async search(query: string, options?: { limit?: number }): Promise<MemoryEntry[]> {
        await this.ensureCache();

        const lowerQuery = query.toLowerCase();
        const limit = options?.limit ?? 50;

        const results: MemoryEntry[] = [];
        for (const entry of this.cache.values()) {
            if (entry.content.toLowerCase().includes(lowerQuery)) {
                results.push(entry);
                if (results.length >= limit) break;
            }
        }

        return results;
    }

    /** Prune entries older than timestamp, return count deleted */
    async prune(beforeTimestamp: number): Promise<number> {
        // DAL-3: Query DB directly instead of only cache-resident entries
        const oldEntries = await this.db.memories
            .where('[metadata.timestamp]')
            .below(beforeTimestamp)
            .primaryKeys();

        if (oldEntries.length > 0) {
            // H5: Only delete from cache if DB delete succeeds
            try {
                await this.db.memories.bulkDelete(oldEntries);
                for (const id of oldEntries) {
                    this.cache.delete(id);
                }
            } catch (e) {
                LOGGER.warn('MemoryRepository', 'Evict failed', { error: e });
            }
        }

        return oldEntries.length;
    }

    /** Clear all memory entries */
    async clear(): Promise<void> {
        await this.db.memories.clear();
        this.cache.clear();
    }

    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------

    private async enforceLimit(): Promise<void> {
        if (this.cache.size <= MAX_ENTRIES) return;

        // B10-166: Only evict from cache, never from database
        const sorted = Array.from(this.cache.values())
            .sort((a, b) => (b.metadata.timestamp ?? 0) - (a.metadata.timestamp ?? 0))
            .slice(0, MAX_ENTRIES);

        this.cache.clear();
        for (const entry of sorted) {
            this.cache.set(entry.id, entry);
        }
    }

    // C-9: Make computeId truly deterministic — no crypto.randomUUID().
    // The hash of (content, source, type) produces the same ID for the same triple,
    // so upsert() can correctly detect existing entries instead of always inserting.
    // Uses two independent FNV-1a hashes (64 bits total) to reduce collision
    // probability below 10^-9 at the 1000-entry MAX_ENTRIES limit.
    private computeId(content: string, source: string, type: string): string {
        const seed = `${content}|${source}|${type}`;
        let hash1 = 0x811c9dc5;
        let hash2 = 0x6b8b4567;
        for (let i = 0; i < seed.length; i++) {
            const c = seed.charCodeAt(i);
            hash1 ^= c;
            hash1 = (hash1 * 0x01000193) >>> 0;
            hash2 ^= c;
            hash2 = (hash2 * 0x0163a1cd) >>> 0;
        }
        hash1 ^= seed.length;
        hash1 = (hash1 * 0x85ebca6b) >>> 0;
        hash2 ^= seed.length;
        hash2 = (hash2 * 0x85ebca6b) >>> 0;
        return `mem-${seed.length.toString(16).padStart(4, '0')}-${hash2.toString(16).padStart(8, '0')}${hash1.toString(16).padStart(8, '0')}`;
    }
}
