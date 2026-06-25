import { genId } from '../../utils/gen-id';
import { rootLogger } from './logger-service';
import type { DatabaseService } from './database-service';
import type { ISessionManager, SessionMeta, SessionType, SessionStatus, SessionFilters, SessionLink, DebateTimelineEntry, DebateOverride } from '../contracts/session-manager';
import type { DebateSessionRecord } from '../contracts/storage/debate-store';
import type { ChatSession } from '../contracts/storage/session-store';

const LOGGER = rootLogger.child('SessionManagerService');

export class SessionManagerService implements ISessionManager {
  private db: DatabaseService;
  constructor(db: DatabaseService) {
    this.db = db;
  }

  async create(type: SessionType, meta: Partial<SessionMeta>): Promise<string> {
    const id = meta.id || genId();
    const now = Date.now();
    const base: SessionMeta = {
      id,
      type,
      title: meta.title || 'Untitled',
      status: 'active',
      tags: meta.tags || [],
      folder: meta.folder || '',
      isArchived: false,
      isPinned: false,
      createdAt: now,
      updatedAt: now,
      linkedSessionIds: [],
    };

    if (type === 'debate') {
      const record: DebateSessionRecord = {
        id,
        topic: base.title,
        topologyType: 'roundtable',
        phase: 'created',
        round: 0,
        totalTokens: 0,
        totalCost: 0,
        agentStates: '[]',
        arguments: '[]',
        topology: '{}',
        participants: '[]',
        memory: '{}',
        startedAt: now,
        updatedAt: now,
        createdAt: now,
        tags: base.tags,
        folder: base.folder,
        isArchived: false,
      };
      await this.db.debateSessions.put(record);
    } else {
      const session: ChatSession = {
        id,
        title: base.title,
        history: [],
        createdAt: now,
        updatedAt: now,
        tags: base.tags,
        folder: base.folder,
        isArchived: false,
        isPinned: false,
      };
      await this.db.sessions.put(session as ChatSession);
    }

    return id;
  }

  async load(id: string): Promise<SessionMeta | null> {
    const debate = await this.db.debateSessions.get(id);
    if (debate) {
      return this.recordToMeta(debate, 'debate');
    }
    const chat = await this.db.sessions.get(id);
    if (chat) {
      return this.chatToMeta(chat);
    }
    return null;
  }

  async save(id: string): Promise<void> {
    // Save is a no-op at the SessionManager level — individual services
    // (DebateEngine, ChatService) handle their own persistence.
    // This method exists for future bulk-save coordination.
    const existing = await this.load(id);
    if (!existing) {
      LOGGER.warn('SessionManagerService', `save: session ${id} not found`);
    }
  }

  async pause(id: string): Promise<void> {
    const debate = await this.db.debateSessions.get(id);
    if (debate) {
      await this.db.debateSessions.update(id, {
        phase: 'paused',
        updatedAt: Date.now(),
      });
      return;
    }
    throw new Error(`Session ${id} not found or is not a debate`);
  }

  async resume(id: string): Promise<void> {
    const debate = await this.db.debateSessions.get(id);
    if (debate) {
      await this.db.debateSessions.update(id, {
        phase: 'active',
        updatedAt: Date.now(),
      });
      return;
    }
    throw new Error(`Session ${id} not found or is not a debate`);
  }

  async list(filters: SessionFilters): Promise<SessionMeta[]> {
    const results: SessionMeta[] = [];

    const shouldIncludeDebates = !filters.type || filters.type === 'debate';
    const shouldIncludeChats = !filters.type || filters.type === 'chat';

    if (shouldIncludeDebates) {
      const collection = this.db.debateSessions.orderBy('updatedAt').reverse();
      let records = await collection.toArray();

      if (filters.status) {
        records = records.filter(r => r.phase === filters.status);
      }
      if (filters.folder) {
        records = records.filter(r => r.folder === filters.folder);
      }
      if (filters.isArchived !== undefined) {
        records = records.filter(r => (r.isArchived ?? false) === filters.isArchived);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        records = records.filter(r => r.topic.toLowerCase().includes(q));
      }
      if (filters.tags && filters.tags.length > 0) {
        records = records.filter(r => {
          const tags = r.tags ?? [];
          return filters.tags!.some(t => tags.includes(t));
        });
      }

      results.push(...records.map(r => this.recordToMeta(r, 'debate')));
    }

    if (shouldIncludeChats) {
      const collection = this.db.sessions.orderBy('updatedAt').reverse();
      let records = await collection.toArray();

      if (filters.status) {
        records = records.filter(r => this.mapChatStatus(r) === filters.status);
      }
      if (filters.folder) {
        records = records.filter(r => r.folder === filters.folder);
      }
      if (filters.isArchived !== undefined) {
        records = records.filter(r => (r.isArchived ?? false) === filters.isArchived);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        records = records.filter(r => r.title.toLowerCase().includes(q));
      }
      if (filters.tags && filters.tags.length > 0) {
        records = records.filter(r => {
          const tags = r.tags ?? [];
          return filters.tags!.some(t => tags.includes(t));
        });
      }

      results.push(...records.map(r => this.chatToMeta(r)));
    }

    results.sort((a, b) => b.updatedAt - a.updatedAt);
    return results;
  }

  async archive(id: string): Promise<void> {
    const debate = await this.db.debateSessions.get(id);
    if (debate) {
      await this.db.debateSessions.update(id, { isArchived: true, updatedAt: Date.now() });
      return;
    }
    const chat = await this.db.sessions.get(id);
    if (chat) {
      await this.db.sessions.update(id, { isArchived: true, updatedAt: Date.now() } as Partial<ChatSession>);
      return;
    }
    throw new Error(`Session ${id} not found`);
  }

