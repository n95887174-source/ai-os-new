import { EVENTS } from '../../events/event-names';
import { CONFIG } from '../config-registry';

import { DebateGovernor } from './debate-governor';
import { DebateInterpreter } from './debate-interpreter';
import { DebatePostProcessor } from './debate-post-processor';
import type {
    DebateStrategy,
    DebateParticipant,
    DebateConfig,
    DebateSession,
    DebateServiceDeps,
    DebateVerdict,
} from '../../contracts/debate-types';
import type { IDebateEngine, DebateTopology } from '../../contracts/debate-runtime';
import { DebateRuntimeEvents } from '../../events/debate-runtime-events';
import { FactCheckService } from '../fact-check-service';
import { DebateHumanService } from './debate-human-service';
import { loadActiveSession } from './debate-session-persistence';
import { rootLogger } from '../logger-service';
import { getCachedVerdict, setCachedVerdict } from '../../verdict-cache';
import {
    buildRoundtableTopology,
    participantsToConfig,
    mergeAndProcessSession,
} from './debate-session-bridge';
import type { SnapshotBridgeContext } from './debate-session-bridge';
import { finalizeDebate } from './debate-finalizer';
import {
    setActiveDebateSession,
    setDebateGovernorState,
    clearActiveDebateSession,
} from './active-debate-store';

const LOGGER = rootLogger.child('DebateService');

let _deps: DebateServiceDeps;
let _engine: IDebateEngine | null = null;
let _activeSession: DebateSession | null = null;
let _runtimeSessionId: string | null = null;
let _governor: DebateGovernor | null = null;
let _postProcessor: DebatePostProcessor;
let _bridgeCtx: SnapshotBridgeContext | null = null;
let _unsubs: Array<() => void> = [];
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _durationTimer: ReturnType<typeof setTimeout> | null = null;
let _pauseController: AbortController | null = null;
const _interpreter = new DebateInterpreter();
let _engineOnly = false;

const DEFAULT_CONFIG: DebateConfig = {
    roundDelayMs: 2000,
    maxTokens: 1024,
    temperature: 0.7,
    debateTemperature: 0.5,
    useModerator: true,
    timeoutMs: 30000,
    maxDurationMs: 1_800_000,
    language: 'ru',
};

export let factCheckService: FactCheckService;
export let humanService: DebateHumanService;

export function isInitialized(): boolean {
    return !!_deps;
}

export function setDeps(deps: DebateServiceDeps): void {
    _deps = deps;
    _engineOnly = CONFIG.featureFlags.debate.engineOnly;
    factCheckService = new FactCheckService({
        eventBus: deps.eventBus,
        getApiKey: (provider) => {
            const keys = deps.keyService.getKeys();
            const key = keys.find(
                (k) => k.provider.toLowerCase() === provider.toLowerCase() && k.status === 'active',
            );
            return key?.key;
        },
        sendMessage: async (messages, model, apiKey) => {
            const providers = deps.routerService.getDebateProviders(1);
            const adapter = deps.adapterRegistry.getAdapter(providers[0]?.provider || 'groq');
            if (!adapter) throw new Error('No adapter');
            const res = await adapter.sendMessage(
                messages,
                model,
                apiKey,
                new AbortController().signal,
            );
            return { content: res.content };
        },
    });
    _postProcessor = new DebatePostProcessor({ factCheckService });
    humanService = new DebateHumanService(deps.eventBus, deps.debateStore, {
        updateConvergenceScore: (session) => _postProcessor.updateConvergenceScore(session),
    });
}

export function setEngine(engine: IDebateEngine): void {
    _engine = engine;
}

export function getRuntimeSessionId(): string | null {
    return _runtimeSessionId;
}

