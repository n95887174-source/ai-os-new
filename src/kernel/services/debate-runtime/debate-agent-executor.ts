import type { AgentExecutor, ParticipantConfig } from '../../contracts/debate-runtime';
import { DebateRuntimeEvents } from '../../events/debate-runtime-events';
import type { IEventBus } from '../../types/interfaces';
import type { DebateProviderResolver } from './debate-query-engine';

interface KeyServiceLike {
    getKeys(): Array<{
        id: string;
        key: string;
        provider: string;
        status: string;
        model?: string;
        availableModels?: string[];
    }>;
}

export interface AgentExecutorDeps {
    getSession(sessionId: string): IDebateSessionLike | undefined;
    getBudget(sessionId: string): IDebateBudgetLike | undefined;
    eventBus: IEventBus;
    getKeyService(): KeyServiceLike;
    callLLM(
        sessionId: string,
        session: IDebateSessionLike,
        participant: ParticipantConfig,
        signal?: AbortSignal,
    ): Promise<string>;
    providerResolver: DebateProviderResolver;
    findParticipant(sessionId: string, nodeId: string): ParticipantConfig | undefined;
}

interface IDebateSessionLike {
    readonly agentStates: Map<string, { agentId: string; phase: string }>;
    readonly participants: ParticipantConfig[];
    recordUsage(agentId: string, tokensIn: number, tokensOut: number, latency: number): void;
    hasProviderFailed(provider: string): boolean;
}

interface IDebateBudgetLike {
    reserveAndRecord(id: string, tokens: number, cost: number): Promise<boolean>;
    getPressureAction(): string;
    getPressure(): string;
    snapshot(): { tokensUsed: number };
}

export function createAgentExecutor(sessionId: string, deps: AgentExecutorDeps): AgentExecutor {
    return async (request) => {
        const session = deps.getSession(sessionId);
        if (!session) {
            return { content: '', latency: 0, success: false, error: 'Session not found' };
        }

        const participant = deps.findParticipant(sessionId, request.nodeId);
        if (!participant) {
            return { content: '', latency: 0, success: false, error: 'Participant not found' };
        }

        const budget = deps.getBudget(sessionId);
        if (budget) {
            const allowed = await budget.reserveAndRecord(sessionId, 250, 250 * 0.000002);
            if (!allowed) {
                const action = budget.getPressureAction();
                deps.eventBus.emit(DebateRuntimeEvents.BUDGET_PRESSURE_CHANGED, {
                    sessionId,
                    level: budget.getPressure(),
                    action,
                });
                return {
                    content: '',
                    latency: 0,
                    success: false,
                    budgetSkipped: true,
                    error: 'Budget exceeded',
                };
            }
        }

        const startTime = performance.now();
        try {
            const content = await deps.callLLM(sessionId, session, participant);
            const latency = performance.now() - startTime;

            if (budget) {
                session.recordUsage(participant.agentId, 0, 0, Math.round(latency));
                deps.eventBus.emit(DebateRuntimeEvents.BUDGET_UPDATED, {
                    sessionId,
                    pressure: budget.getPressure(),
                    used: budget.snapshot().tokensUsed,
                    limit: 100_000,
                });
            }

            return { content, latency, success: true };
        } catch (e) {
            const latency = performance.now() - startTime;
            const error = String(e);

            const noProvidersAvailable =
                error.includes('No available API keys') ||
                error.includes('No adapter for provider');
            if (noProvidersAvailable) {
                const keyService = deps.getKeyService();
                const allKeys = keyService.getKeys();
                const anyWorking = allKeys.some(
                    (k) =>
                        k.status === 'active' &&
                        !session.hasProviderFailed(k.provider) &&
                        !deps.providerResolver.isKeyAuthFailed(k.id),
                );
                if (!anyWorking) {
                    return {
                        content: '',
                        latency,
                        success: false,
                        error: 'All LLM providers unavailable — debate cannot proceed',
                    };
                }
            }

            return { content: '', latency, success: false, error };
        }
    };
}
