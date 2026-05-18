import type { ApiKey } from '../../types/metrics-types';

export interface KeyAnalyticsDeps {
  pricingService: {
    calculateCost: (model: string, inputTokens: number, outputTokens: number) => number;
  };
  eventBus: {
    emit: (event: string, data?: unknown) => void;
  };
  onLatencyBurst: (id: string, provider: string, latency: number) => void;
  onStateChanged: (id: string, provider: string, newState: string, previousState: string) => void;
  onReputationThresholdCrossed: (id: string, provider: string, score: number) => void;
  ensureExtendedStats: (key: ApiKey) => void;
}

export class KeyAnalytics {
  constructor(private deps: KeyAnalyticsDeps) {}

  recordUsage(
    key: ApiKey,
    latency: number,
    tokens: number,
    model?: string,
    extra?: Record<string, unknown>
  ): void {
    if (!key.stats) return;
    this.deps.ensureExtendedStats(key);
    const stats = key.stats;
    const ext = key.stats.extended;

    const extExtra = extra as
      | { tps?: number; ttft?: number; fullContent?: string; inputTokens?: number; outputTokens?: number; task?: string }
      | undefined;
    const tps = extExtra?.tps || 0;

    stats.successCount++;
    stats.totalTokens += tokens;
    if (model) stats.lastModel = model;

    if (stats.minLatency === 0 || latency < stats.minLatency) stats.minLatency = latency;
    if (latency > stats.maxLatency) stats.maxLatency = latency;

    stats.avgLatency =
      stats.avgLatency === 0
        ? latency
        : Math.round(stats.avgLatency * 0.7 + latency * 0.3);

    if (ext.coldStartLatency === 0) ext.coldStartLatency = latency;
    else ext.warmStartLatency = ext.warmStartLatency * 0.8 + latency * 0.2;

    if (latency > ext.warmStartLatency * 2 && ext.warmStartLatency > 0) {
      this.deps.onLatencyBurst(key.id, key.provider, latency);
    }

    ext.latencyBreakdown = {
      ttft: extExtra?.ttft ?? latency * 0.4,
      total: latency,
      tokensPerSec: tps,
    };

    ext.rateLimitPressure =
      ext.rateLimitPressure * 0.8 +
      (ext.currentConcurrentRequests / ext.rules.maxConcurrentRequests) * 0.2;
    ext.stabilityIndex = Math.min(
      1.0,
      ext.stabilityIndex * 0.95 + (latency < ext.rules.timeoutMs ? 0.05 : 0)
    );

    const today = new Date().toDateString();
    const lastUpdate = ext.lastUsageDate;
    const currentMonth = new Date().getMonth();
    const lastMonthUpdate = ext.lastUsageDate ? new Date(ext.lastUsageDate).getMonth() : -1;

    if (lastUpdate !== today) {
      ext.usageToday = { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 };
      ext.hourlyUsage = new Array(24).fill(0);
      ext.lastUsageDate = today;
    }

    if (currentMonth !== lastMonthUpdate) {
      ext.usageMonthly = { tokens: 0, requests: 0, estimatedCost: 0 };
    }

    const currentHour = new Date().getHours();
    ext.hourlyUsage[currentHour] = (ext.hourlyUsage[currentHour] || 0) + 1;

    ext.usageToday.tokens += tokens;
    ext.usageToday.requests += 1;
    ext.usageMonthly.tokens += tokens;
    ext.usageMonthly.requests += 1;

    const inputTokens = extExtra?.inputTokens || Math.round(tokens * 0.3);
    const outputTokens = extExtra?.outputTokens || tokens;
    const sessionCost = this.deps.pricingService.calculateCost(
      model || key.stats.lastModel || 'default',
      inputTokens,
      outputTokens
    );

    ext.estimatedCost += sessionCost;
    ext.usageToday.estimatedCost += sessionCost;
    ext.usageMonthly.estimatedCost += sessionCost;

    ext.fourSignals.latency = ext.fourSignals.latency * 0.9 + latency * 0.1;
    ext.fourSignals.throughput = ext.fourSignals.throughput * 0.7 + tps * 0.3;
    ext.fourSignals.saturation = ext.currentConcurrentRequests / ext.rules.maxConcurrentRequests;
  }

