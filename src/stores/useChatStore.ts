import { useState, useEffect, useCallback, useRef } from 'react';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import type { ChatResponse } from '../types/chat';
import type { ChatMessage } from '../llm/core/types';
import type { SessionStore } from '../kernel/contracts/storage/session-store';
import { runtime } from '../kernel/runtime';

import { memoryService, workspaceService, featureFlagService, storageAdapter } from '../kernel/instances';
import { FEATURE_FLAGS } from '../kernel/contracts/feature-flags';
import { waitForStorage } from '../kernel/services/storage/sqlite-storage';

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4o': 128000, 'gpt-4o-mini': 128000, 'gpt-4-turbo': 128000,
  'claude-3-opus': 200000, 'claude-3-sonnet': 200000, 'claude-3-haiku': 200000,
  'gemini-2.5-pro': 1000000, 'gemini-3.1-flash-lite': 1000000,
  'gemini-3.1-flash-lite': 1000000, 'gemini-3.1-flash-lite': 1000000,
  'llama-3.3-70b-versatile': 128000, 'llama-3.1-8b-instant': 128000,
  'mixtral-8x7b-32768': 32768,
  'openrouter/auto': 128000,
};

let _sessionStore: SessionStore | null = null;
function getSessions(): SessionStore | null {
  if (_sessionStore) return _sessionStore;
  _sessionStore = runtime.getService<{ sessions: SessionStore }>('storageLayer')?.sessions ?? null;
  return _sessionStore;
}

export interface ChatEntry {
  id: string;
  requestId?: string;
  role: 'user' | 'system';
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
  updatedAt: Date.now() 
};

const SESSION_BATCH_SIZE = 50;

