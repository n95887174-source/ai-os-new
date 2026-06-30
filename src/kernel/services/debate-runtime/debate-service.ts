import { EVENTS } from '../../events/event-names';
import { CONFIG } from '../config-registry';

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
import { FactCheckService } from '../fact-check-service';
import { DebateHumanService } from './debate-human-service';
import { loadActiveSession } from './debate-session-persistence';
import { rootLogger } from '../logger-service';
import { getCachedVerdict, setCachedVerdict } from '../../verdict-cache';
import { buildRoundtableTopology } from './debate-session-bridge';
import { checkDebatePreflight } from './debate-preflight';
import { DebateSyncManager } from './debate-sync-manager';
import { setActiveDebateSession, setDebateGovernorState } from './active-debate-store';

const LOGGER = rootLogger.child('DebateService');

let _deps: DebateServiceDeps;
let _syncManager: DebateSyncManager;
let _engineOnly = false;

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
    _syncManager = new DebateSyncManager(new DebatePostProcessor({ factCheckService }));
    _syncManager.deps = deps;
    humanService = new DebateHumanService(deps.eventBus, deps.debateStore, {
        updateConvergenceScore: (session) =>
            _syncManager.postProcessor.updateConvergenceScore(session),
    });
}

export function setEngine(engine: IDebateEngine): void {
    _syncManager.engine = engine;
}

export function getRuntimeSessionId(): string | null {
    return _syncManager.runtimeSessionId;
}

export async function init() {
    if (!_deps) return;
    _syncManager.activeSession = await loadActiveSession(_deps.debateStore);
    _deps.eventBus.on(EVENTS.DEBATE_VERDICT_GENERATED, (data) => {
        const payload = data as { sessionId: string; verdict: DebateVerdict };
        setCachedVerdict(payload.sessionId, payload.verdict);
    });
    _deps.eventBus.on(EVENTS.SESSION_DELETED, (data) => {
        const payload = data as { id: string; type: string };
        if (payload.type !== 'debate') return;
        if (
            payload.id === _syncManager.runtimeSessionId ||
            payload.id === _syncManager.activeSession?.id
        ) {
            LOGGER.info('DebateService', `Debate session ${payload.id} deleted — cancelling`);
            stopDebate();
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
    checkDebatePreflight(_deps, participants);
    if (_engineOnly && !_syncManager.engine)
        throw new Error('debate.engineOnly flag is set but no DebateEngine configured');
    const sessionConfig = _syncManager.resetDebateState();
    if (config) Object.assign(sessionConfig, config);
    _syncManager.setupDurationTimer(sessionConfig);
    for (const p of ['groq', 'gemini', 'openrouter', 'nvidia', 'cerebras', 'cloudflare']) {
        try {
            _deps.adapterRegistry.resetCircuitBreaker(p);
        } catch {
            /* ok */
        }
    }
    const session = _syncManager.initEngineSession(
        buildRoundtableTopology(participants),
        topic,
        participants,
        sessionConfig,
        { participants, strategy, maxRounds, config: sessionConfig },
    );
    _syncManager.emitDebateStarted(session, topic, participants.length, chatSessionId);
    _syncManager.startEngineWithFinalize(session.id);
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
    checkDebatePreflight(_deps, participants);
    const sessionConfig = _syncManager.resetDebateState();
    if (config) Object.assign(sessionConfig, config);
    _syncManager.setupDurationTimer(sessionConfig);
    const session = _syncManager.initEngineSession(topology, topic, participants, sessionConfig, {
        participants,
        strategy: topology.type as DebateSession['strategy'],
        maxRounds: topology.maxDepth ?? 5,
        config: sessionConfig,
    });
    _syncManager.emitDebateStarted(session, topic, participants.length, chatSessionId);
    _syncManager.startEngineWithFinalize(session.id);
    return session;
}

export function stopDebate(sessionId?: string): void {
    _syncManager.stopDebateInternal(sessionId);
}

export function destroy(): void {
    _syncManager.destroy();
}

export function getSession(): DebateSession | null {
    if (_syncManager.isEngineActive()) {
        _syncManager.syncSession();
    } else {
        setActiveDebateSession(_syncManager.activeSession);
    }
    if (_syncManager.governor) {
        setDebateGovernorState(_syncManager.governor.getState());
    }
    return _syncManager.activeSession;
}

export function getGovernorState(): import('./debate-governor/types').GovernorState | null {
    return _syncManager.governor?.getState() ?? null;
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
        return _syncManager.runtimeSessionId;
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
