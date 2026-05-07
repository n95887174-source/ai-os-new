import type { ApiKey } from '../types/metrics';
import type { ChatResponse } from '../types/chat';
import type { ChatMessage } from '../services/providers/types';
import type { SystemState, DecisionTrace } from '../types/metrics';

// ── Event Map Definition ─────────────────────────────────────────────────────
export type EventMap = {
  // Key Management
  'key:loaded': ApiKey[];
  'key:added': Omit<ApiKey, 'id' | 'stats'>;
  'key:removed': string;
  
  // Health
  'health:check': string;
  'health:check_all': void;
  'key:health-check-failed': { id: string; provider: string; error: string };
  'key:latency-burst': { id: string; provider: string; latency: number };
  'key:quota-exceeded': { id: string; provider: string; quotaType: 'tokens' | 'requests' };
  'key:reputation-threshold-crossed': { id: string; provider: string; score: number };
  'key:state-changed': { id: string; provider: string; state: string; previousState: string };
  
  // UI & Selection
  'chat:select_model': { provider: string; model: string };
  'system:notification': { message: string; type: 'success' | 'error' | 'info' | 'warning' };
  
  // Chat Lifecycle (Legacy/Full)
  'chat:send': { 
    provider: string; 
    model: string; 
    messages: ChatMessage[];
    requestId?: string;
    strategy?: string;
  };
  'chat:cancel': { requestId: string };
  'chat:response': ChatResponse;

  // Chat Lifecycle (Streaming) - New
  'chat:stream:start': { requestId: string; provider: string; model: string };
  'chat:stream:chunk': { requestId: string; provider: string; chunk: string };
  'chat:stream:end':   { requestId: string; provider: string; fullContent: string; tokens?: number; latency: number; ttft?: number };
  'chat:stream:error': { requestId: string; provider: string; error: string };
  
  // System Internal Events
  'system:decision': DecisionTrace;
  'router:signal': { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number };
  'kernel:updated': SystemState;
  'db:row_inserted': { table: string; id: string | number };

  // System Activity
  '*': { event: string; data: any };
};

type Callback<T = any> = (data: T) => void;

class EventBus {
  private listeners: { [K in keyof EventMap]?: Callback<any>[] } = {};

  on<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
    return () => this.off(event, callback);
  }

  off<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    const handlers = this.listeners[event];
    if (!handlers) return;
    this.listeners[event] = handlers.filter(cb => cb !== callback);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    if (import.meta.env.DEV) {
      console.debug(`[EventBus] EMIT: ${event}`, data);
    }
    const handlers = this.listeners[event];
    if (handlers) {
      handlers.forEach(callback => {
        try { callback(data); } catch (e) { console.error(`[EventBus] Error in callback for ${event}:`, e); }
      });
    }
    const globalHandlers = this.listeners['*'];
    if (globalHandlers && (event as string) !== '*') {
      globalHandlers.forEach(callback => callback({ event: event as string, data }));
    }
  }

  subscribeAll(callback: (payload: { event: string; data: any }) => void) {
    return this.on('*', callback as (data: EventMap['*']) => void);
  }
}

export const eventBus = new EventBus();

// Compatibility layer
export const EVENTS = {
  KEYS_LOADED: 'key:loaded' as const,
  KEY_ADDED: 'key:added' as const,
  KEY_REMOVED: 'key:removed' as const,
  CHECK_HEALTH: 'health:check' as const,
  HEALTH_CHECK: 'health:check' as const,
  CHECK_ALL_HEALTH: 'health:check_all' as const,
  SEND_MESSAGE: 'chat:send' as const,
  CANCEL_MESSAGE: 'chat:cancel' as const,
  MESSAGE_RESPONSE: 'chat:response' as const,
  SELECT_MODEL: 'chat:select_model' as const,
  NOTIFICATION: 'system:notification' as const,
  // New Streaming Events
  STREAM_START: 'chat:stream:start' as const,
  STREAM_CHUNK: 'chat:stream:chunk' as const,
  STREAM_END:   'chat:stream:end'   as const,
  STREAM_ERROR: 'chat:stream:error' as const,
  // Key Signals
  KEY_HEALTH_FAILED: 'key:health-check-failed' as const,
  KEY_LATENCY_BURST: 'key:latency-burst' as const,
  KEY_QUOTA_EXCEEDED: 'key:quota-exceeded' as const,
  KEY_REPUTATION_DOWN: 'key:reputation-threshold-crossed' as const,
  KEY_STATE_CHANGED: 'key:state-changed' as const,
};
