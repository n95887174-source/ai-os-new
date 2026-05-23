import { useState, useEffect, useCallback, useRef } from 'react';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import type { ChatResponse } from '../types/chat';
import type { ChatMessage } from '../llm/core/types';
import type { SessionStore } from '../kernel/contracts/storage/session-store';
import { runtime } from '../kernel/runtime';

import { memoryService } from '../kernel/instances';

let _sessionStore: SessionStore | null = null;
function getSessions(): SessionStore {
  if (!_sessionStore) {
    _sessionStore = runtime.getService<{ sessions: SessionStore }>('storageLayer')?.sessions;
  }
  return _sessionStore!;
}

export interface ChatEntry {
  id: string;
  requestId?: string;
  role: 'user';
  text: string;
  responses: ChatResponse[];
  timestamp: number;
  parentId?: string; // For forking
  recalledMemories?: { content: string; score?: number }[]; // For UI visualization
}

export interface ChatSession {
  id: string;
  title: string;
  history: ChatEntry[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
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
  const loadedCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const loadingRef = useRef(false);

  const loadMoreSessions = useCallback(async () => {
    try {
      const offset = loadedCountRef.current;
      const more = await getSessions().listSessions(SESSION_BATCH_SIZE, offset);
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

  // Load from Dexie on mount
  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const loadSessions = async () => {
      try {
        totalCountRef.current = await getSessions().count();
        if (totalCountRef.current > 0) {
          const batch = await getSessions().listSessions(SESSION_BATCH_SIZE);
          loadedCountRef.current = batch.length;
          setSessions(batch);
          setActiveSessionId(batch[0].id);
          setHasMoreSessions(batch.length < totalCountRef.current);
        } else {
          const saved = localStorage.getItem('super_agents_chat_sessions');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              await getSessions().bulkPut(parsed);
              loadedCountRef.current = parsed.length;
              totalCountRef.current = parsed.length;
              setSessions(parsed);
              setActiveSessionId(parsed[0].id);
              localStorage.removeItem('super_agents_chat_sessions');
            } catch (parseError) {
              console.warn('[ChatStore] Failed to parse saved sessions:', parseError instanceof Error ? parseError.message : parseError);
              await getSessions().saveSession(DEFAULT_SESSION);
            }
          } else {
            await getSessions().put(DEFAULT_SESSION);
          }
        }
      } catch (e) {
        console.warn('[ChatStore] Dexie unavailable, using default session:', e instanceof Error ? e.message : e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSessions();
  }, []);

  // Sync to Dexie
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionsRef = useRef(sessions);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        // We only bulkPut if sessions changed
        await getSessions().bulkPut(sessions);
      } catch (e) {
        console.error('Failed to sync sessions to Dexie', e);
      }
    }, 1000);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [sessions, isLoaded]);

  // Sync to localStorage synchronously on tab close (catches last changes)
  useEffect(() => {
    if (!isLoaded) return;
    const handleBeforeUnload = () => {
      try {
        const snap = sessionsRef.current;
        if (snap.length > 0) {
          localStorage.setItem('super_agents_chat_sessions', JSON.stringify(snap));
        }
      } catch (e) {
        console.warn('[ChatStore] Failed to sync to localStorage on unload:', e);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isLoaded]);

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
            id: crypto.randomUUID(),
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

  const sendMessage = useCallback(async (targets: { provider: string; model: string }[], text: string, systemPrompt?: string, temperature?: number, maxTokens?: number) => {
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
    try {
      relatedMemories = (await memoryService.search(text, 3)) || [];
    } catch (e) {
      console.warn('[ChatStore] Memory search failed:', e);
    }
    const contextPrefix = relatedMemories.length > 0 
      ? `[RECALLED CONTEXT]\n${relatedMemories.map((m) => `- ${m.entry.content}`).join('\n')}\n\n`
      : '';

    // Index User Message into MemoryMesh
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

    const messages: ChatMessage[] = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...currentHistory.flatMap(h => [
        { role: 'user' as const, content: h.text },
         ...h.responses.filter(r => r.status === 'done').map(r => ({ role: 'assistant' as const, content: r.content }))
      ]),
      { role: 'user' as const, content: contextPrefix + text }
    ];

    const loadingResponses: ChatResponse[] = targets.map(t => ({
      id: crypto.randomUUID(),
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

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    history,
    isSending,
    sendMessage,
    cancelMessage: useCallback((requestId: string) => eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId }), []),
    cancelSending,
    editEntry,
    clearHistory,
    createSession,
    deleteSession,
    forkSession,
    renameSession: useCallback((id: string, title: string) => setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s)), []),
    importSessions,
    loadMoreSessions,
    hasMoreSessions
  };
};
