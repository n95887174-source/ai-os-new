import type { RouterWeights } from './metrics-types';

export interface StrategyWeightConfig {
  broadcast: RouterWeights;
  performance: RouterWeights;
  reliability: RouterWeights;
  latency: RouterWeights;
  auto: RouterWeights;
  race: RouterWeights;
  cost: RouterWeights;
  content: RouterWeights;
  free_first: RouterWeights;
}

export interface AutoDynamicAdjustment {
  short: { ttftDelta: number; tpsDelta: number; reliabilityDelta: number };
  long: { ttftDelta: number; tpsDelta: number; reliabilityDelta: number };
}

export interface LatencyVarianceBand {
  minVariance: number;
  weights: RouterWeights;
}

export interface ScoringConfig {
  ttft: { maxMs: number };
  tps: { max: number };
  reliability: { floor: number };
  stabilityBonus: number;
  reputationBonus: number;
  keyReputationBonus: number;
  latencyPenalty: { thresholdRatio: number; max: number; slope: number };
  costPenalty: { scalar: number };
}

export interface ClassificationConfig {
  complexThreshold: number;
  mediumThreshold: number;
  longThreshold: number;
  codePatterns: string;
  reasoningPatterns: string;
  multimodalPatterns: string;
}

export interface AffinityConfig {
  multimodal: Record<string, number>;
  code: Record<string, number>;
  longPrompt: { minLength: number; values: Record<string, number> };
  shortPrompt: { maxLength: number; values: Record<string, number> };
  complexity: {
    complex: Record<string, number>;
    simple: Record<string, number>;
  };
}

export interface PriorityBonuses {
  high: Record<string, number>;
  low: Record<string, number>;
}

export interface ProviderComplexityMapping {
  multimodal: { provider: string; model: string };
  long: { provider: string; model: string };
  complexCode: { provider: string; model: string };
  complex: { provider: string; model: string };
  medium: { provider: string; model: string };
  default: { provider: string; model: string };
}

export interface RouterConfig {
  history: { maxDecisions: number };
  latency: {
    slidingWindowSize: number;
    monitorIntervalMs: number;
    degradationRatio: number;
  };
  defaultWeights: RouterWeights;
  strategyWeights: StrategyWeightConfig;
  autoDynamicAdjustment: AutoDynamicAdjustment;
  latencyVarianceBands: LatencyVarianceBand[];
  scoring: ScoringConfig;
  classification: ClassificationConfig;
  affinity: AffinityConfig;
  priority: PriorityBonuses;
  providerByComplexity: ProviderComplexityMapping;
}
