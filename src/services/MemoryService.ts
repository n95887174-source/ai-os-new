import { eventBus } from '../core/events';
import type { MemoryEntry } from '../types/memory';
import { create, insert, search } from '@orama/orama';
import { dexieDb } from '../core/DatabaseService';

import { cognitiveDb } from './CognitiveDatabase';

/**
 * SuperAgents OS - Memory Mesh Service
 * 
 * Handles long-term persistence of cognitive fragments using 
 * Orama for fast, local semantic-like retrieval and Dexie (IndexedDB) for durability.
 */
const MEMORY_STORAGE_KEY = 'super_agents_os_memory';

class MemoryService {
  private memories: MemoryEntry[] = [];
  private db: any;
  private isDbReady = false;

  constructor() {
    this.init();
    this.setupListeners();
  }

  private async init() {
    await this.load();
    await this.initOrama();
  }

  private async initOrama() {
    this.db = await create({
      schema: {
        id: 'string',
        content: 'string',
        metadata: {
          source: 'string',
          type: 'string',
          timestamp: 'number',
          importance: 'number'
        }
      }
    });

    // Index existing memories
    for (const m of this.memories) {
      await insert(this.db, m);
    }
    this.isDbReady = true;
  }

  private async load() {
    try {
      // 1. Try Dexie first
      const count = await dexieDb.memories.count();
      if (count > 0) {
        this.memories = await dexieDb.memories.orderBy('metadata.timestamp').reverse().toArray();
        console.log(`[Memory] Loaded ${this.memories.length} entries from IndexedDB`);
        return;
      }

      // 2. Fallback to localStorage migration
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (stored) {
        this.memories = JSON.parse(stored);
        // Migrate to Dexie
        await dexieDb.memories.bulkAdd(this.memories);
        localStorage.removeItem(MEMORY_STORAGE_KEY);
        console.log(`[Memory] Migrated ${this.memories.length} entries to IndexedDB`);
      }
    } catch (e) {
      console.error('Failed to load memory mesh', e);
    }
  }

  private async persist(entry: MemoryEntry) {
    try {
      await dexieDb.memories.add(entry);
    } catch (e) {
      console.error('Failed to persist memory fragment', e);
    }
  }

  private setupListeners() {
    eventBus.on('cognitive:step:completed', (data: any) => {
      this.store({
        content: data.output || data.fullContent || '',
        metadata: {
          source: data.nodeId || data.provider || 'unknown',
          type: 'decision',
          timestamp: Date.now(),
          importance: 0.8
        }
      });
    });
  }

  async store(entry: Omit<MemoryEntry, 'id'>) {
    const newEntry: MemoryEntry = {
      ...entry,
      id: crypto.randomUUID().slice(0, 8)
    };

    try {
      // 1. Persist to Dexie (Primary Source of Truth)
      await dexieDb.memories.add(newEntry);
      
      // 2. Add to local cache
      this.memories = [newEntry, ...this.memories];

      // 3. Index in Orama (Search Index)
      if (this.isDbReady) {
        try {
          await insert(this.db, newEntry);
        } catch (oramaError) {
          console.error('[Memory] Orama indexing failed, but data is safe in Dexie', oramaError);
        }
      }

      // 4. Backup to CognitiveDatabase (Legacy SQL Proxy)
      try {
        await cognitiveDb.insert('history', {
          ...newEntry,
          sessionId: entry.metadata.chatId || 'system'
        });
      } catch (sqlError) {
        console.warn('[Memory] SQL Backup failed', sqlError);
      }

      console.log(`[Memory] Stored fragment: ${newEntry.content.substring(0, 30)}...`);
      eventBus.emit('memory:updated', this.memories);
    } catch (dexieError) {
      console.error('[Memory] CRITICAL: Failed to persist to Dexie', dexieError);
      throw dexieError; // Re-throw critical persistence error
    }
  }

  getMemories() {
    return this.memories;
  }

  async search(query: string, limit: number = 5) {
    if (!query.trim()) return this.memories.slice(0, limit);
    
    if (!this.isDbReady) {
      // Fallback to basic search if Orama isn't ready
      return this.memories.filter(m => m.content.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
    }

    const results = await search(this.db, {
      term: query,
      limit: limit,
      boost: {
        content: 2
      }
    });

    return results.hits.map(hit => ({
      ...(hit.document as MemoryEntry),
      score: hit.score
    }));
  }

  async clear() {
    this.memories = [];
    await dexieDb.memories.clear();
    await this.initOrama(); // Re-init DB
    eventBus.emit('memory:updated', this.memories);
  }

  getMemories() {
    return this.memories;
  }
}

export const memoryService = new MemoryService();
