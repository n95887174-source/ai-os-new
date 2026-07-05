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
    private _pauseController: AbortController | null = null;
    private readonly _interpreter = new DebateInterpreter();
    private _engineOnly = false;
    private _governorState: GovernorState | null = null;
    private readonly _verdictCache = new Map<string, DebateVerdict>();
    private static readonly MAX_VERDICT_CACHE = 50;

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
        LOGGER.info('DebateSyncManager', 'Starting debate', {
            topic,
            participants: participants.length,
            strategy,
            maxRounds,
        });
        checkDebatePreflight(this.deps, participants);
        if (this._engineOnly && !this.engine)
            throw new Error('debate.engineOnly flag is set but no DebateEngine configured');
        if (this.engine && this.runtimeSessionId) {
            this.engine.cancelSession(this.runtimeSessionId);
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
        checkDebatePreflight(this.deps, participants);
        if (this.engine && this.runtimeSessionId) {
            this.engine.cancelSession(this.runtimeSessionId);
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
        this.clearTimers();
        this.clearListeners();
        if (DEFAULT_CONFIG.useGovernor !== false) {
            this.governor = new DebateGovernor();
            useActiveDebateStore.getState().setGovernorState(this.governor.getState());
        }
        this.postProcessor.clearProcessedIds();
        return { ...DEFAULT_CONFIG };
    }

    setupDurationTimer(sessionConfig: DebateConfig): void {
        const maxDuration = sessionConfig.maxDurationMs ?? 1_800_000;
        const controller = new AbortController();
        this._pauseController = controller;
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
            .then(() => this.finalizeInternal())
            .catch((e) => {
                LOGGER.warn('DebateSyncManager', 'Engine debate failed', { error: e });
                try {
                    this.syncSession();
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
        if (this.activeSession && this.deps)
            this.deps.sessionManager.saveToDebateHistory(this.activeSession);
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
        useActiveDebateStore.getState().setSession(session);
        for (const arg of newArgs) {
            this.deps!.eventBus.emit(EVENTS.DEBATE_ARGUMENT, {
                sessionId: this.runtimeSessionId,
                argument: arg,
            });
        }
        this.deps!.eventBus.emit(EVENTS.DEBATE_UPDATED, session);
        if (this.governor && this.checkGovernorStopConditions()) {
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

    private finalizeInternal(): void {
        this.stopHeartbeat();
        const session = this.activeSession;
        if (!session) return;
        finalizeDebate(session, {
            interpreter: this._interpreter,
            sessionManager: this.deps!.sessionManager,
            eventBus: this.deps!.eventBus,
        });
        this.clearListeners();
        this.runtimeSessionId = null;
        this.bridgeCtx = null;
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
        this._pauseController?.abort();
        this._pauseController = null;
    }

    private clearListeners(): void {
        for (const unsub of this._unsubs) unsub();
        this._unsubs = [];
    }
}
