import type { ITimelineContract } from '../contracts/observability';
import type { AggregatedMetrics, ProviderMetricSummary, MetricsThreshold, MetricAlert, TimeSeriesPoint } from './metrics-service';
import type { ExecutionTrace } from '../../types/domain';
import type { SystemHealthIndicators } from '../state/observability-state';

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
}

export class MonitoringService {
  private deps: MonitoringServiceDeps;
  private healthScore = 1.0;
  private issues: string[] = [];
  private lastHealthCheck = Date.now();

  constructor(deps: MonitoringServiceDeps) {
    this.deps = deps;
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

  getSystemHealth(): { status: 'healthy' | 'degraded' | 'critical'; score: number; issues: string[] } {
    const now = Date.now();
    if (now - this.lastHealthCheck > 10000) {
      this.recalculateHealth();
      this.lastHealthCheck = now;
    }
    const status = this.healthScore >= 0.8 ? 'healthy' : this.healthScore >= 0.5 ? 'degraded' : 'critical';
    return { status, score: this.healthScore, issues: [...this.issues] };
  }

  getProviderHealthSummary(): ProviderMetricSummary[] {
    return this.deps.metricsService.getAllMetrics().providers;
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
        ? Math.max(0, 100 - (metrics.estimatedCost / 50) * 100) : 100,
      errorRate: metrics.errorRate,
      avgLatency: metrics.avgLatency,
      activeDebates: 0,
      pendingRequests: traceStats.running,
      issues: [...this.issues],
    };
  }

  destroy() {
    this.issues = [];
  }

  private recalculateHealth() {
    const metrics = this.deps.metricsService.getAllMetrics().aggregated;
    const alerts = this.deps.metricsService.getAlerts();
    this.issues = [];

    let score = 1.0;

    // Latency penalty
    if (metrics.avgLatency > 3000) {
      const penalty = Math.min(0.3, (metrics.avgLatency - 3000) / 20000);
      score -= penalty;
      this.issues.push(`High latency: ${Math.round(metrics.avgLatency)}ms`);
    }

    // Error rate penalty
    if (metrics.errorRate > 0.1) {
      const penalty = Math.min(0.3, metrics.errorRate * 0.5);
      score -= penalty;
      this.issues.push(`High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`);
    }

    // Success rate penalty
    if (metrics.successRate < 0.9) {
      score -= (0.9 - metrics.successRate) * 0.5;
      this.issues.push(`Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    }

    // Alert penalty
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
    if (criticalAlerts > 0) {
      score -= Math.min(0.3, criticalAlerts * 0.1);
      this.issues.push(`${criticalAlerts} unresolved critical alerts`);
    }

    this.healthScore = Math.max(0, Math.min(1, score));

    this.deps.eventBus.emit('observability:health_changed', {
      status: this.healthScore >= 0.8 ? 'healthy' : this.healthScore >= 0.5 ? 'degraded' : 'critical',
      score: this.healthScore,
      timestamp: Date.now(),
    });
  }
}
