import { create } from 'zustand';
import { eventBus } from '../core/events';

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
  addAgentEvent: (event: DebateAgentEvent) => void;
  addRoundEvent: (event: DebateRoundEvent) => void;
  clearSession: (sessionId: string) => void;
  clearAll: () => void;
}

export const useDebateLiveStore = create<DebateLiveState>((set, get) => {
  const subs = [
    eventBus.on('debate-runtime:agent:thinking', (data: unknown) => {
      const d = data as { sessionId: string; agentId: string };
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'thinking', timestamp: Date.now() };
      set(s => {
        const m = new Map(s.currentThinking);
        m.set(d.sessionId, d.agentId);
        return { agentEvents: [...s.agentEvents, event], currentThinking: m };
      });
    }),
    eventBus.on('debate-runtime:agent:responded', (data: unknown) => {
      const d = data as { sessionId: string; agentId: string; content: string };
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'responded', timestamp: Date.now(), content: d.content };
      set(s => {
        const m = new Map(s.currentThinking);
        if (m.get(d.sessionId) === d.agentId) m.delete(d.sessionId);
        return { agentEvents: [...s.agentEvents, event], currentThinking: m };
      });
    }),
    eventBus.on('debate-runtime:agent:error', (data: unknown) => {
      const d = data as { sessionId: string; agentId: string; error: string };
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'error', timestamp: Date.now(), error: d.error };
      set(s => {
        const m = new Map(s.currentThinking);
        if (m.get(d.sessionId) === d.agentId) m.delete(d.sessionId);
        return { agentEvents: [...s.agentEvents, event], currentThinking: m };
      });
    }),
    eventBus.on('debate-runtime:agent:timeout', (data: unknown) => {
      const d = data as { sessionId: string; agentId: string; timeoutMs: number };
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'timeout', timestamp: Date.now(), timeoutMs: d.timeoutMs };
      set(s => ({ agentEvents: [...s.agentEvents, event] }));
    }),
    eventBus.on('debate-runtime:agent:fallback', (data: unknown) => {
      const d = data as { sessionId: string; agentId: string; fromProvider: string; toProvider: string };
      const event: DebateAgentEvent = { sessionId: d.sessionId, agentId: d.agentId, status: 'fallback', timestamp: Date.now(), fromProvider: d.fromProvider, toProvider: d.toProvider };
      set(s => ({ agentEvents: [...s.agentEvents, event] }));
    }),
    eventBus.on('debate-runtime:round:started', (data: unknown) => {
      const d = data as { sessionId: string; round: number; nodes: string[] };
      set(s => ({ roundEvents: [...s.roundEvents, { sessionId: d.sessionId, round: d.round, nodes: d.nodes, status: 'started' as const }] }));
    }),
    eventBus.on('debate-runtime:round:ended', (data: unknown) => {
      const d = data as { sessionId: string; round: number };
      set(s => ({ roundEvents: [...s.roundEvents, { sessionId: d.sessionId, round: d.round, status: 'ended' as const }] }));
    }),
  ];

  return {
    agentEvents: [],
    roundEvents: [],
    currentThinking: new Map(),
    addAgentEvent: (event) => set(s => ({ agentEvents: [...s.agentEvents, event] })),
    addRoundEvent: (event) => set(s => ({ roundEvents: [...s.roundEvents, event] })),
    clearSession: (sessionId) => set(s => ({
      agentEvents: s.agentEvents.filter(e => e.sessionId !== sessionId),
      roundEvents: s.roundEvents.filter(e => e.sessionId !== sessionId),
    })),
    clearAll: () => set({ agentEvents: [], roundEvents: [], currentThinking: new Map() }),
  };
});
