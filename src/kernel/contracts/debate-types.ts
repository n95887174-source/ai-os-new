import type { ApiKey } from '../types/metrics-types';
import type { FeatureFlag } from './feature-flags';
import type { DebateInterpretation } from '../services/debate-interpreter';

export type DebateStrategy = 'round_robin' | 'moderated' | 'free_for_all' | 'socratic' | 'argument_tree' | 'constrained' | 'jury_trial' | 'cross_examination';
export type DebateConstraint = 'none' | 'facts_only' | 'emotional_only' | 'data_driven' | 'ethical_framework' | 'first_principles' | 'pragmatic';
export type ParentResolution = 'explicit' | 'fallback_latest' | 'orphan' | 'invalid_reference';

export interface DebateGraphMetrics {
  totalNodes: number;
  maxDepth: number;
  avgDepth: number;
  orphanRate: number;
  branchingFactor: number;
  challengeDensity: number;
  refinementDensity: number;
}

export interface AgentActivityMetric {
  agentId: string;
  agentName: string;
  argumentCount: number;
  wordCount: number;
  avgConfidence: number;
  avgDepth: number;
  childrenReceived: number;
}

export interface ArgumentImpact {
  argumentId: string;
  agentName: string;
  content: string;
  childCount: number;
  round: number;
}

export interface ActivityMetrics {
  perAgent: AgentActivityMetric[];
  mostDiscussed: ArgumentImpact[];
  roundIntensity: number[];
}

export interface DepthMetric {
  uniqueArguments: number;
  lexicalDiversity: number;
  uniqueBigrams: number;
  topicBreadth: number;
  depthScore: number;
}

export interface OriginalityMetric {
  selfRepetition: number;
  crossRepetition: number;
  noveltyScore: number;
}

export interface UsefulnessMetric {
  relevanceScore: number;
  evidenceScore: number;
  structureScore: number;
  usefulnessScore: number;
}

export interface QualityMetrics {
  depth: DepthMetric;
  originality: OriginalityMetric;
  usefulness: UsefulnessMetric;
}

export type ArgumentStrategy =
  | 'counterargument_only'
  | 'empirical_analysis'
  | 'scenario_forecast'
  | 'risk_review'
  | 'rebuttal'
  | 'first_principles'
  | 'ethical_evaluation'
  | 'economic_analysis'
  | 'technical_deep_dive'
  | 'social_impact';

export interface DebateParticipant {
  id: string;
  name: string;
  role: 'pro' | 'con' | 'neutral';
  systemPrompt?: string;
  provider?: string;
  modelId?: string;
  temperature?: number;
  constraint?: DebateConstraint;
  strategy?: ArgumentStrategy;
}

export interface DebateArgument {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  confidence: number;
  timestamp: number;
  round: number;
  position: 'pro' | 'con' | 'neutral';
  provider?: string;
  model?: string;
  executionId?: string;
  source: 'llm' | 'human' | 'fallback';
  fallbackReason?: string;
  parentId?: string;
  parentResolution?: ParentResolution;
  rawParentRef?: string;
  duplicateOf?: string;
}

export interface DebateConfig {
  roundDelayMs: number;
  maxTokens: number;
  temperature: number;
  debateTemperature: number;
  useModerator: boolean;
  timeoutMs: number;
}

export interface HumanVote {
  round: number;
  voter: 'human';
  votedAgentId: string;
  score: number;
  timestamp: number;
}

export type ConclusionType = 'consensus' | 'dominance' | 'stalemate' | 'partial_agreement' | 'inconclusive';
export type StanceResult = 'pro_wins' | 'con_wins' | 'balanced' | 'no_clear_winner';

export interface VerdictKeyArgument {
  agentId: string;
  agentName: string;
  content: string;
  stance: 'pro' | 'con' | 'neutral';
  strength: number;
}

export interface DebateVerdict {
  sessionId: string;
  topic: string;
  summary: string;
  conclusionType: ConclusionType;
  stanceResult: StanceResult;
  keyArguments: VerdictKeyArgument[];
  reasoning: string;
  confidence: number;
  generatedAt: number;
  roundsTotal: number;
  totalTokens: number;
}

export type VerdictFeedbackVote = 'agree' | 'disagree';

export interface VerdictFeedback {
  sessionId: string;
  vote: VerdictFeedbackVote;
  comment?: string;
  timestamp: number;
}

export interface DebateSession {
  id: string;
  topic: string;
  status: 'active' | 'paused' | 'completed';
  strategy: string;
  maxRounds: number;
  currentRound: number;
  participants: DebateParticipant[];
  arguments: DebateArgument[];
  convergenceScore: number;
  openingStatements?: DebateArgument[];
  config: DebateConfig;
  consensus?: string;
  socraticQuestioner?: number;
  argumentTreeRoundMap?: Map<string, string>;
  graphMetrics?: DebateGraphMetrics;
  interpretation?: DebateInterpretation;
  activityMetrics?: ActivityMetrics;
  qualityMetrics?: QualityMetrics;
  roundVotes?: Record<number, HumanVote[]>;
}

export interface DebateServiceDeps {
  database: {
    getKv: <T>(key: string) => Promise<T | undefined>;
    setKv: (key: string, value: unknown) => Promise<void>;
    keyValue: { delete: (key: string) => Promise<void> };
  };
  adapterRegistry: {
    getAdapter: (provider: string) => { sendMessage: (messages: unknown[], modelId: string, key: string, signal: AbortSignal, options?: unknown) => Promise<{ content: string }> } | undefined;
    resetCircuitBreaker: (provider: string) => void;
  };
  keyService: {
    getKeys: () => ApiKey[];
    getActiveKeys: () => ApiKey[];
    recordUsage: (keyId: string, latency: number, tokens: number, model: string, extra?: Record<string, unknown>) => void;
  };
  routerService: {
    getDebateProviders: (participantCount: number) => Array<{ provider: string; key: ApiKey }>;
    getRankedProviders: (mode: string, prompt: string, priority: string, provider?: string, modelId?: string, minBudget?: number, maxCost?: number, excludedKeys?: string[], sessionId?: string) => ApiKey[];
  };
  eventBus: {
    emit: (event: string, payload: unknown) => void;
    on: (event: string, callback: (data: unknown) => void) => () => void;
  };
  workspaceService: {
    isAttached: () => boolean;
    getFileTreeSnapshot: () => Promise<string | null>;
  };
  getFeatureFlagService?: () => {
    isEnabled: (flag: FeatureFlag) => boolean;
  };
}

export function jaccardSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-zа-яё\s]/g, '').split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-zа-яё\s]/g, '').split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 0;
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}
