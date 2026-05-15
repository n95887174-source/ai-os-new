import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';
import { pricingService } from './PricingService';
import { estimateTokens } from '../utils/tokenEstimate';

export interface AgentBudget {
  agentId: string;
  monthlyBudget: number;
  spentThisMonth: number;
}

export interface SpendSummary {
  global: { budget: number; spent: number; remaining: number; pct: number };
  providers: Array<{ provider: string; budget: number; spent: number; remaining: number; pct: number }>;
  agents: Array<{ agentId: string; name: string; budget: number; spent: number; remaining: number; pct: number }>;
}

export interface BudgetAlert {
  type: 'global' | 'provider' | 'agent';
  level: number;
  entity: string;
  current: number;
  limit: number;
  message: string;
  timestamp: number;
}

const AGENT_BUDGET_KEY = 'super_agents_agent_budgets';
const AGENT_SPEND_KEY = 'super_agents_agent_spend';

export class BudgetService {
  private agentBudgets: Record<string, number> = {};
  private agentSpend: Record<string, number> = {};
  private alertsHistory: BudgetAlert[] = [];
  private sentAlerts = new Set<string>();
  private unsubs: Array<() => void> = [];

  constructor() {
    this.loadAgentConfig().catch(() => {});
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
  }

  private async loadAgentConfig() {
    try {
      const budgets = await db.getKv<Record<string, number>>(AGENT_BUDGET_KEY);
      if (budgets) this.agentBudgets = budgets;
      const spend = await db.getKv<Record<string, number>>(AGENT_SPEND_KEY);
      if (spend) this.agentSpend = spend;
    } catch (e) {
      console.warn('[BudgetService] Failed to load agent config', e);
    }
  }

  private async persist() {
    try {
      await db.setKv(AGENT_BUDGET_KEY, this.agentBudgets);
      await db.setKv(AGENT_SPEND_KEY, this.agentSpend);
    } catch (e) {
      console.warn('[BudgetService] Failed to persist agent config', e);
    }
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on('cognitive:step:completed', (data) => {
        const d = data as { nodeId?: string; output?: string; provider?: string; status?: string };
        if (!d.nodeId) return;
        this.trackAgentCost(d.nodeId, d.output || '', d.provider);
      }),
      eventBus.on('chat:stream:end', (data) => {
        const d = data as { requestId?: string; provider?: string; model?: string; tokens?: number; fullContent?: string };
        if (!d.requestId) return;
        const tokens = d.tokens || estimateTokens(d.fullContent || '');
        const model = d.model || 'gpt-4o-mini';
        const cost = pricingService.calculateCost(model, Math.round(tokens * 0.3), tokens);
        this.checkThresholds('global', 'global', this.getGlobalSpend() + cost, pricingService.getBudgetInfo().monthlyBudget);
        if (d.provider) {
          const providerInfo = pricingService.getBudgetInfo().providerBudgets.find(p => p.provider === d.provider);
          if (providerInfo) {
            this.checkThresholds('provider', d.provider, providerInfo.spentThisMonth + cost, providerInfo.monthlyBudget || Infinity);
          }
        }
      })
    );
  }

  private trackAgentCost(agentId: string, output: string, provider?: string) {
    const tokens = estimateTokens(output);
    const model = `gpt-4o-mini`;
    const cost = pricingService.calculateCost(model, Math.round(tokens * 0.3), tokens);
    this.agentSpend[agentId] = (this.agentSpend[agentId] || 0) + cost;
    const budget = this.agentBudgets[agentId] || 0;
    if (budget > 0) {
      this.checkThresholds('agent', agentId, this.agentSpend[agentId], budget);
    }
    this.persist();
  }

  private checkThresholds(type: 'global' | 'provider' | 'agent', entity: string, current: number, limit: number) {
    if (limit <= 0 || limit === Infinity) return;
    const pct = Math.round((current / limit) * 100);
    const thresholds = [50, 80, 90, 100];
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
          eventBus.emit('system:notification', { message: alert.message, type: level >= 100 ? 'error' : 'warning' });
          eventBus.emit('budget:alert', alert);
        }
      }
    }
  }

  getGlobalSpend(): number {
    return pricingService.getBudgetInfo().spentThisMonth;
  }

  getSpendSummary(): SpendSummary {
    const budgetInfo = pricingService.getBudgetInfo();
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
      remaining: p.remainingBudget === Infinity ? 0 : p.remainingBudget,
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

  getAgentBudget(agentId: string): number {
    return this.agentBudgets[agentId] || 0;
  }

  setAgentBudget(agentId: string, budget: number) {
    this.agentBudgets[agentId] = budget;
    this.persist();
  }

  getAgentSpend(agentId: string): number {
    return this.agentSpend[agentId] || 0;
  }

  getAlerts(): BudgetAlert[] {
    return [...this.alertsHistory];
  }

  clearAlerts() {
    this.alertsHistory = [];
    this.sentAlerts.clear();
  }

  canUseProvider(provider: string, estimatedCost: number = 0): boolean {
    const providerBudget = pricingService.getProviderBudget(provider);
    if (providerBudget <= 0) return true;
    const providerInfo = pricingService.getBudgetInfo().providerBudgets.find(p => p.provider === provider);
    if (!providerInfo) return true;
    return (providerInfo.spentThisMonth + estimatedCost) <= providerBudget;
  }

  canUseGlobal(estimatedCost: number = 0): boolean {
    const info = pricingService.getBudgetInfo();
    if (info.monthlyBudget <= 0) return true;
    return (info.spentThisMonth + estimatedCost) <= info.monthlyBudget;
  }
}

export const budgetService = new BudgetService();
