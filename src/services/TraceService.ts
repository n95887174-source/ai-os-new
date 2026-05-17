import { container } from '../core/Container';
import { TraceService as KernelTrace } from '../kernel/services/trace-service';

export type { TraceFilter, TraceExport } from '../kernel/services/trace-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const traceService = new Proxy({} as KernelTrace, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelTrace>('traceService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelTrace.prototype as any)[prop];
    }
  }
});

export { KernelTrace as TraceService };
