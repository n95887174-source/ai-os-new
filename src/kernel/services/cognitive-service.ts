import type { ISNode } from '../contracts/topology';
import type { NodeContext, CognitiveTrace, CognitiveDecision, CognitiveStep } from '../types/domain-types';
import type { ChatMessage } from '../../llm/core/types';
import type { AdapterMessage, IProviderAdapter } from '../contracts/provider-adapter';
import type { TraceStore } from '../contracts/storage/trace-store';
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
    getRankedProviders: (strategy: string, prompt: string, priority?: string, agentId?: string) => Array<{ id: string; provider: string; key: string; label: string; availableModels?: string[]; stats?: { avgLatency: number; successCount: number; errorCount: number; extended?: { reputationScore: number; estimatedCost: number } } }>;
  };
  keyService: {
    getKeys: () => Array<{ id: string; provider: string; key: string; label: string; availableModels?: string[]; stats?: { avgLatency: number; successCount: number; errorCount: number; extended?: { reputationScore: number } } }>;
    recordUsage: (keyId: string, latency: number, tokens: number, model: string, extra?: Record<string, unknown>) => void;
    updateKeyStatus: (id: string, status: string, latency?: number) => void;
  };
  roleService: {
    recordRoleUsage: (roleId: string, success: boolean, latency: number, tokens: number) => void;
  };
  adapterRegistry: {
    getAdapter: (provider: string) => IProviderAdapter | undefined;
  };
}

export class CognitiveService {
  private deps: CognitiveServiceDeps;
  private traces: CognitiveTrace[] = [];
  private activeTraces = new Map<string, CognitiveTrace>();
  private unsubs: Array<() => void> = [];
  private persistErrorCount = 0;
  private stats: CognitiveStats = {
    totalTraces: 0, completedTraces: 0, failedTraces: 0,
    avgLatency: 0, avgTokens: 0, avgConfidence: 0,
    totalTokens: 0, totalCost: 0,
  };

  constructor(deps: CognitiveServiceDeps) {
    this.deps = deps;
  }

  async init() {
    this.setupListeners();
    await this.load();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  private async load() {
    try {
      if ((await this.deps.traceStore.count()) > 0) {
        this.traces = await this.deps.traceStore.queryTraces({ order: 'desc', limit: 50 });
      }
    } catch (e) { console.error('[CognitiveService] Failed to load traces', e); }
  }

  private async persist() {
    try {
      await this.deps.traceStore.bulkPut(this.traces);
      this.persistErrorCount = 0;
    } catch (e) {
      this.persistErrorCount++;
      console.error('[CognitiveService] Persist error:', e);
      if (this.persistErrorCount === 5) {
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Trace persistence failing repeatedly', type: 'warning' });
      }
    }
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.onSafe<{ messages?: ChatMessage[]; requestId?: string }>(EVENTS.SEND_MESSAGE, (req) => {
        const messages = req.messages;
        const lastMsg = messages?.[messages.length - 1];
        this.startTrace(req.requestId || crypto.randomUUID(), lastMsg?.content || '');
      }),

      this.deps.eventBus.onSafe<{ traceId?: string; nodeId: string }>(EVENTS.COGNITIVE_STEP_ACTIVE, (d) => {
        const trace = this.activeTraces.get(d.traceId || 'internal-trace');
        if (trace) {
          trace.steps.push({
            id: d.nodeId, type: 'reasoning', label: `Processing ${d.nodeId}`,
            status: 'active', timestamp: Date.now(),
          });
          this.persist();
          this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.getTraces());
        }
      }),

      this.deps.eventBus.onSafe<{ traceId?: string; nodeId: string; status?: string; duration?: number; output?: string }>(EVENTS.COGNITIVE_STEP_COMPLETED, (d) => {
        const trace = this.activeTraces.get(d.traceId || 'internal-trace');
        if (!trace) return;
        const step = trace.steps.find(s => s.id === d.nodeId);
        const status = (d.status === 'done' || d.status === 'error') ? d.status : 'done';
        if (step) {
          step.status = status;
          step.duration = d.duration;
          step.observations = d.output;
        } else {
          trace.steps.push({
            id: d.nodeId, type: 'reasoning', label: `Completed ${d.nodeId}`,
            status, timestamp: Date.now(), duration: d.duration, observations: d.output,
          });
        }
        this.persist();
        this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.getTraces());
      }),

