import type { ILogger } from '../contracts/logger';
import type { IEventBus } from '../types/interfaces';
import type { EventMap } from '../types/event-map';
import { EventValidators } from '../types/schema-types';
import { TraceContext } from '../services/trace-context';
import { sanitizeObject } from '../../llm/http/llm-http-client';
export { EVENTS } from './event-names';
export type { EventMap };

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
  private emitDepth = 0;
  private staticValidators = new Set<string>(); // N-18: track which validators are static (from EventValidators)
  private logger?: ILogger;
  private emitCount = 0;
  private strictMode: boolean;
  private unsubCallbacks: Set<() => void> = new Set(); // H-06: track all unsubs for reset cleanup

  // PERF-C2: High-frequency events that skip Zod validation to avoid main-thread blocking
  // STREAM_CHUNK fires 50-200/sec during streaming; validation adds 5-50µs per call = significant overhead
  private readonly hotEvents = new Set<string>([
    'chat:stream:chunk',    // 50-200/sec during streaming
    'chat:stream:provider-switch', // on provider fallback
  ]);

  constructor(strictMode = true, logger?: ILogger) {
    this.logger = logger;
    this.strictMode = strictMode;
    this.registerAllValidators();
  }

  registerValidator(event: string, validator: Validator): void {
    this.validatorMap.set(event, validator);
  }

  setLogger(logger: ILogger): void {
    this.logger = logger;
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
    // H-06: Call all tracked unsubscribe callbacks so consumers know they're unsubscribed
    for (const unsub of this.unsubCallbacks) {
      try { unsub(); } catch (e) { console.warn('[EventBus] unsubscribe callback failed', e); }
    }
    this.unsubCallbacks.clear();
    this.listenerMap.clear();
    // N-18: clear only dynamic validators, keep static ones
    for (const key of this.validatorMap.keys()) {
      if (!this.staticValidators.has(key)) this.validatorMap.delete(key);
    }
    this.deferCounts.clear();
    this.emitCount = 0;
    this.emitDepth = 0;
    this.logger?.warn('EventBus', 'reset');
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

  on<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    const key = event as string;
    const handlers = this.listenerMap.get(key) ?? [];
    handlers.push(callback as Callback<unknown>);
    this.listenerMap.set(key, handlers);
    const unsub = () => this.off(event, callback);
    // H-06: Track unsubscribe so reset() can clean up all subscriptions
    this.unsubCallbacks.add(unsub);
    return () => {
      this.unsubCallbacks.delete(unsub);
      unsub();
    };
  }

  off<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
    const key = event as string;
    const handlers = this.listenerMap.get(key);
    if (!handlers) return;
    this.listenerMap.set(key, handlers.filter(cb => cb !== (callback as Callback<unknown>)));
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    this.emitCount++;

    const eventStr = event as string;
    const validator = this.validatorMap.get(eventStr);
    let payload: unknown = data;

    // PERF-C2: Skip validation for hot (high-frequency) events to avoid main-thread blocking
    if (validator && !this.hotEvents.has(eventStr)) {
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
      console.debug(`[EventBus] EMIT: ${eventStr}`, sanitizeObject(payload), trace);
    }
    this.rawEmit(eventStr, payload);
  }

  subscribeAll(callback: (payload: { event: string; data: Record<string, unknown> }) => void) {
    return this.on('*', callback as Callback<EventMap['*']>);
  }

  onSafe<T>(event: string, callback: (data: T) => void): () => void {
    const validator = this.validatorMap.get(event);
    if (validator) {
      return this.on(event as keyof EventMap, (raw: unknown) => {
        const result = validator.safeParse(raw);
        if (result.success) {
          callback(result.data as T);
          // else: silently drop — data didn't pass schema, don't pass garbage downstream
        }
      });
    }
    return this.on(event as keyof EventMap, (raw: unknown) => callback(raw as T));
  }

  private deferCounts = new Map<string, number>();

  private rawEmit(event: string, data?: unknown): void {
    // N-24: prevent infinite recursion when handler emits synchronously
    if (this.emitDepth > 16) {
      const count = (this.deferCounts.get(event) || 0) + 1;
      this.deferCounts.set(event, count);
      if (count === 1 || count % 10 === 0) {
        this.logger?.warn('EventBus', `Recursion limit reached at ${event} — deferring (#${count})`);
      }
      setTimeout(() => {
        const remaining = (this.deferCounts.get(event) || 1) - 1;
        if (remaining <= 0) this.deferCounts.delete(event);
        else this.deferCounts.set(event, remaining);
        this.emit(event as keyof EventMap, data);
      }, 0);
      return;
    }
    this.emitDepth++;

    const handlers = this.listenerMap.get(event);
    const globalHandlers = this.listenerMap.get('*');
    const subscriberCount = (handlers?.length ?? 0) + (globalHandlers && event !== '*' ? globalHandlers.length : 0);

    if (subscriberCount === 0 && !event.startsWith('system:') && !event.startsWith('health:')) {
      this.logger?.debug('EventBus', 'emit to 0 subscribers', { event });
    }

    try {
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
    } finally {
      this.emitDepth--;
    }
  }
}

export const eventBus = new EventBus(true);
