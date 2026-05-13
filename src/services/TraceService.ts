import { eventBus, EVENTS } from '../core/events';
import type {
  ExecutionTrace,
  TraceStep,
  EventPayloads
} from '../types/domain';
import { dexieDb } from '../core/DatabaseService';

export interface TraceFilter {
  status?: 'running' | 'completed' | 'failed';
  provider?: string;
  model?: string;
  startTime?: number;
  endTime?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TraceExport {
  version: string;
  exportedAt: number;
  count: number;
  traces: ExecutionTrace[];
}

class TraceService {
  private traces: ExecutionTrace[] = [];
  private activeTraces = new Map<string, ExecutionTrace>();

  constructor() {
    this.load();
    this.setupListeners();
  }

  private async load() {
    try {
      const saved = await dexieDb.traces.orderBy('startTime').reverse().limit(200).toArray();
      this.traces = saved;
      eventBus.emit('trace:updated', this.traces);
    } catch (e) {
      console.error('[TraceService] Failed to load traces', e);
    }
  }

  private async persist(trace: ExecutionTrace) {
    try {
      await dexieDb.traces.put(trace);
    } catch (e) {
      console.error('[TraceService] Failed to persist trace', e);
    }
  }

  private setupListeners() {
    eventBus.on('request:incoming', (data: EventPayloads['request:incoming']) => {
      const traceId = data.requestId || `trace-${crypto.randomUUID().slice(0, 8)}`;
      const newTrace: ExecutionTrace = {
        id: traceId,
        startTime: Date.now(),
        input: data.messages?.[data.messages.length - 1]?.content || 'Incoming request',
        status: 'running',
        steps: []
      };
      this.activeTraces.set(traceId, newTrace);
      this.addTrace(newTrace);
    });

    eventBus.on('cognitive:step:active', (data: EventPayloads['cognitive:step:active']) => {
      const { nodeId, traceId } = data;
      const trace = this.activeTraces.get(traceId);
      if (!trace) return;
      const step: TraceStep = {
        id: `step-${nodeId}-${Date.now()}`,
        nodeId,
        label: nodeId,
        status: 'active',
        timestamp: Date.now(),
        metadata: data.metadata,
      };
      trace.steps.push(step);
      this.persist(trace);
      eventBus.emit('trace:updated', this.traces);
    });

    eventBus.on('cognitive:step:completed', (data: EventPayloads['cognitive:step:completed']) => {
      const { nodeId, status, duration, output, traceId } = data;
      const trace = this.activeTraces.get(traceId);
      if (!trace) return;
      const step = trace.steps.find((s: TraceStep) => s.nodeId === nodeId && s.status === 'active');
      if (step) {
        step.status = status === 'done' ? 'done' : 'error';
        step.duration = duration;
        step.output = output;
      }
      this.persist(trace);
      eventBus.emit('trace:updated', this.traces);
    });

    eventBus.on('request:completed', (data: EventPayloads['request:completed']) => {
      const { final_data } = data;
      const traceId = final_data?.traceId;
      if (!traceId) return;
      const trace = this.activeTraces.get(traceId);
      if (trace) {
        trace.status = 'completed';
        trace.endTime = Date.now();
        trace.output = final_data.output;
        trace.totalTokens = (final_data.output || '').length / 4;
        this.activeTraces.delete(traceId);
        this.persist(trace);
        eventBus.emit('trace:updated', this.traces);
      }
    });

    eventBus.on(EVENTS.SEND_MESSAGE, (data) => {
      if (this.activeTraces.size > 0) return;
      const messages = (data as { messages?: Array<{ content: string }> })?.messages || [];
      const lastMsg = messages[messages.length - 1];
      const id = (data as { requestId?: string }).requestId || crypto.randomUUID().slice(0, 8);
      const trace: ExecutionTrace = {
        id,
        startTime: Date.now(),
        input: lastMsg?.content || 'Chat message',
        status: 'running',
        steps: [
          { id: 's1', nodeId: 'router', label: 'Semantic Routing', status: 'done', timestamp: Date.now(), duration: 150 },
          { id: 's2', nodeId: 'agent', label: 'LLM Generation', status: 'active', timestamp: Date.now() },
        ],
      };
      this.activeTraces.set(id, trace);
      this.addTrace(trace);
    });

    eventBus.on('chat:stream:end', (data: EventPayloads['chat:stream:end']) => {
      const trace = this.activeTraces.get(data.requestId);
      if (trace) {
        const genStep = trace.steps.find((s: TraceStep) => s.nodeId === 'agent');
        if (genStep) {
          genStep.status = 'done';
          genStep.duration = data.latency;
          genStep.output = data.fullContent;
        }
        trace.status = 'completed';
        trace.endTime = Date.now();
        trace.output = data.fullContent;
        trace.provider = data.provider;
        trace.model = data.model;
        trace.totalTokens = data.tokens || (data.fullContent?.length / 4);
        this.activeTraces.delete(data.requestId);
        eventBus.emit('trace:updated', this.traces);
      }
    });
  }