export async function init() {
    if (!_deps) return;
    _activeSession = await loadActiveSession(_deps.debateStore);
    _deps.eventBus.on(EVENTS.DEBATE_VERDICT_GENERATED, (data) => {
        const payload = data as { sessionId: string; verdict: DebateVerdict };
        setCachedVerdict(payload.sessionId, payload.verdict);
    });
    _unsubs.push(
        _deps.eventBus.on(EVENTS.SESSION_DELETED, (data) => {
            const payload = data as { id: string; type: string };
            if (payload.type !== 'debate') return;
            if (payload.id === _runtimeSessionId || payload.id === _activeSession?.id) {
                LOGGER.info('DebateService', `Debate session ${payload.id} deleted — cancelling`);
                stopDebate();
            }
        }),
    );
}

function checkDebatePreflight(participants: DebateParticipant[]): void {
    if (!_deps) throw new Error('DebateService not initialized');
    if (participants.length < 2) throw new Error('Need at least 2 participants for debate');
    const activeKeys = _deps.keyService.getActiveKeys();
    if (activeKeys.length === 0) throw new Error('No active API keys available');
    const availableProviders = new Set(activeKeys.map((k) => k.provider));
    const hasDebateProvider = [
        'groq',
        'gemini',
        'openrouter',
        'nvidia',
        'cerebras',
        'cloudflare',
    ].some((p) => availableProviders.has(p));
    if (!hasDebateProvider) {
        throw new Error(
            `No debate-capable provider with active keys. Active: ${[...availableProviders].join(', ') || 'none'}`,
        );
    }
}

function resetDebateState(): DebateConfig {
    clearTimeoutCustom();
    clearListeners();
    if (DEFAULT_CONFIG.useGovernor !== false) {
        _governor = new DebateGovernor();
        setDebateGovernorState(_governor.getState());
    }
    _postProcessor.clearProcessedIds();
    return { ...DEFAULT_CONFIG };
}

function setupDurationTimer(sessionConfig: DebateConfig): void {
    _pauseController = new AbortController();
    const maxDuration = sessionConfig.maxDurationMs ?? 1_800_000;
    _durationTimer = setTimeout(() => {
        if (_activeSession?.status === 'active') {
            LOGGER.warn('DebateService', 'Debate timed out', { maxDuration });
            stopDebate();
        }
    }, maxDuration);
}

function initEngineSession(
    topology: DebateTopology,
    topic: string,
    participants: DebateParticipant[],
    sessionConfig: DebateConfig,
    bridgeCtx: SnapshotBridgeContext,
): DebateSession {
    if (!_engine) throw new Error('No DebateEngine configured');
    const runtimeId = _engine.createSession(
        topology,
        topic,
        participantsToConfig(participants),
        sessionConfig.language === 'en' ? 'English' : 'Russian',
    );
    _runtimeSessionId = runtimeId;
    _bridgeCtx = bridgeCtx;
    setupListeners(runtimeId);
    syncSession();
    const session = _activeSession;
    if (!session) throw new Error('No active session after sync');
    return session;
}

