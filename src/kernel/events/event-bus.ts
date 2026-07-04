import type { ILogger } from '../contracts/logger';
import type { IEventBus } from '../types/interfaces';
import type { EventMap } from '../types/event-map';
import { EventValidators } from './event-registry';
import { rootLogger } from '../services/logger-service';
import { TraceContext } from '../services/trace-context';
import { sanitizeObject } from '../utils/sanitize';
import { EVENTS } from './event-names';
export { EVENTS };

const NOOP_LOGGER: ILogger = {
    debug() {},
    info() {},
    warn() {},
    error() {},
    child() {
        return this;
    },
    getBuffer() {
        return [];
    },
    query() {
        return [];
    },
    clear() {},
    setTraceContext() {},
};

let cachedLogger: ILogger | null = null;

function getLogger(): ILogger {
    if (cachedLogger) return cachedLogger;
    try {
        cachedLogger = rootLogger.child('EventBus');
        return cachedLogger;
    } catch {
        return NOOP_LOGGER;
    }
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
    private hotEmitDepth = 0;
    private staticValidators = new Set<string>(); // N-18: track which validators are static (from EventValidators)
    private _unsubByCb = new Map<Callback<unknown>, () => void>(); // callback → unsubFn for off() cleanup
    private logger?: ILogger;
    private emitCount = 0;
    private strictMode: boolean;
    private unsubCallbacks: Set<() => void> = new Set(); // H-06: track all unsubs for reset cleanup
    private _unsubWarned = false; // P0-2: one-shot warn flag for unsubCallbacks capacity

    // HIGH-K3: replay buffer removed — nobody called replay() and STREAM_END payloads
    // (up to 1MB each × 100 = 100MB memory leak). If replay is needed later, implement with
    // structuredClone + size cap. See git history for removed code.

    // PERF-C2: High-frequency events that skip Zod validation to avoid main-thread blocking
    // STREAM_CHUNK fires 50-200/sec during streaming; validation adds 5-50µs per call = significant overhead
    // P0-3: HOT_EVENTS also bypass emitDepth deferral to prevent perpetual "streaming" state
    private static readonly HOT_EVENTS = new Set([
        'chat:stream:chunk', // 50-200/sec during streaming
        'chat:stream:end', // must never be deferred — terminates streaming state
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

    /** D-07: Public API to clear all subscriptions — calls per-subscriber destroy callbacks, then cleans up. */
    clearAllSubscriptions(): void {
        for (const unsub of this.unsubCallbacks) {
            try {
                unsub();
            } catch (e) {
                getLogger().warn('EventBus', 'unsubscribe callback failed', { error: e });
            }
        }
        this.unsubCallbacks.clear();
        this.listenerMap.clear();
        for (const key of this.validatorMap.keys()) {
            if (!this.staticValidators.has(key)) this.validatorMap.delete(key);
        }
        this.deferCounts.clear();
        this.emitCount = 0;
        this.emitDepth = 0;
        this._unsubWarned = false;
        this.logger?.warn('EventBus', 'clearAllSubscriptions');
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
        this._unsubByCb.set(callback as Callback<unknown>, unsub);
        // H-06: Track unsubscribe so reset() can clean up all subscriptions
        // P0-2: warn-only when nearing capacity — never silently prune legitimate subscribers
        if (this.unsubCallbacks.size >= 5000 && !this._unsubWarned) {
            this.logger?.warn(
                'EventBus',
                `unsubCallbacks nearing capacity (${this.unsubCallbacks.size}) — possible leak`,
            );
            this._unsubWarned = true;
        }
        this.unsubCallbacks.add(unsub);
        return () => {
            this.unsubCallbacks.delete(unsub);
            this._unsubByCb.delete(callback as Callback<unknown>);
            unsub();
        };
    }

    off<K extends keyof EventMap>(event: K, callback: Callback<EventMap[K]>) {
        const key = event as string;
        const handlers = this.listenerMap.get(key);
        if (!handlers) return;
        const idx = handlers.indexOf(callback as Callback<unknown>);
        if (idx !== -1) handlers.splice(idx, 1);
        // Also remove from unsubCallbacks to prevent leak when off() is used directly
        const unsub = this._unsubByCb.get(callback as Callback<unknown>);
        if (unsub) {
            this.unsubCallbacks.delete(unsub);
            this._unsubByCb.delete(callback as Callback<unknown>);
        }
    }

    emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
        this.emitCount++;

        const eventStr = event as string;
        const validator = this.validatorMap.get(eventStr);
        let payload: unknown = data;

        const isTraceEvent = eventStr === 'cognitive:trace:updated';
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } })?.memory;
        const heapBefore = isTraceEvent && mem ? mem.usedJSHeapSize : 0;

        // PERF-C2: Skip validation for hot (high-frequency) events to avoid main-thread blocking
        if (validator && !this.hotEvents.has(eventStr)) {
            const result = validator.safeParse(payload);
            if (!result.success) {
                const msg = result.error?.issues[0]?.message || 'unknown error';
                this.logger?.warn('EventBus', `Validation failed for ${String(event)}`, {
                    issue: msg,
                });
                this.rawEmit(EVENTS.NOTIFICATION, {
                    message: `Validation failed for ${String(event)}: ${msg}`,
                    type: 'warning',
                    source: 'EventBus',
                });
                if (this.strictMode) {
                    this.logger?.error('EventBus', `Blocked event ${String(event)} - strict mode`, {
                        issues: result.error?.issues,
                    });
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
                this.logger?.warn('EventBus', 'COGNITIVE_TRACE_UPDATED heap', {
                    emitCount: this.emitCount,
                    deltaMB,
                    usedMB,
                });
            }
        }

        // HIGH-K3: replay buffer removed — nobody called replay() and STREAM_END payloads
        // (up to 1MB each × 100 = 100MB memory leak). See git history for removed code.

        const trace = TraceContext.current;
        if (import.meta.env.DEV) {
            getLogger().debug('EventBus', `EMIT: ${eventStr}`, {
                payload: sanitizeObject(payload) as Record<string, unknown>,
                trace: (trace ?? {}) as Record<string, unknown>,
            });
        }
        this.rawEmit(eventStr, payload);
    }

    // P0-2: diagnostic API for subscription leak detection
    getSubscriptionStats(): { totalCallbacks: number; perEvent: Record<string, number> } {
        return {
            totalCallbacks: this.unsubCallbacks.size,
            perEvent: Object.fromEntries(
                [...this.listenerMap.entries()].map(([k, v]) => [k, v.length]),
            ),
        };
    }

    subscribeAll(callback: (payload: { event: string; data: Record<string, unknown> }) => void) {
        return this.on('*', callback as Callback<EventMap['*']>);
    }

    onSafe<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): () => void;
    onSafe<T>(event: string, callback: (data: T) => void): () => void;
    onSafe(event: string, callback: (data: unknown) => void): () => void {
        const validator = this.validatorMap.get(event);
        if (validator) {
            return this.on(event as keyof EventMap, (raw: unknown) => {
                const result = validator.safeParse(raw);
                if (result.success) {
                    callback(result.data);
                } else {
                    this.logger?.debug('EventBus', 'onSafe dropped invalid payload', {
                        event,
                        issues: result.error?.issues?.slice(0, 3),
                    });
                }
            });
        }
        return this.on(event as keyof EventMap, (raw: unknown) => callback(raw));
    }

    private deferCounts = new Map<string, number>();
    private static readonly MAX_DEFER_CHAIN = 1000;

    private rawEmit(event: string, data?: unknown): void {
        // P0-3: hot events (stream chunks, cognitive traces) bypass emitDepth deferral
        // to prevent perpetual "streaming" state during high-throughput LLM streaming.
        if (EventBus.HOT_EVENTS.has(event)) {
            // H9: separate hot-event depth guard to prevent unbounded recursion
            if (this.hotEmitDepth > 1000) {
                this.logger?.error(
                    'EventBus',
                    `Hot event recursion limit reached for ${event} — dropping`,
                );
                this.emit(EVENTS.EVENTBUS_BACKPRESSURE, {
                    event,
                    depth: this.hotEmitDepth,
                    pending: 1,
                });
                return;
            }
            this.hotEmitDepth++;
            const handlers = this.listenerMap.get(event);
            const globalHandlers = this.listenerMap.get('*');
            try {
                if (handlers) {
                    for (const cb of handlers) {
                        try {
                            (cb as Callback)(data);
                        } catch (e) {
                            this.logger?.error('EventBus', `Error in hot handler for ${event}`, {
                                error: e,
                            });
                        }
                    }
                }
                if (globalHandlers && event !== '*') {
                    for (const cb of globalHandlers) {
                        try {
                            (cb as Callback)({ event, data });
                        } catch (e) {
                            this.logger?.error('EventBus', `Error in global handler for ${event}`, {
                                error: e,
                            });
                        }
                    }
                }
            } finally {
                this.hotEmitDepth--;
            }
            return;
        }

        // N-24: prevent infinite recursion when handler emits synchronously (HIGH-K4: 16→32)
        if (this.emitDepth > 32) {
            const count = (this.deferCounts.get(event) || 0) + 1;
            // P0-3: emit backpressure signal before dropping
            if (count > EventBus.MAX_DEFER_CHAIN) {
                this.logger?.error(
                    'EventBus',
                    `Defer chain limit (${EventBus.MAX_DEFER_CHAIN}) reached for ${event} — dropping event`,
                );
                this.emit(EVENTS.EVENTBUS_BACKPRESSURE, {
                    event,
                    depth: this.emitDepth,
                    pending: this.deferCounts.size + 1,
                });
                this.deferCounts.delete(event);
                return;
            }
            if (count === 100) {
                this.emit(EVENTS.EVENTBUS_BACKPRESSURE, {
                    event,
                    depth: this.emitDepth,
                    pending: this.deferCounts.size + 1,
                });
            }
            this.deferCounts.set(event, count);
            if (count === 1 || count % 10 === 0) {
                this.logger?.warn(
                    'EventBus',
                    `Recursion limit reached at ${event} — deferring (#${count})`,
                );
            }
            // HIGH-K4: queueMicrotask instead of setTimeout(0) — faster, fewer macrotasks
            queueMicrotask(() => {
                const remaining = (this.deferCounts.get(event) || 1) - 1;
                if (remaining <= 0) this.deferCounts.delete(event);
                else this.deferCounts.set(event, remaining);
                this.emit(event as keyof EventMap, data);
            });
            return;
        }
        this.emitDepth++;

        const handlers = this.listenerMap.get(event);
        const globalHandlers = this.listenerMap.get('*');
        const subscriberCount =
            (handlers?.length ?? 0) + (globalHandlers && event !== '*' ? globalHandlers.length : 0);

        if (subscriberCount === 0 && !event.startsWith('system:') && !event.startsWith('health:')) {
            this.logger?.debug('EventBus', 'emit to 0 subscribers', { event });
        }

        try {
            if (handlers) {
                handlers.forEach((callback) => {
                    try {
                        (callback as Callback)(
                            event === '*'
                                ? { event: '*', data: data as Record<string, unknown> }
                                : data,
                        );
                    } catch (e) {
                        this.logger?.error('EventBus', `Error in callback for ${event}`, {
                            error: e,
                        });
                    }
                });
            }

            if (globalHandlers && event !== '*') {
                globalHandlers.forEach((callback) => {
                    try {
                        (callback as Callback)({ event, data });
                    } catch (e) {
                        this.logger?.error('EventBus', `Error in global handler for ${event}`, {
                            error: e,
                        });
                    }
                });
            }
        } finally {
            this.emitDepth--;
        }
    }
}

export const eventBus = new EventBus(true);
