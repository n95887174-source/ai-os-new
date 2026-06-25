import { create } from 'zustand';
import { eventBus } from '../kernel/events/event-bus';
import { EVENTS } from '../kernel/events/event-names';

const LIVE_STORAGE_KEY = 'debate_live_state';
const LIVE_STORAGE_DEBOUNCE = 500;

const MAX_AGENT_EVENTS = 500;
const MAX_ROUND_EVENTS = 200;
const METRICS_INTERVAL_MS = 30_000;

export interface DebateAgentEvent {
  sessionId: string;
  agentId: string;
  status: 'thinking' | 'responded' | 'error' | 'timeout' | 'fallback';
  timestamp: number;
  content?: string;
  error?: string;
  timeoutMs?: number;
  fromProvider?: string;
  toProvider?: string;
}

export interface DebateRoundEvent {
  sessionId: string;
  round: number;
  nodes?: string[];
  status: 'started' | 'ended';
}

export interface DebateLiveState {
  agentEvents: DebateAgentEvent[];
  roundEvents: DebateRoundEvent[];
  currentThinking: Map<string, string>;
  streamingContent: Map<string, string>;
  addAgentEvent: (event: DebateAgentEvent) => void;
  addRoundEvent: (event: DebateRoundEvent) => void;
  clearSession: (sessionId: string) => void;
  clearAll: () => void;
  // B10-114: Cleanup event subscriptions on unmount
  destroy: () => void;
}

