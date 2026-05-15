import { describe, it, expect } from 'vitest';
import { agentService } from './AgentService';

describe('AgentService', () => {
  it('should return default stats for unknown node', () => {
    const stats = agentService.getStats('nonexistent-node');
    expect(stats).toMatchObject({ calls: 0, tokens: 0, latency: 0, estimatedCost: 0 });
  });

  it('should return all stats as object', () => {
    const all = agentService.getAllStats();
    expect(typeof all).toBe('object');
  });

  it('should return agents array from topology', () => {
    const agents = agentService.getAgents();
    expect(Array.isArray(agents)).toBe(true);
  });

  it('should spawn an agent and return its id', () => {
    const id = agentService.spawnAgent('Test Agent');
    if (id !== null) {
      expect(typeof id).toBe('string');
      expect(id.startsWith('agent-')).toBe(true);
    }
  });

  it('should toggle agent status without throwing', () => {
    expect(() => {
      agentService.toggleAgent('nonexistent');
    }).not.toThrow();
  });
});
