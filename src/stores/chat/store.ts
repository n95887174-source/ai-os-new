import { create } from 'zustand';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import type { ChatResponse } from '../../types/chat';
import type { ChatMessage } from '../../kernel/types/llm-types';
import type { SessionStore } from '../../kernel/contracts/storage/session-store';
import { CONFIG } from '../../kernel/services/config-registry';
import { runtime } from '../../kernel/runtime';
import {
    executionGovernor,
    memoryService,
    workspaceService,
    sessionManager,
} from '../../kernel/instances';
import type { ChatStoreShape, ChatEntry, ChatSession, ZustandSet, ZustandGet } from './types';
import {
    DEFAULT_SESSION,
    SESSION_BATCH_SIZE,
    MAX_HISTORY,
    MODEL_CONTEXT_WINDOWS,
    DELETED_IDS_TTL,
    genId,
} from './types';

let _sessionStore: SessionStore | null = null;
function resolveSessionStore(): SessionStore | null {
    if (_sessionStore) return _sessionStore;
    _sessionStore =
        runtime.getService<{ sessions: SessionStore }>('storageLayer')?.sessions ?? null;
    return _sessionStore;
}

const updateActiveSession =
    (set: ZustandSet, get: ZustandGet) =>
    (updater: (history: ChatEntry[]) => ChatEntry[]): void => {
        const id = get().activeSessionId;
        set((s) => ({
            sessions: s.sessions.map((sess) =>
                sess.id === id
                    ? { ...sess, history: updater(sess.history), updatedAt: Date.now() }
                    : sess,
            ),
        }));
    };

let _sendLock = false;

