import type { Result } from './results';
import type { KernelError } from './errors';
import type { CanonicalHealthStatus } from './health';

export type { CanonicalHealthStatus } from './health';

/**
 * Annotate a value with an optional severity level.
 */
export type SeverityLabel = 'info' | 'warning' | 'error' | 'critical';

// ── Observability type definitions (moved from services for contract purity) ──

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface AggregatedMetrics {
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  avgLatency: number;
  avgTTFT: number;
  avgTPS: number;
  successRate: number;
  errorRate: number;
  activeProviders: number;
  totalProviders: number;
  decisions: number;
  violations: number;
}

export interface ProviderMetricSummary {
  id: string;
  avgLatency: number;
  avgTTFT: number;
  avgTPS: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  reliability: number;
  stabilityIndex: number;
  reputationScore: number;
  currentConcurrent: number;
  status: string;
}

export interface MetricsThreshold {
  metric: string;
  warning: number;
  critical: number;
  operator: 'gt' | 'lt';
}

export interface MetricAlert {
  id: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: number;
  resolved: boolean;
}

export interface TraceFilter {
  status?: 'running' | 'completed' | 'failed';
  provider?: string;
  model?: string;
  startTime?: number;
  endTime?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TraceStep {
  id: string;
  nodeId: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  timestamp: number;
  duration?: number;
  output?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionTrace {
  id: string;
  startTime: number;
  endTime?: number;
  input: string;
  output?: string;
  status: 'running' | 'completed' | 'failed';
  steps: TraceStep[];
  provider?: string;
  model?: string;
  totalTokens?: number;
  estimatedCost?: number;
}

export interface TraceExport {
  version: string;
  exportedAt: number;
  count: number;
  traces: ExecutionTrace[];
}

export interface TimelineEvent {
  readonly id: string;
  readonly type: TimelineEventType;
  readonly category: TimelineCategory;
  readonly timestamp: number;
  readonly title: string;
  readonly description?: string;
  readonly severity?: 'info' | 'warning' | 'error' | 'critical';
  readonly source?: string;
  readonly metadata?: Record<string, unknown>;
  readonly traceId?: string;
  readonly duration?: number;
}

export type TimelineEventType =
  | 'request_start'
  | 'request_complete'
  | 'request_error'
  | 'provider_switch'
  | 'provider_health_change'
  | 'provider_quota_exceeded'
  | 'provider_error'
  | 'budget_alert'
  | 'cost_spike'
  | 'debate_start'
  | 'debate_consensus'
  | 'cognitive_step'
  | 'tool_execution'
  | 'policy_violation'
  | 'system_event'
  | 'config_change'
  | 'agent_action';

export type TimelineCategory =
  | 'request'
  | 'provider'
  | 'budget'
  | 'debate'
  | 'cognitive'
  | 'tool'
  | 'policy'
  | 'system'
  | 'config'
  | 'agent';

export interface TimelineFilter {
  categories?: TimelineCategory[];
  types?: TimelineEventType[];
  startTime?: number;
  endTime?: number;
  severity?: TimelineEvent['severity'];
  source?: string;
  traceId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ITraceContract {
  getTraces(): ExecutionTrace[];
  getTrace(id: string): ExecutionTrace | undefined;
  getFilteredTraces(filter: TraceFilter): ExecutionTrace[];
  addTrace(trace: ExecutionTrace): void;
  removeTrace(id: string): void;
  clearAll(): void;
  getTraceStats(): { total: number; completed: number; failed: number; running: number; successRate: number; avgDuration: number; avgTokens: number };
  exportTraces(filter?: TraceFilter): TraceExport;
  importTraces(data: TraceExport): Promise<number>;
  tryAddTrace?(trace: ExecutionTrace): Result<void, KernelError>;
}

export interface IMetricsContract {
  getHistory(metric?: string, limit?: number): TimeSeriesPoint[];
  getAllMetrics(): { aggregated: AggregatedMetrics; providers: ProviderMetricSummary[] };
  getAlerts(includeResolved?: boolean): MetricAlert[];
  resolveAlert(id: string): void;
  getThresholds(): MetricsThreshold[];
  setThresholds(thresholds: MetricsThreshold[]): void;
  resetHistory(): void;
  getTimeRange(from: number, to: number): TimeSeriesPoint[];
  tryCaptureSnapshot?(): Result<void, KernelError>;
}

export interface ITimelineContract {
  getEvents(filter?: TimelineFilter): TimelineEvent[];
  getEvent(id: string): TimelineEvent | undefined;
  addEvent(event: Omit<TimelineEvent, 'id'>): TimelineEvent;
  addEvents(events: Array<Omit<TimelineEvent, 'id'>>): TimelineEvent[];
  clearEvents(): void;
  getEventStats(): { total: number; byCategory: Record<string, number>; bySeverity: Record<string, number> };
  getTimeRange(from: number, to: number): TimelineEvent[];
}

export interface IMonitoringContract {
  generateReport(): { aggregated: AggregatedMetrics; timeline: TimelineEvent[]; alerts: MetricAlert[]; timestamp: number };
  getSystemHealth(): { status: SystemHealthStatus; score: number; issues: string[] };
  getProviderHealthSummary(): ProviderMetricSummary[];
}
