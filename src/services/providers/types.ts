export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProviderResponse {
  content: string;
  latency: number;
  tokens: number;
  error?: string;
}

export interface HealthCheckResult {
  status: 'active' | 'error';
  latency: number;
  models: string[];
  error?: string;
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
}
