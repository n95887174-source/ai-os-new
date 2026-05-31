import { EVENTS } from '../events/event-names';
import type { DebateSession } from '../contracts/debate-types';
import type { DebateServiceDeps } from '../contracts/debate-types';
import type { DebateStore } from '../contracts/storage/debate-store';

const SESSION_KEY = 'debate_session';
const LS_SESSION_KEY = 'super_agents_debate_session';
const LS_HISTORY_KEY = 'super_agents_debate_history';

export function loadSessionFromLocalStorage(
  storage: { getItem: (k: string) => string | null },
): DebateSession | null {
  try {
    const saved = storage.getItem(LS_SESSION_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as DebateSession;
    if (parsed?.status === 'active' || parsed?.status === 'paused') return parsed;
  } catch (e) {
    console.warn('[DebateService] Failed to load session from localStorage:', e);
  }
  return null;
}

export async function loadSessionFromDatabase(
  database: DebateServiceDeps['database'],
  storage: { getItem: (k: string) => string | null; removeItem: (k: string) => void },
  emit: (event: string, payload: unknown) => void,
): Promise<DebateSession | null> {
  try {
    const saved = await database.getKv<DebateSession>(SESSION_KEY);
    if (saved && (saved.status === 'active' || saved.status === 'paused')) {
      emit(EVENTS.DEBATE_UPDATED, saved);
      return saved;
    }
    const ls = storage.getItem(LS_SESSION_KEY);
    if (ls) {
      const parsed = JSON.parse(ls) as DebateSession;
      await database.setKv(SESSION_KEY, parsed);
      storage.removeItem(LS_SESSION_KEY);
      if (parsed?.status === 'active' || parsed?.status === 'paused') {
        emit(EVENTS.DEBATE_UPDATED, parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[DebateService] Failed to load session from Dexie:', e);
  }
  return null;
}

export async function persistSessionToDatabase(
  database: DebateServiceDeps['database'],
  session: DebateSession | null,
): Promise<void> {
  try {
    if (session) {
      await database.setKv(SESSION_KEY, session);
    } else {
      await database.keyValue.delete(SESSION_KEY);
    }
  } catch (e) {
    console.warn('[DebateService] Failed to persist session:', e);
  }
}

export function loadDebateHistory(
  storage: { getItem: (k: string) => string | null },
  maxHistory: number,
): DebateSession[] {
  try {
    const saved = storage.getItem(LS_HISTORY_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) return parsed.slice(0, maxHistory);
  } catch (e) {
    console.warn('[DebateService] Failed to load debate history:', e);
  }
  return [];
}

export function persistDebateHistory(
  storage: { setItem: (k: string, v: string) => void },
  sessions: DebateSession[],
): void {
  try {
    storage.setItem(LS_HISTORY_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn('[DebateService] Failed to persist debate history:', e);
  }
}

export async function loadHistoryFromSqlite(
  debateStore: DebateStore,
  maxHistory: number,
): Promise<DebateSession[]> {
  try {
    const records = await debateStore.listSessions({ limit: maxHistory });
    return records.map(r => ({
      id: r.id,
      topic: r.topic,
      status: r.phase as DebateSession['status'],
      strategy: r.topologyType,
      maxRounds: 10,
      currentRound: r.round,
      participants: JSON.parse(r.participants),
      arguments: [],
      convergenceScore: 0,
      config: { roundDelayMs: 2000, maxTokens: 4096, temperature: 0.7, debateTemperature: 0.7, useModerator: false, timeoutMs: 30000 },
    }));
  } catch (e) {
    console.warn('[DebateService] Failed to load history from SQLite:', e);
    return [];
  }
}

export async function migrateLocalStorageToSqlite(
  debateStore: DebateStore,
  storage: { getItem: (k: string) => string | null; removeItem: (k: string) => void },
): Promise<void> {
  try {
    const ls = storage.getItem(LS_HISTORY_KEY);
    if (!ls) return;
    const parsed = JSON.parse(ls);
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    for (const session of parsed) {
      await debateStore.saveSnapshot({
        id: session.id,
        topic: session.topic || '',
        topologyType: session.strategy || 'roundtable',
        phase: session.status || 'completed',
        round: session.currentRound || 0,
        totalTokens: 0,
        totalCost: 0,
        agentStates: '[]',
        topology: '{}',
        participants: JSON.stringify(session.participants || []),
        startedAt: session.createdAt || Date.now(),
        updatedAt: session.updatedAt || Date.now(),
        createdAt: session.createdAt || Date.now(),
      });
    }
    storage.removeItem(LS_HISTORY_KEY);
    console.log(`[DebateService] Migrated ${parsed.length} sessions from localStorage to SQLite`);
  } catch (e) {
    console.warn('[DebateService] Failed to migrate history to SQLite:', e);
  }
}
