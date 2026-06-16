import type {
  ChatMessage,
  ProviderResponse,
  HealthCheckResult,
} from '../../kernel/types/llm-types';
export type {
  ToolCall,
  ChatMessage,
  SafetyRating,
  ProviderResponse,
  HealthCheckResult,
} from '../../kernel/types/llm-types';

export interface Tool {
  type?: string;
  name?: string;
  description?: string;
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
  // Additional extension properties can be added as needed, but without index signature for safety
}

export interface SendMessageOptions {
  temperature?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  tools?: Tool[];
  toolChoice?: unknown;
  responseFormat?: { type: 'text' | 'json_object'; schema?: unknown };
  safetySettings?: Array<{ category: string; threshold: string }>;
  cachedContent?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface LLMProviderAdapter {
  id: string;
  sendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    signal?: AbortSignal,
    options?: SendMessageOptions
  ): Promise<ProviderResponse>;
  streamMessage?(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: SendMessageOptions
  ): Promise<void>;
  batchSendMessage?(
    requests: Array<{
      messages: ChatMessage[];
      model: string;
      apiKey: string;
      signal?: AbortSignal;
      options?: SendMessageOptions;
    }>
  ): Promise<ProviderResponse[]>;
  batchStreamMessage?(
    requests: Array<{
      messages: ChatMessage[];
      model: string;
      apiKey: string;
      onChunk: (chunk: string, meta?: unknown) => void;
      signal?: AbortSignal;
      options?: SendMessageOptions;
    }>
  ): Promise<void>;
  checkHealth(apiKey: string): Promise<HealthCheckResult>;
  getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]>;
  /** Optional: generate a new API key via provider's API. Returns null if not supported. */
  rotateKey?(currentKey: string): Promise<{ newKey: string; label?: string } | null>;
  /** Optional: cleanup resources (timers, listeners, in-flight requests). */
  destroy?(): void;
}
