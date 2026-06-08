/**
 * DebateRepository — DAL wrapper for debate sessions and verdicts
 * 
 * Provides typed access to structured multi-agent discussions.
 */

import type { DatabaseService } from '../services/database-service';
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
    // DAL-6: Ensure both tables are cleared even if one fails
    const results = await Promise.allSettled([
      this.db.debateSessions.clear(),
      this.db.debateVerdicts.clear(),
    ]);
    for (const r of results) {
      if (r.status === 'rejected') console.warn('[DebateRepository] clearAll partial failure:', r.reason);
    }
  }
}