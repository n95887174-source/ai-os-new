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

export interface Tool {
  type?: string;
  name?: string;
  description?: string;
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
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
