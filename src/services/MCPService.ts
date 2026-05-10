import { eventBus } from '../core/events';

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  error?: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

class MCPService {
  private servers: MCPServerConfig[] = [
    { id: 'mcp-local-files', name: 'Local File System', url: 'http://localhost:3001', status: 'disconnected' },
    { id: 'mcp-github', name: 'GitHub Context', url: 'http://localhost:3002', status: 'disconnected' }
  ];
  private rpcId = 0;

  private async rpc(server: MCPServerConfig, method: string, params?: unknown): Promise<unknown> {
    const id = ++this.rpcId;
    const body = { jsonrpc: '2.0', id, method, params };

    const response = await fetch(server.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`MCP ${server.name} returned ${response.status}: ${response.statusText}`);
    }

    const data: JSONRPCResponse = await response.json();
    if (data.error) {
      throw new Error(`MCP ${server.name} error: ${data.error.message}`);
    }
    return data.result;
  }

  async connect(serverId: string): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);

    try {
      server.status = 'connected';
      server.error = undefined;
      // Ping the server via initialize
      await this.rpc(server, 'initialize', { protocolVersion: '2025-03-26', capabilities: {} });
      eventBus.emit('system:notification', { message: `Connected to MCP Server: ${server.name}`, type: 'success' });
    } catch (err) {
      server.status = 'error';
      server.error = err instanceof Error ? err.message : String(err);
      eventBus.emit('system:notification', { message: `MCP ${server.name} connection failed: ${server.error}`, type: 'error' });
      throw err;
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;
    server.status = 'disconnected';
    server.error = undefined;
  }

  async listResources(serverId: string): Promise<MCPResource[]> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);

    try {
      const result = await this.rpc(server, 'resources/list') as { resources: MCPResource[] };
      return result.resources || [];
    } catch {
      const serverUrl = server.url.replace(/\/+$/, '');
      const response = await fetch(`${serverUrl}/resources`);
      const text = await response.text();
      try { return JSON.parse(text); } catch { return []; }
    }
  }

  async readResource(uri: string): Promise<string> {
    const server = this.servers.find(s => uri.startsWith('mcp-') || s.url && true);
    if (!server && this.servers.length > 0) {
      // try all servers
      for (const s of this.servers) {
        try {
          const result = await this.rpc(s, 'resources/read', { uri }) as { contents: { text: string }[] };
          return result.contents?.[0]?.text || '';
        } catch { continue; }
      }
    }

    const target = server || this.servers[0];
    if (!target) return 'No MCP servers configured';

    try {
      const result = await this.rpc(target, 'resources/read', { uri }) as { contents: { text: string }[] };
      return result.contents?.[0]?.text || '';
    } catch {
      const serverUrl = target.url.replace(/\/+$/, '');
      const response = await fetch(`${serverUrl}/resource?uri=${encodeURIComponent(uri)}`);
      return response.text();
    }
  }

  async listTools(serverId: string): Promise<MCPTool[]> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);

    try {
      const result = await this.rpc(server, 'tools/list') as { tools: MCPTool[] };
      return result.tools || [];
    } catch {
      return [];
    }
  }

  async callTool(serverId: string, toolName: string, args?: Record<string, unknown>): Promise<unknown> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);

    const result = await this.rpc(server, 'tools/call', { name: toolName, arguments: args });
    return result;
  }

  getServers(): MCPServerConfig[] {
    return this.servers;
  }

  addServer(config: Omit<MCPServerConfig, 'status' | 'error'>): void {
    if (this.servers.find(s => s.id === config.id)) {
      throw new Error(`Server ${config.id} already exists`);
    }
    this.servers.push({ ...config, status: 'disconnected' });
    eventBus.emit('mcp:updated', this.servers);
  }

  removeServer(serverId: string): void {
    this.servers = this.servers.filter(s => s.id !== serverId);
    eventBus.emit('mcp:updated', this.servers);
  }
}

export const mcpService = new MCPService();
