import { genId } from '../../../utils/gen-id';
import { CONFIG } from '../config-registry';
import { DebateProviderResolver, DEBATE_MODEL_PRIORITY } from './debate-query-engine';
import { buildConclusionLlmCall } from './debate-conclusion-engine';
import { DebateTopologyService } from './debate-topology';
import { DebateOrchestrator } from './debate-orchestrator';
import { buildPipeline } from './debate-pipeline-builder';
import type { PipelineEngine, PipelineEngineDeps } from './debate-pipeline-builder';
import { debateCallLlm, debateGetDefaultPrompt, type LlmCallerDeps } from './debate-llm-caller';
import type {
    DebateTopology,
    ParticipantConfig,
    DebateSessionSnapshot,
    IDebateEngine,
    IDebateSession,
    IDebateBudget,
    TimelineEntry,
} from '../../contracts/debate-runtime';
import type { DebateSession as DebateSessionInterface } from '../../contracts/debate-types';
import type { IEventBus } from '../../types/interfaces';
import type { ILifecycle } from '../../contracts/lifecycle';
import type { IAdapterRegistry } from '../../contracts/provider-adapter';
import { rootLogger } from '../logger-service';
import { EVENTS } from '../../events/event-names';
import type { DebatePolicyEngine } from './debate-policy-engine';
import type { DebateRAGRetriever } from './debate-rag-retriever';
import type { DebateMemoryExtractor } from './debate-memory-extractor';
import type { IDebateEvaluator } from '../../contracts/debate-runtime';
import { createPhaseChangeHandler } from './debate-phase-handler';

import { DebateSessionContext } from './debate-session-context';
import { DebateMemory } from './debate-memory';
import { DebateBudget } from './debate-budget';
import { DebateSession as DebateSessionClass } from './debate-session';
import type { DebateStore } from '../../contracts/storage/debate-store';
import { snapshotToSession, type SnapshotBridgeContext } from './debate-snapshot-bridge';
import {
    DebatePersistenceManager,
    type PersistenceEngineState,
    type PersistenceDeps,
} from './debate-persistence-manager';
const LOGGER = rootLogger.child('DebateEngine');

interface KeyServiceLike {
    getKeys(): Array<{
        id: string;
        key: string;
        provider: string;
        status: string;
        model?: string;
        availableModels?: string[];
    }>;
    recordUsage(
        keyId: string,
        latency: number,
        tokens: number,
        modelId: string,
        metadata?: Record<string, unknown>,
    ): void;
    updateKeyStatus(keyId: string, status: string): void;
}

interface RouterServiceLike {
    getDebateProviders(count: number): Array<{
        provider: string;
        key: { id: string; provider: string; key: string; availableModels?: string[] };
    }>;
    getRankedProviders(
        strategy: string,
        prompt: string,
    ): Array<{ id: string; provider: string; key: string; availableModels?: string[] }>;
}

interface DebateEngineDeps {
    eventBus: IEventBus;
    getRouterService: () => RouterServiceLike;
    getKeyService: () => KeyServiceLike;
    getAdapterRegistry: () => IAdapterRegistry;
    getKeyStateStore?: () => {
        get(
            id: string,
        ):
            | { flags: { authFailed: boolean; circuitOpen: boolean; rateLimited: boolean } }
            | undefined;
        update(id: string, patch: { flags: Record<string, boolean> }): void;
    };
    debateStore?: DebateStore;
    getExecutionGovernor?: () => {
        start(spec: { type: string; timeoutMs: number; metadata?: Record<string, unknown> }): {
            complete(): void;
            fail(e: Error): void;
            signal: AbortSignal;
        };
    };
    policyEngine?: DebatePolicyEngine;
    ragRetriever?: DebateRAGRetriever;
    memoryExtractor?: DebateMemoryExtractor;
    evaluator?: IDebateEvaluator;
    providerResolver?: DebateProviderResolver;
}

