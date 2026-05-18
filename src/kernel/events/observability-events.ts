import type { CanonicalHealthStatus } from '../contracts/health';

export const ObservabilityEvents = {
  TIMELINE_EVENT_ADDED: 'observability:timeline:event:added',
  TIMELINE_CLEARED: 'observability:timeline:cleared',
  METRICS_SNAPSHOT: 'observability:metrics:snapshot',
  METRICS_ALERT: 'observability:metrics:alert',
  METRICS_ALERT_RESOLVED: 'observability:metrics:alert:resolved',
  TRACE_CREATED: 'observability:trace:created',
  TRACE_UPDATED: 'observability:trace:updated',
  TRACE_COMPLETED: 'observability:trace:completed',
  SYSTEM_HEALTH_CHANGED: 'observability:health:changed',
} as const;

export type ObservabilityEventMap = {
  'observability:timeline:event:added': {
    eventId: string;
    type: string;
    category: string;
    timestamp: number;
    title: string;
  };
  'observability:timeline:cleared': { count: number; timestamp: number };
  'observability:metrics:snapshot': {
    timestamp: number;
    totalRequests: number;
    totalTokens: number;
    estimatedCost: number;
    avgLatency: number;
    successRate: number;
  };
  'observability:metrics:alert': {
    id: string;
    metric: string;
    value: number;
    severity: 'warning' | 'critical';
    timestamp: number;
  };
  'observability:metrics:alert:resolved': { id: string; timestamp: number };
  'observability:trace:created': { traceId: string; timestamp: number };
  'observability:trace:updated': { traceId: string; status: string; timestamp: number };
  'observability:trace:completed': { traceId: string; duration: number; status: string; timestamp: number };
  'observability:health:changed': { status: CanonicalHealthStatus; score: number; timestamp: number };
};
