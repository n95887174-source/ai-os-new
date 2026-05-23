import { CONFIG } from './config-registry';
import type { MemoryEntry, MemoryStats, MemorySearchResult, MemoryPruneOptions, MemoryPruneResult } from '../types/memory-types';

const WORKER_URL = new URL('../../services/memory.worker.ts', import.meta.url).href;

const MEMORY_TTL_MS = CONFIG?.services?.cache?.defaultTTLMs ?? 30 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = MEMORY_TTL_MS * 0.5;

interface PendingRequest {
  resolve: (value: { type: string; payload: unknown }) => void;
  reject: (reason?: unknown) => void;
}

export type SearchMode = 'auto' | 'semantic' | 'fulltext';

export interface MemoryServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  database: {
    db: {
      memories: {
        where: (field: string) => { below: (val: number) => { delete: () => Promise<void> } };
        count: () => Promise<number>;
        orderBy: (field: string) => { reverse: () => { toArray: () => Promise<MemoryEntry[]> } };
        add: (entry: MemoryEntry) => Promise<void>;
        bulkAdd: (entries: MemoryEntry[]) => Promise<void>;
        delete: (id: string) => Promise<void>;
        put: (entry: MemoryEntry) => Promise<void>;
        update: (id: string, changes: Partial<MemoryEntry>) => Promise<void>;
        clear: () => Promise<void>;
      };
    };
  };
}

export class MemoryService {
  private memories: MemoryEntry[] = [];
  private isDbReady = false;
  private semanticReady = false;
  private worker: Worker | null = null;
  private workerInitPromise: Promise<void> | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private unsubs: Array<() => void> = [];
  private pruneInterval: ReturnType<typeof setInterval> | null = null;
  private deps: MemoryServiceDeps;

  constructor(deps: MemoryServiceDeps) {
    this.deps = deps;
  }

  async init() {
    this.setupListeners();
    await this.load();
    this.startPruneTimer();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    if (this.pruneInterval) { clearInterval(this.pruneInterval); this.pruneInterval = null; }
    if (this.worker) { this.worker.terminate(); this.worker = null; }
  }

  private startPruneTimer() {
    this.pruneInterval = setInterval(() => this.pruneOldEntries(), PRUNE_INTERVAL_MS);
  }

  private async pruneOldEntries() {
    try {
      const cutoff = Date.now() - MEMORY_TTL_MS;
      await this.deps.database.db.memories.where('[metadata.timestamp]').below(cutoff).delete();
      this.memories = this.memories.filter(m => (m.metadata.timestamp ?? 0) >= cutoff);
      this.deps.eventBus.emit('memory:updated', this.memories);
    } catch (e) {
      console.error('[Memory] Prune cycle failed', e);
    }
  }

  private async ensureWorker(): Promise<void> {
    if (this.worker) return;
    if (this.workerInitPromise) return this.workerInitPromise;
    this.workerInitPromise = this.initWorker();
    return this.workerInitPromise;
  }

  private async initWorker() {
    try {
      this.worker = new Worker(WORKER_URL, { type: 'module' });
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = (e) => console.error('[Memory] Worker error', e);
      await this.sendToWorker('init', { memories: this.memories });
      this.isDbReady = true;
    } catch (e) {
      console.warn('[Memory] Worker not available, using local search', e);
      this.isDbReady = false;
    }
  }

