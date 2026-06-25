import { create } from 'zustand';
import { runtime } from '../../kernel/runtime';
import { eventBus } from '../../kernel/events/event-bus';
import { EVENTS } from '../../kernel/events/event-names';
import { genId } from '../../utils/gen-id';
import type { DebateParticipant, DebateSession } from '../../kernel/contracts/debate-types';
import type { DebateSessionMeta, DebateSessionStoreShape } from './types';
import type { ISessionManager } from '../../kernel/contracts/session-manager';
import type { DebateSessionRecord } from '../../kernel/contracts/storage/debate-store';
import type { DatabaseService } from '../../kernel/services/database-service';

interface DebateRecord {
  id: string; topic: string; topologyType?: string; phase: string; round: number;
  participants?: string; tags?: string[]; folder?: string; isArchived?: boolean;
  createdAt: number; updatedAt: number; arguments?: string;
  totalTokens?: number; totalCost?: number;
}

let _sm: ISessionManager | null = null;
let _db: DatabaseService | null = null;

function sm(): ISessionManager {
  if (!_sm) { try { _sm = runtime.getService<ISessionManager>('sessionManagerService'); } catch { _sm = null as never; } }
  if (!_sm) throw new Error('SessionManager not available');
  return _sm;
}

function db(): DatabaseService {
  if (!_db) { try { _db = runtime.getService<DatabaseService>('database'); } catch { _db = null as never; } }
  if (!_db) throw new Error('Database not available');
  return _db;
}

const SERVICE_IDS = new Set(['__debate_active_session__', '__debate_history_list__']);

function isServiceId(id: string): boolean {
  return SERVICE_IDS.has(id) || id.startsWith('__debate_');
}

async function getLinkedIds(id: string): Promise<string[]> {
  try {
    const links = await sm().getLinked(id);
    return links.map(l => l.fromId === id ? l.toId : l.fromId);
  } catch { return []; }
}

function toMeta(r: DebateRecord, linkedIds?: string[]): DebateSessionMeta {
  let p: DebateParticipant[];
  try { p = JSON.parse(r.participants || '[]'); } catch { p = []; }
  return {
    id: r.id, topic: r.topic || '(untitled)',
    strategy: (r.topologyType || 'round_robin') as DebateSessionMeta['strategy'],
    phase: r.phase as DebateSessionMeta['phase'],
    round: r.round || 0, participants: p,
    tags: r.tags ?? [], folder: r.folder ?? '',
    isArchived: r.isArchived ?? false,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
    linkedSessionIds: linkedIds ?? [],
  };
}

async function loadFull(id: string): Promise<DebateSession | null> {
  try {
    const r = await db().debateSessions.get(id) as DebateRecord | undefined;
    if (!r) return null;
    let args: unknown[] = []; let parts: unknown[] = [];
    try { args = JSON.parse(r.arguments || '[]'); } catch { args = []; }
    try { parts = JSON.parse(r.participants || '[]'); } catch { parts = []; }
    return {
      id: r.id, topic: r.topic || '(untitled)',
      status: r.phase as DebateSession['status'],
      strategy: (r.topologyType || 'round_robin') as DebateSession['strategy'],
      maxRounds: 10, currentRound: r.round || 0,
      participants: Array.isArray(parts) ? parts as DebateParticipant[] : [],
      arguments: Array.isArray(args) ? args as DebateSession['arguments'] : [],
      convergenceScore: 0, totalTokens: r.totalTokens || 0,
      totalCost: r.totalCost || 0, createdAt: r.createdAt,
      config: { roundDelayMs: 2000, maxTokens: 4096, temperature: 0.7, debateTemperature: 0.7, useModerator: false, timeoutMs: 30000 },
    };
  } catch { return null; }
}

let _unsubs: (() => void)[] | null = null;
let _refreshTimer: ReturnType<typeof setInterval> | null = null;

function scheduleRefresh(): void {
  queueMicrotask(() => useDebateSessionStore.getState().refresh());
}

function ensureSubscriptions(): void {
  if (_unsubs) return;
  _unsubs = [
    eventBus.on(EVENTS.DEBATE_SESSION_CREATED, scheduleRefresh),
    eventBus.on(EVENTS.DEBATE_SESSION_STARTED, scheduleRefresh),
    eventBus.on(EVENTS.DEBATE_SESSION_PAUSED, scheduleRefresh),
    eventBus.on(EVENTS.DEBATE_SESSION_RESUMED, scheduleRefresh),
    eventBus.on(EVENTS.DEBATE_SESSION_COMPLETED, scheduleRefresh),
    eventBus.on(EVENTS.DEBATE_SESSION_FAILED, scheduleRefresh),
    eventBus.on(EVENTS.DEBATE_ROUND_ENDED, scheduleRefresh),
    eventBus.on(EVENTS.DEBATE_STARTED, scheduleRefresh),
    eventBus.on(EVENTS.DEBATE_UPDATED, scheduleRefresh),
  ];
  _refreshTimer = setInterval(() => useDebateSessionStore.getState().refresh(), 30_000);
}

