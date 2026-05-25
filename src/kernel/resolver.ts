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
        if (typeof val === 'function') return (val as unknown as (...args: unknown[]) => unknown).bind(inst);
        return val;
      }
      if (fallbacks && prop in fallbacks) return fallbacks[prop as string];
      const defaultFn = fallbacks?.['__default'] as ((...a: unknown[]) => unknown) | undefined;
      if (defaultFn) return defaultFn;
      if (isDev) {
        console.warn(`[Resolver] Service "${name}" not available — method "${String(prop)}" called before init`);
        return () => { throw new Error(`Service "${name}" not found — "${String(prop)}" unavailable`); };
      }
      return () => undefined;
    }
  });
}
