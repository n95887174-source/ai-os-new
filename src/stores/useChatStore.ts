import { useEffect } from 'react';
import { create } from 'zustand';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import type { ChatResponse } from '../types/chat';
import type { ChatMessage } from '../llm/core/types';
import type { SessionStore } from '../kernel/contracts/storage/session-store';
import { runtime } from '../kernel/runtime';

import { memoryService, workspaceService, featureFlagService, storageAdapter } from '../kernel/instances';
import { FEATURE_FLAGS } from '../kernel/contracts/feature-flags';
import { waitForStorage } from '../kernel/services/storage/sqlite-storage';

const MAX_HISTORY = 200; // B10-111: Cap history to prevent unbounded growth

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4o': 128000, 'gpt-4o-mini': 128000, 'gpt-4-turbo': 128000,
  'claude-3-opus': 200000, 'claude-3-sonnet': 200000, 'claude-3-haiku': 200000,
  'gemini-2.5-pro': 1000000, 'gemini-3.1-flash-lite': 1000000,
  'llama-3.3-70b-versatile': 128000, 'llama-3.1-8b-instant': 128000,
  'mixtral-8x7b-32768': 32768,
  'openrouter/auto': 128000,
};

export interface ChatEntry {
  id: string;
  requestId?: string;
  role: 'user' | 'system' | 'assistant';
  text: string;
  responses: ChatResponse[];
  timestamp: number;
  parentId?: string;
  recalledMemories?: { content: string; score?: number }[];
}

