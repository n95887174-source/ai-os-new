import { create } from 'zustand';
import { runtime } from '../../kernel/runtime';
import { eventBus } from '../../kernel/events/event-bus';
import { EVENTS } from '../../kernel/events/event-names';
import { genId } from '../../utils/gen-id';
import type { DebateParticipant, DebateSession } from '../../kernel/contracts/debate-types';
import type { DebateSessionMeta, DebateSessionStoreShape } from './types';
import type { ISessionManager } from '../../kernel/contracts/session-manager';
import type { DatabaseService } from '../../kernel/services/database-service';

interface DebateRecord {
    id: string;
    topic: string;
    topologyType?: string;
    phase: string;
    round: number;
    participants?: string;
    tags?: string[];
    folder?: string;
    isArchived?: boolean;
    isPinned?: boolean;
    createdAt: number;
    updatedAt: number;
    arguments?: string;
    topology?: string;
    totalTokens?: number;
    totalCost?: number;
}

let _sm: ISessionManager | null = null;
let _db: DatabaseService | null = null;

function sm(): ISessionManager | null {
    if (!_sm) {
        try {
            _sm = runtime.getService<ISessionManager>('sessionManagerService');
        } catch {
            _sm = null;
        }
    }
    return _sm;
}

function db(): DatabaseService | null {
    if (!_db) {
        try {
            _db = runtime.getService<DatabaseService>('database');
        } catch {
            _db = null;
        }
    }
    return _db;
}

async function getLinkedIds(id: string): Promise<string[]> {
    try {
        const mgr = sm();
        if (!mgr) return [];
        const links = await mgr.getLinked(id);
        return links.map((l) => (l.fromId === id ? l.toId : l.fromId));
    } catch {
        return [];
    }
}

function toMeta(r: DebateRecord, linkedIds?: string[]): DebateSessionMeta {
    let p: DebateParticipant[];
    try {
        p = JSON.parse(r.participants || '[]');
    } catch {
        p = [];
    }
    return {
        id: r.id,
        topic: r.topic || '(untitled)',
        strategy: (r.topologyType || 'round_robin') as DebateSessionMeta['strategy'],
        phase: r.phase as DebateSessionMeta['phase'],
        round: r.round || 0,
        participants: p,
        tags: r.tags ?? [],
        folder: r.folder ?? '',
        isArchived: r.isArchived ?? false,
        isPinned: r.isPinned ?? false,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        linkedSessionIds: linkedIds ?? [],
    };
}

