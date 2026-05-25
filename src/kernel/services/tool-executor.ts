import { isPrivateIP } from '../utils/network';

export type ToolCategory = 'search' | 'code' | 'web' | 'data' | 'connector' | 'utility' | 'custom';

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  type: 'script' | 'api' | 'database';
  category?: ToolCategory;
  language?: 'python' | 'javascript' | 'sql';
  code?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
  rateLimit?: number;
  timeout?: number;
  allowedDomains?: string[];
};

export interface ToolExecution {
  id: string;
  toolId: string;
  input: unknown;
  output: unknown;
  status: 'success' | 'error';
  duration: number;
  timestamp: number;
}

import { CONFIG } from './config-registry';

const TOOLS_KEY = 'super_agents_tools';
const MAX_EXECUTION_HISTORY = CONFIG?.services?.toolExecutor?.maxHistory ?? 200;

export interface ToolServiceDeps {
  eventBus: {
    emit: (event: string, data?: unknown) => void;
  };
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
  memoryService?: {
    search: (query: string, limit?: number) => Promise<unknown[]>;
  };
  sandboxService?: {
    execute: (code: string, data: unknown) => Promise<unknown>;
  };
  pluginRegistry?: {
    getTool: (id: string) => { execute: (input: unknown, context: unknown) => Promise<unknown> } | undefined;
    getToolContext: (id: string) => unknown;
  };
  mcpService?: {
    readResource: (uri: string) => Promise<string>;
  };
}

function toolError(toolId: string, message: string, code?: string): Error & { type: string; toolId: string; code?: string } {
  const err = new Error(message);
  (err as any).type = 'tool';
  (err as any).toolId = toolId;
  if (code) (err as any).code = code;
  return err;
}

export class ToolService {
  private tools: ToolDefinition[] = [
    { id: 't-search', name: 'Memory Search', type: 'api', category: 'search', description: 'Performs semantic search across the long-term memory mesh.', enabled: true },
    { id: 't-code', name: 'JS Executor', type: 'script', category: 'code', language: 'javascript', description: 'Safely executes JavaScript logic in a sandboxed-like environment.', enabled: true, code: 'return `Executed JS logic at ${new Date().toISOString()}`' },
    { id: 't-web', name: 'Web Scraper', type: 'api', category: 'web', description: 'Fetches content from any URL for analysis.', enabled: true },
    { id: 't-mcp', name: 'MCP Connector', type: 'api', category: 'connector', description: 'Fetches context from Model Context Protocol servers.', enabled: true },
  ];
  private executionHistory: ToolExecution[] = [];
  private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();
  private deps: ToolServiceDeps;

  constructor(deps: ToolServiceDeps) {
    this.deps = deps;
  }

  async init() {
    await this.load();
  }

  async destroy(): Promise<void> {
    await this.persist();
    this.executionHistory = [];
    this.tools = [];
  }

  private async load() {
    try {
      const parsed = await this.deps.database.getKv<{ tools: ToolDefinition[]; history: ToolExecution[] }>(TOOLS_KEY);
      if (parsed) {
        if (parsed.tools) {
          const tools = parsed.tools;
          this.tools = this.tools.map(defaultTool => {
            const saved = tools.find(p => p.id === defaultTool.id);
            return saved ? { ...defaultTool, ...saved } : defaultTool;
          });
        }
        if (parsed.history) this.executionHistory = parsed.history;
      }
    } catch (e) {
      console.error('[ToolService] Failed to load tools', e);
    }
  }

  private persist() {
    this.deps.database.setKv(TOOLS_KEY, { tools: this.tools, history: this.executionHistory.slice(-MAX_EXECUTION_HISTORY) }).catch(e => console.error('[ToolService] Failed to persist tools:', e));
  }

  getTools() { return this.tools; }

  getToolsByCategory(category: ToolCategory): ToolDefinition[] {
    return this.tools.filter(t => t.category === category);
  }

