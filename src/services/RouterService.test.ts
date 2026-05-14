import { describe, it, expect, vi } from 'vitest';
import { RouterService } from './RouterService';

function createRouterService() {
  const mockKernel = {
    getState: vi.fn(() => ({
      providers: {},
      weights: { base: { ttft: 0.4, tps: 0.2, reliability: 0.4 }, adaptiveDelta: { ttft: 0, tps: 0, reliability: 0 }, effective: { ttft: 0.4, tps: 0.2, reliability: 0.4 } },
      decisions: [], totalRequests: 0, totalTokens: 0, estimatedCost: 0,
      explorationFactor: 0.1, violations: [], activeSLA: 'BALANCED' as const, history: [],
    })),
    setBaseWeights: vi.fn(),
  };

  const mockKeyService = {
    getKeys: vi.fn(() => []),
    selectFromPool: vi.fn(),
    canUseKey: vi.fn(() => ({ can: true, reason: null })),
    getPoolKeys: vi.fn(() => []),
  };

  const mockPricingService = {
    getPricingForModel: vi.fn(() => null),
  };

  const mockEventBus = {
    emit: vi.fn(),
    on: vi.fn(() => vi.fn()),
    off: vi.fn(),
  };

  const router = new RouterService({
    kernel: mockKernel as any,
    keyService: mockKeyService as any,
    pricingService: mockPricingService as any,
    eventBus: mockEventBus as any,
  });

  return { router, mockKernel, mockKeyService, mockPricingService, mockEventBus };
}

describe('RouterService', () => {
  it('should return empty ranked providers when no active keys', () => {
    const { router } = createRouterService();
    const ranked = router.getRankedProviders('performance', 'test prompt');
    expect(Array.isArray(ranked)).toBe(true);
    expect(ranked).toHaveLength(0);
  });

  it('should return race candidates', () => {
    const { router } = createRouterService();
    const candidates = router.getRaceCandidates('test prompt');
    expect(Array.isArray(candidates)).toBe(true);
  });

  it('should set strategy without throwing', () => {
    const { router } = createRouterService();
    expect(() => {
      router.setStrategy('performance');
    }).not.toThrow();
  });

  it('should set multiple strategies', () => {
    const { router } = createRouterService();
    expect(() => {
      router.setStrategy('latency');
      router.setStrategy('cost');
      router.setStrategy('reliability');
      router.setStrategy('broadcast');
    }).not.toThrow();
  });

  it('should get current auto weights', () => {
    const { router } = createRouterService();
    const weights = router.getCurrentAutoWeights();
    expect(weights).toHaveProperty('ttft');
    expect(weights).toHaveProperty('tps');
    expect(weights).toHaveProperty('reliability');
  });
});
