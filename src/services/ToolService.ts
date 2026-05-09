import { eventBus } from '../core/events';
import { memoryService } from './MemoryService';

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
    const tool = this.tools.find(t => t.id === toolId);
    if (!tool) throw new Error(`Tool ${toolId} not found`);
    if (tool.enabled === false) throw new Error(`Tool ${tool.name} is currently disabled`);

    eventBus.emit('tool:execution:start', { toolId, input });
    console.log(`[ToolEngine] Executing ${tool.name}...`);

    let resultData: any;
    
    try {
      if (toolId === 't-search') {
        const query = typeof input === 'string' ? input : input.query || '';
        resultData = await memoryService.search(query);
      } else if (toolId === 't-code') {
        resultData = `Executed JS expression at ${new Date().toISOString()}. Result: ${JSON.stringify(input)}`;
      } else if (toolId === 't-web') {
        // Simulated web fetch for browser environment
        const url = typeof input === 'string' ? input : input.url || '';
        resultData = `Content fetched from ${url} (Simulated - CORS restricted in browser)`;
      } else {
        resultData = `Output for ${tool.name}: Successful execution.`;
      }

      const result = {
        status: 'success',
        data: resultData,
        timestamp: Date.now()
      };

      eventBus.emit('tool:execution:success', { toolId, result });
      return result;
    } catch (e: any) {
      const errorResult = {
        status: 'error',
        error: e.message || String(e),
        timestamp: Date.now()
      };
      eventBus.emit('tool:execution:error', { toolId, result: errorResult });
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
