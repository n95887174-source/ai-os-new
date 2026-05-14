import type { RouterWeights, RoutingStrategy } from './metrics';

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

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  history: { maxDecisions: 100 },
  latency: {
    slidingWindowSize: 10,
    monitorIntervalMs: 30000,
    degradationRatio: 1.5,
  },
  defaultWeights: { ttft: 0.4, tps: 0.3, reliability: 0.3 },
  strategyWeights: {
    broadcast: { ttft: 0.33, tps: 0.33, reliability: 0.34 },
    performance: { ttft: 0.1, tps: 0.7, reliability: 0.2 },
    reliability: { ttft: 0.1, tps: 0.1, reliability: 0.8 },
    latency: { ttft: 0.8, tps: 0.0, reliability: 0.2 },
    auto: { ttft: 0.4, tps: 0.2, reliability: 0.4 },
    race: { ttft: 0.9, tps: 0.0, reliability: 0.1 },
    cost: { ttft: 0.1, tps: 0.3, reliability: 0.1 },
    content: { ttft: 0.2, tps: 0.1, reliability: 0.2 },
    free_first: { ttft: 0.1, tps: 0.1, reliability: 0.8 },
  },
  autoDynamicAdjustment: {
    short: { ttftDelta: 0.2, tpsDelta: -0.1, reliabilityDelta: 0.1 },
    long: { ttftDelta: -0.2, tpsDelta: 0.3, reliabilityDelta: 0.1 },
  },
  latencyVarianceBands: [
    { minVariance: 1.0, weights: { ttft: 0.85, tps: 0.1, reliability: 0.05 } },
    { minVariance: 0.5, weights: { ttft: 0.7, tps: 0.15, reliability: 0.15 } },
    { minVariance: 0.25, weights: { ttft: 0.5, tps: 0.25, reliability: 0.25 } },
  ],
  scoring: {
    ttft: { maxMs: 2000 },
    tps: { max: 100 },
    reliability: { floor: 0.4 },
    stabilityBonus: 0.1,
    reputationBonus: 0.1,
    keyReputationBonus: 0.15,
    latencyPenalty: { thresholdRatio: 1.5, max: 0.3, slope: 0.2 },
    costPenalty: { scalar: 100 },
  },
  classification: {
    complexThreshold: 2000,
    mediumThreshold: 500,
    longThreshold: 4000,
    codePatterns: '(function|class|const|import|export|def |```|SELECT|CREATE TABLE|async |await )',
    reasoningPatterns: '(why|explain|analyze|compare|contrast|what if|how does|reason|think step|solve)',
    multimodalPatterns: '(image|picture|photo|diagram|chart|graph|visual|render|draw)',
  },
  affinity: {
    multimodal: { gemini: 0.5, openrouter: 0.3 },
    code: { gemini: 0.3, openrouter: 0.3, groq: 0.2 },
    longPrompt: { minLength: 8000, values: { gemini: 0.4, openrouter: 0.2 } },
    shortPrompt: { maxLength: 200, values: { groq: 0.3, gemini: 0.15 } },
    complexity: {
      complex: { openrouter: 0.3, gemini: 0.2 },
      simple: { groq: 0.25 },
    },
  },
  priority: {
    high: { groq: 0.4, gemini: 0.2 },
    low: { groq: -0.2 },
  },
  providerByComplexity: {
    multimodal: { provider: 'gemini', model: 'gemini-2.0-flash' },
    long: { provider: 'gemini', model: 'gemini-2.0-flash' },
    complexCode: { provider: 'gemini', model: 'gemini-2.0-pro' },
    complex: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' },
    medium: { provider: 'groq', model: 'llama-3.3-70b' },
    default: { provider: 'groq', model: 'llama-3.1-8b' },
  },
};