export interface ChatSession {
  id: string;
  title: string;
  history: ChatEntry[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  currentProvider?: string;
  currentModel?: string;
  currentKeyId?: string;
}

const DEFAULT_SESSION: ChatSession = {
  id: 'default',
  title: 'New Chat',
  history: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const SESSION_BATCH_SIZE = 50;

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string;
  activeRequestIds: Set<string>;
  isLoaded: boolean;
  hasMoreSessions: boolean;
  systemPrompt: string;
}

interface ChatActions {
  setSessions: (updater: (prev: ChatSession[]) => ChatSession[]) => void;
  setActiveSessionId: (id: string) => void;
  addActiveRequestId: (requestId: string) => void;
  removeActiveRequestId: (requestId: string) => void;
  hasActiveRequestId: (requestId: string) => boolean;
  isAnySending: () => boolean;
  setHasMoreSessions: (v: boolean) => void;
  setSystemPrompt: (s: string) => void;
  setIsLoaded: (v: boolean) => void;
  loadMoreSessions: () => Promise<void>;
  sendMessage: (
    targets: { provider: string; model: string; keyId?: string }[],
    text: string,
    systemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ) => Promise<void>;
  cancelSending: () => void;
  cancelMessage: (requestId: string) => void;
  editEntry: (entryId: string, newText: string) => void;
  clearHistory: () => void;
  createSession: (title?: string) => string;
  deleteSession: (id: string) => void;
  forkSession: (entryId: string, newTitle?: string) => void;
  renameSession: (id: string, title: string) => void;
  importSessions: (importedSessions: ChatSession[]) => void;
  switchModel: (provider: string, model: string) => void;
  switchKey: (keyId: string) => void;
  getSessionConfig: () => { provider?: string; model?: string; keyId?: string } | undefined;
}

export type ChatStoreShape = ChatState & ChatActions;

export const DEFAULT_HISTORY: ChatEntry[] = [];

interface RequestEntryRef {
  sessionId: string;
  entryId: string;
}

const requestEntryMap = new Map<string, RequestEntryRef>();

function rebuildRequestEntryMap(sessions: ChatSession[]): void {
  requestEntryMap.clear();
  for (const session of sessions) {
    for (const entry of session.history) {
      if (entry.requestId) {
        requestEntryMap.set(entry.requestId, { sessionId: session.id, entryId: entry.id });
      }
      for (const response of entry.responses) {
        if (response.requestId) {
          requestEntryMap.set(response.requestId, { sessionId: session.id, entryId: entry.id });
        }
      }
    }
  }
}

let _sessionStore: SessionStore | null = null;
function resolveSessionStore(): SessionStore | null {
  if (_sessionStore) return _sessionStore;
  _sessionStore = runtime.getService<{ sessions: SessionStore }>('storageLayer')?.sessions ?? null;
  return _sessionStore;
}

function genId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

function isResponseMatch(entry: ChatEntry, requestId: string | undefined, prefixMatch: (rid: string) => boolean): boolean {
  if (!requestId) return false;
  if (entry.requestId === requestId) return true;
  if (entry.requestId && prefixMatch(entry.requestId)) return true;
  return false;
}

type ZustandSet = (partial: ChatState | Partial<ChatState> | ((state: ChatState) => ChatState | Partial<ChatState>), replace?: boolean) => void;
type ZustandGet = () => ChatStoreShape;

const updateActiveSession =
  (set: ZustandSet, get: ZustandGet) =>
  (updater: (history: ChatEntry[]) => ChatEntry[]): void => {
    const id = get().activeSessionId;
    set(s => ({
      sessions: s.sessions.map(sess =>
        sess.id === id ? { ...sess, history: updater(sess.history), updatedAt: Date.now() } : sess
      ),
    }));
  };

export const useChatStore = create<ChatStoreShape>((set, get) => {
  const uas = updateActiveSession(set, get);

  return {
    sessions: [DEFAULT_SESSION],
    activeSessionId: 'default',
    activeRequestIds: new Set<string>(),
    isLoaded: false,
    hasMoreSessions: false,
    systemPrompt: '',

    setSessions: (updater) => set(s => ({ sessions: updater(s.sessions) })),
    setActiveSessionId: (id) => set({ activeSessionId: id }),
    addActiveRequestId: (requestId) => set(s => ({ activeRequestIds: new Set([...s.activeRequestIds, requestId]) })),
    removeActiveRequestId: (requestId) => set(s => {
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
        set(s => {
          const existing = new Set(s.sessions.map(x => x.id));
          const newOnes = more.filter(x => !existing.has(x.id));
          if (newOnes.length === 0) return {};
          return { sessions: [...s.sessions, ...newOnes] };
        });
      }
    },

    sendMessage: async (targets, text, systemPromptArg, temperature, maxTokens) => {
      if (get().isAnySending()) {
        console.warn('[ChatStore] sendMessage already in progress, ignored');
        return;
      }
      const requestId = `chat-${crypto.randomUUID()}`;
      const entryId = crypto.randomUUID();
      const sessionId = get().activeSessionId;
      const currentHistory = (get().sessions.find(s => s.id === sessionId)?.history ?? []).slice(0, MAX_HISTORY);

      const requestIdsToTrack: string[] = targets.length > 1
        ? targets.map(t => `${requestId}-${t.provider}`)
        : [requestId];
      requestIdsToTrack.forEach(rid => get().addActiveRequestId(rid));

      let relatedMemories: Array<{ entry: { content: string }; score?: number }> = [];
      if (featureFlagService.isEnabled(FEATURE_FLAGS.MEMORY_RAG_ON_CHAT)) {
        try {
          relatedMemories = (await memoryService.search(text, 3)) || [];
        } catch (e) {
          console.warn('[ChatStore] Memory search failed:', e);
        }
      }
      const contextPrefix = relatedMemories.length > 0
        ? `[RECALLED CONTEXT]\n${relatedMemories.map((m) => `- ${m.entry.content}`).join('\n')}\n\n`
        : '';

      if (featureFlagService.isEnabled(FEATURE_FLAGS.MEMORY_AUTO_STORE)) {
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
      }

      const workspaceContext = workspaceService.isAttached()
        ? await workspaceService.getFileTreeSnapshot()
        : null;

      const messages: ChatMessage[] = [
        ...(systemPromptArg ? [{ role: 'system' as const, content: systemPromptArg }] : []),
        ...(workspaceContext ? [{ role: 'system' as const, content: `[WORKSPACE FILES]\n${workspaceContext}\n\nYou can read any file by asking me to use the read_file tool.` }] : []),
        ...currentHistory.flatMap(h => [
          { role: 'user' as const, content: h.text },
          ...h.responses.filter(r => r.status === 'done').map(r => ({ role: 'assistant' as const, content: r.content })),
        ]),
        { role: 'user' as const, content: contextPrefix + text },
      ];

      const loadingResponses: ChatResponse[] = targets.map(t => ({
        id: genId(),
        requestId: targets.length > 1 ? `${requestId}-${t.provider}` : requestId,
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
        recalledMemories: relatedMemories.map(m => ({ content: m.entry.content, score: m.score })),
      };

      set(s => ({
        sessions: s.sessions.map(sess =>
          sess.id === sessionId
            ? { ...sess, history: [...sess.history, newEntry].slice(-MAX_HISTORY), updatedAt: Date.now() }
            : sess
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
    },

    cancelSending: () => {
      const sessionId = get().activeSessionId;
      const session = get().sessions.find(s => s.id === sessionId);
      if (!session) { set({ activeRequestIds: new Set() }); return; }
      const loadingReqs = session.history
        .flatMap(e => (e.responses || []).map(r => ({ entryId: e.id, requestId: r.requestId, status: r.status })))
        .filter(r => r.status === 'loading' || r.status === 'streaming');
      for (const req of loadingReqs) {
        if (req.requestId) eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId: req.requestId });
      }
      set(s => ({
        activeRequestIds: new Set<string>(),
        sessions: s.sessions.map(sess =>
          sess.id === sessionId
            ? {
                ...sess,
                history: sess.history.map(e => ({
                  ...e,
                  responses: e.responses.map(r =>
                    r.status === 'loading' || r.status === 'streaming' ? { ...r, status: 'cancelled' as const } : r
                  ),
                })),
              }
            : sess
        ),
      }));
    },

    cancelMessage: (requestId) => {
      eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId });
    },

    editEntry: (entryId, newText) => {
      uas(prev => prev.map(e => e.id === entryId ? { ...e, text: newText, responses: [] } : e));
    },

    clearHistory: () => uas(() => []),

    createSession: (title = 'New Chat') => {
      const id = crypto.randomUUID();
      const newSession: ChatSession = { id, title, history: [], createdAt: Date.now(), updatedAt: Date.now() };
      set(s => ({ sessions: [newSession, ...s.sessions], activeSessionId: id }));
      return id;
    },

    deleteSession: (id) => {
      set(s => {
        const filtered = s.sessions.filter(x => x.id !== id);
        if (filtered.length === 0) {
          const fresh: ChatSession = { id: 'default', title: 'New Chat', history: [], createdAt: Date.now(), updatedAt: Date.now() };
          return { sessions: [fresh], activeSessionId: 'default' };
        }
        if (s.activeSessionId === id) {
          return { sessions: filtered, activeSessionId: filtered[0].id };
        }
        return { sessions: filtered };
      });
    },

    forkSession: (entryId, newTitle) => {
      const sessionId = get().activeSessionId;
      const session = get().sessions.find(s => s.id === sessionId);
      if (!session) return;
      const entryIndex = session.history.findIndex(e => e.id === entryId);
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
      set(s => ({ sessions: [newSession, ...s.sessions], activeSessionId: id }));
    },

    renameSession: (id, title) => {
      set(s => ({ sessions: s.sessions.map(x => x.id === id ? { ...x, title } : x) }));
    },

    importSessions: (imported) => {
      set(s => {
        const existingIds = new Set(s.sessions.map(x => x.id));
        const newSessions = imported.filter(x => !existingIds.has(x.id));
        return { sessions: [...newSessions, ...s.sessions] };
      });
    },

    switchModel: (provider, model) => {
      const sessionId = get().activeSessionId;
      const session = get().sessions.find(s => s.id === sessionId);
      const historyText = session?.history.map(h => h.text + h.responses.map(r => r.content).join('')).join('') || '';
      const estimatedTokens = Math.ceil(historyText.length / 4);
      const contextWindow = MODEL_CONTEXT_WINDOWS[model] || 128000;
      if (estimatedTokens > contextWindow * 0.85) {
        eventBus.emit(EVENTS.NOTIFICATION, {
          message: `Context (${estimatedTokens} tokens) may exceed ${model} limit (${contextWindow}). Consider starting a new chat.`,
          type: 'warning',
        });
      }
      set(s => ({
        sessions: s.sessions.map(x =>
          x.id === sessionId
            ? { ...x, currentProvider: provider, currentModel: model, updatedAt: Date.now() }
            : x
        ),
      }));
      uas(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system' as const,
        text: `\u{1F504} Switched to ${provider}/${model}`,
        responses: [],
        timestamp: Date.now(),
      }]);
    },

    switchKey: (keyId) => {
      const sessionId = get().activeSessionId;
      set(s => ({
        sessions: s.sessions.map(x =>
          x.id === sessionId ? { ...x, currentKeyId: keyId, updatedAt: Date.now() } : x
        ),
      }));
      const keyLabel = keyId?.slice(0, 8) ?? '';
      uas(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system' as const,
        text: `\u{1F504} Switched to key ${keyLabel}...`,
        responses: [],
        timestamp: Date.now(),
      }]);
    },

    getSessionConfig: () => {
      const sessionId = get().activeSessionId;
      const session = get().sessions.find(s => s.id === sessionId);
      return session
        ? { provider: session.currentProvider, model: session.currentModel, keyId: session.currentKeyId }
        : undefined;
    },
  };
});

