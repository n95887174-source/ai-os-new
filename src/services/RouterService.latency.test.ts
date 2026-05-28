import { describe, it, expect, vi, afterEach } from 'vitest';
import { RouterService as KernelRouter } from '../kernel/services/provider-router';
import type { SystemState } from '../types/metrics';

function defaultState(overrides?: Partial<SystemState>): SystemState {
  return {
    providers: {},
    weights: {
      base: { ttft: 0.4, tps: 0.2, reliability: 0.4 },
      adaptiveDelta: { ttft: 0, tps: 0, reliability: 0 },
      effective: { ttft: 0.4, tps: 0.2, reliability: 0.4 },
    },
    decisions: [],
    totalRequests: 0,
    totalTokens: 0,
    estimatedCost: 0,
    explorationFactor: 0.1,
    violations: [],
    activeSLA: 'BALANCED',
    history: [],
    ...overrides,
  };
}

interface LatencyWindow {
  provider: string;
  latency: number;
}

async function createRouterService() {
  const mockKernel = {
    getState: vi.fn(() => defaultState()),
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
    getBudgetInfo: vi.fn(() => ({ providerBudgets: [] })),
  };

  const eventHandlers: Record<string, Array<(...args: any[]) => void>> = {};
  const mockEventBus = {
    emit: vi.fn((event: string, data: any) => {
      const handlers = eventHandlers[event] || [];
      handlers.forEach(h => h(data));
    }),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!eventHandlers[event]) eventHandlers[event] = [];
      eventHandlers[event].push(handler);
      return () => {
        eventHandlers[event] = eventHandlers[event].filter(h => h !== handler);
      };
    }),
    off: vi.fn(),
  };

  const router = new KernelRouter({
    kernel: mockKernel as any,
    keyService: mockKeyService as any,
    pricingService: mockPricingService as any,
    eventBus: mockEventBus as any,
    budgetService: { canUseProvider: vi.fn(() => true) } as any,
    policyService: { checkAgentPolicy: vi.fn(() => ({ allowed: true })) } as any,
    database: { getKv: vi.fn(() => null as any), setKv: vi.fn() } as any,
  });
  await router.init();

  const recordLatencies = (windows: LatencyWindow[]) => {
    for (const w of windows) {
      (router as any).recordLatency(w.provider, w.latency);
    }
  };

  const setProviderState = (providers: Record<string, { avgTTFT?: number; avgTPS?: number; reliability?: number; status?: string; stabilityIndex?: number; reputationScore?: number }>) => {
    const state = defaultState({
      providers: Object.fromEntries(
        Object.entries(providers).map(([k, v]) => [
          k,
          {
            id: k,
            avgTTFT: v.avgTTFT ?? 100,
            avgTPS: v.avgTPS ?? 50,
            reliability: v.reliability ?? 0.95,
            status: v.status ?? 'healthy',
            stabilityIndex: v.stabilityIndex ?? 1.0,
            reputationScore: v.reputationScore ?? 100,
            totalRequests: 0,
            selectionRate: 0,
          },
        ]),
      ),
    });
    mockKernel.getState.mockReturnValue(state);
  };

  const triggerBurst = (data: { id: string; provider: string; latency: number }) => {
    const handlers = eventHandlers['key:latency:burst'] || [];
    handlers.forEach(h => h(data));
  };

  afterEach(() => {
    router.stopMonitoring();
  });

  return {
    router,
    mockKernel,
    mockKeyService,
    mockPricingService,
    mockEventBus,
    eventHandlers,
    recordLatencies,
    setProviderState,
    triggerBurst,
  };
}

