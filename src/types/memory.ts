export type MemoryEntry = {
  id: string;
  content: string;
  vector?: number[];
  metadata: {
    source: string;
    type: 'decision' | 'observation' | 'fact' | 'chat_response' | 'chat_query' | string;
    timestamp: number;
    importance: number;
    chatId?: string;
    requestId?: string;
  };
  score?: number;
};
