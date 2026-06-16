import { CONFIG } from './config-registry';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';
import type { ExecutionTrace, TraceDataQuality, TraceStep, TraceFilter, TraceExport } from '../contracts/observability';
export type { TraceFilter, TraceExport };

const LOGGER = rootLogger.child('TraceService');

export interface TraceServiceDeps {
  eventBus: { on: (event: string, cb: (...args: unknown[]) => void) => () => void; onSafe: <T>(event: string, cb: (data: T) => void) => () => void; emit: (event: string, data?: unknown) => void };
  database: {
    db: {
      traces: {
        orderBy: (field: string) => { reverse: () => { limit: (n: number) => { toArray: () => Promise<ExecutionTrace[]> } } };
        put: (trace: ExecutionTrace) => Promise<void>;
        delete: (id: string) => Promise<void>;
        clear: () => Promise<void>;
      };
    };
  };
}

export class TraceService {
  private traces: ExecutionTrace[] = [];
  private activeTraces = new Map<string, ExecutionTrace>();
  private deps: TraceServiceDeps;
  private unsubs: Array<() => void> = [];

  constructor(deps: TraceServiceDeps) {
    this.deps = deps;
  }

  private getRetentionMetadata(evictedOlderEntries = false): TraceDataQuality['retention'] {
    return {
      inMemoryLimit: CONFIG.traces.maxEntries,
      dbLoadLimit: CONFIG.traces.dbLoadLimit,
      policy: 'newest-first',
      evictedOlderEntries,
    };
  }

  private estimateTokensFromText(text: string): { totalTokens: number; quality: TraceDataQuality['tokenCount'] } {
    return {
      totalTokens: Math.ceil(text.length / CONFIG.traces.tokenEstimateDivisor),
      quality: {
        source: 'estimated',
        method: 'character_divisor',
        divisor: CONFIG.traces.tokenEstimateDivisor,
        note: 'Approximation used when provider token usage is unavailable.',
      },
    };
  }

  async init() {
    await this.load();
    this.setupListeners();
  }

  private async load() {
    try {
      const saved = await this.deps.database.db.traces.orderBy('startTime').reverse().limit(CONFIG.traces.dbLoadLimit).toArray();
      this.traces = saved;
      this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
    } catch (e) { LOGGER.error('TraceService', 'Failed to load traces', { error: String(e) }); }
  }
  
  private async persist(trace: ExecutionTrace) {
    try { await this.deps.database.db.traces.put(trace); }
    catch (e) { LOGGER.error('TraceService', 'Failed to persist trace', { error: String(e) }); }
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.onSafe<{ requestId: string; messages: { content?: string }[] }>(EVENTS.REQUEST_INCOMING, (d) => {
        const traceId = d.requestId || `trace-${crypto.randomUUID()}`;
        const newTrace: ExecutionTrace = {
          id: traceId,
          startTime: Date.now(),
          input: d.messages?.[d.messages.length - 1]?.content || 'Incoming request',
          status: 'running',
          steps: [],
          dataQuality: { retention: this.getRetentionMetadata() },
        };
        this.activeTraces.set(traceId, newTrace);
        this.addTrace(newTrace);
      })
    );

    this.unsubs.push(
      this.deps.eventBus.onSafe<{ nodeId: string; traceId: string; metadata?: Record<string, unknown> }>(EVENTS.COGNITIVE_STEP_ACTIVE, (d) => {
        const { nodeId, traceId } = d;
        const trace = this.activeTraces.get(traceId);
        if (!trace) {
          LOGGER.debug('TraceService', 'Step active event for unknown trace', { traceId, nodeId });
          return;
        }
        const step: TraceStep = {
          id: `step-${nodeId}-${Date.now()}`,
          nodeId,
          label: nodeId,
          status: 'active',
          timestamp: Date.now(),
          metadata: d.metadata,
        };
        trace.steps.push(step);
        this.persist(trace);
        this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
      })
    );

    this.unsubs.push(
      this.deps.eventBus.onSafe<{ nodeId: string; traceId: string; status: 'done' | 'error'; duration: number; output: string; fullContent?: string; provider?: string }>(EVENTS.COGNITIVE_STEP_COMPLETED, (d) => {
        const { nodeId, status, duration, output, traceId } = d;
        const trace = this.activeTraces.get(traceId);
        if (!trace) {
          LOGGER.debug('TraceService', 'Step completed event for unknown trace', { traceId, nodeId });
          return;
        }
        const step = trace.steps.find((s: TraceStep) => s.nodeId === nodeId && s.status === 'active');
        if (step) {
          step.status = status === 'done' ? 'done' : 'error';
          step.duration = duration ?? (Date.now() - step.timestamp);
          step.output = output;
        }
        this.persist(trace);
        this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
      })
    );

