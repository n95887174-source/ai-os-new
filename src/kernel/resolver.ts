import { runtime } from './runtime';

export function resolve<T extends object>(name: string, fallbacks?: Record<string, (...args: unknown[]) => unknown>): T {
  const getInstance = (): T | null => {
    try {
      return runtime.getService<T>(name);
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
        if (typeof val === 'function') return (val as unknown as (...args: unknown[]) => unknown).bind(inst);
        if (val !== undefined && val !== null) return val;
      }
      if (fallbacks && prop in fallbacks) return fallbacks[prop as string];
      const defaultFn = fallbacks?.['__default'] as ((...a: unknown[]) => unknown) | undefined;
      if (defaultFn) return defaultFn;
      if (typeof prop !== 'symbol' && prop !== 'then' && prop !== 'toJSON') {
        // H-01: Throw explicitly instead of silently returning undefined
        // This prevents production bugs where callers do not realize the
        // service hasn't been initialized yet.
        throw new Error(`[Resolver] Service "${name}" not available — property "${String(prop)}" accessed before init`);
      }
      return undefined;
    }
  });
}
