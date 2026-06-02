/**
 * Rewind/Rollback Service
 * Allows rolling back conversation to a specific point
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { StorageAdapter } from './storage-adapter';

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

class RewindService {
  private storage: StorageAdapter;
  private rewinds: Map<string, RewindEntry> = new Map();
  private snapshots: Map<string, RewindSnapshot> = new Map();
  private undoWindows: Map<string, { messages: Array<{ id: string; role: string; content: string; timestamp: number }>; expiresAt: number }> = new Map();

  private readonly UNDO_WINDOW_MS = 5000; // 5 seconds to undo

  constructor() {
    this.storage = new StorageAdapter('rewind-service');
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<{
      rewinds: [string, RewindEntry][];
      snapshots: [string, RewindSnapshot][];
    }>('data');

    if (saved) {
      for (const [id, rewind] of saved.rewinds || []) {
        this.rewinds.set(id, rewind);
      }
      for (const [id, snapshot] of saved.snapshots || []) {
        this.snapshots.set(id, snapshot);
      }
    }

    // Clean up expired undo windows periodically
    setInterval(() => this.cleanupExpiredUndos(), 60000);

    LOGGER.info('RewindService', `Initialized with ${this.rewinds.size} rewinds, ${this.snapshots.size} snapshots`);
  }

  /**
   * Create a snapshot before rewinding
   */
  async snapshot(sessionId: string, messages: Array<{ id: string; role: string; content: string; timestamp: number }>): Promise<string> {
    const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const snapshot: RewindSnapshot = {
      id: snapshotId,
      sessionId,
      messages: [...messages],
      createdAt: Date.now(),
      label: `Auto-snapshot before rewind`,
    };

    this.snapshots.set(snapshotId, snapshot);
    await this.save();
    LOGGER.info('RewindService', 'Snapshot created', { snapshotId, messageCount: messages.length });

    return snapshotId;
  }

  /**
   * Rewind to a specific message
   */
  async rewind(
    sessionId: string,
    messageId: string,
    currentMessages: Array<{ id: string; role: string; content: string; timestamp: number }>
  ): Promise<{ truncatedMessages: Array<{ id: string; role: string; content: string; timestamp: number }>; undoAvailable: boolean }> {
    // Create snapshot before rewinding
    await this.snapshot(sessionId, currentMessages);

    const messageIndex = currentMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) {
      throw new Error(`Message ${messageId} not found`);
    }

    // Truncate to keep messages up to and including the target message
    const truncatedMessages = currentMessages.slice(0, messageIndex + 1);
    const truncatedCount = currentMessages.length - truncatedMessages.length;

    // Store undo window
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
      truncatedCount,
      undoKey,
      undoExpiresAt: rewindEntry.undoExpiresAt,
    });

    LOGGER.info('RewindService', 'Session rewound', {
      sessionId,
      messageId,
      truncatedCount,
      remaining: truncatedMessages.length,
    });

    return {
      truncatedMessages,
      undoAvailable: true,
    };
  }

  /**
   * Undo last rewind
   */
  async undo(sessionId: string): Promise<{ messages: Array<{ id: string; role: string; content: string; timestamp: number }> } | null> {
    // Find most recent rewind for this session
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

    // Find the corresponding undo window
    const undoWindow = this.undoWindows.get(undoKey);
    if (!undoWindow) {
      LOGGER.info('RewindService', 'No undo window found', { undoKey });
      return null;
    }

    // Mark as undone
    entry.canUndo = false;
    await this.save();

    EventBus.emit(EVENTS.CHAT_UNDO_REWIND, { sessionId, undoKey });

    LOGGER.info('RewindService', 'Rewind undone', { sessionId, restoredCount: undoWindow.messages.length });

    return { messages: undoWindow.messages };
  }

  /**
   * Get snapshots for a session
   */
  getSnapshots(sessionId: string): RewindSnapshot[] {
    return Array.from(this.snapshots.values())
      .filter(s => s.sessionId === sessionId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Restore from a snapshot
   */
  restoreFromSnapshot(snapshotId: string): RewindSnapshot | null {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      LOGGER.warn('RewindService', 'Snapshot not found', { snapshotId });
      return null;
    }

    EventBus.emit(EVENTS.CHAT_RESTORED_FROM_SNAPSHOT, { snapshotId, sessionId: snapshot.sessionId });
    LOGGER.info('RewindService', 'Snapshot restored', { snapshotId });

    return snapshot;
  }

  /**
   * Get rewind history for a session
   */
  getRewindHistory(sessionId: string): RewindEntry[] {
    return Array.from(this.rewinds.values())
      .filter(r => r.sessionId === sessionId)
      .sort((a, b) => b.truncatedAt - a.truncatedAt);
  }

  /**
   * Check if undo is available for a session
   */
  canUndo(sessionId: string): boolean {
    const history = this.getRewindHistory(sessionId);
    return history.some(h => h.canUndo && Date.now() < h.undoExpiresAt);
  }

  private cleanupExpiredUndos(): void {
    const now = Date.now();
    for (const [key, window] of this.undoWindows.entries()) {
      if (now > window.expiresAt) {
        this.undoWindows.delete(key);
      }
    }

    // Also expire rewind entries
    for (const [key, entry] of this.rewinds.entries()) {
      if (!entry.canUndo || now > entry.undoExpiresAt) {
        entry.canUndo = false;
      }
    }
  }

  private async save(): Promise<void> {
    await this.storage.set('data', {
      rewinds: Array.from(this.rewinds.entries()),
      snapshots: Array.from(this.snapshots.entries()),
    });
  }
}

// Singleton
export const rewindService = new RewindService();

// Add missing events
if (!EVENTS.CHAT_REWOUND) {
  (EVENTS as unknown as Record<string, string>).CHAT_REWOUND = 'chat:rewound';
}
if (!EVENTS.CHAT_UNDO_REWIND) {
  (EVENTS as unknown as Record<string, string>).CHAT_UNDO_REWIND = 'chat:undo:rewind';
}
if (!EVENTS.CHAT_RESTORED_FROM_SNAPSHOT) {
  (EVENTS as unknown as Record<string, string>).CHAT_RESTORED_FROM_SNAPSHOT = 'chat:restored:snapshot';
}