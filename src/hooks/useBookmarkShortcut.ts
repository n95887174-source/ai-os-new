import { useEffect } from 'react';
import { eventBus } from '../kernel/events/event-bus';
import { chatBookmarksService } from '../kernel/instances';
import { EVENTS } from '../kernel/events/event-names';

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
            void chatBookmarksService.addBookmark({
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
