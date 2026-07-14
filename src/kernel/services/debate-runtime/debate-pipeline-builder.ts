import { DebatePipeline } from './debate-pipeline';
import { createAgentExecutor } from './debate-agent-executor';
import { gatherClaims } from './debate-consensus';
import { estimateConfidence } from './debate-llm-caller';
import { executePolicyActions } from './debate-policy-engine';
import { rootLogger } from '../logger-service';
import { EVENTS } from '../../events/event-names';
import { ROUND_DELAY_MS } from './debate-round-constants';
import type {
    IDebateSession,
    IDebateBudget,
    ParticipantConfig,
} from '../../contracts/debate-runtime';
import type { IEventBus } from '../../types/interfaces';
import type { IAdapterRegistry } from '../../contracts/provider-adapter';
import type { DebatePolicyEngine } from './debate-policy-engine';
import type { DebateRAGRetriever } from './debate-rag-retriever';
import type { DebateMemoryExtractor } from './debate-memory-extractor';
import type { IDebateEvaluator } from '../../contracts/debate-runtime';
import type { DebateMemory } from './debate-memory';
import type { DebateSessionContext } from './debate-session-context';
import type { DebateBudget } from './debate-budget';

const LOGGER = rootLogger.child('DebatePipelineBuilder');

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

export interface PipelineEngineDeps {
    readonly eventBus: IEventBus;
    readonly policyEngine?: DebatePolicyEngine;
    readonly ragRetriever?: DebateRAGRetriever;
    readonly memoryExtractor?: DebateMemoryExtractor;
    readonly evaluator?: IDebateEvaluator;
    getKeyService(): KeyServiceLike;
    getAdapterRegistry(): IAdapterRegistry;
    getKeyStateStore?(): {
        get(
            id: string,
        ):
            | { flags: { authFailed: boolean; circuitOpen: boolean; rateLimited: boolean } }
            | undefined;
        update(id: string, patch: { flags: Record<string, boolean> }): void;
    };
}

export interface PipelineEngine {
    readonly sessions: Map<string, IDebateSession>;
    readonly budgets: Map<string, IDebateBudget>;
    readonly deps: PipelineEngineDeps;
    getMemory(id: string): DebateMemory;
    getContext(id: string): DebateSessionContext;
    runProviderPreflight(sessionId: string): Promise<void>;
    callLLM(
        sessionId: string,
        session: IDebateSession,
        participant: ParticipantConfig,
        signal?: AbortSignal,
    ): Promise<string>;
    pauseSession(sessionId: string): void;
    providerResolver: {
        isKeyAuthFailed(keyId: string): boolean;
        clearSession(sessionId: string): void;
        clearAll(): void;
    };
    sessionAbortControllers: Map<string, Map<string, AbortController>>;
}

export function buildPipeline(engine: PipelineEngine, isResume: boolean): DebatePipeline {
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
                    .orchestrator.generateRoundEvents(session.topology, sessionId, session.round)) {
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
                            const p = session.participants.find((p) => p.nodeId === event.agentId);
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
                            const pR = session.participants.find((p) => p.nodeId === event.agentId);
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
                            const pE = session.participants.find((p) => p.nodeId === event.agentId);
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
                                session.transition(event.anyBudgetSkipped ? 'paused' : 'failed');
                                if (event.anyBudgetSkipped) {
                                    engine.deps.eventBus.emit(EVENTS.DEBATE_SESSION_PAUSED, {
                                        sessionId,
                                        reason: msg,
                                    });
                                }
                                // Phase handler emits DEBATE_SESSION_FAILED for 'failed' transition
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

                            if (!earlyExit && ROUND_DELAY_MS > 0) {
                                const acMap = engine.sessionAbortControllers.get(sessionId);
                                const anySignal = acMap?.values().next().value?.signal;
                                await new Promise<void>((resolve, reject) => {
                                    const timer = setTimeout(resolve, ROUND_DELAY_MS);
                                    const onAbort2 = () => {
                                        clearTimeout(timer);
                                        reject(new Error('Debate cancelled during round delay'));
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
