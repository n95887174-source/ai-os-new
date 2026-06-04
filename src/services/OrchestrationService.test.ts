import { describe, it, expect } from 'vitest';
import { orchestrator } from './OrchestrationService';
import type { ISTopology } from '../kernel/contracts/topology';

describe('OrchestrationService', () => {
  it('should mount a topology correctly', () => {
    const mockTopology: ISTopology = {
      id: 'test-topo',
      name: 'Test Topology',
      version: '1.0.0',
      nodes: [
        { id: 'entry', label: 'Entry Node', type: 'router', config: {} }
      ],
      edges: [],
      policies: []
    };

    orchestrator.mount(mockTopology);
    
    expect(orchestrator.getActiveTopology()).toEqual(mockTopology);
  });

  it('should manage disabled nodes', () => {
    orchestrator.setNodeDisabled('node-1', true);
    expect(orchestrator.isNodeDisabled('node-1')).toBe(true);
    
    orchestrator.setNodeDisabled('node-1', false);
    expect(orchestrator.isNodeDisabled('node-1')).toBe(false);
  });
});
