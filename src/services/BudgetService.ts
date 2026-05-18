import { createServiceProxy } from './create-service-proxy';
import { BudgetService as KernelBudget } from '../kernel/services/budget-service';

export type { AgentBudget, SpendSummary, BudgetAlert } from '../kernel/services/budget-service';

export const budgetService = createServiceProxy('budgetService', KernelBudget);
export { KernelBudget as BudgetService };
