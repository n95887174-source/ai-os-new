import { runtime } from './runtime';
import { rootLogger } from './services/logger-service';

const LOGGER = rootLogger.child('Resolver');

const boundMethods = new WeakMap<object, Map<string | symbol, unknown>>();

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
        if (typeof val === 'function') {
          let cache = boundMethods.get(inst);
          if (!cache) { cache = new Map(); boundMethods.set(inst, cache); }
          let bound = cache.get(prop);
          if (!bound) { bound = (val as unknown as Function).bind(inst); cache.set(prop, bound); }
          return bound;
        }
        if (val !== undefined && val !== null) return val;
      }
      if (fallbacks && prop in fallbacks) return fallbacks[prop as string];
      if (typeof prop !== 'symbol' && prop !== 'then' && prop !== 'toJSON') {
        throw new Error(`[Resolver] Service "${name}" not available — property "${String(prop)}" accessed before init`);
      }
      return undefined;
    }
  });
}
