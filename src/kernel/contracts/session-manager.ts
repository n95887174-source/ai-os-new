export type SessionType = 'debate' | 'chat';

export type SessionStatus = 'active' | 'paused' | 'completed' | 'archived' | 'failed';

export interface SessionMeta {
  id: string;
  type: SessionType;
  title: string;
  status: SessionStatus;
  tags: string[];
  folder: string;
  isArchived: boolean;
  isPinned: boolean;
  createdAt: number;
  updatedAt: number;
  linkedSessionIds: string[];
}

export interface SessionLink {
  id: string;
  fromId: string;
  toId: string;
  linkType: 'chat_to_debate' | 'debate_to_chat' | 'continuation' | 'derivative';
  context: string;
  createdAt: number;
}

export interface SessionFilters {
  type?: SessionType;
  status?: SessionStatus;
  tags?: string[];
  folder?: string;
  search?: string;
  isArchived?: boolean;
}

export interface DebateTimelineEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  type: string;
  payload: string;
}

export interface DebateOverride {
  id: string;
  sessionId: string;
  type: string;
  payload: string;
  appliedAt: number;
}

export interface ISessionManager {
  create(type: SessionType, meta: Partial<SessionMeta>): Promise<string>;
  load(id: string): Promise<SessionMeta | null>;
  save(id: string): Promise<void>;
  pause(id: string): Promise<void>;
  resume(id: string): Promise<void>;
  list(filters: SessionFilters): Promise<SessionMeta[]>;
  archive(id: string): Promise<void>;
  unarchive(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  link(fromId: string, toId: string, linkType: SessionLink['linkType'], context?: string): Promise<void>;
  getLinked(id: string): Promise<SessionLink[]>;
  updateMeta(id: string, updates: Partial<SessionMeta>): Promise<void>;
}
