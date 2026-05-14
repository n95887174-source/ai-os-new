import { describe, it, expect, vi } from 'vitest';
import { AdminService } from './AdminService';

function createAdminService() {
  const mockKernel = {
    getState: vi.fn(() => ({
      providers: {},
      weights: {} as any,
      decisions: [],
      totalRequests: 0, totalTokens: 0, estimatedCost: 0,
      explorationFactor: 0.1, violations: [], activeSLA: 'BALANCED' as const, history: [],
    })),
    setBaseWeights: vi.fn(),
  };

  const mockKeyService = {
    getKeys: vi.fn(() => []),
    getPoolKeys: vi.fn(() => []),
  };

  const mockMetricsService = {
    getAllMetrics: vi.fn(() => ({})),
    generateAggregated: vi.fn(() => ({})),
    getAlerts: vi.fn(() => []),
  };

  const mockEventBus = {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  };

  const service = new AdminService({
    kernel: mockKernel as any,
    keyService: mockKeyService as any,
    metricsService: mockMetricsService as any,
    eventBus: mockEventBus as any,
    orchestrator: { mount: vi.fn(), getTopology: vi.fn(), getActiveTopology: vi.fn(() => null) } as any,
    settingsService: { getSettings: vi.fn(() => ({})) } as any,
    agentService: { getAgents: vi.fn(() => []) } as any,
    toolService: { getTools: vi.fn(() => []) } as any,
    roleService: { getRoles: vi.fn(() => []) } as any,
    snapshotService: { getSnapshots: vi.fn(() => []) } as any,
    runtime: { getStatus: vi.fn(() => ({ phase: 'ready' })) } as any,
  });

  return service;
}

describe('AdminService', () => {
  it('should return system health with expected shape', () => {
    const admin = createAdminService();
    const health = admin.getSystemHealth();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('vitals');
    expect(health.vitals).toHaveProperty('cpu');
    expect(health.vitals).toHaveProperty('memory');
    expect(health.vitals).toHaveProperty('throughput');
    expect(health).toHaveProperty('services');
    expect(Array.isArray(health.services)).toBe(true);
  });

  it('should return providers list', () => {
    const admin = createAdminService();
    const providers = admin.getProviders();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('should return metrics object', () => {
    const admin = createAdminService();
    const metrics = admin.getMetrics();
    expect(typeof metrics).toBe('object');
  });

  it('should return decision history array', () => {
    const admin = createAdminService();
    const decisions = admin.getDecisionHistory();
    expect(Array.isArray(decisions)).toBe(true);
  });
});
