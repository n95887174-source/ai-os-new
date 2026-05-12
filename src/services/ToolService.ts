import { eventBus } from '../core/events';
import { memoryService } from './MemoryService';
import { sandboxService } from './SandboxService';
import { pluginRegistry } from '../core/PluginSDK';
import { mcpService } from './MCPService';
import { db } from '../core/DatabaseService';

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  type: 'script' | 'api' | 'database';
  language?: 'python' | 'javascript' | 'sql';
  code?: string;
  config?: Record<string, unknown>;
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

  constructor() {}

  async init() {
    await this.load();
  }

  private async load() {
    try {
      const parsed = await db.getKv<ToolDefinition[]>('super_agents_tools');
      if (parsed) {
        this.tools = this.tools.map(defaultTool => {
          const saved = parsed.find(p => p.id === defaultTool.id);
          return saved ? { ...defaultTool, ...saved } : defaultTool;
        });
      }
    } catch (e) {
      console.error('Failed to load tools', e);
    }
  }

  private persist() {
    db.setKv('super_agents_tools', this.tools).catch(e => console.error(e));
  }

  getTools() {
    return this.tools;
  }

  toggleTool(id: string) {
    this.tools = this.tools.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t);
    this.persist();
    eventBus.emit('tools:updated', this.tools);
  }

  async execute(toolId: string, input: unknown): Promise<{ status: string; data?: unknown; error?: string; timestamp: number }> {
    // 1. Check built-in tools
    const tool = this.tools.find(t => t.id === toolId);
    
    // 2. Check plugin tools
    const pluginTool = pluginRegistry.getTool(toolId);

    if (!tool && !pluginTool) throw new Error(`Tool ${toolId} not found`);
    
    if (tool && tool.enabled === false) throw new Error(`Tool ${tool.name} is currently disabled`);

    eventBus.emit('tool:execution:start', { toolId, input });
    console.log(`[ToolEngine] Executing ${tool?.name || pluginTool?.name}...`);

    let resultData: unknown;
    
    try {
      const activeTool = tool!;
      if (pluginTool) {
        const context = pluginRegistry.getToolContext(toolId);
        if (!context) throw new Error(`Plugin context not found for tool ${toolId}`);
        resultData = await pluginTool.execute(input, context);
        
        // Validate plugin tool output
        if (typeof resultData === 'object' && resultData !== null) {
          try {
            const str = JSON.stringify(resultData);
            if (str.length > 5 * 1024 * 1024) throw new Error("Tool output exceeds 5MB limit");
          } catch {
            throw new Error('Invalid tool output', { cause: undefined });
          }
        }
      } else if (toolId === 't-search') {
        const query = typeof input === 'string' ? input : (input as Record<string, string>).query || '';
        resultData = await memoryService.search(query);
      } else if (toolId === 't-code') {
        const code = activeTool.code || 'return data';
        resultData = await sandboxService.execute(code, input);
      } else if (toolId === 't-web') {
        // Simulated web fetch for browser environment
        const url = typeof input === 'string' ? input : (input as Record<string, string>).url || '';
        resultData = `Content fetched from ${url} (Simulated - CORS restricted in browser)`;
      } else if (toolId === 't-mcp') {
        const uri = typeof input === 'string' ? input : (input as Record<string, string>).uri || '';
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
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const errorResult = {
        status: 'error',
        error: errorMessage,
        timestamp: Date.now()
      };
      eventBus.emit('tool:execution:error', { toolId, error: errorMessage });
      return errorResult;
    }
  }

  addTool(tool: ToolDefinition) {
    this.tools = [...this.tools, { ...tool, enabled: true }];
    this.persist();
    eventBus.emit('tools:updated', this.tools);
  }

  exportTools(): string {
    return JSON.stringify(this.tools, null, 2);
  }

  importTools(jsonData: string): number {
    try {
      const imported = JSON.parse(jsonData);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      
      let count = 0;
      for (const item of imported) {
        const exists = this.tools.some(t => t.id === item.id);
        if (!exists) {
          this.tools.push({ ...item, enabled: true });
          count++;
        }
      }
      
      this.persist();
      eventBus.emit('tools:updated', this.tools);
      return count;
    } catch (e) {
      console.error('[ToolService] Failed to import tools', e);
      throw new Error('Failed to import tools', { cause: e });
    }
  }
}

export const toolService = new ToolService();
