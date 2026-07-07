import { genId } from '../../utils/gen-id';
import type { ILogger } from '../contracts/logger';
import type { ChatMessage } from '../types/llm-types';
import type { IDatabaseService } from '../types/interfaces';
import { BucketStorageAdapter } from './storage-adapter';
import { EVENTS } from '../events/event-names';

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
    database: IDatabaseService;
    storage?: {
        list: () => Promise<ChatBookmark[]>;
        save: (bookmark: ChatBookmark) => Promise<void>;
        delete: (id: string) => Promise<void>;
        clear: () => Promise<void>;
    };
}

const STORAGE_KEY = 'chat_bookmarks_v1';

function createDbStorage(db: IDatabaseService): NonNullable<ChatBookmarksServiceDeps['storage']> {
    return {
        async list(): Promise<ChatBookmark[]> {
            // Migration read: prefer db, fall back to localStorage for existing data
            const raw = await db.getKv<ChatBookmark[]>(STORAGE_KEY);
            const lsRaw = await migrateFromLocalStorage();
            if (raw && raw.length > 0 && (!lsRaw || lsRaw.length === 0)) {
                return raw;
            }
            if (lsRaw && lsRaw.length > 0) {
                await db.setKv(STORAGE_KEY, lsRaw);
                await BucketStorageAdapter.UI.remove(STORAGE_KEY);
                return lsRaw;
            }
            return raw && raw.length > 0 ? raw : [];
        },
        async save(bookmark: ChatBookmark): Promise<void> {
            const all = await db.getKv<ChatBookmark[]>(STORAGE_KEY);
            const list = Array.isArray(all) ? all : [];
            const filtered = list.filter((b) => b.id !== bookmark.id);
            filtered.unshift(bookmark);
            const truncated = filtered.slice(0, 500);
            if (truncated.length < filtered.length) {
                console.warn(
                    `[ChatBookmarks] Truncated ${filtered.length - 500} bookmarks (max 500)`,
                );
            }
            await db.setKv(STORAGE_KEY, truncated);
        },
        async delete(id: string): Promise<void> {
            const all = await db.getKv<ChatBookmark[]>(STORAGE_KEY);
            const list = Array.isArray(all) ? all : [];
            await db.setKv(
                STORAGE_KEY,
                list.filter((b) => b.id !== id),
            );
        },
        async clear(): Promise<void> {
            await db.setKv(STORAGE_KEY, []);
        },
    };
}

async function migrateFromLocalStorage(): Promise<ChatBookmark[] | null> {
    try {
        const raw = await BucketStorageAdapter.UI.get<ChatBookmark[]>(STORAGE_KEY);
        if (raw && Array.isArray(raw) && raw.length > 0) return raw;
    } catch {
        /* ignore */
    }
    return null;
}

export class ChatBookmarksService {
    private deps: ChatBookmarksServiceDeps;
    private storage: NonNullable<ChatBookmarksServiceDeps['storage']>;
    private cache: Map<string, ChatBookmark> = new Map();
    private initialized = false;
    private unsubs: Array<() => void> = [];

    constructor(deps: ChatBookmarksServiceDeps) {
        this.deps = deps;
        this.storage = deps.storage ?? createDbStorage(deps.database);
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
        this.unsubs.push(
            this.deps.eventBus.on(EVENTS.CHAT_REWOUND, (...args: unknown[]) => {
                const data = args[0] as { sessionId?: string } | undefined;
                if (data?.sessionId) {
                    const sessionId = data.sessionId;
                    const toRemove: string[] = [];
                    for (const [id, b] of this.cache) {
                        if (b.sessionId === sessionId) {
                            toRemove.push(id);
                            this.cache.delete(id);
                        }
                    }
                    for (const id of toRemove) {
                        this.storage.delete(id).catch((err) =>
                            this.deps.logger?.warn('ChatBookmarks', 'rewind delete failed', {
                                error: String(err),
                            }),
                        );
                    }
                }
            }),
        );
        this.initialized = true;
    }

    destroy(): void {
        this.unsubs.forEach((u) => u());
        this.unsubs = [];
        this.cache.clear();
    }

    async addBookmark(input: {
        sessionId: string;
        message: ChatMessage;
        note?: string;
        tags?: string[];
    }): Promise<ChatBookmark> {
        const bookmark: ChatBookmark = {
            id: genId('bm'),
            sessionId: input.sessionId,
            messageId: (input.message as ChatMessage & { id?: string }).id ?? `m_${Date.now()}`,
            role: input.message.role,
            content: input.message.content ?? '',
            note: input.note,
            tags: input.tags ?? [],
            createdAt: Date.now(),
        };
        this.cache.set(bookmark.id, bookmark);
        if (this.cache.size > 500) {
            const sorted = Array.from(this.cache.entries()).sort(
                ([, a], [, b]) => b.createdAt - a.createdAt,
            );
            const toRemove = sorted.slice(500);
            for (const [id] of toRemove) this.cache.delete(id);
        }
        try {
            await this.storage.save(bookmark);
        } catch (err) {
            this.deps.logger?.warn('ChatBookmarks', 'persist failed', { error: String(err) });
        }
        this.deps.eventBus.emit(EVENTS.CHAT_BOOKMARK_ADDED, bookmark);
        return bookmark;
    }

    async removeBookmark(id: string): Promise<void> {
        this.cache.delete(id);
        try {
            await this.storage.delete(id);
        } catch (err) {
            this.deps.logger?.warn('ChatBookmarks', 'delete failed', { error: String(err) });
        }
        this.deps.eventBus.emit(EVENTS.CHAT_BOOKMARK_REMOVED, { id });
    }

    async clearAll(): Promise<void> {
        this.cache.clear();
        try {
            await this.storage.clear();
        } catch (err) {
            this.deps.logger?.warn('ChatBookmarks', 'clear failed', { error: String(err) });
        }
        this.deps.eventBus.emit(EVENTS.CHAT_BOOKMARK_CLEARED, undefined);
    }

    listAll(): ChatBookmark[] {
        return Array.from(this.cache.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    listBySession(sessionId: string): ChatBookmark[] {
        return this.listAll().filter((b) => b.sessionId === sessionId);
    }

    listByTag(tag: string): ChatBookmark[] {
        const lc = tag.toLowerCase();
        return this.listAll().filter((b) => b.tags.some((t) => t.toLowerCase() === lc));
    }

    search(query: string): ChatBookmark[] {
        if (!query.trim()) return this.listAll();
        const q = query.toLowerCase();
        return this.listAll().filter(
            (b) =>
                b.content.toLowerCase().includes(q) ||
                b.note?.toLowerCase().includes(q) ||
                b.tags.some((t) => t.toLowerCase().includes(q)),
        );
    }

    count(): number {
        return this.cache.size;
    }

    countBySession(sessionId: string): number {
        return this.listBySession(sessionId).length;
    }

    isBookmarked(sessionId: string, messageId: string): boolean {
        return this.listAll().some((b) => b.sessionId === sessionId && b.messageId === messageId);
    }

    getAllTags(): string[] {
        const set = new Set<string>();
        for (const b of this.cache.values()) {
            for (const t of b.tags) set.add(t);
        }
        return Array.from(set).sort();
    }
}
