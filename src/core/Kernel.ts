import { container } from './Container';
import { SystemKernel as KernelSystemKernel } from '../kernel/kernel';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const kernel = new Proxy({} as KernelSystemKernel, {
  get: (_target, prop) => {
    try {
      if (container.has('kernel')) {
        const instance = container.get<KernelSystemKernel>('kernel');
        const val = (instance as any)[prop];
        if (typeof val === 'function') return val.bind(instance);
        return val;
      }
    } catch (e) {
      // Fall through to mock logic
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

    const protoVal = (KernelSystemKernel.prototype as any)[prop];
    if (typeof protoVal === 'function') {
      return (...args: any[]) => {
        try {
          const instance = container.get<any>('kernel');
          return instance[prop](...args);
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
