import { eventBus, EVENTS } from '../core/events';
import type { 
  ExecutionTrace, 
  TraceStep, 
  EventPayloads 
} from '../types/domain';
import { dexieDb } from '../core/DatabaseService';

class TraceService {
  private traces: ExecutionTrace[] = [];
  private activeTraces = new Map<string, ExecutionTrace>();

  constructor() {
    this.load();
    this.setupListeners();
  }

  private async load() {
    try {
      const saved = await dexieDb.traces.orderBy('startTime').reverse().limit(50).toArray();
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
    // 1. Listen for new execution requests
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

    // 2. Listen for individual cognitive steps
    eventBus.on('cognitive:step:active', (data: EventPayloads['cognitive:step:active']) => {
      const { nodeId, traceId } = data;
      const trace = this.activeTraces.get(traceId);
      if (!trace) return;

      const step: TraceStep = {
        id: `step-${nodeId}-${Date.now()}`,
        nodeId,
        label: nodeId, // This will be enriched if possible
        status: 'active',
        timestamp: Date.now(),
        metadata: data.metadata
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
        step.timestamp = Date.now();
      }
      
      this.persist(trace);
      eventBus.emit('trace:updated', this.traces);
    });

    // 3. Listen for completion
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

    // Handle legacy CHAT_MESSAGE for compatibility
    eventBus.on(EVENTS.CHAT_MESSAGE, (data) => {
      if (this.activeTraces.size > 0) return; // Already handled by request:incoming
      
      const messages = data?.messages || [];
      const lastMsg = messages[messages.length - 1];
      const id = data.requestId || crypto.randomUUID().slice(0, 8);
      const trace: ExecutionTrace = {
        id,
        startTime: Date.now(),
        input: lastMsg?.content || 'Chat message',
        status: 'running',
        steps: [
          { id: 's1', nodeId: 'router', label: 'Semantic Routing', status: 'done', timestamp: Date.now(), duration: 150 },
          { id: 's2', nodeId: 'agent', label: 'LLM Generation', status: 'active', timestamp: Date.now() }
        ]
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

  getTraces() {
    return this.traces;
  }

  addTrace(trace: ExecutionTrace) {
    // Check if trace already exists in the list to avoid duplicates
    const index = this.traces.findIndex(t => t.id === trace.id);
    if (index !== -1) {
      this.traces[index] = trace;
    } else {
      this.traces = [trace, ...this.traces].slice(0, 50);
    }
    eventBus.emit('trace:updated', this.traces);
  }
}

export const traceService = new TraceService();