  async ensureSemantic(): Promise<void> {
    if (this.semanticReady) return;
    if (!CONFIG?.services?.memory?.semanticEnabled) return;
    if (!this.worker) await this.ensureWorker();
    if (!this.worker) return;
    try {
      await this.sendToWorker('enable_semantic');
      this.semanticReady = true;
      console.log('[Memory] Semantic search ready (lazy)');
    } catch (e) {
      console.warn('[Memory] Semantic search unavailable:', e);
    }
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { requestId, type, payload } = event.data;
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      this.pendingRequests.delete(requestId);
      if (type === 'error') { pending.reject(new Error(payload?.message)); }
      else { pending.resolve({ type, payload }); }
    } else if (type === 'insert' && payload?.embedding) {
      this.backfillVector(payload.id, payload.embedding);
    }
  }

  private async backfillVector(id: string, vector: number[]) {
    try {
      await this.deps.database.db.memories.update(id, { vector } as Partial<MemoryEntry>);
      const mem = this.memories.find(m => m.id === id);
      if (mem) (mem as unknown as { vector: number[] }).vector = vector;
    } catch (e) { console.warn('[Memory] Failed to persist embedding vector', e); }
  }

  private sendToWorker(type: string, payload?: unknown): Promise<{ type: string; payload: unknown }> {
    return new Promise((resolve, reject) => {
      if (!this.worker) { reject(new Error('Worker not available')); return; }
      const requestId = crypto.randomUUID().slice(0, 8);
      this.pendingRequests.set(requestId, { resolve, reject });
      this.worker.postMessage({ requestId, type, payload });
    });
  }

  private async load() {
    try {
      if ((await this.deps.database.db.memories.count()) > 0) {
        this.memories = await this.deps.database.db.memories.orderBy('[metadata.timestamp]').reverse().toArray();
        return;
      }
      const stored = localStorage.getItem('super_agents_os_memory');
      if (stored) {
        this.memories = JSON.parse(stored);
        await this.deps.database.db.memories.bulkAdd(this.memories);
        localStorage.removeItem('super_agents_os_memory');
      }
    } catch (e) { console.error('Failed to load memory mesh', e); }
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on('cognitive:step:completed', (data: unknown) => {
        const d = data as { output?: string; fullContent?: string; nodeId?: string; provider?: string };
        if (d.output || d.fullContent) {
          this.store({
            content: d.output || d.fullContent || '',
            metadata: {
              source: d.nodeId || d.provider || 'unknown',
              type: 'decision',
              timestamp: Date.now(),
              importance: 0.8,
            }
          });
        }
      })
    );
  }

  async store(entry: Omit<MemoryEntry, 'id'>) {
    const newEntry: MemoryEntry = { ...entry, id: crypto.randomUUID().slice(0, 8) } as MemoryEntry;
    try {
      await this.deps.database.db.memories.add(newEntry);
      this.memories = [newEntry, ...this.memories];
      this.ensureWorker().then(() => {
        if (this.worker) {
          this.sendToWorker('insert', { entry: newEntry, generateEmbedding: this.semanticReady })
            .catch((e) => { console.warn('[Memory] Worker insert failed', e); this.semanticReady = false; });
        }
      });
      this.deps.eventBus.emit('memory:updated', this.memories);
    } catch (e) { console.error('[Memory] Failed to persist to Dexie', e); throw e; }
  }

  async storeBatch(entries: Omit<MemoryEntry, 'id'>[]) {
    const newEntries = entries.map(e => ({ ...e, id: crypto.randomUUID().slice(0, 8) })) as MemoryEntry[];
    try {
      await this.deps.database.db.memories.bulkAdd(newEntries);
      this.memories = [...newEntries, ...this.memories];
      this.ensureWorker().then(() => {
        if (this.worker) {
          Promise.all(newEntries.map(e =>
            this.sendToWorker('insert', { entry: e, generateEmbedding: false })
          )).catch((err) => console.warn('[Memory] Batch insert to worker failed', err));
        }
      });
      this.deps.eventBus.emit('memory:updated', this.memories);
    } catch (e) { console.error('[Memory] Batch store failed', e); }
  }

  getMemories(limit?: number): MemoryEntry[] {
    return limit ? this.memories.slice(0, limit) : this.memories;
  }

  getMemory(id: string): MemoryEntry | undefined {
    return this.memories.find(m => m.id === id);
  }

  async deleteMemory(id: string) {
    const idx = this.memories.findIndex(m => m.id === id);
    if (idx === -1) return;
    this.memories.splice(idx, 1);
    await this.deps.database.db.memories.delete(id);
    if (!this.worker) {
      await this.ensureWorker().catch(() => {});
    }
    if (this.worker) this.sendToWorker('remove', { id }).catch((e) => console.warn('[Memory] Worker remove failed', e));
    this.deps.eventBus.emit('memory:updated', this.memories);
  }

  async updateMemory(id: string, content: string) {
    const entry = this.memories.find(m => m.id === id);
    if (!entry) return;
    entry.content = content;
    await this.deps.database.db.memories.put(entry);
    if (!this.worker) {
      await this.ensureWorker().catch(() => {});
    }
    if (this.worker) this.sendToWorker('remove', { id }).then(() =>
      this.sendToWorker('insert', { entry, generateEmbedding: false })
    ).catch((e) => console.warn('[Memory] Worker update failed', e));
    this.deps.eventBus.emit('memory:updated', this.memories);
  }

  async search(query: string, limit: number = 5, mode: SearchMode = 'auto'): Promise<MemorySearchResult[]> {
    if (!query.trim()) return this.memories.slice(0, limit).map(e => ({ entry: e, score: 0, matchedOn: 'keyword' }));

    if (!this.worker) {
      await this.ensureWorker().catch(() => {});
    }

    if (this.isDbReady && this.worker) {
      const useSemantic = mode === 'semantic' || (mode === 'auto' && this.semanticReady);
      if (useSemantic && this.semanticReady) {
        try {
          const result = await this.sendToWorker('search_semantic', { query, limit });
          return ((result.payload as { hits: (MemoryEntry & { score: number })[] }).hits || []).map(h => ({
            entry: h, score: h.score, matchedOn: 'semantic' as const,
          }));
        } catch (e) { console.warn('[Memory] Semantic search failed, falling back', e); }
      }
      try {
        const result = await this.sendToWorker('search', { query, limit });
        return ((result.payload as { hits: { document: MemoryEntry; score: number }[] }).hits || []).map(h => ({
          entry: h.document, score: h.score, matchedOn: 'keyword' as const,
        }));
      } catch (e) { console.warn('[Memory] Worker search failed, falling back to local filter', e); }
    }

    return this.memories
      .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)
      .map(e => ({ entry: e, score: 1, matchedOn: 'keyword' as const }));
  }

  getStats(): MemoryStats {
    const byType: Record<string, number> = {};
    const byImportance: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    let totalImportance = 0;

    for (const m of this.memories) {
      const type = m.metadata.type ?? 'unknown';
      byType[type] = (byType[type] || 0) + 1;
      const imp = m.metadata.importance ?? 0;
      const label = imp < 0.3 ? 'low' : imp < 0.6 ? 'medium' : imp < 0.9 ? 'high' : 'critical';
      byImportance[label] = (byImportance[label] || 0) + 1;
      totalImportance += imp;
    }

    return {
      totalEntries: this.memories.length,
      totalTokens: this.memories.reduce((s, m) => s + (m.metadata.tokenCount || Math.ceil(m.content.length / 4)), 0),
      uniqueSources: new Set(this.memories.map(m => m.metadata.source)).size,
      byType,
      byImportance: byImportance as MemoryStats['byImportance'],
      avgImportance: this.memories.length > 0 ? totalImportance / this.memories.length : 0,
      oldestEntry: this.memories.length > 0 ? this.memories[this.memories.length - 1]?.metadata.timestamp : 0,
      newestEntry: this.memories.length > 0 ? this.memories[0]?.metadata.timestamp : 0,
      totalStorageBytes: this.memories.reduce((s, m) => s + new TextEncoder().encode(m.content).length, 0),
      lastPruned: null,
    };
  }

  async prune(options: MemoryPruneOptions): Promise<MemoryPruneResult> {
    const before = this.memories.length;
    const details: { type: string; count: number }[] = [];

    if (options.olderThan) {
      const cutoff = Date.now() - options.olderThan;
      const old = this.memories.filter(m => (m.metadata.timestamp ?? 0) < cutoff);
      if (old.length > 0) {
        if (!options.dryRun) {
await this.deps.database.db.memories.where('[metadata.timestamp]').below(cutoff).delete();
          this.memories = this.memories.filter(m => (m.metadata.timestamp ?? 0) >= cutoff);
        }
        details.push({ type: 'olderThan', count: old.length });
      }
    }

    const importanceBelow = options.importanceBelow;
    if (importanceBelow !== undefined) {
      const low = this.memories.filter(m => (m.metadata.importance ?? 0) < importanceBelow);
      if (low.length > 0 && !options.dryRun) {
        for (const m of low) {
          await this.deps.database.db.memories.delete(m.id).catch((e) => console.warn('[Memory] Failed to delete low-importance memory', e));
        }
        this.memories = this.memories.filter(m => (m.metadata.importance ?? 0) >= importanceBelow);
      }
      if (!options.dryRun) details.push({ type: 'importanceBelow', count: low.length });
    }

    const removed = before - this.memories.length;
    return { removed: options.dryRun ? details.reduce((s, d) => s + d.count, 0) : removed, bytesFreed: 0, details };
  }

  async clear() {
    this.memories = [];
    await this.deps.database.db.memories.clear();
    if (this.worker) this.sendToWorker('init', { memories: [] }).catch((e) => console.warn('[Memory] Worker re-init after clear failed', e));
    this.deps.eventBus.emit('memory:updated', this.memories);
  }

  get isSemanticReady() { return this.semanticReady; }

  recall(context: string, limit = 3): MemoryEntry[] {
    const keywords = context.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (keywords.length === 0) return this.memories.slice(0, limit);

    const scored = this.memories.map(m => {
      const content = m.content.toLowerCase();
      const matches = keywords.filter(k => content.includes(k)).length;
      return { entry: m, score: matches / keywords.length };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({ ...s.entry, score: s.score }));
  }
}
