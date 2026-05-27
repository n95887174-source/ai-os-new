import { describe, it, expect, beforeAll } from 'vitest';
import { orchestrator } from './OrchestrationService';
import { agentService } from './AgentService';
import { AuditorTopology } from '../core/IntelligenceDSL';

describe('Agent spawn flow (integration)', () => {
  beforeAll(() => {
    orchestrator.mount(AuditorTopology);
  });

  it('topology should be mounted', () => {
    const top = orchestrator.getActiveTopology();
    expect(top).not.toBeNull();
    expect(top!.name).toBe('Agent Workforce');
  });

  it('agents should be visible from topology', () => {
    const agents = agentService.getAgents();
    expect(agents.length).toBeGreaterThanOrEqual(20);
    expect(agents.some(a => a.name === 'System Architect')).toBe(true);
    expect(agents.some(a => a.name === 'Security Engineer')).toBe(true);
  });

  it('spawnAgent should create a new agent', () => {
    const id = agentService.spawnAgent('Test Agent');
    expect(id).not.toBeNull();
    expect(typeof id).toBe('string');
    expect(id!.startsWith('agent-')).toBe(true);

    const agents = agentService.getAgents();
    const found = agents.find(a => a.name === 'Test Agent');
    expect(found).toBeDefined();
    expect(found!.id).toBe(id);
  });

  it('spawnAgent should return non-null after topology is mounted', () => {
    const ids: string[] = [];
    ids.push(agentService.spawnAgent('Alpha')!);
    ids.push(agentService.spawnAgent('Beta')!);
    ids.push(agentService.spawnAgent('Gamma')!);
    expect(ids).toHaveLength(3);
    ids.forEach(id => expect(id).toMatch(/^agent-/));

    const agents = agentService.getAgents();
    expect(agents.some(a => a.name === 'Alpha')).toBe(true);
    expect(agents.some(a => a.name === 'Beta')).toBe(true);
    expect(agents.some(a => a.name === 'Gamma')).toBe(true);
  });
});
