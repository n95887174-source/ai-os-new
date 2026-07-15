import type { IEventBus } from '../../types/interfaces';
import { rootLogger } from '../logger-service';
import { EVENTS } from '../../events/event-names';
import { validateAndSaveVerdict } from './debate-conclusion-engine';
import type { DebateSession as DebateSessionClass } from './debate-session';
import type { DebateSessionContext } from './debate-session-context';
import type { DebateMemory } from './debate-memory';
import type { TimelineEntry } from '../../contracts/debate-runtime';
import type { DebateStore } from '../../contracts/storage/debate-store';
import type { DebateMemoryExtractor } from './debate-memory-extractor';
import type { IDebateEvaluator } from '../../contracts/debate-runtime';

const LOGGER = rootLogger.child('DebatePhaseHandler');

interface PhaseHandlerDeps {
    eventBus: IEventBus;
    debateStore?: DebateStore;
    memoryExtractor?: DebateMemoryExtractor;
    evaluator?: IDebateEvaluator;
}

interface PhaseHandlerGetters {
    getContext: (id: string) => DebateSessionContext;
    getMemory: (id: string) => DebateMemory;
    getTimeline: (id: string) => TimelineEntry[];
    saveSnapshot: (id: string) => Promise<void>;
}

export function createPhaseChangeHandler(
    sessionId: string,
    session: DebateSessionClass,
    deps: PhaseHandlerDeps,
    getters: PhaseHandlerGetters,
    logSuffix?: string,
): (from: string, to: string) => void {
    return (from: string, to: string) => {
        const ctx = getters.getContext(sessionId);
        if (!ctx) return;
        ctx.timeline?.record({
            sessionId,
            type: `session:${to}`,
            payload: { from, to },
        });
        deps.eventBus.emit(EVENTS.DEBATE_PHASE_CHANGED, {
            sessionId,
            from,
            to,
        });

        if (to === 'completed' || to === 'failed' || to === 'cancelled') {
            deps.eventBus.emit(
                to === 'completed'
                    ? EVENTS.DEBATE_SESSION_COMPLETED
                    : to === 'failed'
                      ? EVENTS.DEBATE_SESSION_FAILED
                      : EVENTS.DEBATE_SESSION_CANCELLED,
                {
                    sessionId,
                    error:
                        to === 'failed'
                            ? session.snapshot().agentStates.find((s) => s.error)?.error
                            : undefined,
                },
            );
            if (to === 'completed') {
                const snap =
                    session.snapshot() as import('../../contracts/debate-runtime').DebateSessionSnapshot;
                const tl = getters.getTimeline(sessionId);
                getters
                    .getContext(sessionId)
                    .conclusionEngine.generateVerdictWithLLM(snap, tl)
                    .then((verdict) => {
                        const store = deps.debateStore;
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
                                LOGGER.warn('DebatePhaseHandler', 'verdict persist failed', {
                                    error: e,
                                }),
                            );
                        }
                        deps.eventBus.emit(EVENTS.DEBATE_VERDICT_GENERATED, {
                            sessionId,
                            verdict,
                        });
                    })
                    .catch((e) =>
                        LOGGER.warn(
                            'DebatePhaseHandler',
                            'LLM-enhanced verdict failed, using heuristic',
                            { error: e },
                        ),
                    );

                if (deps.memoryExtractor) {
                    try {
                        const extracted = deps.memoryExtractor.extractFromTimeline(sessionId, tl);
                        LOGGER.info(
                            'DebatePhaseHandler',
                            `Memory extraction complete${logSuffix ?? ''}`,
                            {
                                sessionId,
                                units: extracted.units.length,
                                ...extracted.summary,
                            },
                        );

                        if (deps.evaluator) {
                            const claims = deps.memoryExtractor.extractClaims(extracted.units);
                            for (const p of session.participants) {
                                const chain = getters.getMemory(sessionId).getChain(p.agentId);
                                const score = deps.evaluator.scoreArguments(
                                    p.agentId,
                                    claims,
                                    chain,
                                );
                                deps.eventBus.emit(EVENTS.DEBATE_AGENT_PHASE_CHANGED, {
                                    sessionId,
                                    agentId: p.agentId,
                                    from: 'completed',
                                    to: JSON.stringify(score),
                                });
                            }
                        }
                    } catch (e) {
                        LOGGER.warn(
                            'DebatePhaseHandler',
                            `Memory extraction failed${logSuffix ?? ''}`,
                            {
                                error: e,
                                sessionId,
                            },
                        );
                    }
                }
            }
            getters
                .saveSnapshot(sessionId)
                .catch((e) =>
                    LOGGER.warn('DebatePhaseHandler', 'auto-checkpoint failed', { error: e }),
                );
        }
    };
}
