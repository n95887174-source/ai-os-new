export const CognitiveEvents = {
  TRACE_UPDATED: 'cognitive:trace:updated',
  STEP_ACTIVE: 'cognitive:step:active',
  STEP_COMPLETED: 'cognitive:step:completed',
  DECISION_MADE: 'cognitive:decision:made',
  REQUEST_INCOMING: 'request:incoming',
  REQUEST_COMPLETED: 'request:completed',
} as const;

export type CognitiveEventMap = {
  'cognitive:trace:updated': { traceId: string; step: string; status: string };
  'cognitive:step:active': { traceId: string; step: string; nodeId: string };
  'cognitive:step:completed': { traceId: string; step: string; result: unknown };
  'cognitive:decision:made': { traceId: string; decision: string; confidence: number };
  'request:incoming': { requestId: string; provider?: string; model?: string; messages?: unknown };
  'request:completed': { requestId: string; provider: string; model: string; latency: number };
};
