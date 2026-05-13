import type { ApiKey, SystemState, DecisionTrace } from '../types/metrics';
import type { ChatResponse } from '../types/chat';
import type { ChatMessage } from '../services/providers/types';
import type { SystemSettings } from '../services/SettingsService';
import type { CognitiveSkill } from '../types/domain';
import type { MCPServerConfig } from '../services/MCPService';
import type { Role } from '../types/role';
import type { 
  EventPayloads
} from '../types/domain';
import { EventValidators } from '../types/schemas';

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
  'chat:start_with_target': { provider: string; model: string; keyId: string };
  'system:navigate': string;
  'system:notification': { message: string; type: 'success' | 'error' | 'info' | 'warning'; source?: string; savings?: { latency?: number; cost?: number } };
  
  // Chat Lifecycle (Legacy/Full)
  'chat:send': { 
    provider: string; 
    model: string; 
    messages: ChatMessage[];
    requestId?: string;
    strategy?: string;
    keyId?: string;
  };
  'chat:cancel': { requestId: string };
  'chat:response': ChatResponse;

  // Chat Lifecycle (Streaming)
  'chat:stream:start': { requestId: string; provider: string; model: string; keyId?: string };
  'chat:stream:chunk': { requestId: string; provider: string; chunk: string; keyId?: string };
  'chat:stream:end':   { requestId: string; fullContent: string; latency: number; tokens?: number; provider?: string; model?: string; keyId?: string; ttft?: number; tps?: number };
  'chat:stream:error': { requestId: string; provider: string; error: string; keyId?: string };
  
  // System Internal Events
  'system:decision': DecisionTrace;
  'router:signal': { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number };
  'kernel:updated': SystemState;
  'db:row_inserted': { table: string; id: string | number };
  'system:runtime:ready': { timestamp: number } | void;
  'system:shutdown': { reason?: string } | void;
  'system:clear_data': void;
  'settings:latency_threshold': { keyId?: string; threshold?: number } | void;

  // Health
  'key:health-check-started': string | void;
  'key:health-check-completed': { id?: string; provider?: string; status?: string } | void;

  // Control & Trace
  'trace:updated': unknown[];
  'agent:config_updated': { id: string; config: unknown };
  'system:reload': { timestamp: number };
  'system:command': unknown;

  // Cognitive Pipeline
  'cognitive:step:active': EventPayloads['cognitive:step:active'];
  'cognitive:step:completed': EventPayloads['cognitive:step:completed'];
  'cognitive:decision:made': unknown;

  // Tool Execution
  'tool:execution:start': { toolId: string; input: unknown };
  'tool:execution:success': { toolId: string; output: unknown };
  'tool:execution:error': { toolId: string; error: string };
  'tools:updated': unknown[];

  // Debate
  'debate:updated': unknown;
  'debate:started': unknown;
  'debate:argument': unknown;
  'debate:consensus': { topic: string; consensus: string; convergenceScore: number };

  // Policy & Security
  'policy:violation': unknown;

  // Roles
  'roles:updated': Role[];
  'role:assigned': { roleId: string; nodeId: string };
  'role:unassigned': { roleId: string; nodeId: string };

  // Snapshots
  'snapshot:captured': unknown;

  // Orchestration
  'request:incoming': EventPayloads['request:incoming'];
  'request:completed': EventPayloads['request:completed'];
  'system:topology:mounted': unknown;
  'system:node:spawn': unknown;
  'system:node:removed': { id: string };

  // Advisor
  'advisor:suggestion': unknown;
  'advisor:suggestion_executed': { id: string; estimatedSavings?: { latency?: number; cost?: number } };
  'advisor:suggestion_dismissed': { id: string };
  'advisor:suggestion_effectiveness': { improved: boolean; measuredAt: number; metricBefore: number; metricAfter: number };

  // Pricing
  'pricing:updated': unknown;

  // Memory
  'memory:updated': unknown[];

  // Settings
  'settings:updated': { settings: SystemSettings; changes: Partial<SystemSettings> };

  // Skills
  'skills:updated': CognitiveSkill[];

  // MCP
  'mcp:updated': MCPServerConfig[];

  // System Activity
  '*': { event: string; data: Record<string, unknown> };
};

type Callback<T = unknown> = (data: T) => void;

class EventBus {
  private listenerMap = new Map<keyof EventMap, Callback<unknown>[]>();

  on<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    const handlers = this.listenerMap.get(event) ?? [];
    handlers.push(callback as Callback<unknown>);
    this.listenerMap.set(event, handlers);
    return () => this.off(event, callback);
  }

  off<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    const handlers = this.listenerMap.get(event);
    if (!handlers) return;
    this.listenerMap.set(event, handlers.filter(cb => cb !== (callback as Callback<unknown>)));
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    const validator = EventValidators[event as string];
    if (validator) {
      try {
        data = validator.parse(data) as EventMap[K];
      } catch (e) {
        console.warn(`[EventBus] Validation failed for ${event}:`, e);
      }
    }

    if (import.meta.env.DEV) {
      console.debug(`[EventBus] EMIT: ${event}`, data);
    }
    const handlers = this.listenerMap.get(event);
    if (handlers) {
      handlers.forEach(callback => {
        try { (callback as Callback<EventMap[K]>)(data); } catch (e) { console.error(`[EventBus] Error in callback for ${event}:`, e); }
      });
    }
    const globalHandlers = this.listenerMap.get('*');
    if (globalHandlers && event !== '*') {
      globalHandlers.forEach(callback => (callback as Callback<EventMap['*']>)({ event: event as string, data: data as unknown as Record<string, unknown> }));
    }
  }

  subscribeAll(callback: (payload: { event: string; data: Record<string, unknown> }) => void) {
    return this.on('*', callback as Callback<EventMap['*']>);
  }

  /** Reset all listeners — useful for test isolation */
  reset(): void {
    this.listenerMap.clear();
  }
}

export const eventBus = new EventBus();

// Compatibility layer
export const EVENTS = {
  KEYS_LOADED: 'key:loaded' as const,
  KEY_ADDED: 'key:added' as const,
  KEY_REMOVED: 'key:removed' as const,
  CHECK_HEALTH: 'health:check' as const,
  CHECK_ALL_HEALTH: 'health:check_all' as const,
  SEND_MESSAGE: 'chat:send' as const,
  CANCEL_MESSAGE: 'chat:cancel' as const,
  MESSAGE_RESPONSE: 'chat:response' as const,
  SELECT_MODEL: 'chat:select_model' as const,
  START_CHAT_WITH_TARGET: 'chat:start_with_target' as const,
  NAVIGATE: 'system:navigate' as const,
  NOTIFICATION: 'system:notification' as const,
  STREAM_START: 'chat:stream:start' as const,
  STREAM_CHUNK: 'chat:stream:chunk' as const,
  STREAM_END:   'chat:stream:end'   as const,
  STREAM_ERROR: 'chat:stream:error' as const,
  KEY_HEALTH_STARTED: 'key:health-check-started' as const,
  KEY_HEALTH_COMPLETED: 'key:health-check-completed' as const,
  KEY_HEALTH_FAILED: 'key:health-check-failed' as const,
  KEY_LATENCY_BURST: 'key:latency-burst' as const,
  KEY_QUOTA_EXCEEDED: 'key:quota-exceeded' as const,
  KEY_REPUTATION_DOWN: 'key:reputation-threshold-crossed' as const,
  KEY_STATE_CHANGED: 'key:state-changed' as const,
};
