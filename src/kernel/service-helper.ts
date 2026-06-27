import { defaultContainer } from './container';
import type { IContainer } from './container';

let _container: IContainer;
const resolved = new Map<string, unknown>();
const boundMethods = new WeakMap<object, Map<string | symbol, unknown>>();

function ensureContainer(): IContainer {
  if (!_container) _container = defaultContainer;
  return _container;
}

export function lazyService<T extends object>(
  name: string,
  fallbacks?: Record<string, (...args: unknown[]) => unknown>
): T {
  return new Proxy({} as T, {
    get(_, prop) {
      let instance = resolved.get(name);
      if (!instance) {
        try {
          instance = ensureContainer().get<unknown>(name);
          resolved.set(name, instance);
        } catch {
          // container.get threw — service not yet registered
        }
      }
      if (instance) {
        const val = (instance as Record<string | symbol, unknown>)[prop];
        if (typeof val === 'function') {
          let cache = boundMethods.get(instance);
          if (!cache) { cache = new Map(); boundMethods.set(instance, cache); }
          let bound = cache.get(prop);
          if (!bound) { bound = (val as (...args: unknown[]) => unknown).bind(instance); cache.set(prop, bound); }
          return bound;
        }
        if (val !== undefined && val !== null) return val;
      }
      if (fallbacks && prop in fallbacks) return fallbacks[prop as string];
      if (typeof prop !== 'symbol' && prop !== 'then' && prop !== 'toJSON') {
        throw new Error(`ServiceNotRegisteredError: ${name} — ${String(prop)} accessed before registration`);
      }
      return undefined;
    }
  });
}

export function getContainer() {
  return ensureContainer();
}
