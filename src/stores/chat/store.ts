import { create } from 'zustand';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import type { ChatResponse } from '../../types/chat';
import type { ChatMessage } from '../../llm/core/types';
import type { SessionStore } from '../../kernel/contracts/storage/session-store';
import { runtime } from '../../kernel/runtime';
import { memoryService, workspaceService, featureFlagService } from '../../kernel/instances';
import { FEATURE_FLAGS } from '../../kernel/contracts/feature-flags';
import type { ChatStoreShape, ChatEntry, ChatSession, ZustandSet, ZustandGet } from './types'
import {
  DEFAULT_SESSION, SESSION_BATCH_SIZE, MAX_HISTORY, MODEL_CONTEXT_WINDOWS,
  genId,
} from './types';

let _sessionStore: SessionStore | null = null;
function resolveSessionStore(): SessionStore | null {
  if (_sessionStore) return _sessionStore;
  _sessionStore = runtime.getService<{ sessions: SessionStore }>('storageLayer')?.sessions ?? null;
  return _sessionStore;
}

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
    deletedIds: new Set<string>(),
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
      const requestId = `chat-${crypto.randomUUID()}`;
      const entryId = crypto.randomUUID();
      const sessionId = get().activeSessionId;
      const currentHistory = (get().sessions.find(s => s.id === sessionId)?.history ?? []).slice(0, MAX_HISTORY);

      const requestIdsToTrack: string[] = targets.length > 1
        ? targets.map((t, i) => `${requestId}-${t.provider}-${t.keyId ?? i}`)
        : [requestId];

      if (get().isAnySending()) {
        console.warn('[ChatStore] sendMessage already in progress, ignored');
        return;
      }
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

      const loadingResponses: ChatResponse[] = targets.map((t, idx) => ({
        id: genId(),
        requestId: targets.length > 1 ? `${requestId}-${t.provider}-${t.keyId ?? idx}` : requestId,
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
          return { sessions: [fresh], activeSessionId: 'default', deletedIds: new Set([...s.deletedIds, id]) };
        }
        if (s.activeSessionId === id) {
          return { sessions: filtered, activeSessionId: filtered[0].id, deletedIds: new Set([...s.deletedIds, id]) };
        }
        return { sessions: filtered, deletedIds: new Set([...s.deletedIds, id]) };
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

