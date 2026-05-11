import { describe, it, expect, beforeEach } from 'vitest';
import { toolService } from './ToolService';

describe('ToolService', () => {
  it('should return default tools', () => {
    const tools = toolService.getTools();
    expect(tools.length).toBeGreaterThanOrEqual(4);
    expect(tools[0]).toHaveProperty('id');
    expect(tools[0]).toHaveProperty('name');
    expect(tools[0]).toHaveProperty('type');
  });

  it('should have t-search tool enabled by default', () => {
    const search = toolService.getTools().find(t => t.id === 't-search');
    expect(search).toBeDefined();
    expect(search?.enabled).toBe(true);
  });

  it('should toggle tool enabled state', () => {
    toolService.toggleTool('t-search');
    const search = toolService.getTools().find(t => t.id === 't-search');
    expect(search?.enabled).toBe(false);
    toolService.toggleTool('t-search');
  });

  it('should add a new tool', () => {
    const newTool = {
      id: 't-test',
      name: 'Test Tool',
      description: 'A test tool',
      type: 'api' as const,
      enabled: true
    };
    toolService.addTool(newTool);
    const tools = toolService.getTools();
    expect(tools.find(t => t.id === 't-test')).toBeDefined();
  });

  it('should execute t-search and return result', async () => {
    const result = await toolService.execute('t-search', 'test query');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('timestamp');
  });

  it('should throw for unknown tool', async () => {
    await expect(toolService.execute('t-unknown', {})).rejects.toThrow('not found');
  });

  it('should execute t-web and return simulated result', async () => {
    const result = await toolService.execute('t-web', { url: 'https://example.com' });
    expect(result.status).toBe('success');
    expect(result.data).toContain('Simulated');
  });
});