  async unarchive(id: string): Promise<void> {
    const debate = await this.db.debateSessions.get(id);
    if (debate) {
      await this.db.debateSessions.update(id, { isArchived: false, updatedAt: Date.now() });
      return;
    }
    const chat = await this.db.sessions.get(id);
    if (chat) {
      await this.db.sessions.update(id, { isArchived: false, updatedAt: Date.now() } as Partial<ChatSession>);
      return;
    }
    throw new Error(`Session ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    await Promise.all([
      this.db.debateSessions.delete(id).catch(() => {}),
      this.db.sessions.delete(id).catch(() => {}),
      this.db.debateTimeline.where('sessionId').equals(id).delete().catch(() => {}),
      this.db.debateOverrides.where('sessionId').equals(id).delete().catch(() => {}),
      this.db.sessionLinks.where('fromId').equals(id).delete().catch(() => {}),
      this.db.sessionLinks.where('toId').equals(id).delete().catch(() => {}),
    ]);
  }

  async link(fromId: string, toId: string, linkType: SessionLink['linkType'], context = ''): Promise<void> {
    const link: SessionLink = {
      id: genId(),
      fromId,
      toId,
      linkType,
      context,
      createdAt: Date.now(),
    };
    await this.db.sessionLinks.put(link);
  }

  async getLinked(id: string): Promise<SessionLink[]> {
    const fromLinks = this.db.sessionLinks.where('fromId').equals(id).toArray();
    const toLinks = this.db.sessionLinks.where('toId').equals(id).toArray();
    const [from, to] = await Promise.all([fromLinks, toLinks]);
    return [...from, ...to];
  }

  async updateMeta(id: string, updates: Partial<SessionMeta>): Promise<void> {
    const now = Date.now();
    const debate = await this.db.debateSessions.get(id);
    if (debate) {
      const patch: Partial<DebateSessionRecord> = { updatedAt: now };
      if (updates.title !== undefined) patch.topic = updates.title;
      if (updates.tags !== undefined) patch.tags = updates.tags;
      if (updates.folder !== undefined) patch.folder = updates.folder;
      if (updates.isArchived !== undefined) patch.isArchived = updates.isArchived;
      await this.db.debateSessions.update(id, patch as Parameters<typeof this.db.debateSessions.update>[1]);
      return;
    }
    const chat = await this.db.sessions.get(id);
    if (chat) {
      const patch: Partial<ChatSession> = { updatedAt: now };
      if (updates.title !== undefined) patch.title = updates.title;
      if (updates.tags !== undefined) patch.tags = updates.tags;
      if (updates.folder !== undefined) patch.folder = updates.folder;
      if (updates.isArchived !== undefined) patch.isArchived = updates.isArchived;
      if (updates.isPinned !== undefined) patch.isPinned = updates.isPinned;
      if (updates.linkedDebateId !== undefined) patch.linkedDebateId = updates.linkedDebateId;
      await this.db.sessions.update(id, patch);
      return;
    }
    throw new Error(`Session ${id} not found`);
  }

  async addTimelineEntry(sessionId: string, type: string, payload: string): Promise<void> {
    const entry: DebateTimelineEntry = {
      id: genId(),
      sessionId,
      timestamp: Date.now(),
      type,
      payload,
    };
    await this.db.debateTimeline.put(entry);
  }

  async getTimeline(sessionId: string): Promise<DebateTimelineEntry[]> {
    return this.db.debateTimeline
      .where('sessionId')
      .equals(sessionId)
      .sortBy('timestamp');
  }

  async addOverride(sessionId: string, type: string, payload: string): Promise<void> {
    const override: DebateOverride = {
      id: genId(),
      sessionId,
      type,
      payload,
      appliedAt: Date.now(),
    };
    await this.db.debateOverrides.put(override);
  }

  async getOverrides(sessionId: string): Promise<DebateOverride[]> {
    return this.db.debateOverrides
      .where('sessionId')
      .equals(sessionId)
      .sortBy('appliedAt');
  }

  private recordToMeta(record: DebateSessionRecord, type: SessionType): SessionMeta {
    return {
      id: record.id,
      type,
      title: record.topic || '(untitled)',
      status: this.mapPhaseToStatus(record.phase),
      tags: record.tags ?? [],
      folder: record.folder ?? '',
      isArchived: record.isArchived ?? false,
      isPinned: false,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      linkedSessionIds: [],
    };
  }

  private chatToMeta(chat: ChatSession): SessionMeta {
    return {
      id: chat.id,
      type: 'chat',
      title: chat.title,
      status: chat.isArchived ? 'archived' : 'active',
      tags: chat.tags ?? [],
      folder: chat.folder ?? '',
      isArchived: chat.isArchived ?? false,
      isPinned: chat.isPinned ?? false,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      linkedSessionIds: chat.linkedDebateId ? [chat.linkedDebateId] : [],
    };
  }

  private mapPhaseToStatus(phase: string): SessionStatus {
    switch (phase) {
      case 'active':
      case 'deliberating':
      case 'consensus':
      case 'summarizing':
        return 'active';
      case 'paused':
        return 'paused';
      case 'completed':
        return 'completed';
      case 'failed':
      case 'cancelled':
        return 'failed';
      default:
        return 'active';
    }
  }

  private mapChatStatus(chat: ChatSession): SessionStatus {
    if (chat.isArchived) return 'archived';
    return 'active';
  }
}
