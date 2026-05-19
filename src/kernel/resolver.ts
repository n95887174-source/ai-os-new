import { runtime } from './runtime';

export function resolve<T extends object>(name: string, fallbacks?: Record<string, (...args: unknown[]) => unknown>): T {
  let instance: T | null = null;

  const getInstance = (): T => {
    if (!instance) {
      instance = runtime.getService<T>(name);
    }
    return instance;
  };

  return new Proxy({} as T, {
    get(_, prop) {
      try {
        const inst = getInstance();
        const val = (inst as Record<string | symbol, unknown>)[prop];
        if (typeof val === 'function') return val.bind(inst);
        return val;
      } catch {
        if (fallbacks && prop in fallbacks) {
          return fallbacks[prop as string];
        }
        return (...args: unknown[]) => {
          try {
            const inst = getInstance();
            const val = (inst as Record<string | symbol, unknown>)[prop];
            if (typeof val === 'function') return (val as (...args: unknown[]) => unknown).apply(inst, args);
            return val;
          } catch {
            return undefined;
          }
        };
      }
    }
  });
}
