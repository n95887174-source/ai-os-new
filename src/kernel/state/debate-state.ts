export type DebatePhase = 'pending' | 'opening' | 'argumentation' | 'rebuttal' | 'synthesis' | 'consensus' | 'closed';
export type DebateParticipantRole = 'proponent' | 'opponent' | 'mediator' | 'observer';

export interface DebateParticipantState {
  readonly agentId: string;
  readonly role: DebateParticipantRole;
  readonly position: string;
  readonly arguments: DebateArgumentRecord[];
  readonly score: number;
  readonly status: 'active' | 'idle' | 'withdrawn';
}

export interface DebateArgumentRecord {
  readonly round: number;
  readonly agentId: string;
  readonly content: string;
  readonly type: 'opening' | 'rebuttal' | 'evidence' | 'clarification' | 'synthesis';
  readonly timestamp: number;
  readonly confidence: number;
}

export interface DebateRoundState {
  readonly round: number;
  readonly phase: DebatePhase;
  readonly startedAt: number;
  readonly endedAt?: number;
  readonly argumentsCount: number;
  readonly status: 'in_progress' | 'completed' | 'skipped';
}

export interface DebateSessionState {
  readonly id: string;
  readonly topic: string;
  readonly phase: DebatePhase;
  readonly round: number;
  readonly participants: DebateParticipantState[];
  readonly rounds: DebateRoundState[];
  readonly consensus?: string;
  readonly convergenceScore?: number;
  readonly startedAt: number;
  readonly endedAt?: number;
  readonly isPaused: boolean;
}

export interface DebateStateSnapshot {
  readonly activeSessions: DebateSessionState[];
  readonly completedSessions: number;
  readonly totalDebates: number;
  readonly avgConvergenceScore: number;
  readonly updatedAt: number;
}

export interface ConsensusState {
  readonly topic: string;
  readonly reached: boolean;
  readonly convergenceScore: number;
  readonly agreedPoints: string[];
  readonly disagreedPoints: string[];
  readonly finalStatement?: string;
  readonly participantsCount: number;
  readonly duration: number;
}
