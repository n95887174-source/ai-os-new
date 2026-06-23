import { BucketStorageAdapter } from '../storage-adapter-instance';
import { EVENTS } from '../events/event-names';
import { CONFIG } from './config-registry';
import { estimateTokenCount } from '../../llm/utils/token-counter';
import type { MemoryEntry, MemoryStats, MemorySearchResult, MemoryPruneOptions, MemoryPruneResult } from '../types/memory-types';
import type { IMemoryEngine, MemoryCapability } from '../contracts/memory';
import { FEATURE_FLAGS } from '../contracts/feature-flags';
import { rootLogger } from './logger-service';
const LOGGER = rootLogger.child('MemoryEngine');

const WORKER_URL = new URL('../../services/memory.worker.ts', import.meta.url).href;

const MEMORY_TTL_MS = CONFIG?.services?.cache?.defaultTTLMs ?? 30 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = MEMORY_TTL_MS * 0.5;
const MAX_MEMORY_ENTRIES = 1000;

interface PendingRequest {
  resolve: (value: { type: string; payload: unknown }) => void;
  reject: (reason?: unknown) => void;
  timerId?: ReturnType<typeof setTimeout>;
}

export type SearchMode = 'auto' | 'semantic' | 'fulltext';

export interface MemoryServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
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
  featureFlags: {
    isEnabled: (flag: string) => boolean;
    onChange: (cb: (flag: string, enabled: boolean) => void) => () => void;
  };
}

export class MemoryService implements IMemoryEngine {
  private memories: MemoryEntry[] = [];
  private isDbReady = false;
  private semanticReady = false;
  private worker: Worker | null = null;
  private workerInitPromise: Promise<void> | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private unsubs: Array<() => void> = [];
  private pruneInterval: ReturnType<typeof setInterval> | null = null;
  private deps: MemoryServiceDeps;
  private _listenersSetup = false;
  private readonly PENDING_TIMEOUT_MS = 30_000;

  constructor(deps: MemoryServiceDeps) {
    this.deps = deps;
  }

  async init() {
    if (this._listenersSetup) return;
    this.setupListeners();
    this._listenersSetup = true;
    await this.load();
    this.startPruneTimer();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    if (this.pruneInterval) { clearInterval(this.pruneInterval); this.pruneInterval = null; }
    // M-4: Reject pending requests before terminating worker
    for (const [, req] of this.pendingRequests) {
      if (req.timerId) clearTimeout(req.timerId);
      req.reject(new Error('MemoryEngine destroyed'));
    }
    this.pendingRequests.clear();
    if (this.worker) { this.worker.terminate(); this.worker = null; }
    this.memories = [];
    this._listenersSetup = false;
    this.isDbReady = false;
    this.semanticReady = false;
    this.workerInitPromise = null;
  }

  private startPruneTimer() {
    this.pruneInterval = setInterval(() => this.pruneOldEntries(), PRUNE_INTERVAL_MS);
  }

  private async pruneOldEntries() {
    try {
      const cutoff = Date.now() - MEMORY_TTL_MS;
      await this.deps.database.db.memories.where('[metadata.timestamp]').below(cutoff).delete();
      this.memories = this.memories.filter(m => (m.metadata.timestamp ?? 0) >= cutoff);
      this.deps.eventBus.emit(EVENTS.MEMORY_UPDATED, this.memories);
    } catch (e) {
      LOGGER.error('MemoryEngine', 'Prune cycle failed', { error: e });
    }
  }

  private async ensureWorker(): Promise<void> {
    if (this.worker) return;
    if (this.workerInitPromise) return this.workerInitPromise;
    this.workerInitPromise = this.initWorker();
    try {
      return await this.workerInitPromise;
    } finally {
      if (!this.worker) this.workerInitPromise = null;
    }
  }

