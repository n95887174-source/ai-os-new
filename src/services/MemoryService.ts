import { eventBus } from '../core/events';
import type { MemoryEntry } from '../types/memory';
import { dexieDb } from '../core/DatabaseService';

const MEMORY_STORAGE_KEY = 'super_agents_os_memory';

interface PendingRequest {
  resolve: (value: { type: string; payload: unknown }) => void;
  reject: (reason?: unknown) => void;
}

export type SearchMode = 'auto' | 'semantic' | 'fulltext';

class MemoryService {
  private memories: MemoryEntry[] = [];
  private isDbReady = false;
  private semanticReady = false;
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private unsubs: Array<() => void> = [];

  constructor() {
    this.init();
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  private async init() {
    await this.load();
    await this.initWorker();
  }

  private async initWorker() {
    try {
      this.worker = new Worker(new URL('./memory.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = (e) => {
        console.error('[Memory] Worker error', e);
      };
      await this.sendToWorker('init', { memories: this.memories });
      this.isDbReady = true;

      this.sendToWorker('enable_semantic').then(() => {
        this.semanticReady = true;
        console.log('[Memory] Semantic search ready');
      }).catch(() => {
        console.warn('[Memory] Semantic search unavailable');
      });
    } catch {
      console.warn('[Memory] Worker not available, search will use simple string matching');
      this.isDbReady = false;
    }
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { requestId, type, payload } = event.data;
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      this.pendingRequests.delete(requestId);
      if (type === 'error') {
        pending.reject(new Error(payload?.message));
      } else {
        pending.resolve({ type, payload });
      }
    } else if (type === 'insert' && payload?.embedding) {
      this.backfillVector(payload.id, payload.embedding);
    }
  }

  private async backfillVector(id: string, vector: number[]) {
    try {
      await dexieDb.memories.update(id, { vector });
      const mem = this.memories.find(m => m.id === id);
      if (mem) mem.vector = vector;
    } catch {
      console.warn('[Memory] Failed to persist embedding vector');
    }
  }

  private sendToWorker(type: string, payload?: unknown): Promise<{ type: string; payload: unknown }> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }
      const requestId = crypto.randomUUID().slice(0, 8);
      this.pendingRequests.set(requestId, { resolve, reject });
      this.worker.postMessage({ requestId, type, payload });
    });
  }

  private async load() {
    try {
      const count = await dexieDb.memories.count();
      if (count > 0) {
        this.memories = await dexieDb.memories.orderBy('metadata.timestamp').reverse().toArray();
        console.log(`[Memory] Loaded ${this.memories.length} entries from IndexedDB`);
        return;
      }

      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (stored) {
        this.memories = JSON.parse(stored);
        await dexieDb.memories.bulkAdd(this.memories);
        localStorage.removeItem(MEMORY_STORAGE_KEY);
        console.log(`[Memory] Migrated ${this.memories.length} entries to IndexedDB`);
      }
    } catch (e) {
      console.error('Failed to load memory mesh', e);
    }
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('cognitive:step:completed', (data) => {
        this.store({
          content: data.output || data.fullContent || '',
          metadata: {
            source: data.nodeId || data.provider || 'unknown',
            type: 'decision',
            timestamp: Date.now(),
            importance: 0.8
          }
        });
      })
    );
  }

  async store(entry: Omit<MemoryEntry, 'id'>) {
    const newEntry: MemoryEntry = {
      ...entry,
      id: crypto.randomUUID().slice(0, 8)
    };

    try {
      await dexieDb.memories.add(newEntry);
      this.memories = [newEntry, ...this.memories];

      if (this.isDbReady && this.worker) {
        this.sendToWorker('insert', { entry: newEntry, generateEmbedding: this.semanticReady }).catch((err) => {
          console.warn('[Memory] Worker insert failed, falling back to fulltext only', err);
          this.semanticReady = false;
        });
      }

      console.log(`[Memory] Stored fragment: ${newEntry.content.substring(0, 30)}...`);
      eventBus.emit('memory:updated', this.memories);
    } catch (dexieError) {
      console.error('[Memory] CRITICAL: Failed to persist to Dexie', dexieError);
      throw dexieError;
    }
  }

  getMemories() {
    return this.memories;
  }

  get isSemanticReady() {
    return this.semanticReady;
  }

  async search(query: string, limit: number = 5, mode: SearchMode = 'auto') {
    if (!query.trim()) return this.memories.slice(0, limit);

    if (this.isDbReady && this.worker) {
      const useSemantic = mode === 'semantic' || (mode === 'auto' && this.semanticReady);

      if (useSemantic && this.semanticReady) {
        try {
          const result = await this.sendToWorker('search_semantic', { query, limit });
          return (result.payload as { hits: (MemoryEntry & { score: number })[] }).hits;
        } catch {
          // fall through
        }
      }

      try {
        const result = await this.sendToWorker('search', { query, limit });
        return (result.payload as { hits: { document: MemoryEntry; score: number }[] }).hits.map((hit) => ({
          ...hit.document,
          score: hit.score
        }));
      } catch {
        // fall through to simple matching
      }
    }

    return this.memories.filter(m => m.content.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
  }

  async clear() {
    this.memories = [];
    await dexieDb.memories.clear();

    if (this.worker) {
      this.sendToWorker('init', { memories: [] }).catch(() => {});
    }

    eventBus.emit('memory:updated', this.memories);
  }
}

export const memoryService = new MemoryService();