/**
 * Selector helper — returns the active session's history array.
 * Use this in components instead of computing `history` from
 * `sessions` + `activeSessionId` manually.
 */
export function useActiveSessionHistory(): ChatEntry[] {
  return useChatStore((s) => {
    const session = s.sessions.find((x) => x.id === s.activeSessionId);
    return session ? session.history : DEFAULT_HISTORY;
  });
}

// === Module-level eventBus subscriptions (run once on import) ===

// H-18: Track all unsub callbacks for HMR cleanup
let moduleUnsubs: (() => void)[] = [];

function matchesRequest(entry: ChatEntry, requestId: string): boolean {
  return isResponseMatch(entry, requestId, (rid) => requestId.startsWith(rid + '-'));
}

function matchesResponse(r: ChatResponse, provider: string | undefined, requestId: string): boolean {
  if (r.provider !== provider) return false;
  if (r.requestId === requestId) return true;
  if (r.requestId && requestId.startsWith(r.requestId + '-')) return true;
  return false;
}

function updateSessionsForRequest(
  sessions: ChatSession[],
  requestId: string | undefined,
  updater: (entry: ChatEntry) => ChatEntry,
): ChatSession[] {
  if (!requestId) return sessions;
  const ref = requestEntryMap.get(requestId);
  if (!ref) return sessions;

  const sessionIndex = sessions.findIndex(sess => sess.id === ref.sessionId);
  if (sessionIndex === -1) {
    requestEntryMap.delete(requestId);
    return sessions;
  }

  const session = sessions[sessionIndex];
  const entryIndex = session.history.findIndex(entry => entry.id === ref.entryId);
  if (entryIndex === -1) {
    requestEntryMap.delete(requestId);
    return sessions;
  }

  const currentEntry = session.history[entryIndex];
  const nextEntry = updater(currentEntry);
  if (nextEntry === currentEntry) return sessions;

  const nextHistory = [...session.history];
  nextHistory[entryIndex] = nextEntry;

  const nextSessions = [...sessions];
  nextSessions[sessionIndex] = {
    ...session,
    history: nextHistory,
    updatedAt: Date.now(),
  };
  return nextSessions;
}

