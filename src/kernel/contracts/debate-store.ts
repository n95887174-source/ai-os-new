import type { DebateSession } from './debate-types';

export interface IDebateSessionStore {
    readonly session: DebateSession | null;
    readonly governorState: unknown;
    setSession(session: DebateSession | null): void;
    setGovernorState(state: unknown): void;
    clearAll(): void;
}

export interface IDebateLiveStore {
    streamingContent: Map<string, string>;
    emotions: Map<string, unknown>;
    agentCountdowns: Map<string, unknown>;
    agentAddressing: Map<string, string>;
    memoryBubbles: Map<string, unknown>;
    currentThinking: Map<string, string>;
    agentEvents: { length: number };
    roundEvents: { length: number };
    clearSession(sessionId: string): void;
    clearAll(): void;
}

export type SessionStoreSubscriber = (
    listener: (state: { session: DebateSession | null }) => void,
) => () => void;
