import { eventBus } from '../core/events';
import type { ISTopology, ISNode } from '../core/IntelligenceDSL';
import type { NodeContext } from '../types/domain';
import { toolService } from './ToolService';
import { routerService } from './RouterService';
import { keyService } from './KeyService';
import { adapterRegistry } from './providers/AdapterRegistry';

/**
 * SuperAgents OS - Orchestration Service
 * 
 * The "Engine" that mounts an Intelligence DSL and manages 
 * the event-driven execution flow across the cognitive topology.
 */
class OrchestrationService {
  private activeTopology: ISTopology | null = null;
  private executionContexts: Map<string, NodeContext> = new Map();
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
    eventBus.on('request:incoming', async (request: any) => {
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
  async execute(request: any, mode: 'production' | 'simulation' = 'production') {
    if (!this.activeTopology) return;

    const startNode = this.activeTopology.nodes.find(n => n.type === 'router' || n.id === 'entry');
    if (!startNode) return;

    const traceId = request.requestId || `trace-${crypto.randomUUID().slice(0, 8)}`;

    if (mode === 'simulation') {
      console.log(`[Simulator] Running shadow execution for topology: ${this.activeTopology.name}`);
    }

    console.log(`[Orchestrator] Starting ${mode} execution chain at node: ${startNode.label}`);
    await this.processNode(startNode, { ...request, traceId, blackboard: {} }, mode);
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
    } catch (e) {
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
        eventBus.emit('request:completed', { final_data: nextData });
      }
    }
  }

  private async executeAgentNode(node: ISNode, data: NodeContext): Promise<string> {
    const promptText = typeof data === 'string' ? data : data.output || JSON.stringify(data);
    const systemPrompt = node.config.prompt || node.config.systemPrompt || '';
    
    // 1. Resolve Shared State (Blackboard)
    let blackboardContext = '';
    if (Object.keys(data.blackboard || {}).length > 0) {
      blackboardContext = `\nShared state (Blackboard):\n${JSON.stringify(data.blackboard, null, 2)}`;
    }

    // 2. Resolve Tools context
    const equippedTools = node.config.tools || [];
    let toolContext = '';
    if (equippedTools.length > 0) {
      toolContext = `\nYou have access to the following tools: ${equippedTools.join(', ')}. To use a tool, specify it in your reasoning.`;
    }

    const input = `${systemPrompt}${blackboardContext}${toolContext}\n\nContext:\n${promptText}`;
    
    // 2. Resolve Model
    let best: any;
    let modelId: string = 'auto';

    if (node.config.model && node.config.model !== 'auto') {
      const [provider, model] = node.config.model.split(':');
      const key = keyService.getKeys().find(k => k.provider.toLowerCase() === provider.toLowerCase());
      if (key) {
        best = key;
        modelId = model;
      }
    }

    if (!best) {
      const ranked = routerService.getRankedProviders('performance', input);
      best = ranked[0];
      modelId = best?.availableModels?.[0] || 'auto';
    }
    
    if (!best) throw new Error("No providers available for agent node");

    const adapter = adapterRegistry.getAdapter(best.provider);
    if (!adapter) throw new Error(`Adapter for ${best.provider} not found`);

    const messages: ChatMessage[] = [{ role: 'user', content: input }];

    // 3. Execution (with Tool Call interception if needed, but for now simple)
    const startTime = Date.now();
    let fullContent = '';
    let ttft = 0;

    try {
      if (adapter.streamMessage) {
        await adapter.streamMessage(messages, modelId, best.key, (chunk) => {
          if (!fullContent) ttft = Date.now() - startTime;
          fullContent += chunk;
        });
      } else {
        const res = await adapter.sendMessage(messages, modelId, best.key);
        fullContent = res.content;
      }

      const latency = Date.now() - startTime;
      const tokens = fullContent.length / 4; // Mock token count
      const tps = tokens / (latency / 1000);

      import('./KeyService').then(({ keyService }) => {
        keyService.recordUsage(best.id, latency, tokens, modelId, { 
          ttft, 
          tps, 
          fullContent,
          task: node.label
        });
      });

      return fullContent;
    } catch (e: any) {
      import('./KeyService').then(({ keyService }) => {
        keyService.updateKeyStatus(best.id, 'error');
      });
      throw e;
    }
  }

  private async executeRouterNode(node: ISNode, data: any): Promise<string> {
    // Basic router logic: just pass the input through for now
    // In a real router node, we might use an LLM to decide which path to take
    return typeof data === 'string' ? data : data.output || JSON.stringify(data);
  }

  private async executeGuardrailNode(node: ISNode, data: any): Promise<{ approved: boolean; filteredOutput?: string; error?: string }> {
    const contentToCheck = data.output || '';
    
    // Simple mock guardrail logic
    const blockedKeywords = node.config.blockedKeywords || ['error', 'danger', 'private'];
    const found = blockedKeywords.find((word: string) => contentToCheck.toLowerCase().includes(word.toLowerCase()));
    
    if (found) {
      return { approved: false, error: `Guardrail violation: found blocked word "${found}"` };
    }
    
    return { approved: true, filteredOutput: contentToCheck };
  }

  private async executeToolNode(node: ISNode, data: any): Promise<string> {
    const toolId = node.config.toolId;
    if (!toolId) return `Error: No toolId configured for node ${node.label}`;
    
    try {
      const input = data.output || data;
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
