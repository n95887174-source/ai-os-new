import type { IExecutionEngine, TurnResult } from '../contracts/conversation/execution';
import type { TurnProposal } from '../contracts/conversation/turn';
import type { ConversationContext } from '../contracts/conversation/context';
import type { IAgentResolver } from '../contracts/conversation/agent-resolver';
import type { QueuedRequest } from '../types/chat-types';
import type { IEventBus } from '../types/interfaces';
import { EVENTS } from '../events/event-registry';

/**
 * Minimal adapter surface required from ChatExecutor.
 * Keeps ExecutionEngine decoupled from ChatExecutor concrete type.
 */
export interface IChatExecutorAdapter {
    handleMessage(req: QueuedRequest): void;
    cancelRequest(requestId: string): void;
}

/**
 * Real ExecutionEngine: bridges Conversation Core `Turn` to the
 * existing ChatExecutor infrastructure. `Turn` stays the language of
 * the Core; ChatExecutor is an internal detail.
 */
export class ChatExecutionEngine implements IExecutionEngine {
    constructor(
        private readonly chatExecutor: IChatExecutorAdapter,
        private readonly eventBus: IEventBus,
        private readonly agentResolver?: IAgentResolver,
    ) {}

    async execute(
        proposal: TurnProposal,
        context: ConversationContext,
        sessionSignal: AbortSignal,
    ): Promise<TurnResult> {
        const requestId = crypto.randomUUID();

        const historyMessages = context.history.map((h) => ({ role: h.role, content: h.content }));

        // B-seam: resolve the participant to a real agent so the turn is
        // actually spoken by that agent (persona + pinned model), not just
        // stamped into metadata.agentId.
        const agent = this.agentResolver?.resolveAgent(proposal.participantId) ?? null;
        const personaMessage = agent?.systemPrompt
            ? { role: 'system' as const, content: agent.systemPrompt }
            : null;

        const promptContent = [
            `${proposal.objective.type}: ${proposal.objective.description}`,
            proposal.objective.constraints.length
                ? `Constraints: ${proposal.objective.constraints.join('; ')}`
                : '',
            proposal.targetTurnId ? `Target: ${proposal.targetTurnId}` : '',
        ]
            .filter(Boolean)
            .join('\n');

        const req: QueuedRequest = {
            requestId,
            provider: 'auto',
            model: agent?.model ?? 'default',
            messages: [
                ...(personaMessage ? [personaMessage] : []),
                ...historyMessages,
                { role: 'user', content: promptContent },
            ] as QueuedRequest['messages'],
            options: {
                metadata: {
                    agentId: proposal.participantId,
                    participantName: agent?.name,
                    participantRole:
                        agent?.role ??
                        context.participants.find((p) => p.id === proposal.participantId)?.role,
                    objective: proposal.objective.type,
                },
                sessionId: (context.metadata['sessionId'] as string) ?? requestId,
            },
        };

        return new Promise<TurnResult>((resolve) => {
            const onResponse = (res: {
                requestId?: string;
                content?: string;
                status?: string;
                error?: string;
                tokens?: number;
            }) => {
                if (res.requestId !== requestId) return;
                cleanup();
                if (res.status === 'error' || res.status === 'cancelled') {
                    resolve({
                        success: false,
                        error: res.error ?? 'Chat error',
                        content: res.content,
                        tokens: res.tokens,
                    });
                } else {
                    resolve({ success: true, content: res.content, tokens: res.tokens });
                }
            };

            const onError = (err: { requestId?: string; error?: string }) => {
                if (err.requestId !== requestId) return;
                cleanup();
                resolve({ success: false, error: err.error ?? 'Stream error' });
            };

            const onAbort = () => {
                cleanup();
                this.chatExecutor.cancelRequest(requestId);
                resolve({ success: false, error: 'Aborted by session signal' });
            };

            const unsubResponse = this.eventBus.on(EVENTS.MESSAGE_RESPONSE, onResponse);
            const unsubError = this.eventBus.on(EVENTS.STREAM_ERROR, onError);

            const cleanup = () => {
                unsubResponse?.();
                unsubError?.();
                sessionSignal.removeEventListener('abort', onAbort);
            };
            sessionSignal.addEventListener('abort', onAbort);

            this.chatExecutor.handleMessage(req);
        });
    }

    /** No persistent subscriptions: per-call listeners are released in `cleanup()` above. */
    destroy(): void {}
}
