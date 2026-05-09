import { eventBus } from '../core/events';

/**
 * SuperAgents OS - MCP Service (Model Context Protocol)
 * 
 * Provides a standardized way to connect to external context servers.
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

class MCPService {
  private servers: MCPServerConfig[] = [
    { id: 'mcp-local-files', name: 'Local File System', url: 'http://localhost:3001', status: 'disconnected' },
    { id: 'mcp-github', name: 'GitHub Context', url: 'http://localhost:3002', status: 'disconnected' }
  ];

  async connect(serverId: string) {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;

    console.log(`[MCP] Connecting to ${server.name}...`);
    // Simulated connection
    server.status = 'connected';
    eventBus.emit('system:notification', { message: `Connected to MCP Server: ${server.name}`, type: 'success' });
  }

  async listResources(serverId: string): Promise<MCPResource[]> {
    if (serverId === 'mcp-local-files') {
      return [
        { uri: 'file:///project/readme.md', name: 'Project README', mimeType: 'text/markdown' },
        { uri: 'file:///project/package.json', name: 'Package Config', mimeType: 'application/json' }
      ];
    }
    return [];
  }

  async readResource(uri: string): Promise<string> {
    console.log(`[MCP] Reading resource: ${uri}`);
    // Simulated read
    if (uri.endsWith('readme.md')) return "# SuperAgents OS\nAutonomous Agent Platform.";
    if (uri.endsWith('package.json')) return '{"name": "super-agents-os", "version": "0.1.0"}';
    return "Resource content not found (Simulated)";
  }

  getServers() {
    return this.servers;
  }
}

export const mcpService = new MCPService();
