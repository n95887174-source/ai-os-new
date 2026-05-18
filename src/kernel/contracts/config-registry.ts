export interface RouterConfigSection {
  history: { maxDecisions: number };
  latency: { slidingWindowSize: number; monitorIntervalMs: number; degradationRatio: number };
  scoring: {
    ttftMaxMs: number; tpsMax: number; reliabilityFloor: number;
    stabilityBonus: number; reputationBonus: number; keyReputationBonus: number;
    latencyPenalty: { thresholdRatio: number; max: number; slope: number };
    costPenalty: { scalar: number };
  };
  classification: {
    shortThreshold: number; mediumThreshold: number; complexThreshold: number; longThreshold: number;
  };
  weights: {
    default: { ttft: number; tps: number; reliability: number };
    performance: { ttft: number; tps: number; reliability: number };
    reliability: { ttft: number; tps: number; reliability: number };
    latency: { ttft: number; tps: number; reliability: number };
    cost: { ttft: number; tps: number; reliability: number };
    freeFirst: { ttft: number; tps: number; reliability: number };
    race: { ttft: number; tps: number; reliability: number };
    broadcast: { ttft: number; tps: number; reliability: number };
    content: { ttft: number; tps: number; reliability: number };
  };
  decisionHistoryDefaultLimit: number;
  raceCandidateCount: number;
  budgetPenalty: { thresholds: { pct: number; penalty: number }[] };
  costEstimate: { tokenDivisor: number; outputMultiplier: number; per1kDivisor: number };
  affinity: {
    multimodalProvider: string; multimodalBonus: number;
    longPromptMinLength: number; shortPromptMaxLength: number;
  };
  priority: {
    high: Record<string, number>; low: Record<string, number>;
  };
}

export interface MonitoringConfigSection {
  healthCheckStaleIntervalMs: number;
  healthThresholds: { healthy: number; degraded: number };
  latencyPenalty: { thresholdMs: number; cap: number; divisor: number };
  errorRatePenalty: { threshold: number; cap: number; multiplier: number };
  successRatePenalty: { floor: number; multiplier: number };
  alertPenalty: { perAlert: number; cap: number };
}

export interface MetricsConfigSection {
  maxHistoryPoints: number;
  autoCaptureIntervalMs: number;
  defaultReportLimit: number;
  defaultThresholds: {
    avgLatency: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
    successRate: { warning: number; critical: number };
    totalTokens: { warning: number; critical: number };
  };
}

export interface TracesConfigSection {
  maxEntries: number;
  dbLoadLimit: number;
  tokenEstimateDivisor: number;
}

export interface WebhooksConfigSection {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  discordContentMaxLength: number;
  discordEmbedDescMaxLength: number;
}

export interface KeysConfigSection {
  freeTierLimits: Record<string, { requestsPerDay: number; tokensPerDay: number }>;
  defaultRules: {
    maxConcurrentRequests: number;
    retryPolicy: { maxAttempts: number; backoffMs: number };
    timeoutMs: number;
    quota: { tokensPerDay: number; requestsPerDay: number };
    slaThresholds: { latencyP95: number; errorFloor: number };
  };
  healthCheckTimeoutMs: number;
  rateLimitSpikeWindowMs: number;
  rateLimitSpikeThreshold: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
}

export interface LlmConfigSection {
  retry: { maxRetries: number; baseDelayMs: number };
  circuitBreaker: { failureThreshold: number; successThreshold: number; openTimeoutMs: number; halfOpenMaxRequests: number };
  rateLimiter: { maxTokens: number; refillRate: number; refillIntervalMs: number };
  cache: { defaultTTLMs: number; maxEntries: number };
  priorityQueue: { maxConcurrency: number; lowPriorityDelayMs: number };
  tokenEstimateDivisor: number;
  pricing: Record<string, { inputPer1K: number; outputPer1K: number }>;
  pricingFallback: { inputPer1K: number; outputPer1K: number };
  costRecordMax: number;
  costRecordTrimTo: number;
}

export interface PressureConfigSection {
  levelThresholds: { critical: number; high: number; medium: number; low: number };
  formulaWeights: {
    status: number; reliability: number; quotaPct: number; budgetPct: number;
    errorRate: number; saturation: number; latencySignal: number;
  };
  autoRefreshIntervalMs: number;
}

export interface PricingConfigSection {
  fallbackPricing: Record<string, { input: number; output: number }>;
  defaultMonthlyBudget: number;
  cacheTTLMs: number;
  prefixCacheMaxSize: number;
  perTokenDivisor: number;
  costHistoryMax: number;
  defaultEstimatedOutputTokens: number;
}

export interface ConfigRegistry {
  version: string;
  router: RouterConfigSection;
  monitoring: MonitoringConfigSection;
  metrics: MetricsConfigSection;
  traces: TracesConfigSection;
  webhooks: WebhooksConfigSection;
  keys: KeysConfigSection;
  llm: LlmConfigSection;
  pressure: PressureConfigSection;
  pricing: PricingConfigSection;
}
