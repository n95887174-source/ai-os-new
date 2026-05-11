import { eventBus, EVENTS } from '../core/events';
import { dexieDb } from '../core/DatabaseService';
import type { ISNode } from '../core/IntelligenceDSL';
import type { NodeContext, CognitiveTrace, CognitiveDecision, CognitiveStep } from '../types/domain';
import type { ChatMessage } from './providers/types';
import { routerService } from './RouterService';
import { keyService } from './KeyService';
import { roleService } from './RoleService';
import { adapterRegistry } from './providers/AdapterRegistry';
import { estimateTokens } from '../utils/tokenEstimate';

export type { CognitiveTrace, CognitiveDecision, CognitiveStep };

export type DecisionAlternative = {
  id: string;
  label: string;
  score: number;
  reasoning: string;
  constraints_impact?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

class CognitiveEngine {
  // ── Trace Store (existing) ──────────────────────────────────────────────────
  private traces: CognitiveTrace[] = [];
  private activeTraces = new Map<string, CognitiveTrace>();
  private unsubs: Array<() => void> = [];

  constructor() {
    this.load();
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private async load() {
    try {
      const count = await dexieDb.cognitiveTraces.count();
      if (count > 0) {
        this.traces = await dexieDb.cognitiveTraces.orderBy('startTime').reverse().limit(50).toArray();
      }
    } catch (e) {
      console.error('[CognitiveService] Failed to load traces', e);
    }
  }

  private async persist() {
    try {
      await dexieDb.cognitiveTraces.bulkPut(this.traces);
    } catch (e) {
      console.error('[CognitiveService] Failed to persist traces', e);
    }
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on(EVENTS.SEND_MESSAGE, (req) => {
        const messages = req.messages;
        const lastMsg = messages?.[messages.length - 1];
        this.startTrace(req.requestId || crypto.randomUUID(), lastMsg?.content || '');
      }),

      eventBus.on('cognitive:step:active', (data) => {
        const trace = this.activeTraces.get(data.traceId || 'internal-trace');
        if (trace) {
          const step: CognitiveStep = {
            id: data.nodeId,
            type: 'reasoning',
            label: `Processing ${data.nodeId}`,
            status: 'active',
            timestamp: Date.now()
          };
          trace.steps.push(step);
          this.persist().catch(console.error);
          eventBus.emit('trace:updated', this.getTraces());
        }
      }),

      eventBus.on('cognitive:step:completed', (data) => {
        const trace = this.activeTraces.get(data.traceId || 'internal-trace');
        if (trace) {
          const step = trace.steps.find(s => s.id === data.nodeId);
          if (step) {
            step.status = data.status || 'done';
            step.duration = data.duration;
            step.observations = data.output;
          } else {
            trace.steps.push({
              id: data.nodeId,
              type: 'reasoning',
              label: `Completed ${data.nodeId}`,
              status: data.status || 'done',
              timestamp: Date.now(),
              duration: data.duration,
              observations: data.output
            });
          }
          this.persist().catch(console.error);
          eventBus.emit('trace:updated', this.getTraces());
        }
      }),

      eventBus.on('request:completed', (data) => {
        const finalData = data.final_data;
        const traceId = finalData?.traceId || 'internal-trace';
        const trace = this.activeTraces.get(traceId);
        if (trace) {
          trace.status = 'completed';
          trace.output = finalData?.output;
          trace.endTime = Date.now();
          trace.totalLatency = trace.endTime - trace.startTime;
          this.activeTraces.delete(traceId);
          this.persist().catch(console.error);
          eventBus.emit('trace:updated', this.getTraces());
        }
      }),

      eventBus.on('cognitive:decision:made', (decision: CognitiveDecision) => {
        const traceId = `decision-${decision.selectedId}`;
        const trace = this.activeTraces.get(traceId);
        if (trace) {
          const step: CognitiveStep = {
            id: `decision-${decision.selectedId}`,
            type: 'reasoning',
            label: `Decision: ${decision.alternatives.find(a => a.id === decision.selectedId)?.label || decision.selectedId}`,
            status: 'done',
            timestamp: Date.now(),
            decision
          };
          trace.steps.push(step);
          this.persist().catch(console.error);
          eventBus.emit('trace:updated', this.getTraces());
        }
      })
    );
  }

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
      semanticConfidence: 1
    };
    this.activeTraces.set(traceId, newTrace);
    this.traces = [newTrace, ...this.traces].slice(0, 50);
    this.persist().catch(console.error);
    eventBus.emit('trace:updated', this.getTraces());
  }

  getTraces(): CognitiveTrace[] {
    return this.traces;
  }

  addTrace(trace: CognitiveTrace) {
    this.traces = [trace, ...this.traces].slice(0, 50);
    this.persist().catch(console.error);
    eventBus.emit('trace:updated', this.traces);
  }

  // ── Cognitive Execution Engine ─────────────────────────────────────────────

  async executeAgentNode(node: ISNode, data: NodeContext): Promise<string> {
    const input = this.buildPrompt(node, data);

    const alternatives = this.evaluateAlternatives(node, data, input);
    if (alternatives.length === 0) throw new Error('No viable execution alternatives');

    const decision = this.makeDecision(alternatives, input, node);
    eventBus.emit('cognitive:decision:made', decision);

    return this.executeWithFallback(decision, node, data);
  }

  private buildPrompt(node: ISNode, data: NodeContext): string {
    const promptText = data.output || '';
    const systemPrompt = node.config.prompt || node.config.systemPrompt || '';

    let blackboardContext = '';
    if (Object.keys(data.blackboard || {}).length > 0) {
      blackboardContext = `\nShared state (Blackboard):\n${JSON.stringify(data.blackboard, null, 2)}`;
    }

    const equippedTools = node.config.tools || [];
    let toolContext = '';
    if (equippedTools.length > 0) {
      toolContext = `\nYou have access to: ${equippedTools.join(', ')}.`;
    }

    return `${systemPrompt}${blackboardContext}${toolContext}\n\nContext:\n${promptText}`;
  }

  private evaluateAlternatives(node: ISNode, _data: NodeContext, input: string): DecisionAlternative[] {
    const alternatives: DecisionAlternative[] = [];

    if (node.config.model && node.config.model !== 'auto') {
      const [provider, model] = node.config.model.split(':');
      const key = keyService.getKeys().find(k => k.provider.toLowerCase() === provider.toLowerCase());
      if (key) {
        alternatives.push({
          id: `configured-${key.id}`,
          label: `${key.provider}:${model}`,
          score: 0.9,
          reasoning: 'Pre-configured model in node config',
          metadata: { key, model, source: 'config' }
        });
      }
    }

    const rankedKeys = routerService.getRankedProviders('performance', input).slice(0, 3);
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
        ((key.stats.successCount / Math.max(1, key.stats.successCount + key.stats.errorCount))) * 0.3
      )) : 0.5;

      alternatives.push({
        id: `ranked-${key.id}`,
        label: `${key.provider}:${model}`,
        score: Math.round(score * 100) / 100,
        reasoning: key.stats
          ? `Latency ${key.stats.avgLatency}ms, reputation ${key.stats.extended?.reputationScore || 100}%`
          : 'No usage stats available',
        constraints_impact: { cost: 0.5, latency: 1 - score },
        metadata: { key, model, source: 'router' }
      });
    }

    return alternatives;
  }

  private makeDecision(alternatives: DecisionAlternative[], input: string, node: ISNode): CognitiveDecision {
    const sorted = [...alternatives].sort((a, b) => b.score - a.score);
    const selected = sorted[0];

    return {
      input,
      constraints: [`cost < ${node.config.maxCost || 10}`, `latency < ${node.config.maxLatency || 10000}`],
      alternatives: sorted,
      selectedId: selected.id,
      confidence: selected.score,
      logic: `Selected ${selected.label} (score: ${selected.score}) — ${selected.reasoning}`,
      cost: ((selected.metadata as { key?: { stats?: { extended?: { estimatedCost?: number } } } } | undefined)?.key?.stats?.extended?.estimatedCost),
      causal_chain: sorted.map(a => `${a.label} (${a.score}): ${a.reasoning}`)
    };
  }

  private async executeWithFallback(decision: CognitiveDecision, node: ISNode, data: NodeContext): Promise<string> {
    const errors: string[] = [];

    for (const alt of decision.alternatives) {
      const meta = alt.metadata as { key?: { id: string; provider: string; key: string }; model?: string } | undefined;
      if (!meta?.key) continue;

      const adapter = adapterRegistry.getAdapter(meta.key.provider);
      if (!adapter) {
        errors.push(`${alt.label}: adapter not found`);
        continue;
      }

      try {
        const startTime = Date.now();
        const input = this.buildPrompt(node, data);
        const messages: ChatMessage[] = [{ role: 'user', content: input }];

        let fullContent = '';
        let ttft = 0;

        if (adapter.streamMessage) {
          await adapter.streamMessage(messages, meta.model!, meta.key.key!, (chunk) => {
            if (!fullContent) ttft = Date.now() - startTime;
            fullContent += chunk;
          });
        } else {
          const res = await adapter.sendMessage(messages, meta.model!, meta.key.key!);
          fullContent = res.content;
        }

        const latency = Date.now() - startTime;
        const tokens = estimateTokens(fullContent);
        const tps = tokens / (latency / 1000);

        this.recordUsage(meta.key.id, latency, tokens, meta.model!, { ttft, tps, fullContent, task: node.label });
        this.updateTraceConfidence(data.traceId, this.calculateConfidence(fullContent, decision));

        const roleId = node.config?.roleId as string | undefined;
        if (roleId) {
          roleService.recordRoleUsage(roleId, true, latency);
        }

        return fullContent;
      } catch (e: unknown) {
        errors.push(`${alt.label}: ${e instanceof Error ? e.message : String(e)}`);
        keyService.updateKeyStatus(meta.key.id, 'error');
      }
    }

    throw new Error(`All alternatives failed: ${errors.join('; ')}`);
  }

  private recordUsage(keyId: string, latency: number, tokens: number, model: string, extra: Record<string, unknown>) {
    keyService.recordUsage(keyId, latency, tokens, model, extra);
  }

  private updateTraceConfidence(traceId: string, confidence: number) {
    const trace = this.activeTraces.get(traceId || 'internal-trace');
    if (trace) {
      trace.semanticConfidence = confidence;
    }
  }

  private calculateConfidence(output: string, decision: CognitiveDecision): number {
    const minLength = 10;
    if (!output || output.length < minLength) return 0.1;

    const hasContent = output.length > 50 ? 0.3 : 0.1;
    const hasStructure = /[.!?]/.test(output) ? 0.2 : 0;
    const hasReasoning = /\b(because|therefore|conclusion|thus|hence)\b/i.test(output) ? 0.3 : 0;
    const decisionConfidence = decision.confidence * 0.2;

    return Math.min(1, Math.max(0.1, hasContent + hasStructure + hasReasoning + decisionConfidence));
  }
}

export const cognitiveService = new CognitiveEngine();
