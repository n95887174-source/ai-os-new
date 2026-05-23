export interface ChatSession {
  id: string;
  title: string;
  history: ChatEntry[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export interface ChatEntry {
  id: string;
  requestId?: string;
  role: 'user';
  text: string;
  responses: unknown[];
  timestamp: number;
  parentId?: string;
  recalledMemories?: { content: string; score?: number }[];
}

export interface SessionStore {
  saveSession(session: ChatSession): Promise<void>;
  put(session: ChatSession): Promise<void>;
  getSession(id: string): Promise<ChatSession | null>;
  listSessions(limit?: number, offset?: number): Promise<ChatSession[]>;
  deleteSession(id: string): Promise<void>;
  bulkPut(sessions: ChatSession[]): Promise<void>;
  count(): Promise<number>;
  exportAll(): Promise<string>;
  importAll(payload: string): Promise<void>;
  clear(): Promise<void>;
}
