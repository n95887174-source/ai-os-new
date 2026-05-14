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

  it('should return default config with expected shape', () => {
    const { router } = createRouterService();
    const cfg = router.getConfig();
    expect(cfg.history.maxDecisions).toBe(100);
    expect(cfg.latency.slidingWindowSize).toBe(10);
    expect(cfg.latency.monitorIntervalMs).toBe(30000);
    expect(cfg.latency.degradationRatio).toBe(1.5);
    expect(cfg.scoring.ttft.maxMs).toBe(2000);
    expect(cfg.scoring.tps.max).toBe(100);
    expect(cfg.scoring.reliability.floor).toBe(0.4);
    expect(cfg.scoring.stabilityBonus).toBe(0.1);
    expect(cfg.strategyWeights.latency.ttft).toBe(0.8);
    expect(cfg.strategyWeights.performance.tps).toBe(0.7);
    expect(cfg.classification.complexThreshold).toBe(2000);
    expect(cfg.latencyVarianceBands).toHaveLength(3);
    expect(cfg.affinity.multimodal.gemini).toBe(0.5);
    expect(cfg.priority.high.groq).toBe(0.4);
    expect(cfg.providerByComplexity.multimodal.provider).toBe('gemini');
  });

  it('should classify requests based on configurable thresholds', () => {
    const { router } = createRouterService();
    const simple = router.classifyRequest('hello');
    expect(simple.complexity).toBe('simple');
    expect(simple.isCode).toBe(false);
    expect(simple.isLong).toBe(false);

    const code = router.classifyRequest('function foo() { return 1; }');
    expect(code.isCode).toBe(true);

    const longCode = router.classifyRequest('a'.repeat(5000) + ' function foo()');
    expect(longCode.isLong).toBe(true);
    expect(longCode.isCode).toBe(true);
    expect(longCode.complexity).toBe('complex');
  });

  it('should select provider by complexity from config', () => {
    const { router } = createRouterService();
    const sel = router.selectProviderByComplexity('a'.repeat(100));
    expect(sel.provider).toBe('groq');
    expect(sel.model).toBe('llama-3.1-8b');

    const multimodal = router.selectProviderByComplexity('draw a picture of a cat');
    expect(multimodal.provider).toBe('gemini');
  });
});
