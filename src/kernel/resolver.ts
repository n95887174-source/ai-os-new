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
        const val = inst[prop as keyof T];
        if (typeof val === 'function') return (val as unknown as (...args: unknown[]) => unknown).bind(inst);
        return val;
      } catch (e) {
        console.warn(`[Resolver] Error accessing ${name}.${String(prop)}`, e);
        if (fallbacks && prop in fallbacks) {
          return fallbacks[prop as string];
        }
        return (...args: unknown[]) => {
          try {
            const inst = getInstance();
            const val = inst[prop as keyof T];
            if (typeof val === 'function') return (val as unknown as (...args: unknown[]) => unknown).apply(inst, args);
            return val;
          } catch (e2) {
            console.warn(`[Resolver] Error calling ${name}.${String(prop)}`, e2);
            return undefined;
          }
        };
      }
    }
  });
}
