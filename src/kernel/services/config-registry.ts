import type { ConfigRegistry } from '../contracts/config-registry';

const rawConfig: ConfigRegistry = {
  version: '1.0.0',
  buildId: 'a9f3b2c',

  router: {
    history: { maxDecisions: 100 },
    latency: { slidingWindowSize: 10, monitorIntervalMs: 30000, degradationRatio: 1.5 },
    scoring: {
      ttftMaxMs: 2000, tpsMax: 100, reliabilityFloor: 0.4,
      stabilityBonus: 0.1, reputationBonus: 0.1, keyReputationBonus: 0.15,
      latencyPenalty: { thresholdRatio: 1.5, max: 0.3, slope: 0.2 },
      costPenalty: { scalar: 100 },
    },
    classification: {
      shortThreshold: 500, mediumThreshold: 2000, complexThreshold: 2000, longThreshold: 4000,
      codePatterns: '(function|class|const|import|export|def |```|SELECT|CREATE TABLE|async |await )',
      reasoningPatterns: '(why|explain|analyze|compare|contrast|what if|how does|reason|think step|solve)',
      multimodalPatterns: '(image|picture|photo|diagram|chart|graph|visual|render|draw)',
    },
    defaultWeights: { ttft: 0.4, tps: 0.3, reliability: 0.3 },
    strategyWeights: {
      broadcast: { ttft: 0.33, tps: 0.33, reliability: 0.34 },
      performance: { ttft: 0.1, tps: 0.7, reliability: 0.2 },
      reliability: { ttft: 0.1, tps: 0.1, reliability: 0.8 },
      latency: { ttft: 0.8, tps: 0.0, reliability: 0.2 },
      auto: { ttft: 0.4, tps: 0.2, reliability: 0.4 },
      race: { ttft: 0.9, tps: 0.0, reliability: 0.1 },
      cost: { ttft: 0.2, tps: 0.3, reliability: 0.5 },
      content: { ttft: 0.4, tps: 0.2, reliability: 0.4 },
      freeFirst: { ttft: 0.1, tps: 0.1, reliability: 0.8 },
    },
    autoDynamicAdjustment: {
      short: { ttftDelta: 0.2, tpsDelta: -0.1, reliabilityDelta: 0.1 },
      long: { ttftDelta: -0.2, tpsDelta: 0.3, reliabilityDelta: 0.1 },
    },
    latencyVarianceBands: [
      { minVariance: 1.0, weights: { ttft: 0.85, tps: 0.1, reliability: 0.05 } },
      { minVariance: 0.5, weights: { ttft: 0.7, tps: 0.15, reliability: 0.15 } },
      { minVariance: 0.25, weights: { ttft: 0.5, tps: 0.25, reliability: 0.25 } },
    ],
    weights: {
      default: { ttft: 0.4, tps: 0.3, reliability: 0.3 },
      performance: { ttft: 0.1, tps: 0.7, reliability: 0.2 },
      reliability: { ttft: 0.1, tps: 0.1, reliability: 0.8 },
      latency: { ttft: 0.8, tps: 0.0, reliability: 0.2 },
      cost: { ttft: 0.1, tps: 0.3, reliability: 0.1 },
      freeFirst: { ttft: 0.1, tps: 0.1, reliability: 0.8 },
      race: { ttft: 0.9, tps: 0.0, reliability: 0.1 },
      broadcast: { ttft: 0.33, tps: 0.33, reliability: 0.34 },
      content: { ttft: 0.2, tps: 0.1, reliability: 0.2 },
    },
    decisionHistoryDefaultLimit: 20,
    raceCandidateCount: 2,
    budgetPenalty: {
      thresholds: [
        { pct: 1, penalty: 100 }, { pct: 0.9, penalty: 50 }, { pct: 0.8, penalty: 20 },
      ],
    },
    costEstimate: { tokenDivisor: 4, outputMultiplier: 2, per1kDivisor: 1000 },
    affinity: {
      multimodal: { gemini: 0.5, openrouter: 0.3 },
      code: { gemini: 0.3, openrouter: 0.3, groq: 0.2 },
      longPrompt: { minLength: 8000, values: { gemini: 0.4, openrouter: 0.2 } },
      shortPrompt: { maxLength: 200, values: { groq: 0.3, gemini: 0.15 } },
      complexity: {
        complex: { openrouter: 0.3, gemini: 0.2 },
        simple: { groq: 0.25 },
      },
    },
    priority: {
      high: { groq: 0.4, gemini: 0.2 },
      low: { groq: -0.2 },
    },
    providerByComplexity: {
      multimodal: { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
      long: { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
      complexCode: { provider: 'gemini', model: 'gemini-3.1-pro' },
      complex: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
      medium: { provider: 'groq', model: 'llama-3.3-70b' },
      default: { provider: 'groq', model: 'llama-3.1-8b' },
    },
  },

  monitoring: {
    healthCheckStaleIntervalMs: 10000,
    healthThresholds: { healthy: 0.8, degraded: 0.5 },
    latencyPenalty: { thresholdMs: 3000, cap: 0.3, divisor: 20000 },
    errorRatePenalty: { threshold: 0.1, cap: 0.3, multiplier: 0.5 },
    successRatePenalty: { floor: 0.9, multiplier: 0.5 },
    alertPenalty: { perAlert: 0.1, cap: 0.3 },
  },

  metrics: {
    maxHistoryPoints: 1000,
    autoCaptureIntervalMs: 30000,
    defaultReportLimit: 100,
    defaultThresholds: {
      avgLatency: { warning: 3000, critical: 8000 },
      errorRate: { warning: 0.1, critical: 0.25 },
      successRate: { warning: 0.9, critical: 0.75 },
      totalTokens: { warning: 500000, critical: 1000000 },
    },
  },

  traces: {                 // RETENTION: in-memory + DB limited to 200 entries
    maxEntries: 200,        // max traces kept in memory; older entries evicted
    dbLoadLimit: 200,       // max traces loaded from IndexedDB on init
    tokenEstimateDivisor: 4, // APPROXIMATION: len/4 used when real token count unavailable
  },

  webhooks: {
    maxRetries: 3,
    retryDelayMs: 2000,
    timeoutMs: 10000,
    discordContentMaxLength: 2000,
    discordEmbedDescMaxLength: 4096,
    providers: ['slack', 'telegram'],
    eventOptions: [
      'system:notification',
      'key:quota:exceeded',
      'policy:violation',
      'key:state:changed',
      'chat:stream:error',
    ],
  },

  keys: {
    freeTierLimits: {
      Groq: { requestsPerDay: 14400, tokensPerDay: 700000 },
      Gemini: { requestsPerDay: 1500, tokensPerDay: 1000000 },
    },
    defaultRules: {
      maxConcurrentRequests: 5,
      retryPolicy: { maxAttempts: 3, backoffMs: 1000 },
      timeoutMs: 30000,
      quota: { tokensPerDay: 1000000, requestsPerDay: 1000 },
      slaThresholds: { latencyP95: 2000, errorFloor: 0.05 },
    },
    healthCheckTimeoutMs: 5000,
    rateLimitSpikeWindowMs: 60000,
    rateLimitSpikeThreshold: 3,
    initialBackoffMs: 1000,
    maxBackoffMs: 120000,
    slaProfiles: {
      LOW_LATENCY: { timeoutMs: 5000, latencyP95: 1200 },
      HIGH_QUALITY: { timeoutMs: 60000, latencyP95: 5000 },
      FREE_FIRST: { timeoutMs: 60000, latencyP95: 5000 },
      DEFAULT: { timeoutMs: 30000, latencyP95: 2000 },
    },
  },

  llm: {
    retry: { maxRetries: 3, baseDelayMs: 1000 },
    circuitBreaker: { failureThreshold: 5, successThreshold: 2, openTimeoutMs: 30000, halfOpenMaxRequests: 1 },
    rateLimiter: { maxTokens: 60, refillRate: 60, refillIntervalMs: 60000 },
    cache: { defaultTTLMs: 60000, maxEntries: 100 },
    priorityQueue: { maxConcurrency: 4, lowPriorityDelayMs: 200, maxQueueSize: 1000 },
    tokenEstimateDivisor: 4,
    pricing: {
      'gpt-4o': { inputPer1K: 0.005, outputPer1K: 0.015 },
      'gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
      'claude-3-haiku': { inputPer1K: 0.00025, outputPer1K: 0.00125 },
      'claude-3-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
      'gemini-3.1-flash-lite': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
      'gemini-2.5-flash': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
      'gemini-2.5-flash-lite': { inputPer1K: 0.0001, outputPer1K: 0.0004 },
    },
    pricingFallback: { inputPer1K: 0.002, outputPer1K: 0.008 },
    costRecordMax: 100000,
    costRecordTrimTo: 50000,
  },

  pressure: {
    levelThresholds: { critical: 80, high: 60, medium: 35, low: 10 },
    formulaWeights: {
      status: 0.25, reliability: 0.15, quotaPct: 0.20, budgetPct: 0.10,
      errorRate: 0.10, saturation: 0.10, latencySignal: 0.10,
    },
    autoRefreshIntervalMs: 10000,
  },

  pricing: {
    fallbackPricing: {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'claude-2': { input: 0.008, output: 0.024 },
      'gemini-3.1-flash-lite': { input: 0.00015, output: 0.0006 },
      'gemini-2.5-flash': { input: 0.00015, output: 0.0006 },
      'gemini-2.5-flash-lite': { input: 0.0001, output: 0.0004 },
      'gemini-2.0-flash-lite': { input: 0.00008, output: 0.0003 },
      'mistral-large': { input: 0.004, output: 0.012 },
      'mistral-medium': { input: 0.00275, output: 0.0081 },
      'mistral-small': { input: 0.001, output: 0.003 },
      'llama-3-70b': { input: 0.00059, output: 0.00079 },
      'llama-3-8b': { input: 0.00006, output: 0.00008 },
      'mixtral-8x7b': { input: 0.00027, output: 0.00027 },
      'deepseek-chat': { input: 0.00014, output: 0.00028 },
      'deepseek-reasoner': { input: 0.00055, output: 0.00219 },
      'cohere-command-r+': { input: 0.003, output: 0.015 },
      'cohere-command-r': { input: 0.0005, output: 0.0015 },
      'openrouter-auto': { input: 0.001, output: 0.003 },
      'fireworks-default': { input: 0.0002, output: 0.0004 },
    },
    defaultMonthlyBudget: 50,
    cacheTTLMs: 3600000,
    prefixCacheMaxSize: 500,
    perTokenDivisor: 1000000,
    costHistoryMax: 500,
    defaultEstimatedOutputTokens: 256,
  },

  services: {
    advisor: {
      latencyThreshold: 4000, costThreshold: 10,
      minConfidence: 0.7, analysisIntervalMs: 60000,
    },
    diagnostics: {
      providerErrorHistoryLimit: 20,
      recentErrorWindowMs: 300000,
      escalationRecentCount: 5,
      activeKeyScaleTarget: 3,
      quotaCriticalPct: 90,
      quotaWarningPct: 70,
      latencyCriticalMs: 3000,
      latencyWarningMs: 1000,
      rateLimitWarningCount: 5,
      timeoutCriticalCount: 3,
      successRateMinRequests: 10,
      successRateCritical: 0.7,
      successRateWarning: 0.9,
    },
    debate: {
      maxRetries: 3, baseBackoffMs: 5000, maxBackoffMs: 30000,
      debateTimeoutMs: 30000, roundDelayMs: 3000, maxTokens: 500,
      temperature: 0.7, timeoutMs: 30000, timelineMaxEntries: 5000,
    },
    cache: { defaultTTLMs: 300000, maxEntries: 500 },
    toolExecutor: { maxHistory: 200, defaultTimeoutMs: 10000 },
    sandbox: { fetchTimeoutMs: 10000, codeExecutionTimeoutMs: 5000 },
    mcp: { safeFetchTimeoutMs: 5000 },
    logger: { maxBuffer: 500 },
    admin: { maxAuditEntries: 5000 },
    timeline: { maxEvents: 5000 },
    usageTracker: { maxRecords: 10000, debounceMs: 2000 },
    eventRecorder: { maxEvents: 10000 },
    policy: { maxViolations: 200 },
    pressureMap: { maxTrendHistory: 200, alertCooldownMs: 60000, alertsBufferSize: 100 },
    whatif: { maxHistory: 100 },
    keyService: { introspectionTimeoutMs: 10000 },
    providerInstance: { healthCheckIntervalMs: 30000 },
    memory: { semanticEnabled: true, autoEmbedOnStore: true },
  },
};

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  for (const value of Object.values(obj as Record<string, unknown>)) deepFreeze(value);
  return Object.freeze(obj) as T;
}

/** Frozen public API — all mutations must go through the config service. */
export const CONFIG: Readonly<ConfigRegistry> = deepFreeze(rawConfig);

/** Replace entire rawConfig with a new snapshot (used by config-history rollback). */
export function replaceConfig(next: ConfigRegistry): void {
  const mutableRaw = rawConfig as unknown as Record<string, unknown>;
  const mutableNext = next as unknown as Record<string, unknown>;
  for (const key of Object.keys(rawConfig)) delete mutableRaw[key];
  for (const key of Object.keys(next)) mutableRaw[key] = mutableNext[key];
}

/** Update a single top-level section in rawConfig (used by config-service). */
export function setConfig<K extends keyof ConfigRegistry>(key: K, value: ConfigRegistry[K]): void {
  (rawConfig as unknown as Record<string, unknown>)[key as string] = value;
}