moduleUnsubs.push(eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
  useChatStore.setState(s => ({
    sessions: updateSessionsForRequest(s.sessions, res.requestId, (entry) => {
      const responseIndex = entry.responses.findIndex(r =>
        r.id === res.id || (r.provider === res.provider && r.requestId === res.requestId)
      );
      if (responseIndex === -1) {
        return { ...entry, responses: [...entry.responses, res] };
      }
      return {
        ...entry,
        responses: entry.responses.map((r, i) => i === responseIndex ? res : r),
      };
    }),
  }));
  if (res.requestId) useChatStore.getState().removeActiveRequestId(res.requestId);
}));

moduleUnsubs.push(eventBus.on(EVENTS.STREAM_START, ({ requestId, provider, model }) => {
  useChatStore.setState(s => ({
    sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => {
      const responseIndex = entry.responses.findIndex(r =>
        r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId + '-'))
      );
      if (responseIndex === -1) {
        const newRes: ChatResponse = {
          id: genId(),
          requestId,
          provider,
          model: model || 'auto',
          content: '',
          latency: 0,
          status: 'loading',
        };
        return { ...entry, responses: [...entry.responses, newRes] };
      }
      return {
        ...entry,
        responses: entry.responses.map((r, i) =>
          i === responseIndex ? { ...r, provider, model, status: 'loading' as const, content: '' } : r
        ),
      };
    }),
  }));
}));

moduleUnsubs.push(eventBus.on(EVENTS.STREAM_CHUNK, ({ requestId, provider, chunk }) => {
  useChatStore.setState(s => ({
    sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => {
      if (entry.responses.length === 0) return entry;
      return {
        ...entry,
        responses: entry.responses.map(r =>
          matchesResponse(r, provider, requestId)
            ? { ...r, content: r.content + chunk, status: 'streaming' as const }
            : r
        ),
      };
    }),
  }));
}));

moduleUnsubs.push(eventBus.on(EVENTS.STREAM_END, ({ requestId, provider, fullContent, latency, ttft, tps }) => {
  useChatStore.setState(s => ({
    sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => {
      if (entry.responses.length === 0) return entry;
      return {
        ...entry,
        responses: entry.responses.map(r =>
          matchesResponse(r, provider, requestId)
            ? { ...r, content: fullContent ?? r.content, latency: latency ?? 0, ttft: ttft ?? 0, tps: tps ?? 0, status: 'done' as const }
            : r
        ),
      };
    }),
  }));
  useChatStore.getState().removeActiveRequestId(requestId);

  if (featureFlagService.isEnabled(FEATURE_FLAGS.MEMORY_AUTO_STORE)) {
    memoryService.store({
      content: fullContent,
      metadata: {
        source: provider || 'system',
        type: 'chat_response' as const,
        timestamp: Date.now(),
        importance: 0.7,
        chatId: useChatStore.getState().activeSessionId,
        requestId,
      },
    }).catch(e => console.warn('[ChatStore] Memory store on stream end failed:', e));
  }
}));