export const useChatStore = create<ChatStoreShape>((set, get) => {
    const uas = updateActiveSession(set, get);

    return {
        sessions: [DEFAULT_SESSION],
        activeSessionId: 'default',
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
            if (_sendLock) {
                console.warn('[ChatStore] sendMessage ignored — lock held');
                return;
            }
            const requestId = `chat-${crypto.randomUUID()}`;
            const entryId = crypto.randomUUID();
            const sessionId = get().activeSessionId;
            let requestIdsToTrack: string[] = [];
            let govOp;
            let currentHistory: ChatEntry[];
            try {
                _sendLock = true;
                currentHistory = (
                    get().sessions.find((s) => s.id === sessionId)?.history ?? []
                ).slice(-MAX_HISTORY);
                requestIdsToTrack =
                    targets.length > 1
                        ? targets.map((_, idx) => `${requestId}-${idx}`)
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
                    const stateWithNew = {
                        ...get(),
                        sessions: get().sessions.map((sess) =>
                            sess.id === sessionId
                                ? {
                                      ...sess,
                                      history: [...sess.history, newEntry].slice(-MAX_HISTORY),
                                      updatedAt: Date.now(),
                                  }
                                : sess,
                        ),
                    };
                    await sStore.syncSessions(stateWithNew.sessions, []).catch((e) => {
                        console.warn(
                            '[ChatStore] write-through persist failed — message not saved',
                            e,
                        );
                        throw e;
                    });
                }

                set((s) => ({
                    sessions: s.sessions.map((sess) =>
                        sess.id === sessionId
                            ? {
                                  ...sess,
                                  history: [...sess.history, newEntry].slice(-MAX_HISTORY),
                                  updatedAt: Date.now(),
                              }
                            : sess,
                    ),
                }));

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
                requestIdsToTrack?.forEach((rid) => get().removeActiveRequestId(rid));
                _sendLock = false;
            }
        },

        cancelSending: () => {
            const sessionId = get().activeSessionId;
            const session = get().sessions.find((s) => s.id === sessionId);
            if (!session) {
                set({ activeRequestIds: new Set() });
                return;
            }
            const loadingReqs = session.history
                .flatMap((e) =>
                    (e.responses || []).map((r) => ({
                        entryId: e.id,
                        requestId: r.requestId,
                        status: r.status,
                    })),
                )
                .filter((r) => r.status === 'loading' || r.status === 'streaming');
            for (const req of loadingReqs) {
                if (req.requestId)
                    eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId: req.requestId });
            }
            set((s) => ({
                activeRequestIds: new Set<string>(),
                sessions: s.sessions.map((sess) =>
                    sess.id === sessionId
                        ? {
                              ...sess,
                              history: sess.history.map((e) => ({
                                  ...e,
                                  responses: e.responses.map((r) =>
                                      r.status === 'loading' || r.status === 'streaming'
                                          ? { ...r, status: 'cancelled' as const }
                                          : r,
                                  ),
                              })),
                          }
                        : sess,
                ),
            }));
        },

        cancelMessage: (requestId) => {
            eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId });
        },

        editEntry: (entryId, newText) => {
            if (get().isAnySending()) {
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message:
                        'Cannot edit message while a message is being sent. Cancel first or wait for completion.',
                    type: 'warning',
                });
                return;
            }
            uas((prev) =>
                prev.map((e) =>
                    e.id === entryId
                        ? {
                              ...e,
                              text: newText,
                              responses: e.responses.some(
                                  (r) => r.status === 'loading' || r.status === 'streaming',
                              )
                                  ? []
                                  : e.responses,
                          }
                        : e,
                ),
            );
        },

        clearHistory: () => uas(() => []),

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

        deleteSession: (id) => {
            sessionManager.delete(id).catch(() => {});
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
                        activeSessionId: 'default',
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

        forkSession: (entryId, newTitle) => {
            const sessionId = get().activeSessionId;
            const session = get().sessions.find((s) => s.id === sessionId);
            if (!session) return;
            const entryIndex = session.history.findIndex((e) => e.id === entryId);
            if (entryIndex === -1) return;
            const newHistory = session.history.slice(0, entryIndex + 1);
            const id = crypto.randomUUID();
            const newSession: ChatSession = {
                id,
                title: newTitle || `Fork of ${session.title}`,
                history: newHistory,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            set((s) => ({ sessions: [newSession, ...s.sessions], activeSessionId: id }));
            const sStore = resolveSessionStore();
            if (sStore) sStore.put(newSession).catch(() => {});
        },

        renameSession: (id, title) => {
            set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, title } : x)) }));
            sessionManager.updateMeta(id, { title }).catch(() => {});
        },

        archiveSession: (id) => {
            set((s) => ({
                sessions: s.sessions.map((x) => (x.id === id ? { ...x, isArchived: true } : x)),
            }));
        },

        unarchiveSession: (id) => {
            set((s) => ({
                sessions: s.sessions.map((x) => (x.id === id ? { ...x, isArchived: false } : x)),
            }));
        },

        tagSession: (id, tags) => {
            set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, tags } : x)) }));
        },

        moveToFolder: (id, folder) => {
            set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, folder } : x)) }));
        },

        pinSession: (id) => {
            set((s) => {
                const current = s.sessions.find((x) => x.id === id);
                const next = !current?.isPinned;
                sessionManager.updateMeta(id, { isPinned: next }).catch(() => {});
                return {
                    sessions: s.sessions.map((x) => (x.id === id ? { ...x, isPinned: next } : x)),
                };
            });
        },

        importSessions: (imported) => {
            set((s) => {
                const existingIds = new Set(s.sessions.map((x) => x.id));
                const newSessions = imported.filter((x) => !existingIds.has(x.id));
                const sStore = resolveSessionStore();
                if (sStore && newSessions.length > 0) sStore.bulkPut(newSessions).catch(() => {});
                return { sessions: [...newSessions, ...s.sessions] };
            });
        },

        switchModel: (provider, model) => {
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
            set((s) => ({
                sessions: s.sessions.map((x) =>
                    x.id === sessionId
                        ? {
                              ...x,
                              currentProvider: provider,
                              currentModel: model,
                              updatedAt: Date.now(),
                          }
                        : x,
                ),
            }));
            uas((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'system' as const,
                    text: `\u{1F504} Switched to ${provider}/${model}`,
                    responses: [],
                    timestamp: Date.now(),
                },
            ]);
        },

        switchKey: (keyId) => {
            if (get().isAnySending()) {
                eventBus.emit(EVENTS.NOTIFICATION, {
                    message:
                        'Cannot switch key while a message is being sent. Wait for completion.',
                    type: 'warning',
                });
                return;
            }
            const sessionId = get().activeSessionId;
            set((s) => ({
                sessions: s.sessions.map((x) =>
                    x.id === sessionId ? { ...x, currentKeyId: keyId, updatedAt: Date.now() } : x,
                ),
            }));
            const keyLabel = keyId?.slice(0, 8) ?? '';
            uas((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: 'system' as const,
                    text: `\u{1F504} Switched to key ${keyLabel}...`,
                    responses: [],
                    timestamp: Date.now(),
                },
            ]);
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
    };
});