// P1-2: overall debate duration watchdog — default 30min, configurable via CONFIG
const DEBATE_MAX_DURATION_MS = CONFIG?.services?.debate?.maxDurationMs ?? 1_800_000;

export class DebateEngine implements IDebateEngine, ILifecycle {
    private sessionContexts = new Map<string, DebateSessionContext>();
    private sessions = new Map<string, IDebateSession>();
    private budgets = new Map<string, IDebateBudget>();
    private memories = new Map<string, DebateMemory>();
    private deps: DebateEngineDeps;
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;
    private providerResolver: DebateProviderResolver;
    private topologyService: DebateTopologyService;
    private sessionStartTimes = new Map<string, number>();
    private sessionTimeoutTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private sessionAbortControllers = new Map<string, Map<string, AbortController>>();
    private runningSessions = new Set<string>();
    private preflightDone = new Set<string>();
    private persistence: DebatePersistenceManager;

    constructor(deps: DebateEngineDeps) {
        this.deps = deps;
        this.topologyService = new DebateTopologyService();
        this.providerResolver =
            deps.providerResolver ??
            new DebateProviderResolver({
                get keyService() {
                    return deps.getKeyService();
                },
                get routerService() {
                    return deps.getRouterService();
                },
                get adapterRegistry() {
                    return deps.getAdapterRegistry();
                },
                getKeyStateStore: deps.getKeyStateStore,
            });
        const persistenceState: PersistenceEngineState = {
            sessions: this.sessions,
            budgets: this.budgets,
            memories: this.memories,
            contexts: this.sessionContexts,
            preflightDone: this.preflightDone,
            providerResolver: this.providerResolver,
        };
        const persistenceDeps: PersistenceDeps = {
            debateStore: deps.debateStore,
            eventBus: deps.eventBus,
            memoryExtractor: deps.memoryExtractor,
            evaluator: deps.evaluator,
        };
        this.persistence = new DebatePersistenceManager(persistenceState, persistenceDeps);
    }

