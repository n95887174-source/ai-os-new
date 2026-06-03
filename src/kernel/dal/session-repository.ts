/**
 * SessionRepository — DAL wrapper for chat sessions
 * 
 * Provides typed access to chat conversation history.
 */

import type { DatabaseService } from '../services/database-service';
import type { ChatSession } from '../../stores/useChatStore';

const MAX_SESSIONS = 100;

export class SessionRepository {
  private cache: Map<string, ChatSession> = new Map();
  private cacheLoaded = false;
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  private async ensureCache(): Promise<void> {
    if (this.cacheLoaded) return;
    
    const sessions = await this.db.sessions
      .orderBy('updatedAt')
      .reverse()
      .limit(MAX_SESSIONS)
      .toArray();
    
    this.cache.clear();
    for (const session of sessions) {
      this.cache.set(session.id, session);
    }
    this.cacheLoaded = true;
  }

  async getAll(): Promise<ChatSession[]> {
    await this.ensureCache();
    return Array.from(this.cache.values());
  }

  async get(id: string): Promise<ChatSession | undefined> {
    await this.ensureCache();
    
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    const session = await this.db.sessions.get(id);
    if (session) {
      this.cache.set(session.id, session);
    }
    return session;
  }

  async save(session: ChatSession): Promise<void> {
    await this.db.sessions.put(session);
    this.cache.set(session.id, session);
    this.enforceLimit();
  }

  async delete(id: string): Promise<void> {
    await this.db.sessions.delete(id);
    this.cache.delete(id);
  }

  async listRecent(limit: number = 20): Promise<ChatSession[]> {
    await this.ensureCache();
    
    return Array.from(this.cache.values())
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, limit);
  }

  private enforceLimit(): void {
    if (this.cache.size <= MAX_SESSIONS) return;
    
    const sorted = Array.from(this.cache.values())
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, MAX_SESSIONS);
    
    this.cache.clear();
    for (const session of sorted) {
      this.cache.set(session.id, session);
    }
  }
}