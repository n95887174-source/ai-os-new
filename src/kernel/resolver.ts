import { runtime } from './runtime';
import { rootLogger } from './services/logger-service';

const LOGGER = rootLogger.child('Resolver');

export function resolve<T extends object>(name: string, fallbacks?: Record<string, (...args: unknown[]) => unknown>): T {
  let cachedInstance: T | null = null;

  const getInstance = (): T | null => {
    if (cachedInstance) return cachedInstance;
    try {
      cachedInstance = runtime.getService<T>(name);
      return cachedInstance;
    } catch (e) {
      LOGGER.warn('Resolver', 'Service not available', { name, error: e });
      return null;
    }
  };

  return new Proxy({} as T, {
    get(_, prop) {
      const inst = getInstance();
      if (inst) {
        const val = inst[prop as keyof T];
        if (typeof val === 'function') return (val as unknown as (...args: unknown[]) => unknown).bind(inst);
        if (val !== undefined && val !== null) return val;
      }
      if (fallbacks && prop in fallbacks) return fallbacks[prop as string];
      const defaultFn = fallbacks?.['__default'] as ((...a: unknown[]) => unknown) | undefined;
      if (defaultFn) return defaultFn;
      if (typeof prop !== 'symbol' && prop !== 'then' && prop !== 'toJSON') {
        throw new Error(`[Resolver] Service "${name}" not available — property "${String(prop)}" accessed before init`);
      }
      return undefined;
    }
  });
}
