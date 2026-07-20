import { genId } from '../../../utils/gen-id';
import { CONFIG } from '../config-registry';
import { DebateProviderResolver, DEBATE_MODEL_PRIORITY, isLargeModel } from './debate-query-engine';
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
import type { IEntanglementEngine, IAnchoringService } from '../../contracts/debate-entanglement';
import type { IArgumentGraphService } from '../../contracts/debate-argument-graph';
import type { IVulnerabilityTargetingService } from '../../contracts/debate-vulnerability';
import type { IShadowOpponentService } from '../../contracts/debate-shadow-opponent';
import type { IAdversarialSourceService } from '../../contracts/debate-adversarial-source';
import type { IBeliefMiningService } from '../../contracts/debate-belief-mining';
import type { IMinimaxPlanner } from '../../contracts/debate-minimax';
import type { IMetaAgentController } from '../../contracts/debate-meta-agent';
import type { ISteelmanService } from '../../contracts/debate-steelman';
import type { IBoPTrackerService } from '../../contracts/debate-bop';
import type { IConsistencyService } from '../../contracts/debate-consistency';
import type { ICredibilityScorer } from '../../contracts/debate-credibility';
import type { ISimilarityMonitor } from '../../contracts/debate-similarity';
import type { IPersonaDriftDetector } from '../../contracts/debate-drift';
import type { IInsightBus } from '../../contracts/debate-insight-bus';
import type { ILogicalFormExtractor } from '../../contracts/debate-logic';
import type { IJustificationEnforcer } from '../../contracts/debate-justification';
import type { IBiasProfiler } from '../../contracts/debate-bias';
import type { IInterruptQueue } from '../../contracts/debate-interrupt';
import type { IStakeholderMapper } from '../../contracts/debate-stakeholder';
import type { ICalibrationService } from '../../contracts/debate-calibration';
import type { IPersonaMixer } from '../../contracts/debate-persona-mixer';
import type { IFrameTracker } from '../../contracts/debate-frame-tracker';
import type { IExpertWitnessService } from '../../contracts/debate-expert-witness';
import type { IBayesianJudge } from '../../contracts/debate-bayesian';
import type { IStanceDriftTracker } from '../../contracts/debate-stance-drift';
import type { IRhetoricalDeviceSelector } from '../../contracts/debate-rhetorical-device';
import type { IScratchpadService } from '../../contracts/debate-scratchpad';
import type { IBlindEvaluationService } from '../../contracts/debate-blind-eval';
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
    entanglementEngine?: IEntanglementEngine;
    anchoringService?: IAnchoringService;
    argumentGraphService?: IArgumentGraphService;
    vulnerabilityTargeting?: IVulnerabilityTargetingService;
    shadowOpponent?: IShadowOpponentService;
    adversarialSource?: IAdversarialSourceService;
    beliefMiningService?: IBeliefMiningService;
    minimaxPlanner?: IMinimaxPlanner;
    metaAgent?: IMetaAgentController;
    steelmanService?: ISteelmanService;
    boPTracker?: IBoPTrackerService;
    consistencyService?: IConsistencyService;
    credibilityScorer?: ICredibilityScorer;
    similarityMonitor?: ISimilarityMonitor;
    driftDetector?: IPersonaDriftDetector;
    insightBus?: IInsightBus;
    logicalFormExtractor?: ILogicalFormExtractor;
    justificationEnforcer?: IJustificationEnforcer;
    biasProfiler?: IBiasProfiler;
    interruptQueue?: IInterruptQueue;
    stakeholderMapper?: IStakeholderMapper;
    calibrationService?: ICalibrationService;
    personaMixer?: IPersonaMixer;
    frameTracker?: IFrameTracker;
    expertWitness?: IExpertWitnessService;
    bayesianJudge?: IBayesianJudge;
    stanceDriftTracker?: IStanceDriftTracker;
    rhetoricalDeviceSelector?: IRhetoricalDeviceSelector;
    scratchpadService?: IScratchpadService;
    blindEval?: IBlindEvaluationService;
    factCheckService?: {
        getForArgument(argumentId: string):
            | {
                  overallScore: number;
                  results: Array<{ verdict: string; claim: string; reasoning: string }>;
              }
            | undefined;
    };
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
    private warmCacheEvictInterval: ReturnType<typeof setInterval> | null = null;
    private providerResolver: DebateProviderResolver;
    private topologyService: DebateTopologyService;
    private sessionStartTimes = new Map<string, number>();
    private sessionTimeoutTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private sessionAbortControllers = new Map<string, Map<string, AbortController>>();
    private sessionPhaseControllers = new Map<string, AbortController>();
    private runningSessions = new Set<string>();
    // Warm provider cache: avoids re-preflighting known-good provider:model pairs
    // across sessions. TTL: 5 minutes.
    private static warmCache = new Map<string, number>();
    private static readonly WARM_CACHE_TTL = 5 * 60 * 1000;

    private preflightDone = new Set<string>();
    /** Tracks cancelled session IDs so getContext() never recreates contexts for them. */
    private _cancelledSessionIds = new Set<string>();
    private persistence: DebatePersistenceManager;

    // Track fire-and-forget async ops so destroy() can await them with timeout
    private _pendingOps = new Map<string, Promise<unknown>>();
    private _nextOpId = 0;
    private _trackOp<T>(name: string, promise: Promise<T>): Promise<T> {
        const id = `${name}-${++this._nextOpId}`;
        this._pendingOps.set(id, promise);
        promise.finally(() => this._pendingOps.delete(id)).catch(() => {});
        return promise;
    }

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

    // Provider-specific preflight timeout multipliers (cold-start compensation)
    private static readonly PROVIDER_PREFLIGHT_TIMEOUT: Record<string, number> = {
        nvidia: 25000,
        'nvidia-nim': 25000,
    };

    private isProviderWarm(provider: string, model: string): boolean {
        const key = `${provider}:${model}`;
        const ts = DebateEngine.warmCache.get(key);
        return ts !== undefined && Date.now() - ts < DebateEngine.WARM_CACHE_TTL;
    }

    private markProviderWarm(provider: string, model: string): void {
        DebateEngine.warmCache.set(`${provider}:${model}`, Date.now());
    }

    private getPreflightTimeout(provider: string, model: string): number {
        const providerOverride = DebateEngine.PROVIDER_PREFLIGHT_TIMEOUT[provider.toLowerCase()];
        if (providerOverride) return providerOverride;
        return isLargeModel(model) ? 30000 : 20000;
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
            const models = DEBATE_MODEL_PRIORITY[provider.toLowerCase()] ?? [];
            if (models.length === 0) continue;

            tasks.push(
                (async () => {
                    for (const model of models) {
                        // Skip preflight for known-warm models
                        if (this.isProviderWarm(provider, model)) {
                            LOGGER.debug(
                                'DebateEngine',
                                `preflight: ${provider}/${model} WARM (skipping)`,
                            );
                            return;
                        }

                        const ctrl = new AbortController();
                        const preflightTimeout = this.getPreflightTimeout(provider, model);
                        const timer = setTimeout(
                            () => ctrl.abort(new Error('PreflightTimedOut')),
                            preflightTimeout,
                        );
                        let timedOut: boolean;
                        try {
                            await adapter.sendMessage(
                                [{ role: 'user', content: 'Reply only: OK' }],
                                model,
                                key.key,
                                ctrl.signal,
                            );
                            this.markProviderWarm(provider, model);
                            LOGGER.debug(
                                'DebateEngine',
                                `preflight: ${provider}/${model} OK (${preflightTimeout}ms budget)`,
                            );
                            return; // First working model is enough for this provider
                        } catch (e) {
                            const errMsg = String(e);
                            timedOut = errMsg.includes('PreflightTimedOut');
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
                                    `preflight: ${provider}/${model} auth error — marking provider failed`,
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
                                return; // Auth errors are provider-wide, don't try other models
                            }
                            if (timedOut) {
                                LOGGER.warn(
                                    'DebateEngine',
                                    `preflight: ${provider}/${model} timed out (${preflightTimeout}ms) — skipping remaining models, same endpoint`,
                                );
                                // Don't try other models — same endpoint, same cold-start delay
                                break;
                            }
                            // Other transient error — try next model
                            LOGGER.warn(
                                'DebateEngine',
                                `preflight: ${provider}/${model} failed (${errMsg.slice(0, 60)}), trying next model`,
                            );
                        } finally {
                            clearTimeout(timer);
                        }
                    }
                    // All models failed for this provider
                    session.markProviderFailed(provider);
                    LOGGER.warn(
                        'DebateEngine',
                        `preflight: ${provider} — all models failed, marking provider unavailable`,
                    );
                })(),
            );
        }
        await Promise.allSettled(tasks);
    }

    async init(): Promise<void> {}
    private _started = false;
    private _beforeUnloadHandler?: () => void;
    private _visibilityHandler?: () => void; // H-33: stored for cleanup in destroy()
    async start(): Promise<void> {
        if (this._started) return;
        this._started = true;
        this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), 60000);
        this.warmCacheEvictInterval = setInterval(
            () => this.evictExpiredWarmCache(),
            DebateEngine.WARM_CACHE_TTL,
        );
        // C1: Use visibilitychange (fires 5-10s before beforeunload) to persist
        // snapshots before tab close. Also keep a sync localStorage fallback for
        // beforeunload since async saveSnapshot may not complete in time.
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            this._visibilityHandler = () => {
                if (document.hidden) {
                    // Serialize saves to avoid Dexie transaction conflicts.
                    // Per-session try-catch so one corrupt session doesn't
                    // prevent others from persisting.
                    this._trackOp(
                        'visibilitySave',
                        (async () => {
                            for (const sessionId of this.sessions.keys()) {
                                if (!this.sessions.has(sessionId)) continue;
                                try {
                                    await this.saveSnapshot(sessionId);
                                } catch (e) {
                                    LOGGER.debug('DebateEngine', 'visibilitychange save skipped', {
                                        error: e,
                                        sessionId,
                                    });
                                }
                            }
                        })(),
                    ).catch((e) =>
                        LOGGER.debug('DebateEngine', 'visibilitychange save loop failed', {
                            error: e,
                        }),
                    );
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
            if (record.phase === 'active' || record.phase === 'deliberating') {
                if (Date.now() - record.updatedAt > ZOMBIE_THRESHOLD) {
                    record.phase = 'failed';
                    await store.saveSnapshot(record);
                    LOGGER.warn(
                        'DebateEngine',
                        `Orphaned ${record.phase} session auto-failed (zombie)`,
                        {
                            sessionId: record.id,
                            age: Date.now() - record.updatedAt,
                        },
                    );
                } else {
                    record.phase = 'paused';
                    await store.saveSnapshot(record);
                    LOGGER.info('DebateEngine', `${record.phase} session auto-paused on reload`, {
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
                    this._cancelledSessionIds.add(sessionId);
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
                    const timer = this.sessionTimeoutTimers.get(sessionId);
                    if (timer) clearTimeout(timer);
                    this.sessionTimeoutTimers.delete(sessionId);
                    this.sessionStartTimes.delete(sessionId);
                    this.runningSessions.delete(sessionId);
                    this.preflightDone.delete(sessionId);
                    this.sessionPhaseControllers.get(sessionId)?.abort();
                    this.sessionPhaseControllers.delete(sessionId);
                    const abortCtls = this.sessionAbortControllers.get(sessionId);
                    if (abortCtls) {
                        for (const [, c] of abortCtls) c.abort(new Error('cleanup'));
                        abortCtls.clear();
                    }
                    this.sessionAbortControllers.delete(sessionId);
                }
            }
        }
    }

    private evictExpiredWarmCache(): void {
        const now = Date.now();
        for (const [key, ts] of DebateEngine.warmCache) {
            if (now - ts >= DebateEngine.WARM_CACHE_TTL) {
                DebateEngine.warmCache.delete(key);
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
        const phaseAbort = new AbortController();
        this.sessionPhaseControllers.set(id, phaseAbort);

        session.onPhaseChange(
            createPhaseChangeHandler(
                id,
                session,
                {
                    eventBus: this.deps.eventBus,
                    debateStore: this.deps.debateStore,
                    memoryExtractor: this.deps.memoryExtractor,
                    evaluator: this.deps.evaluator,
                    bayesianJudge: this.deps.bayesianJudge,
                    stanceDriftTracker: this.deps.stanceDriftTracker,
                    blindEval: this.deps.blindEval,
                },
                {
                    getContext: (sid) => this.getContext(sid),
                    getMemory: (sid) => this.getMemory(sid),
                    getTimeline: (sid) => this.getTimeline(sid),
                    saveSnapshot: (sid) => this.saveSnapshot(sid),
                },
                phaseAbort.signal,
            ),
        );

        this.sessions.set(id, session as IDebateSession);
        this.budgets.set(id, budget);

        this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_CREATED, {
            sessionId: id,
            topic: topic || '(no topic)',
            topologyType: topology?.type || 'roundtable',
        });

        return id;
    }

    private getContext(sessionId: string): DebateSessionContext {
        let ctx = this.sessionContexts.get(sessionId);
        if (!ctx) {
            // DEFENSE: never recreate contexts for cancelled sessions — the
            // async pipeline generator may still yield events after cleanupMaps,
            // and each event handler calls getContext(). Recreating contexts
            // would allocate new DebateSessionContext objects (with timeline,
            // orchestrator, conclusionEngine) that are never cleaned up.
            if (this._cancelledSessionIds.has(sessionId)) {
                return new DebateSessionContext(async () => '', undefined, undefined, undefined);
            }
            const isOrphan = !this.sessions.has(sessionId);
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
            // Don't persist orphan contexts in the map — the async pipeline
            // generator may still yield events after cleanupMaps, and each
            // event handler calls getContext(). Persisting orphans would pin
            // them in memory forever.
            if (!isOrphan) {
                this.sessionContexts.set(sessionId, ctx);
                this._trackOp('loadTimeline', ctx.timeline.loadPersisted(sessionId)).catch((e) =>
                    LOGGER.warn('DebateEngine', `Failed to load timeline for ${sessionId}`, {
                        error: e,
                    }),
                );
            }
        }
        return ctx;
    }

    private getMemory(sessionId: string): DebateMemory {
        let mem = this.memories.get(sessionId);
        if (!mem) {
            // Same defense as getContext: don't persist recreated memory for cleaned-up sessions
            if (!this.sessions.has(sessionId)) return new DebateMemory();
            mem = new DebateMemory();
            this.memories.set(sessionId, mem);
        }
        return mem;
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
            const result = await buildPipeline(this.toPipelineEngine(), isResume).run(sessionId);
            if (!result.ok) {
                const s = this.sessions.get(sessionId);
                if (
                    s &&
                    s.phase !== 'cancelled' &&
                    s.phase !== 'failed' &&
                    s.phase !== 'completed'
                ) {
                    try {
                        s.transition('failed');
                    } catch {
                        /* phase already terminal */
                    }
                    this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_FAILED, {
                        sessionId,
                        error: result.error,
                    });
                }
            }
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
        return {
            sessions: this.sessions,
            budgets: this.budgets,
            deps: this.deps as unknown as PipelineEngineDeps,
            getMemory: (id) => this.getMemory(id),
            getContext: (id) => this.getContext(id),
            runProviderPreflight: (id) => this.runProviderPreflight(id),
            callLLM: (id, s, p, sig) => this.callLLM(id, s, p, sig),
            pauseSession: (id) => this.pauseSession(id),
            providerResolver: this.providerResolver,
            sessionAbortControllers: this.sessionAbortControllers,
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
            isSessionCancelled: (id) => this._cancelledSessionIds.has(id),
            entanglementEngine: this.deps.entanglementEngine,
            anchoringService: this.deps.anchoringService,
            argumentGraphService: this.deps.argumentGraphService,
            vulnerabilityTargeting: this.deps.vulnerabilityTargeting,
            shadowOpponent: this.deps.shadowOpponent,
            adversarialSource: this.deps.adversarialSource,
            beliefMiningService: this.deps.beliefMiningService,
            minimaxPlanner: this.deps.minimaxPlanner,
            metaAgent: this.deps.metaAgent,
            steelmanService: this.deps.steelmanService,
            boPTracker: this.deps.boPTracker,
            consistencyService: this.deps.consistencyService,
            credibilityScorer: this.deps.credibilityScorer,
            similarityMonitor: this.deps.similarityMonitor,
            driftDetector: this.deps.driftDetector,
            insightBus: this.deps.insightBus,
            logicalFormExtractor: this.deps.logicalFormExtractor,
            justificationEnforcer: this.deps.justificationEnforcer,
            biasProfiler: this.deps.biasProfiler,
            interruptQueue: this.deps.interruptQueue,
            stakeholderMapper: this.deps.stakeholderMapper,
            calibrationService: this.deps.calibrationService,
            personaMixer: this.deps.personaMixer,
            frameTracker: this.deps.frameTracker,
            expertWitness: this.deps.expertWitness,
            stanceDriftTracker: this.deps.stanceDriftTracker,
            rhetoricalDeviceSelector: this.deps.rhetoricalDeviceSelector,
            scratchpadService: this.deps.scratchpadService,
            factCheckService: this.deps.factCheckService,
        };

        // P2.4: Best-of-N — generate N responses and pick the best.
        // Configurable via session metadata. Default: 1 (disabled).
        const bestOfN = (session as { metadata?: Record<string, unknown> }).metadata?.bestOfN as
            number | undefined;
        if (bestOfN && bestOfN > 1 && session.round >= 2) {
            const candidates: Array<{ content: string; score: number }> = [];
            for (let i = 0; i < Math.min(bestOfN, 3); i++) {
                try {
                    const content = await debateCallLlm(
                        sessionId,
                        session,
                        participant,
                        deps,
                        externalSignal,
                    );
                    if (content && content !== 'cancelled' && content.length > 20) {
                        // Score: prefer longer responses with more substance
                        const score =
                            content.length +
                            (content.split(' ').length > 15 ? 50 : 0) +
                            (content.includes('because') ||
                            content.includes('therefore') ||
                            content.includes('however')
                                ? 30
                                : 0);
                        candidates.push({ content, score });
                    }
                } catch {
                    // Individual generation failure — skip this candidate
                }
            }
            if (candidates.length > 0) {
                candidates.sort((a, b) => b.score - a.score);
                return candidates[0].content;
            }
            // Fallthrough: if Best-of-N produced no valid candidates, return the
            // single-call result below
        }

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
            for (const [, controller] of agentControllers)
                controller.abort(new Error('SessionPaused'));
        }
        this.getContext(sessionId).orchestrator.abort(sessionId);
        // H-6: graceful if transition invalid (e.g. consensus → paused)
        try {
            session.transition('paused');
        } catch {
            LOGGER.warn('DebateEngine', 'pauseSession: invalid transition', {
                sessionId,
                phase: session.phase,
            });
            return;
        }
        this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_PAUSED, { sessionId });
        this._trackOp('pauseCheckpoint', this.saveSnapshot(sessionId)).catch((e) =>
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
        this._trackOp('resumeSession', this.startSession(sessionId, true))
            .then(() => {
                this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_RESUMED, { sessionId });
            })
            .catch((e) => {
                LOGGER.error('DebateEngine', 'resumeSession failed', {
                    sessionId,
                    error: e,
                });
                const s = this.sessions.get(sessionId);
                if (
                    s &&
                    s.phase !== 'completed' &&
                    s.phase !== 'cancelled' &&
                    s.phase !== 'failed'
                ) {
                    try {
                        s.transition('failed');
                    } catch {
                        /* phase already terminal */
                    }
                }
                this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_FAILED, {
                    sessionId,
                    error: String(e),
                });
            });
    }

    cancelSession(sessionId: string): void {
        console.log('[cancelSession] ENTER', {
            sessionId,
            hasSession: this.sessions.has(sessionId),
            activeSessions: this.sessions.size,
        });
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn('[cancelSession] session not found', {
                sessionId,
                sessionsKeys: [...this.sessions.keys()],
            });
            return;
        }
        console.log(
            '[cancelSession] phase=%s, runningSessions=%d',
            session.phase,
            this.runningSessions.size,
        );

        // Shared cleanup for terminal phases — destroys all engine-internal
        // maps/controllers to prevent memory leaks. Does NOT emit events
        // (the event was already emitted when phase first transitioned).
        const cleanupMaps = () => {
            this._cancelledSessionIds.add(sessionId);
            const budget = this.budgets.get(sessionId);
            if (budget) (budget as DebateBudget).destroy();
            this.budgets.delete(sessionId);
            const mem = this.memories.get(sessionId);
            if (mem) mem.destroy();
            this.memories.delete(sessionId);
            const ctx = this.sessionContexts.get(sessionId);
            if (ctx) ctx.destroy();
            this.sessionContexts.delete(sessionId);
            session.destroy();
            this.sessions.delete(sessionId);
            this.providerResolver.clearSession(sessionId);
            this.preflightDone.delete(sessionId);
            this.runningSessions.delete(sessionId);
            const timer = this.sessionTimeoutTimers.get(sessionId);
            if (timer) {
                clearTimeout(timer);
                this.sessionTimeoutTimers.delete(sessionId);
            }
            this.sessionStartTimes.delete(sessionId);
            this.sessionPhaseControllers.get(sessionId)?.abort();
            this.sessionPhaseControllers.delete(sessionId);
            const abortCtls = this.sessionAbortControllers.get(sessionId);
            if (abortCtls) {
                for (const [, c] of abortCtls) c.abort(new Error('SessionCancelled'));
                abortCtls.clear();
            }
            this.sessionAbortControllers.delete(sessionId);
            // The orphan cleanup loop has been removed because getContext() now
            // checks _cancelledSessionIds and returns a throwaway context instead
            // of recreating one in the sessionContexts map. Async pipeline events
            // that fire after cleanupMaps will get a minimal context that doesn't
            // persist and has no side effects.
            // RE-CHECK: async pipeline events may recreate sessionAbortControllers
            // after the initial delete above. Schedule a deferred cleanup to catch
            // any leaked entries. This is a defense-in-depth measure — the primary
            // defense is the isSessionCancelled check in debateCallLlm() that
            // prevents NEW calls from creating entries after cancellation.
            queueMicrotask(() => {
                const recreated = this.sessionAbortControllers.get(sessionId);
                if (recreated && recreated.size > 0) {
                    LOGGER.warn(
                        'DebateEngine',
                        'cleanupMaps re-check caught leaked abort controllers',
                        {
                            sessionId,
                            count: recreated.size,
                        },
                    );
                    recreated.clear();
                    this.sessionAbortControllers.delete(sessionId);
                }
            });
        };

        if (session.phase === 'cancelled') {
            console.log('[cancelSession] already cancelled — cleaning up maps', { sessionId });
            cleanupMaps();
            console.log('[cancelSession] cleanup done (cancelled path)', {
                sessionId,
                sessionsLeft: this.sessions.size,
            });
            return;
        }
        if (session.phase === 'completed' || session.phase === 'failed') {
            console.log('[cancelSession] terminal phase %s — cleaning up maps', session.phase, {
                sessionId,
            });
            cleanupMaps();
            console.log('[cancelSession] cleanup done (terminal path)', {
                sessionId,
                sessionsLeft: this.sessions.size,
            });
            return;
        }
        // Active phase — abort agents, transition, emit, then clean up maps
        console.log('[cancelSession] active phase %s — aborting agents', session.phase, {
            sessionId,
        });
        const agentControllers = this.sessionAbortControllers.get(sessionId);
        if (agentControllers) {
            for (const [, controller] of agentControllers)
                controller.abort(new Error('SessionCancelled'));
            agentControllers.clear();
        }
        this.sessionAbortControllers.delete(sessionId);
        // Save orchestrator reference BEFORE cleanupMaps() — ctx.destroy() calls
        // orchestrator.destroy() which removes the session from the `aborted` Set.
        // Without this, the async generator continues yielding events after cancel.
        const orchestrator = this.getContext(sessionId)?.orchestrator;
        orchestrator?.abort(sessionId);
        session.transition('cancelled');
        console.log('[cancelSession] transition done, phase=%s', session.phase, { sessionId });
        this.sessionPhaseControllers.get(sessionId)?.abort();
        this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_CANCELLED, { sessionId });
        cleanupMaps();
        // Re-establish abort signal since ctx.destroy() removed it.
        // The async generator may still be running (await in executor), and needs
        // the signal to stop at the next `if (this.aborted.has(sessionId)) return;` check.
        orchestrator?.abort(sessionId);
        console.log('[cancelSession] cleanup done (active path)', {
            sessionId,
            sessionsLeft: this.sessions.size,
        });
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

    dumpSizes(): import('../../utils/memory-tracker').EngineSizes {
        let abortControllersAgents = 0;
        for (const ctrl of this.sessionAbortControllers.values())
            abortControllersAgents += ctrl.size;
        return {
            sessionContexts: this.sessionContexts.size,
            sessions: this.sessions.size,
            budgets: this.budgets.size,
            memories: this.memories.size,
            sessionStartTimes: this.sessionStartTimes.size,
            sessionTimeoutTimers: this.sessionTimeoutTimers.size,
            sessionAbortControllers: this.sessionAbortControllers.size,
            sessionAbortControllersAgents: abortControllersAgents,
            sessionPhaseControllers: this.sessionPhaseControllers.size,
            runningSessions: this.runningSessions.size,
            preflightDone: this.preflightDone.size,
            warmCache: DebateEngine.warmCache.size,
        };
    }

    async destroy(): Promise<void> {
        // Cancel all active sessions — cascades to budget/memory/context cleanup
        for (const sessionId of this.sessions.keys()) {
            this.cancelSession(sessionId);
        }
        // Await pending fire-and-forget ops with 5s timeout
        if (this._pendingOps.size > 0) {
            const pending = [...this._pendingOps.values()];
            await Promise.race([
                Promise.allSettled(pending),
                new Promise<void>((resolve) =>
                    setTimeout(() => {
                        LOGGER.warn(
                            'DebateEngine',
                            `destroy timed out waiting for ${this._pendingOps.size} pending ops`,
                        );
                        resolve();
                    }, 5000),
                ),
            ]);
        }
        // Safe-clear any remaining maps
        this.sessions.clear();
        this.budgets.clear();
        this.memories.clear();
        this.sessionContexts.clear();
        this._cancelledSessionIds.clear();
        this.providerResolver.clearAll();
        this.sessionAbortControllers.clear();
        for (const [, ctrl] of this.sessionPhaseControllers) ctrl.abort();
        this.sessionPhaseControllers.clear();
        this.runningSessions.clear();
        this.preflightDone.clear();
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        if (this.warmCacheEvictInterval) {
            clearInterval(this.warmCacheEvictInterval);
            this.warmCacheEvictInterval = null;
        }
        DebateEngine.warmCache.clear();
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

    /** Clear the warm cache — called by MemoryWatchdog on heap pressure. */
    clearWarmCache(): void {
        DebateEngine.warmCache.clear();
    }
}
