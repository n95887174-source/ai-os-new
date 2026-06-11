/**
 * MemoryRepository — DAL wrapper for memory entries
 * 
 * Provides typed access to conversation context and learned patterns.
 * Uses Dexie as the backing store with read-through caching.
 */

import type { DatabaseService } from '../services/database-service';
import type { MemoryEntry, MemorySearchResult } from '../types/memory-types';

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
      this.cachePromise = this._loadCache().catch(err => { this.cachePromise = null; throw err; });
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
    const newEntry: MemoryEntry = { ...entry, id } as MemoryEntry;

    const existing = await this.db.memories.get(id);
    await this.db.memories.put(newEntry);
    this.cache.set(newEntry.id, newEntry);
    if (!existing) await this.enforceLimit();

    return newEntry;
  }

  /** Delete a memory entry */
  async delete(id: string): Promise<void> {
    await this.db.memories.delete(id);
    this.cache.delete(id);
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
      await this.db.memories.bulkDelete(oldEntries).catch(e => console.warn('[MemoryRepository] Evict failed:', e));
    }
    
    // Also remove from cache
    for (const id of oldEntries) {
      this.cache.delete(id);
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

  private computeId(content: string, source: string, type: string): string {
    // DAL-4: Use full UUID to prevent hash collisions (32-bit hash had ~0.12% collision at 1000 entries)
    return `mem-${crypto.randomUUID()}`;
  }
}