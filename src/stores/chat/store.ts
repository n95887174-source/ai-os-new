import { create } from 'zustand';
import type { ChatResponse } from '../../types/chat';
import type { ChatMessage } from '../../kernel/types/llm-types';
import type { SessionStore } from '../../kernel/contracts/storage/session-store';
import { CONFIG } from '../../kernel/instances';
import {
    eventBus,
    EVENTS,
    runtime,
    executionGovernor,
    memoryService,
    workspaceService,
    sessionManager,
    getDistributedLock,
} from './service-deps';
import type { ChatStoreShape, ChatEntry, ChatSession, ZustandSet, ZustandGet } from './types';
import {
    DEFAULT_SESSION,
    SESSION_BATCH_SIZE,
    MAX_HISTORY,
    MODEL_CONTEXT_WINDOWS,
    DELETED_IDS_TTL,
    genId,
    rebuildRequestEntryMap,
    requestEntryMap,
} from './types';

let _sessionStore: SessionStore | null = null;
function resolveSessionStore(): SessionStore | null {
    if (_sessionStore) return _sessionStore;
    _sessionStore =
        runtime.getService<{ sessions: SessionStore }>('storageLayer')?.sessions ?? null;
    return _sessionStore;
}

/** C-93: Helper to update a single session by findIndex instead of map-all. */
function updateSessionInList(
    sessions: ChatSession[],
    id: string,
    patch: Partial<ChatSession>,
): ChatSession[] {
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return sessions;
    const next = [...sessions];
    next[idx] = { ...next[idx], ...patch, updatedAt: Date.now() };
    return next;
}

/** C-93: Helper to update a single chat entry inside a session by entry id. */
function updateEntryInSession(
    sessions: ChatSession[],
    sessionId: string,
    entryId: string,
    entryUpdater: (entry: ChatEntry) => ChatEntry,
): ChatSession[] {
    const sessIdx = sessions.findIndex((s) => s.id === sessionId);
    if (sessIdx === -1) return sessions;
    const session = sessions[sessIdx];
    const entryIdx = session.history.findIndex((e) => e.id === entryId);
    if (entryIdx === -1) return sessions;
    const next = [...sessions];
    const nextHistory = [...session.history];
    nextHistory[entryIdx] = entryUpdater(nextHistory[entryIdx]);
    next[sessIdx] = { ...session, history: nextHistory, updatedAt: Date.now() };
    return next;
}

const updateActiveSession =
    (set: ZustandSet, get: ZustandGet) =>
    (updater: (history: ChatEntry[]) => ChatEntry[]): void => {
        const id = get().activeSessionId;
        set((s) => ({
            sessions: updateSessionInList(s.sessions, id, {
                history: updater(s.sessions.find((x) => x.id === id)?.history ?? []),
            }),
        }));
    };

interface QueuedMessage {
    targets: Array<{ provider: string; model: string; keyId?: string }>;
    text: string;
    systemPromptArg?: string;
    temperature?: number;
    maxTokens?: number;
}
const _sendQueue = new Map<string, QueuedMessage[]>();

