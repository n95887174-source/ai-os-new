import { EVENTS } from '../events/event-names';

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  error?: string;
  lastConnected?: number;
  capabilities?: string[];
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

import { CONFIG } from './config-registry';
import { isPrivateIP } from '../utils/network';

const SERVERS_KEY = 'super_agents_mcp_servers';

export interface MCPServiceDeps {
  eventBus: {
    emit: (event: string, data?: unknown) => void;
  };
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
}

export class MCPService {
  private servers: MCPServerConfig[] = [];
  private rpcId = 0;
  private connectionRetries = new Map<string, number>();
  private deps: MCPServiceDeps;

  constructor(deps: MCPServiceDeps) {
    this.deps = deps;
  }

  async init() {
    await this.load();
  }

  destroy() {
    this.servers = [];
    this.connectionRetries.clear();
  }

  private async load() {
    try {
      const saved = await this.deps.database.getKv<MCPServerConfig[]>(SERVERS_KEY);
      if (saved && saved.length > 0) {
        this.servers = saved;
      } else {
        this.servers = [
          { id: 'mcp-local-files', name: 'Local File System', url: 'http://localhost:3001', status: 'disconnected' },
          { id: 'mcp-github', name: 'GitHub Context', url: 'http://localhost:3002', status: 'disconnected' },
        ];
        this.save();
      }
    } catch (e) {
      console.warn('[MCPService] Failed to load servers, using defaults', e);
      this.servers = [
        { id: 'mcp-local-files', name: 'Local File System', url: 'http://localhost:3001', status: 'disconnected' },
      ];
    }
  }

  private async save() {
    try {
      await this.deps.database.setKv(SERVERS_KEY, this.servers);
    } catch (e) {
      console.warn('[MCPService] Failed to persist servers', e);
    }
  }

