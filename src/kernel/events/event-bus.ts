import type { ILogger } from '../contracts/logger';
import type { IEventBus } from '../types/interfaces';
import type { EventMap } from '../types/event-map';
import { EventValidators } from '../types/schema-types';
import { rootLogger } from '../services/logger-service';
import { TraceContext } from '../services/trace-context';
import { sanitizeObject } from '../../llm/http/llm-http-client';
export { EVENTS } from './event-names';

function getLogger(): ILogger {
  return (rootLogger?.child('EventBus') ?? { debug() {}, info() {}, warn() {}, error() {}, child() { return this as unknown as ILogger; }, getBuffer() { return []; }, query() { return []; }, clear() {}, setTraceContext() {} }) as ILogger;
}
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
  private _unsubWarned = false; // P0-2: one-shot warn flag for unsubCallbacks capacity

  // P1-18: ring buffer of recent events for late-connecting subscribers
  private static readonly REPLAY_BUFFER_SIZE = 100;
  private static readonly REPLAY_SKIP_EVENTS = new Set([
    'chat:stream:chunk', 'chat:stream:end', 'chat:stream:provider-switch',
    'cognitive:trace:updated', 'cognitive:step:active', 'cognitive:step:completed', 'cognitive:decision:made',
    'kernel:heartbeat',
  ]);
  private _replayBuffer: Array<{ event: string; data: unknown; timestamp: number }> = [];
  private _replayHead = 0;
  private _replayCount = 0;

  // PERF-C2: High-frequency events that skip Zod validation to avoid main-thread blocking
  // STREAM_CHUNK fires 50-200/sec during streaming; validation adds 5-50µs per call = significant overhead
  // P0-3: HOT_EVENTS also bypass emitDepth deferral to prevent perpetual "streaming" state
  private static readonly HOT_EVENTS = new Set([
    'chat:stream:chunk',    // 50-200/sec during streaming
    'chat:stream:end',      // must never be deferred — terminates streaming state
    'chat:stream:provider-switch', // on provider fallback
    'cognitive:trace:updated', // 20-50/sec during agent workforce — skip deep Zod validation on full traces array
    'cognitive:step:active',
    'cognitive:step:completed',
    'cognitive:decision:made', // emitted per agent node but has no subscribers — skip Zod validation entirely
  ]);

  private readonly hotEvents = EventBus.HOT_EVENTS;

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

  private static readonly RESET_GUARD = 'shutdown-reset-42';
  /** @internal Called only from RuntimeManager during full system shutdown. Not part of IEventBus. */
  reset(guard?: string): void {
    if (guard !== EventBus.RESET_GUARD) {
      this.logger?.error('EventBus', 'reset() called without proper guard — use runtime.shutdown() instead');
      return;
    }
    for (const unsub of this.unsubCallbacks) {
      try { unsub(); } catch (e) { getLogger().warn('EventBus', 'unsubscribe callback failed', { error: e }); }
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
    this._unsubWarned = false;
    this._replayBuffer = [];
    this._replayHead = 0;
    this._replayCount = 0;
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
    // P0-2: warn-only when nearing capacity — never silently prune legitimate subscribers
    if (this.unsubCallbacks.size >= 5000 && !this._unsubWarned) {
      this.logger?.warn('EventBus', `unsubCallbacks nearing capacity (${this.unsubCallbacks.size}) — possible leak`);
      this._unsubWarned = true;
    }
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
    const idx = handlers.indexOf(callback as Callback<unknown>);
    if (idx !== -1) handlers.splice(idx, 1);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    this.emitCount++;

    const eventStr = event as string;
    const validator = this.validatorMap.get(eventStr);
    let payload: unknown = data;

    const isTraceEvent = eventStr === 'cognitive:trace:updated';
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } })?.memory;
    const heapBefore = (isTraceEvent && mem) ? mem.usedJSHeapSize : 0;

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

    if (isTraceEvent && mem) {
      const heapAfter = mem.usedJSHeapSize;
      const deltaMB = Math.round((heapAfter - heapBefore) / 1024 / 1024);
      if (deltaMB > 2) {
        const usedMB = Math.round(heapAfter / 1024 / 1024);
        console.warn(`[HEAP:EventBus] COGNITIVE_TRACE_UPDATED emit #${this.emitCount} — +${deltaMB}MB (${usedMB}MB total)`);
      }
    }

    // P1-18: store non-hot events in ring buffer for late-connecting subscribers
    if (!EventBus.REPLAY_SKIP_EVENTS.has(eventStr)) {
      this._replayBuffer[this._replayHead] = { event: eventStr, data: payload, timestamp: Date.now() };
      this._replayHead = (this._replayHead + 1) % EventBus.REPLAY_BUFFER_SIZE;
      if (this._replayCount < EventBus.REPLAY_BUFFER_SIZE) this._replayCount++;
    }

    const trace = TraceContext.current;
    if (import.meta.env.DEV) {
      getLogger().debug('EventBus', `EMIT: ${eventStr}`, { payload: sanitizeObject(payload) as Record<string, unknown>, trace: (trace ?? {}) as Record<string, unknown> });
    }
    this.rawEmit(eventStr, payload);
  }

  // P0-2: diagnostic API for subscription leak detection
  getSubscriptionStats(): { totalCallbacks: number; perEvent: Record<string, number> } {
    return {
      totalCallbacks: this.unsubCallbacks.size,
      perEvent: Object.fromEntries(
        [...this.listenerMap.entries()].map(([k, v]) => [k, v.length])
      )
    };
  }

  // P1-18: replay recent events for late-connecting subscribers
  // Replays buffer entries where the event name matches filterEvent (or all if '*')
  // into the callback. Returns the number of replayed events.
  replay(filterEvent: string, callback: (data: unknown) => void): number {
    let count = 0;
    const total = this._replayCount;
    const size = EventBus.REPLAY_BUFFER_SIZE;
    if (total === 0) return 0;
    // Walk the ring buffer from oldest to newest
    const start = total < size ? 0 : this._replayHead;
    const len = Math.min(total, size);
    for (let i = 0; i < len; i++) {
      const idx = (start + i) % size;
      const entry = this._replayBuffer[idx];
      if (!entry) continue;
      if (filterEvent === '*' || entry.event === filterEvent) {
        try { callback(entry.data); count++; } catch { /* skip */ }
      }
    }
    return count;
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
        } else {
          this.logger?.debug('EventBus', 'onSafe dropped invalid payload', { event, issues: result.error?.issues?.slice(0, 3) });
        }
      });
    }
    return this.on(event as keyof EventMap, (raw: unknown) => callback(raw as T));
  }

  private deferCounts = new Map<string, number>();
  private static readonly MAX_DEFER_CHAIN = 1000;

  private rawEmit(event: string, data?: unknown): void {
    // P0-3: hot events (stream chunks, cognitive traces) bypass emitDepth deferral
    // to prevent perpetual "streaming" state during high-throughput LLM streaming.
    if (EventBus.HOT_EVENTS.has(event)) {
      const handlers = this.listenerMap.get(event);
      const globalHandlers = this.listenerMap.get('*');
      this.emitDepth++;
      try {
        if (handlers) {
          for (const cb of handlers) {
            try { (cb as Callback)(data); } catch (e) { this.logger?.error('EventBus', `Error in hot handler for ${event}`, { error: e }); }
          }
        }
        if (globalHandlers && event !== '*') {
          for (const cb of globalHandlers) {
            try { (cb as Callback)({ event, data }); } catch (e) { this.logger?.error('EventBus', `Error in global handler for ${event}`, { error: e }); }
          }
        }
      } finally { this.emitDepth--; }
      return;
    }

    // N-24: prevent infinite recursion when handler emits synchronously
    if (this.emitDepth > 16) {
      const count = (this.deferCounts.get(event) || 0) + 1;
      // P0-3: emit backpressure signal before dropping
      if (count > EventBus.MAX_DEFER_CHAIN) {
        this.logger?.error('EventBus', `Defer chain limit (${EventBus.MAX_DEFER_CHAIN}) reached for ${event} — dropping event`);
        this.emit('system:eventbus:backpressure' as keyof EventMap, { event, depth: this.emitDepth, pending: this.deferCounts.size + 1 });
        this.deferCounts.delete(event);
        return;
      }
      if (count === 100) {
        this.emit('system:eventbus:backpressure' as keyof EventMap, { event, depth: this.emitDepth, pending: this.deferCounts.size + 1 });
      }
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
        handlers.forEach(callback => {
          try {
            (callback as Callback)(data);
          } catch (e) {
            this.logger?.error('EventBus', `Error in callback for ${event}`, { error: e });
          }
        });
      }

      if (globalHandlers && event !== '*') {
        globalHandlers.forEach(callback => {
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
