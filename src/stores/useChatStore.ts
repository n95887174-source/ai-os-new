import { useState, useEffect, useCallback } from 'react';
import { eventBus, EVENTS } from '../core/events';
import type { ChatResponse } from '../types/chat';
import type { ChatMessage } from '../services/providers/types';

export interface ChatEntry {
  id: string;
  role: 'user';
  text: string;
  responses: ChatResponse[];
}

export const useChatStore = () => {
  const [history, setHistory] = useState<ChatEntry[]>(() => {
    const saved = localStorage.getItem('super_agents_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    localStorage.setItem('super_agents_chat_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    // Helper to check if a conversation entry is finished
    const updateFinishState = () => {
      setHistory(h => {
        const lastEntry = h[h.length - 1];
        if (lastEntry && lastEntry.responses.length > 0) {
          const allDone = lastEntry.responses.every(r => r.status !== 'loading');
          if (allDone) setIsSending(false);
        }
        return h;
      });
    };

    // Static response
    const unsubRes = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
      setHistory(prev => prev.map(entry => {
        if (!entry.responses.some(r => r.requestId === res.requestId)) return entry;
        return {
          ...entry,
          responses: entry.responses.map(r => (r.requestId === res.requestId ? res : r))
        };
      }));
      updateFinishState();
    });

    // Stream Start
    const unsubStart = eventBus.on('chat:stream:start', ({ requestId, provider, model }) => {
      setHistory(prev => prev.map(entry => {
        if (!entry.responses.some(r => r.requestId === requestId)) return entry;
        return {
          ...entry,
          responses: entry.responses.map(r => 
            r.requestId === requestId ? { ...r, provider, model, status: 'loading', content: '' } : r
          )
        };
      }));
    });

    // Stream Chunk
    const unsubChunk = eventBus.on('chat:stream:chunk', ({ requestId, chunk }) => {
      setHistory(prev => prev.map(entry => {
        if (!entry.responses.some(r => r.requestId === requestId)) return entry;
        return {
          ...entry,
          responses: entry.responses.map(r => 
            r.requestId === requestId ? { ...r, content: r.content + chunk } : r
          )
        };
      }));
    });

    // Stream End
    const unsubEnd = eventBus.on('chat:stream:end', ({ requestId, fullContent, latency }) => {
      setHistory(prev => prev.map(entry => {
        if (!entry.responses.some(r => r.requestId === requestId)) return entry;
        return {
          ...entry,
          responses: entry.responses.map(r => 
            r.requestId === requestId ? { ...r, content: fullContent, latency, status: 'done' } : r
          )
        };
      }));
      updateFinishState();
    });

    // Stream Error
    const unsubError = eventBus.on('chat:stream:error', ({ requestId, error }) => {
      setHistory(prev => prev.map(entry => {
        if (!entry.responses.some(r => r.requestId === requestId)) return entry;
        return {
          ...entry,
          responses: entry.responses.map(r => 
            r.requestId === requestId ? { ...r, status: 'error', error } : r
          )
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
  }, []);

  const sendMessage = useCallback((targets: { provider: string; model: string }[], text: string) => {
    const requestId = `chat-${Math.random().toString(36).slice(2, 9)}`;
    const entryId = Math.random().toString(36).slice(2);

    const messages: ChatMessage[] = [
      ...history.flatMap(h => [
        { role: 'user' as const, content: h.text },
        ...(h.responses.filter(r => r.status === 'done').slice(0, 1).map(r => ({ role: 'assistant' as const, content: r.content })))
      ]),
      { role: 'user' as const, content: text }
    ];

    const loadingResponses: ChatResponse[] = targets.map(t => ({
      id: Math.random().toString(36).slice(2),
      requestId,
      provider: t.provider,
      model: t.model,
      content: '',
      latency: 0,
      status: 'loading'
    }));

    setHistory(prev => [...prev, { id: entryId, role: 'user', text, responses: loadingResponses }]);
    setIsSending(true);

    targets.forEach(t => {
      eventBus.emit(EVENTS.SEND_MESSAGE, { 
        provider: t.provider, 
        model: t.model, 
        messages, 
        requestId 
      });
    });
  }, [history]);

  const cancelMessage = (requestId: string) => {
    eventBus.emit(EVENTS.CANCEL_MESSAGE, { requestId });
  };

  const clearHistory = () => setHistory([]);

  return {
    history,
    isSending,
    sendMessage,
    cancelMessage,
    clearHistory
  };
};
