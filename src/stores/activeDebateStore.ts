import { create } from 'zustand';
import type { DebateSession } from '../kernel/contracts/debate-types';
import type { GovernorState } from '../kernel/services/debate-runtime/debate-governor/types';

interface ActiveDebateStore {
    session: DebateSession | null;
    governorState: GovernorState | null;
    setSession: (session: DebateSession | null) => void;
    setGovernorState: (state: GovernorState | null) => void;
    clearAll: () => void;
}

export const useActiveDebateStore = create<ActiveDebateStore>((set) => ({
    session: null,
    governorState: null,
    setSession: (session) => set({ session }),
    setGovernorState: (governorState) => set({ governorState }),
    clearAll: () => set({ session: null, governorState: null }),
}));