      this.deps.eventBus.onSafe<{ final_data?: { traceId?: string; output?: string } }>(EVENTS.REQUEST_COMPLETED, (data) => {
        const finalData = data.final_data;
        const traceId = finalData?.traceId || 'internal-trace';
        const trace = this.activeTraces.get(traceId);
        if (trace) {
          trace.status = 'completed';
          trace.output = finalData?.output;
          trace.endTime = Date.now();
          trace.totalLatency = trace.endTime - trace.startTime;
          trace.totalTokens = estimateTokens(finalData?.output || '');
          trace.dataQuality = {
            ...trace.dataQuality,
            tokenCount: {
              source: 'estimated',
              method: 'character_divisor',
              divisor: CONFIG.traces.tokenEstimateDivisor,
              note: 'Approximation used when provider token usage is unavailable.',
            },
          };
          this.activeTraces.delete(traceId);
          this.updateStats(trace);
          this.persist();
          this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.getTraces());
        }
      }),

      this.deps.eventBus.onSafe<CognitiveDecision>(EVENTS.COGNITIVE_DECISION_MADE, (decision) => {
        const traceId = `decision-${decision.selectedId}`;
        const trace = this.activeTraces.get(traceId);
        if (trace) {
          trace.steps.push({
            id: `decision-${decision.selectedId}`, type: 'reasoning',
            label: `Decision: ${decision.alternatives.find(a => a.id === decision.selectedId)?.label || decision.selectedId}`,
            status: 'done', timestamp: Date.now(), decision,
          });
          this.persist();
          this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.getTraces());
        }
      })
    );
  }

  private updateStats(trace: CognitiveTrace) {
    this.stats.totalTraces++;
    this.stats.completedTraces++;
    this.stats.totalTokens += trace.totalTokens;
    this.stats.totalCost += trace.estimatedCost;
    this.stats.avgLatency = this.stats.totalTraces > 0
      ? (this.stats.avgLatency * (this.stats.totalTraces - 1) + trace.totalLatency) / this.stats.totalTraces
      : trace.totalLatency;
    this.stats.avgTokens = this.stats.totalTraces > 0
      ? (this.stats.avgTokens * (this.stats.totalTraces - 1) + trace.totalTokens) / this.stats.totalTraces
      : trace.totalTokens;
    this.stats.avgConfidence = this.stats.totalTraces > 0
      ? (this.stats.avgConfidence * (this.stats.totalTraces - 1) + trace.semanticConfidence) / this.stats.totalTraces
      : trace.semanticConfidence;
  }

  getStats(): CognitiveStats { return { ...this.stats }; }

  private startTrace(traceId: string, input: string) {
    const newTrace: CognitiveTrace = {
      id: crypto.randomUUID().slice(0, 8),
      traceId,
      startTime: Date.now(),
      input,
      status: 'running',
      steps: [],
      decisionGraph: { nodes: [], edges: [] },
      totalLatency: 0,
      totalTokens: 0,
      estimatedCost: 0,
      semanticConfidence: 1,
      dataQuality: {
        retention: {
          inMemoryLimit: CONFIG.traces.maxEntries,
          dbLoadLimit: CONFIG.traces.dbLoadLimit,
          policy: 'newest-first',
          evictedOlderEntries: this.traces.length >= CONFIG.traces.maxEntries,
        },
      },
    };
    this.activeTraces.set(traceId, newTrace);
    this.traces = [newTrace, ...this.traces].slice(0, CONFIG.traces.maxEntries);
    this.persist();
    this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.getTraces());
  }

  getTraces(): CognitiveTrace[] { return this.traces; }

  getTrace(id: string): CognitiveTrace | undefined {
    return this.traces.find(t => t.id === id);
  }

  addTrace(trace: CognitiveTrace) {
    trace.dataQuality = {
      ...trace.dataQuality,
      retention: {
        inMemoryLimit: CONFIG.traces.maxEntries,
        dbLoadLimit: CONFIG.traces.dbLoadLimit,
        policy: 'newest-first',
        evictedOlderEntries: this.traces.length >= CONFIG.traces.maxEntries,
      },
    };
    this.traces = [trace, ...this.traces].slice(0, CONFIG.traces.maxEntries);
    this.persist();
    this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
  }

  getTracesByStatus(status: 'running' | 'completed' | 'failed'): CognitiveTrace[] {
    return this.traces.filter(t => t.status === status);
  }

  removeTrace(id: string) {
    this.traces = this.traces.filter(t => t.id !== id);
    this.persist();
    this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
  }

  clearTraces() {
    this.traces = [];
    this.activeTraces.clear();
    this.deps.traceStore.clear().catch(e => console.error('[CognitiveService] Failed to clear traces', e));
    this.deps.eventBus.emit(EVENTS.COGNITIVE_TRACE_UPDATED, this.traces);
  }

  async executeAgentNode(node: ISNode, data: NodeContext): Promise<string> {
    const input = this.buildPrompt(node, data);
    const alternatives = this.evaluateAlternatives(node, data, input);
    if (alternatives.length === 0) throw new Error('No viable execution alternatives');
    const decision = this.makeDecision(alternatives, input, node);
    this.deps.eventBus.emit(EVENTS.COGNITIVE_DECISION_MADE, decision);
    return this.executeWithFallback(decision, node, data);
  }

  private buildPrompt(node: ISNode, data: NodeContext): string {
    const promptText = data.output || '';
    const systemPrompt = (node.config.prompt || node.config.systemPrompt || '') as string;
    let blackboardContext = '';
    if (Object.keys(data.blackboard || {}).length > 0) {
      blackboardContext = `\nShared state (Blackboard):\n${JSON.stringify(data.blackboard, null, 2)}`;
    }
    const equippedTools = (node.config.tools || []) as string[];
    let toolContext = '';
    if (equippedTools.length > 0) toolContext = `\nYou have access to: ${equippedTools.join(', ')}.`;
    return `${systemPrompt}${blackboardContext}${toolContext}\n\nContext:\n${promptText}`;
  }

  private evaluateAlternatives(node: ISNode, _data: NodeContext, input: string): DecisionAlternative[] {
    const alternatives: DecisionAlternative[] = [];

    if (node.config.model && (node.config.model as string) !== 'auto') {
      const modelStr = node.config.model as string;
      const [provider, model] = modelStr.includes(':') ? modelStr.split(':') : [modelStr, 'auto'];
      const key = this.deps.keyService.getKeys().find(k => k.provider.toLowerCase() === provider.toLowerCase());
      if (key) {
        alternatives.push({
          id: `configured-${key.id}`, label: `${key.provider}:${model}`,
          score: 0.9, reasoning: 'Pre-configured model in node config',
          metadata: { key, model, source: 'config' },
        });
      }
    }

    const rankedKeys = this.deps.routerService.getRankedProviders('performance', input).slice(0, 3);
    for (const key of rankedKeys) {
      const model = key.availableModels?.[0] || 'auto';
      const existingAlt = alternatives.find(a => {
        const meta = a.metadata as { key?: { id: string } } | undefined;
        return meta?.key?.id === key.id;
      });
      if (existingAlt) continue;

      const score = key.stats ? Math.min(1, Math.max(0.3,
        (key.stats.avgLatency ? Math.max(0, 1 - key.stats.avgLatency / 3000) : 0.5) * 0.4 +
        ((key.stats.extended?.reputationScore || 100) / 100) * 0.3 +
        (key.stats.successCount / Math.max(1, key.stats.successCount + key.stats.errorCount)) * 0.3
      )) : 0.5;

      alternatives.push({
        id: `ranked-${key.id}`, label: `${key.provider}:${model}`,
        score: Math.round(score * 100) / 100,
        reasoning: key.stats ? `Latency ${key.stats.avgLatency}ms, reputation ${key.stats.extended?.reputationScore || 100}%` : 'No usage stats',
        constraints_impact: { cost: 0.5, latency: 1 - score },
        metadata: { key, model, source: 'router' },
      });
    }

    return alternatives;
  }

  private makeDecision(alternatives: DecisionAlternative[], input: string, node: ISNode): CognitiveDecision {
    const sorted = [...alternatives].sort((a, b) => b.score - a.score);
    const explorationFactor = 0.15;
    const shouldExplore = Math.random() < explorationFactor && sorted.length > 1;
    const selected = shouldExplore ? sorted[1] : sorted[0];
    return {
      input,
      constraints: [`cost < ${(node.config.maxCost as number) || 10}`, `latency < ${(node.config.maxLatency as number) || 10000}`],
      alternatives: sorted,
      selectedId: selected.id,
      confidence: selected.score,
      logic: shouldExplore
        ? `[EXPLORE] Selected ${selected.label} (score: ${selected.score}) over ${sorted[0].label} (${sorted[0].score}) — ${selected.reasoning}`
        : `Selected ${selected.label} (score: ${selected.score}) — ${selected.reasoning}`,
      cost: ((selected.metadata as { key?: { stats?: { extended?: { estimatedCost?: number } } } })?.key?.stats?.extended?.estimatedCost),
      causal_chain: sorted.map(a => `${a.label} (${a.score}): ${a.reasoning}`),
    };
  }

  private async executeWithFallback(decision: CognitiveDecision, node: ISNode, data: NodeContext): Promise<string> {
    const errors: string[] = [];

    for (const alt of decision.alternatives) {
      const meta = alt.metadata as { key?: { id: string; provider: string; key: string }; model?: string } | undefined;
      if (!meta?.key) continue;
      const model = meta.model;
      if (!model) continue;

      const adapter = this.deps.adapterRegistry.getAdapter(meta.key.provider);
      if (!adapter) { errors.push(`${alt.label}: adapter not found`); continue; }

      try {
        const startTime = Date.now();
        const input = this.buildPrompt(node, data);
        const messages: AdapterMessage[] = [{ role: 'user', content: input }];

        let fullContent = '';
        let ttft = 0;

        if (adapter.streamMessage) {
          await adapter.streamMessage(messages, model, meta.key.key, (chunk) => {
            if (!fullContent) ttft = Date.now() - startTime;
            fullContent += chunk;
          });
        } else {
          const res = await adapter.sendMessage(messages, model, meta.key.key);
          fullContent = res.content;
        }

        const latency = Date.now() - startTime;
        const tokens = estimateTokens(fullContent);
        const tps = tokens / (latency / 1000);

        this.recordUsage(meta.key.id, latency, tokens, model, { ttft, tps, fullContent, task: node.label });
        this.updateTraceConfidence(data.traceId, this.calculateConfidence(fullContent, decision));

        const roleId = node.config?.roleId as string | undefined;
        if (roleId) this.deps.roleService.recordRoleUsage(roleId, true, latency, tokens);

        return fullContent;
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        errors.push(`${alt.label}: ${errMsg}`);
        this.deps.keyService.recordUsage(meta.key.id, 0, 0, model, { failed: true, error: errMsg, task: node.label });
        this.deps.keyService.updateKeyStatus(meta.key.id, 'error');
      }
    }

    throw new Error(`All alternatives failed: ${errors.join('; ')}`);
  }

  private recordUsage(keyId: string, latency: number, tokens: number, model: string, extra: Record<string, unknown>) {
    this.deps.keyService.recordUsage(keyId, latency, tokens, model, extra);
  }

  private updateTraceConfidence(traceId: string, confidence: number) {
    const trace = this.activeTraces.get(traceId || 'internal-trace');
    if (trace) trace.semanticConfidence = confidence;
  }

  private calculateConfidence(output: string, decision: CognitiveDecision): number {
    if (!output || output.length < 10) return 0.1;
    const hasContent = output.length > 50 ? 0.3 : 0.1;
    const hasStructure = /[.!?]/.test(output) ? 0.2 : 0;
    const hasReasoning = /\b(because|therefore|conclusion|thus|hence)\b/i.test(output) ? 0.3 : 0;
    return Math.min(1, Math.max(0.1, hasContent + hasStructure + hasReasoning + decision.confidence * 0.2));
  }

  async retryTrace(traceId: string): Promise<boolean> {
    const trace = this.traces.find(t => t.traceId === traceId && t.status === 'failed');
    if (!trace) return false;
    trace.status = 'running';
    trace.steps = [];
    trace.endTime = undefined;
    trace.totalLatency = 0;
    this.activeTraces.set(traceId, trace);
    this.persist();
    this.deps.eventBus.emit(EVENTS.REQUEST_INCOMING, { requestId: traceId, messages: [{ role: 'user', content: trace.input }] });
    return true;
  }
}
