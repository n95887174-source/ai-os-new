import type { ApiKey, SystemState, DecisionTrace } from '../types/metrics';
import type { ChatResponse } from '../types/chat';
import type { ChatMessage } from '../llm/core/types';
import type { SystemSettings, MCPServerConfig } from '../kernel/instances';
import type { CognitiveSkill } from '../types/domain';
import type { Role } from '../types/role';
import type { 
  EventPayloads
} from '../types/domain';
import type { ILogger } from '../kernel/contracts/logger';
import { EventValidators } from '../kernel/types/schema-types';
import { EventBus as KernelEventBus } from '../kernel/event-bus';
export { EVENTS } from '../kernel/events/event-names';

// ── Event Map Definition ─────────────────────────────────────────────────────
export type EventMap = {
  [event: string]: unknown;

  // Key Management
  'key:loaded': ApiKey[];
  'key:added': Omit<ApiKey, 'id' | 'stats'>;
  'key:removed': string;
  'key:updated': ApiKey[];
  
  // Health
  'health:check': string;
  'health:check:all': void;
  'key:health:check:failed': { id: string; provider: string; error: string };
  'key:latency:burst': { id: string; provider: string; latency: number };
  'key:quota:exceeded': { id: string; provider: string; quotaType: 'tokens' | 'requests' };
  'key:reputation:threshold:crossed': { id: string; provider: string; score: number };
  'key:state:changed': { id: string; provider: string; state: string; previousState: string };
  'key:compromise:signal': { id?: string; fingerprint?: string; source?: string };
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
  'key:health:check:started': string | void;
  'key:health:check:completed': { id?: string; provider?: string; status?: string } | void;

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

export class EventBus extends KernelEventBus {
  constructor(strictMode = true, logger?: ILogger) {
    super(logger, strictMode);
    // Register all schemas as validators
    for (const [event, schema] of Object.entries(EventValidators)) {
      this.registerValidator(event, schema);
    }
  }

  on<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    return super.on(event as string, callback as Callback<unknown>);
  }

  off<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    super.off(event as string, callback as Callback<unknown>);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
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
