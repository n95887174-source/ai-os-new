import type { ISNode } from '../contracts/topology';
import type { NodeContext, CognitiveTrace, CognitiveDecision, CognitiveStep } from '../types/domain-types';
import type { ChatMessage } from '../../llm/core/types';
import type { AdapterMessage, IProviderAdapter } from '../contracts/provider-adapter';
import type { TraceStore } from '../contracts/storage/trace-store';
import type { BlackboardService } from './blackboard-service';
import { CONFIG } from './config-registry';
import { EVENTS } from '../events/event-names';
import { estimateTokens } from '../../utils/tokenEstimate';

export type { CognitiveTrace, CognitiveDecision, CognitiveStep };

export type DecisionAlternative = {
  id: string;
  label: string;
  score: number;
  reasoning: string;
  constraints_impact?: Record<string, number>;
  metadata?: Record<string, unknown>;
};

export interface CognitiveStats {
  totalTraces: number;
  completedTraces: number;
  failedTraces: number;
  avgLatency: number;
  avgTokens: number;
  avgConfidence: number;
  totalTokens: number;
  totalCost: number;
}

export interface CognitiveServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  traceStore: TraceStore;
  routerService: {
    getRankedProviders: (strategy: string, prompt: string, priority?: string, agentId?: string) => Array<any>;
  };
  keyService: any;
  roleService: any;
  adapterRegistry: {
    getAdapter: (provider: string) => IProviderAdapter | undefined;
  };
  blackboardService: Pick<BlackboardService, 'read'>;
}

export class CognitiveService {
  private deps: CognitiveServiceDeps;

  private traces: CognitiveTrace[] = [];
  private activeTraces = new Map<string, CognitiveTrace>();
  private unsubs: Array<() => void> = [];

  private persistErrorCount = 0;

  private stats: CognitiveStats = {
    totalTraces: 0,
    completedTraces: 0,
    failedTraces: 0,
    avgLatency: 0,
    avgTokens: 0,
    avgConfidence: 0,
    totalTokens: 0,
    totalCost: 0,
  };

  // ===== OOM SAFETY LIMITS =====
  private readonly MAX_TRACES = 30;
  private readonly MAX_STEPS = 20;
  private readonly MAX_ACTIVE_TRACES = 20;
  private readonly MAX_CHUNK_BUFFER = 8000;
  private readonly PERSIST_INTERVAL = 2000;
  private readonly MAX_INPUT_LENGTH = 5000;
  private readonly MAX_OUTPUT_LENGTH = 50000;

  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private persistQueued = false;
  private _listenersSetup = false;

  constructor(deps: CognitiveServiceDeps) {
    this.deps = deps;
  }

