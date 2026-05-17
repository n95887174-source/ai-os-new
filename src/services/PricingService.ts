import { container } from '../core/Container';
import { PricingService as KernelPricing } from '../kernel/services/pricing-service';

export type { ModelPricing } from '../kernel/services/pricing-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const pricingService = new Proxy({} as KernelPricing, {
  get: (_target, prop) => {
    try {
      if (container.has('pricingService')) {
        const instance = container.get<KernelPricing>('pricingService');
        const val = (instance as any)[prop];
        if (typeof val === 'function') return val.bind(instance);
        return val;
      }
    } catch (e) {}

    if (prop === 'getBudgetInfo') return () => ({ totalBudget: 0, spentThisMonth: 0, remaining: 0 });

    const protoVal = (KernelPricing.prototype as any)[prop];
    if (typeof protoVal === 'function') {
      return (...args: any[]) => {
        try {
          const instance = container.get<any>('pricingService');
          return instance[prop](...args);
        } catch (err) {
          console.warn(`[Proxy] Service not ready: pricingService.${String(prop)}`);
          return undefined;
        }
      };
    }
    return protoVal;
  }
});

export { KernelPricing as PricingService };
