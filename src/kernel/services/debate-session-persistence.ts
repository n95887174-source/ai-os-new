import type { DebateSession } from '../contracts/debate-types';
import type { DebateServiceDeps } from '../contracts/debate-types';
import type { DebateStore, DebateSessionRecord } from '../contracts/storage/debate-store';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('DebateSessionPersistence');

const ACTIVE_SESSION_ID = '__debate_active_session__';
const HISTORY_LIST_ID = '__debate_history_list__';
const LS_SESSION_KEY = 'super_agents_debate_session';
const LS_HISTORY_KEY = 'super_agents_debate_history';

function sessionToRecord(session: DebateSession): {
  id: string; topic: string; topologyType: string; phase: string; round: number;
  totalTokens: number; totalCost: number; agentStates: string; topology: string;
  participants: string; startedAt: number; updatedAt: number; createdAt: number;
} {
  const extra = JSON.stringify({
    config: session.config || {},
    convergenceScore: session.convergenceScore ?? 0,
    maxRounds: session.maxRounds ?? 10,
    metadata: (session as unknown as Record<string, unknown>).metadata ?? {},
    tags: (session as unknown as Record<string, unknown>).tags ?? [],
  });
  return {
    id: session.id,
    topic: session.topic,
    topologyType: session.strategy || 'roundtable',
    phase: session.status || 'active',
    round: session.currentRound || 0,
    totalTokens: session.totalTokens ?? 0,
    totalCost: session.totalCost ?? 0,
    agentStates: JSON.stringify(session.arguments || []),
    topology: extra,
    participants: JSON.stringify(session.participants || []),
    startedAt: session.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    createdAt: session.createdAt ?? Date.now(),
  };
}

function toNum(v: unknown, fallback: number): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  return fallback;
}

function recordToSession(record: DebateSessionRecord): DebateSession {
  const savedExtra: Record<string, unknown> = (record.topology ? JSON.parse(record.topology) : {});
  const savedConfig = typeof savedExtra.config === 'object' && savedExtra.config ? savedExtra.config as Record<string, unknown> : {};
  let parsedParticipants: unknown;
  let parsedArgs: unknown;
  try { parsedParticipants = JSON.parse(record.participants); } catch { parsedParticipants = null; }
  try { parsedArgs = JSON.parse(record.agentStates || '[]'); } catch { parsedArgs = null; }
  return {
    id: record.id,
    topic: record.topic || '(untitled)',
    status: (record.phase || 'active') as DebateSession['status'],
    strategy: (record.topologyType || 'round_robin') as DebateSession['strategy'],
    maxRounds: toNum(savedExtra.maxRounds, 10),
    currentRound: record.round,
    participants: Array.isArray(parsedParticipants) ? parsedParticipants : [],
    arguments: Array.isArray(parsedArgs) ? parsedArgs : [],
    convergenceScore: toNum(savedExtra.convergenceScore, 0),
    totalTokens: record.totalTokens,
    totalCost: record.totalCost,
    createdAt: record.createdAt,
    config: {
      roundDelayMs: toNum(savedConfig.roundDelayMs, 2000),
      maxTokens: toNum(savedConfig.maxTokens, 4096),
      temperature: toNum(savedConfig.temperature, 0.7),
      debateTemperature: toNum(savedConfig.debateTemperature, 0.7),
      useModerator: toBool(savedConfig.useModerator, false),
      timeoutMs: toNum(savedConfig.timeoutMs, 30000),
    },
  };
}

export async function loadActiveSession(
  debateStore: DebateStore,
): Promise<DebateSession | null> {
  try {
    const record = await debateStore.getSnapshot(ACTIVE_SESSION_ID);
    if (!record) return null;
    const session = recordToSession(record);
    if (session.status === 'active' || session.status === 'paused') return session;
  } catch (e) {
    LOGGER.warn('DebateSessionPersistence', 'Failed to load active session', { error: e instanceof Error ? e.message : String(e) });
  }
  return null;
}