  async init() {
    if (this._listenersSetup) return;
    this.setupListeners();
    this._listenersSetup = true;
    await this.load();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  // ================= LOAD =================
  private async load() {
    try {
      if ((await this.deps.traceStore.count()) > 0) {
        this.traces = await this.deps.traceStore.queryTraces({
          order: 'desc',
          limit: 50,
        });
      }

      // HARD TRIM (OOM FIX)
      this.traces = this.traces.slice(0, this.MAX_TRACES);
    } catch (e) {
      console.error('[CognitiveService] Failed to load traces', e);
    }
  }

  // ================= SAFE PERSIST (THROTTLED + COALESCED) =================
  private persist() {
    if (this.persistQueued) return;
    this.persistQueued = true;

    this.persistTimer = setTimeout(async () => {
      try {
        const trimmed = this.traces.slice(0, this.MAX_TRACES);
        await this.deps.traceStore.bulkPut(trimmed);

        this.traces = trimmed;
        this.persistErrorCount = 0;
      } catch (e) {
        this.persistErrorCount++;
        console.error('[CognitiveService] Persist error:', e);
      } finally {
        this.persistQueued = false;
        this.persistTimer = null;
      }
    }, this.PERSIST_INTERVAL);
  }

  // ================= LISTENERS =================
  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.onSafe(EVENTS.SEND_MESSAGE, (req: any) => {
        const lastMsg = req.messages?.at?.(-1);
        this.startTrace(req.requestId || crypto.randomUUID(), lastMsg?.content || '');
      }),

      this.deps.eventBus.onSafe(EVENTS.COGNITIVE_STEP_ACTIVE, (d: any) => {
        const trace = this.activeTraces.get(d.traceId || '');
        if (!trace) return;

        trace.steps.push({
          id: d.nodeId,
          type: 'reasoning',
          label: `Processing ${d.nodeId}`,
          status: 'active',
          timestamp: Date.now(),
        });

        if (trace.steps.length > this.MAX_STEPS) {
          trace.steps.splice(0, trace.steps.length - this.MAX_STEPS);
        }

        this.persist();
        this.throttledEmit();
      }),

      this.deps.eventBus.onSafe(EVENTS.COGNITIVE_STEP_COMPLETED, (d: any) => {
        const trace = this.activeTraces.get(d.traceId || '');
        if (!trace) return;

        const step = trace.steps.find(s => s.id === d.nodeId);

        if (step) {
          step.status = 'done';
          step.duration = d.duration;
          step.observations = d.output;
        }

        if (trace.steps.length > this.MAX_STEPS) {
          trace.steps.splice(0, trace.steps.length - this.MAX_STEPS);
        }

        this.persist();
        this.throttledEmit();
      }),

      this.deps.eventBus.onSafe(EVENTS.REQUEST_COMPLETED, (data: any) => {
        const traceId = data.final_data?.traceId || '';
        const trace = this.activeTraces.get(traceId);
        if (!trace) return;

        trace.status = 'completed';
        trace.output = data.final_data?.output?.slice(0, this.MAX_OUTPUT_LENGTH);
        trace.endTime = Date.now();
        trace.totalLatency = trace.endTime - trace.startTime;

        const text = trace.output || '';

        // SAFE streaming replacement (NO BIG STRINGS)
        const windowText = text.slice(-this.MAX_CHUNK_BUFFER);
        trace.totalTokens = estimateTokens(windowText);

        this.activeTraces.delete(traceId);

        this.updateStats(trace);
        this.persist();
        this.throttledEmit();
      })
    );
  }

  // ================= TRIM ACTIVE TRACES =================
  private trimActiveTraces() {
    if (this.activeTraces.size < this.MAX_ACTIVE_TRACES) return;

    const firstKey = this.activeTraces.keys().next().value;
    if (firstKey) {
      const old = this.activeTraces.get(firstKey);
      if (old) old.status = 'completed';
      this.activeTraces.delete(firstKey);
    }
  }

  // ================= TRACE START =================
  private startTrace(traceId: string, input: string) {
    this.trimActiveTraces();

    const trace: CognitiveTrace = {
      id: crypto.randomUUID().slice(0, 8),
      traceId,
      startTime: Date.now(),
      input: input.slice(0, this.MAX_INPUT_LENGTH),
      status: 'running',
      steps: [],
      decisionGraph: { nodes: [], edges: [] },
      totalLatency: 0,
      totalTokens: 0,
      estimatedCost: 0,
      semanticConfidence: 1,
      dataQuality: {},
    };

    this.activeTraces.set(traceId, trace);

    this.traces = [trace, ...this.traces].slice(0, this.MAX_TRACES);

    this.persist();
    this.throttledEmit();
  }

  // ================= SAFE EMIT THROTTLE =================
  private throttledEmit() {
    if (Math.random() < 0.2) {
      this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.getTraces());
    }
  }

  // ================= STATS =================
  private updateStats(trace: CognitiveTrace) {
    this.stats.totalTraces++;
    this.stats.completedTraces++;
    this.stats.totalTokens += trace.totalTokens;

    this.stats.avgLatency =
      (this.stats.avgLatency + trace.totalLatency) / this.stats.totalTraces;

    this.stats.avgTokens =
      (this.stats.avgTokens + trace.totalTokens) / this.stats.totalTraces;

    this.stats.avgConfidence =
      (this.stats.avgConfidence + trace.semanticConfidence) / this.stats.totalTraces;
  }

  getStats(): CognitiveStats {
    return { ...this.stats };
  }

  // ================= PUBLIC API =================
  getTraces(): CognitiveTrace[] {
    return this.traces;
  }

  getTrace(id: string): CognitiveTrace | undefined {
    return this.traces.find(t => t.id === id);
  }

  clearTraces() {
    this.traces = [];
    this.activeTraces.clear();
    this.deps.traceStore.clear().catch(console.error);
    this.throttledEmit();
  }

  // ================= EXECUTION =================
  async executeAgentNode(node: ISNode, data: NodeContext): Promise<string> {
    const input = this.buildPrompt(node, data);
    const alternatives = this.evaluateAlternatives(node, data, input);

    if (!alternatives.length) throw new Error('No viable execution alternatives');

    const decision = this.makeDecision(alternatives);

    this.deps.eventBus.emit(EVENTS.COGNITIVE_DECISION_MADE, decision);

    return this.executeWithFallback(decision, node, data);
  }

  private buildPrompt(node: ISNode, data: NodeContext): string {
    return `${node.config.systemPrompt || ''}\n\n${data.output || ''}`;
  }

  private evaluateAlternatives(_node: ISNode, _data: NodeContext, _input: string): any[] {
    return [];
  }

  private makeDecision(alts: any[]): any {
    return alts[0];
  }

  private async executeWithFallback(decision: any, node: ISNode, data: NodeContext): Promise<string> {
    const alt = decision.alternatives?.[0];
    const meta = alt?.metadata?.key;

    if (!meta) return 'error';

    const adapter = this.deps.adapterRegistry.getAdapter(meta.provider);
    if (!adapter) throw new Error('No adapter');

    const messages: AdapterMessage[] = [{ role: 'user', content: this.buildPrompt(node, data) }];

    let output = '';
    let buffer = '';

    if (adapter.streamMessage) {
      await adapter.streamMessage(messages, alt.model, meta.key, (chunk) => {
        buffer += chunk;

        if (buffer.length > this.MAX_CHUNK_BUFFER) {
          buffer = buffer.slice(-this.MAX_CHUNK_BUFFER);
        }

        output = buffer;
      });
    } else {
      const res = await adapter.sendMessage(messages, alt.model, meta.key);
      output = res.content;
    }

    const tokens = estimateTokens(output.slice(-this.MAX_CHUNK_BUFFER));

    this.deps.roleService.recordRoleUsage?.('role', true, 0, tokens);

    return output;
  }
}