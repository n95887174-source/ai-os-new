/**
 * Message Feedback Service
 * Thumbs up/down on assistant messages
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { StorageAdapter } from './storage-adapter';

const LOGGER = rootLogger.child('MessageFeedback');

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
  recentTrend: number; // positive = more likes
}

class MessageFeedbackService {
  private storage: StorageAdapter;
  private feedback: Map<string, MessageFeedback> = new Map();

  constructor() {
    this.storage = StorageAdapter.UI;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<[string, MessageFeedback][]>('feedback');
    if (saved) {
      for (const [id, fb] of saved) {
        this.feedback.set(id, fb);
      }
    }
    LOGGER.info('MessageFeedback', `Initialized with ${this.feedback.size} feedback entries`);
  }

  /**
   * Submit feedback for a message
   */
  async submit(
    messageId: string,
    sessionId: string,
    type: 'like' | 'dislike',
    provider?: string,
    model?: string
  ): Promise<MessageFeedback> {
    const id = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

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

  /**
   * Get feedback for a message
   */
  getFeedback(messageId: string): MessageFeedback | undefined {
    return Array.from(this.feedback.values()).find(f => f.messageId === messageId);
  }

  /**
   * Get all feedback for a session
   */
  getSessionFeedback(sessionId: string): MessageFeedback[] {
    return Array.from(this.feedback.values())
      .filter(f => f.sessionId === sessionId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get stats
   */
  getStats(): FeedbackStats {
    const all = Array.from(this.feedback.values());
    const likes = all.filter(f => f.type === 'like').length;
    const dislikes = all.filter(f => f.type === 'dislike').length;

    const byProvider: Record<string, { likes: number; dislikes: number }> = {};
    for (const f of all) {
      if (f.provider) {
        if (!byProvider[f.provider]) {
          byProvider[f.provider] = { likes: 0, dislikes: 0 };
        }
        if (f.type === 'like') byProvider[f.provider].likes++;
        else byProvider[f.provider].dislikes++;
      }
    }

    // Calculate recent trend (last 50 vs previous 50)
    const sorted = all.sort((a, b) => b.timestamp - a.timestamp);
    const recent = sorted.slice(0, 50);
    const older = sorted.slice(50, 100);

    const recentLikes = recent.filter(f => f.type === 'like').length;
    const olderLikes = older.filter(f => f.type === 'like').length;

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

  /**
   * Export feedback data
   */
  exportFeedback(): MessageFeedback[] {
    return Array.from(this.feedback.values());
  }

  private async save(): Promise<void> {
    await this.storage.set('feedback', Array.from(this.feedback.entries()));
  }
}

// Singleton
export const messageFeedbackService = new MessageFeedbackService();

// Add event
if (!EVENTS.MESSAGE_FEEDBACK_SUBMITTED) {
  (EVENTS as unknown as Record<string, string>).MESSAGE_FEEDBACK_SUBMITTED = 'message:feedback:submitted';
}