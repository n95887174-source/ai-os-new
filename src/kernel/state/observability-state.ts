import type { TimelineEvent, TimelineCategory, ExecutionTrace } from '../contracts/observability';

/**
 * Canonical system-level health status type.
 * Used across all observability contracts, state, events, and services.
 */
export type SystemHealthStatus = 'healthy' | 'degraded' | 'critical';

export interface ObservabilityStateSnapshot {
  readonly timelineCount: number;
  readonly traceCount: number;
  readonly activeTraceCount: number;
  readonly metricPointCount: number;
  readonly alertCount: number;
  readonly systemHealth: SystemHealthStatus;
  readonly healthScore: number;
  readonly updatedAt: number;
}

export interface TimelineStateSnapshot {
  readonly events: TimelineEvent[];
  readonly totalCount: number;
  readonly byCategory: Record<TimelineCategory, number>;
  readonly bySeverity: Record<string, number>;
  readonly lastEventAt: number;
  readonly updatedAt: number;
}

export interface TraceStateSnapshot {
  readonly traces: ExecutionTrace[];
  readonly totalCount: number;
  readonly completedCount: number;
  readonly failedCount: number;
  readonly runningCount: number;
  readonly avgDuration: number;
  readonly updatedAt: number;
}

export interface MetricStateSnapshot {
  readonly totalRequests: number;
  readonly totalTokens: number;
  readonly estimatedCost: number;
  readonly avgLatency: number;
  readonly successRate: number;
  readonly activeProviders: number;
  readonly activeAlerts: number;
  readonly updatedAt: number;
}

export interface SystemHealthIndicators {
  readonly status: SystemHealthStatus;
  readonly score: number;
  readonly providerHealth: number; // % healthy
  readonly budgetHealth: number;  // % remaining
  readonly errorRate: number;
  readonly avgLatency: number;
  readonly activeDebates: number;
  readonly pendingRequests: number;
  readonly issues: string[];
}
