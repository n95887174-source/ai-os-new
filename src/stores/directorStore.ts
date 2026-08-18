import { create } from 'zustand';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import { directorRepository } from '../kernel/instances/services-extras';
import type { ConversationSession } from '../kernel/contracts/conversation/session';

export type DirectorStatus = 'idle' | 'running' | 'paused' | 'aborted' | 'completed' | 'error';

export interface DirectorTurnLogEntry {
    participantId: string;
    status: 'running' | 'complete' | 'error';
    success?: boolean;
    error?: string;
    content?: string;
    /** Index of this turn in the scenario's planned turn list (-1 / absent for operator-injected overrides). */
    turnIndex?: number;
    /** True when this turn was injected by an operator override rather than from the scripted plan. */
    injected?: boolean;
}

export interface DirectorStoreState {
    sessionId: string;
    status: DirectorStatus;
    currentParticipantId: string | null;
    turnLog: DirectorTurnLogEntry[];
    /** Past Director runs (live ConversationSession records) persisted to Dexie. */
    history: ConversationSession[];
    loadHistory: () => Promise<void>;
    reset: () => void;
}

/**
 * Application-layer observer for the generic `conversation:*` lifecycle events
 * emitted by `ConversationOrchestrator`. It is intentionally OUTSIDE the kernel:
 * Core only emits observable events; this store decides how to present them.
 * Any policy (Scripted/Hybrid/Debate/Future) driven through the orchestrator is
 * observable here without the Core knowing about the Director, UI, or Debate.
 */
export const useDirectorStore = create<DirectorStoreState>((set) => {
    const subs = [
        eventBus.onSafe<{
            sessionId: string;
            participantId: string;
            turnIndex?: number;
            injected?: boolean;
        }>(EVENTS.CONVERSATION_TURN_START, (d) =>
            set((s) => {
                // A turn starting while paused/aborted (an in-flight turn resuming)
                // must not resurrect `running` — the lifecycle status wins.
                const status =
                    s.status === 'paused' || s.status === 'aborted' ? s.status : 'running';
                return {
                    sessionId: d.sessionId,
                    status,
                    currentParticipantId: d.participantId,
                    turnLog: [
                        ...s.turnLog,
                        {
                            participantId: d.participantId,
                            status: 'running',
                            turnIndex: d.turnIndex,
                            injected: d.injected,
                        },
                    ],
                };
            }),
        ),
        eventBus.onSafe<{
            sessionId: string;
            participantId: string;
            success: boolean;
            content?: string;
            turnIndex?: number;
            injected?: boolean;
        }>(EVENTS.CONVERSATION_TURN_COMPLETE, (d) =>
            set((s) => {
                const log = [...s.turnLog];
                const idx = log.findIndex(
                    (e) => e.participantId === d.participantId && e.status === 'running',
                );
                if (idx >= 0) {
                    const entry = log[idx]!;
                    log[idx] = {
                        ...entry,
                        status: 'complete',
                        success: d.success,
                        content: d.content,
                        turnIndex: d.turnIndex,
                        injected: d.injected,
                    };
                }
                // A turn completing after a pause/abort must not resurrect `running`.
                const status =
                    s.status === 'paused' || s.status === 'aborted' ? s.status : 'running';
                return { status, currentParticipantId: null, turnLog: log };
            }),
        ),
        eventBus.onSafe<{
            sessionId: string;
            participantId: string;
            error: string;
            turnIndex?: number;
            injected?: boolean;
        }>(EVENTS.CONVERSATION_TURN_ERROR, (d) =>
            set((s) => {
                const log = [...s.turnLog];
                const idx = log.findIndex(
                    (e) => e.participantId === d.participantId && e.status === 'running',
                );
                if (idx >= 0) {
                    const entry = log[idx]!;
                    log[idx] = {
                        ...entry,
                        status: 'error',
                        success: false,
                        error: d.error,
                        turnIndex: d.turnIndex,
                        injected: d.injected,
                    };
                }
                const status = s.status === 'paused' || s.status === 'aborted' ? s.status : 'error';
                return { status, currentParticipantId: null, turnLog: log };
            }),
        ),
        eventBus.onSafe<{ sessionId: string }>(EVENTS.CONVERSATION_PAUSED, (d) =>
            set({ status: 'paused', sessionId: d.sessionId }),
        ),
        eventBus.onSafe<{ sessionId: string }>(EVENTS.CONVERSATION_RESUMED, (d) =>
            set({ status: 'running', sessionId: d.sessionId }),
        ),
        eventBus.onSafe<{ sessionId: string }>(EVENTS.CONVERSATION_ABORTED, (d) =>
            set({ status: 'aborted', sessionId: d.sessionId }),
        ),
        eventBus.onSafe<{ sessionId: string }>(EVENTS.CONVERSATION_COMPLETED, (d) =>
            set({ status: 'completed', sessionId: d.sessionId }),
        ),
    ];
    // Keep the reference so a future HMR dispose can unsubscribe if needed.
    void subs;

    return {
        sessionId: '',
        status: 'idle',
        currentParticipantId: null,
        turnLog: [],
        history: [],
        loadHistory: async () => {
            let all: ConversationSession[] = [];
            try {
                all = await directorRepository.list();
            } catch {
                return;
            }
            set({ history: all });
        },
        reset: () =>
            set({
                sessionId: '',
                status: 'idle',
                currentParticipantId: null,
                turnLog: [],
            }),
    };
});
