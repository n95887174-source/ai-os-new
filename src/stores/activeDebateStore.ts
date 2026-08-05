/**
 * Active debate session metadata — which debate is currently selected/active.
 * Separate from debateLiveStore (streaming UI state) and debate-session-store (DB persistence).
 */
import { create } from 'zustand';
import type { DebateSession } from '../kernel/contracts/debate-types';
import type { GovernorState } from '../kernel/services/debate-runtime/debate-governor/types';
import type { IDebateSessionStore } from '../kernel/contracts/debate-store';

export type { IDebateSessionStore };

export function createDebateSessionStoreAdapter(): IDebateSessionStore {
    return {
        get session() {
            return useActiveDebateStore.getState().session;
        },
        get governorState() {
            return useActiveDebateStore.getState().governorState;
        },
        setSession: (session) => useActiveDebateStore.getState().setSession(session),
        setGovernorState: (state) =>
            useActiveDebateStore.getState().setGovernorState(state as never),
        clearAll: () => useActiveDebateStore.getState().clearAll(),
    };
}

export const useActiveDebateStore = create<{
    session: DebateSession | null;
    governorState: GovernorState | null;
    setSession: (session: DebateSession | null) => void;
    setGovernorState: (state: GovernorState | null) => void;
    clearAll: () => void;
}>((set) => ({
    session: null,
    governorState: null,
    setSession: (session) => set({ session }),
    setGovernorState: (governorState) => set({ governorState }),
    clearAll: () => set({ session: null, governorState: null }),
}));
