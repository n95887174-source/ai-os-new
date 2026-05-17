import type { ISTopology, ISNode } from '../../core/IntelligenceDSL';
import type { NodeContext } from '../../types/domain';
import type { ChatMessage } from '../../llm/core/types';

interface ExecutionStats {
  totalExecutions: number;
  completedNodes: number;
  failedNodes: number;
  avgNodeDuration: number;
  nodeStats: Record<string, { count: number; errors: number; totalDuration: number }>;
}

export interface OrchestrationServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  toolService: {
    execute: (toolId: string, input: unknown) => Promise<{ status: string; data?: unknown; error?: string }>;
  };
  cognitiveService: {
    executeAgentNode: (node: ISNode, data: NodeContext) => Promise<string>;
  };
  policyService: {
    enforcePrivacy: (data: { nodeId: string; output?: string }) => { blocked: boolean; sanitized?: string };
    sanitizeOutput: (nodeId: string, output: string) => string;
  };
}

export class OrchestrationService {
  private deps: OrchestrationServiceDeps;
  private activeTopology: ISTopology | null = null;
  private disabledNodes: Set<string> = new Set();
  private unsubs: Array<() => void> = [];
  private executionStats: ExecutionStats = {
    totalExecutions: 0, completedNodes: 0, failedNodes: 0, avgNodeDuration: 0, nodeStats: {},
  };

  constructor(deps: OrchestrationServiceDeps) {
    this.deps = deps;
  }

