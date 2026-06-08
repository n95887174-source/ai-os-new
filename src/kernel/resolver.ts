import { runtime } from './runtime';

export function resolve<T extends object>(name: string, fallbacks?: Record<string, (...args: unknown[]) => unknown>): T {
  let instance: T | null = null;

  const getInstance = (): T | null => {
    try {
      if (!instance) instance = runtime.getService<T>(name);
      return instance;
    } catch {
      return null;
    }
  };

  const isDev = typeof location !== 'undefined' && location.hostname === 'localhost';

  return new Proxy({} as T, {
    get(_, prop) {
      const inst = getInstance();
      if (inst) {
        const val = inst[prop as keyof T];
        if (val && typeof val === 'function') return (val as unknown as (...args: unknown[]) => unknown).bind(inst);
        // property is undefined or missing — fall through to fallbacks
      }
      if (fallbacks && prop in fallbacks) return fallbacks[prop as string];
      const defaultFn = fallbacks?.['__default'] as ((...a: unknown[]) => unknown) | undefined;
      if (defaultFn) return defaultFn;
      // K-10: Return undefined for non-function properties when service unavailable
      if (typeof prop !== 'symbol' && prop !== 'then' && prop !== 'toJSON') {
        const safe = (...args: unknown[]) => {
          if (isDev && prop !== 'ready') {
            console.warn(`[Resolver] Service "${name}" — method "${String(prop)}" called before init`, ...args);
          }
          return undefined;
        };
        if (isDev && prop !== 'ready') {
          console.warn(`[Resolver] Service "${name}" not available — property "${String(prop)}" accessed before init`);
        }
        return safe;
      }
      return undefined;
    }
  });
}
