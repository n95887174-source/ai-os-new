import type { ApiKey, SystemState } from '../../types/metrics';
import type { ChatResponse } from '../../types/chat';
import type { ChatMessage } from '../../llm/core/types';
import type { SystemSettings, MCPServerConfig } from '../instances';
import type { CognitiveSkill } from '../../types/domain';
import type { EventPayloads } from '../../types/domain';
import type { ILogger } from '../contracts/logger';
import type { DecisionPayload } from './system-events';
import { EventValidators } from '../types/schema-types';
import { EventBus as KernelEventBus } from '../event-bus';
import { rootLogger } from '../services/logger-service';
export { EVENTS } from './event-names';

export type EventMap = {
  [event: string]: unknown;

  // Key Management
  'key:loaded': ApiKey[];
  'key:added': Omit<ApiKey, 'id' | 'stats'>;
  'key:removed': string;
  'key:updated': ApiKey[];
  
  // Health
  'key:health:check': string;
  'key:health:check:all': void;
  'key:health:check:failed': { id: string; provider: string; error: string };
  'key:latency:burst': { id: string; provider: string; latency: number };
  'key:quota:exceeded': { id: string; provider: string; quotaType: 'tokens' | 'requests' };
  'key:reputation:threshold:crossed': { id: string; provider: string; score: number };
  'key:state:changed': { id: string; provider: string; state: string; previousState: string };
  'key:compromise:signal': { id?: string; fingerprint?: string; source?: string };
  'key:group:sync': { passportAdded?: number; assigned?: number; reassigned?: number };
  'cognitive:trace:updated': { traceId: string; step: string; status: string };
  'debate:updated': { sessionId: string; state: string };
  'debate:started': { sessionId: string; topic: string };
  'debate:argument': { sessionId: string; agentId: string; argument: string };
  'debate:consensus': { sessionId: string; confidence: number; claims: string[] };
  'memory:updated': { collection: string; action: string; id?: string };
  'tools:updated': { action: string; toolId?: string };
  'roles:updated': { action: string; roleId?: string };
  'role:assigned': { roleId: string; agentId: string };
  'role:unassigned': { roleId: string; agentId: string };
  'policy:violation': { policyId: string; provider: string; reason: string };
  'pricing:updated': void;
  'virtual:key:created': { virtualKey: unknown };
  'virtual:key:resolved': { virtualKeyId: string };
  'virtual:key:revoked': { virtualKeyId: string };
  
  // UI & Selection
  'chat:model:select': { provider: string; model: string };
  'chat:target:start': { provider: string; model: string; keyId: string };
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
  'system:decision': DecisionPayload;
  'router:signal': { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number };
  'kernel:updated': SystemState;
  'db:row-inserted': { table: string; id: string | number };
  'system:runtime:ready': { timestamp: number } | void;
  'system:shutdown': { reason?: string } | void;
  'system:data:clear': void;

  // Health
  'key:health:check:started': string | void;
  'key:health:check:completed': { id?: string; provider?: string; status?: string } | void;

  // Control & Trace
  'trace:updated': unknown[];
  'agent:config:updated': { id: string; config: unknown };
  'system:reload': { timestamp: number };
  'system:command': unknown;

  // Cognitive Pipeline
  'cognitive:step:active': EventPayloads['cognitive:step:active'];
  'cognitive:step:completed': EventPayloads['cognitive:step:completed'];
  'cognitive:decision:made': unknown;
  'request:incoming': { requestId: string; messages: unknown[] };
  'request:completed': { final_data: { traceId: string; output: string } };

  // Tool Execution
  'tool:execution:start': { toolId: string; input: unknown };
  'tool:execution:success': { toolId: string; output: unknown };
  'tool:execution:error': { toolId: string; error: string };

  // Settings
  'settings:updated': { settings: SystemSettings; changes: Partial<SystemSettings> };
  'settings:latency-threshold': { keyId?: string; threshold?: number } | void;

  // Skills
  'skills:updated': CognitiveSkill[];

  // MCP
  'mcp:updated': MCPServerConfig[];

  // Budget & Diagnostics
  'budget:alert': { type: 'global' | 'provider' | 'agent'; level: number; entity: string; current: number; limit: number; message: string; timestamp: number };
  'diagnostic:complete': { id: string; scope: string; health: string; score: number; issueCount: number; timestamp: number };

  // Advisor
  'advisor:suggestion': unknown;
  'advisor:suggestion:executed': { id: string; estimatedSavings?: { latency?: number; cost?: number } };
  'advisor:suggestion:dismissed': { id: string };

  // System Activity
  '*': { event: string; data: Record<string, unknown> };
};

type Callback<T = unknown> = (data: T) => void;

export class EventBus extends KernelEventBus {
  constructor(strictMode = true, logger?: ILogger) {
    super(logger, strictMode);
    this.registerAllValidators();
  }

  private registerAllValidators(): void {
    for (const [event, schema] of Object.entries(EventValidators)) {
      this.registerValidator(event, schema);
    }
  }

  reset(): void {
    super.reset();
    this.registerAllValidators();
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

  onSafe<T>(event: string, callback: (data: T) => void): () => void {
    return super.onSafe(event, callback);
  }
}

export const eventBus = new EventBus(true, rootLogger);
