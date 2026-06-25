import { useEffect } from 'react';
import { useChatStore } from './store';
import type { ChatSession } from './types';
import { DEFAULT_SESSION, SESSION_BATCH_SIZE } from './types';
import type { SessionStore } from '../../kernel/contracts/storage/session-store';
import { runtime } from '../../kernel/runtime';
import { BucketStorageAdapter } from '../../kernel/instances';
import { waitForStorage } from '../../kernel/services/storage/sqlite-storage';

const CHECKPOINT_KEY = 'chat_checkpoint';

let _sessionStore: SessionStore | null = null;
function resolveSessionStore(): SessionStore | null {
  if (_sessionStore) return _sessionStore;
  _sessionStore = runtime.getService<{ sessions: SessionStore }>('storageLayer')?.sessions ?? null;
  return _sessionStore;
}

export function useChatStoreHydration(): void {
  useEffect(() => {
    let cancelled = false;
    let syncTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = async () => {
      if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
      const sStore = resolveSessionStore();
      if (!sStore) return;
      const state = useChatStore.getState();
      try {
        await sStore.syncSessions(state.sessions, [...state.deletedIds]);
      } catch (e) {
        console.error('[ChatStore] Failed to sync to Dexie', e);
      } finally {
        if (useChatStore.getState().deletedIds.size > 0) {
          useChatStore.setState({ deletedIds: new Set() });
        }
      }
    };

    const load = async () => {
      try {
        const storage = await waitForStorage();
        if (cancelled) return;
        const sStore = storage?.sessions ?? null;
        if (!sStore) {
          console.warn('[ChatStore] SessionStore unavailable — using default session');
          useChatStore.setState({ isLoaded: true });
          return;
        }
        _sessionStore = sStore;
        const total = await sStore.count();

        // Check for recovery checkpoint (set by beforeunload) before legacy data
        const checkpoint = BucketStorageAdapter.getItem(CHECKPOINT_KEY);
        if (checkpoint) {
          try {
            const parsed = JSON.parse(checkpoint) as ChatSession[];
            if (parsed.length > 0) {
              // H6: Merge instead of overwrite — only put sessions not already in Dexie
              for (const session of parsed) {
                const existing = await sStore.getSession(session.id);
                if (!existing) {
                  await sStore.put(session);
                }
              }
              const batch = await sStore.listSessions(SESSION_BATCH_SIZE);
              useChatStore.setState({
                sessions: batch,
                activeSessionId: batch[0]?.id ?? 'default',
                hasMoreSessions: batch.length < (await sStore.count()),
              });
            }
          } catch { /* ignore corrupt checkpoint */ }
          BucketStorageAdapter.removeItem(CHECKPOINT_KEY);
          return;
        }

        const legacyData = BucketStorageAdapter.getItem('super_agents_chat_sessions');
        if (legacyData) {
          try {
            const parsed = JSON.parse(legacyData) as ChatSession[];
            if (parsed.length > 0) {
              // H6: Merge — don't overwrite newer Dexie data
              for (const session of parsed) {
                const existing = await sStore.getSession(session.id);
                if (!existing) {
                  await sStore.put(session);
                }
              }
              const migratedTotal = await sStore.count();
              const batch = await sStore.listSessions(SESSION_BATCH_SIZE);
              useChatStore.setState({
                sessions: batch,
                activeSessionId: batch[0]?.id ?? 'default',
                hasMoreSessions: batch.length < migratedTotal,
              });
            }
          } catch { /* ignore corrupt localStorage data */ }
          BucketStorageAdapter.removeItem('super_agents_chat_sessions');
          BucketStorageAdapter.removeItem('super_agents_chat_sessions_ts');
        } else if (total > 0) {
          const batch = await sStore.listSessions(SESSION_BATCH_SIZE);
          useChatStore.setState({
            sessions: batch,
            activeSessionId: batch[0]?.id ?? 'default',
            hasMoreSessions: batch.length < total,
          });
        } else {
          await sStore.put(DEFAULT_SESSION);
        }
      } catch (e) {
        console.warn('[ChatStore] Dexie unavailable, using default session:', e instanceof Error ? e.message : e);
      } finally {
        if (!cancelled) useChatStore.setState({ isLoaded: true });
      }
    };

    load();

    const unsubPersist = useChatStore.subscribe((state, prevState) => {
      if (!state.isLoaded) return;
      // Flush immediately on critical operations (session change, message send)
      if (state.activeSessionId !== prevState.activeSessionId || state.sessions.length !== prevState.sessions.length) {
        if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
        flush();
        return;
      }
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(flush, 1000);
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // C2: beforeunload — sync localStorage checkpoint in case flush() hasn't completed
    const handleBeforeUnload = () => {
      try {
        const state = useChatStore.getState();
        if (state.sessions.length > 0) {
          BucketStorageAdapter.setItem(CHECKPOINT_KEY, JSON.stringify(state.sessions));
        }
      } catch { /* best-effort checkpoint */ }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cancelled = true;
      if (syncTimer) clearTimeout(syncTimer);
      unsubPersist();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