    this.unsubs.push(
      this.deps.eventBus.onSafe<{ final_data: { traceId: string; output: string } }>(EVENTS.REQUEST_COMPLETED, (d) => {
        const { final_data } = d;
        const traceId = final_data?.traceId;
        if (!traceId) return;
        const trace = this.activeTraces.get(traceId);
        if (!trace) {
          LOGGER.debug('TraceService', 'Request completed event for unknown trace', { traceId });
          return;
        }
        trace.status = 'completed';
        trace.endTime = Date.now();
        trace.output = final_data.output;
        const tokenEstimate = this.estimateTokensFromText(final_data.output || '');
        trace.totalTokens = tokenEstimate.totalTokens;
        trace.isApproximate = true;
        trace.dataQuality = {
          ...trace.dataQuality,
          tokenCount: tokenEstimate.quality,
          retention: this.getRetentionMetadata(),
        };
        this.activeTraces.delete(traceId);
        this.persist(trace);
        this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
      })
    );

    this.unsubs.push(
      this.deps.eventBus.onSafe<{ requestId: string; fullContent: string; latency: number; tokens?: number; provider?: string; model?: string }>(EVENTS.STREAM_END, (d) => {
        const trace = this.activeTraces.get(d.requestId);
        if (!trace) {
          LOGGER.debug('TraceService', 'Stream end event for unknown trace', { requestId: d.requestId });
          return;
        }
          const genStep = trace.steps.find((s: TraceStep) => s.nodeId === 'agent');
          if (genStep) {
            genStep.status = 'done';
            genStep.duration = d.latency;
            genStep.output = d.fullContent;
          }
          trace.status = 'completed';
          trace.endTime = Date.now();
          trace.output = d.fullContent;
          trace.provider = d.provider;
          trace.model = d.model;
          if (d.tokens) {
            trace.totalTokens = d.tokens;
            trace.isApproximate = false;
            trace.dataQuality = {
              ...trace.dataQuality,
              tokenCount: { source: 'actual', method: 'provider_usage' },
              retention: this.getRetentionMetadata(),
            };
          } else {
            const tokenEstimate = this.estimateTokensFromText(d.fullContent || '');
            trace.totalTokens = tokenEstimate.totalTokens;
            trace.isApproximate = true;
            trace.dataQuality = {
              ...trace.dataQuality,
              tokenCount: tokenEstimate.quality,
              retention: this.getRetentionMetadata(),
            };
          }
          this.activeTraces.delete(d.requestId);
          // B10-43: Persist trace to database before removing from active traces
          this.persist(trace);
          this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
      })
    );
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.traces = [];
    this.activeTraces.clear();
  }

  getTraces(): ExecutionTrace[] { return this.traces; }

  getTrace(id: string): ExecutionTrace | undefined { return this.traces.find(t => t.id === id); }

  getFilteredTraces(filter: TraceFilter): ExecutionTrace[] {
    let filtered = [...this.traces];
    if (filter.status) filtered = filtered.filter(t => t.status === filter.status);
    if (filter.provider) filtered = filtered.filter(t => t.provider === filter.provider);
    if (filter.model) filtered = filtered.filter(t => t.model === filter.model);
    if (filter.startTime) {
      const startTime = filter.startTime;
      filtered = filtered.filter(t => t.startTime >= startTime);
    }
    if (filter.endTime) {
      const endTime = filter.endTime;
      filtered = filtered.filter(t => (t.endTime || t.startTime) <= endTime);
    }
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
    if (index !== -1) { this.traces[index] = trace; }
    else {
      const evictedOlderEntries = this.traces.length >= CONFIG.traces.maxEntries;
      trace.retentionLimited = evictedOlderEntries;
      trace.dataQuality = { ...trace.dataQuality, retention: this.getRetentionMetadata(evictedOlderEntries) };
      this.traces = [trace, ...this.traces].slice(0, CONFIG.traces.maxEntries);
    }
    this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
  }

  removeTrace(id: string) {
    this.traces = this.traces.filter(t => t.id !== id);
    this.deps.database.db.traces.delete(id).catch(e => LOGGER.error('TraceService', 'Failed to delete trace', e));
    this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
  }

  clearAll() {
    this.traces = [];
    this.activeTraces.clear();
    this.deps.database.db.traces.clear().catch(e => LOGGER.error('TraceService', 'Failed to clear traces', e));
    this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
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
        ? completed.reduce((sum, t) => sum + ((t.endTime || t.startTime) - t.startTime), 0) / completed.length : 0,
      avgTokens: completed.length > 0
        ? completed.reduce((sum, t) => sum + (t.totalTokens || 0), 0) / completed.length : 0,
    };
  }

  exportTraces(filter?: TraceFilter): TraceExport {
    const traces = filter ? this.getFilteredTraces(filter) : this.traces;
    return { version: '1.0', exportedAt: Date.now(), count: traces.length, retention: this.getRetentionMetadata(), traces };
  }

  async importTraces(data: TraceExport): Promise<number> {
    let count = 0;
    for (const trace of data.traces) {
      const exists = this.traces.some(t => t.id === trace.id);
      if (!exists) { this.traces.push(trace); await this.persist(trace); count++; }
    }
    this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
    return count;
  }
}
