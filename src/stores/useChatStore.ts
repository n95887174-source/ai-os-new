// Re-export barrel — decomposed into src/stores/chat/
export type { ChatEntry, ChatSession, ChatStoreShape } from './chat/types';
export { DEFAULT_HISTORY } from './chat/types';
export { useChatStore } from './chat/store';
export { useActiveSessionHistory, useSessions, useActiveSessionId, useSystemPrompt, useHasMoreSessions } from './chat/hooks';
export { useChatStoreHydration } from './chat/hydration';

// Trigger module-level subscriptions (event bus listeners + requestEntryMap rebuild)
import './chat/subscriptions';