export async function persistActiveSession(
  debateStore: DebateStore,
  session: DebateSession | null,
): Promise<void> {
  try {
    if (session) {
      await debateStore.saveSnapshot(sessionToRecord(session));
    } else {
      await debateStore.deleteSession(ACTIVE_SESSION_ID);
    }
  } catch (e) {
    LOGGER.warn('DebateSessionPersistence', 'Failed to persist active session', { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function loadHistoryList(
  debateStore: DebateStore,
  maxHistory: number,
): Promise<DebateSession[]> {
  try {
    const record = await debateStore.getSnapshot(HISTORY_LIST_ID);
    if (!record) return [];
    const parsed = JSON.parse(record.agentStates || '[]');
    if (Array.isArray(parsed)) {
      return parsed.slice(0, maxHistory).map((s: Record<string, unknown>) => ({
        ...s,
        participants: Array.isArray(s.participants) ? s.participants : [],
        arguments: Array.isArray(s.arguments) ? s.arguments : [],
      })) as DebateSession[];
    }
  } catch (e) {
    LOGGER.warn('DebateSessionPersistence', 'Failed to load debate history', { error: e instanceof Error ? e.message : String(e) });
  }
  return [];
}

export async function persistHistoryList(
  debateStore: DebateStore,
  sessions: DebateSession[],
): Promise<void> {
  try {
    await debateStore.saveSnapshot({
      id: HISTORY_LIST_ID,
      topic: 'debate_history_list',
      topologyType: 'roundtable',
      phase: 'completed',
      round: 0,
      totalTokens: 0,
      totalCost: 0,
      agentStates: JSON.stringify(sessions),
      topology: '{}',
      participants: '[]',
      startedAt: Date.now(),
      updatedAt: Date.now(),
      createdAt: Date.now(),
    });
  } catch (e) {
    LOGGER.warn('DebateSessionPersistence', 'Failed to persist debate history', { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function migrateFromLegacyStorage(
  debateStore: DebateStore,
  storage: { getItem: (k: string) => string | null; removeItem: (k: string) => void },
  database: DebateServiceDeps['database'],
): Promise<void> {
  try {
    const activeRecord = await debateStore.getSnapshot(ACTIVE_SESSION_ID);
    const historyRecord = await debateStore.getSnapshot(HISTORY_LIST_ID);
    const hasExistingData = activeRecord || historyRecord;
    if (hasExistingData) {
      storage.removeItem(LS_SESSION_KEY);
      storage.removeItem(LS_HISTORY_KEY);
      return;
    }

    let migratedSession = false;
    const lsSession = storage.getItem(LS_SESSION_KEY);
    if (lsSession) {
      const parsed = JSON.parse(lsSession) as DebateSession;
      if (parsed) {
        await debateStore.saveSnapshot(sessionToRecord(parsed));
        migratedSession = true;
      }
      storage.removeItem(LS_SESSION_KEY);
    }

    const dbSession = await database.getKv<DebateSession>('debate_session');
    if (dbSession && !migratedSession) {
      await debateStore.saveSnapshot(sessionToRecord(dbSession));
    }
    await database.keyValue.delete('debate_session');

    const lsHistory = storage.getItem(LS_HISTORY_KEY);
    if (lsHistory) {
      const parsed = JSON.parse(lsHistory);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await debateStore.saveSnapshot({
          id: HISTORY_LIST_ID,
          topic: 'debate_history_list',
          topologyType: 'roundtable',
          phase: 'completed',
          round: 0,
          totalTokens: 0,
          totalCost: 0,
          agentStates: lsHistory,
          topology: '{}',
          participants: '[]',
          startedAt: Date.now(),
          updatedAt: Date.now(),
          createdAt: Date.now(),
        });
      }
      storage.removeItem(LS_HISTORY_KEY);
    }

    if (migratedSession || lsHistory) {
      LOGGER.info('DebateSessionPersistence', 'Migrated debate data from legacy storage to DexieDebateStore');
    }
  } catch (e) {
    LOGGER.warn('DebateSessionPersistence', 'Failed to migrate legacy debate storage', { error: e instanceof Error ? e.message : String(e) });
  }
}
