import { eventBus } from '../core/events';
import type { MemoryEntry } from '../types/memory';
import { create, insert, search } from '@orama/orama';

import { cognitiveDb } from './CognitiveDatabase';

/**
 * SuperAgents OS - Memory Mesh Service
 * 
 * Handles long-term persistence of cognitive fragments using 
 * Orama for fast, local semantic-like retrieval.
 */
const MEMORY_STORAGE_KEY = 'super_agents_os_memory';

class MemoryService {
  private memories: MemoryEntry[] = [];
  private db: any;
  private isDbReady = false;

  constructor() {
    this.initOrama();
    this.load();
    this.setupListeners();
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

  private load() {
    try {
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (stored) {
        this.memories = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load memory mesh', e);
    }
  }

  private persist() {
    try {
      const toSave = this.memories.slice(0, 1000);
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to persist memory mesh', e);
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
    this.memories = [newEntry, ...this.memories];
    this.persist();

    if (this.isDbReady) {
      await insert(this.db, newEntry);
    }

    // Persistent SQL-like storage backup
    await cognitiveDb.insert('history', {
      ...newEntry,
      sessionId: entry.metadata.chatId || 'system'
    });

    console.log(`[Memory] Stored fragment: ${newEntry.content.substring(0, 30)}...`);
    eventBus.emit('memory:updated', this.memories);
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

    return results.hits.map(hit => hit.document as MemoryEntry);
  }

  async clear() {
    this.memories = [];
    this.persist();
    await this.initOrama(); // Re-init DB
    eventBus.emit('memory:updated', this.memories);
  }

  getMemories() {
    return this.memories;
  }
}

export const memoryService = new MemoryService();
