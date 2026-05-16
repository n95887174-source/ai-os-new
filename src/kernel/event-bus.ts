import type { IEventBus } from './types/interfaces';

type Callback<T = unknown> = (data: T) => void;

export class EventBus implements IEventBus {
  private listenerMap = new Map<string, Callback<unknown>[]>();
  private validatorMap = new Map<string, { safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: { issues: { message: string }[] } } }>();

  registerValidator(event: string, validator: { safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: { issues: { message: string }[] } } }): void {
    this.validatorMap.set(event, validator);
  }

  on<K extends string>(event: K, callback: Callback<unknown>): () => void {
    const handlers = this.listenerMap.get(event) ?? [];
    handlers.push(callback as Callback<unknown>);
    this.listenerMap.set(event, handlers);
    return () => this.off(event, callback);
  }

  off<K extends string>(event: K, callback: Callback<unknown>): void {
    const handlers = this.listenerMap.get(event);
    if (!handlers) return;
    this.listenerMap.set(event, handlers.filter(cb => cb !== (callback as Callback<unknown>)));
  }

  emit<K extends string>(event: K, data?: unknown): void {
    const validator = this.validatorMap.get(event);
    if (validator) {
      const result = validator.safeParse(data);
      if (!result.success) {
        const message = `[EventBus] Validation failed for ${event}: ${result.error?.issues[0]?.message || 'unknown error'}`;
        console.warn(message);
        this.emit('system:notification', { message, type: 'warning', source: 'EventBus' });
      }
    }

    const handlers = this.listenerMap.get(event);
    if (handlers) {
      handlers.forEach(callback => {
        try { (callback as Callback)(data); } catch (e) { console.error(`[EventBus] Error in callback for ${event}:`, e); }
      });
    }

    const globalHandlers = this.listenerMap.get('*');
    if (globalHandlers && event !== '*') {
      globalHandlers.forEach(callback => (callback as Callback)({ event, data }));
    }
  }

  subscribeAll(callback: (payload: { event: string; data: Record<string, unknown> }) => void): () => void {
    return this.on('*', callback as Callback);
  }

  reset(): void {
    this.listenerMap.clear();
    this.validatorMap.clear();
  }
}
