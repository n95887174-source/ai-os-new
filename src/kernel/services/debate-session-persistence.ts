import { EVENTS } from '../events/event-names';
import type { DebateSession } from '../contracts/debate-types';
import type { DebateServiceDeps } from '../contracts/debate-types';
import type { DebateStore, DebateSessionRecord } from '../contracts/storage/debate-store';

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

function recordToSession(record: DebateSessionRecord): DebateSession {
  const savedExtra: Record<string, unknown> = (record.topology ? JSON.parse(record.topology) : {}) as Record<string, unknown>;
  const savedConfig = (savedExtra.config as Record<string, unknown>) ?? {};
  return {
    id: record.id,
    topic: record.topic,
    status: record.phase as DebateSession['status'],
    strategy: record.topologyType as DebateSession['strategy'],
    maxRounds: (savedExtra.maxRounds as number) ?? 10,
    currentRound: record.round,
    participants: JSON.parse(record.participants),
    arguments: JSON.parse(record.agentStates || '[]'),
    convergenceScore: (savedExtra.convergenceScore as number) ?? 0,
    totalTokens: record.totalTokens,
    totalCost: record.totalCost,
    createdAt: record.createdAt,
    config: {
      roundDelayMs: (savedConfig.roundDelayMs as number) ?? 2000,
      maxTokens: (savedConfig.maxTokens as number) ?? 4096,
      temperature: (savedConfig.temperature as number) ?? 0.7,
      debateTemperature: (savedConfig.debateTemperature as number) ?? 0.7,
      useModerator: (savedConfig.useModerator as boolean) ?? false,
      timeoutMs: (savedConfig.timeoutMs as number) ?? 30000,
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
    console.warn('[DebateService] Failed to load active session:', e);
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
    console.warn('[DebateService] Failed to persist active session:', e);
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
    if (Array.isArray(parsed)) return parsed.slice(0, maxHistory);
  } catch (e) {
    console.warn('[DebateService] Failed to load debate history:', e);
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
    console.warn('[DebateService] Failed to persist debate history:', e);
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
      console.log('[DebateService] Migrated debate data from legacy storage to DexieDebateStore');
    }
  } catch (e) {
    console.warn('[DebateService] Failed to migrate legacy debate storage:', e);
  }
}
