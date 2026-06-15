import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';
import type { KeyHealth } from './key-management/key-health';
import type { KeyStateStore } from './key-state-store';
import type { ProviderTracker } from './provider-tracker';

const LOGGER = rootLogger.child('HealthScore');

export interface HealthScoreInput {
  provider: string;
  keyId: string;
  recentErrors: number;
  recentSuccesses: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  quotaRemaining: number;
  quotaLimit: number;
  reputation: number;
  lastSuccessfulCall: number;
  lastFailedCall: number;
  consecutiveFailures: number;
  totalCalls: number;
}

export interface HealthScoreResult {
  keyId: string;
  provider: string;
  score: number;
  breakdown: {
    reliability: number;
    errorRate: number;
    latency: number;
    quotaHeadroom: number;
  };
  status: 'healthy' | 'degraded' | 'unhealthy';
  factors: string[];
  lastUpdated: number;
}

export interface HealthHistoryEntry {
  timestamp: number;
  score: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

const HEALTH_THRESHOLDS = {
  healthy: 70,
  degraded: 40,
};

const LATENCY_PENALTY_THRESHOLDS = {
  good: 500,
  ok: 2000,
  bad: 5000,
};

export interface HealthScoreServiceDeps {
  eventBus: { on: (event: string, cb: (...args: unknown[]) => void) => () => void };
  providerTracker: ProviderTracker;
  keyStateStore: KeyStateStore;
}

export class HealthScoreService {
  private scores: Map<string, HealthScoreResult> = new Map();
  private history: Map<string, HealthHistoryEntry[]> = new Map();
  private maxHistorySize = 168;
  private lastComputation = 0;
  private computationIntervalMs = 30000;
  private deps: HealthScoreServiceDeps;
  private unsubs: Array<() => void> = [];

  constructor(deps: HealthScoreServiceDeps) {
    this.deps = deps;
  }

