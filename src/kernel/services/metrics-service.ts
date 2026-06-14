import { CONFIG } from './config-registry';
import { EVENTS } from '../events/event-names';
import type { AggregatedMetrics, ProviderMetricSummary, MetricsThreshold, MetricAlert, TimeSeriesPoint } from '../contracts/observability';
export type { AggregatedMetrics, ProviderMetricSummary, MetricsThreshold, MetricAlert, TimeSeriesPoint };

export interface MetricsReport {
  aggregated: AggregatedMetrics;
  providers: ProviderMetricSummary[];
  history: TimeSeriesPoint[];
  topProvider: ProviderMetricSummary | null;
  worstProvider: ProviderMetricSummary | null;
  timestamp: number;
}

const METRICS_KEY = 'super_agents_metrics_history';
const MAX_HISTORY_POINTS = CONFIG.metrics.maxHistoryPoints;
const DEFAULT_THRESHOLDS: MetricsThreshold[] = [
  { metric: 'avgLatency', warning: CONFIG.metrics.defaultThresholds.avgLatency.warning, critical: CONFIG.metrics.defaultThresholds.avgLatency.critical, operator: 'gt' },
  { metric: 'errorRate', warning: CONFIG.metrics.defaultThresholds.errorRate.warning, critical: CONFIG.metrics.defaultThresholds.errorRate.critical, operator: 'gt' },
  { metric: 'successRate', warning: CONFIG.metrics.defaultThresholds.successRate.warning, critical: CONFIG.metrics.defaultThresholds.successRate.critical, operator: 'lt' },
  { metric: 'totalTokens', warning: CONFIG.metrics.defaultThresholds.totalTokens.warning, critical: CONFIG.metrics.defaultThresholds.totalTokens.critical, operator: 'gt' },
];

export interface MetricsServiceDeps {
  eventBus: { on: (event: string, cb: (...args: unknown[]) => void) => () => void; emit: (event: string, data?: unknown) => void };
  database: { getKv: <T>(id: string) => Promise<T | null>; setKv: <T>(id: string, value: T) => Promise<void> };
  kernel: { getState: () => { totalRequests: number; totalTokens: number; estimatedCost: number; providers: Record<string, { avgTTFT: number; avgTPS: number; totalRequests: number; reliability: number; stabilityIndex: number; reputationScore: number; status: string; errorCount?: number; totalTokens?: number; currentConcurrent?: number }>; decisions: unknown[]; violations: string[] } };
}

export class MetricsService {
  private history: TimeSeriesPoint[] = [];
  private thresholds: MetricsThreshold[] = [...DEFAULT_THRESHOLDS];
  private alerts: MetricAlert[] = [];
  private unsubs: Array<() => void> = [];
  private captureInterval: ReturnType<typeof setInterval> | null = null;
  private deps: MetricsServiceDeps;
  private recentLatencies: Map<string, number[]> = new Map();
  private throughput: Map<string, { count: number; windowStart: number }> = new Map();
  private readonly MAX_RECENT = 100;
  private readonly THROUGHPUT_WINDOW = 60000;
  private readonly ALERT_RETENTION_MS = 24 * 60 * 60 * 1000;
  private readonly AGENT_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(deps: MetricsServiceDeps) {
    this.deps = deps;
  }

