export const ChatEvents = {
  SEND: 'chat:send',
  CANCEL: 'chat:cancel',
  RESPONSE: 'chat:response',
  STREAM_START: 'chat:stream_start',
  STREAM_CHUNK: 'chat:stream_chunk',
  STREAM_END: 'chat:stream_end',
  STREAM_ERROR: 'chat:stream_error',
  SELECT_MODEL: 'chat:select_model',
  START_WITH_TARGET: 'chat:start_with_target',
} as const;

export type ChatEventMap = {
  'chat:send': ChatSendPayload;
  'chat:cancel': { requestId: string };
  'chat:response': unknown;
  'chat:stream_start': StreamLifecyclePayload;
  'chat:stream_chunk': StreamChunkPayload;
  'chat:stream_end': StreamEndPayload;
  'chat:stream_error': StreamErrorPayload;
  'chat:select_model': { provider: string; model: string };
  'chat:start_with_target': { provider: string; model: string; keyId: string };
};

export interface ChatSendPayload {
  provider: string;
  model: string;
  messages: unknown[];
  requestId?: string;
  strategy?: string;
  keyId?: string;
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