export const useChatStore = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([DEFAULT_SESSION]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [isSending, setIsSending] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasMoreSessions, setHasMoreSessions] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const loadedCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const loadingRef = useRef(false);

  const loadMoreSessions = useCallback(async () => {
    try {
      const sStore = getSessions();
      if (!sStore) return;
      const offset = loadedCountRef.current;
      const more = await sStore.listSessions(SESSION_BATCH_SIZE, offset);
      if (more.length > 0) {
        loadedCountRef.current += more.length;
        setSessions(prev => {
          const existing = new Set(prev.map(s => s.id));
          const newOnes = more.filter(s => !existing.has(s.id));
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
        setHasMoreSessions(loadedCountRef.current < totalCountRef.current);
      }
    } catch (e) {
      console.warn('[ChatStore] Failed to load more sessions:', e);
    }
  }, []);

  // Load from Dexie on mount; one-time migrate from localStorage if present
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    let cancelled = false;
    const loadSessions = async () => {
      try {
        const storage = await waitForStorage();
        if (cancelled) return;
        const sStore = storage?.sessions ?? null;
        if (!sStore) {
          console.warn('[ChatStore] SessionStore unavailable — using default session');
          return;
        }
        _sessionStore = sStore;
        totalCountRef.current = await sStore.count();

        // One-time migration: if localStorage has data, import and remove
        const legacyData = storageAdapter.getItem('super_agents_chat_sessions');
        if (legacyData) {
          try {
            const parsed = JSON.parse(legacyData) as ChatSession[];
            if (parsed.length > 0) {
              await sStore.bulkPut(parsed);
              loadedCountRef.current = parsed.length;
              totalCountRef.current = parsed.length;
              setSessions(parsed);
              setActiveSessionId(parsed[0].id);
            }
          } catch { /* ignore corrupt localStorage data */ }
          storageAdapter.removeItem('super_agents_chat_sessions');
          storageAdapter.removeItem('super_agents_chat_sessions_ts');
          setHasMoreSessions(loadedCountRef.current < totalCountRef.current);
        } else if (totalCountRef.current > 0) {
          const batch = await sStore.listSessions(SESSION_BATCH_SIZE);
          loadedCountRef.current = batch.length;
          setSessions(batch);
          setActiveSessionId(batch[0].id);
          setHasMoreSessions(loadedCountRef.current < totalCountRef.current);
        } else {
          await sStore.put(DEFAULT_SESSION);
        }
      } catch (e) {
        console.warn('[ChatStore] Dexie unavailable, using default session:', e instanceof Error ? e.message : e);
      } finally {
        if (!cancelled) setIsLoaded(true);
        loadingRef.current = false;
      }
    };
    loadSessions();
    return () => { cancelled = true; };
  }, []);

  // Sync to Dexie with 1s debounce
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionsRef = useRef(sessions);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  const flushToDexie = useCallback(async () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    try {
      const sStore = getSessions();
      if (!sStore) return;
      await sStore.bulkPut(sessionsRef.current);
    } catch (e) {
      console.error('[ChatStore] Failed to sync to Dexie', e);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(flushToDexie, 1000);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [sessions, isLoaded, flushToDexie]);

  // Force-flush to Dexie on visibility change (tab close / switch)
  useEffect(() => {
    if (!isLoaded) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushToDexie();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isLoaded, flushToDexie]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || DEFAULT_SESSION;
  const history = activeSession.history;

  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const updateActiveSession = useCallback((updater: (history: ChatEntry[]) => ChatEntry[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      return { ...s, history: updater(s.history), updatedAt: Date.now() };
    }));
  }, [activeSessionId]);

  const activeSessionIdRef = useRef(activeSessionId);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Refs for session-routing to avoid re-subscribing on session switch
  const updateActiveSessionRef = useRef(updateActiveSession);
  useEffect(() => { updateActiveSessionRef.current = updateActiveSession; }, [updateActiveSession]);

  useEffect(() => {
    const updateFinishState = () => {
      setSessions(prev => {
        const session = prev.find(s => s.id === activeSessionIdRef.current);
        if (!session || session.history.length === 0) return prev;
        const lastEntry = session.history[session.history.length - 1];
        if (lastEntry && lastEntry.responses.length > 0) {
          const allDone = lastEntry.responses.every(r => r.status !== 'loading');
          if (allDone) {
            setIsSending(false);
            sendingRef.current = false;
          }
        }
        return prev;
      });
    };

    const uas = () => updateActiveSessionRef.current;

    // Static response
    const unsubRes = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
      uas()(prev => prev.map(entry => {
        if (entry.requestId !== res.requestId && !res.requestId?.startsWith(entry.requestId + '-')) return entry;
        
        const responseIndex = entry.responses.findIndex(r => 
          r.id === res.id || (r.provider === res.provider && r.requestId === res.requestId)
        );

        if (responseIndex === -1) {
          return { ...entry, responses: [...entry.responses, res] };
        }

        return {
          ...entry,
          responses: entry.responses.map((r, i) => i === responseIndex ? res : r)
        };
      }));
      updateFinishState();
    });

    // Stream Start
    const unsubStart = eventBus.on(EVENTS.STREAM_START, ({ requestId, provider, model }) => {
      uas()(prev => prev.map(entry => {
        if (entry.requestId !== requestId && !requestId.startsWith(entry.requestId! + '-')) return entry;

        const responseIndex = entry.responses.findIndex(r => 
          r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId! + '-'))
        );

        if (responseIndex === -1) {
          const newRes: ChatResponse = {
            id: `${Date.now()}-${crypto.randomUUID()}`,
            requestId,
            provider,
            model: model || 'auto',
            content: '',
            latency: 0,
            status: 'loading'
          };
          return { ...entry, responses: [...entry.responses, newRes] };
        }

        return {
          ...entry,
          responses: entry.responses.map((r, i) => 
            i === responseIndex ? { ...r, provider, model, status: 'loading', content: '' } : r
          )
        };
      }));
    });

    // Stream Chunk
    const unsubChunk = eventBus.on(EVENTS.STREAM_CHUNK, ({ requestId, provider, chunk }) => {
      uas()(prev => prev.map(entry => {
        if (entry.requestId !== requestId && !requestId.startsWith(entry.requestId! + '-')) return entry;
        return {
          ...entry,
          responses: entry.responses.map(r => {
            const isMatch = r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId! + '-'));
            return isMatch ? { ...r, content: r.content + chunk, status: 'streaming' as const } : r;
          })
        };
      }));
    });

    // Stream End
    const unsubEnd = eventBus.on(EVENTS.STREAM_END, ({ requestId, provider, fullContent, latency, ttft, tps }) => {
      uas()(prev => prev.map(entry => {
        if (entry.requestId !== requestId && !requestId.startsWith(entry.requestId! + '-')) return entry;

        return {
          ...entry,
          responses: entry.responses.map(r => {
            const isMatch = r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId! + '-'));
            return isMatch ? { ...r, content: fullContent, latency, ttft, tps, status: 'done' } : r;
          })
        };
      }));
      updateFinishState();
      // Store response in memory (outside state updater to avoid side effects)
      if (featureFlagService.isEnabled(FEATURE_FLAGS.MEMORY_AUTO_STORE)) {
        const sid = activeSessionIdRef.current;
        memoryService.store({
          content: fullContent,
          metadata: {
            source: provider || 'system',
            type: 'chat_response' as const,
            timestamp: Date.now(),
            importance: 0.7,
            chatId: sid,
            requestId
          }
        }).catch(e => console.warn('[ChatStore] Memory store on stream end failed:', e));
      }
    });

    // Stream Error
    const unsubError = eventBus.on(EVENTS.STREAM_ERROR, ({ requestId, provider, error }) => {
      uas()(prev => prev.map(entry => {
        if (entry.requestId !== requestId && !requestId.startsWith(entry.requestId! + '-')) return entry;

        return {
          ...entry,
          responses: entry.responses.map(r => {
            const isMatch = r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId! + '-'));
            return isMatch ? { ...r, status: 'error', error } : r;
          })
        };
      }));
      updateFinishState();
    });

    return () => {
      unsubRes();
      unsubStart();
      unsubChunk();
      unsubEnd();
      unsubError();
    };
  }, [updateActiveSession]);

  const currentRequestIdRef = useRef('');
  const sendingRef = useRef(false);

  const cancelSending = useCallback(() => {
    if (currentRequestIdRef.current) {
      eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId: currentRequestIdRef.current });
      currentRequestIdRef.current = '';
    }
    sendingRef.current = false;
  }, []);

  const sendMessage = useCallback(async (targets: { provider: string; model: string; keyId?: string }[], text: string, systemPrompt?: string, temperature?: number, maxTokens?: number) => {
    if (sendingRef.current) {
      console.warn('[ChatStore] sendMessage already in progress, ignored');
      return;
    }
    sendingRef.current = true;
    const requestId = `chat-${crypto.randomUUID()}`;
    currentRequestIdRef.current = requestId;
    const entryId = crypto.randomUUID();

    const currentHistory = historyRef.current;
    const currentSessionId = activeSessionIdRef.current;

    // Show thinking indicator immediately (before async operations)
    setIsSending(true);

    // 1. Recall related memories (RAG)
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

    // Index User Message into MemoryMesh
    if (featureFlagService.isEnabled(FEATURE_FLAGS.MEMORY_AUTO_STORE)) {
      try {
        await memoryService.store({
          content: text,
          metadata: {
            source: 'user',
            type: 'chat_query' as const,
            timestamp: Date.now(),
            importance: 0.5,
            chatId: currentSessionId
          }
        });
      } catch (e) {
        console.warn('[ChatStore] Memory store failed:', e);
      }
    }

    const workspaceContext = workspaceService.isAttached()
      ? await workspaceService.getFileTreeSnapshot()
      : null;

    const messages: ChatMessage[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...(workspaceContext ? [{ role: 'system' as const, content: `[WORKSPACE FILES]\n${workspaceContext}\n\nYou can read any file by asking me to use the read_file tool.` }] : []),
      ...currentHistory.flatMap(h => [
        { role: 'user' as const, content: h.text },
         ...h.responses.filter(r => r.status === 'done').map(r => ({ role: 'assistant' as const, content: r.content }))
      ]),
      { role: 'user' as const, content: contextPrefix + text }
    ];

    const loadingResponses: ChatResponse[] = targets.map(t => ({
      id: `${Date.now()}-${crypto.randomUUID()}`,
      requestId: targets.length > 1 ? `${requestId}-${t.provider}` : requestId,
      provider: t.provider,
      model: t.model,
      content: '',
      latency: 0,
      status: 'loading'
    }));

    const newEntry: ChatEntry = { 
      id: entryId, 
      requestId, 
      role: 'user', 
      text, 
      responses: loadingResponses, 
      timestamp: Date.now(),
      recalledMemories: relatedMemories.map(m => ({ content: m.entry.content, score: m.score })) 
    };
    
    updateActiveSession(prev => [...prev, newEntry]);

    // Send requests for each target
    targets.forEach((t, idx) => {
      eventBus.emit(EVENTS.SEND_MESSAGE, { 
        requestId: loadingResponses[idx].requestId,
        provider: t.provider, 
        model: t.model, 
        keyId: t.keyId,
        messages,
        options: { temperature, maxTokens }
      });
    });
  }, [updateActiveSession]);

  const createSession = useCallback((title: string = 'New Chat') => {
    const id = crypto.randomUUID();
    const newSession: ChatSession = { id, title, history: [], createdAt: Date.now(), updatedAt: Date.now() };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(id);
    return id;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        const fresh: ChatSession = { id: 'default', title: 'New Chat', history: [], createdAt: Date.now(), updatedAt: Date.now() };
        setActiveSessionId('default');
        return [fresh];
      }
      if (activeSessionIdRef.current === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  }, []);

  const forkSession = useCallback((entryId: string, newTitle?: string) => {
    setSessions(prev => {
      const currentSessionId = activeSessionIdRef.current;
      const session = prev.find(s => s.id === currentSessionId);
      if (!session) return prev;
      const entryIndex = session.history.findIndex(e => e.id === entryId);
      if (entryIndex === -1) return prev;

      const newHistory = session.history.slice(0, entryIndex + 1);
      const id = crypto.randomUUID();
      const newSession: ChatSession = {
        id,
        title: newTitle || `Fork of ${session.title}`,
        history: newHistory,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setActiveSessionId(id);
      return [newSession, ...prev];
    });
  }, []);

  const editEntry = useCallback((entryId: string, newText: string) => {
    updateActiveSession(prev => prev.map(e => e.id === entryId ? { ...e, text: newText, responses: [] } : e));
  }, [updateActiveSession]);

  const clearHistory = useCallback(() => updateActiveSession(() => []), [updateActiveSession]);

  const importSessions = useCallback((importedSessions: ChatSession[]) => {
    const existingIds = new Set(sessions.map(s => s.id));
    const newSessions = importedSessions.filter(s => !existingIds.has(s.id));
    setSessions(prev => [...newSessions, ...prev]);
  }, [sessions]);

  const switchModel = useCallback((provider: string, model: string) => {
    const session = sessions.find(s => s.id === activeSessionIdRef.current);
    const historyText = session?.history.map(h => h.text + h.responses.map(r => r.content).join('')).join('') || '';
    const estimatedTokens = Math.ceil(historyText.length / 4);
    const contextWindow = MODEL_CONTEXT_WINDOWS[model] || 128000;
    if (estimatedTokens > contextWindow * 0.85) {
      eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Context (${estimatedTokens} tokens) may exceed ${model} limit (${contextWindow}). Consider starting a new chat.`,
        type: 'warning',
      });
    }
    setSessions(prev => prev.map(s =>
      s.id === activeSessionIdRef.current
        ? { ...s, currentProvider: provider, currentModel: model, updatedAt: Date.now() }
        : s
    ));
    updateActiveSession(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'system' as const,
      text: `\u{1F504} Switched to ${provider}/${model}`,
      responses: [],
      timestamp: Date.now(),
    }]);
  }, [sessions, updateActiveSession]);

  const switchKey = useCallback((keyId: string) => {
    setSessions(prev => prev.map(s =>
      s.id === activeSessionIdRef.current
        ? { ...s, currentKeyId: keyId, updatedAt: Date.now() }
        : s
    ));
    const allKeys = sessions.find(s => s.id === activeSessionIdRef.current);
    const keyLabel = allKeys?.history?.length ? keyId.slice(0, 8) : keyId;
    updateActiveSession(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'system' as const,
      text: `\u{1F504} Switched to key ${keyLabel}...`,
      responses: [],
      timestamp: Date.now(),
    }]);
  }, [sessions, updateActiveSession]);

  const getSessionConfig = useCallback(() => {
    const session = sessions.find(s => s.id === activeSessionIdRef.current);
    return session ? { provider: session.currentProvider, model: session.currentModel, keyId: session.currentKeyId } : undefined;
  }, [sessions]);

   return {
     sessions,
     activeSessionId,
     setActiveSessionId,
     history,
     isSending,
     sendMessage,
     systemPrompt,
     setSystemPrompt,
     cancelMessage: useCallback((requestId: string) => eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId }), []),
     cancelSending,
     editEntry,
     clearHistory,
     createSession,
     deleteSession,
     forkSession,
     renameSession: useCallback((id: string, title: string) => setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s)), []),
     importSessions,
     switchModel,
     switchKey,
     getSessionConfig,
     loadMoreSessions,
     hasMoreSessions
   };
};
