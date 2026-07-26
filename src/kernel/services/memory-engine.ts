import { EVENTS } from '../events/event-names';
import { CONFIG } from './config-registry';
import { estimateTokenCount } from '../../llm/utils/token-counter';
import { MemoryRepository } from '../dal/memory-repository';
import { computeMemoryId } from '../utils/compute-memory-id';
import type {
    MemoryEntry,
    MemoryStats,
    MemorySearchResult,
    MemoryPruneOptions,
    MemoryPruneResult,
} from '../types/memory-types';
import type { IMemoryEngine, MemoryCapability } from '../contracts/memory';
import type { ITransaction } from '../contracts/transaction';
import { TransactionContext } from './transaction';
import type { DatabaseService } from './database-service';
import { rootLogger } from './logger-service';
const LOGGER = rootLogger.child('MemoryEngine');

const WORKER_URL = new URL('../workers/memory.worker.ts', import.meta.url).href;

const MAX_MEMORY_ENTRIES = 1000;
function getMemoryTtlMs(): number {
    return CONFIG?.services?.cache?.defaultTTLMs ?? 30 * 24 * 60 * 60 * 1000;
}
function getPruneIntervalMs(): number {
    return getMemoryTtlMs() * 0.5;
}

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
        emitOnce: (event: string, key: string, data?: unknown) => boolean;
    };
    database: DatabaseService;
    executionGovernor?: {
        start(spec: { type: string; timeoutMs: number; metadata?: Record<string, unknown> }): {
            complete(): void;
            fail(e: Error): void;
        };
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
    private memoryRepo: MemoryRepository;
    private _listenersSetup = false;
    private readonly PENDING_TIMEOUT_MS = 30_000;
    private _memoriesLock: Promise<void> = Promise.resolve();

    private async withMemoriesLock<T>(fn: () => Promise<T>): Promise<T> {
        let release: () => void;
        const prev = this._memoriesLock;
        this._memoriesLock = new Promise<void>((resolve) => {
            release = resolve;
        });
        await prev;
        try {
            return await fn();
        } finally {
            release!();
        }
    }

    private async _withTransaction<T>(
        source: string,
        fn: (tx: TransactionContext) => Promise<T>,
    ): Promise<T> {
        const tx = new TransactionContext(`MemoryEngine:${source}`);
        try {
            const result = await fn(tx);
            await tx.commit({
                emit: (event, data) => this.deps.eventBus.emit(event, data),
            });
            return result;
        } catch (e) {
            await tx.rollback({
                emit: (event, data) => this.deps.eventBus.emit(event, data),
            });
            throw e;
        }
    }

    constructor(deps: MemoryServiceDeps) {
        this.deps = deps;
        this.memoryRepo = new MemoryRepository(deps.database);
    }

    async init() {
        if (this._listenersSetup) return;
        this.setupListeners();
        this._listenersSetup = true;
        await this.load();
        this.startPruneTimer();
    }

    destroy() {
        this.unsubs.forEach((u) => u());
        this.unsubs = [];
        if (this.pruneInterval) {
            clearInterval(this.pruneInterval);
            this.pruneInterval = null;
        }
        // M-4: Reject pending requests before terminating worker
        for (const [, req] of this.pendingRequests) {
            if (req.timerId) clearTimeout(req.timerId);
            req.reject(new Error('MemoryEngine destroyed'));
        }
        this.pendingRequests.clear();
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.memories = [];
        this._listenersSetup = false;
        this.isDbReady = false;
        this.semanticReady = false;
        this.workerInitPromise = null;
    }

    private startPruneTimer() {
        this.pruneInterval = setInterval(() => this.pruneOldEntries(), getPruneIntervalMs());
    }

    private async pruneOldEntries() {
        try {
            const cutoff = Date.now() - getMemoryTtlMs();
            const removed = this.memories.filter((m) => (m.metadata.timestamp ?? 0) < cutoff);
            await this.memoryRepo.prune(cutoff);
            await this.withMemoriesLock(async () => {
                this.memories = this.memories.filter((m) => (m.metadata.timestamp ?? 0) >= cutoff);
                for (const m of removed) {
                    this.sendToWorker('remove', { id: m.id }).catch((e: unknown) => {
                        LOGGER.warn('MemoryEngine', 'Worker remove during prune failed', {
                            error: e,
                        });
                    });
                }
                this.deps.eventBus.emitOnce(EVENTS.MEMORY_UPDATED, 'all', this.memories);
            });
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
            await this.memoryRepo.update(id, { vector });
            await this.withMemoriesLock(async () => {
                const mem = this.memories.find((m) => m.id === id);
                if (mem) {
                    const idx = this.memories.indexOf(mem);
                    if (idx >= 0) {
                        this.memories = [
                            ...this.memories.slice(0, idx),
                            { ...mem, vector },
                            ...this.memories.slice(idx + 1),
                        ];
                        this.deps.eventBus.emitOnce(EVENTS.MEMORY_UPDATED, 'all', this.memories);
                    }
                }
            });
        } catch (e) {
            LOGGER.warn('MemoryEngine', 'Failed to persist embedding vector', { error: e });
        }
    }

    private sendToWorker(
        type: string,
        payload?: unknown,
    ): Promise<{ type: string; payload: unknown }> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker not available'));
                return;
            }
            const requestId = crypto.randomUUID();
            const timerId = setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(
                        new Error(
                            `Worker request ${type} timed out after ${this.PENDING_TIMEOUT_MS}ms`,
                        ),
                    );
                }
            }, this.PENDING_TIMEOUT_MS);
            this.pendingRequests.set(requestId, { resolve, reject, timerId });
            this.worker.postMessage({ requestId, type, payload });
        });
    }

    private async load() {
        try {
            if ((await this.memoryRepo.getCount()) > 0) {
                const loaded = (await this.memoryRepo.getAll()).slice(0, MAX_MEMORY_ENTRIES);
                await this.withMemoriesLock(async () => {
                    this.memories = loaded;
                });
                return;
            }
        } catch (e) {
            LOGGER.error('MemoryEngine', 'Failed to load memory mesh', { error: e });
        }
    }

    private setupListeners() {
        this.unsubs.push(
            this.deps.eventBus.onSafe<{
                output?: string;
                fullContent?: string;
                nodeId?: string;
                provider?: string;
            }>(EVENTS.COGNITIVE_STEP_COMPLETED, (d) => {
                if (d.output || d.fullContent) {
                    this._withTransaction('cognitiveStep', async (tx) => {
                        await this.store(
                            {
                                content: d.output || d.fullContent || '',
                                metadata: {
                                    source: d.nodeId || d.provider || 'unknown',
                                    type: 'decision',
                                    timestamp: Date.now(),
                                    importance: 0.4,
                                },
                            },
                            tx,
                        );
                    }).catch((e) => {
                        LOGGER.warn('MemoryEngine', 'Cognitive step store failed', { error: e });
                    });
                }
            }),
        );

        this.unsubs.push(
            this.deps.eventBus.on(EVENTS.SETTINGS_UPDATED, (data: unknown) => {
                const changes = (data as { changes?: Record<string, unknown> })?.changes;
                if (
                    changes &&
                    'featureFlags.memory.enabled' in changes &&
                    changes['featureFlags.memory.enabled'] === false
                ) {
                    this.clear();
                }
            }),
        );
    }

    private _passesQualityGate(entry: {
        content: string;
        metadata: { importance?: number; source?: string; finishReason?: string; status?: string };
    }): boolean {
        const content = entry.content?.trim();
        if (!content || content.length < 5) return false;

        // D-04: reject error-status or error-finishReason entries
        if (entry.metadata.status === 'error' || entry.metadata.status === 'timeout') return false;
        const errorFinishReasons = ['SAFETY', 'RECITATION', 'OTHER'];
        if (entry.metadata.finishReason && errorFinishReasons.includes(entry.metadata.finishReason))
            return false;

        const importance = entry.metadata.importance ?? 0;
        if (entry.metadata.source === 'system' && importance < 0.3) return false;

        const ERROR_PATTERNS = [
            /^i'?m sorry/i,
            /^sorry[,.]/i,
            /^error[:\s]/i,
            /^(an|the)\s+error/i,
            /^failed/i,
            /^unable to/i,
            /^could not/i,
            /^there was an error/i,
            /^something went wrong/i,
            /^internal server error/i,
            /^rate limit/i,
            /^too many requests/i,
            /^quota exceeded/i,
            /^insufficient/i,
            /^we encountered/i,
        ];
        if (ERROR_PATTERNS.some((p) => p.test(content))) return false;

        return true;
    }

    async store(entry: Omit<MemoryEntry, 'id'>, tx?: ITransaction) {
        if (!CONFIG.featureFlags.memory.enabled) return;
        if (!this._passesQualityGate(entry)) return;
        const source = entry.metadata.source ?? 'unknown';
        const type = entry.metadata.type ?? 'generic';
        const newEntry: MemoryEntry = {
            ...entry,
            id: await this.computeId(entry.content, source, type),
        } as MemoryEntry;
        await this.withMemoriesLock(async () => {
            const doPersist = async () => {
                await this.memoryRepo.save(newEntry);
                this.memories.unshift(newEntry);
                if (this.memories.length > MAX_MEMORY_ENTRIES)
                    this.memories.length = MAX_MEMORY_ENTRIES;
            };
            const onCommit = () => {
                this.deps.eventBus.emitOnce(EVENTS.MEMORY_UPDATED, 'all', this.memories);
            };
            if (tx) {
                const snapshot = tx.capture(this.memories);
                tx.deferPersist(doPersist, async () => {
                    this.memories = snapshot as MemoryEntry[];
                    await this.memoryRepo.delete(newEntry.id).catch(() => {});
                });
                tx.onCommit(onCommit);
            } else {
                await this._withTransaction('store', async (itx) => {
                    const snapshot = structuredClone(this.memories);
                    itx.deferPersist(doPersist, async () => {
                        this.memories = snapshot;
                        await this.memoryRepo.delete(newEntry.id).catch(() => {});
                    });
                    itx.onCommit(onCommit);
                });
            }
            this.ensureWorker()
                .then(() => {
                    if (this.worker) {
                        this.sendToWorker('upsert', {
                            entry: newEntry,
                            generateEmbedding: this.semanticReady,
                        }).catch((e) => {
                            LOGGER.warn('MemoryEngine', 'Worker insert failed', { error: e });
                            this.semanticReady = false;
                        });
                    }
                })
                .catch((e) => {
                    LOGGER.warn('MemoryEngine', 'init worker failed', {
                        error: e,
                    });
                    this.semanticReady = false;
                });
        });
    }

    async upsert(entry: Omit<MemoryEntry, 'id'>, tx?: ITransaction) {
        if (!CONFIG.featureFlags.memory.enabled) return;
        if (!this._passesQualityGate(entry)) return;
        const source = entry.metadata.source ?? 'unknown';
        const type = entry.metadata.type ?? 'generic';
        const deterministicId = await this.computeId(entry.content, source, type);
        const newEntry: MemoryEntry = { ...entry, id: deterministicId } as MemoryEntry;
        await this.withMemoriesLock(async () => {
            const doPersist = async () => {
                await this.memoryRepo.save(newEntry);
                const existing = this.memories.findIndex((m) => m.id === deterministicId);
                if (existing >= 0) {
                    this.memories[existing] = newEntry;
                } else {
                    this.memories.unshift(newEntry);
                    if (this.memories.length > MAX_MEMORY_ENTRIES)
                        this.memories.length = MAX_MEMORY_ENTRIES;
                }
            };
            const onCommit = () => {
                this.deps.eventBus.emitOnce(EVENTS.MEMORY_UPDATED, 'all', this.memories);
            };
            if (tx) {
                const snapshot = tx.capture(this.memories);
                tx.deferPersist(doPersist, async () => {
                    this.memories = snapshot as MemoryEntry[];
                    await this.memoryRepo.delete(deterministicId).catch(() => {});
                });
                tx.onCommit(onCommit);
            } else {
                await this._withTransaction('upsert', async (itx) => {
                    const snapshot = structuredClone(this.memories);
                    itx.deferPersist(doPersist, async () => {
                        this.memories = snapshot;
                        await this.memoryRepo.delete(deterministicId).catch(() => {});
                    });
                    itx.onCommit(onCommit);
                });
            }
            this.ensureWorker()
                .then(() => {
                    if (this.worker) {
                        this.sendToWorker('upsert', {
                            entry: newEntry,
                            generateEmbedding: this.semanticReady,
                        }).catch((e) => {
                            LOGGER.warn('MemoryEngine', 'Worker upsert failed', { error: e });
                            this.semanticReady = false;
                        });
                    }
                })
                .catch((e) => {
                    LOGGER.warn('MemoryEngine', 'init worker failed', {
                        error: e,
                    });
                    this.semanticReady = false;
                });
        });
    }

    private async computeId(content: string, source: string, type: string): Promise<string> {
        return computeMemoryId(content, source, type);
    }

    async storeBatch(entries: Omit<MemoryEntry, 'id'>[], tx?: ITransaction) {
        if (!CONFIG.featureFlags.memory.enabled) return;
        const filtered = entries.filter((e) => this._passesQualityGate(e));
        if (filtered.length === 0) return;
        const newEntries = await Promise.all(
            filtered.map(async (e) => {
                const src = e.metadata.source ?? 'unknown';
                const typ = e.metadata.type ?? 'generic';
                return { ...e, id: await this.computeId(e.content, src, typ) } as MemoryEntry;
            }),
        );
        const govOp = this.deps.executionGovernor?.start({
            type: 'memory-index',
            timeoutMs: 30_000,
            metadata: { operation: 'storeBatch', count: newEntries.length },
        });
        const idsToDelete = newEntries.map((e) => e.id);
        await this.withMemoriesLock(async () => {
            const doPersist = async () => {
                const persisted = await this.memoryRepo.storeBatch(
                    newEntries.map((e) => ({
                        content: e.content,
                        metadata: e.metadata,
                    })),
                );
                this.memories = [...persisted, ...this.memories];
                if (this.memories.length > MAX_MEMORY_ENTRIES) {
                    this.memories = this.memories.slice(0, MAX_MEMORY_ENTRIES);
                }
            };
            const onCommit = () => {
                this.deps.eventBus.emitOnce(EVENTS.MEMORY_UPDATED, 'all', this.memories);
                govOp?.complete();
            };
            if (tx) {
                const snapshot = tx.capture(this.memories);
                tx.deferPersist(doPersist, async () => {
                    this.memories = snapshot as MemoryEntry[];
                    await Promise.allSettled(idsToDelete.map((id) => this.memoryRepo.delete(id)));
                });
                tx.onCommit(onCommit);
            } else {
                await this._withTransaction('storeBatch', async (itx) => {
                    const snapshot = structuredClone(this.memories);
                    itx.deferPersist(doPersist, async () => {
                        this.memories = snapshot;
                        await Promise.allSettled(
                            idsToDelete.map((id) => this.memoryRepo.delete(id)),
                        );
                    });
                    itx.onCommit(onCommit);
                });
            }
            this.ensureWorker()
                .then(() => {
                    if (this.worker) {
                        Promise.all(
                            newEntries.map((e) =>
                                this.sendToWorker('upsert', {
                                    entry: e,
                                    generateEmbedding: false,
                                }),
                            ),
                        ).catch((err) =>
                            LOGGER.warn('MemoryEngine', 'Batch insert to worker failed', {
                                error: err,
                            }),
                        );
                    }
                })
                .catch((e) => {
                    LOGGER.warn('MemoryEngine', 'init worker failed', {
                        error: e,
                    });
                    this.semanticReady = false;
                });
        });
    }

    getMemories(limit?: number): MemoryEntry[] {
        return limit ? this.memories.slice(0, limit) : this.memories;
    }

    getMemory(id: string): MemoryEntry | undefined {
        return this.memories.find((m) => m.id === id);
    }

    async deleteMemory(id: string, tx?: ITransaction) {
        const idx = this.memories.findIndex((m) => m.id === id);
        if (idx === -1) return;
        if (tx) {
            const snapshot = tx.capture(this.memories);
            tx.deferPersist(
                async () => {
                    await this.memoryRepo.delete(id);
                    const newIdx = this.memories.findIndex((m) => m.id === id);
                    if (newIdx !== -1) this.memories.splice(newIdx, 1);
                },
                async () => {
                    this.memories = snapshot as MemoryEntry[];
                },
            );
            tx.onCommit(() => {
                this.deps.eventBus.emitOnce(EVENTS.MEMORY_UPDATED, 'all', this.memories);
            });
        } else {
            try {
                await this.memoryRepo.delete(id);
            } catch (e) {
                LOGGER.error('MemoryEngine', 'Dexie delete failed — in-memory preserved', {
                    error: e,
                });
                return;
            }
            await this.withMemoriesLock(async () => {
                const newIdx = this.memories.findIndex((m) => m.id === id);
                if (newIdx === -1) return;
                this.memories.splice(newIdx, 1);
                this.deps.eventBus.emitOnce(EVENTS.MEMORY_UPDATED, 'all', this.memories);
            });
        }
        if (this.worker) {
            this.sendToWorker('remove', { id }).catch((e) =>
                LOGGER.warn('MemoryEngine', 'Worker remove failed', { error: e }),
            );
        } else {
            this.ensureWorker().catch((e) =>
                LOGGER.warn('MemoryEngine', 'ensureWorker failed', { error: e }),
            );
        }
    }

    async updateMemory(
        id: string,
        content: string,
        tx?: ITransaction,
    ): Promise<string | undefined> {
        const entry = this.memories.find((m) => m.id === id);
        if (!entry) return undefined;
        const source = entry.metadata.source ?? 'unknown';
        const type = entry.metadata.type ?? 'generic';
        const newId = await this.computeId(content, source, type);
        let resultId: string | undefined;
        await this.withMemoriesLock(async () => {
            if (newId === id) {
                const updated = { ...entry, content };
                const doPersist = async () => {
                    await this.memoryRepo.save(updated);
                    Object.assign(entry, updated);
                };
                const onCommit = () => {
                    resultId = id;
                    this.deps.eventBus.emitOnce(EVENTS.MEMORY_UPDATED, 'all', this.memories);
                };
                if (tx) {
                    const snapshot = tx.capture(this.memories);
                    tx.deferPersist(doPersist, async () => {
                        this.memories = snapshot as MemoryEntry[];
                    });
                    tx.onCommit(onCommit);
                } else {
                    await this._withTransaction('updateMemory', async (itx) => {
                        const snapshot = structuredClone(this.memories);
                        itx.deferPersist(doPersist, async () => {
                            this.memories = snapshot;
                        });
                        itx.onCommit(onCommit);
                    });
                }
            } else {
                const newEntry: MemoryEntry = {
                    ...entry,
                    id: newId,
                    content,
                    metadata: { ...entry.metadata, originalId: id },
                } as MemoryEntry;
                const doPersist = async () => {
                    await this.memoryRepo.delete(id);
                    await this.memoryRepo.save(newEntry);
                    const idx = this.memories.findIndex((m) => m.id === id);
                    if (idx !== -1) this.memories[idx] = newEntry;
                };
                const onCommit = () => {
                    resultId = newId;
                    this.deps.eventBus.emitOnce(EVENTS.MEMORY_UPDATED, 'all', this.memories);
                };
                if (tx) {
                    const snapshot = tx.capture(this.memories);
                    tx.deferPersist(doPersist, async () => {
                        this.memories = snapshot as MemoryEntry[];
                        await this.memoryRepo.delete(newId).catch(() => {});
                    });
                    tx.onCommit(onCommit);
                } else {
                    await this._withTransaction('updateMemory', async (itx) => {
                        const snapshot = structuredClone(this.memories);
                        itx.deferPersist(doPersist, async () => {
                            this.memories = snapshot;
                            await this.memoryRepo.delete(newId).catch(() => {});
                        });
                        itx.onCommit(onCommit);
                    });
                }
            }
            if (this.worker) {
                this.sendToWorker('remove', { id })
                    .then(() => {
                        const workerEntry: MemoryEntry =
                            newId === id
                                ? (entry as MemoryEntry)
                                : ({ ...entry, id: newId, content } as MemoryEntry);
                        return this.sendToWorker('insert', {
                            entry: workerEntry,
                            generateEmbedding: false,
                        });
                    })
                    .catch((e) =>
                        LOGGER.warn('MemoryEngine', 'Worker update failed', { error: e }),
                    );
            } else {
                this.ensureWorker().catch((e) =>
                    LOGGER.warn('MemoryEngine', 'ensureWorker failed', { error: e }),
                );
            }
        });
        return resultId;
    }

    async search(
        query: string,
        limit: number = 5,
        mode: SearchMode = 'auto',
    ): Promise<MemorySearchResult[]> {
        if (!CONFIG.featureFlags.memory.enabled) return [];
        if (!query.trim())
            return this.memories
                .slice(0, limit)
                .map((e) => ({ entry: e, score: 0, matchedOn: 'keyword' }));

        if (!this.worker) {
            await this.ensureWorker().catch((e) =>
                LOGGER.warn('MemoryEngine', 'ensureWorker failed', { error: e }),
            );
        }

        if (this.isDbReady && this.worker) {
            const useSemantic = mode === 'semantic' || (mode === 'auto' && this.semanticReady);
            if (useSemantic && this.semanticReady) {
                const govOp = this.deps.executionGovernor?.start({
                    type: 'memory-index',
                    timeoutMs: this.PENDING_TIMEOUT_MS + 5000,
                    metadata: { operation: 'search_semantic', query: query.slice(0, 60) },
                });
                try {
                    const result = await this.sendToWorker('search_semantic', { query, limit });
                    govOp?.complete();
                    return (
                        (result.payload as { hits: (MemoryEntry & { score: number })[] }).hits || []
                    ).map((h) => ({
                        entry: h,
                        score: h.score,
                        matchedOn: 'semantic' as const,
                    }));
                } catch (e) {
                    govOp?.fail(e instanceof Error ? e : new Error(String(e)));
                    LOGGER.warn('MemoryEngine', 'Semantic search failed, falling back', {
                        error: e,
                    });
                }
            }
            try {
                const result = await this.sendToWorker('search', { query, limit });
                return (
                    (result.payload as { hits: { document: MemoryEntry; score: number }[] }).hits ||
                    []
                ).map((h) => ({
                    entry: h.document,
                    score: h.score,
                    matchedOn: 'keyword' as const,
                }));
            } catch (e) {
                LOGGER.warn('MemoryEngine', 'Worker search failed, falling back to local filter', {
                    error: e,
                });
            }
        }

        return this.memories
            .filter((m) => m.content.toLowerCase().includes(query.toLowerCase()))
            .slice(0, limit)
            .map((e) => ({ entry: e, score: 1, matchedOn: 'keyword' as const }));
    }

    getStats(): MemoryStats {
        const byType: Record<string, number> = {};
        const byImportance: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
        let totalImportance = 0;

        for (const m of this.memories) {
            const type = m.metadata.type ?? 'unknown';
            byType[type] = (byType[type] || 0) + 1;
            const imp = m.metadata.importance ?? 0;
            const label =
                imp < 0.3 ? 'low' : imp < 0.6 ? 'medium' : imp < 0.9 ? 'high' : 'critical';
            byImportance[label] = (byImportance[label] || 0) + 1;
            totalImportance += imp;
        }

        return {
            totalEntries: this.memories.length,
            totalTokens: this.memories.reduce(
                (s, m) => s + (m.metadata.tokenCount || estimateTokenCount(m.content)),
                0,
            ),
            uniqueSources: new Set(this.memories.map((m) => m.metadata.source)).size,
            byType,
            byImportance: byImportance as MemoryStats['byImportance'],
            avgImportance: this.memories.length > 0 ? totalImportance / this.memories.length : 0,
            oldestEntry:
                this.memories.length > 0
                    ? Math.min(...this.memories.map((m) => m.metadata.timestamp ?? 0))
                    : 0,
            newestEntry:
                this.memories.length > 0
                    ? Math.max(...this.memories.map((m) => m.metadata.timestamp ?? 0))
                    : 0,
            totalStorageBytes: this.memories.reduce(
                (s, m) => s + new TextEncoder().encode(m.content).length,
                0,
            ),
            lastPruned: null,
        };
    }

    async prune(options: MemoryPruneOptions): Promise<MemoryPruneResult> {
        const before = this.memories.length;
        const details: { type: string; count: number }[] = [];

        if (options.olderThan) {
            const cutoff = Date.now() - options.olderThan;
            const old = this.memories.filter((m) => (m.metadata.timestamp ?? 0) < cutoff);
            if (old.length > 0) {
                if (!options.dryRun) {
                    await this.memoryRepo.prune(cutoff);
                    await this.withMemoriesLock(async () => {
                        this.memories = this.memories.filter(
                            (m) => (m.metadata.timestamp ?? 0) >= cutoff,
                        );
                    });
                }
                details.push({ type: 'olderThan', count: old.length });
            }
        }

        const importanceBelow = options.importanceBelow;
        if (importanceBelow !== undefined) {
            const low = this.memories.filter((m) => (m.metadata.importance ?? 0) < importanceBelow);
            if (low.length > 0) {
                details.push({ type: 'importanceBelow', count: low.length });
                if (!options.dryRun) {
                    for (const m of low) {
                        await this.memoryRepo
                            .delete(m.id)
                            .catch((e) =>
                                LOGGER.warn(
                                    'MemoryEngine',
                                    'Failed to delete low-importance memory',
                                    { error: e },
                                ),
                            );
                    }
                    await this.withMemoriesLock(async () => {
                        this.memories = this.memories.filter(
                            (m) => (m.metadata.importance ?? 0) >= importanceBelow,
                        );
                    });
                }
            }
        }

        const removed = before - this.memories.length;
        return {
            removed: options.dryRun ? details.reduce((s, d) => s + d.count, 0) : removed,
            bytesFreed: 0,
            details,
        };
    }

    async clear(tx?: ITransaction) {
        await this.withMemoriesLock(async () => {
            const doPersist = async () => {
                this.semanticReady = false;
                await this.memoryRepo.clear();
                this.memories = [];
            };
            const onCommit = () => {
                this.deps.eventBus.emitOnce(EVENTS.MEMORY_UPDATED, 'all', this.memories);
            };
            if (tx) {
                const snapshot = tx.capture(this.memories);
                tx.deferPersist(doPersist, async () => {
                    this.memories = snapshot as MemoryEntry[];
                });
                tx.onCommit(onCommit);
            } else {
                await this._withTransaction('clear', async (itx) => {
                    const snapshot = structuredClone(this.memories);
                    itx.deferPersist(doPersist, async () => {
                        this.memories = snapshot;
                    });
                    itx.onCommit(onCommit);
                });
            }
            if (this.worker)
                this.sendToWorker('init', { memories: [] }).catch((e) =>
                    LOGGER.warn('MemoryEngine', 'Worker re-init after clear failed', { error: e }),
                );
        });
    }

    get isSemanticReady() {
        return this.semanticReady;
    }

    getCapabilities(): MemoryCapability {
        return {
            maxEntries: MAX_MEMORY_ENTRIES,
            maxStorageBytes: 50 * 1024 * 1024,
            supportedSearchModes: ['auto', 'semantic', 'fulltext'],
            supportsBatchOperations: true,
            supportsPruning: true,
            ttlSeconds: getMemoryTtlMs() / 1000,
        };
    }

    recall(context: string, limit = 3): MemoryEntry[] {
        if (!CONFIG.featureFlags.memory.enabled) return [];
        const keywords = context
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3);
        if (keywords.length === 0) return this.memories.slice(0, limit);

        const scored = this.memories.map((m) => {
            const content = m.content.toLowerCase();
            const matches = keywords.filter((k) => content.includes(k)).length;
            return { entry: m, score: matches / keywords.length };
        });

        return scored
            .filter((s) => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((s) => ({ ...s.entry, score: s.score }));
    }
}
