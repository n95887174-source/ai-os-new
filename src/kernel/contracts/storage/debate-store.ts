export interface DebateSessionRecord {
  id: string;
  topic: string;
  topologyType: string;
  phase: string;
  round: number;
  totalTokens: number;
  totalCost: number;
  agentStates: string;
  topology: string;
  participants: string;
  startedAt: number;
  updatedAt: number;
  createdAt: number;
}

export interface DebateVerdictRecord {
  sessionId: string;
  topic: string;
  summary: string;
  conclusionType: string;
  stanceResult: string;
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