moduleUnsubs.push(eventBus.on(EVENTS.STREAM_ERROR, ({ requestId, provider, error }) => {
  useChatStore.setState(s => ({
    sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => ({
      ...entry,
      responses: entry.responses.map(r =>
        matchesResponse(r, provider, requestId) ? { ...r, status: 'error' as const, error } : r
      ),
    })),
  }));
  useChatStore.getState().removeActiveRequestId(requestId);
  // OBS-74: emit monitoring event for stream errors
  eventBus.emit(EVENTS.METRICS_ALERT, { id: `stream-${requestId}`, metric: 'stream_error', value: 1, severity: 'warning', timestamp: Date.now() });
}));

moduleUnsubs.push(eventBus.on(EVENTS.CANCEL_MESSAGE, ({ requestId }) => {
  if (!requestId) return;
  useChatStore.setState(s => ({
    sessions: updateSessionsForRequest(s.sessions, requestId, (entry) => ({
      ...entry,
      responses: entry.responses.map(r =>
        r.requestId === requestId ? { ...r, status: 'error' as const, error: 'Cancelled by user' } : r
      ),
    })),
  }));
  useChatStore.getState().removeActiveRequestId(requestId);
}));

// === Hydration hook — call once from app root to load sessions from Dexie ===

export function useChatStoreHydration(): void {
  useEffect(() => {
    let cancelled = false;
    let syncTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = async () => {
      if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
      const sStore = resolveSessionStore();
      if (!sStore) return;
      try {
        await sStore.bulkPut(useChatStore.getState().sessions);
      } catch (e) {
        console.error('[ChatStore] Failed to sync to Dexie', e);
      }
    };

    const load = async () => {
      try {
        const storage = await waitForStorage();
        if (cancelled) return;
        const sStore = storage?.sessions ?? null;
        if (!sStore) {
          console.warn('[ChatStore] SessionStore unavailable — using default session');
          useChatStore.setState({ isLoaded: true });
          return;
        }
        _sessionStore = sStore;
        const total = await sStore.count();

        const legacyData = storageAdapter.getItem('super_agents_chat_sessions');
        if (legacyData) {
          try {
            const parsed = JSON.parse(legacyData) as ChatSession[];
            if (parsed.length > 0) {
              await sStore.bulkPut(parsed);
              // B10-112: Recount total after legacy migration (total was stale — fetched before bulkPut)
              const migratedTotal = await sStore.count();
              useChatStore.setState({
                sessions: parsed,
                activeSessionId: parsed[0].id,
                hasMoreSessions: parsed.length < migratedTotal,
              });
            }
          } catch { /* ignore corrupt localStorage data */ }
          storageAdapter.removeItem('super_agents_chat_sessions');
          storageAdapter.removeItem('super_agents_chat_sessions_ts');
        } else if (total > 0) {
          const batch = await sStore.listSessions(SESSION_BATCH_SIZE);
          useChatStore.setState({
            sessions: batch,
            activeSessionId: batch[0]?.id ?? 'default',
            hasMoreSessions: batch.length < total,
          });
        } else {
          await sStore.put(DEFAULT_SESSION);
        }
      } catch (e) {
        console.warn('[ChatStore] Dexie unavailable, using default session:', e instanceof Error ? e.message : e);
      } finally {
        if (!cancelled) useChatStore.setState({ isLoaded: true });
      }
    };

    load();

    const unsubPersist = useChatStore.subscribe((state) => {
      if (!state.isLoaded) return;
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(flush, 1000);
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (syncTimer) clearTimeout(syncTimer);
      unsubPersist();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}

// H-18: Clean up module-level subscriptions on HMR to prevent duplicate handlers
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    moduleUnsubs.forEach(u => u());
    moduleUnsubs = [];
  });
}

rebuildRequestEntryMap(useChatStore.getState().sessions);
useChatStore.subscribe((state, prevState) => {
  if (state.sessions !== prevState.sessions) {
    rebuildRequestEntryMap(state.sessions);
  }
});
