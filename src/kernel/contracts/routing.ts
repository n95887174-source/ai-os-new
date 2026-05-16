import type { Result } from './results';
import type { RoutingError, ProviderError, QuotaError } from './errors';

export type RoutingStrategy =
  | 'latency'
  | 'cost'
  | 'balanced'
  | 'race'
  | 'fallback'
  | 'priority'
  | 'agent';

export interface RoutingRequest {
  readonly prompt: string;
  readonly strategy: RoutingStrategy;
  readonly priority?: string;
  readonly agentId?: string;
  readonly budget?: number;
  readonly maxLatency?: number;
  readonly requiresVision?: boolean;
  readonly requiresStreaming?: boolean;
  readonly requiresFunctionCalling?: boolean;
}

export interface RoutingCandidate {
  readonly provider: string;
  readonly model: string;
  readonly keyId: string;
  readonly score: number;
  readonly estimatedCost: number;
  readonly estimatedLatency: number;
  readonly reliability: number;
  readonly reasons: string[];
}

export interface RoutingDecision {
  readonly selected: RoutingCandidate;
  readonly alternatives: RoutingCandidate[];
  readonly strategy: RoutingStrategy;
  readonly reasoning: string;
  readonly timestamp: number;
  readonly confidence: number;
}

export interface RoutingCapability {
  readonly supportedStrategies: RoutingStrategy[];
  readonly maxCandidates: number;
  readonly fallbackDepth: number;
  readonly supportsRacing: boolean;
  readonly supportsPriorityQueues: boolean;
}

export interface IRoutingEngine {
  route(request: RoutingRequest): Promise<Result<RoutingDecision, RoutingError>>;
  getCandidates(request: RoutingRequest): Promise<Result<RoutingCandidate[], RoutingError>>;
  selectBest(candidates: RoutingCandidate[], strategy: RoutingStrategy): Result<RoutingCandidate, RoutingError>;
  executeWithFallback(request: RoutingRequest): Promise<Result<RoutingDecision, RoutingError>>;
  executeRace(candidates: RoutingCandidate[]): Promise<Result<RoutingCandidate, ProviderError>>;
  checkAvailability(provider: string, model: string): Result<void, ProviderError | QuotaError>;
  getCapabilities(): RoutingCapability;
}

export interface IFallbackChain {
  getChain(strategy: RoutingStrategy): Array<{ provider: string; model?: string }>;
  resolve(request: RoutingRequest, failedProvider: string): Result<RoutingCandidate | null, RoutingError>;
  recordFailure(provider: string, strategy: RoutingStrategy): void;
  getFallbackHistory(provider: string): Array<{ strategy: RoutingStrategy; timestamp: number; resolved: boolean }>;
}
