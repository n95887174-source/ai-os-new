import type { IEventBus } from './types/interfaces';
import type { ILogger } from './contracts/logger';
import { TraceContext } from './services/trace-context';

type Callback<T = unknown> = (data: T) => void;

export class EventBus implements IEventBus {
  private listenerMap = new Map<string, Callback<unknown>[]>();
  private validatorMap = new Map<string, { safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: { issues: { message: string }[] } } }>();
  private logger?: ILogger;
  private emitCount = 0;
  private strictMode: boolean;

  constructor(logger?: ILogger, strictMode = true) {
    this.logger = logger;
    this.strictMode = strictMode;
  }

  registerValidator(event: string, validator: { safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: { issues: { message: string }[] } } }): void {
    this.validatorMap.set(event, validator);
  }

  setStrictMode(enabled: boolean): void {
    this.strictMode = enabled;
    this.logger?.info('EventBus', `Strict mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  on<K extends string>(event: K, callback: Callback<unknown>): () => void {
    const handlers = this.listenerMap.get(event) ?? [];
    handlers.push(callback as Callback<unknown>);
    this.listenerMap.set(event, handlers);
    return () => this.off(event, callback);
  }

  onSafe<T>(event: string, callback: (data: T) => void): () => void {
    const validator = this.validatorMap.get(event);
    if (validator) {
      return this.on(event, (raw: unknown) => {
        const result = validator.safeParse(raw);
        if (result.success) {
          callback(result.data as T);
        } else {
          const msg = result.error?.issues?.[0]?.message || 'validation failed';
          this.logger?.warn('EventBus', `onSafe: validation failed for ${event}`, { issue: msg });
          callback(raw as T);
        }
      });
    }
    return this.on(event, (raw: unknown) => callback(raw as T));
  }

  off<K extends string>(event: K, callback: Callback<unknown>): void {
    const handlers = this.listenerMap.get(event);
    if (!handlers) return;
    this.listenerMap.set(event, handlers.filter(cb => cb !== (callback as Callback<unknown>)));
  }

  emit<K extends string>(event: K, data?: unknown): void {
    this.emitCount++;

    const validator = this.validatorMap.get(event);
    if (validator) {
      const result = validator.safeParse(data);
      if (!result.success) {
        const msg = result.error?.issues[0]?.message || 'unknown error';
        this.logger?.warn('EventBus', `Validation failed for ${event}`, { issue: msg });
        this.rawEmit('system:notification', { message: `Validation failed for ${event}: ${msg}`, type: 'warning', source: 'EventBus' });
        if (this.strictMode) {
          this.logger?.error('EventBus', `Blocked event ${event} — strict mode`, { issues: result.error?.issues });
          return;
        }
      } else if (result.data !== undefined) {
        data = result.data;
      }
    }

    const trace = TraceContext.current;
    this.logger?.debug('EventBus', 'emit', { event, emitCount: this.emitCount, traceId: trace?.traceId });

    this.rawEmit(event, data);
  }

  private rawEmit(event: string, data?: unknown): void {
    const handlers = this.listenerMap.get(event);
    const globalHandlers = this.listenerMap.get('*');
    const subscriberCount = (handlers?.length ?? 0) + (globalHandlers && event !== '*' ? globalHandlers.length : 0);

    if (subscriberCount === 0) {
      this.logger?.warn('EventBus', `emit to 0 subscribers`, { event });
    }

    if (handlers) {
      handlers.forEach(callback => {
        try { (callback as Callback)(data); } catch (e) {
          this.logger?.error('EventBus', `Error in callback for ${event}`, { error: e });
        }
      });
    }

    if (globalHandlers && event !== '*') {
      globalHandlers.forEach(callback => {
        try { (callback as Callback)({ event, data }); } catch (e) {
          this.logger?.error('EventBus', `Error in global handler for ${event}`, { error: e });
        }
      });
    }
  }

  subscribeAll(callback: (payload: { event: string; data: Record<string, unknown> }) => void): () => void {
    return this.on('*', callback as Callback);
  }

  reset(): void {
    this.listenerMap.clear();
    this.validatorMap.clear();
    this.emitCount = 0;
    this.logger?.warn('EventBus', 'reset');
  }
}
