import type { DebatePhase, AgentPhase, DebateTopology } from '../contracts/debate-runtime';

export interface DebateSessionState {
  readonly id: string;
  readonly topic: string;
  readonly topology: DebateTopology;
  readonly phase: DebatePhase;
  readonly round: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly endedAt?: number;
  readonly error?: string;
}

export interface DebateAgentState {
  readonly agentId: string;
  readonly nodeId: string;
  readonly phase: AgentPhase;
  readonly round: number;
  readonly tokensUsed: number;
  readonly latency: number;
  readonly error?: string;
  readonly lastActiveAt: number;
}

export interface DebateRuntimeSnapshot {
  readonly sessions: DebateSessionState[];
  readonly totalCompleted: number;
  readonly totalFailed: number;
  readonly totalActive: number;
  readonly avgTokensPerSession: number;
  readonly avgCostPerSession: number;
  readonly updatedAt: number;
}
