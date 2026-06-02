export const ChatEvents = {
  SEND: 'chat:send',
  CANCEL: 'chat:cancel',
  RESPONSE: 'chat:response',
  STREAM_START: 'chat:stream:start',
  STREAM_CHUNK: 'chat:stream:chunk',
  STREAM_END: 'chat:stream:end',
  STREAM_ERROR: 'chat:stream:error',
  SELECT_MODEL: 'chat:model:select',
  START_WITH_TARGET: 'chat:target:start',
  SUMMARY_CREATED: 'chat:summary:created',
} as const;

export type ChatEventMap = {
  'chat:send': ChatSendPayload;
  'chat:cancel': { requestId: string };
  'chat:response': unknown;
  'chat:stream:start': StreamLifecyclePayload;
  'chat:stream:chunk': StreamChunkPayload;
  'chat:stream:end': StreamEndPayload;
  'chat:stream:error': StreamErrorPayload;
  'chat:model:select': { provider: string; model: string };
  'chat:target:start': { provider: string; model: string; keyId: string };
  'chat:summary:created': { sessionId: string; messageCount: number; keyFactsCount: number };
};

export interface ChatSendPayload {
  provider: string;
  model: string;
  messages: unknown[];
  requestId?: string;
  strategy?: string;
  keyId?: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}

export interface StreamLifecyclePayload {
  requestId: string;
  provider: string;
  model: string;
  keyId?: string;
}

export interface StreamChunkPayload {
  requestId: string;
  provider: string;
  chunk: string;
  keyId?: string;
}

export interface StreamEndPayload {
  requestId: string;
  fullContent: string;
  latency: number;
  tokens?: number;
  provider?: string;
  model?: string;
  keyId?: string;
  ttft?: number;
  tps?: number;
}

export interface StreamErrorPayload {
  requestId: string;
  provider: string;
  error: string;
  keyId?: string;
}
