import type { ChatMessage } from '../services/providers/types';

export interface ChatResponse {
  id: string;
  requestId: string;
  provider: string;
  model: string;
  keyId?: string;
  content: string;
  latency: number;
  status: 'loading' | 'done' | 'error' | 'cancelled';
  error?: string;
  tokens?: number;
  ttft?: number;
  tps?: number;
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
  };
}
