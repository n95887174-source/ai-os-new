import type { ICostCalculator } from '../contracts/pricing';
import type { AgentBudget, SpendSummary, BudgetAlert } from '../contracts/budget';

export type { AgentBudget, SpendSummary, BudgetAlert } from '../contracts/budget';

export interface BudgetServiceDeps {
  eventBus: { on: (event: string, cb: (...args: unknown[]) => void) => () => void; emit: (event: string, data?: unknown) => void };
  database: { getKv: <T>(id: string) => Promise<T | null>; setKv: <T>(id: string, value: T) => Promise<void> };
  costCalculator: ICostCalculator;
}

export class BudgetService {
  private agentBudgets: Record<string, number> = {};
  private agentSpend: Record<string, number> = {};
  private alertsHistory: BudgetAlert[] = [];
  private sentAlerts = new Set<string>();
  private unsubs: Array<() => void> = [];
  private deps: BudgetServiceDeps;

  constructor(deps: BudgetServiceDeps) {
    this.deps = deps;
  }

  async init() {
    await this.loadAgentConfig();
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  private async loadAgentConfig() {
    try {
      const budgets = await this.deps.database.getKv<Record<string, number>>('super_agents_agent_budgets');
      if (budgets) this.agentBudgets = budgets;
      const spend = await this.deps.database.getKv<Record<string, number>>('super_agents_agent_spend');
      if (spend) this.agentSpend = spend;
    } catch (e) {
      console.warn('[BudgetService] Failed to load agent config', e);
    }
  }

  private async persist() {
    try {
      await this.deps.database.setKv('super_agents_agent_budgets', this.agentBudgets);
      await this.deps.database.setKv('super_agents_agent_spend', this.agentSpend);
    } catch (e) {
      console.warn('[BudgetService] Failed to persist agent config', e);
    }
  }

  private setupListeners() {
    const cc = this.deps.costCalculator;
    this.unsubs.push(
      this.deps.eventBus.on('chat:stream:end', (data: unknown) => {
        const d = data as { requestId?: string; provider?: string; model?: string; tokens?: number };
        if (!d.requestId || !d.model) return;
        const tokens = d.tokens || 0;
        const inputWeight = d.model?.toLowerCase().includes('embed') ? 1.0 : 0.5;
        const cost = cc.calculateCost(d.model, Math.round(tokens * inputWeight), tokens);
        this.checkThresholds('global', 'global', this.getGlobalSpend() + cost, cc.getBudgetInfo().monthlyBudget);
        if (d.provider) {
          const providerInfo = cc.getBudgetInfo().providerBudgets.find(p => p.provider === d.provider);
          if (providerInfo) {
            this.checkThresholds('provider', d.provider, providerInfo.spentThisMonth + cost, providerInfo.monthlyBudget || Number.MAX_SAFE_INTEGER);
          }
        }
      })
    );
  }

  private checkThresholds(type: 'global' | 'provider' | 'agent', entity: string, current: number, limit: number) {
    if (limit <= 0 || limit >= Number.MAX_SAFE_INTEGER) return;
    const pct = Math.round((current / limit) * 100);
    const thresholds = [50, 80, 90, 100];

    // Clear receded thresholds so alerts can re-fire if spend rises again
    for (const key of this.sentAlerts) {
      const parts = key.split(':');
      if (parts[0] === type && parts[1] === entity) {
        const thresholdLevel = parseInt(parts[2], 10);
        if (pct < thresholdLevel) this.sentAlerts.delete(key);
      }
    }

    for (const level of thresholds) {
      if (pct >= level) {
        const key = `${type}:${entity}:${level}`;
        if (!this.sentAlerts.has(key)) {
          this.sentAlerts.add(key);
          const alert: BudgetAlert = {
            type, level, entity, current, limit,
            message: `${type === 'global' ? 'Global' : type === 'provider' ? `Provider ${entity}` : `Agent ${entity}`} spend at ${level}% ($${current.toFixed(2)}/$${limit.toFixed(2)})`,
            timestamp: Date.now(),
          };
          this.alertsHistory.push(alert);
          if (this.alertsHistory.length > 100) this.alertsHistory = this.alertsHistory.slice(-100);
          this.deps.eventBus.emit('system:notification', { message: alert.message, type: level >= 100 ? 'error' : 'warning' });
          this.deps.eventBus.emit('budget:alert', alert);
        }
      }
    }
  }

  getGlobalSpend(): number {
    return this.deps.costCalculator.getBudgetInfo().spentThisMonth;
  }

  getSpendSummary(): SpendSummary {
    const budgetInfo = this.deps.costCalculator.getBudgetInfo();
    const global = {
      budget: budgetInfo.monthlyBudget,
      spent: budgetInfo.spentThisMonth,
      remaining: budgetInfo.remainingBudget,
      pct: budgetInfo.monthlyBudget > 0 ? Math.round((budgetInfo.spentThisMonth / budgetInfo.monthlyBudget) * 100) : 0,
    };

    const providers = budgetInfo.providerBudgets.map(p => ({
      provider: p.provider,
      budget: p.monthlyBudget,
      spent: p.spentThisMonth,
      remaining: p.remainingBudget >= Number.MAX_SAFE_INTEGER ? 0 : p.remainingBudget,
      pct: p.monthlyBudget > 0 ? Math.round((p.spentThisMonth / p.monthlyBudget) * 100) : 0,
    }));

    const agents = Object.entries(this.agentSpend)
      .filter(([id]) => this.agentBudgets[id] && this.agentBudgets[id] > 0)
      .map(([agentId, spent]) => {
        const budget = this.agentBudgets[agentId] || 0;
        return {
          agentId,
          name: agentId,
          budget,
          spent,
          remaining: Math.max(0, budget - spent),
          pct: budget > 0 ? Math.round((spent / budget) * 100) : 0,
        };
      });

    return { global, providers, agents };
  }

  canUseProvider(provider: string, estimatedCost: number = 0): boolean {
    const providerBudget = this.deps.costCalculator.getProviderBudget(provider);
    if (providerBudget <= 0) return true;
    const providerInfo = this.deps.costCalculator.getBudgetInfo().providerBudgets.find(p => p.provider === provider);
    if (!providerInfo) return true;
    return (providerInfo.spentThisMonth + estimatedCost) <= providerBudget;
  }

  canUseGlobal(estimatedCost: number = 0): boolean {
    const info = this.deps.costCalculator.getBudgetInfo();
    if (info.monthlyBudget <= 0) return true;
    return (info.spentThisMonth + estimatedCost) <= info.monthlyBudget;
  }

  recordSpend(agentId: string | null, provider: string, amount: number): void {
    if (agentId && amount > 0) {
      this.agentSpend[agentId] = (this.agentSpend[agentId] || 0) + amount;
      const budget = this.agentBudgets[agentId] || 0;
      if (budget > 0) {
        this.checkThresholds('agent', agentId, this.agentSpend[agentId], budget);
      }
      this.persist();
    }
  }

  getAgentBudget(agentId: string): number { return this.agentBudgets[agentId] || 0; }
  setAgentBudget(agentId: string, budget: number) { this.agentBudgets[agentId] = budget; this.persist(); }
  getAgentSpend(agentId: string): number { return this.agentSpend[agentId] || 0; }
  getAlerts(): BudgetAlert[] { return [...this.alertsHistory]; }
  clearAlerts() { this.alertsHistory = []; this.sentAlerts.clear(); }
}
