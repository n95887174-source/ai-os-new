import type { Result } from './results';
import type { ProviderError } from './errors';
import type { ToolCall, ChatMessage as AdapterMessage, ProviderResponse as AdapterResponse, HealthCheckResult as AdapterHealthResult, SendMessageOptions as AdapterSendMessageOptions } from '../types/llm-types';

export type { ToolCall } from '../types/llm-types';
export type { ChatMessage as AdapterMessage } from '../types/llm-types';
export type { SafetyRating as AdapterSafetyRating } from '../types/llm-types';
export type { ProviderResponse as AdapterResponse } from '../types/llm-types';
export type { HealthCheckResult as AdapterHealthResult } from '../types/llm-types';
export type { SendMessageOptions } from '../types/llm-types';

export type AdapterFinishReason = 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER' | 'TOOL_CALLS';

export interface BatchRequest {
  messages: AdapterMessage[];
  model: string;
  apiKey: string;
  signal?: AbortSignal;
  options?: AdapterSendMessageOptions;
}

export interface BatchStreamRequest {
  messages: AdapterMessage[];
  model: string;
  apiKey: string;
  onChunk: (chunk: string, meta?: unknown) => void;
  signal?: AbortSignal;
  options?: AdapterSendMessageOptions;
}

export interface IProviderAdapter {
  readonly id: string;
  sendMessage(messages: AdapterMessage[], model: string, apiKey: string, signal?: AbortSignal, options?: AdapterSendMessageOptions): Promise<AdapterResponse>;
  streamMessage?(
    messages: AdapterMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: AdapterSendMessageOptions
  ): Promise<void>;
  batchSendMessage?(requests: BatchRequest[]): Promise<AdapterResponse[]>;
  batchStreamMessage?(requests: BatchStreamRequest[]): Promise<void>;
  checkHealth(apiKey: string): Promise<AdapterHealthResult>;
  getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]>;
  rotateKey?(currentKey: string): Promise<{ newKey: string; label?: string } | null>;
  destroy?(): void;
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
  syncCircuitBreakerState(provider: string, status: string): void;
  syncRateLimitState(provider: string, remaining: number): void;
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

export interface ILLMClientChatOptions {
  provider?: string;
  model?: string;
  signal?: AbortSignal;
  onChunk?: (chunk: string, meta?: unknown) => void;
  priority?: 'low' | 'normal' | 'high';
  temperature?: number;
  maxTokens?: number;
  apiKeyOverride?: string;
  stopSequences?: string[];
  tools?: Record<string, unknown>[];
  toolChoice?: string | { type: 'function'; function: { name: string } };
  responseFormat?: { type: 'text' | 'json_object' };
}

export interface ILLMClientService {
  chat(
    messages: AdapterMessage[],
    options?: ILLMClientChatOptions
  ): Promise<AdapterResponse>;
  sendMessage(
    messages: AdapterMessage[],
    options?: ILLMClientChatOptions
  ): Promise<{
    content: string;
    toolCalls?: ToolCall[];
    latency: number;
    tokens: number;
    error?: string;
    finishReason?: AdapterFinishReason;
  }>;
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