export const useChatStore = create<ChatStoreShape>((set, get) => {
    const uas = updateActiveSession(set, get);

    const _unsubs: Array<() => void> = [];

    // Subscribe to response events (set up once, per closure over set/get)
    // These bridge SEND_MESSAGE → ChatExecutor → response events
    _unsubs.push(
        eventBus.on(EVENTS.MESSAGE_RESPONSE, (res: ChatResponse) => {
            const ref = requestEntryMap.get(res.requestId);
            if (!ref) return;
            set((s) => {
                const newActiveIds = new Set(s.activeRequestIds);
                if (
                    res.status === 'done' ||
                    res.status === 'error' ||
                    res.status === 'cancelled' ||
                    res.status === 'timeout'
                ) {
                    newActiveIds.delete(res.requestId);
                }
                return {
                    sessions: updateEntryInSession(
                        s.sessions,
                        ref.sessionId,
                        ref.entryId,
                        (entry) => ({
                            ...entry,
                            responses: entry.responses.map((r) =>
                                r.requestId === res.requestId ? { ...r, ...res } : r,
                            ),
                        }),
                    ),
                    activeRequestIds: newActiveIds,
                };
            });
        }),
    );

    _unsubs.push(
        eventBus.on(EVENTS.STREAM_START, (payload) => {
            const ref = requestEntryMap.get(payload.requestId);
            if (!ref) return;
            set((s) => ({
                sessions: updateEntryInSession(s.sessions, ref.sessionId, ref.entryId, (entry) => ({
                    ...entry,
                    responses: entry.responses.map((r) =>
                        r.requestId === payload.requestId
                            ? { ...r, status: 'streaming' as const }
                            : r,
                    ),
                })),
            }));
        }),
    );

    _unsubs.push(
        eventBus.on(EVENTS.STREAM_CHUNK, (payload) => {
            const ref = requestEntryMap.get(payload.requestId);
            if (!ref) return;
            set((s) => ({
                sessions: updateEntryInSession(s.sessions, ref.sessionId, ref.entryId, (entry) => ({
                    ...entry,
                    responses: entry.responses.map((r) =>
                        r.requestId === payload.requestId
                            ? { ...r, content: r.content + payload.chunk }
                            : r,
                    ),
                })),
            }));
        }),
    );

    _unsubs.push(
        eventBus.on(EVENTS.STREAM_END, (payload) => {
            if (!payload.requestId) return;
            const ref = requestEntryMap.get(payload.requestId);
            if (!ref) return;
            set((s) => {
                const newActiveIds = new Set(s.activeRequestIds);
                newActiveIds.delete(payload.requestId);
                return {
                    sessions: updateEntryInSession(
                        s.sessions,
                        ref.sessionId,
                        ref.entryId,
                        (entry) => ({
                            ...entry,
                            responses: entry.responses.map((r) =>
                                r.requestId === payload.requestId
                                    ? {
                                          ...r,
                                          content: payload.fullContent || r.content,
                                          latency: payload.latency || r.latency,
                                          tokens: payload.tokens ?? r.tokens,
                                          status: 'done' as const,
                                      }
                                    : r,
                            ),
                        }),
                    ),
                    activeRequestIds: newActiveIds,
                };
            });
        }),
    );

    _unsubs.push(
        eventBus.on(EVENTS.STREAM_ERROR, (payload) => {
            const ref = requestEntryMap.get(payload.requestId);
            if (!ref) return;
            set((s) => {
                const newActiveIds = new Set(s.activeRequestIds);
                newActiveIds.delete(payload.requestId);
                return {
                    sessions: updateEntryInSession(
                        s.sessions,
                        ref.sessionId,
                        ref.entryId,
                        (entry) => ({
                            ...entry,
                            responses: entry.responses.map((r) =>
                                r.requestId === payload.requestId
                                    ? {
                                          ...r,
                                          content: '',
                                          error: payload.error,
                                          status: 'error' as const,
                                      }
                                    : r,
                            ),
                        }),
                    ),
                    activeRequestIds: newActiveIds,
                };
            });
        }),
    );

    return {
        sessions: [DEFAULT_SESSION],
        activeSessionId: DEFAULT_SESSION.id,
        activeRequestIds: new Set<string>(),
        deletedIds: new Set<string>(),
        deletedAtTimestamps: new Map(),
        isLoaded: false,
        hasMoreSessions: false,
        systemPrompt: '',

        setSessions: (updater) => set((s) => ({ sessions: updater(s.sessions) })),
        setActiveSessionId: (id) => set({ activeSessionId: id }),
        addActiveRequestId: (requestId) =>
            set((s) => ({ activeRequestIds: new Set([...s.activeRequestIds, requestId]) })),
        removeActiveRequestId: (requestId) =>
            set((s) => {
                const newSet = new Set(s.activeRequestIds);
                newSet.delete(requestId);
                return { activeRequestIds: newSet };
            }),
        hasActiveRequestId: (requestId) => get().activeRequestIds.has(requestId),
        isAnySending: () => get().activeRequestIds.size > 0,
        setHasMoreSessions: (v) => set({ hasMoreSessions: v }),
        setSystemPrompt: (s) => set({ systemPrompt: s }),
        setIsLoaded: (v) => set({ isLoaded: v }),

        loadMoreSessions: async () => {
            const sStore = resolveSessionStore();
            if (!sStore) return;
            const offset = get().sessions.length;
            const more = await sStore.listSessions(SESSION_BATCH_SIZE, offset);
            if (more.length > 0) {
                set((s) => {
                    const existing = new Set(s.sessions.map((x) => x.id));
                    const newOnes = more.filter((x) => !existing.has(x.id));
                    if (newOnes.length === 0) return {};
                    return { sessions: [...s.sessions, ...newOnes] };
                });
            }
        },

        sendMessage: async (targets, text, systemPromptArg, temperature, maxTokens) => {
            const sessionId = get().activeSessionId;
            const existing = _sendQueue.get(sessionId);
            if (existing) {
                existing.push({ targets, text, systemPromptArg, temperature, maxTokens });
                return;
            }
            _sendQueue.set(sessionId, []);
            const requestId = `chat-${crypto.randomUUID()}`;
            const entryId = crypto.randomUUID();
            let requestIdsToTrack: string[] = [];
            let govOp;
            let currentHistory: ChatEntry[];
            const distLock = getDistributedLock();
            const lockResult = await distLock.acquire(`chat:${sessionId}`, { ttl: 120_000 });
            if (!lockResult.lock) {
                console.warn('[ChatStore] Failed to acquire chat lock, proceeding without lock', {
                    error: lockResult.error,
                });
            }
            try {
                currentHistory = (
                    get().sessions.find((s) => s.id === sessionId)?.history ?? []
                ).slice(-MAX_HISTORY);
                requestIdsToTrack =
                    targets.length > 1
                        ? targets.map((t, idx) => `${requestId}-${t.provider}-${t.keyId ?? idx}`)
                        : [requestId];
                govOp = executionGovernor.start({
                    type: 'send-message',
                    timeoutMs: 120_000,
                    metadata: { textPreview: text.slice(0, 80) },
                });
                if (get().isAnySending()) {
                    console.warn('[ChatStore] sendMessage already in progress, ignored');
                    govOp.complete();
                    return;
                }
                requestIdsToTrack.forEach((rid) => get().addActiveRequestId(rid));

                // P0-7: cancel check — throws if all tracked request IDs were cancelled
                const cancelGuard = () => {
                    const ids = get().activeRequestIds;
                    const anyActive = requestIdsToTrack.some((rid) => ids.has(rid));
                    if (!anyActive) throw new Error('CANCELLED');
                };

                let relatedMemories: Array<{ entry: { content: string }; score?: number }> = [];
                if (CONFIG.featureFlags.memory.ragOnChat) {
                    try {
                        relatedMemories = (await memoryService.search(text, 3)) || [];
                    } catch (e) {
                        console.warn('[ChatStore] Memory search failed:', e);
                    }
                    cancelGuard();
                }
                const contextPrefix =
                    relatedMemories.length > 0
                        ? `[RECALLED CONTEXT]\n${relatedMemories.map((m) => `- ${m.entry.content}`).join('\n')}\n\n`
                        : '';

                if (CONFIG.featureFlags.memory.autoStore) {
                    try {
                        await memoryService.store({
                            content: text,
                            metadata: {
                                source: 'user',
                                type: 'chat_query' as const,
                                timestamp: Date.now(),
                                importance: 0.5,
                                chatId: sessionId,
                            },
                        });
                    } catch (e) {
                        console.warn('[ChatStore] Memory store failed:', e);
                    }
                    cancelGuard();
                }

                const workspaceContext = workspaceService.isAttached()
                    ? (await workspaceService.getFileTreeSnapshot()).slice(0, 5000)
                    : null;
                cancelGuard();

                const sanitize = (content: string): string =>
                    content
                        .replace(/^(system|SYSTEM|System)\s*:/gm, '[filtered]:')
                        .replace(
                            /^(IMPORTANT NEW|IGNORE ALL|OVERRIDE|DISREGARD|You are now|From now on|New instructions)/gim,
                            '[filtered]',
                        );

                const messages: ChatMessage[] = [
                    ...(systemPromptArg
                        ? [{ role: 'system' as const, content: sanitize(systemPromptArg) }]
                        : []),
                    ...(workspaceContext
                        ? [
                              {
                                  role: 'system' as const,
                                  content: sanitize(
                                      `[WORKSPACE FILES]\n${workspaceContext}\n\nYou can read any file by asking me to use the read_file tool.`,
                                  ),
                              },
                          ]
                        : []),
                    ...currentHistory.flatMap<ChatMessage>((h) => {
                        if (h.role === 'system')
                            return [{ role: 'system' as const, content: sanitize(h.text) }];
                        return [
                            { role: 'user' as const, content: sanitize(h.text) },
                            ...h.responses
                                .filter((r) => r.status === 'done')
                                .map((r) => ({
                                    role: 'assistant' as const,
                                    content: sanitize(r.content),
                                })),
                        ];
                    }),
                    { role: 'user' as const, content: sanitize(contextPrefix + text) },
                ];

                const loadingResponses: ChatResponse[] = targets.map((t, idx) => ({
                    id: genId(),
                    requestId:
                        targets.length > 1
                            ? `${requestId}-${t.provider}-${t.keyId ?? idx}`
                            : requestId,
                    provider: t.provider,
                    model: t.model,
                    content: '',
                    latency: 0,
                    status: 'loading',
                }));

                const newEntry: ChatEntry = {
                    id: entryId,
                    requestId,
                    role: 'user',
                    text,
                    responses: loadingResponses,
                    timestamp: Date.now(),
                    recalledMemories: relatedMemories.map((m) => ({
                        content: m.entry.content,
                        score: m.score,
                    })),
                };

                const sessBefore = get().sessions.find((s) => s.id === sessionId);
                const wouldExceed = (sessBefore?.history.length ?? 0) >= MAX_HISTORY;
                if (wouldExceed) {
                    const lostCount = (sessBefore?.history.length ?? 0) - MAX_HISTORY + 1;
                    eventBus.emit(EVENTS.NOTIFICATION, {
                        message: `Chat history limit (${MAX_HISTORY} entries) reached — ${lostCount} older message(s) will be removed from context.`,
                        type: 'warning',
                    });
                }
                // P0-5: persist to Dexie BEFORE Zustand update — crash-safe write-through
                const sStore = resolveSessionStore();
                if (sStore) {
                    const currentSessions = get().sessions;
                    const stateWithNew = {
                        ...get(),
                        sessions: updateSessionInList(currentSessions, sessionId, {
                            history: [
                                ...(currentSessions.find((x) => x.id === sessionId)?.history ?? []),
                                newEntry,
                            ],
                        }),
                    };
                    await sStore.syncSessions(stateWithNew.sessions, []).catch((e) => {
                        console.error(
                            '[ChatStore] write-through persist failed — message not saved',
                            e,
                        );
                        eventBus.emit(EVENTS.NOTIFICATION, {
                            message: 'Failed to save message in database',
                            type: 'error',
                        });
                        throw e;
                    });
                }

                set((s) => ({
                    sessions: updateSessionInList(s.sessions, sessionId, {
                        history: [
                            ...(s.sessions.find((x) => x.id === sessionId)?.history ?? []),
                            newEntry,
                        ].slice(-MAX_HISTORY),
                    }),
                }));

                // Register requestIds BEFORE emitting SEND_MESSAGE so response handlers
                // can find the entry synchronously via requestEntryMap
                for (const resp of loadingResponses) {
                    requestEntryMap.set(resp.requestId, { sessionId, entryId });
                }

                targets.forEach((t, idx) => {
                    eventBus.emit(EVENTS.SEND_MESSAGE, {
                        requestId: loadingResponses[idx].requestId,
                        provider: t.provider,
                        model: t.model,
                        keyId: t.keyId,
                        messages,
                        options: { temperature, maxTokens },
                    });
                });

                govOp.complete();
            } catch (e) {
                requestIdsToTrack?.forEach((rid) => get().removeActiveRequestId(rid));
                if (e instanceof Error && e.message === 'CANCELLED') {
                    govOp?.complete();
                    return;
                }
                govOp?.fail(e instanceof Error ? e : new Error(String(e)));
                throw e;
            } finally {
                if (lockResult.lock) {
                    distLock
                        .release(lockResult.lock)
                        .catch((e) => console.warn('[ChatStore] Failed to release chat lock', e));
                }
                const q = _sendQueue.get(sessionId);
                if (q && q.length > 0) {
                    const next = q.shift()!;
                    get().sendMessage(
                        next.targets,
                        next.text,
                        next.systemPromptArg,
                        next.temperature,
                        next.maxTokens,
                    );
                } else {
                    _sendQueue.delete(sessionId);
                }
            }
        },

        cancelSending: () => {
            const sessions = get().sessions;
            const allLoadingReqs: Array<{ entryId: string; requestId: string; sessionId: string }> =
                [];
            for (const session of sessions) {
                for (const entry of session.history) {
                    for (const r of entry.responses || []) {
                        if (r.status === 'loading' || r.status === 'streaming') {
                            allLoadingReqs.push({
                                entryId: entry.id,
                                requestId: r.requestId,
                                sessionId: session.id,
                            });
                        }
                    }
                }
            }
            if (allLoadingReqs.length === 0) {
                set({ activeRequestIds: new Set() });
                return;
            }
            for (const req of allLoadingReqs) {
                if (req.requestId)
                    eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId: req.requestId });
            }
            const sessionIdsToUpdate = new Set(allLoadingReqs.map((r) => r.sessionId));
            set((s) => {
                const newActiveIds = new Set(s.activeRequestIds);
                for (const req of allLoadingReqs) {
                    if (req.requestId) newActiveIds.delete(req.requestId);
                }
                return {
                    activeRequestIds: newActiveIds,
                    sessions: s.sessions.map((session) =>
                        sessionIdsToUpdate.has(session.id)
                            ? {
                                  ...session,
                                  history: session.history.map((e) => ({
                                      ...e,
                                      responses: e.responses.map((r) =>
                                          r.status === 'loading' || r.status === 'streaming'
                                              ? { ...r, status: 'cancelled' as const }
                                              : r,
                                      ),
                                  })),
                              }
                            : session,
                    ),
                };
            });
        },

        cancelMessage: (requestId) => {
            eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId });
        },

        editEntry: async (entryId, newText) => {
            if (get().isAnySending()) {
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message:
                        'Cannot edit message while a message is being sent. Cancel first or wait for completion.',
                    type: 'warning',
                });
                return;
            }
            const sessionId = get().activeSessionId;
            const distLock = getDistributedLock();
            const lockResult = await distLock.acquire(`chat:${sessionId}`, { ttl: 30_000 });
            if (!lockResult.lock) {
                console.warn('[ChatStore] editEntry failed to acquire lock', {
                    error: lockResult.error,
                });
                return;
            }
            try {
                const session = get().sessions.find((s) => s.id === sessionId);
                const oldEntry = session?.history.find((e) => e.id === entryId);
                // Cancel any in-flight requests for this entry before clearing
                if (oldEntry) {
                    for (const r of oldEntry.responses) {
                        if (r.status === 'loading' || r.status === 'streaming') {
                            eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId: r.requestId });
                            get().removeActiveRequestId(r.requestId);
                        }
                    }
                }
                const sStore = resolveSessionStore();
                if (!sStore) {
                    console.warn('[ChatStore] No session store available, editEntry not persisted');
                    return;
                }
                const fullSession = get().sessions.find((s) => s.id === sessionId);
                if (!fullSession) return;
                // Persist-then-emit: write to Dexie first, update Zustand only on success
                try {
                    await sStore.put({
                        ...fullSession,
                        history: fullSession.history.map((e) =>
                            e.id === entryId ? { ...e, text: newText, responses: [] } : e,
                        ),
                        updatedAt: Date.now(),
                    });
                } catch (e) {
                    console.error('[ChatStore] Failed to persist editEntry', e);
                    eventBus.emit(EVENTS.NOTIFICATION, {
                        message: 'Failed to save edited message',
                        type: 'error',
                    });
                    return;
                }
                uas((prev) =>
                    prev.map((e) =>
                        e.id === entryId ? { ...e, text: newText, responses: [] } : e,
                    ),
                );
            } finally {
                distLock
                    .release(lockResult.lock)
                    .catch((e) => console.warn('[ChatStore] Failed to release editEntry lock', e));
            }
        },

        clearHistory: async () => {
            const sessionId = get().activeSessionId;
            const distLock = getDistributedLock();
            const lockResult = await distLock.acquire(`chat:${sessionId}`, { ttl: 30_000 });
            if (!lockResult.lock) {
                console.warn('[ChatStore] clearHistory failed to acquire lock', {
                    error: lockResult.error,
                });
                return;
            }
            try {
                const session = get().sessions.find((s) => s.id === sessionId);
                if (session) {
                    const loadingReqs = session.history
                        .flatMap((e) =>
                            (e.responses || []).map((r) => ({
                                requestId: r.requestId,
                                status: r.status,
                            })),
                        )
                        .filter((r) => r.status === 'loading' || r.status === 'streaming');
                    for (const req of loadingReqs) {
                        if (req.requestId)
                            eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId: req.requestId });
                    }
                }
                const sStore = resolveSessionStore();
                if (sStore && session) {
                    try {
                        await sStore.put({ ...session, history: [], updatedAt: Date.now() });
                    } catch (e) {
                        console.error('[ChatStore] Failed to persist clearHistory', e);
                        return;
                    }
                }
                uas(() => []);
                set({ activeRequestIds: new Set() });
            } finally {
                distLock
                    .release(lockResult.lock)
                    .catch((e) =>
                        console.warn('[ChatStore] Failed to release clearHistory lock', e),
                    );
            }
        },

        createSession: async (title = 'New Chat') => {
            const id = await sessionManager
                .create('chat', { title })
                .catch(() => crypto.randomUUID());
            const newSession: ChatSession = {
                id,
                title,
                history: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            set((s) => ({ sessions: [newSession, ...s.sessions], activeSessionId: id }));
            return id;
        },

        deleteSession: async (id) => {
            // Prune requestEntryMap entries for this session
            for (const [reqId, ref] of requestEntryMap) {
                if (ref.sessionId === id) requestEntryMap.delete(reqId);
            }
            try {
                await sessionManager.delete(id);
            } catch (e) {
                console.error('[ChatStore] Failed to persist session deletion', e);
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message: 'Failed to delete session in database',
                    type: 'error',
                });
                return;
            }
            set((s) => {
                const now = Date.now();
                const timestamps = new Map(s.deletedAtTimestamps);
                timestamps.set(id, now);
                // Prune entries older than TTL
                for (const [tsId, ts] of timestamps) {
                    if (now - ts > DELETED_IDS_TTL) timestamps.delete(tsId);
                }
                const updated = new Set(timestamps.keys());
                if (updated.size > 1000) {
                    const arr = [...updated];
                    updated.clear();
                    for (const x of arr.slice(arr.length - 1000)) updated.add(x);
                    for (const [tsId] of timestamps) {
                        if (!updated.has(tsId)) timestamps.delete(tsId);
                    }
                }
                const filtered = s.sessions.filter((x) => x.id !== id);
                if (filtered.length === 0) {
                    const fresh: ChatSession = {
                        id: 'default',
                        title: 'New Chat',
                        history: [],
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };
                    return {
                        sessions: [fresh],
                        activeSessionId: DEFAULT_SESSION.id,
                        deletedIds: updated,
                        deletedAtTimestamps: timestamps,
                    };
                }
                if (s.activeSessionId === id) {
                    return {
                        sessions: filtered,
                        activeSessionId: filtered[0].id,
                        deletedIds: updated,
                        deletedAtTimestamps: timestamps,
                    };
                }
                return { sessions: filtered, deletedIds: updated, deletedAtTimestamps: timestamps };
            });
        },

        forkSession: async (entryId, newTitle) => {
            const sessionId = get().activeSessionId;
            const session = get().sessions.find((s) => s.id === sessionId);
            if (!session) return;
            const entryIndex = session.history.findIndex((e) => e.id === entryId);
            if (entryIndex === -1) return;
            const newHistory = session.history.slice(0, entryIndex + 1).map((e) => ({
                ...e,
                id: crypto.randomUUID(),
                requestId: crypto.randomUUID(),
                responses: e.responses.map((r) => ({
                    ...r,
                    requestId: crypto.randomUUID(),
                })),
            }));
            const id = crypto.randomUUID();
            const newSession: ChatSession = {
                id,
                title: newTitle || `Fork of ${session.title}`,
                history: newHistory,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            const sStore = resolveSessionStore();
            if (sStore) {
                try {
                    await sStore.put(newSession);
                } catch (e) {
                    console.error('[ChatStore] Failed to persist forked session', e);
                    eventBus.emit(EVENTS.NOTIFICATION, {
                        message: 'Failed to save forked session in database',
                        type: 'error',
                    });
                    return;
                }
            }
            set((s) => ({ sessions: [newSession, ...s.sessions], activeSessionId: id }));
            rebuildRequestEntryMap(get().sessions);
        },

        renameSession: async (id, title) => {
            try {
                await sessionManager.updateMeta(id, { title });
            } catch (e) {
                console.error('[ChatStore] Failed to persist session rename', e);
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message: 'Failed to rename session in database',
                    type: 'error',
                });
                return;
            }
            set((s) => ({
                sessions: updateSessionInList(s.sessions, id, { title }),
            }));
        },

        archiveSession: async (id) => {
            try {
                await sessionManager.updateMeta(id, { isArchived: true });
            } catch (e) {
                console.error('[ChatStore] Failed to persist archive state', e);
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message: 'Failed to archive session',
                    type: 'error',
                });
                return;
            }
            set((s) => ({
                sessions: updateSessionInList(s.sessions, id, { isArchived: true }),
            }));
        },

        unarchiveSession: async (id) => {
            try {
                await sessionManager.updateMeta(id, { isArchived: false });
            } catch (e) {
                console.error('[ChatStore] Failed to persist unarchive state', e);
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message: 'Failed to unarchive session',
                    type: 'error',
                });
                return;
            }
            set((s) => ({
                sessions: updateSessionInList(s.sessions, id, { isArchived: false }),
            }));
        },

        tagSession: async (id, tags) => {
            try {
                await sessionManager.updateMeta(id, { tags });
            } catch (e) {
                console.error('[ChatStore] Failed to persist tags', e);
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message: 'Failed to save tags',
                    type: 'error',
                });
                return;
            }
            set((s) => ({
                sessions: updateSessionInList(s.sessions, id, { tags }),
            }));
        },

        moveToFolder: async (id, folder) => {
            try {
                await sessionManager.updateMeta(id, { folder });
            } catch (e) {
                console.error('[ChatStore] Failed to persist folder', e);
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message: 'Failed to save folder',
                    type: 'error',
                });
                return;
            }
            set((s) => ({
                sessions: updateSessionInList(s.sessions, id, { folder }),
            }));
        },

        pinSession: async (id) => {
            const current = get().sessions.find((x) => x.id === id);
            const next = !current?.isPinned;
            try {
                await sessionManager.updateMeta(id, { isPinned: next });
            } catch (e) {
                console.error('[ChatStore] Failed to persist pin state', e);
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message: 'Failed to pin session in database',
                    type: 'error',
                });
                return;
            }
            set((s) => ({
                sessions: updateSessionInList(s.sessions, id, { isPinned: next }),
            }));
        },

        importSessions: async (imported) => {
            const existingIds = new Set(get().sessions.map((x) => x.id));
            const newSessions = imported.filter((x) => !existingIds.has(x.id));
            if (newSessions.length > 0) {
                const sStore = resolveSessionStore();
                if (sStore) {
                    try {
                        await sStore.bulkPut(newSessions);
                    } catch (e) {
                        console.error('[ChatStore] Failed to persist imported sessions', e);
                        eventBus.emit(EVENTS.NOTIFICATION, {
                            message: 'Failed to save imported sessions in database',
                            type: 'error',
                        });
                        return;
                    }
                }
            }
            set((s) => ({ sessions: [...newSessions, ...s.sessions] }));
        },

        switchModel: async (provider, model) => {
            if (get().isAnySending()) {
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message:
                        'Cannot switch model while a message is being sent. Wait for completion.',
                    type: 'warning',
                });
                return;
            }
            const sessionId = get().activeSessionId;
            const session = get().sessions.find((s) => s.id === sessionId);
            const historyText =
                session?.history
                    .map((h) => h.text + h.responses.map((r) => r.content).join(''))
                    .join('') || '';
            const estimatedTokens = Math.ceil(historyText.length / 4);
            const contextWindow = MODEL_CONTEXT_WINDOWS[model] || 128000;
            if (estimatedTokens > contextWindow * 0.85) {
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message: `Context (${estimatedTokens} tokens) may exceed ${model} limit (${contextWindow}). Consider starting a new chat.`,
                    type: 'warning',
                });
            }
            const systemEntry: ChatEntry = {
                id: crypto.randomUUID(),
                role: 'system' as const,
                text: `\u{1F504} Switched to ${provider}/${model}`,
                responses: [],
                timestamp: Date.now(),
            };
            const sStore = resolveSessionStore();
            if (sStore) {
                const fullSession = get().sessions.find((s) => s.id === sessionId);
                if (fullSession) {
                    try {
                        await sStore.put({
                            ...fullSession,
                            currentProvider: provider,
                            currentModel: model,
                            history: [...fullSession.history, systemEntry],
                            updatedAt: Date.now(),
                        });
                    } catch (e) {
                        console.error('[ChatStore] Failed to persist switchModel', e);
                        return;
                    }
                }
            }
            set((s) => ({
                sessions: updateSessionInList(s.sessions, sessionId, {
                    currentProvider: provider,
                    currentModel: model,
                }),
            }));
            uas((prev) => [...prev, systemEntry]);
        },

        switchKey: async (keyId) => {
            if (get().isAnySending()) {
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message:
                        'Cannot switch key while a message is being sent. Wait for completion.',
                    type: 'warning',
                });
                return;
            }
            const sessionId = get().activeSessionId;
            const keyLabel = keyId?.slice(0, 8) ?? '';
            const systemEntry: ChatEntry = {
                id: crypto.randomUUID(),
                role: 'system' as const,
                text: `\u{1F504} Switched to key ${keyLabel}...`,
                responses: [],
                timestamp: Date.now(),
            };
            const sStore = resolveSessionStore();
            if (sStore) {
                const fullSession = get().sessions.find((s) => s.id === sessionId);
                if (fullSession) {
                    try {
                        await sStore.put({
                            ...fullSession,
                            currentKeyId: keyId,
                            history: [...fullSession.history, systemEntry],
                            updatedAt: Date.now(),
                        });
                    } catch (e) {
                        console.error('[ChatStore] Failed to persist switchKey', e);
                        return;
                    }
                }
            }
            set((s) => ({
                sessions: updateSessionInList(s.sessions, sessionId, { currentKeyId: keyId }),
            }));
            uas((prev) => [...prev, systemEntry]);
        },

        getSessionConfig: () => {
            const sessionId = get().activeSessionId;
            const session = get().sessions.find((s) => s.id === sessionId);
            return session
                ? {
                      provider: session.currentProvider,
                      model: session.currentModel,
                      keyId: session.currentKeyId,
                  }
                : undefined;
        },

        destroy: () => {
            _unsubs.forEach((u) => u());
            _unsubs.length = 0;
        },
    };
});

let _chatStoreDestroyed = false;
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (!_chatStoreDestroyed) {
            _chatStoreDestroyed = true;
            useChatStore.getState().destroy();
        }
    });
}
