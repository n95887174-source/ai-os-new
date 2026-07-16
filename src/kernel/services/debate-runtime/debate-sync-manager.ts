import { EVENTS } from '../../events/event-names';
import { CONFIG } from '../config-registry';
import { DebateGovernor } from './debate-governor';
import { DebateInterpreter } from './debate-interpreter';
import { DebatePostProcessor } from './debate-post-processor';
import type {
    DebateParticipant,
    DebateConfig,
    DebateSession,
    DebateServiceDeps,
    DebateStrategy,
    DebateVerdict,
} from '../../contracts/debate-types';
import type { IDebateEngine, DebateTopology } from '../../contracts/debate-runtime';
import { rootLogger } from '../logger-service';
import { DEFAULT_DEBATE_LANGUAGE } from '../config-registry';
import {
    participantsToConfig,
    mergeAndProcessSession,
    buildRoundtableTopology,
} from './debate-session-bridge';
import type { SnapshotBridgeContext } from './debate-session-bridge';
import { finalizeDebate } from './debate-finalizer';
import { persistActiveSession, loadActiveSession } from './debate-session-persistence';
import { checkDebatePreflight } from './debate-preflight';
import type { GovernorState } from './debate-governor/types';
import { useActiveDebateStore } from '../../../stores/activeDebateStore';
import { useDebateLiveStore } from '../../../stores/debateLiveStore';
import { eventBus } from '../../events/event-bus';
import { logMemoryStats, estimateSessionBytes } from '../../utils/memory-tracker';

const LOGGER = rootLogger.child('DebateService.Sync');

export const DEFAULT_CONFIG: DebateConfig = {
    roundDelayMs: 2000,
    maxTokens: 1024,
    temperature: 0.7,
    debateTemperature: 0.5,
    useModerator: true,
    timeoutMs: 30000,
    maxDurationMs: 1_800_000,
    language: 'ru',
};

export class DebateSyncManager {
    engine: IDebateEngine | null = null;
    activeSession: DebateSession | null = null;
    runtimeSessionId: string | null = null;
    governor: DebateGovernor | null = null;
    postProcessor: DebatePostProcessor;
    bridgeCtx: SnapshotBridgeContext | null = null;
    deps: DebateServiceDeps | null = null;

    private _unsubs: Array<() => void> = [];
    private _initUnsubs: Array<() => void> = [];
    private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private _durationTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly _interpreter = new DebateInterpreter();
    private _engineOnly = false;
    private _governorState: GovernorState | null = null;
    private readonly _verdictCache = new Map<string, DebateVerdict>();
    private static readonly MAX_VERDICT_CACHE = 50;
    private static readonly RESTART_COOLDOWN_MS = 10_000;
    private _lastStartTime = 0;

    private _setCachedVerdict(sessionId: string, verdict: DebateVerdict): void {
        if (this._verdictCache.size >= DebateSyncManager.MAX_VERDICT_CACHE) {
            const firstKey = this._verdictCache.keys().next().value;
            if (firstKey) this._verdictCache.delete(firstKey);
        }
        this._verdictCache.set(sessionId, verdict);
    }

    constructor(postProcessor: DebatePostProcessor) {
        this.postProcessor = postProcessor;
    }

    /** Get active debate session (replaces active-debate-store module singleton). */
    getActiveDebateSession(): DebateSession | null {
        return this.activeSession;
    }

    /** Get governor state. */
    getDebateGovernorState(): GovernorState | null {
        return this._governorState;
    }

    /** Set governor state. */
    setDebateGovernorState(state: GovernorState | null): void {
        this._governorState = state;
    }

    /** Get cached verdict for a session. */
    getCachedVerdict(sessionId: string): DebateVerdict | undefined {
        return this._verdictCache.get(sessionId);
    }

    /** Clear all cached verdicts — used between tournament matches to free memory. */
    clearVerdictCache(): void {
        this._verdictCache.clear();
    }

