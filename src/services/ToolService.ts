import { eventBus } from '../core/events';
import { memoryService } from './MemoryService';
import { sandboxService } from './SandboxService';
import { pluginRegistry } from '../core/PluginSDK';
import { mcpService } from './MCPService';

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  type: 'script' | 'api' | 'database';
  language?: 'python' | 'javascript' | 'sql';
  code?: string;
  config?: any;
  enabled?: boolean;
}

/**
 * SuperAgents OS - Tool Execution Service
 */
class ToolService {
  private tools: ToolDefinition[] = [
    {
      id: 't-search', 
      name: 'Memory Search', 
      type: 'api', 
      description: 'Performs semantic search across the long-term memory mesh.',
      enabled: true
    },
    {
      id: 't-code', 
      name: 'JS Executor', 
      type: 'script', 
      language: 'javascript',
      description: 'Safely executes JavaScript logic in a sandboxed-like environment.',
      enabled: true,
      code: 'return `Executed JS logic at ${new Date().toISOString()}`'
    },
    {
      id: 't-web', 
      name: 'Web Scraper', 
      type: 'api', 
      description: 'Fetches content from any URL for analysis.',
      enabled: true
    },
    {
      id: 't-mcp', 
      name: 'MCP Connector', 
      type: 'api', 
      description: 'Fetches context from Model Context Protocol servers.',
      enabled: true
    }
  ];

  constructor() {
    this.load();
  }

  private load() {
    const stored = localStorage.getItem('super_agents_tools');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge with defaults
        this.tools = this.tools.map(defaultTool => {
          const saved = parsed.find((p: any) => p.id === defaultTool.id);
          return saved ? { ...defaultTool, ...saved } : defaultTool;
        });
      } catch (e) {
        console.error('Failed to load tools', e);
      }
    }
  }

  private persist() {
    localStorage.setItem('super_agents_tools', JSON.stringify(this.tools));
  }

  getTools() {
    return this.tools;
  }

  toggleTool(id: string) {
    this.tools = this.tools.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t);
    this.persist();
    eventBus.emit('tools:updated', this.tools);
  }

  async execute(toolId: string, input: any): Promise<any> {
    // 1. Check built-in tools
    const tool = this.tools.find(t => t.id === toolId);
    
    // 2. Check plugin tools
    const pluginTool = pluginRegistry.getTool(toolId);

    if (!tool && !pluginTool) throw new Error(`Tool ${toolId} not found`);
    
    if (tool && tool.enabled === false) throw new Error(`Tool ${tool.name} is currently disabled`);

    eventBus.emit('tool:execution:start', { toolId, input });
    console.log(`[ToolEngine] Executing ${tool?.name || pluginTool?.name}...`);

    let resultData: any;
    
    try {
      const activeTool = tool!;
      if (pluginTool) {
        // Plugin Context (mocked for now, but should be stable)
        const context: any = { logger: console, emit: eventBus.emit };
        resultData = await pluginTool.execute(input, context);
      } else if (toolId === 't-search') {
        const query = typeof input === 'string' ? input : input.query || '';
        resultData = await memoryService.search(query);
      } else if (toolId === 't-code') {
        const code = activeTool.code || 'return data';
        resultData = await sandboxService.execute(code, input);
      } else if (toolId === 't-web') {
        // Simulated web fetch for browser environment
        const url = typeof input === 'string' ? input : input.url || '';
        resultData = `Content fetched from ${url} (Simulated - CORS restricted in browser)`;
      } else if (toolId === 't-mcp') {
        const uri = typeof input === 'string' ? input : input.uri || '';
        resultData = await mcpService.readResource(uri);
      } else {
        resultData = `Output for ${activeTool.name}: Successful execution.`;
      }

      const result = {
        status: 'success',
        data: resultData,
        timestamp: Date.now()
      };

      eventBus.emit('tool:execution:success', { toolId, output: result });
      return result;
    } catch (e: any) {
      const errorResult = {
        status: 'error',
        error: e.message || String(e),
        timestamp: Date.now()
      };
      eventBus.emit('tool:execution:error', { toolId, error: e.message || String(e) });
      return errorResult;
    }
  }

  addTool(tool: ToolDefinition) {
    this.tools = [...this.tools, { ...tool, enabled: true }];
    this.persist();
    eventBus.emit('tools:updated', this.tools);
  }
}

export const toolService = new ToolService();
