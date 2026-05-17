import { container } from '../core/Container';
import { RouterService as KernelRouter } from '../kernel/services/provider-router';

export type { RoutingStrategy, RouterDecision } from '../kernel/services/provider-router';
export type { RouterConfig } from '../types/routing';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const routerService = new Proxy({} as KernelRouter, {
  get: (_target, prop) => {
    try {
      if (container.has('routerService')) {
        const instance = container.get<KernelRouter>('routerService');
        const val = (instance as any)[prop];
        if (typeof val === 'function') return val.bind(instance);
        return val;
      }
    } catch (e) {}

    if (prop === 'getDecisionHistory') return () => [];
    if (prop === 'getStats') return () => ({ totalRequests: 0, strategyUsage: {}, avgLatency: 0 });

    const protoVal = (KernelRouter.prototype as any)[prop];
    if (typeof protoVal === 'function') {
      return (...args: any[]) => {
        try {
          const instance = container.get<any>('routerService');
          return instance[prop](...args);
        } catch (err) {
          console.warn(`[Proxy] Service not ready: routerService.${String(prop)}`);
          return undefined;
        }
      };
    }
    return protoVal;
  }
});

export { KernelRouter as RouterService };
