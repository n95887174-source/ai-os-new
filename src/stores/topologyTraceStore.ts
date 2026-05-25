import { create } from 'zustand';
import { eventBus } from '../core/events';

export interface TopologyStepEvent {
  nodeId: string;
  traceId: string;
  status: 'active' | 'done' | 'error';
  timestamp: number;
  duration?: number;
  label?: string;
}

export interface TopologyTraceState {
  steps: TopologyStepEvent[];
  activeTraces: Set<string>;
  addStep: (step: TopologyStepEvent) => void;
  clearTrace: (traceId: string) => void;
  clearAll: () => void;
}

export const useTopologyTraceStore = create<TopologyTraceState>((set, get) => {
  const unsubActive = eventBus.onSafe<{ nodeId: string; traceId: string }>('cognitive:step:active', (d) => {
    const step: TopologyStepEvent = {
      nodeId: d.nodeId,
      traceId: d.traceId,
      status: 'active',
      timestamp: Date.now(),
    };
    set(s => {
      const activeTraces = new Set(s.activeTraces);
      activeTraces.add(d.traceId);
      return { steps: [...s.steps, step], activeTraces };
    });
  });

  const unsubCompleted = eventBus.onSafe<{ nodeId: string; traceId: string; status: 'done' | 'error'; duration: number }>('cognitive:step:completed', (d) => {
    const step: TopologyStepEvent = {
      nodeId: d.nodeId,
      traceId: d.traceId,
      status: d.status,
      timestamp: Date.now(),
      duration: d.duration,
    };
    set(s => ({ steps: [...s.steps, step] }));
  });

  const unsubRequest = eventBus.on('request:completed', () => {
    // trace naturally ends — keep in store for UI reference
  });

  return {
    steps: [],
    activeTraces: new Set<string>(),
    addStep: (step) => set(s => ({ steps: [...s.steps, step] })),
    clearTrace: (traceId) => set(s => ({
      steps: s.steps.filter(st => st.traceId !== traceId),
      activeTraces: new Set([...s.activeTraces].filter(id => id !== traceId)),
    })),
    clearAll: () => set({ steps: [], activeTraces: new Set() }),
  };
});
