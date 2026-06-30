import { useEffect } from 'react';
import { eventBus, type EventMap } from '../kernel/events/event-bus';
import { database } from '../kernel/instances';
import { EVENTS } from '../kernel/events/event-names';
import { ChatBookmarksService } from '../kernel/services/chat-bookmarks-service';

const service = new ChatBookmarksService({
    eventBus: {
        on: (event: string, cb: (...args: unknown[]) => void) =>
            eventBus.on(event as keyof EventMap, cb as (...args: unknown[]) => void),
        emit: (event: string, data?: unknown) =>
            eventBus.emit(event as keyof EventMap, data as EventMap[keyof EventMap]),
    },
    database,
});

void service.init();
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        service.destroy?.();
    });
}

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
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, []);
}
