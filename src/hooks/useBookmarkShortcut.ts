import { useEffect } from 'react';
import { eventBus } from '../core/events';
import { storageAdapter } from '../kernel/instances';
import { ChatBookmarksService } from '../kernel/services/chat-bookmarks-service';
import type { ChatBookmark } from '../kernel/services/chat-bookmarks-service';

const service = new ChatBookmarksService({
  eventBus: {
    on: (event, cb) => eventBus.on(event, cb),
    emit: (event, data) => eventBus.emit(event, data),
  },
  storage: {
    list: async () => {
      const raw = storageAdapter.getItem('chat_bookmarks_v1');
      if (!raw) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ChatBookmark[]) : [];
      } catch { return []; }
    },
    save: async (b) => {
      const raw = storageAdapter.getItem('chat_bookmarks_v1');
      let list: ChatBookmark[] = [];
      try { list = JSON.parse(raw ?? '[]') as ChatBookmark[]; } catch { list = []; }
      list = [b, ...list.filter(x => x.id !== b.id)].slice(0, 500);
      storageAdapter.setItem('chat_bookmarks_v1', JSON.stringify(list));
    },
    delete: async (id) => {
      const raw = storageAdapter.getItem('chat_bookmarks_v1');
      let list: ChatBookmark[] = [];
      try { list = JSON.parse(raw ?? '[]') as ChatBookmark[]; } catch { list = []; }
      storageAdapter.setItem('chat_bookmarks_v1', JSON.stringify(list.filter(x => x.id !== id)));
    },
    clear: async () => storageAdapter.removeItem('chat_bookmarks_v1'),
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
        eventBus.emit('chat:bookmark:request', undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const unsub = eventBus.on('chat:bookmark:save', (raw: unknown) => {
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
