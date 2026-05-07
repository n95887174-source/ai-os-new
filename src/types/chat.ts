import type { ChatMessage } from '../services/providers/types';

export interface ChatResponse {
  id: string;
  requestId?: string;
  provider: string;
  model: string;
  content: string;
  latency: number;
  status: 'loading' | 'done' | 'error' | 'cancelled';
  error?: string;
  tokens?: number;
}

export interface QueuedRequest {
  provider: string;
  model: string;
  messages: ChatMessage[];
  requestId: string;
  strategy?: string;
}
