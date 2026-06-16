export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
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
  finishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER' | 'TOOL_CALLS';
  safetyRatings?: SafetyRating[];
  toolCalls?: ToolCall[];
}

export interface HealthCheckResult {
  status: 'active' | 'error';
  latency: number;
  models: string[];
  error?: string;
  finishReason?: string;
}
