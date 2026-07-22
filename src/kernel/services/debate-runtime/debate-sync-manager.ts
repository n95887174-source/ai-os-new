import { EVENTS } from '../../events/event-names';
import { CONFIG } from '../config-registry';
import { DebateGovernor } from './debate-governor';
import { DebateInterpreter } from './debate-interpreter';
import { DebatePostProcessor } from './debate-post-processor';
import type {
    DebateParticipant,
    DebateConfig,
    DebateSession,
    DebateStrategy,
    DebateVerdict,
    VerdictKeyArgument,
    ConclusionType,
    StanceResult,
} from '../../contracts/debate-types';
import type { DebateServiceDeps } from '../../contracts/debate-service-deps';
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
import { loadActiveSession } from './debate-session-persistence';
import { checkDebatePreflight } from './debate-preflight';
import { getAllSettings } from './quality-settings-store';
import type { GovernorState } from './debate-governor/types';

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
    private readonly _verdictCache = new Map<string, DebateVerdict>();
    private static readonly MAX_VERDICT_CACHE = 50;
    private static readonly RESTART_COOLDOWN_MS = 10_000;
    private _lastStartTime = 0;
    private _initialized = false;
    /** Re-entrancy guard for syncSession() to prevent infinite recursion between
     *  syncSession → cancelSession (DEBATE_SESSION_CANCELLED event) → syncIfOurs → syncSession.
     *  Without this guard, stopDebateInternal() calling syncSession() while inside syncSession()
     *  creates an unbounded call stack that never reaches finalizeInternal(). */
    private _syncing = false;
    /** Debounce timer for syncSession: coalesces rapid event-driven syncs at the end of a debate
     *  (DEBATE_PHASE_CHANGED → consensus/summarizing/completed) into a single _syncSessionImpl call.
     *  This reduces cascading microtasks → Zustand store updates → React re-renders that can
     *  cause Chrome renderer OOM ("Aw, Snap!") before verdict generation. */
    private _syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
        // Source of truth lives in useActiveDebateStore (Zustand) — set by initSession
        // via setGovernorState() in this file. Previously returned a stale `this._governorState`
        // field that was never written, which made ArgumentGraphPanel always show empty state.
        return (
            (this.deps?.activeDebateStore.governorState as unknown as GovernorState | null) ?? null
        );
    }

    /** Set governor state. */
    setDebateGovernorState(state: GovernorState | null): void {
        // Kept for API compatibility; delegate to Zustand store.
        this.deps?.activeDebateStore.setGovernorState(state);
    }

    /** Get cached verdict for a session. */
    getCachedVerdict(sessionId: string): DebateVerdict | undefined {
        return this._verdictCache.get(sessionId);
    }

    /** Clear all cached verdicts — used between tournament matches to free memory. */
    clearVerdictCache(): void {
        this._verdictCache.clear();
    }

    /**
     * Strip argument content for rounds older than keepRounds behind the latest round.
     * Called under memory pressure to free LLM response strings without destroying
     * the argument structure (IDs, agentIds, metadata remain intact).
     * The governor's internal state and finalizeDebate metrics are unaffected.
     */
    truncateArguments(keepRounds = 2): number {
        if (!this.activeSession?.arguments?.length) return 0;
        const args = this.activeSession.arguments;
        let maxRound = 0;
        for (const a of args) {
            if (a.round > maxRound) maxRound = a.round;
        }
        const cutoff = maxRound - keepRounds;
        let truncated = 0;
        for (const a of args) {
            if (a.round <= cutoff && a.content) {
                (a as { content?: string }).content = '';
                truncated++;
            }
        }
        if (truncated > 0) {
            LOGGER.info('DebateSyncManager', 'truncateArguments under memory pressure', {
                truncated,
                totalArgs: args.length,
                maxRound,
                keepRounds,
                bytesFreed: truncated * 1024,
            });
        }
        return truncated;
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
        if (this._initialized) return;
        this._initialized = true;
        if (!this.deps) return;
        const loaded = await loadActiveSession(this.deps.debateStore);
        this.activeSession = loaded;
        if (loaded) {
            this.deps.activeDebateStore.setSession(loaded);
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
        for (const p of ['groq', 'gemini', 'openrouter', 'nvidia']) {
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
        this.deps!.debateLiveStore.clearAll();
        this.deps!.activeDebateStore.clearAll();
        if (DEFAULT_CONFIG.useGovernor !== false) {
            this.governor = new DebateGovernor();
            this.deps!.activeDebateStore.setGovernorState(this.governor.getState());
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

        // If experiment engine is active, randomize technique settings before session starts
        if (this.deps?.experimentEngine && sessionConfig.qualitySettings) {
            const enabledTechniques = Object.keys(sessionConfig.qualitySettings);
            const tempId = crypto.randomUUID();
            this.deps.experimentEngine.generateAssignmentForSession(tempId, enabledTechniques);
            sessionConfig.qualitySettings = getAllSettings();
        }

        const runtimeId = this.engine.createSession(
            topology,
            topic,
            participantsToConfig(participants),
            sessionConfig.language === 'en' ? 'English' : DEFAULT_DEBATE_LANGUAGE,
            sessionConfig.qualitySettings,
        );
        this.runtimeSessionId = runtimeId;
        this.bridgeCtx = bridgeCtx;
        this.governor?.setMaxRounds(bridgeCtx.maxRounds);
        this.setupListeners(runtimeId);
        this.startHeartbeat();
        this.syncSession(true);
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
                // TERMINAL PHASE GUARD: if session is already completed/cancelled/failed,
                // stopDebateInternal() already finalized it (nulled runtimeSessionId
                // and called cancelSession). Skip silently — no WARN, no double-cancel.
                if (
                    snap &&
                    (snap.phase === 'completed' ||
                        snap.phase === 'cancelled' ||
                        snap.phase === 'failed')
                ) {
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
                    return;
                }
                this.finalizeInternal();
            })
            .catch((e) => {
                LOGGER.warn('DebateSyncManager', 'Engine debate failed', { error: e });
                try {
                    // Defensive: if pipeline threw but session stuck in non-terminal
                    // phase (e.g. 'deliberating'), transition to 'failed'
                    const catchSnap = this.engine?.getSession(runtimeId);
                    if (
                        catchSnap &&
                        catchSnap.phase !== 'completed' &&
                        catchSnap.phase !== 'cancelled' &&
                        catchSnap.phase !== 'failed'
                    ) {
                        this.engine?.cancelSession(runtimeId);
                    }
                    this.syncSession();
                    // Terminal phase guard — same as then-block above
                    const catchSnap2 = this.engine?.getSession(runtimeId);
                    if (
                        catchSnap2 &&
                        (catchSnap2.phase === 'completed' ||
                            catchSnap2.phase === 'cancelled' ||
                            catchSnap2.phase === 'failed')
                    ) {
                        return;
                    }
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
                // Generate heuristic verdict BEFORE cancelSession destroys the
                // session data. The phase handler only generates an LLM verdict on
                // phase transition to 'completed', but governor stop / manual stop
                // transition directly to 'cancelled', bypassing the normal verdict path.
                // Without this, the UI shows "empty messages" instead of a verdict.
                if (this.activeSession && this.activeSession.arguments?.length > 0) {
                    this.emitHeuristicVerdict(this.activeSession);
                }
                // Save snapshot BEFORE cancelSession destroys engine maps.
                // finalizeInternal() save cannot find the session once destroyed.
                this.engine
                    .saveSnapshot(sid)
                    .catch((e) =>
                        LOGGER.error(
                            'DebateSyncManager',
                            'saveSnapshot in stopDebateInternal failed',
                            { error: e, sessionId: sid },
                        ),
                    );
                this.engine.cancelSession(sid);
            }
            if (sid !== this.runtimeSessionId) return;
            this.syncSession();
            this.finalizeInternal();
        }
    }

    private emitHeuristicVerdict(session: DebateSession): void {
        const participantNameById = new Map(session.participants.map((p) => [p.id, p.name]));
        const agentScores = new Map<
            string,
            { count: number; totalWords: number; totalConfidence: number }
        >();
        for (const arg of session.arguments ?? []) {
            if (!arg.agentId || arg.agentId === 'human') continue;
            const entry = agentScores.get(arg.agentId) ?? {
                count: 0,
                totalWords: 0,
                totalConfidence: 0,
            };
            entry.count++;
            entry.totalWords += (arg.content ?? '').split(/\s+/).filter(Boolean).length;
            entry.totalConfidence += arg.confidence ?? 0.7;
            agentScores.set(arg.agentId, entry);
        }

        const allArgs = session.arguments ?? [];
        const keyArguments: VerdictKeyArgument[] = allArgs.slice(-5).map((a) => ({
            agentId: a.agentId ?? 'unknown',
            agentName: a.agentName ?? a.agentId ?? 'unknown',
            content: (a.content ?? '').slice(0, 500),
            stance: (a.position as 'pro' | 'con' | 'neutral') ?? 'neutral',
            strength: a.confidence ?? 0.7,
        }));

        let bestAgentId = '';
        let bestScore = -1;
        for (const [agentId, s] of agentScores) {
            const score =
                s.count * 1_000_000 +
                Math.min(s.totalWords, 999_999) +
                Math.min(Math.round(s.totalConfidence * 100), 999);
            if (score > bestScore) {
                bestScore = score;
                bestAgentId = agentId;
            }
        }

        const convergenceScore = session.convergenceScore ?? 0;
        let conclusionType: ConclusionType;
        let stanceResult: StanceResult;
        if (convergenceScore > 75) {
            conclusionType = 'consensus';
            stanceResult = 'balanced';
        } else if (bestAgentId && agentScores.size > 1) {
            const bestEntry = agentScores.get(bestAgentId)!;
            if (bestEntry.count > allArgs.length * 0.4) {
                conclusionType = 'dominance';
                stanceResult = 'pro_wins';
            } else {
                conclusionType = 'partial_agreement';
                stanceResult = 'no_clear_winner';
            }
        } else {
            conclusionType = 'inconclusive';
            stanceResult = 'no_clear_winner';
        }

        const verdict: DebateVerdict = {
            sessionId: session.id,
            topic: session.topic,
            summary:
                session.consensus ??
                `Debate concluded after ${session.currentRound ?? 0} rounds with ${allArgs.length} total arguments.`,
            conclusionType,
            stanceResult,
            keyArguments,
            reasoning: `Heuristic verdict (governor stop). ${bestAgentId ? `Leading participant: ${participantNameById.get(bestAgentId) || bestAgentId}` : 'No clear leader.'}`,
            confidence: Math.min(0.7, 0.3 + allArgs.length * 0.02),
            generatedAt: Date.now(),
            roundsTotal: session.currentRound ?? 0,
            totalTokens: 0,
        };

        this._setCachedVerdict(session.id, verdict);
        this.deps!.eventBus.emit(EVENTS.DEBATE_VERDICT_GENERATED, {
            sessionId: session.id,
            verdict,
        });
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
        this.deps?.activeDebateStore.clearAll();
        this.activeSession = null;
        this.engine = null;
        this.runtimeSessionId = null;
        this.bridgeCtx = null;
        this.governor?.reset();
        this.governor = null;
    }

    syncSession(immediate = false): void {
        if (this._syncing || !this.engine || !this.runtimeSessionId || !this.bridgeCtx) return;
        // Debounce rapid event-driven syncs by coalescing into a single microtask.
        // The initial syncSession(true) call from initEngineSession bypasses debounce.
        if (!immediate) {
            if (this._syncDebounceTimer) clearTimeout(this._syncDebounceTimer);
            this._syncDebounceTimer = setTimeout(() => {
                this._syncDebounceTimer = null;
                void this._syncSessionImpl().catch((e) =>
                    LOGGER.warn('DebateSyncManager', '_syncSessionImpl failed', { error: e }),
                );
            }, 16);
            return;
        }
        void this._syncSessionImpl().catch((e) =>
            LOGGER.warn('DebateSyncManager', '_syncSessionImpl failed', { error: e }),
        );
    }

    private async _syncSessionImpl(): Promise<void> {
        if (this._syncing || !this.engine || !this.runtimeSessionId || !this.bridgeCtx) return;
        this._syncing = true;
        try {
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
            // Preserve consensus from previous session if merge produced none.
            // Zombie-recovery (loadActiveSession) sets consensus on the store session,
            // but mergeAndProcessSession creates a fresh object without it.
            // This also protects against a concurrent syncSession overwriting consensus
            // that was set by an earlier governor stop check.
            if (!this.activeSession.consensus) {
                const prev = this.deps!.activeDebateStore.session;
                if (prev?.consensus) {
                    this.activeSession.consensus = prev.consensus;
                }
            }
            // Check governor stop conditions BEFORE updating the Zustand store.
            // checkGovernorStopConditions() sets this.activeSession.consensus from
            // governor synthesis. Without this ordering, waitForSessionCompletion()
            // resolves with a consensus-less session, making tournament scoring
            // always produce draws (all scores = 0).
            const shouldStop = this.governor && this.checkGovernorStopConditions();
            // MEMORY PRESSURE: if total argument content exceeds 256KB, truncate old
            // rounds to reduce the payload sent to Zustand → React re-render → Chrome
            // renderer. This prevents OOM ("Aw, Snap!") before verdict generation.
            const totalBytes =
                this.activeSession.arguments?.reduce(
                    (sum, a) => sum + (a.content?.length ?? 0),
                    0,
                ) ?? 0;
            if (totalBytes > 256_000) {
                this.truncateArguments(2);
            }
            this.deps!.activeDebateStore.setSession(this.activeSession);
            // Governor state is mutated in-place by processGovernorFeeding() inside
            // mergeAndProcessSession(). Push the fresh state to Zustand so panels
            // (Argument Graph) see the new claims each sync cycle, not just the
            // empty initial state from resetDebateState().
            if (this.governor) {
                this.deps!.activeDebateStore.setGovernorState(this.governor.getState());
            }
            for (const arg of newArgs) {
                this.deps!.eventBus.emit(EVENTS.DEBATE_ARGUMENT, {
                    sessionId: this.runtimeSessionId,
                    argument: arg,
                });
            }
            this.deps!.eventBus.emit(EVENTS.DEBATE_UPDATED, session);
            if (shouldStop) {
                if (this.engine && this.runtimeSessionId) {
                    // AWAIT saveSnapshot — the async save builds the record with the
                    // current in-memory session state. DO NOT call cancelSession here:
                    // stopDebateInternal handles it naturally, which allows finalizeInternal
                    // to save the snapshot and persist arguments to debate history
                    // BEFORE cleanupMaps destroys the engine session.
                    try {
                        await this.engine.saveSnapshot(this.runtimeSessionId);
                    } catch (e) {
                        console.error(
                            '[DebateSyncManager] saveSnapshot in syncSession (governor stop) failed',
                            e,
                        );
                        LOGGER.error(
                            'DebateSyncManager',
                            'saveSnapshot in syncSession (governor stop) failed',
                            { error: e, sessionId: this.runtimeSessionId },
                        );
                    }
                }
                this.stopDebateInternal();
            }
        } finally {
            this._syncing = false;
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
            // DEBATE_SESSION_COMPLETED intentionally excluded — DEBATE_PHASE_CHANGED
            // with to='completed' fires first and already triggers syncSession().
            // Including it would schedule a SECOND microtask sync that races with
            // the scoring block and finalizeInternal(), causing cascading Zustand
            // store updates that can OOM the Chrome renderer ("Aw, Snap!").
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
        // DEFENSE: if the session is already cancelled/failed, skip verdict generation
        // and history persistence — the pipeline never reached natural completion.
        // Just clean up listeners, null the runtimeId, and let the engine's own
        // cancelSession path handle persistence (governor stop already saved snapshot).
        const session = this.activeSession;
        if (session && (session.status === 'cancelled' || session.status === 'failed')) {
            this._finalized = true;
            this.stopHeartbeat();
            this.clearTimers();
            this.clearListeners();
            this.runtimeSessionId = null;
            this.bridgeCtx = null;
            this.activeSession = null;
            LOGGER.info('DebateSyncManager', 'finalizeInternal: terminal session — skipping', {
                status: session.status,
            });
            return;
        }
        this._finalized = true;
        this.stopHeartbeat();
        this.clearTimers();
        if (!session) return;
        finalizeDebate(session, {
            interpreter: this._interpreter,
            eventBus: this.deps!.eventBus,
        });
        // Update Zustand store with a DEEP COPY of the completed session so the
        // UI displays argument content (what each agent said). Then strip content
        // from the original session for memory-efficient history persistence.
        // structuredClone ensures the store copy is independent — mutating the
        // original session later won't empty the store's argument content.
        const storeSession = structuredClone(session);
        this.deps!.debateLiveStore.clearSession(session.id);
        this.deps!.activeDebateStore.setSession(storeSession);
        // Final governor state at completion — same fix as in _syncSessionImpl().
        if (this.governor) {
            this.deps!.activeDebateStore.setGovernorState(this.governor.getState());
        }
        // Strip argument content BEFORE saveToDebateHistory. saveToDebateHistory
        // does structuredClone(session) — stripping content first prevents cloning
        // large LLM response strings, reducing old-gen promotion pressure between
        // tournament matches. The store already has the contentful copy.
        if (session.arguments) {
            for (const arg of session.arguments) {
                (arg as { content?: string }).content = '';
            }
        }
        this.deps!.sessionManager.saveToDebateHistory(session);
        // Finalize quality impact tracking for this session
        if (this.deps?.qualityCollector) {
            const qs = (session.config as { qualitySettings?: Record<string, boolean> } | undefined)
                ?.qualitySettings;
            const enabledTechniques = qs
                ? Object.entries(qs)
                      .filter(([, v]) => v !== false)
                      .map(([k]) => k)
                : [];
            this.deps.qualityCollector
                .finalizeSession(session.id, {
                    enabledTechniques,
                    topic: session.topic || '(no topic)',
                    strategy: session.strategy || 'round-robin',
                    participantCount: session.participants?.length ?? 0,
                    roundCount: session.currentRound ?? 0,
                    totalTokens: (session as { totalTokens?: number }).totalTokens ?? 0,
                    durationMs: session.createdAt ? Date.now() - session.createdAt : 0,
                })
                .catch((e: unknown) =>
                    LOGGER.warn('DebateSyncManager', 'qualityCollector.finalizeSession failed', {
                        sessionId: session.id,
                        error: String(e),
                    }),
                );
        }
        // Record experiment completion for this session
        if (this.deps?.experimentEngine) {
            const techniqueResults: Record<string, number> = {};
            const qualityCollector = this.deps.qualityCollector;
            if (qualityCollector) {
                for (const m of qualityCollector.getAllMetrics()) {
                    techniqueResults[m.techniqueId] = m.avgJudgeScoreDelta;
                }
            }
            this.deps.experimentEngine
                .recordSessionCompletion(session.id, techniqueResults)
                .catch((e: unknown) =>
                    LOGGER.warn('DebateSyncManager', 'recordSessionCompletion failed', {
                        sessionId: session.id,
                        error: String(e),
                    }),
                );
        }
        // Save engine snapshot BEFORE cleanupMaps destroys the session.
        // Phase handler skips saveSnapshot for completed (see createPhaseChangeHandler),
        // so we must persist it here. Fire-and-forget is safe here because this runs
        // when the pipeline resolves naturally (no concurrent auto-checkpoint racing).
        const sid = this.runtimeSessionId;
        if (this.engine && sid) {
            this.engine.saveSnapshot(sid).catch((e) =>
                LOGGER.error('DebateSyncManager', 'saveSnapshot in finalizeInternal failed', {
                    error: e,
                    sessionId: sid,
                }),
            );
        }
        this.clearListeners();
        this.runtimeSessionId = null;
        this.bridgeCtx = null;
        this.activeSession = null;
        // Note: engine.cancelSession() is NOT called here — it was already called
        // by stopDebateInternal() for cancelled/failed sessions, or the session
        // naturally completed via the pipeline. Calling it again on an already-
        // deleted session would produce a misleading "session not found" warning.
        // MEMORY TRACKER: log engine + sync manager + aggregate state after finalize
        if (this.engine) {
            const engineSizes = this.engine.dumpSizes();
            const liveState = this.deps!.debateLiveStore;
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
                    activeDebateSession: this.deps?.activeDebateStore.session ? 1 : 0,
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
        // Heartbeat intentionally does NOT persist — the engine's saveSnapshot
        // path (via auto-checkpoints + syncSession) tracks Dexie version numbers
        // through attemptSave → incrementVersion. Calling persistActiveSession here
        // (which saves without a version field) would bump the DB version without
        // the engine session knowing, causing "version conflict" errors on the
        // next engine save — including the awaited governor-stop save, which loses
        // all arguments and prevents verdict generation.
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
        if (this._syncDebounceTimer !== null) {
            clearTimeout(this._syncDebounceTimer);
            this._syncDebounceTimer = null;
        }
    }

    private clearListeners(): void {
        for (const unsub of this._unsubs) unsub();
        this._unsubs = [];
    }
}
