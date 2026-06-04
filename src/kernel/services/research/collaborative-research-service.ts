/**
 * Collaborative Research Service
 * Multi-user research sessions
 */

import { rootLogger } from '../logger-service';
import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';
import { StorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('CollaborativeResearch');

export interface ResearchSession {
  id: string;
  name: string;
  participants: string[];
  createdBy: string;
  createdAt: number;
  module: string;
  status: 'active' | 'paused' | 'completed';
  findings: string[];
}

export interface ResearchContribution {
  id: string;
  sessionId: string;
  userId: string;
  type: 'comment' | 'finding' | 'vote' | 'annotation';
  content: string;
  timestamp: number;
  targetFinding?: string;
}

class CollaborativeResearchService {
  private storage: StorageAdapter;
  private sessions: Map<string, ResearchSession> = new Map();
  private contributions: Map<string, ResearchContribution[]> = new Map();

  constructor() {
    this.storage = StorageAdapter.RESEARCH;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<{
      sessions: [string, ResearchSession][];
      contributions: [string, ResearchContribution[]][];
    }>('data');

    if (saved) {
      for (const [id, session] of saved.sessions || []) {
        this.sessions.set(id, session);
      }
      for (const [sessionId, contribs] of saved.contributions || []) {
        this.contributions.set(sessionId, contribs);
      }
    }
    LOGGER.info('CollaborativeResearch', `Initialized with ${this.sessions.size} sessions`);
  }

  /**
   * Create research session
   */
  async createSession(name: string, userId: string, module: string): Promise<ResearchSession> {
    const session: ResearchSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      participants: [userId],
      createdBy: userId,
      createdAt: Date.now(),
      module,
      status: 'active',
      findings: [],
    };

    this.sessions.set(session.id, session);
    this.contributions.set(session.id, []);
    await this.save();

    EventBus.emit(EVENTS.COLLAB_RESEARCH_SESSION_CREATED, session);
    LOGGER.info('CollaborativeResearch', 'Session created', { id: session.id, name });

    return session;
  }

  /**
   * Join session
   */
  async joinSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
      await this.save();
      EventBus.emit(EVENTS.COLLAB_RESEARCH_USER_JOINED, { sessionId, userId });
    }
  }

  /**
   * Leave session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.participants = session.participants.filter(p => p !== userId);
    await this.save();
    EventBus.emit(EVENTS.COLLAB_RESEARCH_USER_LEFT, { sessionId, userId });
  }

  /**
   * Add contribution
   */
  async addContribution(
    sessionId: string,
    userId: string,
    type: ResearchContribution['type'],
    content: string,
    targetFinding?: string
  ): Promise<ResearchContribution> {
    const contribution: ResearchContribution = {
      id: `contrib-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      userId,
      type,
      content,
      timestamp: Date.now(),
      targetFinding,
    };

    const contribs = this.contributions.get(sessionId) || [];
    contribs.push(contribution);
    this.contributions.set(sessionId, contribs);

    await this.save();
    EventBus.emit(EVENTS.COLLAB_RESEARCH_CONTRIBUTION_ADDED, contribution);

    return contribution;
  }

  /**
   * Vote on finding
   */
  async vote(sessionId: string, userId: string, findingId: string, vote: 'up' | 'down'): Promise<void> {
    await this.addContribution(sessionId, userId, 'vote', vote, findingId);
  }

  /**
   * Add finding to session
   */
  async addFinding(sessionId: string, findingId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (!session.findings.includes(findingId)) {
      session.findings.push(findingId);
      await this.save();
      EventBus.emit(EVENTS.COLLAB_RESEARCH_FINDING_ADDED, { sessionId, findingId });
    }
  }

  /**
   * Complete session
   */
  async completeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'completed';
    await this.save();
    EventBus.emit(EVENTS.COLLAB_RESEARCH_SESSION_COMPLETED, session);
    LOGGER.info('CollaborativeResearch', 'Session completed', { id: sessionId });
  }

  /**
   * Get session
   */
  getSession(sessionId: string): ResearchSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get contributions for session
   */
  getContributions(sessionId: string): ResearchContribution[] {
    return this.contributions.get(sessionId) || [];
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ResearchSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.status === 'active')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get sessions by user
   */
  getUserSessions(userId: string): ResearchSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.participants.includes(userId))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get session stats
   */
  getSessionStats(sessionId: string): {
    totalContributions: number;
    byType: Record<string, number>;
    participants: number;
    findingVotes: Record<string, { up: number; down: number }>;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const contribs = this.getContributions(sessionId);
    const byType: Record<string, number> = {};
    const findingVotes: Record<string, { up: number; down: number }> = {};

    for (const c of contribs) {
      byType[c.type] = (byType[c.type] || 0) + 1;

      if (c.type === 'vote' && c.targetFinding) {
        if (!findingVotes[c.targetFinding]) {
          findingVotes[c.targetFinding] = { up: 0, down: 0 };
        }
        if (c.content === 'up') findingVotes[c.targetFinding].up++;
        else findingVotes[c.targetFinding].down++;
      }
    }

    return {
      totalContributions: contribs.length,
      byType,
      participants: session.participants.length,
      findingVotes,
    };
  }

  private async save(): Promise<void> {
    await this.storage.set('data', {
      sessions: Array.from(this.sessions.entries()),
      contributions: Array.from(this.contributions.entries()),
    });
  }
}

// Singleton
export const collaborativeResearchService = new CollaborativeResearchService();

// Add events
if (!EVENTS.COLLAB_RESEARCH_SESSION_CREATED) {
  (EVENTS as unknown as Record<string, string>).COLLAB_RESEARCH_SESSION_CREATED = 'collab:research:session:created';
}
if (!EVENTS.COLLAB_RESEARCH_USER_JOINED) {
  (EVENTS as unknown as Record<string, string>).COLLAB_RESEARCH_USER_JOINED = 'collab:research:user:joined';
}
if (!EVENTS.COLLAB_RESEARCH_USER_LEFT) {
  (EVENTS as unknown as Record<string, string>).COLLAB_RESEARCH_USER_LEFT = 'collab:research:user:left';
}
if (!EVENTS.COLLAB_RESEARCH_CONTRIBUTION_ADDED) {
  (EVENTS as unknown as Record<string, string>).COLLAB_RESEARCH_CONTRIBUTION_ADDED = 'collab:research:contribution:added';
}
if (!EVENTS.COLLAB_RESEARCH_FINDING_ADDED) {
  (EVENTS as unknown as Record<string, string>).COLLAB_RESEARCH_FINDING_ADDED = 'collab:research:finding:added';
}
if (!EVENTS.COLLAB_RESEARCH_SESSION_COMPLETED) {
  (EVENTS as unknown as Record<string, string>).COLLAB_RESEARCH_SESSION_COMPLETED = 'collab:research:session:completed';
}