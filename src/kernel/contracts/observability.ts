import type { Result } from './results';
import type { KernelError } from './errors';
import type { ExecutionTrace } from '../../types/domain';
import type { AggregatedMetrics, ProviderMetricSummary, MetricsThreshold, MetricAlert, TimeSeriesPoint } from '../services/metrics-service';
import type { TraceFilter, TraceExport } from '../services/trace-service';

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
  getSystemHealth(): { status: 'healthy' | 'degraded' | 'critical'; score: number; issues: string[] };
  getProviderHealthSummary(): ProviderMetricSummary[];
}
