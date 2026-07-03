import { genId } from '../../utils/gen-id';
import { rootLogger } from './logger-service';
import { EventBus } from '../events/event-bus';
import { EVENTS } from '../events/event-names';

const LOGGER = rootLogger.child('ForkService');

export interface ForkPoint {
    sessionId: string;
    messageId: string;
    messageIndex: number;
    timestamp: number;
}

export interface ForkedSession {
    originalSessionId: string;
    forkPoint: ForkPoint;
    createdAt: number;
    messageCount: number;
}

class ForkConversationService {
    private forks: Map<string, ForkedSession> = new Map();

    private async db(): Promise<import('../types/interfaces').IDatabaseService> {
        const { database } = await import('../instances');
        return database;
    }

    async init(): Promise<void> {
        const d = await this.db();
        const saved = await d.getKv<[string, ForkedSession][]>('fork_data');
        if (saved) {
            for (const [id, fork] of saved) {
                this.forks.set(id, fork);
            }
        }
        LOGGER.info('ForkService', `Initialized with ${this.forks.size} forks`);
    }

    async fork(
        originalSessionId: string,
        messageId: string,
        messages: Array<{ id: string; role: string; content: string; timestamp: number }>,
    ): Promise<ForkedSession> {
        const forkId = genId('fork');
        const messageIndex = messages.findIndex((m) => m.id === messageId);

        if (messageIndex === -1) {
            throw new Error(`Message ${messageId} not found in session`);
        }

        const forkPoint: ForkPoint = {
            sessionId: originalSessionId,
            messageId,
            messageIndex,
            timestamp: Date.now(),
        };

        const forkedSession: ForkedSession = {
            originalSessionId,
            forkPoint,
            createdAt: Date.now(),
            messageCount: messages.slice(0, messageIndex + 1).length,
        };

        this.forks.set(forkId, forkedSession);
        await this.save();

        EventBus.emit(EVENTS.CHAT_FORKED, { forkId, ...forkedSession });
        LOGGER.info('ForkService', 'Conversation forked', {
            forkId,
            messageId,
            messageCount: forkedSession.messageCount,
        });

        return forkedSession;
    }

    getFork(forkId: string): ForkedSession | undefined {
        return this.forks.get(forkId);
    }

    getForksForSession(sessionId: string): ForkedSession[] {
        return Array.from(this.forks.values())
            .filter((f) => f.originalSessionId === sessionId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    getForkTree(sessionId: string): {
        original: { id: string; messageCount: number; createdAt: number };
        branches: Array<{
            forkId: string;
            forkPoint: ForkPoint;
            messageCount: number;
            createdAt: number;
        }>;
    } {
        const forks = this.getForksForSession(sessionId);
        return {
            original: { id: sessionId, messageCount: 0, createdAt: 0 },
            branches: forks.map((f) => ({
                forkId:
                    Array.from(this.forks.entries()).find(
                        ([id]) => this.forks.get(id) === f,
                    )?.[0] || '',
                forkPoint: f.forkPoint,
                messageCount: f.messageCount,
                createdAt: f.createdAt,
            })),
        };
    }

    async deleteFork(forkId: string): Promise<boolean> {
        const deleted = this.forks.delete(forkId);
        if (deleted) {
            await this.save();
            LOGGER.info('ForkService', 'Fork deleted', { forkId });
        }
        return deleted;
    }

    getAllForks(): ForkedSession[] {
        return Array.from(this.forks.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    private async save(): Promise<void> {
        const d = await this.db();
        await d.setKv('fork_data', Array.from(this.forks.entries()));
    }
}

export const forkConversationService = new ForkConversationService();
