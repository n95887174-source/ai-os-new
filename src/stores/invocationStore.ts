import { create } from 'zustand';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import { invocationRepository, invocationCostTracker } from '../kernel/instances/services-extras';
import type {
    AgentRef,
    ExecutionTarget,
    Invocation,
    InvocationCaller,
    InvocationContext,
    InvocationStatus,
    InvocationTarget,
} from '../kernel/contracts/invocation';

export interface InvocationView {
    id: string;
    status: InvocationStatus;
    caller?: InvocationCaller;
    target?: InvocationTarget;
    context?: InvocationContext;
    reason?: string;
    policyRef?: string;
    agents?: AgentRef[];
    sessionRef?: ExecutionTarget;
    rejectionReason?: string;
    updatedAt: number;
}

export interface InvocationLogEntry {
    at: number;
    event: string;
    invocationId: string;
    detail?: string;
}

export interface ExecutionFeedEntry {
    at: number;
    kind: 'turn-start' | 'turn-complete' | 'turn-error';
    text: string;
}

export interface InvocationStoreState {
    invocations: Record<string, InvocationView>;
    order: string[];
    log: InvocationLogEntry[];
    feed: ExecutionFeedEntry[];
    /** Per-invocation accumulated cost (USD) from the cost-attribution table. */
    costs: Record<string, number>;
    loadHistory: () => Promise<void>;
    loadCosts: () => Promise<void>;
    clear: () => void;
}

/**
 * Application-layer observer for the Invocation Engine's `invocation:*` intent
 * lifecycle (D7) plus the `conversation:*` events emitted by the execution
 * subsystem. It is intentionally OUTSIDE the kernel: the Engine only emits
 * observable events; this store decides how to present them. The Room UI is a
 * pure consumer — it never writes the `Invocation` aggregate.
 */
export const useInvocationStore = create<InvocationStoreState>((set) => {
    const upsert = (id: string, patch: Partial<InvocationView>) =>
        set((s) => {
            const existing = s.invocations[id];
            const next: InvocationView = {
                id,
                status: 'requested',
                ...existing,
                ...patch,
                updatedAt: Date.now(),
            };
            const order = s.order.includes(id) ? s.order : [...s.order, id];
            return { invocations: { ...s.invocations, [id]: next }, order };
        });

    const subs = [
        eventBus.onSafe<{
            invocationId: string;
            caller: InvocationCaller;
            target: InvocationTarget;
            context: InvocationContext;
        }>(EVENTS.INVOCATION_REQUESTED, (d) => {
            upsert(d.invocationId, {
                status: 'requested',
                caller: d.caller,
                target: d.target,
                context: d.context,
            });
            set((s) => ({
                log: [
                    ...s.log,
                    { at: Date.now(), event: 'requested', invocationId: d.invocationId },
                ],
            }));
        }),
        eventBus.onSafe<{ invocationId: string; policyRef: string; agents: AgentRef[] }>(
            EVENTS.INVOCATION_ACCEPTED,
            (d) => {
                upsert(d.invocationId, {
                    status: 'accepted',
                    policyRef: d.policyRef,
                    agents: d.agents,
                });
                set((s) => ({
                    log: [
                        ...s.log,
                        { at: Date.now(), event: 'accepted', invocationId: d.invocationId },
                    ],
                }));
            },
        ),
        eventBus.onSafe<{ invocationId: string; reason: string }>(
            EVENTS.INVOCATION_REJECTED,
            (d) => {
                upsert(d.invocationId, { status: 'rejected', rejectionReason: d.reason });
                set((s) => ({
                    log: [
                        ...s.log,
                        {
                            at: Date.now(),
                            event: 'rejected',
                            invocationId: d.invocationId,
                            detail: d.reason,
                        },
                    ],
                }));
            },
        ),
        eventBus.onSafe<{ invocationId: string; sessionRef: ExecutionTarget }>(
            EVENTS.INVOCATION_EXECUTING,
            (d) => {
                upsert(d.invocationId, { status: 'executing', sessionRef: d.sessionRef });
                set((s) => ({
                    log: [
                        ...s.log,
                        {
                            at: Date.now(),
                            event: 'executing',
                            invocationId: d.invocationId,
                            detail: d.sessionRef.ref,
                        },
                    ],
                }));
            },
        ),
        eventBus.onSafe<{ invocationId: string; resultRef?: string }>(
            EVENTS.INVOCATION_DONE,
            (d) => {
                upsert(d.invocationId, { status: 'done' });
                set((s) => ({
                    log: [
                        ...s.log,
                        {
                            at: Date.now(),
                            event: 'done',
                            invocationId: d.invocationId,
                            detail: d.resultRef,
                        },
                    ],
                }));
                // Reload accumulated cost now that the invocation's turns have
                // streamed and populated the cost-attribution table.
                void useInvocationStore.getState().loadCosts();
            },
        ),
        // Live output from the execution subsystem (ConversationCore / Director).
        eventBus.onSafe<{ sessionId: string; participantId: string }>(
            EVENTS.CONVERSATION_TURN_START,
            (d) =>
                set((s) => ({
                    feed: [
                        ...s.feed,
                        { at: Date.now(), kind: 'turn-start', text: `▶ ${d.participantId}` },
                    ],
                })),
        ),
        eventBus.onSafe<{ sessionId: string; participantId: string; content?: string }>(
            EVENTS.CONVERSATION_TURN_COMPLETE,
            (d) =>
                set((s) => ({
                    feed: [
                        ...s.feed,
                        {
                            at: Date.now(),
                            kind: 'turn-complete',
                            text: `${d.participantId}: ${d.content ?? ''}`,
                        },
                    ],
                })),
        ),
        eventBus.onSafe<{ sessionId: string; participantId: string; error: string }>(
            EVENTS.CONVERSATION_TURN_ERROR,
            (d) =>
                set((s) => ({
                    feed: [
                        ...s.feed,
                        {
                            at: Date.now(),
                            kind: 'turn-error',
                            text: `✖ ${d.participantId}: ${d.error}`,
                        },
                    ],
                })),
        ),
    ];
    void subs;

    return {
        invocations: {},
        order: [],
        log: [],
        feed: [],
        costs: {},
        loadHistory: async () => {
            let all: Invocation[] = [];
            try {
                all = await invocationRepository.list();
            } catch {
                return;
            }
            set((s) => {
                const invocations: Record<string, InvocationView> = { ...s.invocations };
                for (const inv of all) {
                    invocations[inv.id] = {
                        id: inv.id,
                        status: inv.status,
                        caller: inv.caller,
                        target: inv.target,
                        context: inv.context,
                        reason: inv.reason,
                        policyRef: inv.policyRef,
                        agents: inv.resolvedAgents,
                        sessionRef: inv.sessionRef,
                        rejectionReason: inv.rejectionReason,
                        updatedAt: inv.updatedAt,
                    };
                }
                const order = Object.values(invocations)
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map((v) => v.id);
                return { invocations, order };
            });
        },
        loadCosts: async () => {
            let costs: Record<string, number> = {};
            try {
                costs = await invocationCostTracker.getAllCosts();
            } catch {
                return;
            }
            set({ costs });
        },
        clear: () => set({ invocations: {}, order: [], log: [], feed: [], costs: {} }),
    };
});
