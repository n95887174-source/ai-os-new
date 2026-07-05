import type { DebateSession, HumanVote } from '../contracts/debate-types';
import { EVENTS } from '../events/event-names';
import { useActiveDebateStore } from '../../stores/activeDebateStore';

export type CollabRole = 'pro' | 'con' | 'judge' | 'neutral';

export interface HumanParticipant {
    userName: string;
    role: CollabRole;
    joinedAt: number;
}

interface CollabSession {
    sessionId: string;
    participants: HumanParticipant[];
}

interface CollabServiceDeps {
    eventBus: {
        emit: (event: string, payload: unknown) => void;
        onSafe: <T>(event: string, handler: (data: T) => void) => () => void;
    };
    humanService: {
        addArgument: (
            session: DebateSession | null,
            agentName: string,
            content: string,
            confidence?: number,
            options?: { position?: 'pro' | 'con' | 'neutral' },
        ) => Promise<void>;
    };
}

export class CollaborativeService {
    private sessions = new Map<string, CollabSession>();

    constructor(private deps: CollabServiceDeps) {}

    joinDebate(sessionId: string, userName: string, role: CollabRole): boolean {
        let session = this.sessions.get(sessionId);
        if (!session) {
            session = { sessionId, participants: [] };
            this.sessions.set(sessionId, session);
        }
        if (session.participants.some((p) => p.userName === userName)) return false;
        session.participants.push({ userName, role, joinedAt: Date.now() });
        this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, useActiveDebateStore.getState().session);
        return true;
    }

    leaveDebate(sessionId: string, userName: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        session.participants = session.participants.filter((p) => p.userName !== userName);
        if (session.participants.length === 0) this.sessions.delete(sessionId);
        this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, useActiveDebateStore.getState().session);
    }

    getParticipants(sessionId: string): HumanParticipant[] {
        return this.sessions.get(sessionId)?.participants ?? [];
    }

    async submitArgument(sessionId: string, userName: string, content: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        const participant = session.participants.find((p) => p.userName === userName);
        if (!participant) return false;
        const position =
            participant.role === 'judge'
                ? ('neutral' as const)
                : (participant.role as 'pro' | 'con');
        const active = useActiveDebateStore.getState().session;
        if (!active) return false;
        await this.deps.humanService.addArgument(active, userName, content, 1.0, { position });
        return true;
    }

    async submitVote(
        sessionId: string,
        userName: string,
        votedAgentId: string,
        score: number,
    ): Promise<void> {
        const vote: HumanVote = {
            round: useActiveDebateStore.getState().session?.currentRound ?? 0,
            voter: 'human',
            votedAgentId,
            score,
            timestamp: Date.now(),
        };
        this.deps.eventBus.emit(EVENTS.DEBATE_HUMAN_VOTE, { sessionId, vote, userName });
    }

    getCollabDebateSessionId(): string | null {
        const s = useActiveDebateStore.getState().session;
        return s?.id ?? null;
    }
}
