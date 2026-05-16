import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';
import { pricingService } from './PricingService';
import { BudgetService as KernelBudget } from '../kernel/services/budget-service';
import type { ICostCalculator } from '../kernel/contracts/pricing';

export type { AgentBudget, SpendSummary, BudgetAlert } from '../kernel/services/budget-service';

const costCalculator: ICostCalculator = pricingService;

export class BudgetService extends KernelBudget {
  constructor() {
    super({ eventBus, database: db, costCalculator });
  }
}

export const budgetService = new BudgetService();