  private async initWorker() {
    try {
      const worker = new Worker(WORKER_URL, { type: 'module' });
      worker.onmessage = this.handleWorkerMessage.bind(this);
      worker.onerror = (e) => LOGGER.error('MemoryEngine', 'Worker error', { error: e });
      this.worker = worker;
      await this.sendToWorker('init', { memories: this.memories });
      this.isDbReady = true;
    } catch (e) {
      LOGGER.warn('MemoryEngine', 'Worker not available, using local search', { error: e });
      this.worker?.terminate();
      this.worker = null;
      this.workerInitPromise = null;
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
      LOGGER.info('MemoryEngine', 'Semantic search ready (lazy)');
    } catch (e) {
      LOGGER.warn('MemoryEngine', 'Semantic search unavailable:', { error: e });
    }
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { requestId, type, payload } = event.data;
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      if (pending.timerId) clearTimeout(pending.timerId);
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
    } catch (e) { LOGGER.warn('MemoryEngine', 'Failed to persist embedding vector', { error: e }); }
  }

  private sendToWorker(type: string, payload?: unknown): Promise<{ type: string; payload: unknown }> {
    return new Promise((resolve, reject) => {
      if (!this.worker) { reject(new Error('Worker not available')); return; }
      const requestId = crypto.randomUUID();
      const timerId = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Worker request ${type} timed out after ${this.PENDING_TIMEOUT_MS}ms`));
        }
      }, this.PENDING_TIMEOUT_MS);
      this.pendingRequests.set(requestId, { resolve, reject, timerId });
      this.worker.postMessage({ requestId, type, payload });
    });
  }

  private async load() {
    try {
      if ((await this.deps.database.db.memories.count()) > 0) {
        this.memories = (await this.deps.database.db.memories.orderBy('[metadata.timestamp]').reverse().toArray()).slice(0, MAX_MEMORY_ENTRIES);
        return;
      }
      const stored = BucketStorageAdapter.getItem('super_agents_os_memory');
      if (stored) {
        this.memories = JSON.parse(stored).slice(0, MAX_MEMORY_ENTRIES);
        await this.deps.database.db.memories.bulkAdd(this.memories);
        BucketStorageAdapter.removeItem('super_agents_os_memory');
      }
    } catch (e) { LOGGER.error('MemoryEngine', 'Failed to load memory mesh', { error: e }); }
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.onSafe<{ output?: string; fullContent?: string; nodeId?: string; provider?: string }>(EVENTS.COGNITIVE_STEP_COMPLETED, (d) => {
        if (d.output || d.fullContent) {
          this.store({
            content: d.output || d.fullContent || '',
            metadata: {
              source: d.nodeId || d.provider || 'unknown',
              type: 'decision',
              timestamp: Date.now(),
              importance: 0.4,
            }
          });
        }
      })
    );

    this.unsubs.push(
      this.deps.featureFlags.onChange((flag, enabled) => {
        if (flag === FEATURE_FLAGS.MEMORY_ENABLED && !enabled) {
          this.memories = [];
        }
      })
    );
  }

  async store(entry: Omit<MemoryEntry, 'id'>) {
    if (!this.deps.featureFlags.isEnabled(FEATURE_FLAGS.MEMORY_ENABLED)) return;
    const source = entry.metadata.source ?? 'unknown';
    const type = entry.metadata.type ?? 'generic';
    const newEntry: MemoryEntry = { ...entry, id: this.computeId(entry.content, source, type) } as MemoryEntry;
    try {
      await this.deps.database.db.memories.put(newEntry);
      this.memories = [newEntry, ...this.memories].slice(0, MAX_MEMORY_ENTRIES);
      this.ensureWorker().then(() => {
        if (this.worker) {
          this.sendToWorker('upsert', { entry: newEntry, generateEmbedding: this.semanticReady })
            .catch((e) => { LOGGER.warn('MemoryEngine', 'Worker insert failed', { error: e }); this.semanticReady = false; });
        }
      }).catch((e) => { LOGGER.warn('MemoryEngine', 'insertMemory dexie fallback failed', { error: e }); this.semanticReady = false; });
      this.deps.eventBus.emit(EVENTS.MEMORY_UPDATED, this.memories);
    } catch (e) { LOGGER.error('MemoryEngine', 'Failed to persist to Dexie', { error: e }); throw e; }
  }

  async upsert(entry: Omit<MemoryEntry, 'id'>) {
    if (!this.deps.featureFlags.isEnabled(FEATURE_FLAGS.MEMORY_ENABLED)) return;
    const source = entry.metadata.source ?? 'unknown';
    const type = entry.metadata.type ?? 'generic';
    const deterministicId = this.computeId(entry.content, source, type);
    const newEntry: MemoryEntry = { ...entry, id: deterministicId } as MemoryEntry;
    try {
      await this.deps.database.db.memories.put(newEntry);
      const existing = this.memories.findIndex(m => m.id === deterministicId);
      if (existing >= 0) {
        this.memories[existing] = newEntry;
      } else {
        this.memories = [newEntry, ...this.memories].slice(0, MAX_MEMORY_ENTRIES);
      }
      this.ensureWorker().then(() => {
        if (this.worker) {
          this.sendToWorker('upsert', { entry: newEntry, generateEmbedding: this.semanticReady })
            .catch((e) => { LOGGER.warn('MemoryEngine', 'Worker upsert failed', { error: e }); this.semanticReady = false; });
        }
      }).catch((e) => { LOGGER.warn('MemoryEngine', 'insertMemory dexie fallback failed', { error: e }); this.semanticReady = false; });
      this.deps.eventBus.emit(EVENTS.MEMORY_UPDATED, this.memories);
    } catch (e) { LOGGER.error('MemoryEngine', 'Upsert failed', { error: e }); throw e; }
  }

  private computeId(content: string, source: string, type: string): string {
    const raw = `${source}:${type}:${content}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }
    return `mem-${(hash >>> 0).toString(36)}`;
  }

  async storeBatch(entries: Omit<MemoryEntry, 'id'>[]) {
    if (!this.deps.featureFlags.isEnabled(FEATURE_FLAGS.MEMORY_ENABLED)) return;
    const newEntries = entries.map(e => {
      const src = e.metadata.source ?? 'unknown';
      const typ = e.metadata.type ?? 'generic';
      return { ...e, id: this.computeId(e.content, src, typ) } as MemoryEntry;
    });
    try {
      await Promise.all(newEntries.map(e => this.deps.database.db.memories.put(e)));
      this.memories = [...newEntries, ...this.memories];
      if (this.memories.length > MAX_MEMORY_ENTRIES) {
        const excess = this.memories.slice(MAX_MEMORY_ENTRIES);
        this.memories = this.memories.slice(0, MAX_MEMORY_ENTRIES);
        await Promise.all(excess.map(e => this.deps.database.db.memories.delete(e.id)));
      }
      this.ensureWorker().then(() => {
        if (this.worker) {
          Promise.all(newEntries.map(e =>
            this.sendToWorker('upsert', { entry: e, generateEmbedding: false })
          )).catch((err) => LOGGER.warn('MemoryEngine', 'Batch insert to worker failed', { error: err }));
        }
      }).catch((e) => { LOGGER.warn('MemoryEngine', 'insertMemory dexie fallback failed', { error: e }); this.semanticReady = false; });
      this.deps.eventBus.emit(EVENTS.MEMORY_UPDATED, this.memories);
    } catch (e) { LOGGER.error('MemoryEngine', 'Batch store failed', { error: e }); }
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
    try {
      await this.deps.database.db.memories.delete(id);
    } catch (e) {
      LOGGER.error('MemoryEngine', 'Dexie delete failed — in-memory state preserved', { error: e });
      return;
    }
    this.memories.splice(idx, 1);
    if (!this.worker) {
      await this.ensureWorker().catch((e) => LOGGER.warn('MemoryEngine', 'ensureWorker failed', { error: e }));
    }
    if (this.worker) this.sendToWorker('remove', { id }).catch((e) => LOGGER.warn('MemoryEngine', 'Worker remove failed', { error: e }));
    this.deps.eventBus.emit(EVENTS.MEMORY_UPDATED, this.memories);
  }

  async updateMemory(id: string, content: string) {
    const entry = this.memories.find(m => m.id === id);
    if (!entry) return;
    const updated = { ...entry, content };
    try {
      await this.deps.database.db.memories.put(updated);
    } catch (e) {
      LOGGER.error('MemoryEngine', 'Dexie put failed — in-memory state preserved', { error: e });
      return;
    }
    Object.assign(entry, updated);
    if (!this.worker) {
      await this.ensureWorker().catch((e) => LOGGER.warn('MemoryEngine', 'ensureWorker failed', { error: e }));
    }
    if (this.worker) this.sendToWorker('remove', { id }).then(() =>
      this.sendToWorker('insert', { entry, generateEmbedding: false })
    ).catch((e) => LOGGER.warn('MemoryEngine', 'Worker update failed', { error: e }));
    this.deps.eventBus.emit(EVENTS.MEMORY_UPDATED, this.memories);
  }

  async search(query: string, limit: number = 5, mode: SearchMode = 'auto'): Promise<MemorySearchResult[]> {
    if (!this.deps.featureFlags.isEnabled(FEATURE_FLAGS.MEMORY_ENABLED)) return [];
    if (!query.trim()) return this.memories.slice(0, limit).map(e => ({ entry: e, score: 0, matchedOn: 'keyword' }));

    if (!this.worker) {
      await this.ensureWorker().catch((e) => LOGGER.warn('MemoryEngine', 'ensureWorker failed', { error: e }));
    }

    if (this.isDbReady && this.worker) {
      const useSemantic = mode === 'semantic' || (mode === 'auto' && this.semanticReady);
      if (useSemantic && this.semanticReady) {
        try {
          const result = await this.sendToWorker('search_semantic', { query, limit });
          return ((result.payload as { hits: (MemoryEntry & { score: number })[] }).hits || []).map(h => ({
            entry: h, score: h.score, matchedOn: 'semantic' as const,
          }));
        } catch (e) { LOGGER.warn('MemoryEngine', 'Semantic search failed, falling back', { error: e }); }
      }
      try {
        const result = await this.sendToWorker('search', { query, limit });
        return ((result.payload as { hits: { document: MemoryEntry; score: number }[] }).hits || []).map(h => ({
          entry: h.document, score: h.score, matchedOn: 'keyword' as const,
        }));
      } catch (e) { LOGGER.warn('MemoryEngine', 'Worker search failed, falling back to local filter', { error: e }); }
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
      totalTokens: this.memories.reduce((s, m) => s + (m.metadata.tokenCount || estimateTokenCount(m.content)), 0),
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
      if (low.length > 0) {
        details.push({ type: 'importanceBelow', count: low.length });
        if (!options.dryRun) {
          for (const m of low) {
            await this.deps.database.db.memories.delete(m.id).catch((e) => LOGGER.warn('MemoryEngine', 'Failed to delete low-importance memory', { error: e }));
          }
          this.memories = this.memories.filter(m => (m.metadata.importance ?? 0) >= importanceBelow);
        }
      }
    }

    const removed = before - this.memories.length;
    return { removed: options.dryRun ? details.reduce((s, d) => s + d.count, 0) : removed, bytesFreed: 0, details };
  }

  async clear() {
    this.memories = [];
    await this.deps.database.db.memories.clear();
    if (this.worker) this.sendToWorker('init', { memories: [] }).catch((e) => LOGGER.warn('MemoryEngine', 'Worker re-init after clear failed', { error: e }));
    this.deps.eventBus.emit(EVENTS.MEMORY_UPDATED, this.memories);
  }

  get isSemanticReady() { return this.semanticReady; }

  getCapabilities(): MemoryCapability {
    return {
      maxEntries: MAX_MEMORY_ENTRIES,
      maxStorageBytes: 50 * 1024 * 1024,
      supportedSearchModes: ['auto', 'semantic', 'fulltext'],
      supportsBatchOperations: true,
      supportsPruning: true,
      ttlSeconds: MEMORY_TTL_MS / 1000,
    };
  }

  recall(context: string, limit = 3): MemoryEntry[] {
    if (!this.deps.featureFlags.isEnabled(FEATURE_FLAGS.MEMORY_ENABLED)) return [];
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
