import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { featureFlagService, memoryService } from '../../kernel/instances';
import { FEATURE_FLAGS } from '../../kernel/contracts/feature-flags';
import { useChatStore } from './store';
import type { ChatEntry, ChatSession } from './types';
import type { ChatResponse } from '../../types/chat';
import { requestEntryMap, genId, isResponseMatch } from './types';

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

let moduleUnsubs: (() => void)[] = [];

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

// Initialize requestEntryMap with current state
import { rebuildRequestEntryMap } from './types';
rebuildRequestEntryMap(useChatStore.getState().sessions);
useChatStore.subscribe((state, prevState) => {
  if (state.sessions !== prevState.sessions) {
    rebuildRequestEntryMap(state.sessions);
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    moduleUnsubs.forEach(u => u());
    moduleUnsubs = [];
  });
}
