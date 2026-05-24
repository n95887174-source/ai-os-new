import type { Result } from './results';
import type { ProviderError } from './errors';

export interface AdapterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AdapterSafetyRating {
  category: string;
  probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
  blocked?: boolean;
}

export type AdapterFinishReason = 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';

export interface AdapterResponse {
  content: string;
  latency: number;
  tokens: number;
  error?: string;
  finishReason?: AdapterFinishReason;
  safetyRatings?: AdapterSafetyRating[];
}

export interface AdapterHealthResult {
  status: 'active' | 'error';
  latency: number;
  models: string[];
  error?: string;
}

export interface BatchRequest {
  messages: AdapterMessage[];
  model: string;
  apiKey: string;
  signal?: AbortSignal;
  adapterOptions?: Record<string, unknown>;
}

export interface BatchStreamRequest {
  messages: AdapterMessage[];
  model: string;
  apiKey: string;
  onChunk: (chunk: string, meta?: unknown) => void;
  signal?: AbortSignal;
  adapterOptions?: Record<string, unknown>;
}

export interface IProviderAdapter {
  readonly id: string;
  sendMessage(messages: AdapterMessage[], model: string, apiKey: string, signal?: AbortSignal, adapterOptions?: Record<string, unknown>): Promise<AdapterResponse>;
  streamMessage?(
    messages: AdapterMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    adapterOptions?: Record<string, unknown>
  ): Promise<void>;
  batchSendMessage?(requests: BatchRequest[]): Promise<AdapterResponse[]>;
  batchStreamMessage?(requests: BatchStreamRequest[]): Promise<void>;
  checkHealth(apiKey: string): Promise<AdapterHealthResult>;
  getAvailableModels(apiKey: string): Promise<string[]>;
  rotateKey?(currentKey: string): Promise<{ newKey: string; label?: string } | null>;
}

export interface ProviderRuntimeStatus {
  circuitOpen: boolean;
  rateLimited: boolean;
}

export interface IAdapterRegistry {
  getAdapter(provider: string): IProviderAdapter | undefined;
  hasAdapter(provider: string): boolean;
  getOrCreateWithFallback(primary: string, fallback: string): IProviderAdapter;
  getAllProviders(): string[];
  getProviderRuntimeStatus(provider: string): ProviderRuntimeStatus;
  resetCircuitBreaker(provider: string): void;
}

export interface IAdapterFactory {
  create(provider: string): IProviderAdapter;
  createWithFallback(primary: string, fallback: string): IProviderAdapter;
}

export interface ILLMClientConfig {
  defaultProvider?: string;
  defaultModel?: string;
  resolveApiKey: (provider: string) => string | undefined;
}

export interface ILLMClientService {
  chat(
    messages: AdapterMessage[],
    options?: {
      provider?: string;
      model?: string;
      signal?: AbortSignal;
      onChunk?: (chunk: string) => void;
      priority?: 'low' | 'normal' | 'high';
    }
  ): Promise<AdapterResponse>;
}

export interface ProviderAdapterEvents {
  'adapter:request': { provider: string; model: string; tokens: number; latency: number };
  'adapter:error': { provider: string; model: string; error: string; statusCode?: number };
  'adapter:health': { provider: string; status: 'active' | 'error'; latency: number };
  'adapter:stream:start': { provider: string; model: string };
  'adapter:stream:chunk': { provider: string; chunk: string };
  'adapter:stream:end': { provider: string; totalTokens: number; latency: number };
  'adapter:stream:error': { provider: string; error: string };
}

export interface IAdapterHealthTracker {
  recordSuccess(provider: string, latencyMs: number): void;
  recordFailure(provider: string, error: string): void;
  getHealthSummary(): Record<string, { successRate: number; avgLatency: number; totalCalls: number; lastError?: string }>;
  tryRecordSuccess?(provider: string, latencyMs: number): Result<void, ProviderError>;
  tryRecordFailure?(provider: string, error: string): Result<void, ProviderError>;
}
