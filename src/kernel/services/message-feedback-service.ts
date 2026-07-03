import { genId } from '../../utils/gen-id';
import { rootLogger } from './logger-service';
import { EventBus } from '../events/event-bus';
import { EVENTS } from '../events/event-names';
import { BucketStorageAdapter } from './storage-adapter';
import type { IDatabaseService } from '../types/interfaces';

const LOGGER = rootLogger.child('MessageFeedback');

const STORAGE_KEY = 'message_feedback_v1';

export interface MessageFeedback {
    id: string;
    messageId: string;
    sessionId: string;
    type: 'like' | 'dislike';
    timestamp: number;
    provider?: string;
    model?: string;
}

export interface FeedbackStats {
    total: number;
    likes: number;
    dislikes: number;
    byProvider: Record<string, { likes: number; dislikes: number }>;
    recentTrend: number;
}

export class MessageFeedbackService {
    private feedback: Map<string, MessageFeedback> = new Map();
    private unsub?: () => void;
    private database: IDatabaseService;

    constructor(database: IDatabaseService) {
        this.database = database;
    }

    async init(): Promise<void> {
        const saved = await this.database.getKv<[string, MessageFeedback][]>(STORAGE_KEY);
        if (saved) {
            for (const [id, fb] of saved) {
                this.feedback.set(id, fb);
            }
        } else {
            const lsRaw = await migrateFromLocalStorage();
            if (lsRaw) {
                for (const [id, fb] of lsRaw) {
                    this.feedback.set(id, fb);
                }
                await this.database.setKv(STORAGE_KEY, lsRaw);
                await BucketStorageAdapter.UI.remove('feedback');
            }
        }
        this.unsub = EventBus.on(EVENTS.CLEAR_DATA, () => {
            this.feedback.clear();
            void this.save().catch((e) =>
                LOGGER.warn('MessageFeedback', 'Save failed', { error: e }),
            );
        });
        LOGGER.info('MessageFeedback', `Initialized with ${this.feedback.size} feedback entries`);
    }

    destroy(): void {
        this.unsub?.();
        this.unsub = undefined;
        this.feedback.clear();
    }

    async submit(
        messageId: string,
        sessionId: string,
        type: 'like' | 'dislike',
        provider?: string,
        model?: string,
    ): Promise<MessageFeedback> {
        const id = genId('fb');
        const feedback: MessageFeedback = {
            id,
            messageId,
            sessionId,
            type,
            timestamp: Date.now(),
            provider,
            model,
        };
        this.feedback.set(id, feedback);
        await this.save();
        EventBus.emit(EVENTS.MESSAGE_FEEDBACK_SUBMITTED, feedback);
        LOGGER.info('MessageFeedback', 'Feedback submitted', { messageId, type });
        return feedback;
    }

    getFeedback(messageId: string): MessageFeedback | undefined {
        return Array.from(this.feedback.values()).find((f) => f.messageId === messageId);
    }

    getSessionFeedback(sessionId: string): MessageFeedback[] {
        return Array.from(this.feedback.values())
            .filter((f) => f.sessionId === sessionId)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    getStats(): FeedbackStats {
        const all = Array.from(this.feedback.values());
        const likes = all.filter((f) => f.type === 'like').length;
        const dislikes = all.filter((f) => f.type === 'dislike').length;
        const byProvider: Record<string, { likes: number; dislikes: number }> = {};
        for (const f of all) {
            if (f.provider) {
                if (!byProvider[f.provider]) byProvider[f.provider] = { likes: 0, dislikes: 0 };
                if (f.type === 'like') byProvider[f.provider].likes++;
                else byProvider[f.provider].dislikes++;
            }
        }
        const sorted = all.sort((a, b) => b.timestamp - a.timestamp);
        const recent = sorted.slice(0, 50);
        const older = sorted.slice(50, 100);
        const recentLikes = recent.filter((f) => f.type === 'like').length;
        const olderLikes = older.filter((f) => f.type === 'like').length;
        const recentRatio = recent.length > 0 ? recentLikes / recent.length : 0;
        const olderRatio = older.length > 0 ? olderLikes / older.length : 0;
        return {
            total: all.length,
            likes,
            dislikes,
            byProvider,
            recentTrend: recentRatio - olderRatio,
        };
    }

    async deleteBySessionId(sessionId: string): Promise<void> {
        let changed = false;
        for (const [id, fb] of this.feedback) {
            if (fb.sessionId === sessionId) {
                this.feedback.delete(id);
                changed = true;
            }
        }
        if (changed) {
            await this.save();
            LOGGER.info('MessageFeedback', 'Deleted feedback for session', { sessionId });
        }
    }

    exportFeedback(): MessageFeedback[] {
        return Array.from(this.feedback.values());
    }

    private async save(): Promise<void> {
        await this.database.setKv(STORAGE_KEY, Array.from(this.feedback.entries()));
    }
}

async function migrateFromLocalStorage(): Promise<[string, MessageFeedback][] | null> {
    try {
        const raw = await BucketStorageAdapter.UI.get<[string, MessageFeedback][]>('feedback');
        if (raw && Array.isArray(raw) && raw.length > 0) return raw;
    } catch {
        /* ignore */
    }
    return null;
}
