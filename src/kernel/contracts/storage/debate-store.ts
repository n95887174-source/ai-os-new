import type { TopologyType, DebatePhase } from '../debate-runtime';
import type { ConclusionType, StanceResult } from '../debate-types';

export interface DebateSessionRecord {
  id: string;
  topic: string;
  topologyType: TopologyType;
  phase: DebatePhase;
  round: number;
  totalTokens: number;
  totalCost: number;
  agentStates: string;
  arguments: string;
  topology: string;
  participants: string;
  memory: string;
  startedAt: number;
  updatedAt: number;
  createdAt: number;
  tags?: string[];
  folder?: string;
  isArchived?: boolean;
}

export interface DebateVerdictRecord {
  sessionId: string;
  topic: string;
  summary: string;
  conclusionType: ConclusionType;
  stanceResult: StanceResult;
  keyArguments: string;
  reasoning: string;
  confidence: number;
  generatedAt: number;
  roundsTotal: number;
  totalTokens: number;
}

export interface DebateStore {
  saveSnapshot(record: DebateSessionRecord): Promise<void>;
  getSnapshot(id: string): Promise<DebateSessionRecord | null>;
  listSessions(options?: { status?: string; limit?: number; offset?: number }): Promise<DebateSessionRecord[]>;
  deleteSession(id: string): Promise<void>;
  saveVerdict(record: DebateVerdictRecord): Promise<void>;
  getVerdict(sessionId: string): Promise<DebateVerdictRecord | null>;
  count(): Promise<number>;
}
