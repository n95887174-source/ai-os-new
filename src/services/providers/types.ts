export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SafetyRating {
  category: string;
  probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
  blocked?: boolean;
}

export interface ProviderResponse {
  content: string;
  latency: number;
  tokens: number;
  error?: string;
  finishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';
  safetyRatings?: SafetyRating[];
}

export interface HealthCheckResult {
  status: 'active' | 'error';
  latency: number;
  models: string[];
  error?: string;
  finishReason?: string;
}

export interface LLMProviderAdapter {
  id: string;
  sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse>;
  streamMessage?(
    messages: ChatMessage[], 
    model: string, 
    apiKey: string, 
    onChunk: (chunk: string) => void, 
    signal?: AbortSignal
  ): Promise<void>;
  checkHealth(apiKey: string): Promise<HealthCheckResult>;
  getAvailableModels(apiKey: string): Promise<string[]>;
  /** Optional: generate a new API key via provider's API. Returns null if not supported. */
  rotateKey?(currentKey: string): Promise<{ newKey: string; label?: string } | null>;
}