  getEnabledTools(): ToolDefinition[] {
    return this.tools.filter(t => t.enabled !== false);
  }

  addTool(tool: ToolDefinition) {
    this.tools = [...this.tools, { ...tool, enabled: true }];
    this.persist();
    this.deps.eventBus.emit('tools:updated', this.tools);
  }

  updateTool(id: string, updates: Partial<ToolDefinition>) {
    this.tools = this.tools.map(t => t.id === id ? { ...t, ...updates } : t);
    this.persist();
    this.deps.eventBus.emit('tools:updated', this.tools);
  }

  removeTool(id: string) {
    this.tools = this.tools.filter(t => t.id !== id);
    this.persist();
    this.deps.eventBus.emit('tools:updated', this.tools);
  }

  toggleTool(id: string) {
    this.tools = this.tools.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t);
    this.persist();
    this.deps.eventBus.emit('tools:updated', this.tools);
  }

  private checkRateLimit(toolId: string): boolean {
    const tool = this.tools.find(t => t.id === toolId);
    if (!tool?.rateLimit) return true;

    const counter = this.rateLimitCounters.get(toolId);
    const now = Date.now();

    if (!counter || now > counter.resetTime) {
      this.rateLimitCounters.set(toolId, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (counter.count >= tool.rateLimit) return false;
    counter.count++;
    return true;
  }

  async execute(toolId: string, input: unknown): Promise<{ status: string; data?: unknown; error?: string; timestamp: number; duration?: number }> {
    const tool = this.tools.find(t => t.id === toolId);
    const pluginTool = this.deps.pluginRegistry?.getTool(toolId);
    if (!tool && !pluginTool) throw toolError(toolId, `Tool ${toolId} not found`, 'NOT_FOUND');
    if (tool && tool.enabled === false) throw toolError(toolId, `Tool ${tool.name} is currently disabled`);

    if (tool && !this.checkRateLimit(toolId)) {
      return { status: 'error', error: `Rate limit exceeded for ${tool.name}`, timestamp: Date.now() };
    }

    this.deps.eventBus.emit('tool:execution:start', { toolId, input });
    const startTime = performance.now();

    try {
      let resultData: unknown;
      if (pluginTool) {
        const context = this.deps.pluginRegistry?.getToolContext(toolId);
        if (!context) throw toolError(toolId, `Plugin context not found for tool ${toolId}`, 'CONTEXT_MISSING');
        resultData = await pluginTool.execute(input, context);
      } else if (!tool) throw toolError(toolId, `Tool ${toolId} not found`, 'NOT_FOUND');
      else if (toolId === 't-search') {
        const query = typeof input === 'string' ? input : (input as Record<string, string>).query || '';
        resultData = await this.deps.memoryService?.search(query);
      } else if (toolId === 't-code') {
        const code = tool.code || 'return data';
        resultData = await this.deps.sandboxService?.execute(code, input);
      } else if (toolId === 't-web') {
        const url = typeof input === 'string' ? input : (input as Record<string, string>).url || '';
        resultData = await this.fetchWithTimeout(toolId, url, tool.timeout ?? CONFIG?.services?.toolExecutor?.defaultTimeoutMs ?? 10000, tool.allowedDomains);
      } else if (toolId === 't-mcp') {
        const uri = typeof input === 'string' ? input : (input as Record<string, string>).uri || '';
        const mcpResult = await this.deps.mcpService?.readResource(uri) ?? '';
        if (typeof mcpResult === 'string' && (mcpResult.startsWith('No connected') || mcpResult.startsWith('Failed to read'))) {
          throw toolError(toolId, mcpResult);
        }
        resultData = mcpResult;
      } else {
        resultData = `Output for ${tool.name}: Successful execution.`;
      }

      const duration = Math.round(performance.now() - startTime);
      const result = { status: 'success', data: resultData, timestamp: Date.now(), duration };
      this.executionHistory.unshift({ id: `exec-${Date.now()}`, toolId, input, output: resultData, status: 'success', duration, timestamp: Date.now() });
      if (this.executionHistory.length > MAX_EXECUTION_HISTORY) this.executionHistory.pop();
      this.persist();
      this.deps.eventBus.emit('tool:execution:success', { toolId, output: result });
      return result;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      const duration = Math.round(performance.now() - startTime);
      const result = { status: 'error', error: errorMessage, timestamp: Date.now(), duration };
      this.executionHistory.unshift({ id: `exec-${Date.now()}`, toolId, input, output: errorMessage, status: 'error', duration, timestamp: Date.now() });
      if (this.executionHistory.length > MAX_EXECUTION_HISTORY) this.executionHistory.pop();
      this.persist();
      this.deps.eventBus.emit('tool:execution:error', { toolId, error: errorMessage });
      return result;
    }
  }

  private async fetchWithTimeout(toolId: string, url: string, timeoutMs = CONFIG?.services?.toolExecutor?.defaultTimeoutMs ?? 10000, allowedDomains?: string[]): Promise<string> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw toolError(toolId, `Invalid URL: ${url}`, 'INVALID_URL');
    }
    if (parsed.protocol !== 'https:') {
      throw toolError(toolId, `Protocol not allowed: ${parsed.protocol} — only https: is permitted`, 'PROTOCOL_BLOCKED');
    }
    if (isPrivateIP(parsed.hostname)) {
      throw toolError(toolId, `URL points to private/internal network: ${url}`, 'PRIVATE_IP');
    }
    if (allowedDomains && allowedDomains.length > 0) {
      const matches = allowedDomains.some(d =>
        parsed.hostname === d || parsed.hostname.endsWith('.' + d)
      );
      if (!matches) {
        throw toolError(toolId, `Domain ${parsed.hostname} is not in the allowed list for this tool`, 'DOMAIN_BLOCKED');
      }
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      throw toolError(toolId, `Web fetch returned ${response.status} for ${url}`, 'HTTP_ERROR');
    }
    return await response.text();
  }

  getExecutionHistory(toolId?: string): ToolExecution[] {
    return toolId ? this.executionHistory.filter(e => e.toolId === toolId) : [...this.executionHistory];
  }

  getExecutionStats() {
    const total = this.executionHistory.length;
    const success = this.executionHistory.filter(e => e.status === 'success').length;
    const byTool: Record<string, { total: number; success: number; avgDuration: number }> = {};
    for (const exec of this.executionHistory) {
      if (!byTool[exec.toolId]) byTool[exec.toolId] = { total: 0, success: 0, avgDuration: 0 };
      byTool[exec.toolId].total++;
      if (exec.status === 'success') byTool[exec.toolId].success++;
    }
    for (const [id, stats] of Object.entries(byTool)) {
      const execs = this.executionHistory.filter(e => e.toolId === id && e.duration);
      stats.avgDuration = execs.length > 0 ? execs.reduce((s, e) => s + (e.duration || 0), 0) / execs.length : 0;
    }
    return { total, success, successRate: total > 0 ? success / total : 1, byTool };
  }

  exportTools(): string {
    return JSON.stringify({ tools: this.tools, history: this.executionHistory.slice(-50) }, null, 2);
  }

  importTools(jsonData: string): number {
    try {
      const data = JSON.parse(jsonData);
      const imported = data.tools || [];
      if (!Array.isArray(imported)) throw toolError('tools', 'Invalid format', 'INVALID_FORMAT');
      let count = 0;
      for (const item of imported) {
        const exists = this.tools.some(t => t.id === item.id);
        if (!exists) { this.tools.push({ ...item, enabled: true }); count++; }
      }
      this.persist();
      this.deps.eventBus.emit('tools:updated', this.tools);
      return count;
    } catch (e) {
      console.error('[ToolService] Failed to import tools', e);
      throw toolError('tools', 'Failed to import tools', 'IMPORT_FAILED');
    }
  }
}
