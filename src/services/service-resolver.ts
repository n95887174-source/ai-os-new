import { runtime } from '../kernel/runtime';

export function resolve<T>(name: string, fallbacks?: Record<string, (...args: unknown[]) => unknown>): T {
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
        const proto = (Object.getPrototypeOf({}) as Record<string | symbol, unknown>)[prop];
        if (typeof proto === 'function') {
          return (...args: unknown[]) => {
            try {
              const inst = getInstance();
              const val = (inst as Record<string | symbol, unknown>)[prop];
              if (typeof val === 'function') return (val as Function).apply(inst, args);
              return val;
            } catch {
              throw new Error(`Service '${name}' not available for method call: ${String(prop)}. Has the runtime initialized?`);
            }
          };
        }
        return proto;
      }
    }
  });
}
