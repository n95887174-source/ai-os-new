import { container } from '../core/Container';
import { BudgetService as KernelBudget } from '../kernel/services/budget-service';

export type { AgentBudget, SpendSummary, BudgetAlert } from '../kernel/services/budget-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const budgetService = new Proxy({} as KernelBudget, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelBudget>('budgetService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelBudget.prototype as any)[prop];
    }
  }
});

export { KernelBudget as BudgetService };
