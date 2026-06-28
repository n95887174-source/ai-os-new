import { EVENT_REGISTRY, type EventMap } from './event-registry';

export const DebateRuntimeEvents = {
  SESSION_CREATED: EVENT_REGISTRY.DEBATE_SESSION_CREATED.name,
  SESSION_STARTED: EVENT_REGISTRY.DEBATE_SESSION_STARTED.name,
  SESSION_PAUSED: EVENT_REGISTRY.DEBATE_SESSION_PAUSED.name,
  SESSION_RESUMED: EVENT_REGISTRY.DEBATE_SESSION_RESUMED.name,
  SESSION_CANCELLED: EVENT_REGISTRY.DEBATE_SESSION_CANCELLED.name,
  SESSION_COMPLETED: EVENT_REGISTRY.DEBATE_SESSION_COMPLETED.name,
  SESSION_FAILED: EVENT_REGISTRY.DEBATE_SESSION_FAILED.name,
  PHASE_CHANGED: EVENT_REGISTRY.DEBATE_PHASE_CHANGED.name,
  AGENT_PHASE_CHANGED: EVENT_REGISTRY.DEBATE_AGENT_PHASE_CHANGED.name,
  ROUND_STARTED: EVENT_REGISTRY.DEBATE_ROUND_STARTED.name,
  ROUND_ENDED: EVENT_REGISTRY.DEBATE_ROUND_ENDED.name,
  EARLY_EXIT: EVENT_REGISTRY.DEBATE_ROUND_EARLY_EXIT.name,
  AGENT_THINKING: EVENT_REGISTRY.DEBATE_AGENT_THINKING.name,
  AGENT_CHUNK: EVENT_REGISTRY.DEBATE_AGENT_CHUNK.name,
  AGENT_RESPONDED: EVENT_REGISTRY.DEBATE_AGENT_RESPONDED.name,
  AGENT_ERROR: EVENT_REGISTRY.DEBATE_AGENT_ERROR.name,
  AGENT_FALLBACK: EVENT_REGISTRY.DEBATE_AGENT_FALLBACK.name,
  AGENT_TIMEOUT: EVENT_REGISTRY.DEBATE_AGENT_TIMEOUT.name,
  BUDGET_UPDATED: EVENT_REGISTRY.DEBATE_BUDGET_UPDATED.name,
  BUDGET_EXCEEDED: EVENT_REGISTRY.DEBATE_BUDGET_EXCEEDED.name,
  BUDGET_PRESSURE_CHANGED: EVENT_REGISTRY.DEBATE_BUDGET_PRESSURE_CHANGED.name,
  CONSENSUS_REACHED: EVENT_REGISTRY.DEBATE_CONSENSUS_REACHED.name,
  CONFLICT_DETECTED: EVENT_REGISTRY.DEBATE_CONFLICT_DETECTED.name,
  CONFIDENCE_UPDATED: EVENT_REGISTRY.DEBATE_CONFIDENCE_UPDATED.name,
  CLAIM_RECORDED: EVENT_REGISTRY.DEBATE_CLAIM_RECORDED.name,
  CHAIN_UPDATED: EVENT_REGISTRY.DEBATE_CHAIN_UPDATED.name,
} as const;

export type DebateRuntimeEvent = (typeof DebateRuntimeEvents)[keyof typeof DebateRuntimeEvents];

export type DebateRuntimeEventMap = Pick<EventMap,
  'debate-runtime:session:created' | 'debate-runtime:session:started' |
  'debate-runtime:session:paused' | 'debate-runtime:session:resumed' |
  'debate-runtime:session:cancelled' | 'debate-runtime:session:completed' |
  'debate-runtime:session:failed' | 'debate-runtime:phase:changed' |
  'debate-runtime:agent:phase:changed' | 'debate-runtime:round:started' |
  'debate-runtime:round:ended' | 'debate-runtime:round:early-exit' |
  'debate-runtime:agent:thinking' | 'debate-runtime:agent:chunk' |
  'debate-runtime:agent:responded' | 'debate-runtime:agent:error' |
  'debate-runtime:agent:fallback' | 'debate-runtime:agent:timeout' |
  'debate-runtime:budget:updated' | 'debate-runtime:budget:exceeded' |
  'debate-runtime:budget:pressure' | 'debate-runtime:consensus:reached' |
  'debate-runtime:consensus:conflict' | 'debate-runtime:consensus:confidence' |
  'debate-runtime:memory:claim' | 'debate-runtime:memory:chain'
>;
