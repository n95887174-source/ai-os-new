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

  // Control & Trace
  'trace:updated': any[];
  'agent:config_updated': { id: string; config: any };
  'system:reload': { timestamp: number };
  'system:command': any;

  // Cognitive Pipeline
  'cognitive:step:active': EventPayloads['cognitive:step:active'];
  'cognitive:step:completed': EventPayloads['cognitive:step:completed'];
  'cognitive:step:add': any;
  'cognitive:decision:made': any;

  // Tool Execution
  'tool:execution:start': { toolId: string; input: any };
  'tool:execution:success': { toolId: string; output: any };
  'tool:execution:error': { toolId: string; error: string };
  'tools:updated': any[];

  // Debate
  'debate:updated': any;
  'debate:started': any;
  'debate:argument': any;
  'debate:consensus': { topic: string; consensus: string; convergenceScore: number };

  // Policy & Security
  'policy:violation': any;

  // Roles
  'roles:updated': Role[];
  'role:assigned': { roleId: string; nodeId: string };
  'role:unassigned': { roleId: string; nodeId: string };
  'tool:check': string;

  // Snapshots
  'snapshot:captured': any;

  // Orchestration
  'request:incoming': EventPayloads['request:incoming'];
  'request:completed': EventPayloads['request:completed'];
  'system:topology:mounted': any;
  'system:node:spawn': any;
  'system:discovery:bound': any;

  // Advisor
  'advisor:suggestion': any;
  'advisor:suggestion_executed': { id: string; estimatedSavings?: { latency?: number; cost?: number } };
  'advisor:suggestion_dismissed': { id: string };
  'advisor:suggestion_effectiveness': { improved: boolean; measuredAt: number; metricBefore: number; metricAfter: number };

  // Pricing
  'pricing:updated': any;

  // Memory
  'memory:updated': any[];

  // Settings
  'settings:updated': { settings: SystemSettings; changes: Partial<SystemSettings> };

  // Skills
  'skills:updated': CognitiveSkill[];

  // MCP
  'mcp:updated': MCPServerConfig[];

  // System Activity
  '*': { event: string; data: any };
};

type Callback<T = any> = (data: T) => void;

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
      globalHandlers.forEach(callback => (callback as Callback<EventMap['*']>)({ event: event as string, data }));
    }
  }

  subscribeAll(callback: (payload: { event: string; data: any }) => void) {
    return this.on('*', callback as Callback<EventMap['*']>);
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
  CHAT_MESSAGE: 'chat:send' as const,
  CANCEL_MESSAGE: 'chat:cancel' as const,
  MESSAGE_RESPONSE: 'chat:response' as const,
  SELECT_MODEL: 'chat:select_model' as const,
  START_CHAT_WITH_TARGET: 'chat:start_with_target' as const,
  NAVIGATE: 'system:navigate' as const,
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