    /** Expose FactCheckService for UI consumers (DebatePanel, FactCheckBadge). */
    get factCheckService() {
        return this.postProcessor.factCheckService;
    }

    /** Set deps after construction (called during DI wiring). */
    setDeps(deps: DebateServiceDeps): void {
        this.deps = deps;
        this._engineOnly = CONFIG.featureFlags.debate.engineOnly;
    }

    /** Initialize: load active session + register global event listeners. */
    async init(): Promise<void> {
        if (!this.deps) return;
        const loaded = await loadActiveSession(this.deps.debateStore);
        this.activeSession = loaded;
        if (loaded) {
            const { useActiveDebateStore } = await import('../../../stores/activeDebateStore');
            useActiveDebateStore.getState().setSession(loaded);
        }
        this._initUnsubs.push(
            this.deps.eventBus.on(EVENTS.DEBATE_VERDICT_GENERATED, (data) => {
                const payload = data as { sessionId: string; verdict: DebateVerdict };
                // Only cache verdicts for the active session. DEBATE_VERDICT_GENERATED
                // fires asynchronously (inside an LLM .then() callback), so it can arrive
                // long after clearVerdictCache() and even after the next match has started.
                // Without this guard, the cache grows unboundedly between tournament matches.
                if (payload.sessionId !== this.runtimeSessionId) return;
                this._setCachedVerdict(payload.sessionId, payload.verdict);
            }),
            this.deps.eventBus.on(EVENTS.SESSION_DELETED, (data) => {
                const payload = data as { id: string; type: string };
                if (payload.type !== 'debate') return;
                if (payload.id === this.runtimeSessionId || payload.id === this.activeSession?.id) {
                    LOGGER.info(
                        'DebateSyncManager',
                        `Debate session ${payload.id} deleted — cancelling`,
                    );
                    this.stopDebateInternal();
                }
            }),
        );
    }

    /** Full debate start orchestration: preflight → CB reset → engine session → emit → start. */
    async startDebate(
        topic: string,
        participants: DebateParticipant[],
        strategy: DebateStrategy = 'round_robin',
        maxRounds: number = 5,
        config?: Partial<DebateConfig>,
        chatSessionId?: string,
    ): Promise<DebateSession> {
        if (!this.deps) throw new Error('DebateService not initialized');
        const now = Date.now();
        if (now - this._lastStartTime < DebateSyncManager.RESTART_COOLDOWN_MS) {
            LOGGER.warn('DebateSyncManager', 'Restart throttled — cooldown active', {
                elapsed: now - this._lastStartTime,
            });
            throw new Error('Debate restart throttled — too soon since last start');
        }
        this._lastStartTime = now;
        LOGGER.info('DebateSyncManager', 'Starting debate', {
            topic,
            participants: participants.length,
            strategy,
            maxRounds,
        });
        checkDebatePreflight(this.deps, participants);
        if (this._engineOnly && !this.engine)
            throw new Error('debate.engineOnly flag is set but no DebateEngine configured');
        // M-3: clear stale timer BEFORE cancelSession — prevents timer firing during teardown
        this.clearTimers();
        if (this.engine && this.runtimeSessionId) {
            const prevSnap = this.engine.getSession(this.runtimeSessionId);
            if (prevSnap) {
                const isTerminal =
                    prevSnap.phase === 'completed' ||
                    prevSnap.phase === 'failed' ||
                    prevSnap.phase === 'cancelled';
                if (isTerminal && !this._finalized) {
                    this.finalizeInternal();
                } else if (isTerminal) {
                    this.engine.cancelSession(this.runtimeSessionId);
                } else {
                    this.engine.cancelSession(this.runtimeSessionId);
                }
            }
        }
        const sessionConfig = this.resetDebateState();
        if (config) Object.assign(sessionConfig, config);
        this.setupDurationTimer(sessionConfig);
        for (const p of ['groq', 'gemini', 'openrouter', 'nvidia', 'cerebras', 'cloudflare']) {
            try {
                this.deps.adapterRegistry.resetCircuitBreaker(p);
            } catch {
                /* ignore — circuit may not exist for this provider */
            }
        }
        const session = this.initEngineSession(
            buildRoundtableTopology(participants, maxRounds),
            topic,
            participants,
            sessionConfig,
            { participants, strategy, maxRounds, config: sessionConfig },
        );
        this.emitDebateStarted(session, topic, participants.length, chatSessionId);
        this.startEngineWithFinalize(session.id);
        return session;
    }

