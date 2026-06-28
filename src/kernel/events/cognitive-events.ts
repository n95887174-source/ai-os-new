import { EVENT_REGISTRY, type EventMap } from './event-registry';

export const CognitiveEvents = {
  TRACE_UPDATED: EVENT_REGISTRY.COGNITIVE_TRACE_UPDATED.name,
  STEP_ACTIVE: EVENT_REGISTRY.COGNITIVE_STEP_ACTIVE.name,
  STEP_COMPLETED: EVENT_REGISTRY.COGNITIVE_STEP_COMPLETED.name,
  DECISION_MADE: EVENT_REGISTRY.COGNITIVE_DECISION_MADE.name,
  REQUEST_INCOMING: EVENT_REGISTRY.REQUEST_INCOMING.name,
  REQUEST_COMPLETED: EVENT_REGISTRY.REQUEST_COMPLETED.name,
} as const;

export type CognitiveEventMap = Pick<EventMap,
  'cognitive:trace:updated' | 'cognitive:step:active' |
  'cognitive:step:completed' | 'cognitive:decision:made' |
  'request:incoming' | 'request:completed'
>;
