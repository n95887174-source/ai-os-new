/**
 * DebateRepository — DAL wrapper for debate sessions and verdicts
 * 
 * Provides typed access to structured multi-agent discussions.
 */

import { dexieDb, type DatabaseService } from '../services/database-service';
import type { DebateSessionRecord, DebateVerdictRecord } from '../contracts/storage/debate-store';

export class DebateRepository {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  async listSessions(): Promise<DebateSessionRecord[]> {
    return this.db.debateSessions
      .orderBy('updatedAt')
      .reverse()
      .toArray();
  }

  async getSession(id: string): Promise<DebateSessionRecord | undefined> {
    return this.db.debateSessions.get(id);
  }

  async saveSession(session: DebateSessionRecord): Promise<void> {
    await this.db.debateSessions.put(session);
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.debateSessions.delete(id);
  }

  async getVerdict(sessionId: string): Promise<DebateVerdictRecord | undefined> {
    return this.db.debateVerdicts.get(sessionId);
  }

  async saveVerdict(verdict: DebateVerdictRecord): Promise<void> {
    await this.db.debateVerdicts.put(verdict);
  }

  async clearAll(): Promise<void> {
    // C5: Atomic Dexie transaction — both clear or neither
    await dexieDb.transaction('rw', [dexieDb.debateSessions, dexieDb.debateVerdicts], async () => {
      await dexieDb.debateSessions.clear();
      await dexieDb.debateVerdicts.clear();
    });
  }
}