import { create } from 'zustand';
import { eventBus } from '../kernel/events/event-bus';

const MAX_AGENT_EVENTS = 500;
const MAX_ROUND_EVENTS = 200;

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
        m.set(d.sessionId, d.agentId);
        return { agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS), currentThinking: m };
      });
    }),
    eventBus.onSafe<{ sessionId: string; agentId: string; content: string }>('debate-runtime:agent:responded', (d) => {
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'responded', timestamp: Date.now(), content: d.content };
      set(s => {
        const m = new Map(s.currentThinking);
        if (m.get(d.sessionId) === d.agentId) m.delete(d.sessionId);
        const sc = new Map(s.streamingContent);
        sc.delete(`${d.sessionId}:${d.agentId}`);
        return { agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS), currentThinking: m, streamingContent: sc };
      });
    }),
    eventBus.onSafe<{ sessionId: string; agentId: string; error: string }>('debate-runtime:agent:error', (d) => {
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'error', timestamp: Date.now(), error: d.error };
      set(s => {
        const m = new Map(s.currentThinking);
        if (m.get(d.sessionId) === d.agentId) m.delete(d.sessionId);
        const sc = new Map(s.streamingContent);
        sc.delete(`${d.sessionId}:${d.agentId}`);
        return { agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS), currentThinking: m, streamingContent: sc };
      });
    }),
    eventBus.onSafe<{ sessionId: string; agentId: string; timeoutMs: number }>('debate-runtime:agent:timeout', (d) => {
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'timeout', timestamp: Date.now(), timeoutMs: d.timeoutMs };
      set(s => ({ agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS) }));
    }),
    eventBus.onSafe<{ sessionId: string; agentId: string; fromProvider: string; toProvider: string }>('debate-runtime:agent:fallback', (d) => {
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'fallback', timestamp: Date.now(), fromProvider: d.fromProvider, toProvider: d.toProvider };
      set(s => ({ agentEvents: [...s.agentEvents, event].slice(-MAX_AGENT_EVENTS) }));
    }),
    eventBus.onSafe<{ sessionId: string; round: number; nodes: string[] }>('debate-runtime:round:started', (d) => {
      set(s => ({ roundEvents: [...s.roundEvents, { sessionId: d.sessionId, round: d.round, nodes: d.nodes, status: 'started' as const }].slice(-MAX_ROUND_EVENTS) }));
    }),
    eventBus.onSafe<{ sessionId: string; round: number }>('debate-runtime:round:ended', (d) => {
      set(s => ({ roundEvents: [...s.roundEvents, { sessionId: d.sessionId, round: d.round, status: 'ended' as const }].slice(-MAX_ROUND_EVENTS) }));
    }),
  ];

  return {
    agentEvents: [],
    roundEvents: [],
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
    destroy: () => subs.forEach(u => u()),
  };
});
