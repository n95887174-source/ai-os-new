import { genId } from '../../../utils/gen-id';
import { CONFIG, DEFAULT_DEBATE_LANGUAGE } from '../config-registry';
import { DebateProviderResolver, DEBATE_MODEL_PRIORITY } from './debate-query-engine';
import { gatherClaims } from './debate-consensus';
import { createAgentExecutor } from './debate-agent-executor';
import { buildConclusionLlmCall, validateAndSaveVerdict } from './debate-conclusion-engine';
import { DebatePipeline } from './debate-pipeline';
import { DebateTopologyService } from './debate-topology';
import { DebateOrchestrator } from './debate-orchestrator';
import {
    debateCallLlm,
    debateGetDefaultPrompt,
    estimateConfidence,
    type LlmCallerDeps,
} from './debate-llm-caller';
import type {
    DebateTopology,
    DebatePhase,
    ParticipantConfig,
    DebateSessionSnapshot,
    IDebateEngine,
    IDebateSession,
    IDebateBudget,
    TimelineEntry,
    AgentStateEntry,
} from '../../contracts/debate-runtime';
import type {
    DebateArgument,
    DebateConfig,
    DebateSession as DebateSessionInterface,
} from '../../contracts/debate-types';
import type { IEventBus } from '../../types/interfaces';
import type { ILifecycle } from '../../contracts/lifecycle';
import type { IAdapterRegistry } from '../../contracts/provider-adapter';
import { rootLogger } from '../logger-service';
import { EVENTS } from '../../events/event-names';
import { safeJsonParse } from '../../../kernel/utils/safe-json';
import type { DebatePolicyEngine } from './debate-policy-engine';
import { executePolicyActions } from './debate-policy-engine';
import type { DebateRAGRetriever } from './debate-rag-retriever';
import type { DebateMemoryExtractor } from './debate-memory-extractor';
import type { IDebateEvaluator } from '../../contracts/debate-runtime';

import { DebateSessionContext } from './debate-session-context';
import { DebateMemory } from './debate-memory';
import { DebateBudget } from './debate-budget';
import { DebateSession as DebateSessionClass } from './debate-session';
import { DebateSessionRecordSchema } from '../../types/schema-types';
import type { DebateStore } from '../../contracts/storage/debate-store';
const LOGGER = rootLogger.child('DebateEngine');

interface SnapshotBridgeContext {
    participants: ParticipantConfig[];
    strategy: import('../../contracts/debate-types').DebateSessionStrategy;
    maxRounds: number;
    config: DebateConfig;
    timeline?: TimelineEntry[];
}

function timelineToArguments(
    timeline: TimelineEntry[],
    participants: ParticipantConfig[],
    defaultConfidence = 0.7,
): DebateArgument[] {
    const nameById = new Map(participants.map((p) => [p.agentId, p.role || p.nodeId]));
    return timeline
        .filter((e) => e.type === 'agent:responded')
        .map((e, idx) => {
            const payload = e.payload as { agentId?: string; content?: string; round?: number };
            const agentId = payload.agentId ?? 'unknown';
            return {
                id: e.id || `arg-${idx}`,
                agentId,
                agentName: nameById.get(agentId) || agentId,
                content: payload.content ?? '',
                confidence: defaultConfidence,
                timestamp: e.timestamp,
                round: payload.round ?? 1,
                position: 'neutral' as const,
                source: 'llm' as const,
            };
        });
}