  async init() {
    await this.load();
    this.setupAutoCapture();
    this.startCleanup();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    if (this.captureInterval) { clearInterval(this.captureInterval); }
    if (this.cleanupInterval) { clearInterval(this.cleanupInterval); }
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - this.ALERT_RETENTION_MS;
      this.alerts = this.alerts.filter(a => !a.resolved || a.timestamp > cutoff);
      // Prune agent maps for entries not updated in the last hour
      const agentCutoff = Date.now() - 60 * 60 * 1000;
      for (const [agentId] of this.recentLatencies) {
        const buf = this.recentLatencies.get(agentId);
        if (!buf || buf.length === 0) {
          this.recentLatencies.delete(agentId);
        }
      }
      for (const [agentId, entry] of this.throughput) {
        if (entry.windowStart < agentCutoff && entry.count === 0) {
          this.throughput.delete(agentId);
        }
      }
      this.persist();
    }, this.AGENT_CLEANUP_INTERVAL_MS);
  }

  private async load() {
    try {
      const saved = await this.deps.database.getKv<{ history: TimeSeriesPoint[]; thresholds: MetricsThreshold[]; alerts: MetricAlert[] }>(METRICS_KEY);
      if (saved) {
        this.history = saved.history || [];
        this.thresholds = saved.thresholds || DEFAULT_THRESHOLDS;
        this.alerts = saved.alerts || [];
      }
    } catch (e) { console.error('[MetricsService] Failed to load', e); }
  }

  private async persist() {
    try {
      await this.deps.database.setKv(METRICS_KEY, {
        history: this.history.slice(-MAX_HISTORY_POINTS),
        thresholds: this.thresholds,
        alerts: this.alerts,
      });
    } catch (e) { console.error('[MetricsService] Failed to persist', e); }
  }

  private setupAutoCapture() {
    this.captureInterval = setInterval(() => { this.captureSnapshot(); }, CONFIG.metrics.autoCaptureIntervalMs);
    let lastCapture = 0;
    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.KERNEL_UPDATED, () => {
        const now = Date.now();
        if (now - lastCapture > 5000) {
          lastCapture = now;
          this.captureSnapshot();
        }
      })
    );
    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.COGNITIVE_STEP_COMPLETED, (data: unknown) => {
        const d = data as { nodeId?: string; duration?: number };
        if (d.nodeId && d.duration != null) {
          this.recordLatency(d.nodeId, d.duration);
          this.recordThroughput(d.nodeId);
        }
      })
    );
  }

  private async captureSnapshot() {
    const state = this.deps.kernel.getState();
    if (!state) return;

    const now = Date.now();
    const points: TimeSeriesPoint[] = [
      { timestamp: now, value: state.totalRequests, label: 'requests' },
      { timestamp: now, value: state.totalTokens, label: 'tokens' },
      { timestamp: now, value: state.estimatedCost, label: 'cost' },
    ];

    const providerStates = Object.values(state.providers);
    if (providerStates.length > 0) {
      const avgLatency = providerStates.reduce((s, p) => s + p.avgTTFT, 0) / providerStates.length;
      points.push({ timestamp: now, value: Math.round(avgLatency), label: 'avgLatency' });
    }

    this.history.push(...points);
    if (this.history.length > MAX_HISTORY_POINTS) {
      this.history = this.history.slice(-MAX_HISTORY_POINTS);
    }

    this.checkThresholds();
    this.persist();
  }

  private checkThresholds() {
    const report = this.generateAggregated();
    for (const threshold of this.thresholds) {
      let value: number;
      switch (threshold.metric) {
        case 'avgLatency': value = report.avgLatency; break;
        case 'errorRate': value = report.errorRate; break;
        case 'successRate': value = report.successRate; break;
        case 'totalTokens': value = report.totalTokens; break;
        default: continue;
      }

      const breached = threshold.operator === 'gt' ? value > threshold.warning : value < threshold.warning;
      const critical = threshold.operator === 'gt' ? value > threshold.critical : value < threshold.critical;

      if (breached && !this.alerts.some(a => a.metric === threshold.metric && !a.resolved)) {
        const alert: MetricAlert = {
          id: `alert-${Date.now()}`,
          metric: threshold.metric, value,
          threshold: critical ? threshold.critical : threshold.warning,
          severity: critical ? 'critical' : 'warning',
          timestamp: Date.now(), resolved: false,
        };
        this.alerts.push(alert);
        this.deps.eventBus.emit(EVENTS.METRICS_ALERT, {
          id: alert.id,
          metric: alert.metric,
          value: alert.value,
          severity: alert.severity,
          timestamp: alert.timestamp,
        });
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
          message: `Metric alert: ${threshold.metric} = ${value} (${critical ? 'critical' : 'warning'})`,
          type: critical ? 'error' : 'warning',
        });
      }
    }
  }

  generateAggregated(): AggregatedMetrics {
    const state = this.deps.kernel.getState();
    const providerStates = Object.values(state.providers);
    const activeProviders = providerStates.filter(p => p.status === 'healthy');

    const avgLatency = providerStates.length > 0
      ? providerStates.reduce((sum, p) => sum + p.avgTTFT, 0) / providerStates.length : 0;

    return {
      totalRequests: state.totalRequests,
      totalTokens: state.totalTokens,
      estimatedCost: state.estimatedCost,
      avgLatency,
      avgTTFT: avgLatency,
      avgTPS: providerStates.length > 0
        ? providerStates.reduce((sum, p) => sum + p.avgTPS, 0) / providerStates.length : 0,
      successRate: providerStates.length > 0 ? activeProviders.length / providerStates.length : 1,
      errorRate: providerStates.length > 0 ? 1 - (activeProviders.length / providerStates.length) : 0,
      activeProviders: activeProviders.length,
      totalProviders: providerStates.length,
      decisions: state.decisions.length,
      violations: state.violations.length,
    };
  }

  generateProviderSummaries(): ProviderMetricSummary[] {
    const state = this.deps.kernel.getState();
    return Object.entries(state.providers).map(([id, p]) => ({
      id,
      avgLatency: p.avgTTFT,
      avgTTFT: p.avgTTFT,
      avgTPS: p.avgTPS,
      successCount: p.totalRequests,
      errorCount: p.errorCount ?? 0,
      totalTokens: p.totalTokens ?? 0,
      reliability: p.reliability,
      stabilityIndex: p.stabilityIndex,
      reputationScore: p.reputationScore,
      currentConcurrent: p.currentConcurrent ?? 0,
      status: p.status,
    }));
  }

  generateReport(): MetricsReport {
    const aggregated = this.generateAggregated();
    const providers = this.generateProviderSummaries();
    const sorted = [...providers].sort((a, b) => b.reputationScore - a.reputationScore);
    return {
      aggregated, providers,
      history: this.history.slice(-CONFIG.metrics.defaultReportLimit),
      topProvider: sorted[0] || null,
      worstProvider: sorted[sorted.length - 1] || null,
      timestamp: Date.now(),
    };
  }

  getHistory(metric?: string, limit = 100): TimeSeriesPoint[] {
    let points = this.history;
    if (metric) points = points.filter(p => !p.label || p.label === metric);
    return points.slice(-limit);
  }

  getAllMetrics() { return this.generateReport(); }
  getAlerts(includeResolved = false): MetricAlert[] { return includeResolved ? this.alerts : this.alerts.filter(a => !a.resolved); }
  resolveAlert(id: string) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.resolved = true;
      this.deps.eventBus.emit(EVENTS.METRICS_ALERT_RESOLVED, { id: alert.id, timestamp: Date.now() });
      this.persist();
    }
  }
  getThresholds(): MetricsThreshold[] { return [...this.thresholds]; }
  setThresholds(thresholds: MetricsThreshold[]) { this.thresholds = thresholds; this.persist(); }
  resetHistory() { this.history = []; this.alerts = []; this.persist(); }
  getTimeRange(from: number, to: number): TimeSeriesPoint[] { return this.history.filter(p => p.timestamp >= from && p.timestamp <= to); }

  recordLatency(agentId: string, latencyMs: number) {
    const buf = this.recentLatencies.get(agentId) || [];
    buf.push(latencyMs);
    if (buf.length > this.MAX_RECENT) buf.shift();
    this.recentLatencies.set(agentId, buf);
  }

  recordThroughput(agentId: string) {
    const now = Date.now();
    const entry = this.throughput.get(agentId) || { count: 0, windowStart: now };
    if (now - entry.windowStart > this.THROUGHPUT_WINDOW) {
      entry.count = 1;
      entry.windowStart = now;
    } else {
      entry.count++;
    }
    this.throughput.set(agentId, entry);
  }

  getAgentPercentiles(agentId: string): { p50: number; p90: number; p95: number; p99: number } {
    const buf = (this.recentLatencies.get(agentId) || []).slice().sort((a, b) => a - b);
    if (buf.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0 };
    const len = buf.length;
    return {
      p50: buf[Math.floor(len * 0.5)],
      p90: buf[Math.floor(len * 0.9)],
      p95: buf[Math.floor(len * 0.95)],
      p99: buf[Math.floor(len * 0.99)],
    };
  }

  getAgentThroughput(agentId: string): number {
    const entry = this.throughput.get(agentId);
    if (!entry) return 0;
    const elapsed = (Date.now() - entry.windowStart) / 1000;
    return elapsed > 0 ? entry.count / elapsed : 0;
  }
}