  private validateServerUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`Protocol ${parsed.protocol} not allowed for MCP server`);
      }
      // MCP is a local protocol — block only non-localhost private IPs
      const host = parsed.hostname.toLowerCase();
      if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1' && isPrivateIP(host)) {
        throw new Error(`MCP server URL points to private/internal network: ${url}`);
      }
    } catch {
      throw new Error(`Invalid MCP server URL: ${url}`);
    }
  }

  private validateUri(uri: string): void {
    const decoded = decodeURIComponent(uri.replace(/\+/g, ' '));
    const forbidden = ['http://', 'https://', 'file://', 'ftp://', 'smb://', '\\', '..', '@'];
    for (const pattern of forbidden) {
      if (decoded.includes(pattern)) throw new Error(`MCP URI contains forbidden pattern: ${pattern}`);
    }
  }

  private async safeFetch(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG?.services?.mcp?.safeFetchTimeoutMs ?? 5000);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async rpc(server: MCPServerConfig, method: string, params?: unknown): Promise<unknown> {
    const id = ++this.rpcId;
    const body = { jsonrpc: '2.0', id, method, params };
    const response = await this.safeFetch(server.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`MCP ${server.name} returned ${response.status}`);
    const data: JSONRPCResponse = await response.json();
    if (data.error) throw new Error(`MCP ${server.name} error: ${data.error.message}`);
    return data.result;
  }

  async connect(serverId: string): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);

    try {
      server.status = 'connected';
      server.error = undefined;
      server.lastConnected = Date.now();
      const result = await this.rpc(server, 'initialize', { protocolVersion: '2025-03-26', capabilities: {} }) as { capabilities?: Record<string, unknown> };
      server.capabilities = result.capabilities ? Object.keys(result.capabilities) : [];
      this.connectionRetries.delete(serverId);
      this.save();
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Connected to MCP Server: ${server.name}`, type: 'success' });
    } catch (err) {
      server.status = 'error';
      server.error = err instanceof Error ? err.message : String(err);
      const retries = this.connectionRetries.get(serverId) || 0;
      this.connectionRetries.set(serverId, retries + 1);
      this.save();
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `MCP ${server.name} connection failed: ${server.error}`, type: 'error' });
      throw err;
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;
    server.status = 'disconnected';
    server.error = undefined;
    this.save();
  }

  async reconnectAll(): Promise<number> {
    let successCount = 0;
    for (const server of this.servers) {
      if (server.status === 'error' || server.status === 'disconnected') {
        try {
          await this.connect(server.id);
          successCount++;
        } catch (e) { console.warn('[MCPService] Reconnect failed for', server.name, e); }
      }
    }
    return successCount;
  }

  async listResources(serverId: string): Promise<MCPResource[]> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);

    try {
      const result = await this.rpc(server, 'resources/list') as { resources: MCPResource[] };
      return result.resources || [];
    } catch (e) {
      console.warn('[MCPService] RPC listResources failed, trying HTTP fallback', e);
      try {
        const response = await this.safeFetch(`${server.url.replace(/\/+$/, '')}/resources`);
        return await response.json();
      } catch (e2) {
        console.warn('[MCPService] HTTP listResources also failed', e2);
        return [];
      }
    }
  }

  async readResource(uri: string): Promise<string> {
    this.validateUri(uri);

    for (const server of this.servers) {
      if (server.status !== 'connected') continue;
      try {
        const result = await this.rpc(server, 'resources/read', { uri }) as { contents: { text: string }[] };
        if (result.contents?.[0]?.text) return result.contents[0].text;
      } catch (e) { console.warn('[MCPService] RPC readResource failed on', server.name, e); }
    }

    const connected = this.servers.find(s => s.status === 'connected');
    if (!connected) return 'No connected MCP servers available';

    try {
      const response = await this.safeFetch(`${connected.url.replace(/\/+$/, '')}/resource?uri=${encodeURIComponent(uri)}`);
      return await response.text();
    } catch (e) {
      console.warn('[MCPService] HTTP readResource failed', e);
      return `Failed to read resource: ${uri}`;
    }
  }

  async listTools(serverId: string): Promise<MCPTool[]> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);
    try {
      const result = await this.rpc(server, 'tools/list') as { tools: MCPTool[] };
      return result.tools || [];
    } catch (e) { console.warn('[MCPService] listTools failed for', server.name, e); return []; }
  }

  async callTool(serverId: string, toolName: string, args?: Record<string, unknown>): Promise<unknown> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error(`Server ${serverId} not found`);
    return await this.rpc(server, 'tools/call', { name: toolName, arguments: args });
  }

  getServers(): MCPServerConfig[] { return [...this.servers]; }

  getConnectedServers(): MCPServerConfig[] {
    return this.servers.filter(s => s.status === 'connected');
  }

  getServer(id: string): MCPServerConfig | undefined {
    return this.servers.find(s => s.id === id);
  }

  addServer(config: Omit<MCPServerConfig, 'status' | 'error'>): void {
    if (this.servers.find(s => s.id === config.id)) {
      throw new Error(`Server ${config.id} already exists`);
    }
    this.validateServerUrl(config.url);
    this.servers.push({ ...config, status: 'disconnected' });
    this.save();
    this.deps.eventBus.emit(EVENTS.MCP_UPDATED, this.servers);
  }

  removeServer(serverId: string): void {
    this.servers = this.servers.filter(s => s.id !== serverId);
    this.connectionRetries.delete(serverId);
    this.save();
    this.deps.eventBus.emit(EVENTS.MCP_UPDATED, this.servers);
  }

  updateServer(id: string, updates: Partial<MCPServerConfig>): void {
    this.servers = this.servers.map(s => s.id === id ? { ...s, ...updates } : s);
    this.save();
    this.deps.eventBus.emit(EVENTS.MCP_UPDATED, this.servers);
  }

  getConnectionStats() {
    return {
      total: this.servers.length,
      connected: this.servers.filter(s => s.status === 'connected').length,
      disconnected: this.servers.filter(s => s.status === 'disconnected').length,
      error: this.servers.filter(s => s.status === 'error').length,
    };
  }
}
