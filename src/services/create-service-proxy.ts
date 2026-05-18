import { container } from '../core/Container';

export function createServiceProxy<T>(serviceName: string, Prototype: new (...args: unknown[]) => T): T {
  return new Proxy({} as T, {
    get: (_target, prop) => {
      try {
        const instance = container.get<T>(serviceName);
        const val = (instance as unknown as Record<string | symbol, unknown>)[prop];
        if (typeof val === 'function') return val.bind(instance);
        return val;
      } catch {
        return (Prototype.prototype as Record<string | symbol, unknown>)[prop];
      }
    }
  });
}
