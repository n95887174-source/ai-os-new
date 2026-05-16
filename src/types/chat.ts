import type { ChatMessage } from '../llm/core/types';

export type ChatStatus = 'loading' | 'done' | 'error' | 'cancelled' | 'streaming' | 'queued';
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';
export type ChatStrategy = 'auto' | 'broadcast' | 'race' | 'performance' | 'cost' | 'latency' | 'manual';

export interface ChatResponse {
  id: string;
  requestId: string;
  provider: string;
  model: string;
  keyId?: string;
  content: string;
  latency: number;
  status: ChatStatus;
  error?: string;
  tokens?: number;
  ttft?: number;
  tps?: number;
  cost?: number;
  strategy?: ChatStrategy;
  finishReason?: string;
  timestamp?: number;
}

export interface QueuedRequest {
  requestId: string;
  provider: string;
  model: string;
  messages: ChatMessage[];
  keyId?: string;
  options?: {
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
    strategy?: ChatStrategy;
    timeout?: number;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  };
  priority?: 'low' | 'normal' | 'high';
  createdAt?: number;
}

export interface ChatStreamChunk {
  requestId: string;
  chunk: string;
  provider: string;
  model: string;
  keyId?: string;
  timestamp: number;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatStreamResult {
  requestId: string;
  fullContent: string;
  latency: number;
  tokens?: number;
  provider?: string;
  model?: string;
  keyId?: string;
  ttft?: number;
  tps?: number;
  cost?: number;
  finishReason?: string;
}

export interface ChatError {
  requestId: string;
  provider: string;
  model: string;
  error: string;
  code?: string;
  statusCode?: number;
  retryable?: boolean;
  timestamp: number;
}

export interface ChatSessionInfo {
  id: string;
  title: string;
  model: string;
  provider: string;
  strategy: ChatStrategy;
  messageCount: number;
  tokenCount: number;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
}

export interface ChatCompletionRequest {
  provider: string;
  model: string;
  messages: ChatMessage[];
  keyId?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
}

export interface ChatCompletionResponse {
  content: string;
  latency: number;
  tokens: number;
  ttft: number;
  tps: number;
  cost: number;
  model: string;
  provider: string;
  finishReason: string;
  raw?: unknown;
}

export interface ChatHistoryEntry {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  provider?: string;
  model?: string;
  tokens?: number;
  latency?: number;
}

export interface ChatUsageStats {
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  topModels: Array<{ model: string; count: number }>;
  topProviders: Array<{ provider: string; count: number }>;
  dailyUsage: Array<{ date: string; messages: number; tokens: number }>;
}
