import type { ApiKey, SystemState } from '../../types/metrics';
import type { ChatResponse } from '../../types/chat';
import type { ChatMessage } from '../../llm/core/types';
import type { SystemSettings, MCPServerConfig } from '../instances';
import type { AgentLifecycleState } from '../contracts/topology';
import type { CognitiveSkill } from '../../types/domain';
import type { EventPayloads } from '../../types/domain';
import type { ILogger } from '../contracts/logger';
import type { IEventBus } from '../types/interfaces';
import type { DecisionPayload } from './system-events';
import { EventValidators } from '../types/schema-types';
import { rootLogger } from '../services/logger-service';
import { TraceContext } from '../services/trace-context';
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
    options?: unknown;
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
  'agent:lifecycle:change': { id: string; from: AgentLifecycleState; to: AgentLifecycleState };
  'agent:health:change': { id: string; from: string; to: string; errorRate: number; consecutiveErrors: number };
  'agent:restarted': { id: string };
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
type Validator = {
  safeParse: (data: unknown) => {
    success: boolean;
    data?: unknown;
    error?: { issues: { message: string }[] };
  };
};

export class EventBus implements IEventBus {
  private listenerMap = new Map<string, Callback<unknown>[]>();
  private validatorMap = new Map<string, Validator>();
  private staticValidators = new Set<string>(); // N-18: track which validators are static (from EventValidators)
  private logger?: ILogger;
  private emitCount = 0;
  private strictMode: boolean;

  constructor(strictMode = true, logger?: ILogger) {
    this.logger = logger;
    this.strictMode = strictMode;
    this.registerAllValidators();
  }

  registerValidator(event: string, validator: Validator): void {
    this.validatorMap.set(event, validator);
  }

  setStrictMode(enabled: boolean): void {
    this.strictMode = enabled;
    this.logger?.info('EventBus', `Strict mode ${enabled ? 'enabled' : 'disabled'}`);
  }

private registerAllValidators(): void {
    for (const [event, schema] of Object.entries(EventValidators)) {
      this.validatorMap.set(event, schema);
      this.staticValidators.add(event); // N-18: mark as static
    }
  }

  reset(): void {
    this.listenerMap.clear();
    // N-18: clear only dynamic validators, keep static ones
    for (const key of this.validatorMap.keys()) {
      if (!this.staticValidators.has(key)) this.validatorMap.delete(key);
    }
    this.emitCount = 0;
    this.logger?.warn('EventBus', 'reset');
  }
  }

  static emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    eventBus.emit(event, data);
  }

  static on<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>): () => void {
    return eventBus.on(event, callback);
  }

  static off<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>): void {
    eventBus.off(event, callback);
  }

  reset(): void {
    this.listenerMap.clear();
    this.validatorMap.clear();
    this.emitCount = 0;
    this.logger?.warn('EventBus', 'reset');
    this.registerAllValidators();
  }

  on<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    const key = event as string;
    const handlers = this.listenerMap.get(key) ?? [];
    handlers.push(callback as Callback<unknown>);
    this.listenerMap.set(key, handlers);
    return () => this.off(event, callback);
  }

  off<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    const key = event as string;
    const handlers = this.listenerMap.get(key);
    if (!handlers) return;
    this.listenerMap.set(key, handlers.filter(cb => cb !== (callback as Callback<unknown>)));
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    this.emitCount++;

    const validator = this.validatorMap.get(event as string);
    let payload: unknown = data;
    if (validator) {
      const result = validator.safeParse(payload);
      if (!result.success) {
        const msg = result.error?.issues[0]?.message || 'unknown error';
        this.logger?.warn('EventBus', `Validation failed for ${String(event)}`, { issue: msg });
        this.rawEmit('system:notification', { message: `Validation failed for ${String(event)}: ${msg}`, type: 'warning', source: 'EventBus' });
        if (this.strictMode) {
          this.logger?.error('EventBus', `Blocked event ${String(event)} - strict mode`, { issues: result.error?.issues });
          return;
        }
      } else if (result.data !== undefined) {
        payload = result.data;
      }
    }

    const trace = TraceContext.current;
    if (import.meta.env.DEV) {
      console.debug(`[EventBus] EMIT: ${String(event)}`, payload, trace);
    }
    this.rawEmit(event as string, payload);
  }

  subscribeAll(callback: (payload: { event: string; data: Record<string, unknown> }) => void) {
    return this.on('*', callback as Callback<EventMap['*']>);
  }

  onSafe<T>(event: string, callback: (data: T) => void): () => void {
    const validator = this.validatorMap.get(event);
    if (validator) {
      return this.on(event, (raw: unknown) => {
        const result = validator.safeParse(raw);
        if (result.success) {
          callback(result.data as T);
          // else: silently drop — data didn't pass schema, don't pass garbage downstream
        }
      });
    }
    return this.on(event, (raw: unknown) => callback(raw as T));
  }

  private rawEmit(event: string, data?: unknown): void {
    const handlers = this.listenerMap.get(event);
    const globalHandlers = this.listenerMap.get('*');
    const subscriberCount = (handlers?.length ?? 0) + (globalHandlers && event !== '*' ? globalHandlers.length : 0);

    if (subscriberCount === 0 && !event.startsWith('system:') && !event.startsWith('health:')) {
      this.logger?.debug('EventBus', 'emit to 0 subscribers', { event });
    }

    if (handlers) {
      [...handlers].forEach(callback => {
        try {
          (callback as Callback)(data);
        } catch (e) {
          this.logger?.error('EventBus', `Error in callback for ${event}`, { error: e });
        }
      });
    }

    if (globalHandlers && event !== '*') {
      [...globalHandlers].forEach(callback => {
        try {
          (callback as Callback)({ event, data });
        } catch (e) {
          this.logger?.error('EventBus', `Error in global handler for ${event}`, { error: e });
        }
      });
    }
  }
}

export const eventBus = new EventBus(true, rootLogger);
