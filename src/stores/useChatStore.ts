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
  isSending: boolean;
  isLoaded: boolean;
  hasMoreSessions: boolean;
  systemPrompt: string;
}

interface ChatActions {
  setSessions: (updater: (prev: ChatSession[]) => ChatSession[]) => void;
  setActiveSessionId: (id: string) => void;
  setIsSending: (v: boolean) => void;
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

const updateFinishState = (
  set: ZustandSet,
  get: ZustandGet
): void => {
  const id = get().activeSessionId;
  const session = get().sessions.find(s => s.id === id);
  // B10-110: Also reset isSending when session is cleared or history is empty
  if (!session) { set({ isSending: false }); return; }
  const lastEntry = session.history[session.history.length - 1];
  if (!lastEntry) { set({ isSending: false }); return; }
  if (lastEntry.responses.length > 0) {
    const allDone = lastEntry.responses.every(r => r.status !== 'loading');
    if (allDone) set({ isSending: false });
  }
};

export const useChatStore = create<ChatStoreShape>((set, get) => {
  const uas = updateActiveSession(set, get);

  return {
    sessions: [DEFAULT_SESSION],
    activeSessionId: 'default',
    isSending: false,
    isLoaded: false,
    hasMoreSessions: false,
    systemPrompt: '',

    setSessions: (updater) => set(s => ({ sessions: updater(s.sessions) })),
    setActiveSessionId: (id) => set({ activeSessionId: id }),
    setIsSending: (v) => set({ isSending: v }),
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
      if (get().isSending) {
        console.warn('[ChatStore] sendMessage already in progress, ignored');
        return;
      }
      const requestId = `chat-${crypto.randomUUID()}`;
      const entryId = crypto.randomUUID();
      const sessionId = get().activeSessionId;
      const currentHistory = (get().sessions.find(s => s.id === sessionId)?.history ?? []).slice(0, MAX_HISTORY);

      set({ isSending: true });

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
      const lastReq = get().sessions
        .find(s => s.id === get().activeSessionId)
        ?.history.at(-1)?.requestId;
      if (lastReq) {
        eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId: lastReq });
      }
      set({ isSending: false });
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
      const keyLabel = keyId.slice(0, 8);
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

moduleUnsubs.push(eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
  useChatStore.setState(s => ({
    sessions: s.sessions.map(sess => {
      const hasMatch = sess.history.some(e => matchesRequest(e, res.requestId ?? ''));
      if (!hasMatch) return sess;
      return {
        ...sess,
        history: sess.history.map(entry => {
          if (!matchesRequest(entry, res.requestId ?? '')) return entry;
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
        updatedAt: Date.now(),
      };
    }),
  }));
  updateFinishState(useChatStore.setState, useChatStore.getState);
}));

moduleUnsubs.push(eventBus.on(EVENTS.STREAM_START, ({ requestId, provider, model }) => {
  useChatStore.setState(s => ({
    sessions: s.sessions.map(sess => {
      const hasMatch = sess.history.some(e => matchesRequest(e, requestId));
      if (!hasMatch) return sess;
      return {
        ...sess,
        history: sess.history.map(entry => {
          if (!matchesRequest(entry, requestId)) return entry;
          const responseIndex = entry.responses.findIndex(r =>
            r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId! + '-'))
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
        updatedAt: Date.now(),
      };
    }),
  }));
}));

moduleUnsubs.push(eventBus.on(EVENTS.STREAM_CHUNK, ({ requestId, provider, chunk }) => {
  useChatStore.setState(s => ({
    sessions: s.sessions.map(sess => {
      const hasMatch = sess.history.some(e => matchesRequest(e, requestId));
      if (!hasMatch) return sess;
      return {
        ...sess,
        history: sess.history.map(entry => {
          if (!matchesRequest(entry, requestId)) return entry;
          // B10-113: Skip if responses were cleared by editEntry (stale stream)
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
        updatedAt: Date.now(),
      };
    }),
  }));
}));

moduleUnsubs.push(eventBus.on(EVENTS.STREAM_END, ({ requestId, provider, fullContent, latency, ttft, tps }) => {
  useChatStore.setState(s => ({
    sessions: s.sessions.map(sess => {
      const hasMatch = sess.history.some(e => matchesRequest(e, requestId));
      if (!hasMatch) return sess;
      return {
        ...sess,
        history: sess.history.map(entry => {
          if (!matchesRequest(entry, requestId)) return entry;
          // B10-113: Skip if responses were cleared by editEntry (stale stream)
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
        updatedAt: Date.now(),
      };
    }),
  }));
  updateFinishState(useChatStore.setState, useChatStore.getState);

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
    sessions: s.sessions.map(sess => {
      const hasMatch = sess.history.some(e => matchesRequest(e, requestId));
      if (!hasMatch) return sess;
      return {
        ...sess,
        history: sess.history.map(entry => {
          if (!matchesRequest(entry, requestId)) return entry;
          return {
            ...entry,
            responses: entry.responses.map(r =>
              matchesResponse(r, provider, requestId) ? { ...r, status: 'error' as const, error } : r
            ),
          };
        }),
        updatedAt: Date.now(),
      };
    }),
  }));
  updateFinishState(useChatStore.setState, useChatStore.getState);
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
