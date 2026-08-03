/**
 * No-op fallback implementations of the UI debate-store contracts.
 *
 * The real adapters live in `src/stores/` (zustand-backed) and are registered
 * into the DI container by the UI composition root. Kernel service-registration
 * phases resolve them via `container.getOptional(...)` and fall back to these
 * in-memory stubs when no UI is present (tests, headless runs). This keeps the
 * kernel free of any `src/stores/` import (layer rule: kernel must not import UI).
 */
import type {
    IDebateSessionStore,
    IDebateLiveStore,
    SessionStoreSubscriber,
} from '../../contracts/debate-store';
import type { DebateSession } from '../../contracts/debate-types';

/** In-memory stub for the active-debate session store. */
export function createFallbackDebateSessionStore(): IDebateSessionStore {
    let session: DebateSession | null = null;
    let governorState: unknown = null;
    return {
        get session() {
            return session;
        },
        get governorState() {
            return governorState;
        },
        setSession: (s) => {
            session = s;
        },
        setGovernorState: (state) => {
            governorState = state;
        },
        clearAll: () => {
            session = null;
            governorState = null;
        },
    };
}

/** In-memory stub for the live debate UI store. */
export function createFallbackDebateLiveStore(): IDebateLiveStore {
    return {
        streamingContent: new Map(),
        emotions: new Map(),
        agentCountdowns: new Map(),
        agentAddressing: new Map(),
        memoryBubbles: new Map(),
        currentThinking: new Map(),
        agentEvents: [],
        roundEvents: [],
        clearSession: () => {
            /* no-op */
        },
        clearAll: () => {
            /* no-op */
        },
    };
}

/** No-op session-change subscriber for headless runs. */
export const fallbackSessionStoreSubscriber: SessionStoreSubscriber = () => () => {};
