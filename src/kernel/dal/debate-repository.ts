/**
 * DebateRepository — DAL wrapper for debate sessions, verdicts, timeline, and overrides
 * 
 * Provides typed access to structured multi-agent discussions.
 */

import { dexieDb, type DatabaseService } from '../services/database-service';
import type { DebateSessionRecord, DebateVerdictRecord } from '../contracts/storage/debate-store';
import type { DebateTimelineEntry, DebateOverride } from '../contracts/session-manager';

export class DebateRepository {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // ── Sessions ────────────────────────────────────────────────────────

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

  // ── Verdicts ────────────────────────────────────────────────────────

  async getVerdict(sessionId: string): Promise<DebateVerdictRecord | undefined> {
    return this.db.debateVerdicts.get(sessionId);
  }

  async saveVerdict(verdict: DebateVerdictRecord): Promise<void> {
    await this.db.debateVerdicts.put(verdict);
  }

  // ── Timeline ────────────────────────────────────────────────────────

  async listTimeline(sessionId: string): Promise<DebateTimelineEntry[]> {
    return this.db.debateTimeline
      .where('sessionId')
      .equals(sessionId)
      .sortBy('timestamp');
  }

  async saveTimelineEntry(entry: DebateTimelineEntry): Promise<void> {
    await this.db.debateTimeline.put(entry);
  }

  async deleteTimelineBySession(sessionId: string): Promise<void> {
    await this.db.debateTimeline.where('sessionId').equals(sessionId).delete();
  }

  // ── Overrides ───────────────────────────────────────────────────────

  async listOverrides(sessionId: string): Promise<DebateOverride[]> {
    return this.db.debateOverrides
      .where('sessionId')
      .equals(sessionId)
      .sortBy('appliedAt');
  }

  async saveOverride(override: DebateOverride): Promise<void> {
    await this.db.debateOverrides.put(override);
  }

  async deleteOverridesBySession(sessionId: string): Promise<void> {
    await this.db.debateOverrides.where('sessionId').equals(sessionId).delete();
  }

  // ── Clear All ───────────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    await dexieDb.transaction('rw', [
      dexieDb.debateSessions, dexieDb.debateVerdicts,
      dexieDb.debateTimeline, dexieDb.debateOverrides, dexieDb.sessionLinks,
    ], async () => {
      await dexieDb.debateSessions.clear();
      await dexieDb.debateVerdicts.clear();
      await dexieDb.debateTimeline.clear();
      await dexieDb.debateOverrides.clear();
      await dexieDb.sessionLinks.clear();
    });
  }

  async clearTimelineAndOverrides(sessionId: string): Promise<void> {
    await Promise.all([
      this.deleteTimelineBySession(sessionId),
      this.deleteOverridesBySession(sessionId),
    ]);
  }
}