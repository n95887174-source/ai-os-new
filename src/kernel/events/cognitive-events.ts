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
  'cognitive:step:active': { traceId: string; nodeId: string; metadata?: Record<string, unknown> };
  'cognitive:step:completed': { traceId: string; nodeId: string; status: 'done' | 'error'; duration: number; output: string; fullContent?: string; provider?: string; model?: string };
  'cognitive:decision:made': { traceId: string; decision: string; confidence: number };
  'request:incoming': { requestId: string; messages: unknown[] };
  'request:completed': { final_data: { traceId: string; output: string } };
};
