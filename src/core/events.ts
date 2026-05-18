import type { ApiKey, SystemState, DecisionTrace } from '../types/metrics';
import type { ChatResponse } from '../types/chat';
import type { ChatMessage } from '../llm/core/types';
import type { SystemSettings } from '../services/SettingsService';
import type { CognitiveSkill } from '../types/domain';
import type { MCPServerConfig } from '../services/MCPService';
import type { Role } from '../types/role';
import type { 
  EventPayloads
} from '../types/domain';
import { EventValidators } from '../types/schemas';
import { EventBus as KernelEventBus } from '../kernel/event-bus';
export { EVENTS } from '../kernel/events/event-names';

// ── Event Map Definition ─────────────────────────────────────────────────────
export type EventMap = {
  // Key Management
  'key:loaded': ApiKey[];
  'key:added': Omit<ApiKey, 'id' | 'stats'>;
  'key:removed': string;
  
  // Health
  'health:check': string;
  'health:check_all': void;
  'key:health_check_failed': { id: string; provider: string; error: string };
  'key:latency_burst': { id: string; provider: string; latency: number };
  'key:quota_exceeded': { id: string; provider: string; quotaType: 'tokens' | 'requests' };
  'key:reputation_threshold_crossed': { id: string; provider: string; score: number };
  'key:state_changed': { id: string; provider: string; state: string; previousState: string };
  'key:compromise_signal': { id?: string; fingerprint?: string; source?: string };
  'virtual_key:created': { virtualKey: any };
  'virtual_key:resolved': { virtualKeyId: string };
  'virtual_key:revoked': { virtualKeyId: string };
  
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
  'system:runtime_ready': { timestamp: number } | void;
  'system:shutdown': { reason?: string } | void;
  'system:clear_data': void;
  'settings:latency_threshold': { keyId?: string; threshold?: number } | void;

  // Health
  'key:health_check_started': string | void;
  'key:health_check_completed': { id?: string; provider?: string; status?: string } | void;

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
  'tool:execution_start': { toolId: string; input: unknown };
  'tool:execution_success': { toolId: string; output: unknown };
  'tool:execution_error': { toolId: string; error: string };
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

export class EventBus extends KernelEventBus {
  on<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    return super.on(event as string, callback as Callback<unknown>);
  }

  off<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    super.off(event as string, callback as Callback<unknown>);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    const validator = EventValidators[event as string];
    if (validator) {
      const result = validator.safeParse(data);
      if (!result.success) {
        const message = `[EventBus] Validation failed for ${event}: ${result.error.issues[0]?.message || result.error.message}`;
        console.warn(message, result.error);
        setTimeout(() => {
          this.emit('system:notification', {
            message,
            type: 'warning',
            source: 'EventBus'
          });
        }, 0);
      } else {
        data = result.data as EventMap[K];
      }
    }

    if (import.meta.env.DEV) {
      console.debug(`[EventBus] EMIT: ${event}`, data);
    }
    super.emit(event as string, data as unknown);
  }

  subscribeAll(callback: (payload: { event: string; data: Record<string, unknown> }) => void) {
    return super.subscribeAll(callback);
  }
}

export const eventBus = new EventBus();

// EVENTS re-exported from kernel/events/event-names.ts