  async init() {
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  setNodeDisabled(nodeId: string, disabled: boolean) {
    if (disabled) this.disabledNodes.add(nodeId);
    else this.disabledNodes.delete(nodeId);
  }

  isNodeDisabled(nodeId: string) { return this.disabledNodes.has(nodeId); }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on('request:incoming', async (request) => {
        if (this.activeTopology) {
          await this.execute(request as { requestId?: string; messages?: ChatMessage[] });
        }
      })
    );
  }

  mount(topology: ISTopology) {
    this.activeTopology = topology;
    console.log(`[Orchestrator] Mounted topology: ${topology.name} (v${topology.version})`, new Error().stack?.split('\n').slice(2, 5).join(' | '));
    this.deps.eventBus.emit('system:topology:mounted', topology);
  }

  getActiveTopology() { return this.activeTopology; }

  getExecutionStats(): ExecutionStats { return { ...this.executionStats }; }

  validateTopology(topology: ISTopology): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!topology.nodes || topology.nodes.length === 0) errors.push('Topology has no nodes');
    if (!topology.edges) errors.push('Topology has no edges');
    const entryNodes = topology.nodes.filter(n => n.type === 'router' || n.id === 'entry');
    if (entryNodes.length === 0) errors.push('No entry node found (router or id="entry")');
    for (const edge of topology.edges || []) {
      if (!topology.nodes.some(n => n.id === edge.from)) errors.push(`Edge from "${edge.from}" references non-existent node`);
      if (!topology.nodes.some(n => n.id === edge.to)) errors.push(`Edge to "${edge.to}" references non-existent node`);
    }
    return { valid: errors.length === 0, errors };
  }

  async execute(request: { requestId?: string; messages?: ChatMessage[]; output?: string; blackboard?: Record<string, unknown>; traceId?: string }, mode: 'production' | 'simulation' = 'production') {
    if (!this.activeTopology) return;
    const startNode = this.activeTopology.nodes.find(n => n.type === 'router' || n.id === 'entry');
    if (!startNode) return;

    const traceId = request.requestId || `trace-${crypto.randomUUID().slice(0, 8)}`;
    this.executionStats.totalExecutions++;

    console.log(`[Orchestrator] Starting ${mode} execution chain at node: ${startNode.label}`);
    await this.processNode(startNode, {
      ...request,
      traceId,
      blackboard: {},
      history: [],
      output: request.output || '',
    } as NodeContext, mode);
  }

  private async executeNodeLogic(node: ISNode, data: NodeContext, mode: 'production' | 'simulation'): Promise<string> {
    console.log(`[Orchestrator] [${data.traceId}] Executing node: ${node.label} (${node.type})${mode === 'simulation' ? ' [SIM]' : ''}`);

    switch (node.type) {
      case 'agent':
        return mode === 'simulation'
          ? await this.deps.cognitiveService.executeAgentNode(node, { ...data, output: `[SIM] ${data.output || ''}` })
          : await this.deps.cognitiveService.executeAgentNode(node, data);
      case 'router':
        return await this.executeRouterNode(node, data);
      case 'guardrail': {
        const { approved, filteredOutput, error } = await this.executeGuardrailNode(node, data);
        if (!approved) {
          this.deps.eventBus.emit('system:notification', { message: `Guardrail violation: ${error}`, type: 'warning' });
          throw new Error(error || 'Blocked by guardrail');
        }
        return filteredOutput || data.output || '';
      }
      case 'tool':
        return mode === 'simulation'
          ? `[SIM] Tool ${node.config.toolId || 'unknown'} executed`
          : await this.executeToolNode(node, data);
      default:
        console.warn(`[Orchestrator] Unknown node type: ${node.type} (${node.label})`);
        return data.output || `[Unhandled node: ${node.label}]`;
    }
  }

  private async processNode(node: ISNode, data: NodeContext, mode: 'production' | 'simulation' = 'production', visited = new Set<string>()) {
    if (this.disabledNodes.has(node.id)) return;

    if (visited.has(node.id)) {
      console.warn(`[Orchestrator] Cycle detected at node: ${node.label} (${node.id}), skipping`);
      this.deps.eventBus.emit('system:notification', { message: `Cycle detected at node: ${node.label} — execution stopped`, type: 'warning' });
      return;
    }
    visited.add(node.id);

    this.deps.eventBus.emit('cognitive:step_active', { nodeId: node.id, traceId: data.traceId });

    let status: 'done' | 'error' = 'done';
    let output: string;
    const startTime = Date.now();

    try {
      output = await this.executeNodeLogic(node, data, mode);
    } catch (e: unknown) {
      output = `Error in node ${node.label}: ${e instanceof Error ? e.message : String(e)}`;
      status = 'error';
      this.executionStats.failedNodes++;
    }

    const privacyResult = this.deps.policyService.enforcePrivacy({ nodeId: node.id, output });
    if (privacyResult.blocked && privacyResult.sanitized) {
      output = privacyResult.sanitized;
    } else {
      output = this.deps.policyService.sanitizeOutput(node.id, output);
    }

    const duration = Date.now() - startTime;
    this.executionStats.completedNodes++;
    if (!this.executionStats.nodeStats[node.id]) {
      this.executionStats.nodeStats[node.id] = { count: 0, errors: 0, totalDuration: 0 };
    }
    this.executionStats.nodeStats[node.id].count++;
    if (status === 'error') this.executionStats.nodeStats[node.id].errors++;
    this.executionStats.nodeStats[node.id].totalDuration += duration;
    this.executionStats.avgNodeDuration = this.executionStats.completedNodes > 0
      ? Object.values(this.executionStats.nodeStats).reduce((s, n) => s + n.totalDuration, 0) / this.executionStats.completedNodes
      : 0;

    let updatedBlackboard = { ...data.blackboard };
    try {
      if (output.trim().startsWith('{')) {
        const parsed = JSON.parse(output);
        if (parsed._blackboard) {
          updatedBlackboard = { ...updatedBlackboard, ...parsed._blackboard };
        }
      }
    } catch (e) { console.warn('[Orchestrator] Failed to parse node output as JSON for blackboard', e); }

    this.deps.eventBus.emit('cognitive:step_completed', {
      nodeId: node.id, traceId: data.traceId, status, duration, output,
    });

    const nextData: NodeContext = {
      ...data,
      output,
      blackboard: updatedBlackboard,
      history: [...data.history, { node: node.label, output, status }],
    };

    const nextEdges = this.activeTopology?.edges.filter(e => {
      if (e.from !== node.id) return false;
      if (status === 'error' && e.trigger === 'on_error') return true;
      if (status === 'done' && (e.trigger === 'on_success' || e.trigger === 'data_flow' || !e.trigger)) return true;
      return false;
    });

    if (nextEdges && nextEdges.length > 0) {
      for (const edge of nextEdges) {
        const nextNode = this.activeTopology?.nodes.find(n => n.id === edge.to);
        if (nextNode) await this.processNode(nextNode, nextData, mode, visited);
      }
    } else {
      this.deps.eventBus.emit('request:completed', { final_data: { ...nextData, output: nextData.output || '' } });
    }
  }

  private async executeRouterNode(node: ISNode, data: NodeContext): Promise<string> {
    const input = data.output || '';
    const outgoingEdges = this.activeTopology?.edges.filter(e => e.from === node.id && e.trigger !== 'on_error') || [];
    const destinations = outgoingEdges
      .map(e => this.activeTopology?.nodes.find(n => n.id === e.to))
      .filter((n): n is ISNode => !!n);

    if (destinations.length === 0) return input;
    if (destinations.length === 1) return JSON.stringify({ traceId: data.traceId, output: input });

    const routeModel = node.config.routingModel as string | undefined;
    if (routeModel) {
      try {
        const routingPrompt = `Analyze the following input and choose the most appropriate destination node from:\n${destinations.map((d, i) => `${i}: ${d.label} (${d.type}) - ${(d.config.description as string) || 'No description'}`).join('\n')}\n\nInput:\n${input.substring(0, 2000)}\n\nRespond with ONLY the index number of the best destination.`;
        const decision = await this.deps.cognitiveService.executeAgentNode(
          { ...node, config: { ...node.config, model: routeModel, prompt: routingPrompt } },
          data,
        );
        const idx = parseInt(decision.trim(), 10);
        if (!isNaN(idx) && idx >= 0 && idx < destinations.length) {
          return JSON.stringify({ traceId: data.traceId, output: `${input}\n[Routed to: ${destinations[idx].label}]` });
        }
      } catch (e) {
        console.warn('[Orchestrator] LLM route parsing failed:', e);
      }
    }

    const typePriority: Record<string, number> = { guardrail: 0, tool: 1, agent: 2, router: 3 };
    const sorted = [...destinations].sort((a, b) => (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99));
    return JSON.stringify({ traceId: data.traceId, output: `${input}\n[Routed to: ${sorted[0].label}]` });
  }

  private isReDosPattern(pattern: string): boolean {
    if (pattern.length > 200) return true;
    if (/\([^)]+\)\s*[+*]/.test(pattern)) return true;
    if (/\([^)]*[+*][^)]*\)\s*[+*]/.test(pattern)) return true;
    if (/(?:^|[^\\])(?:\.\*|\.[+*]|[^*+]\*|[^*+]+)\s*[*+]\s*[*+]/.test(pattern)) return true;
    if (/(\([^)]+\)\s*\+\s*)+\([^)]+\)\s*\+/.test(pattern)) return true;
    return false;
  }

  private async executeGuardrailNode(node: ISNode, data: NodeContext): Promise<{ approved: boolean; filteredOutput?: string; error?: string }> {
    const contentToCheck = data.output || '';
    const maxLength = node.config.maxLength as number | undefined;
    if (maxLength && contentToCheck.length > maxLength) {
      return { approved: false, filteredOutput: contentToCheck.substring(0, maxLength), error: `Exceeds max length (${contentToCheck.length} > ${maxLength})` };
    }
    const blockedKeywords = (node.config.blockedKeywords as string[] | undefined) || [];
    if (blockedKeywords.length > 0) {
      const found = blockedKeywords.find(w => contentToCheck.toLowerCase().includes(w.toLowerCase()));
      if (found) return { approved: false, error: `Blocked word: "${found}"` };
    }
    const blockedPatterns = node.config.blockedPatterns as string[] | undefined;
    if (blockedPatterns) {
      for (const pattern of blockedPatterns) {
        try {
          if (this.isReDosPattern(pattern)) {
            console.warn(`[Orchestrator] Rejected potentially dangerous regex pattern: "${pattern.slice(0, 50)}..."`);
            continue;
          }
          if (new RegExp(pattern, 'i').test(contentToCheck)) return { approved: false, error: `Matched pattern "${pattern}"` };
        } catch {
          console.warn(`[Orchestrator] Invalid regex pattern: "${pattern.slice(0, 50)}..."`);
        }
      }
    }
    return { approved: true, filteredOutput: contentToCheck };
  }

  private async executeToolNode(node: ISNode, data: NodeContext): Promise<string> {
    const toolId = node.config.toolId as string | undefined;
    if (!toolId) return `Error: No toolId configured for node ${node.label}`;
    try {
      const input = (data.output || JSON.stringify(data)) as string;
      const result = await this.deps.toolService.execute(toolId, input);
      return result.status === 'success'
        ? (typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2))
        : `Tool Error: ${result.error}`;
    } catch (e: unknown) {
      return `Execution Failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  resetStats() {
    this.executionStats = { totalExecutions: 0, completedNodes: 0, failedNodes: 0, avgNodeDuration: 0, nodeStats: {} };
  }
}
