import type { DebateParticipant, DebateSession } from './debate-types';

export type AutoDebateTopic = string;

export type AutoDebateRole = 'pro' | 'con' | 'neutral';

export interface AutoDebateOptions {
  topic?: string;
  category?: string;
  participants?: DebateParticipant[];
  maxParticipants?: number;
  strategy?: 'round_robin' | 'moderated' | 'free_for_all';
  maxRounds?: number;
}

export interface AutoDebateResult {
  id: string;
  timestamp: number;
  topic: string;
  strategy: string;
  maxRounds: number;
  participants: Array<{
    id: string;
    name: string;
    provider: string;
    role: AutoDebateRole;
  }>;
  session: DebateSession | null;
  durationMs: number;
  completed: boolean;
  error?: string;
}

export interface ProviderWinRate {
  provider: string;
  debates: number;
  wins: number;
  losses: number;
  winRate: number;
  avgTokens: number;
  avgLatency: number;
  avgCost: number;
}

export interface BatchTestResult {
  topic: string;
  runs: number;
  results: AutoDebateResult[];
  winRates: ProviderWinRate[];
}

export interface IAutoDebateService {
  runAutoDebate(options?: AutoDebateOptions): Promise<AutoDebateResult>;
  runQuickTest(): Promise<AutoDebateResult>;
  stressTest(count?: number): Promise<AutoDebateResult[]>;
  batchTest(topic: string, runs?: number): Promise<BatchTestResult>;
  getResults(): AutoDebateResult[];
  getWinRates(): ProviderWinRate[];
  clearResults(): void;
}
