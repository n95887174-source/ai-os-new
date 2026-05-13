import { useState, useEffect, useCallback, useRef } from 'react';
import { eventBus, EVENTS } from '../core/events';
import type { ChatResponse } from '../types/chat';
import type { ChatMessage } from '../services/providers/types';
import { dexieDb } from '../core/DatabaseService';

import { memoryService } from '../services/MemoryService';
import type { StoredChatMessage } from '../core/DatabaseService';

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

export const useChatStore = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([DEFAULT_SESSION]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [isSending, setIsSending] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from Dexie on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const count = await dexieDb.sessions.count();
        if (count > 0) {
          const allSessions = await dexieDb.sessions.orderBy('updatedAt').reverse().toArray();
          setSessions(allSessions);
          setActiveSessionId(allSessions[0].id);
        } else {
          // Migration from localStorage
          const saved = localStorage.getItem('super_agents_chat_sessions');
          if (saved) {
            const parsed = JSON.parse(saved);
            await dexieDb.sessions.bulkAdd(parsed);
            setSessions(parsed);
            setActiveSessionId(parsed[0].id);
            localStorage.removeItem('super_agents_chat_sessions');
          } else {
            await dexieDb.sessions.add(DEFAULT_SESSION);
          }
        }
      } catch (e) {
        console.error('Failed to load sessions from Dexie', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSessions();
  }, []);

  // Sync to Dexie
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        // We only bulkPut if sessions changed
        await dexieDb.sessions.bulkPut(sessions);
      } catch (e) {
        console.error('Failed to sync sessions to Dexie', e);
      }
    }, 1000);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [sessions, isLoaded]);

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

  const persistMessage = useCallback(async (msg: StoredChatMessage) => {
    try { await dexieDb.chatMessages.put(msg); } catch (e) { console.warn('[ChatStore] Failed to persist message:', e); }
  }, []);

  useEffect(() => {
    const updateFinishState = () => {
      setSessions(prev => {
        const session = prev.find(s => s.id === activeSessionIdRef.current);
        if (!session || session.history.length === 0) return prev;
        const lastEntry = session.history[session.history.length - 1];
        if (lastEntry && lastEntry.responses.length > 0) {
          const allDone = lastEntry.responses.every(r => r.status !== 'loading');
          if (allDone) setIsSending(false);
        }
        return prev;
      });
    };

    // Static response
    const unsubRes = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
      updateActiveSession(prev => prev.map(entry => {
        if (entry.requestId !== res.requestId && !res.requestId?.startsWith(entry.requestId!)) return entry;
        
        const responseIndex = entry.responses.findIndex(r => 
          r.id === res.id || (r.provider === res.provider && r.requestId === res.requestId)
        );

        if (responseIndex === -1) {
          return { ...entry, responses: [...entry.responses, res] };
        }

        // Persist the completed response message
        if (res.status === 'done' || res.status === 'error') {
          persistMessage({
            id: res.id, sessionId: activeSessionIdRef.current, role: 'assistant',
            text: res.content, entryId: entry.id, provider: res.provider, model: res.model,
            timestamp: Date.now(), status: res.status === 'done' ? 'complete' : 'error'
          });
        }

        return {
          ...entry,
          responses: entry.responses.map((r, i) => i === responseIndex ? res : r)
        };
      }));
      updateFinishState();
    });

    // Stream Start
    const unsubStart = eventBus.on('chat:stream:start', ({ requestId, provider, model }) => {
      updateActiveSession(prev => prev.map(entry => {
        if (entry.requestId !== requestId && !requestId.startsWith(entry.requestId!)) return entry;

        const responseIndex = entry.responses.findIndex(r => 
          r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId!))
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
    const unsubChunk = eventBus.on('chat:stream:chunk', ({ requestId, provider, chunk }) => {
      updateActiveSession(prev => prev.map(entry => {
        if (entry.requestId !== requestId && !requestId.startsWith(entry.requestId!)) return entry;
        return {
          ...entry,
          responses: entry.responses.map(r => {
            const isMatch = r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId!));
            return isMatch ? { ...r, content: r.content + chunk } : r;
          })
        };
      }));
    });

    // Stream End
    const unsubEnd = eventBus.on('chat:stream:end', ({ requestId, provider, fullContent, latency, ttft, tps }) => {
      updateActiveSession(prev => prev.map(entry => {
        if (entry.requestId !== requestId && !requestId.startsWith(entry.requestId!)) return entry;

        // Update individual message status
        entry.responses.forEach(r => {
          const isMatch = r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId!));
          if (isMatch) {
            persistMessage({
              id: r.id, sessionId: activeSessionIdRef.current, role: 'assistant',
              text: fullContent, entryId: entry.id, provider: r.provider, model: r.model,
              timestamp: Date.now(), status: 'complete'
            });
          }
        });

        return {
          ...entry,
          responses: entry.responses.map(r => {
            const isMatch = r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId!));
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
      });
    });

    // Stream Error
    const unsubError = eventBus.on('chat:stream:error', ({ requestId, provider, error }) => {
      updateActiveSession(prev => prev.map(entry => {
        if (entry.requestId !== requestId && !requestId.startsWith(entry.requestId!)) return entry;

        entry.responses.forEach(r => {
          const isMatch = r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId!));
          if (isMatch) {
            persistMessage({
              id: r.id, sessionId: activeSessionIdRef.current, role: 'assistant',
              text: r.content || '', entryId: entry.id, provider: r.provider, model: r.model,
              timestamp: Date.now(), status: 'error'
            });
          }
        });

        return {
          ...entry,
          responses: entry.responses.map(r => {
            const isMatch = r.provider === provider && (r.requestId === requestId || requestId.startsWith(r.requestId!));
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
  }, [activeSessionId, updateActiveSession, persistMessage]);

  const currentRequestIdRef = useRef('');

  const cancelSending = useCallback(() => {
    if (currentRequestIdRef.current) {
      eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId: currentRequestIdRef.current });
      currentRequestIdRef.current = '';
    }
  }, []);

  const sendMessage = useCallback(async (targets: { provider: string; model: string }[], text: string) => {
    const requestId = `chat-${crypto.randomUUID().slice(0, 8)}`;
    currentRequestIdRef.current = requestId;
    const entryId = crypto.randomUUID();

    const currentHistory = historyRef.current;
    const currentSessionId = activeSessionIdRef.current;

    // 1. Recall related memories (RAG)
    const relatedMemories = await memoryService.search(text, 3);
    const contextPrefix = relatedMemories.length > 0 
      ? `[RECALLED CONTEXT]\n${relatedMemories.map((m) => `- ${m.entry.content}`).join('\n')}\n\n`
      : '';

    // Index User Message into MemoryMesh
    memoryService.store({
      content: text,
      metadata: {
        source: 'user',
        type: 'chat_query' as const,
        timestamp: Date.now(),
        importance: 0.5,
        chatId: currentSessionId
      }
    });

    const messages: ChatMessage[] = [
      ...currentHistory.flatMap(h => [
        { role: 'user' as const, content: h.text },
        ...(h.responses.filter(r => r.status === 'done').slice(0, 1).map(r => ({ role: 'assistant' as const, content: r.content })))
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
    setIsSending(true);

    // Persist user message individually
    persistMessage({
      id: entryId, sessionId: currentSessionId, role: 'user', text,
      entryId, timestamp: Date.now(), status: 'complete'
    });

    // Persist loading assistant messages
    loadingResponses.forEach(r => {
      persistMessage({
        id: r.id, sessionId: currentSessionId, role: 'assistant',
        text: '', entryId, provider: r.provider, model: r.model,
        timestamp: Date.now(), status: 'loading'
      });
    });

    // Send requests for each target
    targets.forEach((t, idx) => {
      eventBus.emit(EVENTS.SEND_MESSAGE, { 
        requestId: loadingResponses[idx].requestId,
        provider: t.provider, 
        model: t.model, 
        messages
      });
    });
  }, [updateActiveSession, persistMessage]);

  const createSession = useCallback((title: string = 'New Chat') => {
    const id = crypto.randomUUID().slice(0, 8);
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
      const id = crypto.randomUUID().slice(0, 8);
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
    clearHistory,
    createSession,
    deleteSession,
    forkSession,
    renameSession: useCallback((id: string, title: string) => setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s)), []),
    importSessions
  };
};
