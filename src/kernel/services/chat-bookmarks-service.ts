import type { ILogger } from '../contracts/logger';
import type { ChatMessage } from '../../llm/core/types';

export interface ChatBookmark {
  id: string;
  sessionId: string;
  messageId: string;
  role: ChatMessage['role'];
  content: string;
  note?: string;
  tags: string[];
  createdAt: number;
}

export interface ChatBookmarksServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  logger?: ILogger;
  storage?: {
    list: () => Promise<ChatBookmark[]>;
    save: (bookmark: ChatBookmark) => Promise<void>;
    delete: (id: string) => Promise<void>;
    clear: () => Promise<void>;
  };
}

const STORAGE_KEY = 'chat_bookmarks_v1';

const defaultStorage = {
  async list(): Promise<ChatBookmark[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ChatBookmark[]) : [];
    } catch {
      return [];
    }
  },
  async save(bookmark: ChatBookmark): Promise<void> {
    const all = await defaultStorage.list();
    const filtered = all.filter(b => b.id !== bookmark.id);
    filtered.unshift(bookmark);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 500)));
  },
  async delete(id: string): Promise<void> {
    const all = await defaultStorage.list();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(b => b.id !== id)));
  },
  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  },
};

export class ChatBookmarksService {
  private deps: ChatBookmarksServiceDeps;
  private storage: NonNullable<ChatBookmarksServiceDeps['storage']>;
  private cache: Map<string, ChatBookmark> = new Map();
  private initialized = false;

  constructor(deps: ChatBookmarksServiceDeps) {
    this.deps = deps;
    this.storage = deps.storage ?? defaultStorage;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const all = await this.storage.list();
      this.cache.clear();
      for (const b of all) this.cache.set(b.id, b);
    } catch (err) {
      this.deps.logger?.error('ChatBookmarks', 'init failed', { error: String(err) });
    }
    this.initialized = true;
  }

  destroy(): void {
    this.cache.clear();
  }

  async addBookmark(input: {
    sessionId: string;
    message: ChatMessage;
    note?: string;
    tags?: string[];
  }): Promise<ChatBookmark> {
    const bookmark: ChatBookmark = {
      id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId: input.sessionId,
      messageId: (input.message as ChatMessage & { id?: string }).id ?? `m_${Date.now()}`,
      role: input.message.role,
      content: input.message.content ?? '',
      note: input.note,
      tags: input.tags ?? [],
      createdAt: Date.now(),
    };
    this.cache.set(bookmark.id, bookmark);
    try {
      await this.storage.save(bookmark);
    } catch (err) {
      this.deps.logger?.warn('ChatBookmarks', 'persist failed', { error: String(err) });
    }
    this.deps.eventBus.emit('chat:bookmark:added', bookmark);
    return bookmark;
  }

  async removeBookmark(id: string): Promise<void> {
    this.cache.delete(id);
    try {
      await this.storage.delete(id);
    } catch (err) {
      this.deps.logger?.warn('ChatBookmarks', 'delete failed', { error: String(err) });
    }
    this.deps.eventBus.emit('chat:bookmark:removed', { id });
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
    try {
      await this.storage.clear();
    } catch (err) {
      this.deps.logger?.warn('ChatBookmarks', 'clear failed', { error: String(err) });
    }
    this.deps.eventBus.emit('chat:bookmark:cleared', undefined);
  }

  listAll(): ChatBookmark[] {
    return Array.from(this.cache.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  listBySession(sessionId: string): ChatBookmark[] {
    return this.listAll().filter(b => b.sessionId === sessionId);
  }

  listByTag(tag: string): ChatBookmark[] {
    const lc = tag.toLowerCase();
    return this.listAll().filter(b => b.tags.some(t => t.toLowerCase() === lc));
  }

  search(query: string): ChatBookmark[] {
    if (!query.trim()) return this.listAll();
    const q = query.toLowerCase();
    return this.listAll().filter(
      b =>
        b.content.toLowerCase().includes(q) ||
        b.note?.toLowerCase().includes(q) ||
        b.tags.some(t => t.toLowerCase().includes(q)),
    );
  }

  count(): number {
    return this.cache.size;
  }

  countBySession(sessionId: string): number {
    return this.listBySession(sessionId).length;
  }

  isBookmarked(sessionId: string, messageId: string): boolean {
    return this.listAll().some(b => b.sessionId === sessionId && b.messageId === messageId);
  }

  getAllTags(): string[] {
    const set = new Set<string>();
    for (const b of this.cache.values()) {
      for (const t of b.tags) set.add(t);
    }
    return Array.from(set).sort();
  }
}

let _instance: ChatBookmarksService | null = null;

export function getChatBookmarksService(deps?: ChatBookmarksServiceDeps): ChatBookmarksService {
  if (!_instance && deps) {
    _instance = new ChatBookmarksService(deps);
  }
  if (!_instance) {
    throw new Error('ChatBookmarksService not initialized');
  }
  return _instance;
}

export function resetChatBookmarksService(): void {
  _instance = null;
}
