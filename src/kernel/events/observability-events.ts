export const ObservabilityEvents = {
  TIMELINE_EVENT_ADDED: 'observability:timeline_event_added',
  TIMELINE_CLEARED: 'observability:timeline_cleared',
  METRICS_SNAPSHOT: 'observability:metrics_snapshot',
  METRICS_ALERT: 'observability:metrics_alert',
  METRICS_ALERT_RESOLVED: 'observability:metrics_alert_resolved',
  TRACE_CREATED: 'observability:trace_created',
  TRACE_UPDATED: 'observability:trace_updated',
  TRACE_COMPLETED: 'observability:trace_completed',
  SYSTEM_HEALTH_CHANGED: 'observability:health_changed',
} as const;

export type ObservabilityEventMap = {
  'observability:timeline_event_added': {
    eventId: string;
    type: string;
    category: string;
    timestamp: number;
    title: string;
  };
  'observability:timeline_cleared': { count: number; timestamp: number };
  'observability:metrics_snapshot': {
    timestamp: number;
    totalRequests: number;
    totalTokens: number;
    estimatedCost: number;
    avgLatency: number;
    successRate: number;
  };
  'observability:metrics_alert': {
    id: string;
    metric: string;
    value: number;
    severity: 'warning' | 'critical';
    timestamp: number;
  };
  'observability:metrics_alert_resolved': { id: string; timestamp: number };
  'observability:trace_created': { traceId: string; timestamp: number };
  'observability:trace_updated': { traceId: string; status: string; timestamp: number };
  'observability:trace_completed': { traceId: string; duration: number; status: string; timestamp: number };
  'observability:health_changed': { status: 'healthy' | 'degraded' | 'critical'; score: number; timestamp: number };
};