  updateMetricsFromResponse(
    key: ApiKey,
    res: {
      keyId?: string;
      provider: string;
      status: string;
      error?: string;
      latency?: number;
      ttft?: number;
      tokens?: number | { total?: number };
      tps?: number;
    }
  ): void {
    if (!key || !key.stats || !key.stats.extended) return;
    this.deps.ensureExtendedStats(key);
    const ext = key.stats.extended;

    if (res.status === 'error') {
      key.stats.errorCount++;
      const errorMsg = res.error || 'Unknown error';

      const isRateLimit =
        errorMsg.includes('429') ||
        errorMsg.toLowerCase().includes('quota') ||
        errorMsg.toLowerCase().includes('rate limit');

      if (isRateLimit) {
        this.deps.eventBus.emit(EVENTS.KEY_QUOTA_EXCEEDED, {
          id: key.id,
          provider: key.provider,
          quotaType: 'requests',
        });
      }

      ext.errorBreakdown.provider = (ext.errorBreakdown.provider ?? 0) + 1;
    } else if (res.status === 'done') {
      key.stats.successCount++;

      if (res.latency) {
        key.stats.avgLatency =
          (key.stats.avgLatency * (key.stats.successCount - 1) + res.latency) /
          key.stats.successCount;
        key.latency = res.latency;
        ext.latencyBreakdown.total = res.latency;
        if (res.ttft) ext.latencyBreakdown.ttft = res.ttft;
      }

      if (res.tokens) {
        const tokens = typeof res.tokens === 'number' ? res.tokens : res.tokens?.total || 0;
        key.stats.totalTokens += tokens;
        ext.usageToday.tokens += tokens;
        const cost = (tokens / 1000) * 0.01;
        ext.estimatedCost += cost;
        ext.usageToday.estimatedCost += cost;
      }

      if (res.tps) ext.latencyBreakdown.tokensPerSec = res.tps;

      const tokensCount = typeof res.tokens === 'number' ? res.tokens : res.tokens?.total || 0;
      ext.throughputHistory = [
        ...(ext.throughputHistory || []),
        { timestamp: Date.now(), latency: res.latency || 0, tokens: tokensCount },
      ].slice(-20);

      this.calculateReputation(key);
    }
  }

  calculateReputation(key: ApiKey): void {
    if (!key.stats?.extended) return;
    const stats = key.stats;
    const ext = key.stats.extended;

    const successRate = stats.successCount / (stats.successCount + stats.errorCount || 1);
    const latencyFactor = Math.max(0, 1 - stats.avgLatency / 5000);

    const prevScore = ext.reputationScore;
    ext.reputationScore = Math.floor((successRate * 0.7 + latencyFactor * 0.3) * 100);

    if (ext.reputationScore < 40) ext.state = 'DEGRADED';
    else if (ext.reputationScore < 80) ext.state = 'UNSTABLE';
    else ext.state = 'HEALTHY';

    if (prevScore && Math.abs(ext.reputationScore - prevScore) > 20) {
      this.deps.onReputationThresholdCrossed(key.id, key.provider, ext.reputationScore);
    }
  }

  recalculateAllReputations(keys: ApiKey[]): void {
    for (const key of keys) {
      this.calculateReputation(key);
    }
  }

  incrementConcurrency(key: ApiKey): void {
    if (key.stats?.extended) {
      key.stats.extended.currentConcurrentRequests++;
    }
  }

  decrementConcurrency(key: ApiKey): void {
    if (key.stats?.extended) {
      key.stats.extended.currentConcurrentRequests = Math.max(
        0,
        key.stats.extended.currentConcurrentRequests - 1
      );
    }
  }

  resetKeyStats(key: ApiKey): void {
    if (!key.stats) return;
    key.stats = {
      successCount: 0,
      errorCount: 0,
      totalTokens: 0,
      avgLatency: 0,
      minLatency: 0,
      maxLatency: 0,
      extended: {
        reputationScore: 100,
        stabilityForecast: 'stable',
        fingerprint: crypto.randomUUID().slice(0, 6),
        state: 'HEALTHY',
        activeSLA: 'BALANCED',
        stabilityIndex: 1,
        retryImpactScore: 0,
        rateLimitPressure: 0,
        keyAgeScore: 1,
        latencyBreakdown: { ttft: 0, total: 0, tokensPerSec: 0 },
        coldStartLatency: 0,
        warmStartLatency: 0,
        throughputHistory: [],
        errorBreakdown: { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0, provider: 0 },
        estimatedCost: 0,
        tokenEfficiency: 1,
        contextUtilization: 0,
        retentionCurve: [],
        userPreferenceScore: 0.5,
        manualSwitches: 0,
        cancellations: 0,
        traces: [],
        fourSignals: { latency: 0, throughput: 0, errorRate: 0, saturation: 0 },
        rules: {
          maxConcurrentRequests: 5,
          retryPolicy: { maxAttempts: 3, backoffMs: 1000 },
          timeoutMs: 30000,
          quota: { tokensPerDay: 1000000, requestsPerDay: 1000 },
          slaThresholds: { latencyP95: 2000, errorFloor: 0.05 },
        },
        learning: {
          specialization: [],
          performanceByTask: {},
          taskMatrix: {},
          advisorInsights: { recommendedFor: [], avoidFor: [], confidence: 0 },
          lastFiveResults: [],
        },
        currentConcurrentRequests: 0,
        usageToday: { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 },
        usageMonthly: { tokens: 0, requests: 0, estimatedCost: 0 },
        alerts: [],
        lastUsageDate: new Date().toDateString(),
        hourlyUsage: new Array(24).fill(0),
      },
    };
  }
}

import { EVENTS } from '../../events/event-names';