function emitDebateStarted(
    session: DebateSession,
    topic: string,
    matchParticipants: number,
    chatSessionId?: string,
): void {
    if (!_deps) return;
    _deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Debate started: ${topic} with ${matchParticipants} agents`,
        type: 'info',
    });
    _deps.eventBus.emit(EVENTS.DEBATE_STARTED, session);
    if (chatSessionId && session?.id) {
        _deps.sessionManager
            .link(chatSessionId, session.id, 'chat_to_debate', `Debate: ${topic}`)
            .catch(() => {});
        _deps.sessionManager
            .updateMeta(chatSessionId, { linkedDebateId: session.id })
            .catch(() => {});
    }
}

function startEngineWithFinalize(runtimeId: string): void {
    void _engine!
        .startSession(runtimeId)
        .then(() => finalizeInternal())
        .catch((e) => {
            LOGGER.warn('DebateService', 'Engine debate failed', { error: e });
            try {
                syncSession();
                finalizeInternal();
            } catch (inner) {
                LOGGER.error('DebateService', 'Catch body failed', { error: inner });
            }
        });
}

export async function startDebate(
    topic: string,
    participants: DebateParticipant[],
    strategy: DebateStrategy = 'round_robin',
    maxRounds: number = 5,
    config?: Partial<DebateConfig>,
    chatSessionId?: string,
): Promise<DebateSession> {
    if (!_deps) throw new Error('DebateService not initialized');
    LOGGER.info('DebateService', 'Starting debate', {
        topic,
        participants: participants.length,
        strategy,
        maxRounds,
    });
    checkDebatePreflight(participants);
    if (_engineOnly && !_engine)
        throw new Error('debate.engineOnly flag is set but no DebateEngine configured');
    const defaultConfig = resetDebateState();
    const sessionConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
    setupDurationTimer(sessionConfig);
    for (const p of ['groq', 'gemini', 'openrouter', 'nvidia', 'cerebras', 'cloudflare']) {
        try {
            _deps.adapterRegistry.resetCircuitBreaker(p);
        } catch {
            /* ok */
        }
    }
    const session = initEngineSession(
        buildRoundtableTopology(participants),
        topic,
        participants,
        sessionConfig,
        { participants, strategy, maxRounds, config: sessionConfig },
    );
    emitDebateStarted(session, topic, participants.length, chatSessionId);
    startEngineWithFinalize(session.id);
    return session;
}

export async function startTopologyDebate(
    topology: DebateTopology,
    topic: string,
    participants: DebateParticipant[],
    config?: Partial<DebateConfig>,
    chatSessionId?: string,
): Promise<DebateSession> {
    if (!_deps) throw new Error('DebateService not initialized');
    checkDebatePreflight(participants);
    const defaultConfig = resetDebateState();
    const sessionConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
    setupDurationTimer(sessionConfig);
    const session = initEngineSession(topology, topic, participants, sessionConfig, {
        participants,
        strategy: topology.type as DebateSession['strategy'],
        maxRounds: topology.maxDepth ?? 5,
        config: sessionConfig,
    });
    emitDebateStarted(session, topic, participants.length, chatSessionId);
    startEngineWithFinalize(session.id);
    return session;
}

export function stopDebate(sessionId?: string): void {
    const sid = sessionId ?? _runtimeSessionId;
    if (_engine && sid) {
        const snap = _engine.getSession(sid);
        if (
            snap &&
            snap.phase !== 'completed' &&
            snap.phase !== 'failed' &&
            snap.phase !== 'cancelled'
        ) {
            _engine.cancelSession(sid);
        }
        syncSession();
        finalizeInternal();
    }
}

export function destroy(): void {
    _stopHeartbeat();
    clearTimeoutCustom();
    if (_engine && _runtimeSessionId) {
        const snap = _engine.getSession(_runtimeSessionId);
        if (
            snap &&
            snap.phase !== 'completed' &&
            snap.phase !== 'failed' &&
            snap.phase !== 'cancelled'
        ) {
            _engine.cancelSession(_runtimeSessionId);
        }
    }
    clearListeners();
    if (_activeSession && _deps) _deps.sessionManager.saveToDebateHistory(_activeSession);
    clearActiveDebateSession();
    _activeSession = null;
    _engine = null;
    _runtimeSessionId = null;
    _bridgeCtx = null;
    _governor?.reset();
    _governor = null;
    setDebateGovernorState(null);
}

function _stopHeartbeat(): void {
    if (_heartbeatTimer !== null) {
        clearInterval(_heartbeatTimer);
        _heartbeatTimer = null;
    }
}

function clearTimeoutCustom(): void {
    if (_durationTimer !== null) {
        clearTimeout(_durationTimer);
        _durationTimer = null;
    }
    _pauseController?.abort();
    _pauseController = null;
}

function isEngineActive(): boolean {
    return _runtimeSessionId !== null && _engine !== null;
}

function clearListeners(): void {
    for (const unsub of _unsubs) unsub();
    _unsubs = [];
}

function syncSession(): void {
    if (!_engine || !_runtimeSessionId || !_bridgeCtx) return;
    const { session, newArgs } = mergeAndProcessSession(
        _engine,
        _runtimeSessionId,
        _bridgeCtx,
        _postProcessor,
        _governor,
        _activeSession,
    );
    if (!session) return;
    _activeSession = session;
    setActiveDebateSession(session);
    for (const arg of newArgs) {
        _deps!.eventBus.emit(EVENTS.DEBATE_ARGUMENT, {
            sessionId: _runtimeSessionId,
            argument: arg,
        });
    }
    _deps!.eventBus.emit(EVENTS.DEBATE_UPDATED, session);
    if (_governor && checkGovernorStopConditions()) {
        if (_engine && _runtimeSessionId) {
            _engine.cancelSession(_runtimeSessionId);
        }
        stopDebate();
    }
}

function setupListeners(runtimeId: string): void {
    clearListeners();
    const syncIfOurs = (payload: unknown) => {
        const p = payload as { sessionId?: string };
        if (p.sessionId !== runtimeId) return;
        syncSession();
    };
    const events = [
        DebateRuntimeEvents.SESSION_STARTED,
        DebateRuntimeEvents.SESSION_PAUSED,
        DebateRuntimeEvents.SESSION_RESUMED,
        DebateRuntimeEvents.AGENT_RESPONDED,
        DebateRuntimeEvents.PHASE_CHANGED,
        DebateRuntimeEvents.ROUND_STARTED,
        DebateRuntimeEvents.ROUND_ENDED,
        DebateRuntimeEvents.SESSION_COMPLETED,
        DebateRuntimeEvents.SESSION_FAILED,
        DebateRuntimeEvents.SESSION_CANCELLED,
    ];
    for (const event of events) {
        _unsubs.push(_deps!.eventBus.on(event as string, syncIfOurs));
    }
}

function finalizeInternal(): void {
    _stopHeartbeat();
    const session = _activeSession;
    if (!session) return;
    finalizeDebate(session, {
        interpreter: _interpreter,
        sessionManager: _deps!.sessionManager,
        eventBus: _deps!.eventBus,
    });
    clearListeners();
    _runtimeSessionId = null;
    _bridgeCtx = null;
}

export function getSession(): DebateSession | null {
    if (isEngineActive()) {
        syncSession();
    } else {
        setActiveDebateSession(_activeSession);
    }
    if (_governor) {
        setDebateGovernorState(_governor.getState());
    }
    return _activeSession;
}

function checkGovernorStopConditions(): boolean {
    if (!_governor) return false;
    if (!_governor.shouldStop()) return false;

    const synthesis = _governor.generateSynthesis();
    if (_activeSession) {
        const coreDisagreement = synthesis.coreDisagreement;
        const resolvedCount = synthesis.resolvedPoints.length;
        const unresolvedCount = synthesis.unresolvedPoints.length;
        _activeSession.consensus = `## Synthesis\n\n${synthesis.consensus}\n\n### Core Disagreement\n${coreDisagreement}\n\n### Resolved\n${resolvedCount} point(s)\n\n### Unresolved\n${unresolvedCount} point(s)`;
        _deps!.eventBus.emit(EVENTS.DEBATE_CONSENSUS, {
            sessionId: _activeSession.id,
            topic: _activeSession.topic,
            consensus: _activeSession.consensus,
            convergenceScore: _activeSession.convergenceScore,
            synthesis,
        });
    }
    return true;
}

export function getGovernorState(): import('./debate-governor/types').GovernorState | null {
    return _governor?.getState() ?? null;
}

export function getVerdict(sessionId: string): DebateVerdict | undefined {
    return getCachedVerdict(sessionId);
}

export const debateService = {
    get factCheckService() {
        return factCheckService;
    },
    get humanService() {
        return humanService;
    },
    get activeRuntimeSessionId() {
        return _runtimeSessionId;
    },
    setEngine,
    init,
    startDebate,
    startTopologyDebate,
    stopDebate,
    destroy,
    getSession,
    getGovernorState,
    getVerdict,
};

export type {
    DebateStrategy,
    DebateGraphMetrics,
    DebateParticipant,
    DebateArgument,
    DebateConfig,
    DebateSession,
    DebateServiceDeps,
    HumanVote,
} from '../../contracts/debate-types';
export { jaccardSimilarity } from '../../contracts/debate-types';