    /** Topology-based debate start. */
    async startTopologyDebate(
        topology: DebateTopology,
        topic: string,
        participants: DebateParticipant[],
        config?: Partial<DebateConfig>,
        chatSessionId?: string,
    ): Promise<DebateSession> {
        if (!this.deps) throw new Error('DebateService not initialized');
        const now = Date.now();
        if (now - this._lastStartTime < DebateSyncManager.RESTART_COOLDOWN_MS) {
            LOGGER.warn('DebateSyncManager', 'Topology restart throttled — cooldown active', {
                elapsed: now - this._lastStartTime,
            });
            throw new Error('Debate restart throttled — too soon since last start');
        }
        this._lastStartTime = now;
        checkDebatePreflight(this.deps, participants);
        // M-3: clear stale timer before cancelSession
        this.clearTimers();
        if (this.engine && this.runtimeSessionId) {
            const prevSnap = this.engine.getSession(this.runtimeSessionId);
            if (prevSnap) {
                const isTerminal =
                    prevSnap.phase === 'completed' ||
                    prevSnap.phase === 'failed' ||
                    prevSnap.phase === 'cancelled';
                if (isTerminal && !this._finalized) {
                    this.finalizeInternal();
                } else if (isTerminal) {
                    this.engine.cancelSession(this.runtimeSessionId);
                } else {
                    this.engine.cancelSession(this.runtimeSessionId);
                }
            }
        }
        const sessionConfig = this.resetDebateState();
        if (config) Object.assign(sessionConfig, config);
        this.setupDurationTimer(sessionConfig);
        const session = this.initEngineSession(topology, topic, participants, sessionConfig, {
            participants,
            strategy: topology.type as DebateSession['strategy'],
            maxRounds: topology.maxDepth ?? 5,
            config: sessionConfig,
        });
        this.emitDebateStarted(session, topic, participants.length, chatSessionId);
        this.startEngineWithFinalize(session.id);
        return session;
    }

    /** Public stop — delegates to internal. */
    stopDebate(sessionId?: string): void {
        this.stopDebateInternal(sessionId);
    }

    resetDebateState(): DebateConfig {
        this._finalized = false;
        this.activeSession = null;
        this.clearTimers();
        this.clearListeners();
        // Clear Zustand stores to release stale session objects and events:
        // prevents stale agents/rounds/emotions from accumulating across debates.
        useDebateLiveStore.getState().clearAll();
        useActiveDebateStore.getState().clearAll();
        if (DEFAULT_CONFIG.useGovernor !== false) {
            this.governor = new DebateGovernor();
            useActiveDebateStore.getState().setGovernorState(this.governor.getState());
        }
        this.postProcessor.clearProcessedIds();
        return { ...DEFAULT_CONFIG };
    }

    setupDurationTimer(sessionConfig: DebateConfig): void {
        const maxDuration = sessionConfig.maxDurationMs ?? 1_800_000;
        this._durationTimer = setTimeout(() => {
            if (this.activeSession?.status === 'active') {
                LOGGER.warn('DebateSyncManager', 'Debate timed out', { maxDuration });
                this.stopDebateInternal();
            }
        }, maxDuration);
    }