  init(): void {
    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.KEY_PROBE_RESULT, ((result: { provider: string; keyId: string }) => {
        const key = `${result.provider}:${result.keyId}`;
        this.invalidateScore(key);
      }) as unknown as (data: unknown) => void),
    );

    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.KEYSTATE_UPDATED, ((state: { provider: string; keyId: string }) => {
        const key = `${state.provider}:${state.keyId}`;
        this.invalidateScore(key);
      }) as unknown as (data: unknown) => void),
    );

    LOGGER.info('HealthScoreService', 'Initialized');
  }

  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.scores.clear();
    this.history.clear();
  }

  private makeKey(provider: string, keyId: string): string {
    return `${provider}:${keyId}`;
  }

  private invalidateScore(key: string): void {
    this.scores.delete(key);
  }

  computeScore(input: HealthScoreInput): HealthScoreResult {
    const key = this.makeKey(input.provider, input.keyId);
    const now = Date.now();

    const reliability = this.computeReliability(input);
    const errorRate = this.computeErrorRate(input);
    const latencyScore = this.computeLatencyScore(input);
    const quotaHeadroom = this.computeQuotaHeadroom(input);

    const score = Math.round(
      0.4 * reliability +
      0.2 * errorRate +
      0.2 * latencyScore +
      0.2 * quotaHeadroom
    );

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (score >= HEALTH_THRESHOLDS.healthy) {
      status = 'healthy';
    } else if (score >= HEALTH_THRESHOLDS.degraded) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const factors: string[] = [];
    if (reliability < 50) factors.push('Low reliability (<50%)');
    if (errorRate < 50) factors.push('High error rate (>50%)');
    if (latencyScore < 50) factors.push('High latency');
    if (quotaHeadroom < 30) factors.push('Low quota headroom');
    if (input.consecutiveFailures > 3) factors.push(`${input.consecutiveFailures} consecutive failures`);
    if (input.lastFailedCall && (now - input.lastFailedCall) < 60000) factors.push('Recent failure (<1min)');

    const result: HealthScoreResult = {
      keyId: input.keyId,
      provider: input.provider,
      score,
      breakdown: {
        reliability,
        errorRate,
        latency: latencyScore,
        quotaHeadroom,
      },
      status,
      factors,
      lastUpdated: now,
    };

    this.scores.set(key, result);
    this.updateHistory(key, result);

    LOGGER.debug('HealthScoreService', 'Computed score', {
      key, score, status, reliability, errorRate,
      latency: latencyScore, quotaHeadroom,
    });

    return result;
  }

  private computeReliability(input: HealthScoreInput): number {
    if (input.totalCalls === 0) return 80;
    const timeSinceLastCall = Date.now() - Math.max(
      input.lastSuccessfulCall || 0,
      input.lastFailedCall || 0,
    );
    const recencyFactor = timeSinceLastCall < 300000 ? 1 :
      timeSinceLastCall < 3600000 ? 0.9 :
      timeSinceLastCall < 86400000 ? 0.7 : 0.5;

    const totalRecent = input.recentSuccesses + input.recentErrors;
    const successRate = totalRecent > 0
      ? (input.recentSuccesses / totalRecent) * 100
      : input.totalCalls > 0 ? 50 : 80;

    const failurePenalty = Math.min(30, input.consecutiveFailures * 10);
    return Math.max(0, Math.min(100, successRate * recencyFactor - failurePenalty));
  }

  private computeErrorRate(input: HealthScoreInput): number {
    const totalRecent = input.recentSuccesses + input.recentErrors;
    if (totalRecent === 0) return 90;
    const errorPct = (input.recentErrors / totalRecent) * 100;
    return Math.max(0, 100 - errorPct);
  }

  private computeLatencyScore(input: HealthScoreInput): number {
    if (input.avgLatencyMs === 0) return 100;
    if (input.avgLatencyMs < LATENCY_PENALTY_THRESHOLDS.good) return 100;
    if (input.avgLatencyMs < LATENCY_PENALTY_THRESHOLDS.ok) {
      const penalty = (input.avgLatencyMs - LATENCY_PENALTY_THRESHOLDS.good) /
        (LATENCY_PENALTY_THRESHOLDS.ok - LATENCY_PENALTY_THRESHOLDS.good);
      return Math.max(50, 100 - penalty * 30);
    }
    if (input.avgLatencyMs < LATENCY_PENALTY_THRESHOLDS.bad) {
      const penalty = (input.avgLatencyMs - LATENCY_PENALTY_THRESHOLDS.ok) /
        (LATENCY_PENALTY_THRESHOLDS.bad - LATENCY_PENALTY_THRESHOLDS.ok);
      return Math.max(20, 70 - penalty * 50);
    }
    return Math.max(0, 20 - Math.min(20, (input.avgLatencyMs - LATENCY_PENALTY_THRESHOLDS.bad) / 500));
  }

  private computeQuotaHeadroom(input: HealthScoreInput): number {
    if (!input.quotaLimit || input.quotaLimit === 0) return 100;
    if (!input.quotaRemaining) return 50;
    const usagePct = ((input.quotaLimit - input.quotaRemaining) / input.quotaLimit) * 100;
    return Math.max(0, 100 - usagePct);
  }

  private updateHistory(key: string, result: HealthScoreResult): void {
    if (!this.history.has(key)) {
      this.history.set(key, []);
    }
    const entries = this.history.get(key)!;
    entries.push({
      timestamp: result.lastUpdated,
      score: result.score,
      status: result.status,
    });
    if (entries.length > this.maxHistorySize) {
      this.history.set(key, entries.slice(-this.maxHistorySize));
    }
  }

  getScore(provider: string, keyId: string, forceRefresh = false): HealthScoreResult | null {
    const key = this.makeKey(provider, keyId);
    const cached = this.scores.get(key);

    if (forceRefresh) {
      return this.refreshScore(provider, keyId);
    }

    return cached || null;
  }

  refreshScore(provider: string, keyId: string): HealthScoreResult | null {
    return this.computeScoreFromState(provider, keyId);
  }

  private computeScoreFromState(provider: string, keyId: string): HealthScoreResult | null {
    const metrics = this.deps.providerTracker.getMetrics(provider, keyId);
    if (!metrics) return null;

    const input: HealthScoreInput = {
      provider,
      keyId,
      recentErrors: metrics.errors || 0,
      recentSuccesses: Math.max(0, (metrics.totalRequests || 0) - (metrics.errors || 0)),
      avgLatencyMs: metrics.avgLatency || 0,
      p95LatencyMs: metrics.avgLatency ? metrics.avgLatency * 1.5 : 0,
      quotaRemaining: metrics.quotaRemaining || 0,
      quotaLimit: metrics.quotaLimit || 0,
      reputation: metrics.reputation || 0,
      lastSuccessfulCall: metrics.lastUsed || 0,
      lastFailedCall: 0,
      consecutiveFailures: 0,
      totalCalls: metrics.totalRequests || 0,
    };

    return this.computeScore(input);
  }

  getAllScores(): Map<string, HealthScoreResult> {
    return new Map(this.scores);
  }

  getHistory(provider: string, keyId: string): HealthHistoryEntry[] {
    return this.history.get(this.makeKey(provider, keyId)) || [];
  }

  getTopProviders(count = 3): { provider: string; avgScore: number }[] {
    const providerScores = new Map<string, number[]>();
    for (const [key, result] of this.scores) {
      const [provider] = key.split(':');
      if (!providerScores.has(provider)) {
        providerScores.set(provider, []);
      }
      providerScores.get(provider)!.push(result.score);
    }

    const rankings: { provider: string; avgScore: number }[] = [];
    for (const [provider, scores] of providerScores) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      rankings.push({ provider, avgScore: Math.round(avg) });
    }

    return rankings.sort((a, b) => b.avgScore - a.avgScore).slice(0, count);
  }

  invalidateAll(): void {
    this.scores.clear();
    LOGGER.info('HealthScoreService', 'All scores invalidated');
  }
}
