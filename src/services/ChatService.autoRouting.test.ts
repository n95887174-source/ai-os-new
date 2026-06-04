import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiKey } from '../types/metrics';

const mockKeyObj: ApiKey = {
  id: 'test-key-1',
  provider: 'Gemini',
  key: 'mock-key-value',
  label: 'Test Key',
  status: 'active',
  availableModels: ['gemini-3.1-flash-lite'],
  stats: {
    successCount: 10,
    errorCount: 0,
    totalTokens: 5000,
    avgLatency: 200,
    minLatency: 150,
    maxLatency: 300,
    extended: {
      coldStartLatency: 100,
      warmStartLatency: 50,
      throughputHistory: [],
      stabilityIndex: 0.95,
      retryImpactScore: 0.1,
      rateLimitPressure: 0,
      keyAgeScore: 1,
      estimatedCost: 0.01,
      tokenEfficiency: 0.9,
      contextUtilization: 0.5,
      retentionCurve: [],
      reputationScore: 100,
      stabilityForecast: 'stable',
      fingerprint: 'test-fp',
      state: 'active',
      activeSLA: 'BALANCED',
      traces: [],
      quality: { coherence: 0.9, relevance: 0.9, fluency: 0.9, instructionFollowing: 0.9 },
      streaming: { avgChunkTime: 10, chunkCount: 10, ttfb: 50 },
      usageToday: { tokens: 100, weightedTokens: 100, requests: 5, estimatedCost: 0.001 },
      usageMonthly: { tokens: 1000, requests: 50, estimatedCost: 0.01 },
      latencyBreakdown: { ttft: 50, total: 200, tokensPerSec: 50 },
      errorBreakdown: { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0, provider: 0 },
      fourSignals: { latency: 0.1, throughput: 0.8, errorRate: 0, saturation: 0.1 },
      rules: {
        maxConcurrentRequests: 5,
        retryPolicy: { maxAttempts: 3, backoffMs: 1000 },
        timeoutMs: 30000,
        quota: { tokensPerDay: 1000000, requestsPerDay: 1000 },
        slaThresholds: { latencyP95: 2000, errorFloor: 0.05 },
      },
      hourlyUsage: new Array(24).fill(0),
      userPreferenceScore: 0.5,
      manualSwitches: 0,
      cancellations: 0,
    },
  },
};

const mockLLMResponse = {
  content: 'Test response',
  latency: 100,
  tokens: 50,
  ttft: 40,
  tps: 500,
  cost: 0.001,
  model: 'gemini-3.1-flash-lite',
  provider: 'Gemini',
  finishReason: 'stop',
};

