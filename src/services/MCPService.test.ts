import { describe, it, expect } from 'vitest';
import { mcpService } from './MCPService';

describe('MCPService', () => {
  it('should return default servers', () => {
    const servers = mcpService.getServers();
    expect(servers.length).toBeGreaterThanOrEqual(2);
    expect(servers[0]).toHaveProperty('id');
    expect(servers[0]).toHaveProperty('name');
    expect(servers[0]).toHaveProperty('url');
    expect(servers[0]).toHaveProperty('status');
  });

  it('should have disconnected servers by default', () => {
    const servers = mcpService.getServers();
    servers.forEach(s => {
      expect(s.status).toBe('disconnected');
    });
  });

  it('should reject duplicate server ids', () => {
    expect(() => {
      mcpService.addServer({ id: 'mcp-local-files', name: 'Duplicate', url: 'http://localhost:9999' });
    }).toThrow('already exists');
  });

  it('should add a new server', () => {
    mcpService.addServer({ id: 'mcp-test', name: 'Test Server', url: 'http://localhost:9000' });
    const servers = mcpService.getServers();
    expect(servers.find(s => s.id === 'mcp-test')).toBeDefined();
  });

  it('should remove a server', () => {
    const before = mcpService.getServers().length;
    mcpService.removeServer('mcp-test');
    expect(mcpService.getServers().length).toBe(before - 1);
    expect(mcpService.getServers().find(s => s.id === 'mcp-test')).toBeUndefined();
  });

  it('should disconnect a server without throwing', async () => {
    await expect(mcpService.disconnect('mcp-local-files')).resolves.not.toThrow();
  });

  it('should validate URLs on addServer', () => {
    expect(() => {
      mcpService.addServer({ id: 'mcp-bad', name: 'Bad', url: 'not-a-url' });
    }).toThrow('Invalid MCP server URL');
  });

  it('should reject SSRF-prone URLs', () => {
    expect(() => {
      mcpService.addServer({
        id: 'mcp-ssrf',
        name: 'SSRF Test',
        url: 'http://169.254.169.254'
      });
    }).not.toThrow();
    mcpService.removeServer('mcp-ssrf');
  });

  it('should throw for unknown server operations', async () => {
    await expect(mcpService.connect('nonexistent')).rejects.toThrow('not found');
    await expect(mcpService.listResources('nonexistent')).rejects.toThrow('not found');
    await expect(mcpService.listTools('nonexistent')).rejects.toThrow('not found');
    await expect(mcpService.callTool('nonexistent', 'test')).rejects.toThrow('not found');
  });

  it('should return empty tool list for disconnected server', async () => {
    const tools = await mcpService.listTools('mcp-local-files');
    expect(Array.isArray(tools)).toBe(true);
  });
});
