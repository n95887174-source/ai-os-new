import { runtime } from '../kernel/runtime';
const container = runtime.getContainer();
import { SystemKernel as KernelSystemKernel } from '../kernel/kernel';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const kernel = new Proxy({} as KernelSystemKernel, {
  get: (_target, prop: string | symbol) => {
    try {
      if (container.has('kernel')) {
        const instance = container.get<KernelSystemKernel>('kernel');
        const val = instance[prop as keyof KernelSystemKernel];
        if (typeof val === 'function') return val.bind(instance);
        return val;
      }
    } catch (e) {
      console.warn('[Kernel Proxy] Error accessing kernel property', prop, e);
    }

    // M-10: Handle Symbol.toPrimitive for introspection compatibility
    if (typeof prop === 'symbol') {
      if (prop === Symbol.toPrimitive) return () => '[Kernel Proxy]';
      if (prop === Symbol.toStringTag) return () => 'KernelProxy';
      return undefined;
    }

    // Safe fallbacks for early access
    if (prop === 'getState') {
      return () => ({
        phase: 'BOOT',
        status: 'initializing',
        violations: [],
        providers: [],
        uptime: 0,
        load: 0,
        memory: { used: 0, total: 100 }
      });
    }

    const protoVal = (KernelSystemKernel.prototype as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof protoVal === 'function') {
      return (...args: unknown[]) => {
        try {
          const instance = container.get<KernelSystemKernel>('kernel');
          const val = instance[prop as keyof KernelSystemKernel];
          if (typeof val === 'function') return (val as (...args: unknown[]) => unknown).apply(instance, args);
          return val;
        } catch (err) {
          console.warn(`[Proxy] Kernel not ready for method call: ${String(prop)}`);
          return undefined;
        }
      };
    }
    return protoVal;
  }
});

export { KernelSystemKernel as SystemKernel };