  getTraces(): ExecutionTrace[] {
    return this.traces;
  }

  getTrace(id: string): ExecutionTrace | undefined {
    return this.traces.find(t => t.id === id);
  }

  getFilteredTraces(filter: TraceFilter): ExecutionTrace[] {
    let filtered = [...this.traces];
    if (filter.status) filtered = filtered.filter(t => t.status === filter.status);
    if (filter.provider) filtered = filtered.filter(t => t.provider === filter.provider);
    if (filter.model) filtered = filtered.filter(t => t.model === filter.model);
    if (filter.startTime) filtered = filtered.filter(t => t.startTime >= filter.startTime!);
    if (filter.endTime) filtered = filtered.filter(t => (t.endTime || t.startTime) <= filter.endTime!);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.input.toLowerCase().includes(q) ||
        (t.output && t.output.toLowerCase().includes(q)) ||
        t.steps.some(s => s.label.toLowerCase().includes(q))
      );
    }
    filtered.sort((a, b) => b.startTime - a.startTime);
    if (filter.offset) filtered = filtered.slice(filter.offset);
    if (filter.limit) filtered = filtered.slice(0, filter.limit);
    return filtered;
  }

  addTrace(trace: ExecutionTrace) {
    const index = this.traces.findIndex(t => t.id === trace.id);
    if (index !== -1) {
      this.traces[index] = trace;
    } else {
      this.traces = [trace, ...this.traces].slice(0, 200);
    }
    eventBus.emit('trace:updated', this.traces);
  }

  removeTrace(id: string) {
    this.traces = this.traces.filter(t => t.id !== id);
    dexieDb.traces.delete(id).catch(e => console.error('[TraceService] Failed to delete trace', e));
    eventBus.emit('trace:updated', this.traces);
  }

  clearAll() {
    this.traces = [];
    this.activeTraces.clear();
    dexieDb.traces.clear().catch(e => console.error('[TraceService] Failed to clear traces', e));
    eventBus.emit('trace:updated', this.traces);
  }

  getTraceStats() {
    const completed = this.traces.filter(t => t.status === 'completed');
    const failed = this.traces.filter(t => t.status === 'failed');
    return {
      total: this.traces.length,
      completed: completed.length,
      failed: failed.length,
      running: this.traces.filter(t => t.status === 'running').length,
      successRate: this.traces.length > 0 ? completed.length / this.traces.length : 1,
      avgDuration: completed.length > 0
        ? completed.reduce((sum, t) => sum + ((t.endTime || t.startTime) - t.startTime), 0) / completed.length
        : 0,
      avgTokens: completed.length > 0
        ? completed.reduce((sum, t) => sum + (t.totalTokens || 0), 0) / completed.length
        : 0,
    };
  }

  exportTraces(filter?: TraceFilter): TraceExport {
    const traces = filter ? this.getFilteredTraces(filter) : this.traces;
    return {
      version: '1.0',
      exportedAt: Date.now(),
      count: traces.length,
      traces,
    };
  }

  async importTraces(data: TraceExport): Promise<number> {
    let count = 0;
    for (const trace of data.traces) {
      const exists = this.traces.some(t => t.id === trace.id);
      if (!exists) {
        this.traces.push(trace);
        await this.persist(trace);
        count++;
      }
    }
    eventBus.emit('trace:updated', this.traces);
    return count;
  }
}

export const traceService = new TraceService();
