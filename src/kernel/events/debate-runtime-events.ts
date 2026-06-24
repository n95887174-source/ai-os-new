/**
 * Debate Runtime event name constants.
 * All use colon-hierarchy namespace: debate-runtime:<domain>:<action>
 */
export const DebateRuntimeEvents = {
  // Session lifecycle
  SESSION_CREATED: 'debate-runtime:session:created',
  SESSION_STARTED: 'debate-runtime:session:started',
  SESSION_PAUSED: 'debate-runtime:session:paused',
  SESSION_RESUMED: 'debate-runtime:session:resumed',
  SESSION_CANCELLED: 'debate-runtime:session:cancelled',
  SESSION_COMPLETED: 'debate-runtime:session:completed',
  SESSION_FAILED: 'debate-runtime:session:failed',

  // Phase transitions
  PHASE_CHANGED: 'debate-runtime:phase:changed',
  AGENT_PHASE_CHANGED: 'debate-runtime:agent:phase:changed',

  // Round lifecycle
  ROUND_STARTED: 'debate-runtime:round:started',
  ROUND_ENDED: 'debate-runtime:round:ended',
  EARLY_EXIT: 'debate-runtime:round:early-exit',

  // Agent activity
  AGENT_THINKING: 'debate-runtime:agent:thinking',
  AGENT_CHUNK: 'debate-runtime:agent:chunk',
  AGENT_RESPONDED: 'debate-runtime:agent:responded',
  AGENT_ERROR: 'debate-runtime:agent:error',
  AGENT_FALLBACK: 'debate-runtime:agent:fallback',
  AGENT_TIMEOUT: 'debate-runtime:agent:timeout',

  // Budget / pressure
  BUDGET_UPDATED: 'debate-runtime:budget:updated',
  BUDGET_EXCEEDED: 'debate-runtime:budget:exceeded',
  BUDGET_PRESSURE_CHANGED: 'debate-runtime:budget:pressure',

  // Consensus
  CONSENSUS_REACHED: 'debate-runtime:consensus:reached',
  CONFLICT_DETECTED: 'debate-runtime:consensus:conflict',
  CONFIDENCE_UPDATED: 'debate-runtime:consensus:confidence',

  // Memory
  CLAIM_RECORDED: 'debate-runtime:memory:claim',
  CHAIN_UPDATED: 'debate-runtime:memory:chain',
} as const;

export type DebateRuntimeEvent = (typeof DebateRuntimeEvents)[keyof typeof DebateRuntimeEvents];

export interface DebateRuntimeEventMap {
  'debate-runtime:session:created': { sessionId: string; topic: string; topologyType: string };
  'debate-runtime:session:started': { sessionId: string };
  'debate-runtime:session:paused': { sessionId: string };
  'debate-runtime:session:resumed': { sessionId: string };
  'debate-runtime:session:cancelled': { sessionId: string };
  'debate-runtime:session:completed': { sessionId: string; error?: string };
  'debate-runtime:session:failed': { sessionId: string; error: string };
  'debate-runtime:phase:changed': { sessionId: string; from: string; to: string };
  'debate-runtime:agent:phase:changed': { sessionId: string; agentId: string; from: string; to: string };
  'debate-runtime:round:started': { sessionId: string; round: number; nodes: string[] };
  'debate-runtime:round:ended': { sessionId: string; round: number };
  'debate-runtime:round:early-exit': { sessionId: string; confidence: number; round: number };
  'debate-runtime:agent:thinking': { sessionId: string; agentId: string };
  'debate-runtime:agent:chunk': { sessionId: string; agentId: string; chunk: string };
  'debate-runtime:agent:responded': { sessionId: string; agentId: string; content: string };
  'debate-runtime:agent:error': { sessionId: string; agentId: string; error: string };
  'debate-runtime:agent:fallback': { sessionId: string; agentId: string; fromProvider: string; toProvider: string };
  'debate-runtime:agent:timeout': { sessionId: string; agentId: string; timeoutMs: number };
  'debate-runtime:budget:updated': { sessionId: string; pressure: string; used: number; limit: number };
  'debate-runtime:budget:exceeded': { sessionId: string; reason: string; limit: number; used: number };
  'debate-runtime:budget:pressure': { sessionId: string; level: string; action: unknown };
  'debate-runtime:consensus:reached': { sessionId: string; confidence: number; agreements: number; conflicts: number };
  'debate-runtime:consensus:conflict': { sessionId: string; claimA: string; claimB: string };
  'debate-runtime:consensus:confidence': { sessionId: string; confidence: number };
  'debate-runtime:memory:claim': { sessionId: string; agentId: string; claim: string };
  'debate-runtime:memory:chain': { sessionId: string; agentId: string; steps: number };
}
