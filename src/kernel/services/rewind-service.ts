import { genId } from '../../utils/gen-id';
import { rootLogger } from './logger-service';
import { EventBus } from '../events/event-bus';
import { EVENTS } from '../events/event-names';

const LOGGER = rootLogger.child('RewindService');

export interface RewindEntry {
    sessionId: string;
    messageId: string;
    truncatedAt: number;
    messageCount: number;
    canUndo: boolean;
    undoExpiresAt: number;
}

export interface RewindSnapshot {
    id: string;
    sessionId: string;
    messages: Array<{ id: string; role: string; content: string; timestamp: number }>;
    createdAt: number;
    label: string;
}

export class RewindService {
    private rewinds: Map<string, RewindEntry> = new Map();
    private snapshots: Map<string, RewindSnapshot> = new Map();
    private undoWindows: Map<
        string,
        {
            messages: Array<{ id: string; role: string; content: string; timestamp: number }>;
            expiresAt: number;
        }
    > = new Map();
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

    private readonly UNDO_WINDOW_MS = 5000;

    private async db(): Promise<import('../types/interfaces').IDatabaseService> {
        const { database } = await import('../instances');
        return database;
    }

    async init(): Promise<void> {
        const d = await this.db();
        const saved = await d.getKv<{
            rewinds: [string, RewindEntry][];
            snapshots: [string, RewindSnapshot][];
        }>('rewind_data');

        if (saved) {
            for (const [id, rewind] of saved.rewinds || []) {
                this.rewinds.set(id, rewind);
            }
            for (const [id, snapshot] of saved.snapshots || []) {
                this.snapshots.set(id, snapshot);
            }
        }

        this.cleanupTimer = setInterval(() => this.cleanupExpiredUndos(), 60000);
        LOGGER.info(
            'RewindService',
            `Initialized with ${this.rewinds.size} rewinds, ${this.snapshots.size} snapshots`,
        );
    }

    async snapshot(
        sessionId: string,
        messages: Array<{ id: string; role: string; content: string; timestamp: number }>,
    ): Promise<string> {
        const snapshotId = genId('snapshot');
        const snapshot: RewindSnapshot = {
            id: snapshotId,
            sessionId,
            messages: [...messages],
            createdAt: Date.now(),
            label: 'Auto-snapshot before rewind',
        };
        this.snapshots.set(snapshotId, snapshot);
        await this.save();
        LOGGER.info('RewindService', 'Snapshot created', {
            snapshotId,
            messageCount: messages.length,
        });
        return snapshotId;
    }

    async rewind(
        sessionId: string,
        messageId: string,
        currentMessages: Array<{ id: string; role: string; content: string; timestamp: number }>,
    ): Promise<{
        truncatedMessages: Array<{ id: string; role: string; content: string; timestamp: number }>;
        undoAvailable: boolean;
    }> {
        await this.snapshot(sessionId, currentMessages);
        const messageIndex = currentMessages.findIndex((m) => m.id === messageId);
        if (messageIndex === -1) throw new Error(`Message ${messageId} not found`);

        const truncatedMessages = currentMessages.slice(0, messageIndex + 1);
        const truncatedMessagesBackup = currentMessages.slice(messageIndex + 1);
        const undoKey = `${sessionId}:${Date.now()}`;
        this.undoWindows.set(undoKey, {
            messages: truncatedMessagesBackup,
            expiresAt: Date.now() + this.UNDO_WINDOW_MS,
        });

        const rewindEntry: RewindEntry = {
            sessionId,
            messageId,
            truncatedAt: Date.now(),
            messageCount: truncatedMessages.length,
            canUndo: true,
            undoExpiresAt: Date.now() + this.UNDO_WINDOW_MS,
        };
        this.rewinds.set(undoKey, rewindEntry);
        await this.save();

        EventBus.emit(EVENTS.CHAT_REWOUND, {
            sessionId,
            messageId,
            truncatedCount: currentMessages.length - truncatedMessages.length,
            undoKey,
            undoExpiresAt: rewindEntry.undoExpiresAt,
        });

        LOGGER.info('RewindService', 'Session rewound', {
            sessionId,
            messageId,
            truncatedCount: currentMessages.length - truncatedMessages.length,
            remaining: truncatedMessages.length,
        });

        return { truncatedMessages, undoAvailable: true };
    }

    async undo(
        sessionId: string,
    ): Promise<{
        removedMessages: Array<{ id: string; role: string; content: string; timestamp: number }>;
    } | null> {
        const recentRewinds = Array.from(this.rewinds.entries())
            .filter(([_, entry]) => entry.sessionId === sessionId && entry.canUndo)
            .sort(([_, a], [__, b]) => b.truncatedAt - a.truncatedAt);

        if (recentRewinds.length === 0) {
            LOGGER.info('RewindService', 'No rewind to undo', { sessionId });
            return null;
        }

        const [undoKey, entry] = recentRewinds[0];
        if (Date.now() > entry.undoExpiresAt) {
            entry.canUndo = false;
            LOGGER.info('RewindService', 'Undo window expired', { sessionId });
            return null;
        }

        const undoWindow = this.undoWindows.get(undoKey);
        if (!undoWindow) {
            LOGGER.info('RewindService', 'No undo window found', { undoKey });
            return null;
        }

        entry.canUndo = false;
        await this.save();

        EventBus.emit(EVENTS.CHAT_UNDO_REWIND, { sessionId, undoKey });
        LOGGER.info('RewindService', 'Rewind undone', {
            sessionId,
            restoredCount: undoWindow.messages.length,
        });
        return { removedMessages: undoWindow.messages };
    }

    getSnapshots(sessionId: string): RewindSnapshot[] {
        return Array.from(this.snapshots.values())
            .filter((s) => s.sessionId === sessionId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    restoreFromSnapshot(snapshotId: string): RewindSnapshot | null {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot) {
            LOGGER.warn('RewindService', 'Snapshot not found', { snapshotId });
            return null;
        }
        EventBus.emit(EVENTS.CHAT_RESTORED_FROM_SNAPSHOT, {
            snapshotId,
            sessionId: snapshot.sessionId,
        });
        LOGGER.info('RewindService', 'Snapshot restored', { snapshotId });
        return snapshot;
    }

    getRewindHistory(sessionId: string): RewindEntry[] {
        return Array.from(this.rewinds.values())
            .filter((r) => r.sessionId === sessionId)
            .sort((a, b) => b.truncatedAt - a.truncatedAt);
    }

    canUndo(sessionId: string): boolean {
        const history = this.getRewindHistory(sessionId);
        return history.some((h) => h.canUndo && Date.now() < h.undoExpiresAt);
    }

    private cleanupExpiredUndos(): void {
        const now = Date.now();
        for (const [key, window] of this.undoWindows.entries()) {
            if (now > window.expiresAt) this.undoWindows.delete(key);
        }
        for (const [, entry] of this.rewinds.entries()) {
            if (!entry.canUndo || now > entry.undoExpiresAt) entry.canUndo = false;
        }
    }

    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    private async save(): Promise<void> {
        const d = await this.db();
        await d.setKv('rewind_data', {
            rewinds: Array.from(this.rewinds.entries()),
            snapshots: Array.from(this.snapshots.entries()),
        });
    }
}

export const rewindService = new RewindService();
