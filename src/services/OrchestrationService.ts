import { eventBus } from '../core/events';
import type { ISTopology, ISNode } from '../core/IntelligenceDSL';
import type { NodeContext } from '../types/domain';
import { toolService } from './ToolService';
import { cognitiveService } from './CognitiveService';

/**
 * SuperAgents OS - Orchestration Service
 * 
 * The "Engine" that mounts an Intelligence DSL and manages 
 * the event-driven execution flow across the cognitive topology.
 */
class OrchestrationService {
  private activeTopology: ISTopology | null = null;
  private disabledNodes: Set<string> = new Set();

  setNodeDisabled(nodeId: string, disabled: boolean) {
    if (disabled) {
      this.disabledNodes.add(nodeId);
    } else {
      this.disabledNodes.delete(nodeId);
    }
  }

  isNodeDisabled(nodeId: string) {
    return this.disabledNodes.has(nodeId);
  }

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    eventBus.on('request:incoming', async (request) => {
      if (this.activeTopology) {
        await this.execute(request);
      }
    });
  }

  /**
   * Mounts a new topology into the active runtime.
   */
  mount(topology: ISTopology) {
    this.activeTopology = topology;
    console.log(`[Orchestrator] Mounted topology: ${topology.name} (v${topology.version})`);
    eventBus.emit('system:topology:mounted', topology);
  }

  getActiveTopology() {
    return this.activeTopology;
  }

  /**
   * Orchestrates the execution of a request through the mounted graph.
   */
  async execute(request: { requestId?: string; messages?: import('../services/providers/types').ChatMessage[]; output?: string; blackboard?: Record<string, unknown>; traceId?: string }, mode: 'production' | 'simulation' = 'production') {
    if (!this.activeTopology) return;

    const startNode = this.activeTopology.nodes.find(n => n.type === 'router' || n.id === 'entry');
    if (!startNode) return;

    const traceId = request.requestId || `trace-${crypto.randomUUID().slice(0, 8)}`;

    if (mode === 'simulation') {
      console.log(`[Simulator] Running shadow execution for topology: ${this.activeTopology.name}`);
    }

    console.log(`[Orchestrator] Starting ${mode} execution chain at node: ${startNode.label}`);
    await this.processNode(startNode, { ...request, traceId, blackboard: {}, history: [] }, mode);
  }

  private async executeNodeLogic(node: ISNode, data: NodeContext, mode: 'production' | 'simulation'): Promise<string> {
    if (mode === 'simulation') {
      return `Simulated output for ${node.label}`;
    }

    console.log(`[Orchestrator] [${data.traceId}] Executing node: ${node.label} (${node.type})`);

    switch (node.type) {
      case 'agent':
        return await this.executeAgentNode(node, data);
      case 'router':
        return await this.executeRouterNode(node, data);
      case 'guardrail': {
        const { approved, filteredOutput, error } = await this.executeGuardrailNode(node, data);
        if (!approved) throw new Error(error || 'Blocked by guardrail');
        return filteredOutput || data.output || '';
      }
      case 'tool':
        return await this.executeToolNode(node, data);
      default:
        return `Node type ${node.type} not implemented`;
    }
  }

  private async processNode(node: ISNode, data: NodeContext, mode: 'production' | 'simulation' = 'production') {
    if (this.disabledNodes.has(node.id)) {
      return;
    }

    if (mode === 'production') {
      eventBus.emit('cognitive:step:active', { nodeId: node.id, traceId: data.traceId });
    }

    let status: 'done' | 'error' = 'done';
    let output: string;
    const startTime = Date.now();

    try {
      output = await this.executeNodeLogic(node, data, mode);
    } catch (e: unknown) {
      output = `Error in node ${node.label}: ${e instanceof Error ? e.message : String(e)}`;
      status = 'error';
    }

    const duration = Date.now() - startTime;

    // Check for blackboard updates in output (if it's JSON)
    let updatedBlackboard = { ...data.blackboard };
    try {
      if (output.trim().startsWith('{')) {
        const parsed = JSON.parse(output);
        if (parsed._blackboard) {
          updatedBlackboard = { ...updatedBlackboard, ...parsed._blackboard };
          console.log(`[Orchestrator] Blackboard updated by node ${node.label}`);
        }
      }
    } catch {
      // Not JSON or no blackboard update, ignore
    }

    if (mode === 'production') {
      eventBus.emit('cognitive:step:completed', {
        nodeId: node.id,
        traceId: data.traceId,
        status,
        duration,
        output
      });
    }

    // Pass data forward with accumulated context
    const nextData: NodeContext = {
      ...data,
      output,
      blackboard: updatedBlackboard,
      history: [...(data.history || []), { node: node.label, output, status }]
    };

    // Find next edges based on status
    const nextEdges = this.activeTopology?.edges.filter(e => {
      if (e.from !== node.id) return false;
      if (status === 'error' && e.trigger === 'on_error') return true;
      if (status === 'done' && (e.trigger === 'on_success' || e.trigger === 'data_flow' || !e.trigger)) return true;
      return false;
    });
    
    if (nextEdges && nextEdges.length > 0) {
      for (const edge of nextEdges) {
        const nextNode = this.activeTopology?.nodes.find(n => n.id === edge.to);
        if (nextNode) {
          await this.processNode(nextNode, nextData, mode);
        }
      }
    } else {
      if (mode === 'production') {
        eventBus.emit('request:completed', { final_data: { ...nextData, output: nextData.output || '' } });
      }
    }
  }

  private async executeAgentNode(node: ISNode, data: NodeContext): Promise<string> {
    return cognitiveService.executeAgentNode(node, data);
  }

  private async executeRouterNode(_node: ISNode, data: NodeContext | string): Promise<string> {
    // Basic router logic: just pass the input through for now
    // In a real router node, we might use an LLM to decide which path to take
    return typeof data === 'string' ? data : data.output || JSON.stringify(data);
  }

  private async executeGuardrailNode(node: ISNode, data: NodeContext): Promise<{ approved: boolean; filteredOutput?: string; error?: string }> {
    const contentToCheck = data.output || '';
    
    // Simple mock guardrail logic
    const blockedKeywords = (node.config.blockedKeywords as string[] | undefined) || ['error', 'danger', 'private'];
    const found = blockedKeywords.find((word: string) => contentToCheck.toLowerCase().includes(word.toLowerCase()));
    
    if (found) {
      return { approved: false, error: `Guardrail violation: found blocked word "${found}"` };
    }
    
    return { approved: true, filteredOutput: contentToCheck };
  }

  private async executeToolNode(node: ISNode, data: NodeContext): Promise<string> {
    const toolId = node.config.toolId as string | undefined;
    if (!toolId) return `Error: No toolId configured for node ${node.label}`;
    
    try {
        const input = (data.output || JSON.stringify(data)) as string;
      const result = await toolService.execute(toolId, input);
      
      if (result.status === 'success') {
        return typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2);
      } else {
        return `Tool Error: ${result.error}`;
      }
    } catch (e: unknown) {
      return `Execution Failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
}

export const orchestrator = new OrchestrationService();
