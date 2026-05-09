import { useState, useEffect, useCallback, useRef } from 'react';
import { eventBus, EVENTS } from '../core/events';
import type { ChatResponse } from '../types/chat';
import type { ChatMessage } from '../services/providers/types';

import { memoryService } from '../services/MemoryService';

export interface ChatEntry {
  id: string;
  requestId?: string;
  role: 'user';
  text: string;
  responses: ChatResponse[];
  timestamp: number;
  parentId?: string; // For forking
  recalledMemories?: any[]; // For UI visualization
}

export interface ChatSession {
  id: string;
  title: string;
  history: ChatEntry[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export const useChatStore = () => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('super_agents_chat_sessions');
    if (saved) return JSON.parse(saved);
    
    // Migrate old history to a default session if exists
    const oldHistory = localStorage.getItem('super_agents_chat_history');
    if (oldHistory) {
      const history = JSON.parse(oldHistory);
      const defaultSession: ChatSession = {
        id: 'default',
        title: 'Initial Chat',
        history,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      localStorage.removeItem('super_agents_chat_history');
      return [defaultSession];
    }
    
    return [{ id: 'default', title: 'New Chat', history: [], createdAt: Date.now(), updatedAt: Date.now() }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [isSending, setIsSending] = useState(false);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const history = activeSession.history;

  const historyRef = useRef(history);
  historyRef.current = history;

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('super_agents_chat_sessions', JSON.stringify(sessions));
    }, 500);
    return () => clearTimeout(timer);
  }, [sessions]);

  const updateActiveSession = (updater: (history: ChatEntry[]) => ChatEntry[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      return { ...s, history: updater(s.history), updatedAt: Date.now() };
    }));
  };

  const activeSessionIdRef = useRef(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

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
        
        const sid = activeSessionIdRef.current;
        memoryService.store({
          content: fullContent,
          metadata: {
            source: provider,
            type: 'chat_response',
            timestamp: Date.now(),
            importance: 0.7,
            chatId: sid,
            requestId
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
    });

    // Stream Error
    const unsubError = eventBus.on('chat:stream:error', ({ requestId, provider, error }) => {
      updateActiveSession(prev => prev.map(entry => {
        if (entry.requestId !== requestId && !requestId.startsWith(entry.requestId!)) return entry;
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
  }, [activeSessionId]);

  const sendMessage = useCallback(async (targets: { provider: string; model: string }[], text: string) => {
    const requestId = `chat-${crypto.randomUUID().slice(0, 8)}`;
    const entryId = crypto.randomUUID();

    const currentHistory = historyRef.current;
    const currentSessionId = activeSessionIdRef.current;

    // 1. Recall related memories (RAG)
    const relatedMemories = await memoryService.search(text, 3);
    const contextPrefix = relatedMemories.length > 0 
      ? `[RECALLED CONTEXT]\n${relatedMemories.map(m => `- ${m.content}`).join('\n')}\n\n`
      : '';

    // Index User Message into MemoryMesh
    memoryService.store({
      content: text,
      metadata: {
        source: 'user',
        type: 'chat_query',
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
      recalledMemories: relatedMemories 
    };
    
    updateActiveSession(prev => [...prev, newEntry]);
    setIsSending(true);

    // Send requests for each target
    targets.forEach((t, idx) => {
      eventBus.emit(EVENTS.SEND_MESSAGE, { 
        requestId: loadingResponses[idx].requestId,
        provider: t.provider, 
        model: t.model, 
        messages
      });
    });
  }, []);

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
        return [{ id: 'default', title: 'New Chat', history: [], createdAt: Date.now(), updatedAt: Date.now() }];
      }
      return filtered;
    });
    setSessions(prev => {
      if (activeSessionIdRef.current === id && prev.some(s => s.id === id)) {
        setActiveSessionId('default');
      }
      return prev;
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

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    history,
    isSending,
    sendMessage,
    cancelMessage: useCallback((requestId: string) => eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId }), []),
    clearHistory,
    createSession,
    deleteSession,
    forkSession,
    renameSession: useCallback((id: string, title: string) => setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s)), [])
  };
};
