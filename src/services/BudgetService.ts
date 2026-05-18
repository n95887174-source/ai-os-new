import { resolve } from './service-resolver';
import { BudgetService as KernelBudget } from '../kernel/services/budget-service';
export { KernelBudget as BudgetService };
export type { AgentBudget, SpendSummary, BudgetAlert } from '../kernel/services/budget-service';
export const budgetService = resolve<KernelBudget>('budgetService');