async function loadFull(id: string): Promise<DebateSession | null> {
    try {
        const d = db();
        if (!d) return null;
        const r = (await d.debateSessions.get(id)) as DebateRecord | undefined;
        if (!r) return null;
        let args: unknown[] = [];
        let parts: unknown[] = [];
        try {
            args = JSON.parse(r.arguments || '[]');
        } catch {
            args = [];
        }
        try {
            parts = JSON.parse(r.participants || '[]');
        } catch {
            parts = [];
        }
        let storedConfig: Record<string, unknown> = {};
        try {
            const topology = JSON.parse(r.topology || '{}');
            storedConfig = (topology.config || topology) as Record<string, unknown>;
        } catch {
            /* ignore parse errors */
        }
        return {
            id: r.id,
            topic: r.topic || '(untitled)',
            status: r.phase as DebateSession['status'],
            strategy: (r.topologyType || 'round_robin') as DebateSession['strategy'],
            maxRounds: 10,
            currentRound: r.round || 0,
            participants: Array.isArray(parts) ? (parts as DebateParticipant[]) : [],
            arguments: Array.isArray(args) ? (args as DebateSession['arguments']) : [],
            convergenceScore: 0,
            totalTokens: r.totalTokens || 0,
            totalCost: r.totalCost || 0,
            createdAt: r.createdAt,
            config: {
                roundDelayMs: 2000,
                maxTokens: 4096,
                temperature: 0.7,
                debateTemperature: 0.7,
                useModerator: false,
                timeoutMs: 30000,
                ...storedConfig,
            },
        };
    } catch {
        return null;
    }
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
    _unsubs?.forEach((u) => u());
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

    init: () => {
        ensureSubscriptions();
    },

    createSession: async (topic, strategy, participants, config) => {
        const id = genId('debate-session');
        const mgr = sm();
        if (!mgr) return null;
        await mgr.create(
            'debate',
            { id, title: topic, tags: [], folder: '' },
            {
                topologyType: strategy,
                participants: JSON.stringify(participants),
                topology: JSON.stringify({ config }),
                tags: [],
                folder: '',
            },
        );
        const meta: DebateSessionMeta = {
            id,
            topic,
            strategy,
            phase: 'created',
            round: 0,
            participants,
            tags: [],
            folder: '',
            isArchived: false,
            isPinned: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            linkedSessionIds: [],
        };
        set((s) => ({ sessions: [meta, ...s.sessions], activeSessionId: id }));
        return id;
    },

    loadSession: async (id) => loadFull(id),

    saveCurrentSession: async () => {
        const id = get().activeSessionId;
        if (!id) return;
        const mgr = sm();
        if (!mgr) return;
        await mgr.save(id);
    },

    listSessions: async (filters) => {
        try {
            const d = db();
            if (!d) return [];
            let records = (await d.debateSessions
                .orderBy('updatedAt')
                .reverse()
                .toArray()) as DebateRecord[];
            if (filters?.status) records = records.filter((r) => r.phase === filters.status);
            if (filters?.folder) records = records.filter((r) => r.folder === filters.folder);
            if (filters?.search) {
                const q = filters.search.toLowerCase();
                records = records.filter((r) => r.topic.toLowerCase().includes(q));
            }
            if (filters?.tags?.length)
                records = records.filter((r) =>
                    (r.tags ?? []).some((t) => filters.tags!.includes(t)),
                );
            return await Promise.all(records.map(async (r) => toMeta(r, await getLinkedIds(r.id))));
        } catch {
            return [];
        }
    },

    pauseSession: async (id) => {
        const mgr = sm();
        if (!mgr) return;
        await mgr.pause(id);
        set((s) => ({
            sessions: s.sessions.map((ss) =>
                ss.id === id ? { ...ss, phase: 'paused' as const } : ss,
            ),
        }));
    },

    resumeSession: async (id) => {
        const mgr = sm();
        if (!mgr) return;
        await mgr.resume(id);
        set((s) => ({
            sessions: s.sessions.map((ss) =>
                ss.id === id ? { ...ss, phase: 'active' as const } : ss,
            ),
        }));
    },

    deleteSession: async (id) => {
        const mgr = sm();
        if (!mgr) return;
        await mgr.delete(id);
        set((s) => ({
            sessions: s.sessions.filter((ss) => ss.id !== id),
            activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        }));
    },

    archiveSession: async (id) => {
        const mgr = sm();
        if (!mgr) return;
        await mgr.archive(id);
        set((s) => ({
            sessions: s.sessions.map((ss) => (ss.id === id ? { ...ss, isArchived: true } : ss)),
        }));
    },

    unarchiveSession: async (id) => {
        const mgr = sm();
        if (!mgr) return;
        await mgr.unarchive(id);
        set((s) => ({
            sessions: s.sessions.map((ss) => (ss.id === id ? { ...ss, isArchived: false } : ss)),
        }));
    },

    tagSession: async (id, tags) => {
        const mgr = sm();
        if (!mgr) return;
        await mgr.updateMeta(id, { tags });
        set((s) => ({ sessions: s.sessions.map((ss) => (ss.id === id ? { ...ss, tags } : ss)) }));
    },

    moveToFolder: async (id, folder) => {
        const mgr = sm();
        if (!mgr) return;
        await mgr.updateMeta(id, { folder });
        set((s) => ({ sessions: s.sessions.map((ss) => (ss.id === id ? { ...ss, folder } : ss)) }));
    },

    renameSession: async (id, title) => {
        const mgr = sm();
        if (!mgr) return;
        await mgr.updateMeta(id, { title });
        set((s) => ({
            sessions: s.sessions.map((ss) => (ss.id === id ? { ...ss, topic: title } : ss)),
        }));
    },

    pinSession: async (id) => {
        const current = get().sessions.find((ss) => ss.id === id);
        if (!current) return;
        const next = !current.isPinned;
        const mgr = sm();
        if (!mgr) return;
        await mgr.updateMeta(id, { isPinned: next });
        set((s) => ({
            sessions: s.sessions.map((ss) => (ss.id === id ? { ...ss, isPinned: next } : ss)),
        }));
    },

    setActiveSessionId: (id) => set({ activeSessionId: id }),

    refresh: async () => {
        try {
            const d = db();
            if (!d) {
                set({ sessions: [], isLoaded: true });
                return;
            }
            const records = (await d.debateSessions
                .orderBy('updatedAt')
                .reverse()
                .toArray()) as DebateRecord[];
            const metas = await Promise.all(
                records.map(async (r) => toMeta(r, await getLinkedIds(r.id))),
            );
            set({ sessions: metas, isLoaded: true });
        } catch {
            set({ sessions: [], isLoaded: true });
        }
    },
}));

ensureSubscriptions();