    initEngineSession(
        topology: DebateTopology,
        topic: string,
        participants: DebateParticipant[],
        sessionConfig: DebateConfig,
        bridgeCtx: SnapshotBridgeContext,
    ): DebateSession {
        if (!this.engine) throw new Error('No DebateEngine configured');
        const runtimeId = this.engine.createSession(
            topology,
            topic,
            participantsToConfig(participants),
            sessionConfig.language === 'en' ? 'English' : DEFAULT_DEBATE_LANGUAGE,
        );
        this.runtimeSessionId = runtimeId;
        this.bridgeCtx = bridgeCtx;
        this.governor?.setMaxRounds(bridgeCtx.maxRounds);
        this.setupListeners(runtimeId);
        this.startHeartbeat();
        this.syncSession();
        const session = this.activeSession;
        if (!session) throw new Error('No active session after sync');
        return session;
    }

    emitDebateStarted(
        session: DebateSession,
        topic: string,
        matchParticipants: number,
        chatSessionId?: string,
    ): void {
        if (!this.deps) return;
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Debate started: ${topic} with ${matchParticipants} agents`,
            type: 'info',
        });
        this.deps.eventBus.emit(EVENTS.DEBATE_STARTED, session);
        if (chatSessionId && session?.id) {
            this.deps.sessionManager
                .link(chatSessionId, session.id, 'chat_to_debate', `Debate: ${topic}`)
                .catch(() => {});
            this.deps.sessionManager
                .updateMeta(chatSessionId, { linkedDebateId: session.id })
                .catch(() => {});
        }
    }

    startEngineWithFinalize(runtimeId: string): void {
        void this.engine!.startSession(runtimeId)
            .then(() => {
                // Don't finalize if session was paused — pause/stop buttons need
                // runtimeSessionId to remain alive for engine-level operations.
                // finalizeInternal() nulls runtimeSessionId and clears listeners,
                // making the debate unreachable from the sync layer.
                const snap = this.engine?.getSession(runtimeId);
                if (snap && snap.phase === 'paused') {
                    this.syncSession();
                    return;
                }
                // GUARD: if runtimeSessionId changed (new debate started before old
                // pipeline finished), skip finalize — the new debate owns the
                // listeners now. finalizeInternal() would clear them, corrupting
                // the new session.
                if (this.runtimeSessionId !== runtimeId) {
                    LOGGER.warn(
                        'DebateSyncManager',
                        'Skipping finalize — runtimeSessionId changed',
                        {
                            expected: runtimeId,
                            actual: this.runtimeSessionId,
                        },
                    );
                    // Still clean up the engine session to prevent memory leak
                    this.engine?.cancelSession(runtimeId);
                    return;
                }
                this.finalizeInternal();
            })
            .catch((e) => {
                LOGGER.warn('DebateSyncManager', 'Engine debate failed', { error: e });
                try {
                    this.syncSession();
                    if (this.runtimeSessionId !== runtimeId) {
                        LOGGER.warn(
                            'DebateSyncManager',
                            'Skipping catch-body finalize — runtimeSessionId changed',
                            { expected: runtimeId, actual: this.runtimeSessionId },
                        );
                        this.engine?.cancelSession(runtimeId);
                        return;
                    }
                    this.finalizeInternal();
                } catch (inner) {
                    LOGGER.error('DebateSyncManager', 'Catch body failed', { error: inner });
                }
            });
    }

    stopDebateInternal(sessionId?: string): void {
        const sid = sessionId ?? this.runtimeSessionId;
        if (this.engine && sid) {
            const snap = this.engine.getSession(sid);
            if (
                snap &&
                snap.phase !== 'completed' &&
                snap.phase !== 'failed' &&
                snap.phase !== 'cancelled'
            ) {
                this.engine.cancelSession(sid);
            }
            if (sid !== this.runtimeSessionId) return;
            this.syncSession();
            this.finalizeInternal();
        }
    }

    destroy(): void {
        this.stopHeartbeat();
        this.clearTimers();
        if (this.engine && this.runtimeSessionId) {
            const snap = this.engine.getSession(this.runtimeSessionId);
            if (
                snap &&
                snap.phase !== 'completed' &&
                snap.phase !== 'failed' &&
                snap.phase !== 'cancelled'
            ) {
                this.engine.cancelSession(this.runtimeSessionId);
            }
        }
        this.clearListeners();
        for (const unsub of this._initUnsubs) unsub();
        this._initUnsubs = [];
        if (this.activeSession && this.deps) {
            this.deps.sessionManager.saveToDebateHistory(this.activeSession);
            if (this.activeSession.arguments) {
                for (const arg of this.activeSession.arguments) {
                    (arg as { content?: string }).content = '';
                }
                this.activeSession.arguments = [];
            }
        }
        useActiveDebateStore.getState().clearAll();
        this.activeSession = null;
        this.engine = null;
        this.runtimeSessionId = null;
        this.bridgeCtx = null;
        this.governor?.reset();
        this.governor = null;
    }

    syncSession(): void {
        if (!this.engine || !this.runtimeSessionId || !this.bridgeCtx) return;
        const { session, newArgs } = mergeAndProcessSession(
            this.engine,
            this.runtimeSessionId,
            this.bridgeCtx,
            this.postProcessor,
            this.governor,
            this.activeSession,
        );
        if (!session) return;
        this.activeSession = session;
        // Check governor stop conditions BEFORE updating the Zustand store.
        // checkGovernorStopConditions() sets this.activeSession.consensus from
        // governor synthesis. Without this ordering, waitForSessionCompletion()
        // resolves with a consensus-less session, making tournament scoring
        // always produce draws (all scores = 0).
        const shouldStop = this.governor && this.checkGovernorStopConditions();
        useActiveDebateStore.getState().setSession(this.activeSession);
        for (const arg of newArgs) {
            this.deps!.eventBus.emit(EVENTS.DEBATE_ARGUMENT, {
                sessionId: this.runtimeSessionId,
                argument: arg,
            });
        }
        this.deps!.eventBus.emit(EVENTS.DEBATE_UPDATED, session);
        if (shouldStop) {
            if (this.engine && this.runtimeSessionId) {
                this.engine.cancelSession(this.runtimeSessionId);
            }
            this.stopDebateInternal();
        }
    }

    isEngineActive(): boolean {
        return this.runtimeSessionId !== null && this.engine !== null;
    }

    private setupListeners(runtimeId: string): void {
        this.clearListeners();
        const syncIfOurs = (payload: unknown) => {
            const p = payload as { sessionId?: string };
            if (p.sessionId !== runtimeId) return;
            this.syncSession();
        };
        const events = [
            EVENTS.DEBATE_SESSION_STARTED,
            EVENTS.DEBATE_SESSION_PAUSED,
            EVENTS.DEBATE_SESSION_RESUMED,
            EVENTS.DEBATE_AGENT_RESPONDED,
            EVENTS.DEBATE_PHASE_CHANGED,
            EVENTS.DEBATE_ROUND_STARTED,
            EVENTS.DEBATE_ROUND_ENDED,
            EVENTS.DEBATE_SESSION_COMPLETED,
            EVENTS.DEBATE_SESSION_FAILED,
            EVENTS.DEBATE_SESSION_CANCELLED,
        ];
        for (const event of events) {
            this._unsubs.push(this.deps!.eventBus.on(event as string, syncIfOurs));
        }
    }

    private _finalized = false;

    private finalizeInternal(): void {
        if (this._finalized) return;
        // DEFENSE: if runtimeSessionId is already null, another finalize (or a new
        // debate start) already cleaned up — don't touch listeners.
        if (!this.runtimeSessionId) {
            LOGGER.warn(
                'DebateSyncManager',
                'finalizeInternal: runtimeSessionId already null — skipping',
            );
            return;
        }
        this._finalized = true;
        this.stopHeartbeat();
        this.clearTimers();
        const session = this.activeSession;
        if (!session) return;
        finalizeDebate(session, {
            interpreter: this._interpreter,
            eventBus: this.deps!.eventBus,
        });
        // Strip argument content AFTER metrics but BEFORE saveToDebateHistory.
        // saveToDebateHistory does structuredClone(session) — stripping content first
        // prevents cloning large LLM response strings, reducing old-gen promotion
        // pressure between tournament matches.
        if (session.arguments) {
            for (const arg of session.arguments) {
                (arg as { content?: string }).content = '';
            }
            session.arguments = [];
        }
        this.deps!.sessionManager.saveToDebateHistory(session);
        // Clean up Zustand stores to release retained session objects
        useDebateLiveStore.getState().clearSession(session.id);
        useActiveDebateStore.getState().clearAll();
        this.clearListeners();
        const oldRuntimeId = this.runtimeSessionId;
        this.runtimeSessionId = null;
        this.bridgeCtx = null;
        this.activeSession = null;
        // Clean up engine session data to prevent memory leaks
        if (this.engine && oldRuntimeId) {
            this.engine.cancelSession(oldRuntimeId);
        }
        // MEMORY TRACKER: log engine + sync manager + aggregate state after finalize
        if (this.engine) {
            const engineSizes = this.engine.dumpSizes();
            const liveState = useDebateLiveStore.getState();
            const streamingMapsSize =
                liveState.streamingContent.size +
                liveState.emotions.size +
                liveState.agentCountdowns.size +
                liveState.agentAddressing.size +
                liveState.memoryBubbles.size +
                liveState.currentThinking.size;
            const ebStats = eventBus.getSubscriptionStats();
            logMemoryStats(
                'AfterFinalize',
                engineSizes,
                {
                    unsubs: this._unsubs.length,
                    initUnsubs: this._initUnsubs.length,
                    verdictCache: this._verdictCache.size,
                    runtimeSessionId: this.runtimeSessionId,
                    activeSessionSize: estimateSessionBytes(
                        this.activeSession as Record<string, unknown> | null,
                    ),
                },
                {
                    embeddingChunks: 0,
                    policyRules: 0,
                    policyFirings: 0,
                    modeVersions: 0,
                    strategyVersions: 0,
                    eventBusListeners: ebStats.totalCallbacks,
                    completedSessions: this.deps?.sessionManager.getDebateHistory().length ?? 0,
                    liveStoreAgentEvents: liveState.agentEvents.length,
                    liveStoreRoundEvents: liveState.roundEvents.length,
                    liveStoreStreamingMaps: streamingMapsSize,
                    activeDebateSession: useActiveDebateStore.getState().session ? 1 : 0,
                },
            );
        }
    }

    private checkGovernorStopConditions(): boolean {
        if (!this.governor) return false;
        if (!this.governor.shouldStop()) return false;

        const synthesis = this.governor.generateSynthesis();
        if (this.activeSession) {
            const coreDisagreement = synthesis.coreDisagreement;
            const resolvedCount = synthesis.resolvedPoints.length;
            const unresolvedCount = synthesis.unresolvedPoints.length;
            this.activeSession.consensus = `## Synthesis\n\n${synthesis.consensus}\n\n### Core Disagreement\n${coreDisagreement}\n\n### Resolved\n${resolvedCount} point(s)\n\n### Unresolved\n${unresolvedCount} point(s)`;
            this.deps!.eventBus.emit(EVENTS.DEBATE_CONSENSUS, {
                sessionId: this.activeSession.id,
                topic: this.activeSession.topic,
                consensus: this.activeSession.consensus,
                convergenceScore: this.activeSession.convergenceScore,
                synthesis,
            });
        }
        return true;
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        this._heartbeatTimer = setInterval(() => {
            if (this.activeSession && this.deps) {
                persistActiveSession(this.deps.debateStore, this.activeSession);
            }
        }, 30_000);
    }

    private stopHeartbeat(): void {
        if (this._heartbeatTimer !== null) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    }

    private clearTimers(): void {
        if (this._durationTimer !== null) {
            clearTimeout(this._durationTimer);
            this._durationTimer = null;
        }
    }

    private clearListeners(): void {
        for (const unsub of this._unsubs) unsub();
        this._unsubs = [];
    }
}