function snapshotToSession(
    snapshot: DebateSessionSnapshot,
    ctx: SnapshotBridgeContext,
): DebateSessionInterface {
    const participants = Array.isArray(ctx.participants) ? ctx.participants : [];
    const args = ctx.timeline ? timelineToArguments(ctx.timeline, participants) : [];
    const round = Math.max(1, snapshot.round);
    const socraticQuestioner =
        ctx.strategy === 'socratic' && participants.length > 1
            ? (round - 1) % participants.length
            : 0;
    return {
        id: snapshot.id,
        topic: snapshot.topic,
        status: snapshot.phase,
        strategy: ctx.strategy,
        maxRounds: ctx.maxRounds,
        currentRound: round,
        participants: participants.map(
            (p) =>
                ({
                    id: p.agentId,
                    name: p.agentId,
                    role: p.role || 'proponent',
                    provider: p.provider,
                    modelId: p.modelId,
                    systemPrompt: p.systemPrompt,
                }) as import('../../contracts/debate-types').DebateParticipant,
        ),
        arguments: args,
        convergenceScore: 0,
        openingStatements: args.filter((a) => a.round === 0),
        config: ctx.config,
        socraticQuestioner,
        argumentTreeRoundMap: {},
        createdAt: snapshot.startedAt,
    } as DebateSessionInterface;
}

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
const ROUND_DELAY_MS = CONFIG?.services?.debate?.roundDelayMs ?? 1000;

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
                    for (const [sid, session] of this.sessions) {
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

        session.onPhaseChange((from: string, to: string) => {
            this.getContext(id).timeline.record({
                sessionId: id,
                type: `session:${to}`,
                payload: { from, to },
            });
            this.deps.eventBus.emit(EVENTS.DEBATE_PHASE_CHANGED, {
                sessionId: id,
                from,
                to,
            });

            if (to === 'completed' || to === 'failed' || to === 'cancelled') {
                this.deps.eventBus.emit(
                    to === 'completed'
                        ? EVENTS.DEBATE_SESSION_COMPLETED
                        : to === 'failed'
                          ? EVENTS.DEBATE_SESSION_FAILED
                          : EVENTS.DEBATE_SESSION_CANCELLED,
                    {
                        sessionId: id,
                        error:
                            to === 'failed'
                                ? session.snapshot().agentStates.find((s) => s.error)?.error
                                : undefined,
                    },
                );
                if (to === 'completed') {
                    const snap = session.snapshot() as DebateSessionSnapshot;
                    const tl = this.getTimeline(id);
                    this.getContext(id)
                        .conclusionEngine.generateVerdictWithLLM(snap, tl)
                        .then((verdict) => {
                            const store = this.deps.debateStore;
                            if (store) {
                                validateAndSaveVerdict(store, {
                                    sessionId: verdict.sessionId,
                                    topic: verdict.topic,
                                    summary: verdict.summary,
                                    conclusionType: verdict.conclusionType,
                                    stanceResult: verdict.stanceResult,
                                    keyArguments: JSON.stringify(verdict.keyArguments),
                                    reasoning: verdict.reasoning,
                                    confidence: verdict.confidence,
                                    generatedAt: verdict.generatedAt,
                                    roundsTotal: verdict.roundsTotal,
                                    totalTokens: verdict.totalTokens,
                                }).catch((e) =>
                                    LOGGER.warn('DebateEngine', 'verdict persist failed', {
                                        error: e,
                                    }),
                                );
                            }
                            this.deps.eventBus.emit(EVENTS.DEBATE_VERDICT_GENERATED, {
                                sessionId: id,
                                verdict,
                            });
                        })
                        .catch((e) =>
                            LOGGER.warn(
                                'DebateEngine',
                                'LLM-enhanced verdict failed, using heuristic',
                                { error: e },
                            ),
                        );

                    // Memory extraction at session completion
                    if (this.deps.memoryExtractor) {
                        try {
                            const extracted = this.deps.memoryExtractor.extractFromTimeline(id, tl);
                            LOGGER.info('DebateEngine', 'Memory extraction complete', {
                                sessionId: id,
                                units: extracted.units.length,
                                ...extracted.summary,
                            });

                            // Feed extracted claims to evaluator
                            if (this.deps.evaluator) {
                                const claims = this.deps.memoryExtractor.extractClaims(
                                    extracted.units,
                                );
                                for (const p of session.participants) {
                                    const chain = this.getMemory(id).getChain(p.agentId);
                                    const score = this.deps.evaluator.scoreArguments(
                                        p.agentId,
                                        claims,
                                        chain,
                                    );
                                    this.deps.eventBus.emit(EVENTS.DEBATE_AGENT_PHASE_CHANGED, {
                                        sessionId: id,
                                        agentId: p.agentId,
                                        from: 'completed',
                                        to: JSON.stringify(score),
                                    });
                                }
                            }
                        } catch (e) {
                            LOGGER.warn('DebateEngine', 'Memory extraction failed', {
                                error: e,
                                sessionId: id,
                            });
                        }
                    }
                }
                this.saveSnapshot(id).catch((e) =>
                    LOGGER.warn('DebateEngine', 'auto-checkpoint failed', { error: e }),
                );
            }
        });

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
            await this.buildDebatePipeline(isResume).run(sessionId);
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

    private buildDebatePipeline(isResume: boolean): DebatePipeline {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const engine = this;
        const pipeline = new DebatePipeline();

        pipeline.addStage({
            name: 'preflight',
            run: async (sessionId) => {
                if (isResume) return { ok: true };
                const session = engine.sessions.get(sessionId)!;
                engine.deps.eventBus.emit(EVENTS.DEBATE_SESSION_STARTED, { sessionId });
                await engine.runProviderPreflight(sessionId);

                const keyService = engine.deps.getKeyService();
                const allKeys = keyService.getKeys();
                const hasWorkingProvider = allKeys.some(
                    (k) =>
                        k.status === 'active' &&
                        !session.hasProviderFailed(k.provider) &&
                        !engine.providerResolver.isKeyAuthFailed(k.id),
                );
                if (!hasWorkingProvider) {
                    const msg = 'All LLM providers failed preflight — no working keys available';
                    LOGGER.warn('DebatePipeline', msg, { sessionId });
                    session.transition('failed');
                    engine.deps.eventBus.emit(EVENTS.DEBATE_SESSION_FAILED, {
                        sessionId,
                        error: msg,
                    });
                    return { ok: false, error: msg };
                }
                return { ok: true };
            },
        });

        pipeline.addStage({
            name: 'setupExecutor',
            run: async (sessionId) => {
                const session = engine.sessions.get(sessionId)!;
                engine.getContext(sessionId).orchestrator.setAgentExecutor(
                    createAgentExecutor(sessionId, {
                        getSession: (id) => engine.sessions.get(id),
                        getBudget: (id) => engine.budgets.get(id),
                        eventBus: engine.deps.eventBus,
                        getKeyService: () => engine.deps.getKeyService(),
                        callLLM: (id, s, p, signal) => engine.callLLM(id, s, p, signal),
                        providerResolver: engine.providerResolver,
                        findParticipant: (_id, nodeId) =>
                            session.participants.find((p) => p.nodeId === nodeId),
                    }),
                );
                return { ok: true };
            },
        });

        pipeline.addStage({
            name: 'roundLoop',
            run: async (sessionId) => {
                const session = engine.sessions.get(sessionId)!;
                let earlyExit = false;

                try {
                    for await (const event of engine
                        .getContext(sessionId)
                        .orchestrator.generateRoundEvents(
                            session.topology,
                            sessionId,
                            session.round,
                        )) {
                        engine
                            .getContext(sessionId)
                            .timeline.record({ sessionId, type: event.type, payload: event });

                        switch (event.type) {
                            case 'round:start': {
                                session.transition('deliberating');
                                session.incrementRound();
                                engine.budgets.get(sessionId)?.incrementRound(sessionId);
                                engine.deps.eventBus.emit(EVENTS.DEBATE_ROUND_STARTED, {
                                    sessionId,
                                    round: event.round,
                                    nodes: event.nodes,
                                });
                                break;
                            }
                            case 'agent:thinking': {
                                const p = session.participants.find(
                                    (p) => p.nodeId === event.agentId,
                                );
                                if (p) {
                                    session.setAgentPhase(p.agentId, 'thinking');
                                    engine.deps.eventBus.emit(EVENTS.DEBATE_AGENT_THINKING, {
                                        sessionId,
                                        agentId: p.agentId,
                                    });
                                }
                                break;
                            }
                            case 'agent:responded': {
                                const pR = session.participants.find(
                                    (p) => p.nodeId === event.agentId,
                                );
                                if (!pR) break;
                                session.setAgentPhase(pR.agentId, 'streaming');
                                const stepConfidence = estimateConfidence(event.content);
                                engine.getMemory(sessionId).recordStep({
                                    agentId: pR.agentId,
                                    content: event.content,
                                    type: 'claim',
                                    confidence: stepConfidence,
                                    timestamp: Date.now(),
                                    round: session.round,
                                });
                                engine.getContext(sessionId).timeline.record({
                                    sessionId,
                                    type: 'agent:responded',
                                    payload: {
                                        agentId: pR.agentId,
                                        content: event.content,
                                        round: session.round,
                                    },
                                });
                                engine.deps.eventBus.emit(EVENTS.DEBATE_AGENT_RESPONDED, {
                                    sessionId,
                                    agentId: pR.agentId,
                                    content: event.content,
                                });
                                break;
                            }
                            case 'agent:error': {
                                const pE = session.participants.find(
                                    (p) => p.nodeId === event.agentId,
                                );
                                if (!pE) break;
                                session.setAgentPhase(pE.agentId, 'errored');
                                session.setAgentError(pE.agentId, event.error);
                                engine.getContext(sessionId).timeline.record({
                                    sessionId,
                                    type: 'agent:error',
                                    payload: { agentId: pE.agentId, error: event.error },
                                });
                                engine.deps.eventBus.emit(EVENTS.DEBATE_AGENT_ERROR, {
                                    sessionId,
                                    agentId: pE.agentId,
                                    error: event.error,
                                });
                                break;
                            }
                            case 'round:end': {
                                engine.deps.eventBus.emit(EVENTS.DEBATE_ROUND_ENDED, {
                                    sessionId,
                                    round: event.round,
                                });

                                if (event.allErrored) {
                                    const msg = event.anyBudgetSkipped
                                        ? 'Budget exceeded — debate paused'
                                        : 'All providers unavailable — debate cannot proceed';
                                    LOGGER.warn('DebatePipeline', msg, { sessionId });
                                    session.transition(
                                        event.anyBudgetSkipped ? 'paused' : 'failed',
                                    );
                                    engine.deps.eventBus.emit(EVENTS.DEBATE_SESSION_FAILED, {
                                        sessionId,
                                        error: msg,
                                    });
                                    earlyExit = true;
                                    break;
                                }

                                const interimClaims = gatherClaims(
                                    sessionId,
                                    session.participants,
                                    (sid) => engine.getMemory(sid),
                                    session.round,
                                );
                                let interimConfidence = 0.5;
                                if (interimClaims.length > 1) {
                                    const interim = engine
                                        .getContext(sessionId)
                                        .consensus.evaluate(interimClaims);
                                    interimConfidence = interim.confidence;
                                    if (interim.confidence >= 0.85) {
                                        engine.deps.eventBus.emit(EVENTS.DEBATE_ROUND_EARLY_EXIT, {
                                            sessionId,
                                            confidence: interim.confidence,
                                            round: event.round,
                                        });
                                        earlyExit = true;
                                    }
                                }

                                // Rate-limit backoff between rounds
                                if (!earlyExit && ROUND_DELAY_MS > 0) {
                                    const acMap = engine.sessionAbortControllers.get(sessionId);
                                    const anySignal = acMap?.values().next().value?.signal;
                                    await new Promise<void>((resolve, reject) => {
                                        const timer = setTimeout(resolve, ROUND_DELAY_MS);
                                        const onAbort2 = () => {
                                            clearTimeout(timer);
                                            reject(
                                                new Error('Debate cancelled during round delay'),
                                            );
                                        };
                                        if (anySignal)
                                            anySignal.addEventListener('abort', onAbort2, {
                                                once: true,
                                            });
                                    }).catch(() => {
                                        earlyExit = true;
                                        return;
                                    });
                                }

                                if (engine.deps.policyEngine && !earlyExit) {
                                    const budgetSnap = engine.budgets.get(sessionId)?.snapshot();
                                    const agentErrorRates = new Map<string, number>();
                                    for (const p of session.participants) {
                                        const state = session.agentStates.get(p.agentId);
                                        if (state?.error)
                                            agentErrorRates.set(
                                                p.agentId,
                                                (agentErrorRates.get(p.agentId) || 0) + 1,
                                            );
                                    }
                                    const ctx = engine.deps.policyEngine.buildContext(
                                        session.phase,
                                        event.round,
                                        session.snapshot().totalTokens,
                                        session.snapshot().totalCost,
                                        interimConfidence,
                                        budgetSnap?.pressure ?? 'low',
                                        agentErrorRates,
                                        [],
                                    );
                                    const policyActions = engine.deps.policyEngine.evaluate(ctx);
                                    executePolicyActions(policyActions, sessionId, {
                                        pauseSession: (id) => engine.pauseSession(id),
                                        emitEvent: (name, payload) =>
                                            engine.deps.eventBus.emit(name, payload),
                                        skipAgent: (agentId) => {
                                            const state = session.agentStates.get(agentId);
                                            if (state) {
                                                session.setAgentPhase(agentId, 'errored');
                                                session.setAgentError(agentId, 'Skipped by policy');
                                            }
                                        },
                                        log: (level, message) =>
                                            LOGGER[level]('PolicyEngine', message, { sessionId }),
                                    });
                                }
                                break;
                            }
                        }
                        if (earlyExit) break;
                    }
                } catch (e) {
                    session.transition('failed');
                    engine.deps.eventBus.emit(EVENTS.DEBATE_SESSION_FAILED, {
                        sessionId,
                        error: String(e),
                    });
                    return { ok: false, error: String(e) };
                }

                if (
                    session.phase === 'completed' ||
                    session.phase === 'failed' ||
                    session.phase === 'cancelled' ||
                    session.phase === 'paused'
                ) {
                    if (session.phase !== 'paused')
                        engine.getContext(sessionId).orchestrator.clearAbort(sessionId);
                    return { ok: true, earlyExit: true };
                }

                return { ok: true };
            },
        });

        pipeline.addStage({
            name: 'consensusAndFinalize',
            run: async (sessionId) => {
                const session = engine.sessions.get(sessionId)!;
                session.transition('consensus');
                const claims = gatherClaims(
                    sessionId,
                    session.participants,
                    (sid) => engine.getMemory(sid),
                    session.round,
                );
                const result = engine.getContext(sessionId).consensus.evaluate(claims);
                engine.deps.eventBus.emit(EVENTS.DEBATE_CONSENSUS_REACHED, {
                    sessionId,
                    confidence: result.confidence,
                    agreements: result.agreements.length,
                    conflicts: result.conflicts.length,
                });
                session.transition('summarizing');
                session.transition('completed');
                return { ok: true };
            },
        });

        return pipeline;
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
        const store = this.deps.debateStore;
        if (!store) return;
        const snap = this.getSession(sessionId);
        if (!snap) return;
        const session = this.sessions.get(sessionId);
        if (!session) return;
        const record = {
            id: snap.id,
            topic: snap.topic,
            topologyType: snap.topology.type,
            phase: snap.phase,
            round: snap.round,
            totalTokens: snap.totalTokens,
            totalCost: snap.totalCost,
            agentStates: JSON.stringify(snap.agentStates),
            topology: JSON.stringify(snap.topology),
            participants: JSON.stringify(session.participants),
            startedAt: snap.startedAt,
            updatedAt: snap.updatedAt,
            createdAt: snap.startedAt,
            arguments: snap.arguments ? JSON.stringify(snap.arguments) : '[]',
            memory: JSON.stringify(this.getMemory(sessionId).toJSON()),
            language: snap.language,
            version: snap.version,
        } as const;
        const parsed = DebateSessionRecordSchema.safeParse(record);
        if (!parsed.success) {
            LOGGER.warn('DebateEngine', `saveSnapshot validation failed for ${sessionId}`, {
                errors: parsed.error.issues,
            });
            throw new Error(
                `saveSnapshot validation failed for ${sessionId}: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
            );
        }
        const newVersion = await store.saveSnapshot(record);
        session.incrementVersion?.(newVersion);
        const ctx = this.sessionContexts.get(sessionId);
        if (ctx) {
            ctx.timeline.persist(sessionId).catch((e) =>
                LOGGER.warn('DebateEngine', `Failed to persist timeline for ${sessionId}`, {
                    error: e,
                }),
            );
        }
    }

    async restoreSession(sessionId: string): Promise<DebateSessionSnapshot | null> {
        const store = this.deps.debateStore;
        if (!store) return null;
        const record = await store.getSnapshot(sessionId);
        if (!record) return null;
        const rp = DebateSessionRecordSchema.safeParse(record);
        if (!rp.success) {
            LOGGER.warn('DebateEngine', `restoreSession: corrupted record ${sessionId}`, {
                errors: rp.error.issues,
            });
            return null;
        }
        const existing = this.sessions.get(sessionId);
        if (existing) return existing.snapshot();

        // D9-04: Reconstruct and register a DebateSession so the
        // restored session is visible to all engine operations (startSession,
        // pauseSession, cancelSession, etc.)
        try {
            const topology: DebateTopology =
                safeJsonParse(record.topology) ?? ({} as DebateTopology);
            const agentStates: AgentStateEntry[] = safeJsonParse(record.agentStates) ?? [];
            const participants: ParticipantConfig[] =
                safeJsonParse(record.participants || '[]') ?? [];

            const session = new DebateSessionClass(record.id, record.topic, topology, participants);

            // Restore internal state from snapshot
            const restoredSnapshot: DebateSessionSnapshot = {
                id: record.id,
                topic: record.topic,
                topology,
                phase: record.phase as DebatePhase,
                round: record.round,
                agentStates,
                totalTokens: record.totalTokens,
                totalCost: record.totalCost,
                startedAt: record.startedAt,
                updatedAt: record.updatedAt,
                version: record.version ?? 1,
                language: (record as { language?: string }).language ?? DEFAULT_DEBATE_LANGUAGE,
            };
            session.restoreInternalState(restoredSnapshot);

            // S4-11: Restore reasoning chains / memory
            try {
                const mem = this.getMemory(record.id);
                const memData = safeJsonParse(record.memory || '{}');
                mem.restoreFrom(memData as import('../../contracts/debate-runtime').MemoryRecord);
            } catch {
                /* memory is optional — fresh start if parse fails */
            }

            // Register phase listeners (same as createSession)
            session.onPhaseChange((from: string, to: string) => {
                this.getContext(record.id).timeline.record({
                    sessionId: record.id,
                    type: `session:${to}`,
                    payload: { from, to },
                });
                this.deps.eventBus.emit(EVENTS.DEBATE_PHASE_CHANGED, {
                    sessionId: record.id,
                    from,
                    to,
                });
                if (to === 'completed' || to === 'failed' || to === 'cancelled') {
                    this.deps.eventBus.emit(
                        to === 'completed'
                            ? EVENTS.DEBATE_SESSION_COMPLETED
                            : to === 'failed'
                              ? EVENTS.DEBATE_SESSION_FAILED
                              : EVENTS.DEBATE_SESSION_CANCELLED,
                        {
                            sessionId: record.id,
                            error:
                                to === 'failed'
                                    ? session.snapshot().agentStates.find((s) => s.error)?.error
                                    : undefined,
                        },
                    );
                    if (to === 'completed') {
                        const snap = session.snapshot();
                        const tl = this.getTimeline(record.id);
                        this.getContext(record.id)
                            .conclusionEngine.generateVerdictWithLLM(snap, tl)
                            .then((verdict) => {
                                if (store) {
                                    validateAndSaveVerdict(store, {
                                        sessionId: verdict.sessionId,
                                        topic: verdict.topic,
                                        summary: verdict.summary,
                                        conclusionType: verdict.conclusionType,
                                        stanceResult: verdict.stanceResult,
                                        keyArguments: JSON.stringify(verdict.keyArguments),
                                        reasoning: verdict.reasoning,
                                        confidence: verdict.confidence,
                                        generatedAt: verdict.generatedAt,
                                        roundsTotal: verdict.roundsTotal,
                                        totalTokens: verdict.totalTokens,
                                    }).catch((e) =>
                                        LOGGER.warn('DebateEngine', 'verdict persist failed', {
                                            error: e,
                                        }),
                                    );
                                }
                                this.deps.eventBus.emit(EVENTS.DEBATE_VERDICT_GENERATED, {
                                    sessionId: record.id,
                                    verdict,
                                });
                            })
                            .catch((e) =>
                                LOGGER.warn(
                                    'DebateEngine',
                                    'LLM-enhanced verdict failed, using heuristic',
                                    { error: e },
                                ),
                            );

                        // Memory extraction at session completion
                        if (this.deps.memoryExtractor) {
                            try {
                                const extracted = this.deps.memoryExtractor.extractFromTimeline(
                                    record.id,
                                    tl,
                                );
                                LOGGER.info(
                                    'DebateEngine',
                                    'Memory extraction complete (restored)',
                                    {
                                        sessionId: record.id,
                                        units: extracted.units.length,
                                        ...extracted.summary,
                                    },
                                );
                                if (this.deps.evaluator) {
                                    const claims = this.deps.memoryExtractor.extractClaims(
                                        extracted.units,
                                    );
                                    for (const p of session.participants) {
                                        const chain = this.getMemory(record.id).getChain(p.agentId);
                                        const score = this.deps.evaluator.scoreArguments(
                                            p.agentId,
                                            claims,
                                            chain,
                                        );
                                        this.deps.eventBus.emit(EVENTS.DEBATE_AGENT_PHASE_CHANGED, {
                                            sessionId: record.id,
                                            agentId: p.agentId,
                                            from: 'completed',
                                            to: JSON.stringify(score),
                                        });
                                    }
                                }
                            } catch (e) {
                                LOGGER.warn('DebateEngine', 'Memory extraction failed (restored)', {
                                    error: e,
                                    sessionId: record.id,
                                });
                            }
                        }
                    }
                    this.saveSnapshot(record.id).catch((e) =>
                        LOGGER.warn('DebateEngine', 'auto-checkpoint failed', { error: e }),
                    );
                }
            });

            this.sessions.set(record.id, session as IDebateSession);
            const budget = new DebateBudget(record.id);
            this.budgets.set(record.id, budget);

            this.deps.eventBus.emit(EVENTS.DEBATE_SESSION_CREATED, {
                sessionId: record.id,
                topic: record.topic,
                topologyType: topology.type,
            });

            return session.snapshot();
        } catch (e) {
            LOGGER.warn('DebateEngine', 'Failed to reconstruct session from snapshot', {
                error: e,
            });
            return null;
        }
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