const mockSettings = {
  notifications: true,
  autoHealthCheck: true,
  defaultMode: 'smart' as const,
  streamingEnabled: false,
  historyPersistence: true,
  fallbackEnabled: true,
  debugMode: false,
  theme: 'dark' as const,
  language: 'en' as const,
  explorationFactor: 0.1,
  slaMode: 'BALANCED' as const,
  themeConfig: { mode: 'dark' as const, primaryColor: '#3b82f6', accentColor: '#a855f7', fontFamily: 'Inter', borderRadius: 12, reducedMotion: false, highContrast: false },
  notificationPrefs: { enabled: true, healthAlerts: true, routingDecisions: false, policyViolations: true, agentEvents: false, errorsOnly: false, soundEnabled: false },
  dataManagement: { autoSaveInterval: 10000, maxHistoryEntries: 500, maxTraceEntries: 200, pruneMemoriesAfterDays: 30, exportOnShutdown: false },
  sidebarCollapsed: false,
  telemetryEnabled: true,
  autoUpdateCheck: true,
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

vi.mock('../utils/tokenEstimate', () => ({ estimateTokens: vi.fn(() => 100) }));

vi.mock('./KeyService', () => ({
  keyService: {
    selectFromPool: vi.fn(() => mockKeyObj),
    getKeys: vi.fn(() => [mockKeyObj]),
    recordUsage: vi.fn(),
    updateKeyStatus: vi.fn(),
    handleProviderError: vi.fn(),
    getPoolKeys: vi.fn(() => [mockKeyObj]),
    canUseKey: vi.fn(() => ({ can: true, reason: null })),
  },
  FREE_TIER_LIMITS: {},
}));

vi.mock('./RouterService', () => ({
  routerService: {
    getRankedProviders: vi.fn(() => [mockKeyObj]),
    resolveWithFallback: vi.fn(() => null),
    getDowngradedModel: vi.fn(() => null),
    getDeepDowngradedModel: vi.fn(() => null),
  },
}));

vi.mock('./SettingsService', () => ({
  settingsService: {
    getSettings: vi.fn(() => mockSettings),
  },
}));

vi.mock('./CacheService', () => ({
  cacheService: {
    generateKey: vi.fn(() => 'test-cache-key'),
    get: vi.fn(() => null),
    set: vi.fn(),
  },
}));

vi.mock('../llm/facade/llm-client', () => ({
  LLMClient: class {
    chat = vi.fn().mockResolvedValue(mockLLMResponse);
  },
}));

vi.mock('../kernel/events/event-bus', () => ({
  eventBus: mockEventBus,
  EVENTS: {
    SEND_MESSAGE: 'chat:send',
    CANCEL_MESSAGE: 'chat:cancel',
    MESSAGE_RESPONSE: 'chat:response',
    NOTIFICATION: 'system:notification',
    KEY_QUOTA_EXCEEDED: 'key:quota_exceeded',
    KEY_LATENCY_BURST: 'key:latency_burst',
    KEY_HEALTH_FAILED: 'key:health_failed',
    KEY_REPUTATION_DOWN: 'key:reputation_threshold_crossed',
    KEY_STATE_CHANGED: 'key:state_changed',
    KEY_UPDATED: 'key:updated',
  },
}));

describe('ChatService auto-routing', () => {
  let chatService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.keys(eventHandlers).forEach(k => delete eventHandlers[k]);
    const { ChatService } = await import('./ChatService');
    const { keyService } = await import('./KeyService');
    const { routerService } = await import('./RouterService');
    const { settingsService } = await import('./SettingsService');
    const { cacheService } = await import('./CacheService');

    const deps = {
      eventBus: mockEventBus,
      keyService,
      virtualKeyService: {
        resolve: vi.fn(),
      },
      settingsService,
      routerService,
      cacheService,
      policyService: {
        checkAgentPolicy: vi.fn(() => ({ allowed: true })),
      },
      freeTierLimits: {},
    };
    chatService = new ChatService(deps as any);
    await chatService.init();
  });

  afterEach(() => {
    if (chatService) chatService.destroy();
  });

  function waitForResponse(timeoutMs = 3000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for chat:response')), timeoutMs);
      const unsub = mockEventBus.on('chat:response', (res: any) => {
        clearTimeout(timer);
        unsub();
        resolve(res);
      });
    });
  }

  it('should call getRankedProviders with content strategy when provider is auto', async () => {
    const { routerService } = await import('./RouterService');
    const resPromise = waitForResponse();
    mockEventBus.emit('chat:send', {
      provider: 'auto',
      model: 'gemini-3.1-flash-lite',
      messages: [{ role: 'user', content: 'Hello, how are you?' }],
      requestId: 'test-auto-1',
    });
    const res = await resPromise;
    expect(routerService.getRankedProviders).toHaveBeenCalledWith('content', 'Hello, how are you?', undefined, undefined);
    expect(res.provider).toBe('Gemini');
    expect(res.status).toBe('done');
  });

  it('should call getRankedProviders when provider is undefined', async () => {
    const { routerService } = await import('./RouterService');
    const resPromise = waitForResponse();
    mockEventBus.emit('chat:send', {
      model: 'gemini-3.1-flash-lite',
      messages: [{ role: 'user', content: 'Write a poem' }],
      requestId: 'test-undefined-1',
    });
    const res = await resPromise;
    expect(routerService.getRankedProviders).toHaveBeenCalled();
    expect(res.provider).toBe('Gemini');
  });

  it('should pass priority to getRankedProviders', async () => {
    const { routerService } = await import('./RouterService');
    const resPromise = waitForResponse();
    mockEventBus.emit('chat:send', {
      provider: 'auto',
      model: 'gemini-3.1-flash-lite',
      messages: [{ role: 'user', content: 'Urgent request' }],
      requestId: 'test-priority-1',
      priority: 'high',
    });
    await resPromise;
    expect(routerService.getRankedProviders).toHaveBeenCalledWith('content', 'Urgent request', 'high', undefined);
  });

  it('should use top-ranked provider for routing', async () => {
    const { routerService } = await import('./RouterService');
    const secondKey: ApiKey = { ...mockKeyObj, id: 'key-2', provider: 'Groq' };
    (routerService.getRankedProviders as any).mockReturnValue([mockKeyObj, secondKey]);
    const resPromise = waitForResponse();
    mockEventBus.emit('chat:send', {
      provider: 'auto',
      model: 'llama-3.3-70b',
      messages: [{ role: 'user', content: 'Test' }],
      requestId: 'test-top-1',
    });
    const res = await resPromise;
    expect(res.provider).toBe('Gemini');
  });

  it('should emit error when getRankedProviders returns empty', async () => {
    const { routerService } = await import('./RouterService');
    (routerService.getRankedProviders as any).mockReturnValue([]);
    const resPromise = waitForResponse();
    mockEventBus.emit('chat:send', {
      provider: 'auto',
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello?' }],
      requestId: 'test-empty-1',
    });
    const res = await resPromise;
    expect(res.status).toBe('error');
    expect(res.error).toContain('No providers available');
  });

  it('should NOT call getRankedProviders when provider is explicitly set', async () => {
    const { routerService } = await import('./RouterService');
    const resPromise = waitForResponse();
    mockEventBus.emit('chat:send', {
      provider: 'Groq',
      model: 'llama-3.3-70b',
      messages: [{ role: 'user', content: 'Hello' }],
      requestId: 'test-explicit-1',
    });
    await resPromise;
    expect(routerService.getRankedProviders).not.toHaveBeenCalled();
  });

  it('should route to explicitly provided provider without auto-routing', async () => {
    const resPromise = waitForResponse();
    mockEventBus.emit('chat:send', {
      provider: 'OpenRouter',
      model: 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'user', content: 'Hello' }],
      requestId: 'test-explicit-provider-1',
    });
    const res = await resPromise;
    expect(res.provider).toBe('OpenRouter');
  });

  it('should concatenate all message contents for prompt text', async () => {
    const { routerService } = await import('./RouterService');
    const resPromise = waitForResponse();
    mockEventBus.emit('chat:send', {
      provider: 'auto',
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Tell me a joke.' },
        { role: 'assistant', content: 'Sure!' },
      ],
      requestId: 'test-concat-1',
    });
    await resPromise;
    expect(routerService.getRankedProviders).toHaveBeenCalledWith(
      'content',
      expect.stringContaining('You are a helpful assistant.'),
      undefined,
      undefined,
    );
    expect(routerService.getRankedProviders).toHaveBeenCalledWith(
      'content',
      expect.stringContaining('Tell me a joke.'),
      undefined,
      undefined,
    );
    expect(routerService.getRankedProviders).toHaveBeenCalledWith(
      'content',
      expect.stringContaining('Sure!'),
      undefined,
      undefined,
    );
  });
});
