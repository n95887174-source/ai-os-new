import { CONFIG } from './config-registry';
import { EVENTS } from '../events/event-names';
import type { ITimelineContract, AggregatedMetrics, ProviderMetricSummary, MetricsThreshold, MetricAlert, TimeSeriesPoint, ExecutionTrace } from '../contracts/observability';
import type { SystemHealthIndicators, SystemHealthStatus } from '../state/observability-state';

export interface MonitoringServiceDeps {
  eventBus: { on: (event: string, cb: (...args: unknown[]) => void) => () => void; emit: (event: string, data?: unknown) => void };
  traceService: {
    getTraces(): ExecutionTrace[];
    getTraceStats(): { total: number; completed: number; failed: number; running: number; successRate: number; avgDuration: number; avgTokens: number };
  };
  metricsService: {
    getAllMetrics(): { aggregated: AggregatedMetrics; providers: ProviderMetricSummary[] };
    getAlerts(includeResolved?: boolean): MetricAlert[];
    getHistory(metric?: string, limit?: number): TimeSeriesPoint[];
  };
  timelineService: ITimelineContract;
  routingPolicyService?: {
    calculateHealthPenalties: (input: { avgLatency: number; errorRate: number; successRate: number; criticalAlerts: number }) => { score: number; issues: string[] };
  };
}

export class MonitoringService {
  private deps: MonitoringServiceDeps;
  private healthScore = 1.0;
  private issues: string[] = [];
  private lastHealthCheck = Date.now();
  private snapshotInterval: ReturnType<typeof setInterval> | null = null;

  constructor(deps: MonitoringServiceDeps) {
    this.deps = deps;
  }

  init() {
    this.emitSnapshot();
    this.snapshotInterval = setInterval(() => this.emitSnapshot(), CONFIG.metrics.autoCaptureIntervalMs || 30000);
  }

  generateReport() {
    const metrics = this.deps.metricsService.getAllMetrics();
    const timeline = this.deps.timelineService.getEvents({ limit: 50 });
    const alerts = this.deps.metricsService.getAlerts();
    return {
      aggregated: metrics.aggregated,
      timeline,
      alerts,
      timestamp: Date.now(),
    };
  }

  getSystemHealth(): { status: SystemHealthStatus; score: number; issues: string[] } {
    const now = Date.now();
    if (now - this.lastHealthCheck > CONFIG.monitoring.healthCheckStaleIntervalMs) {
      this.recalculateHealth();
      this.lastHealthCheck = now;
    }
    const h = CONFIG.monitoring.healthThresholds;
    const status: SystemHealthStatus = this.healthScore >= h.healthy ? 'healthy' : this.healthScore >= h.degraded ? 'degraded' : 'critical';
    return { status, score: this.healthScore, issues: [...this.issues] };
  }

  getProviderHealthSummary(): ProviderMetricSummary[] {
    return this.deps.metricsService.getAllMetrics().providers;
  }

  emitSnapshot() {
    const aggregated = this.deps.metricsService.getAllMetrics().aggregated;
    this.deps.eventBus.emit(EVENTS.METRICS_SNAPSHOT, {
      timestamp: Date.now(),
      totalRequests: aggregated.totalRequests,
      totalTokens: aggregated.totalTokens,
      estimatedCost: aggregated.estimatedCost,
      avgLatency: aggregated.avgLatency,
      successRate: aggregated.successRate,
    });
  }

  getSystemHealthIndicators(): SystemHealthIndicators {
    const metrics = this.deps.metricsService.getAllMetrics().aggregated;
    const alerts = this.deps.metricsService.getAlerts();
    const traceStats = this.deps.traceService.getTraceStats();

    return {
      status: this.healthScore >= 0.8 ? 'healthy' : this.healthScore >= 0.5 ? 'degraded' : 'critical',
      score: this.healthScore,
      providerHealth: metrics.successRate * 100,
      budgetHealth: metrics.estimatedCost > 0
        ? Math.max(0, 100 - (metrics.estimatedCost / CONFIG.pricing.defaultMonthlyBudget) * 100) : 100,
      errorRate: metrics.errorRate,
      avgLatency: metrics.avgLatency,
      activeDebates: 0,
      pendingRequests: traceStats.running,
      issues: [...this.issues],
    };
  }

  destroy() {
    if (this.snapshotInterval) { clearInterval(this.snapshotInterval); }
    this.issues = [];
  }

  private recalculateHealth() {
    const metrics = this.deps.metricsService.getAllMetrics().aggregated;
    const alerts = this.deps.metricsService.getAlerts();
    this.issues = [];

    const m = CONFIG.monitoring;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;

    if (this.deps.routingPolicyService) {
      const result = this.deps.routingPolicyService.calculateHealthPenalties({
        avgLatency: metrics.avgLatency,
        errorRate: metrics.errorRate,
        successRate: metrics.successRate,
        criticalAlerts,
      });
      this.healthScore = result.score;
      this.issues = result.issues;
    } else {
      let score = 1.0;

      if (metrics.avgLatency > m.latencyPenalty.thresholdMs) {
        const penalty = Math.min(m.latencyPenalty.cap, (metrics.avgLatency - m.latencyPenalty.thresholdMs) / m.latencyPenalty.divisor);
        score -= penalty;
        this.issues.push(`High latency: ${Math.round(metrics.avgLatency)}ms`);
      }

      if (metrics.errorRate > m.errorRatePenalty.threshold) {
        const penalty = Math.min(m.errorRatePenalty.cap, metrics.errorRate * m.errorRatePenalty.multiplier);
        score -= penalty;
        this.issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
      }

      if (metrics.successRate < m.successRatePenalty.floor) {
        score -= (m.successRatePenalty.floor - metrics.successRate) * m.successRatePenalty.multiplier;
        this.issues.push(`Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
      }

      if (criticalAlerts > 0) {
        score -= Math.min(m.alertPenalty.cap, criticalAlerts * m.alertPenalty.perAlert);
        this.issues.push(`${criticalAlerts} unresolved critical alerts`);
      }

      this.healthScore = Math.max(0, Math.min(1, score));
    }

    this.deps.eventBus.emit(EVENTS.SYSTEM_HEALTH_CHANGED, {
      status: this.healthScore >= m.healthThresholds.healthy ? 'healthy' : this.healthScore >= m.healthThresholds.degraded ? 'degraded' : 'critical',
      score: this.healthScore,
      timestamp: Date.now(),
    });
  }
}
