import { KeyService as KernelKeyService, FREE_TIER_LIMITS } from '../kernel/services/key-vault';
import { container } from '../core/Container';

export { FREE_TIER_LIMITS };
export type { FreeTierLimit, PoolStrategy } from '../kernel/services/key-vault';

export const keyService = new Proxy({} as KernelKeyService, {
  get: (_target, prop) => {
    try {
      if (container.has('keyService')) {
        const instance = container.get<KernelKeyService>('keyService');
        const val = (instance as any)[prop];
        if (typeof val === 'function') return val.bind(instance);
        return val;
      }
    } catch {}

    if (prop === 'getKeys') return () => [];
    if (prop === 'getAlerts') return () => [];
    if (prop === 'getPools') return () => [];
    if (prop === 'getFreeTierLimits') return () => ({});
    if (prop === 'getPoolStrategy') return () => 'round-robin';
    if (prop === 'getPoolKeyDistribution') return () => [];
    if (prop === 'verifyKey') return async () => true;
    if (prop === 'detectProvider') return () => null;
    if (prop === 'getRoutingPolicy') return () => ({ globalSLAMode: 'BALANCED', latencyThreshold: 1500 });

    const protoVal = (KernelKeyService.prototype as any)[prop];
    if (typeof protoVal === 'function') {
      return (...args: any[]) => {
        try {
          const instance = container.get<any>('keyService');
          return instance[prop](...args);
        } catch {
          console.warn(`[Proxy] Service not ready: keyService.${String(prop)}`);
          return undefined;
        }
      };
    }
    return protoVal;
  }
});

export { KernelKeyService as KeyService };
