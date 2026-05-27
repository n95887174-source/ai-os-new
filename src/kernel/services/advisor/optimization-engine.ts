import { EVENTS } from '../../events/event-names';
import type { IOptimizationEngine, OptimizationSuggestion, ProposedChange, SREAlert } from '../../contracts/advisor';

export interface OptimizationEngineDeps {
  eventBus: { on: (event: string, cb: (...args: unknown[]) => void) => () => void; emit: (event: string, data?: unknown) => void };
  routerService: { setStrategy: (strategy: string) => void };
  keyService: {
    getKeys: () => Array<{ id: string; provider: string; status: string; stats?: { extended?: { usageToday?: { requests: number } } } }>;
    updateKeyStatus: (id: string, status: string, latency?: number) => void;
    setLatencyThreshold?: (ms: number) => void;
  };
  pricingService: { getBudgetInfo: () => { monthlyBudget: number; spentThisMonth: number; projectedMonthly: number } };
  freeTierLimits: Record<string, { requestsPerDay: number; tokensPerDay: number }>;
}

export class OptimizationEngine implements IOptimizationEngine {
  private suggestions: OptimizationSuggestion[] = [];
  private sreAlerts: SREAlert[] = [];
  private executedFixes: Map<string, { metricBefore: number; type: string; timestamp: number }> = new Map();
  private pendingTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();
  private deps: OptimizationEngineDeps;
  private budgetWarningSent = false;
  private poolPressureHistory: Record<string, number[]> = {};

  constructor(deps: OptimizationEngineDeps) {
    this.deps = deps;
  }

  propose(suggestion: Omit<OptimizationSuggestion, 'id'>) {
    const exists = this.suggestions.some(s => s.title === suggestion.title && s.type === suggestion.type);
    if (exists) return;

    const newSuggestion: OptimizationSuggestion = {
      ...suggestion,
      id: crypto.randomUUID().slice(0, 8),
      autoExecutable: suggestion.autoExecutable || false,
    };

    this.suggestions = [newSuggestion, ...this.suggestions].slice(0, 20);
    this.deps.eventBus.emit(EVENTS.ADVISOR_SUGGESTION, newSuggestion);
  }

  executeFix(suggestionId: string) {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    const change = suggestion.proposedChange || {};

    if (change.routing_update === 'cost_optimized') {
      this.deps.routerService.setStrategy('cost');
    }
    if (change.switch_to) {
      this.deps.routerService.setStrategy('latency');
    }
    if (change.disable_providers?.length) {
      for (const provider of change.disable_providers) {
        const key = this.deps.keyService.getKeys().find(k => k.provider === provider);
        if (key) this.deps.keyService.updateKeyStatus(key.id, 'inactive');
      }
    }
    if (change.queue_delay) {
      this.deps.keyService.setLatencyThreshold?.(Number(change.queue_delay));
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Queue delay set to ${change.queue_delay}ms`, type: 'info' });
    }

    this.suggestions = this.suggestions.filter(s => s.id !== suggestionId);
    this.deps.eventBus.emit(EVENTS.ADVISOR_SUGGESTION_EXECUTED, { id: suggestionId, estimatedSavings: suggestion.estimatedSavings });
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
      type: 'success', message: `Applied: ${suggestion.title}`, source: 'Advisor', savings: suggestion.estimatedSavings,
    });
  }

  dismissSuggestion(suggestionId: string) {
    this.suggestions = this.suggestions.filter(s => s.id !== suggestionId);
    this.deps.eventBus.emit(EVENTS.ADVISOR_SUGGESTION_DISMISSED, { id: suggestionId });
  }

  getSuggestions(): OptimizationSuggestion[] {
    return this.suggestions;
  }

  getSREAlerts(): SREAlert[] {
    return [...this.sreAlerts];
  }

  addSREAlert(severity: SREAlert['severity'], message: string) {
    const id = crypto.randomUUID().slice(0, 8);
    this.sreAlerts.push({ id, severity, message, timestamp: Date.now() });
    if (this.sreAlerts.length > 100) this.sreAlerts.shift();
  }

  triggerAnalysis() {
    const keys = this.deps.keyService.getKeys();
    for (const key of keys) {
      const limit = this.deps.freeTierLimits[key.provider]?.requestsPerDay;
      if (!limit) continue;
      const usage = key.stats?.extended?.usageToday?.requests || 0;

      if (!this.poolPressureHistory[key.id]) this.poolPressureHistory[key.id] = [];
      this.poolPressureHistory[key.id].push(usage / Math.max(1, limit));
      if (this.poolPressureHistory[key.id].length > 10) this.poolPressureHistory[key.id].shift();
    }
  }

  checkBudgetHealth() {
    if (!this.deps.pricingService) return;
    try {
      const budget = this.deps.pricingService.getBudgetInfo();
      if (budget.monthlyBudget > 0) {
        const usagePct = (budget.spentThisMonth / budget.monthlyBudget) * 100;
        if (usagePct >= 90 && !this.budgetWarningSent) {
          this.budgetWarningSent = true;
          this.addSREAlert('critical', `Monthly budget at ${Math.round(usagePct)}% — $${budget.spentThisMonth.toFixed(2)} of $${budget.monthlyBudget.toFixed(2)}`);
          this.propose({
            type: 'cost', title: 'Monthly Budget Nearly Exhausted',
            description: `$${budget.spentThisMonth.toFixed(2)} of $${budget.monthlyBudget.toFixed(2)} used (${Math.round(usagePct)}%). Projected: $${budget.projectedMonthly.toFixed(2)}.`,
            impact: 'high', autoExecutable: false,
            estimatedSavings: { cost: budget.projectedMonthly - budget.monthlyBudget },
          });
        } else if (usagePct >= 75) {
          this.addSREAlert('info', `Monthly budget at ${Math.round(usagePct)}%`);
        }
      }
    } catch { /* pricing service not available */ }
  }

  destroy() {
    for (const tid of this.pendingTimeouts) clearTimeout(tid);
    this.pendingTimeouts.clear();
    this.suggestions = [];
    this.sreAlerts = [];
  }
}
