import { resolve } from './service-resolver';
import { PricingService as KernelPricing } from '../kernel/services/pricing-service';
export { KernelPricing as PricingService };
export type { ModelPricing } from '../kernel/services/pricing-service';
export type { BudgetInfo } from '../kernel/contracts/pricing';
export const pricingService = resolve<KernelPricing>('pricingService', {
  getBudgetInfo: () => ({ monthlyBudget: 0, spentThisMonth: 0, remainingBudget: 0, dailyAverage: 0, projectedMonthly: 0, providerBudgets: [] }),
});