// P0-13: explicit dispose for HMR cleanup
function dispose(): void {
  _unsubs?.forEach(u => u());
  _unsubs = null;
  if (_refreshTimer !== null) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
  }
}

// P0-13: HMR cleanup — prevent duplicate subscriptions and interval leak on hot reload
if (import.meta.hot) {
  import.meta.hot.dispose(() => dispose());
}

export const useDebateSessionStore = create<DebateSessionStoreShape>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  isLoaded: false,

  init: () => { ensureSubscriptions(); },

  createSession: async (topic, strategy, participants, config) => {
    const id = genId('debate-session');
    await db().debateSessions.put({
      id, topic,       topologyType: strategy as DebateSessionRecord['topologyType'], phase: 'created', round: 0,
      totalTokens: 0, totalCost: 0, agentStates: '[]', arguments: '[]',
      topology: JSON.stringify({ config }), participants: JSON.stringify(participants),
      memory: '{}', startedAt: Date.now(), updatedAt: Date.now(), createdAt: Date.now(), version: 1,
      tags: [], folder: '', isArchived: false,
    });
    const meta: DebateSessionMeta = {
      id, topic, strategy, phase: 'created', round: 0, participants,
      tags: [], folder: '', isArchived: false, createdAt: Date.now(),
      updatedAt: Date.now(), linkedSessionIds: [],
    };
    set(s => ({ sessions: [meta, ...s.sessions], activeSessionId: id }));
    return id;
  },

  loadSession: async (id) => loadFull(id),

  saveCurrentSession: async () => {
    const id = get().activeSessionId;
    if (id) await sm().save(id);
  },

  listSessions: async (filters) => {
    try {
      let records = await db().debateSessions.orderBy('updatedAt').reverse().toArray() as DebateRecord[];
      records = records.filter(r => !isServiceId(r.id));
      if (filters?.status) records = records.filter(r => r.phase === filters.status);
      if (filters?.folder) records = records.filter(r => r.folder === filters.folder);
      if (filters?.search) { const q = filters.search.toLowerCase(); records = records.filter(r => r.topic.toLowerCase().includes(q)); }
      if (filters?.tags?.length) records = records.filter(r => (r.tags ?? []).some(t => filters.tags!.includes(t)));
      return await Promise.all(records.map(async r => toMeta(r, await getLinkedIds(r.id))));
    } catch { return []; }
  },

  pauseSession: async (id) => {
    await sm().pause(id);
    set(s => ({ sessions: s.sessions.map(ss => ss.id === id ? { ...ss, phase: 'paused' as const } : ss) }));
  },

  resumeSession: async (id) => {
    await sm().resume(id);
    set(s => ({ sessions: s.sessions.map(ss => ss.id === id ? { ...ss, phase: 'active' as const } : ss) }));
  },

  deleteSession: async (id) => {
    await sm().delete(id);
    set(s => ({ sessions: s.sessions.filter(ss => ss.id !== id), activeSessionId: s.activeSessionId === id ? null : s.activeSessionId }));
  },

  archiveSession: async (id) => {
    await sm().archive(id);
    set(s => ({ sessions: s.sessions.map(ss => ss.id === id ? { ...ss, isArchived: true } : ss) }));
  },

  unarchiveSession: async (id) => {
    await sm().unarchive(id);
    set(s => ({ sessions: s.sessions.map(ss => ss.id === id ? { ...ss, isArchived: false } : ss) }));
  },

  tagSession: async (id, tags) => {
    await sm().updateMeta(id, { tags });
    set(s => ({ sessions: s.sessions.map(ss => ss.id === id ? { ...ss, tags } : ss) }));
  },

  moveToFolder: async (id, folder) => {
    await sm().updateMeta(id, { folder });
    set(s => ({ sessions: s.sessions.map(ss => ss.id === id ? { ...ss, folder } : ss) }));
  },

  renameSession: async (id, title) => {
    await sm().updateMeta(id, { title });
    set(s => ({ sessions: s.sessions.map(ss => ss.id === id ? { ...ss, topic: title } : ss) }));
  },

  setActiveSessionId: (id) => set({ activeSessionId: id }),

  refresh: async () => {
    try {
      const records = await db().debateSessions.orderBy('updatedAt').reverse().toArray() as DebateRecord[];
      const metas = await Promise.all(records.filter(r => !isServiceId(r.id)).map(async r => toMeta(r, await getLinkedIds(r.id))));
      set({ sessions: metas, isLoaded: true });
    } catch {
      set({ sessions: [], isLoaded: true });
    }
  },
}));

ensureSubscriptions();
