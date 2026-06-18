import type { SystemState, RouterWeights } from '../types/metrics-types';
import type { Result } from './results';
import type { ProviderError, RoutingError } from './errors'
import type { ProbeResult } from './probe';

export interface ProviderCapability {
  readonly provider: string;
  readonly supportedModels: string[];
  readonly maxTokens: number;
  readonly supportsStreaming: boolean;
  readonly supportsFunctionCalling: boolean;
  readonly supportsVision: boolean;
  readonly supportedStrategies: Array<'simple' | 'medium' | 'complex'>;
  readonly avgLatencyMs: number;
  readonly reliabilityScore: number;
}

export type RequestIntent = 'code' | 'creative' | 'factual' | 'math' | 'analysis' | 'general';
export type RequestLanguage = 'en' | 'ru' | 'other';

export interface RequestClassification {
  complexity: 'simple' | 'medium' | 'complex';
  isCode: boolean;
  isLong: boolean;
  isMultimodal: boolean;
  intent: RequestIntent;
  language: RequestLanguage;
}

export interface RouterDecision {
  provider: string;
  model: string;
  keyId?: string;
  confidence: number;
  reasoning: string;
}

export interface RankedProvider {
  provider: string;
  key: unknown;
  status: string;
  score?: number;
  reason?: string;
}

export interface IProviderRouter {
  classifyRequest(prompt: string): RequestClassification;
  selectProviderByComplexity(prompt: string): { provider: string; model: string };
  getRankedProviders(strategy: string, prompt: string, priority?: string, agentId?: string, probeResults?: Map<string, ProbeResult>, sessionId?: string): RankedProvider[];
  getRaceCandidates(prompt: string): unknown[];
  getFallbackChain(strategy: string): Array<{ provider: string; model?: string }>;
  resolveWithFallback(strategy: string, excludeProvider?: string, excludeKeyId?: string): { key: unknown; provider: string } | null;
  getProviderAvgLatency(provider: string): number;
  getRouterCapabilities(): { supportedStrategies: string[]; maxRaceCandidates: number; fallbackDepth: number };
  trySelectProvider?(prompt: string): Result<RouterDecision, RoutingError>;
  tryResolveFallback?(strategy: string, agentId?: string): Result<{ key: unknown; provider: string }, RoutingError>;
}

export interface IProviderStateManager {
  updateMetric(data: { provider: string; tokens?: number; latency: number; ttft?: number; model?: string }): void;
  updateError(data: { provider: string }): void;
  getState(): SystemState;
  getLatencyBalancedWeights(): RouterWeights;
  checkProviderHealth?(provider: string): Result<{ healthy: boolean; latency: number; errorRate: number }, ProviderError>;
  getProviderCapabilities(provider: string): ProviderCapability | null;
  tryUpdateMetric?(data: { provider: string; tokens?: number; latency: number; ttft?: number; model?: string }): Result<void, ProviderError>;
  tryUpdateError?(data: { provider: string }): Result<void, ProviderError>;
}