export const useDebateLiveStore = create<DebateLiveState>((set, get) => {
  const subs = [
    eventBus.onSafe<{ sessionId: string; agentId: string; chunk: string }>('debate-runtime:agent:chunk', (d) => {
      const key = `${d.sessionId}:${d.agentId}`;
      set(s => {
        const m = new Map(s.streamingContent);
        // H-27: Limit Map size to prevent unbounded growth from stuck streams
        if (m.size >= 100) {
          const oldest = m.keys().next().value;
          if (oldest) m.delete(oldest);
        }
        m.set(key, (m.get(key) || '') + d.chunk);
        return { streamingContent: m };
      });
    }),
    eventBus.onSafe<{ sessionId: string; agentId: string }>('debate-runtime:agent:thinking', (d) => {
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'thinking', timestamp: Date.now() };
      set(s => {
        const m = new Map(s.currentThinking);
        if (m.size >= 50) {
          const oldest = m.keys().next().value;
          if (oldest) m.delete(oldest);
        }
        // L-CODE-02 fix: use sessionId:agentId key (consistent with streamingContent)
        m.set(`${d.sessionId}:${d.agentId}`, d.agentId);
        return { agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS), currentThinking: m };
      });
    }),
    eventBus.onSafe<{ sessionId: string; agentId: string; content: string }>('debate-runtime:agent:responded', (d) => {
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'responded', timestamp: Date.now(), content: d.content };
      set(s => {
        const m = new Map(s.currentThinking);
        // L-CODE-02 fix: use sessionId:agentId key (consistent with streamingContent)
        if (m.get(`${d.sessionId}:${d.agentId}`) === d.agentId) m.delete(`${d.sessionId}:${d.agentId}`);
        const sc = new Map(s.streamingContent);
        sc.delete(`${d.sessionId}:${d.agentId}`);
        return { agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS), currentThinking: m, streamingContent: sc };
      });
    }),
    eventBus.onSafe<{ sessionId: string; agentId: string; error: string }>('debate-runtime:agent:error', (d) => {
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'error', timestamp: Date.now(), error: d.error };
      set(s => {
        const m = new Map(s.currentThinking);
        // L-CODE-02 fix: use sessionId:agentId key (consistent with streamingContent)
        if (m.get(`${d.sessionId}:${d.agentId}`) === d.agentId) m.delete(`${d.sessionId}:${d.agentId}`);
        const sc = new Map(s.streamingContent);
        sc.delete(`${d.sessionId}:${d.agentId}`);
        return { agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS), currentThinking: m, streamingContent: sc };
      });
    }),
    eventBus.onSafe<{ sessionId: string; agentId: string; timeoutMs: number }>('debate-runtime:agent:timeout', (d) => {
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'timeout', timestamp: Date.now(), timeoutMs: d.timeoutMs };
      set(s => {
        // STATE-L3: Clean up orphan entries on timeout
        const sc = new Map(s.streamingContent);
        sc.delete(`${d.sessionId}:${d.agentId}`);
        const ct = new Map(s.currentThinking);
        ct.delete(`${d.sessionId}:${d.agentId}`);
        return { agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS), streamingContent: sc, currentThinking: ct };
      });
    }),
    eventBus.onSafe<{ sessionId: string; agentId: string; fromProvider: string; toProvider: string }>('debate-runtime:agent:fallback', (d) => {
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'fallback', timestamp: Date.now(), fromProvider: d.fromProvider, toProvider: d.toProvider };
      set(s => {
        // STATE-L3: Clean up orphan entries on fallback
        const sc = new Map(s.streamingContent);
        sc.delete(`${d.sessionId}:${d.agentId}`);
        const ct = new Map(s.currentThinking);
        ct.delete(`${d.sessionId}:${d.agentId}`);
        return { agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS), streamingContent: sc, currentThinking: ct };
      });
    }),
    eventBus.onSafe<{ sessionId: string; round: number; nodes: string[] }>('debate-runtime:round:started', (d) => {
      set(s => ({ roundEvents: [...s.roundEvents, { sessionId: d.sessionId, round: d.round, nodes: d.nodes, status: 'started' as const }].slice(-MAX_ROUND_EVENTS) }));
    }),
    eventBus.onSafe<{ sessionId: string; round: number }>('debate-runtime:round:ended', (d) => {
      set(s => ({ roundEvents: [...s.roundEvents, { sessionId: d.sessionId, round: d.round, status: 'ended' as const }].slice(-MAX_ROUND_EVENTS) }));
    }),
  ];

  const metricsInterval = setInterval(() => {
    const s = get();
    const errorCount = s.agentEvents.filter(e => e.status === 'error').length;
    const timeoutCount = s.agentEvents.filter(e => e.status === 'timeout').length;
    const fallbackCount = s.agentEvents.filter(e => e.status === 'fallback').length;
    eventBus.emit(EVENTS.DEBATE_UPDATED, {
      sessionId: '',
      type: 'store_metrics',
      agentEventCount: s.agentEvents.length,
      errorCount,
      timeoutCount,
      fallbackCount,
      roundCount: s.roundEvents.length,
    });
  }, METRICS_INTERVAL_MS);

  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  const schedulePersist = () => {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      const s = get();
      try {
        sessionStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify({
          agentEvents: s.agentEvents,
          roundEvents: s.roundEvents,
        }));
      } catch { /* sessionStorage full or unavailable */ }
    }, LIVE_STORAGE_DEBOUNCE);
  };

  const initialState = (() => {
    try {
      const saved = sessionStorage.getItem(LIVE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          agentEvents: Array.isArray(parsed.agentEvents) ? parsed.agentEvents : [],
          roundEvents: Array.isArray(parsed.roundEvents) ? parsed.roundEvents : [],
        };
      }
    } catch { /* corrupt or unavailable */ }
    return {};
  })();

  // Persist on every state change (debounced)
  const unsubPersist = useDebateLiveStore.subscribe(() => { schedulePersist(); });

  return {
    ...initialState,
    agentEvents: initialState.agentEvents ?? [],
    roundEvents: initialState.roundEvents ?? [],
    currentThinking: new Map(),
    streamingContent: new Map(),
    addAgentEvent: (event) => set(s => ({ agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS) })),
    addRoundEvent: (event) => set(s => ({ roundEvents: [...s.roundEvents, event].slice(-MAX_ROUND_EVENTS) })),
    clearSession: (sessionId) => set(s => {
      const sc = new Map(s.streamingContent);
      for (const k of sc.keys()) { if (k.startsWith(`${sessionId}:`)) sc.delete(k); }
      return {
        agentEvents: s.agentEvents.filter(e => e.sessionId !== sessionId),
        roundEvents: s.roundEvents.filter(e => e.sessionId !== sessionId),
        streamingContent: sc,
      };
    }),
    clearAll: () => set({ agentEvents: [], roundEvents: [], currentThinking: new Map(), streamingContent: new Map() }),
    // B10-114: Cleanup all event subscriptions to prevent memory leaks
    destroy: () => {
      subs.forEach(u => u());
      clearInterval(metricsInterval);
      if (persistTimer) clearTimeout(persistTimer);
      unsubPersist();
    },
  };
});

// HMR cleanup: prevent duplicate event subscriptions on hot reload
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    useDebateLiveStore.getState().destroy();
  });
}