    async init(): Promise<void> {}
    private _started = false;
    private _beforeUnloadHandler?: () => void;
    private _visibilityHandler?: () => void; // H-33: stored for cleanup in destroy()
    async start(): Promise<void> {
        if (this._started) return;
        this._started = true;
        this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), 60000);
        // C1: Use visibilitychange (fires 5-10s before beforeunload) to persist
        // snapshots before tab close. Also keep a sync localStorage fallback for
        // beforeunload since async saveSnapshot may not complete in time.
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            this._visibilityHandler = () => {
                if (document.hidden) {
                    for (const sessionId of this.sessions.keys()) {
                        this.saveSnapshot(sessionId).catch((e) =>
                            LOGGER.warn('DebateEngine', 'visibilitychange save failed', {
                                error: e,
                                sessionId,
                            }),
                        );
                    }
                }
            };
            document.addEventListener('visibilitychange', this._visibilityHandler);
            this._beforeUnloadHandler = () => {
                // Async saveSnapshot fires and forgets — may not complete before tab closes
                for (const sessionId of this.sessions.keys()) {
                    this.saveSnapshot(sessionId);
                }
                // audit1#2: Sync localStorage fallback for crash recovery
                try {
                    const snapshot: Record<string, unknown> = {};
                    for (const [sid] of this.sessions) {
                        const snap = this.getSession(sid);
                        if (!snap) continue;
                        snapshot[sid] = {
                            id: snap.id,
                            topic: snap.topic,
                            phase: snap.phase,
                            round: snap.round,
                            startedAt: snap.startedAt,
                            updatedAt: Date.now(),
                        };
                    }
                    if (Object.keys(snapshot).length > 0) {
                        localStorage.setItem('debate-engine:sync-backup', JSON.stringify(snapshot));
                    }
                } catch {
                    // Sync backup is best-effort
                }
            };
            window.addEventListener('beforeunload', this._beforeUnloadHandler);
        }
        // P1-9: Restore orphaned sessions on bootstrap — zombie detection + paused restore
        try {
            await this._restoreOrphanedSessions();
        } catch (e) {
            LOGGER.warn(
                'DebateEngine',
                '_restoreOrphanedSessions failed during start — continuing',
                { error: e },
            );
        }
    }

    private async _restoreOrphanedSessions(): Promise<void> {
        const store = this.deps.debateStore;
        if (!store) return;
        const ZOMBIE_THRESHOLD = 5 * 60 * 1000;
        const records = await store.listSessions();
        for (const record of records) {
            if (record.phase === 'active') {
                if (Date.now() - record.updatedAt > ZOMBIE_THRESHOLD) {
                    record.phase = 'failed';
                    await store.saveSnapshot(record);
                    LOGGER.warn('DebateEngine', 'Orphaned active session auto-failed (zombie)', {
                        sessionId: record.id,
                        age: Date.now() - record.updatedAt,
                    });
                } else {
                    record.phase = 'paused';
                    await store.saveSnapshot(record);
                    LOGGER.info('DebateEngine', 'Active session auto-paused on reload', {
                        sessionId: record.id,
                    });
                }
            }
            if (record.phase === 'paused') {
                await this.restoreSession(record.id);
            }
        }
    }

    private cleanupStaleSessions(): void {
        const staleTimeout = 30 * 60 * 1000;
        const now = Date.now();
        for (const [sessionId, session] of this.sessions) {
            const snap = session.snapshot();
            if (
                snap.phase === 'completed' ||
                snap.phase === 'failed' ||
                snap.phase === 'cancelled' ||
                snap.phase === 'paused'
            ) {
                if (now - snap.updatedAt > staleTimeout) {
                    session.destroy();
                    this.sessions.delete(sessionId);
                    const budget = this.budgets.get(sessionId);
                    if (budget) (budget as DebateBudget).destroy();
                    this.budgets.delete(sessionId);
                    const mem = this.memories.get(sessionId);
                    if (mem) mem.destroy();
                    this.memories.delete(sessionId);
                    const ctx = this.sessionContexts.get(sessionId);
                    if (ctx) ctx.destroy();
                    this.sessionContexts.delete(sessionId);
                    this.providerResolver.clearSession(sessionId);
                }
            }
        }
    }

    createSession(
        topology: DebateTopology,
        topic: string,
        participants: ParticipantConfig[],
        language?: string,
    ): string {
        const id = genId('debate');
        const session = new DebateSessionClass(id, topic, topology, participants, language);
        const budget = new DebateBudget(id, { maxRounds: topology.maxRounds });

        session.onPhaseChange(
            createPhaseChangeHandler(
                id,
                session,
                {
                    eventBus: this.deps.eventBus,
                    debateStore: this.deps.debateStore,
                    memoryExtractor: this.deps.memoryExtractor,
                    evaluator: this.deps.evaluator,
                },
                {
                    getContext: (sid) => this.getContext(sid),
                    getMemory: (sid) => this.getMemory(sid),
                    getTimeline: (sid) => this.getTimeline(sid),
                    saveSnapshot: (sid) => this.saveSnapshot(sid),
                },
            ),
        );

        this.sessions.set(id, session as IDebateSession);
        this.budgets.set(id, budget);

        this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_CREATED, {
            sessionId: id,
            topic,
            topologyType: topology.type,
        });

        return id;
    }

    private getContext(sessionId: string): DebateSessionContext {
        let ctx = this.sessionContexts.get(sessionId);
        if (!ctx) {
            const llmCall = buildConclusionLlmCall({
                getAdapterRegistry: () => this.deps.getAdapterRegistry(),
                getKeyService: () => this.deps.getKeyService(),
                getKeyStateStore: this.deps.getKeyStateStore,
                providerResolver: this.providerResolver,
            });
            ctx = new DebateSessionContext(
                llmCall ?? (async () => ''),
                undefined,
                undefined,
                new DebateOrchestrator(this.topologyService),
            );
            this.sessionContexts.set(sessionId, ctx);
            ctx.timeline.loadPersisted(sessionId).catch((e) =>
                LOGGER.warn('DebateEngine', `Failed to load timeline for ${sessionId}`, {
                    error: e,
                }),
            );
        }
        return ctx;
    }

    private getMemory(sessionId: string): DebateMemory {
        let mem = this.memories.get(sessionId);
        if (!mem) {
            mem = new DebateMemory();
            this.memories.set(sessionId, mem);
        }
        return mem;
    }

    private async runProviderPreflight(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session || this.preflightDone.has(sessionId)) return;
        this.preflightDone.add(sessionId);

        const keyService = this.deps.getKeyService();
        const adapterRegistry = this.deps.getAdapterRegistry();
        const providers = new Set<string>();
        for (const p of session.participants) {
            if (p.provider) providers.add(p.provider);
        }
        // Also gather providers available via routing
        try {
            const routerKeys = this.deps
                .getRouterService()
                .getDebateProviders(session.participants.length);
            for (const rk of routerKeys) providers.add(rk.key.provider);
        } catch {
            /* best-effort */
        }
        if (providers.size === 0) return;

        // Guard: skip preflight if keys aren't loaded yet (race condition on page load)
        const allKeys = keyService.getKeys();
        if (allKeys.length === 0) return;

        const tasks: Promise<void>[] = [];
        for (const provider of providers) {
            if (session.hasProviderFailed(provider)) continue;
            const keys = allKeys.filter((k) => k.provider === provider && k.status === 'active');
            if (keys.length === 0) {
                session.markProviderFailed(provider);
                continue;
            }
            const key = keys[0];
            const adapter = adapterRegistry.getAdapter(provider);
            if (!adapter) {
                session.markProviderFailed(provider);
                continue;
            }
            const model = (DEBATE_MODEL_PRIORITY[provider.toLowerCase()] ?? [])[0] || 'auto';
            tasks.push(
                (async () => {
                    const ctrl = new AbortController();
                    const timer = setTimeout(() => ctrl.abort(), 5000);
                    try {
                        await adapter.sendMessage(
                            [{ role: 'user', content: 'Reply only: OK' }],
                            model,
                            key.key,
                            ctrl.signal,
                        );
                        LOGGER.debug('DebateEngine', `preflight: ${provider} OK (${model})`);
                    } catch (e) {
                        const errMsg = String(e);
                        const sc = (e as { statusCode?: number }).statusCode;
                        const isAuth =
                            sc === 401 ||
                            sc === 402 ||
                            sc === 403 ||
                            errMsg.includes('401') ||
                            errMsg.includes('403') ||
                            errMsg.includes('Authentication failed') ||
                            errMsg.includes('Invalid API Key') ||
                            errMsg.includes('Unauthorized') ||
                            errMsg.includes('Forbidden');
                        if (isAuth) {
                            LOGGER.warn(
                                'DebateEngine',
                                `preflight: ${provider} marked failed (auth error: ${sc || errMsg.slice(0, 60)})`,
                            );
                            session.markProviderFailed(provider);
                            const kss = this.deps.getKeyStateStore?.();
                            if (kss) {
                                try {
                                    kss.update(key.id, { flags: { authFailed: true } });
                                } catch {
                                    /* best-effort */
                                }
                            }
                        }
                    } finally {
                        clearTimeout(timer);
                    }
                })(),
            );
        }
        await Promise.allSettled(tasks);
    }

    async startSession(sessionId: string, isResume = false): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) throw new Error(`Session not found: ${sessionId}`);
        if (session.phase === 'active') return;
        if (this.runningSessions.has(sessionId)) return;
        this.runningSessions.add(sessionId);

        session.transition('queued');
        session.transition('initializing');
        session.transition('active');

        if (!this.sessionStartTimes.has(sessionId)) {
            this.sessionStartTimes.set(sessionId, Date.now());
            this.sessionTimeoutTimers.set(
                sessionId,
                setTimeout(() => {
                    LOGGER.warn(
                        'DebateEngine',
                        `Session ${sessionId} exceeded max duration (${DEBATE_MAX_DURATION_MS}ms) — cancelling`,
                    );
                    this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_FAILED, {
                        sessionId,
                        error: 'Debate exceeded max duration',
                    });
                    this.cancelSession(sessionId);
                    this.sessionTimeoutTimers.delete(sessionId);
                }, DEBATE_MAX_DURATION_MS),
            );
        }

        try {
            await buildPipeline(this.toPipelineEngine(), isResume).run(sessionId);
        } finally {
            this.runningSessions.delete(sessionId);
            const timer = this.sessionTimeoutTimers.get(sessionId);
            if (timer) {
                clearTimeout(timer);
                this.sessionTimeoutTimers.delete(sessionId);
            }
            this.sessionStartTimes.delete(sessionId);
        }
    }

    private toPipelineEngine(): PipelineEngine {
        const eng = this;
        return {
            sessions: eng.sessions,
            budgets: eng.budgets,
            deps: eng.deps as unknown as PipelineEngineDeps,
            getMemory: (id) => eng.getMemory(id),
            getContext: (id) => eng.getContext(id),
            runProviderPreflight: (id) => eng.runProviderPreflight(id),
            callLLM: (id, s, p, sig) => eng.callLLM(id, s, p, sig),
            pauseSession: (id) => eng.pauseSession(id),
            providerResolver: eng.providerResolver,
            sessionAbortControllers: eng.sessionAbortControllers,
        };
    }

    private async callLLM(
        sessionId: string,
        session: IDebateSession,
        participant: ParticipantConfig,
        externalSignal?: AbortSignal,
    ): Promise<string> {
        const deps: LlmCallerDeps = {
            eventBus: this.deps.eventBus,
            getKeyService: () => this.deps.getKeyService(),
            getAdapterRegistry: () => this.deps.getAdapterRegistry(),
            getKeyStateStore: this.deps.getKeyStateStore,
            getExecutionGovernor: this.deps.getExecutionGovernor,
            providerResolver: this.providerResolver,
            getMemory: (id) => this.getMemory(id),
            getDefaultPrompt: (nodeId, s) => this.getDefaultPrompt(nodeId, s),
            sessionAbortControllers: this.sessionAbortControllers,
            ragRetriever: this.deps.ragRetriever,
        };
        return debateCallLlm(sessionId, session, participant, deps, externalSignal);
    }

    private async getDefaultPrompt(nodeId: string, session: IDebateSession): Promise<string> {
        return debateGetDefaultPrompt(nodeId, session);
    }

    pauseSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        if (
            session.phase === 'paused' ||
            session.phase === 'completed' ||
            session.phase === 'cancelled'
        )
            return;
        // HIGH-4.1 fix: abort all in-flight LLM calls for this session on pause.
        // Previously only the orchestrator signal was aborted, leaving agent calls
        // to run until timeout, wasting tokens.
        const agentControllers = this.sessionAbortControllers.get(sessionId);
        if (agentControllers) {
            for (const [, controller] of agentControllers) controller.abort();
        }
        this.getContext(sessionId).orchestrator.abort(sessionId);
        session.transition('paused');
        this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_PAUSED, { sessionId });
        this.saveSnapshot(sessionId).catch((e) =>
            LOGGER.warn('DebateEngine', 'pause checkpoint failed', { error: e }),
        );
    }

    resumeSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        const phase = session.phase;
        if (phase !== 'paused') return;
        this.getContext(sessionId).orchestrator.clearAbort(sessionId);
        // DR-2: Don't set phase here — startSession handles transitions
        this.startSession(sessionId, true)
            .then(() => {
                this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_RESUMED, { sessionId });
            })
            .catch((e) => {
                LOGGER.error('DebateEngine', 'resumeSession failed', { sessionId, error: e });
                this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_FAILED, {
                    sessionId,
                    error: String(e),
                });
            });
    }

    cancelSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        // Abort ALL agents' controllers for this session
        const agentControllers = this.sessionAbortControllers.get(sessionId);
        if (agentControllers) {
            for (const [, controller] of agentControllers) controller.abort();
            agentControllers.clear();
        }
        this.sessionAbortControllers.delete(sessionId);
        // Transition BEFORE destroying context — phase change callbacks
        // access getContext(id).timeline which requires a live context.
        session.transition('cancelled');
        this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_CANCELLED, { sessionId });
        // Destroy budget — releases any queued lock promises
        const budget = this.budgets.get(sessionId);
        if (budget) (budget as DebateBudget).destroy();
        this.budgets.delete(sessionId);
        // Destroy memory
        const mem = this.memories.get(sessionId);
        if (mem) mem.destroy();
        this.memories.delete(sessionId);
        // Abort orchestrator before destroying context
        const ctx = this.sessionContexts.get(sessionId);
        if (ctx) {
            ctx.orchestrator.abort(sessionId);
            ctx.destroy();
        }
        this.sessionContexts.delete(sessionId);
        // Destroy session itself — clears phase listeners
        session.destroy();
        this.sessions.delete(sessionId);
        // Clean per-session tracking
        this.providerResolver.clearSession(sessionId);
        this.preflightDone.delete(sessionId);
        this.runningSessions.delete(sessionId);
        // P1-2: clear the max-duration timeout timer
        const timer = this.sessionTimeoutTimers.get(sessionId);
        if (timer) {
            clearTimeout(timer);
            this.sessionTimeoutTimers.delete(sessionId);
        }
        this.sessionStartTimes.delete(sessionId);
    }

    getSession(sessionId: string): DebateSessionSnapshot | undefined {
        return this.sessions.get(sessionId)?.snapshot();
    }

    getActiveSessions(): DebateSessionSnapshot[] {
        const active: DebateSessionSnapshot[] = [];
        for (const session of this.sessions.values()) {
            const phase = session.phase;
            if (phase !== 'completed' && phase !== 'failed' && phase !== 'cancelled') {
                active.push(session.snapshot());
            }
        }
        return active;
    }

    getAllSessions(): DebateSessionSnapshot[] {
        const all: DebateSessionSnapshot[] = [];
        for (const session of this.sessions.values()) {
            all.push(session.snapshot());
        }
        return all.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    async saveSnapshot(sessionId: string): Promise<void> {
        return this.persistence.saveSnapshot(sessionId);
    }

    async restoreSession(sessionId: string): Promise<DebateSessionSnapshot | null> {
        return this.persistence.restoreSession(sessionId);
    }

    getTimeline(sessionId: string): TimelineEntry[] {
        return this.getContext(sessionId).timeline.getEntries(sessionId);
    }

    exportLegacySession(
        sessionId: string,
        ctx: Omit<SnapshotBridgeContext, 'timeline'>,
    ): DebateSessionInterface | null {
        const snapshot = this.getSession(sessionId);
        if (!snapshot) return null;
        const timeline = this.getTimeline(sessionId);
        return snapshotToSession(snapshot, { ...ctx, timeline });
    }

    destroy(): void {
        // Cancel all active sessions — cascades to budget/memory/context cleanup
        for (const sessionId of this.sessions.keys()) {
            this.cancelSession(sessionId);
        }
        // Safe-clear any remaining maps
        this.sessions.clear();
        this.budgets.clear();
        this.memories.clear();
        this.sessionContexts.clear();
        this.providerResolver.clearAll();
        this.sessionAbortControllers.clear();
        this.runningSessions.clear();
        this.preflightDone.clear();
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        if (typeof window !== 'undefined' && this._beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this._beforeUnloadHandler);
            this._beforeUnloadHandler = undefined;
        }
        // H-33: Remove visibilitychange handler stored in start()
        if (typeof document !== 'undefined' && this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = undefined;
        }
        this._started = false;
    }
}
