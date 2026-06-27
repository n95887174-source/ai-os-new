import { useEffect } from 'react';
import { eventBus, type EventMap } from '../kernel/events/event-bus';
import { BucketStorageAdapter } from '../kernel/instances';
import { EVENTS } from '../kernel/events/event-names';
import { ChatBookmarksService } from '../kernel/services/chat-bookmarks-service';
import type { ChatBookmark } from '../kernel/services/chat-bookmarks-service';

const service = new ChatBookmarksService({
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => eventBus.on(event as keyof EventMap, cb as (...args: unknown[]) => void),
    emit: (event: string, data?: unknown) => eventBus.emit(event as keyof EventMap, data as EventMap[keyof EventMap]),
  },
  storage: {
    list: async () => {
      const raw = BucketStorageAdapter.getItem('chat_bookmarks_v1');
      if (!raw) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ChatBookmark[]) : [];
      } catch { return []; }
    },
    save: async (b) => {
      const raw = BucketStorageAdapter.getItem('chat_bookmarks_v1');
      const list: ChatBookmark[] = JSON.parse(raw ?? '[]') as ChatBookmark[];
      const updated = [b, ...list.filter(x => x.id !== b.id)].slice(0, 500);
      BucketStorageAdapter.setItem('chat_bookmarks_v1', JSON.stringify(updated));
    },
    delete: async (id) => {
      const raw = BucketStorageAdapter.getItem('chat_bookmarks_v1');
      const list: ChatBookmark[] = JSON.parse(raw ?? '[]') as ChatBookmark[];
      BucketStorageAdapter.setItem('chat_bookmarks_v1', JSON.stringify(list.filter(x => x.id !== id)));
    },
    clear: async () => BucketStorageAdapter.removeItem('chat_bookmarks_v1'),
  },
});

void service.init();

interface BookmarkShortcutPayload {
  sessionId: string;
  message: { role: 'user' | 'assistant' | 'system' | 'tool'; content: string; id?: string };
  note?: string;
  tags?: string[];
}

export function useBookmarkShortcut(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        eventBus.emit(EVENTS.CHAT_BOOKMARK_REQUEST, undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const unsub = eventBus.on(EVENTS.CHAT_BOOKMARK_SAVE, (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const data = raw as BookmarkShortcutPayload;
      if (!data.sessionId || !data.message?.content) return;
      void service.addBookmark({
        sessionId: data.sessionId,
        message: data.message,
        note: data.note,
        tags: data.tags ?? [],
      });
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);
}