describe('RouterService latency balancing', () => {
  describe('recordLatency', () => {
    it('should store latency samples in sliding window', async () => {
      const { router, recordLatencies } = await createRouterService();
      recordLatencies([
        { provider: 'groq', latency: 100 },
        { provider: 'groq', latency: 200 },
        { provider: 'groq', latency: 150 },
      ]);
      expect((router as any).latencyWindows.get('groq')).toEqual([100, 200, 150]);
    });

    it('should cap window at MAX_LATENCY_SAMPLES', async () => {
      const { router, recordLatencies } = await createRouterService();
      const samples = Array.from({ length: 15 }, (_, i) => ({ provider: 'groq', latency: i * 10 }));
      recordLatencies(samples);
      const window = (router as any).latencyWindows.get('groq');
      expect(window.length).toBe(10);
      expect(window[0]).toBe(50);
      expect(window[9]).toBe(140);
    });

    it('should store separate windows per provider', async () => {
      const { router, recordLatencies } = await createRouterService();
      recordLatencies([
        { provider: 'groq', latency: 100 },
        { provider: 'gemini', latency: 300 },
      ]);
      expect((router as any).latencyWindows.get('groq')).toEqual([100]);
      expect((router as any).latencyWindows.get('gemini')).toEqual([300]);
    });

    it('should normalize provider key to lowercase', async () => {
      const { router, recordLatencies } = await createRouterService();
      recordLatencies([{ provider: 'Groq', latency: 150 }]);
      expect((router as any).latencyWindows.get('groq')).toEqual([150]);
    });
  });

  describe('getProviderAvgLatency', () => {
    it('should return window average when available', async () => {
      const { router, recordLatencies, setProviderState } = await createRouterService();
      setProviderState({ groq: { avgTTFT: 500 } });
      recordLatencies([{ provider: 'groq', latency: 100 }, { provider: 'groq', latency: 200 }]);
      expect(router.getProviderAvgLatency('groq')).toBe(150);
    });

    it('should fall back to kernel avgTTFT when no window data', async () => {
      const { router, setProviderState } = await createRouterService();
      setProviderState({ groq: { avgTTFT: 300 } });
      expect(router.getProviderAvgLatency('groq')).toBe(300);
    });

    it('should return 0 for unknown provider', async () => {
      const { router } = await createRouterService();
      expect(router.getProviderAvgLatency('nonexistent')).toBe(0);
    });
  });

  describe('getLatencyBalancedWeights', () => {
    it('should return default weights when no providers', async () => {
      const { router } = await createRouterService();
      const w = router.getLatencyBalancedWeights();
      expect(w.ttft).toBe(0.4);
      expect(w.tps).toBe(0.3);
      expect(w.reliability).toBe(0.3);
    });

    it('should return effective weights when variance is low', async () => {
      const { router, setProviderState } = await createRouterService();
      setProviderState({
        groq: { avgTTFT: 100 },
        gemini: { avgTTFT: 120 },
      });
      const w = router.getLatencyBalancedWeights();
      expect(w.ttft).toBe(0.4);
      expect(w.tps).toBe(0.2);
      expect(w.reliability).toBe(0.4);
    });

    it('should return moderate ttft weights when variance is 0.25-0.5', async () => {
      const { router, setProviderState } = await createRouterService();
      setProviderState({
        groq: { avgTTFT: 100 },
        gemini: { avgTTFT: 135 },
        openrouter: { avgTTFT: 190 },
      });
      const w = router.getLatencyBalancedWeights();
      expect(w.ttft).toBe(0.5);
      expect(w.tps).toBe(0.25);
      expect(w.reliability).toBe(0.25);
    });

    it('should return high ttft weights when variance > 0.5', async () => {
      const { router, setProviderState } = await createRouterService();
      setProviderState({
        groq: { avgTTFT: 50 },
        gemini: { avgTTFT: 500 },
      });
      const w = router.getLatencyBalancedWeights();
      expect(w.ttft).toBe(0.7);
      expect(w.tps).toBe(0.15);
      expect(w.reliability).toBe(0.15);
    });

    it('should return extreme ttft weights when variance > 1.0', async () => {
      const { router, setProviderState } = await createRouterService();
      setProviderState({
        groq: { avgTTFT: 50 },
        gemini: { avgTTFT: 80 },
        openrouter: { avgTTFT: 4000 },
      });
      const w = router.getLatencyBalancedWeights();
      expect(w.ttft).toBe(0.85);
      expect(w.tps).toBe(0.1);
      expect(w.reliability).toBe(0.05);
    });

    it('should use window averages when available', async () => {
      const { router, setProviderState, recordLatencies } = await createRouterService();
      setProviderState({
        groq: { avgTTFT: 100 },
        gemini: { avgTTFT: 100 },
      });
      recordLatencies([
        { provider: 'groq', latency: 50 },
        { provider: 'gemini', latency: 600 },
      ]);
      const w = router.getLatencyBalancedWeights();
      expect(w.ttft).toBeGreaterThan(0.4);
    });
  });

  describe('latency penalty in scoring', () => {
    it('should apply latency penalty to providers exceeding 1.5x median', async () => {
      const { router, setProviderState, mockKeyService, mockKernel, recordLatencies } = await createRouterService();

      setProviderState({
        groq: { avgTTFT: 50 },
        gemini: { avgTTFT: 500 },
        openrouter: { avgTTFT: 100 },
      });

      recordLatencies([
        { provider: 'groq', latency: 50 },
        { provider: 'gemini', latency: 500 },
        { provider: 'openrouter', latency: 100 },
      ]);

      mockKeyService.getKeys.mockReturnValue([
        { id: 'key-1', provider: 'Groq', status: 'active', key: 'k1', label: 'Groq Key', stats: { successCount: 100, errorCount: 0, totalTokens: 0, avgLatency: 50, minLatency: 30, maxLatency: 100 }, availableModels: ['llama-3.3-70b'] },
        { id: 'key-2', provider: 'Gemini', status: 'active', key: 'k2', label: 'Gemini Key', stats: { successCount: 100, errorCount: 0, totalTokens: 0, avgLatency: 500, minLatency: 400, maxLatency: 600 }, availableModels: ['gemini-3.1-flash-lite'] },
        { id: 'key-3', provider: 'OpenRouter', status: 'active', key: 'k3', label: 'OR Key', stats: { successCount: 100, errorCount: 0, totalTokens: 0, avgLatency: 100, minLatency: 80, maxLatency: 120 }, availableModels: ['claude-3.5-sonnet'] },
      ]);

      const ranked = router.getRankedProviders('auto', 'test prompt', 'normal');
      const rankedProviders = ranked.map(k => k.provider);
      expect(rankedProviders[0]).toBe('Groq');
      expect(rankedProviders[1]).toBe('OpenRouter');
      expect(rankedProviders[2]).toBe('Gemini');
    });

    it('should not apply penalty when latency is at or below median', async () => {
      const { router, setProviderState, mockKeyService, recordLatencies } = await createRouterService();

      setProviderState({
        groq: { avgTTFT: 50 },
        gemini: { avgTTFT: 60 },
      });

      recordLatencies([
        { provider: 'groq', latency: 50 },
        { provider: 'gemini', latency: 60 },
      ]);

      mockKeyService.getKeys.mockReturnValue([
        { id: 'key-1', provider: 'Groq', status: 'active', key: 'k1', label: 'Groq Key', stats: { successCount: 100, errorCount: 0, totalTokens: 0, avgLatency: 50, minLatency: 30, maxLatency: 100 }, availableModels: ['llama-3.3-70b'] },
        { id: 'key-2', provider: 'Gemini', status: 'active', key: 'k2', label: 'Gemini Key', stats: { successCount: 100, errorCount: 0, totalTokens: 0, avgLatency: 60, minLatency: 40, maxLatency: 80 }, availableModels: ['gemini-3.1-flash-lite'] },
      ]);

      const ranked = router.getRankedProviders('auto', 'test', 'normal');
      expect(ranked.length).toBe(2);
    });
  });

  describe('key:latency-burst handler', () => {
    it('should record latency and recalculate weights on burst', async () => {
      const { router, mockKernel, triggerBurst } = await createRouterService();
      triggerBurst({ id: 'key-1', provider: 'Groq', latency: 500 });
      expect((router as any).latencyWindows.get('groq')).toEqual([500]);
      expect(mockKernel.setBaseWeights).toHaveBeenCalled();
    });
  });

  describe('checkLatencyHealth', () => {
    it('should not check when fewer than 2 providers', async () => {
      const { router, setProviderState, mockEventBus } = await createRouterService();
      setProviderState({ groq: { avgTTFT: 100 } });
      (router as any).checkLatencyHealth();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('system:notification', expect.anything());
    });

    it('should emit notification for degraded providers', async () => {
      const { router, setProviderState, mockEventBus, recordLatencies } = await createRouterService();
      setProviderState({
        groq: { avgTTFT: 50 },
        gemini: { avgTTFT: 500 },
      });
      recordLatencies([
        { provider: 'groq', latency: 50 },
        { provider: 'gemini', latency: 500 },
      ]);
      (router as any).checkLatencyHealth();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'system:notification',
        expect.objectContaining({ type: 'warning' }),
      );
    });
  });

  describe('stopMonitoring', () => {
    it('should clean up all listeners and interval', async () => {
      const { router, mockKernel } = await createRouterService();
      router.stopMonitoring();
      expect(mockKernel.setBaseWeights).not.toHaveBeenCalled();
    });
  });
});
