import { resolve } from './service-resolver';
import { PricingService as KernelPricing } from '../kernel/services/pricing-service';
export { KernelPricing as PricingService };
export type { ModelPricing } from '../kernel/services/pricing-service';
export const pricingService = resolve<KernelPricing>('pricingService', {
  getBudgetInfo: () => ({ totalBudget: 0, spentThisMonth: 0, remaining: 0 }),
});
