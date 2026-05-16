import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';
import { PricingService as KernelPricing } from '../kernel/services/pricing-service';
import type { CostEstimate, ProviderBudget, BudgetInfo } from '../kernel/contracts/pricing';
import type { ModelPricing } from '../kernel/services/pricing-service';

export type { ModelPricing } from '../kernel/services/pricing-service';

export class PricingService extends KernelPricing {
  constructor() {
    super({ eventBus, database: db });
  }
}

export const pricingService = new PricingService();
