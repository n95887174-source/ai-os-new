import type { ILifecycle } from '../../contracts/lifecycle';
import type { IRoutingPolicy, FallbackRecord, PenaltyRecord, HealthPenaltyInput, HealthPenaltyResult } from '../../contracts/routing-policy';
import { CONFIG } from '../config-registry';

const MAX_FALLBACK_HISTORY = 100;
const MAX_PENALTY_HISTORY = 100;

export interface RoutingPolicyDeps {
  settingsService: {
    getSettings: () => {
      fallbackChains: Record<string, Array<{ provider: string; model?: string }>>;
      modelDowngradeChains: Record<string, string[]>;
      slaMode: string;
    };
    updateSettings: (partial: Record<string, unknown>) => void;
  };
  pricingService: {
    getPricingForModel: (model: string) => { input?: number; output?: number } | undefined;
  };
}

export class RoutingPolicyService implements ILifecycle, IRoutingPolicy {
  private fallbackHistory: FallbackRecord[] = [];
  private penaltyHistory: PenaltyRecord[] = [];
  private deps: RoutingPolicyDeps;

  constructor(deps: RoutingPolicyDeps) {
    this.deps = deps;
  }

  async init() {}
  async destroy() {
    this.fallbackHistory = [];
    this.penaltyHistory = [];
  }

  getFallbackChain(strategy: string): Array<{ provider: string; model?: string }> {
    const settings = this.deps.settingsService.getSettings();
    const chains = settings.fallbackChains || {};
    return chains[strategy] || chains.default || [];
  }

  setFallbackChain(strategy: string, chain: Array<{ provider: string; model?: string }>): void {
    const settings = this.deps.settingsService.getSettings();
    const chains = { ...(settings.fallbackChains || {}), [strategy]: chain };
    this.deps.settingsService.updateSettings({ fallbackChains: chains });
  }

  resolveFallback(strategy: string, failedProvider: string, agentId?: string): { provider: string; model?: string } | null {
    const chain = this.getFallbackChain(strategy);
    for (const link of chain) {
      if (link.provider.toLowerCase() === failedProvider.toLowerCase()) continue;
      return link;
    }
    return null;
  }

  recordFallbackFailure(provider: string, strategy: string): void {
    this.fallbackHistory.unshift({ provider, strategy, timestamp: Date.now(), resolved: false });
    if (this.fallbackHistory.length > MAX_FALLBACK_HISTORY) this.fallbackHistory.pop();
  }

  getFallbackHistory(): FallbackRecord[] {
    return [...this.fallbackHistory];
  }

  getDowngradeChain(model: string): string[] {
    const settings = this.deps.settingsService.getSettings();
    const chains = settings.modelDowngradeChains || {};
    return chains[model] || [];
  }

  setDowngradeChain(model: string, chain: string[]): void {
    const settings = this.deps.settingsService.getSettings();
    const chains = { ...(settings.modelDowngradeChains || {}), [model]: chain };
    this.deps.settingsService.updateSettings({ modelDowngradeChains: chains });
  }

  getDowngradedModel(model: string): string | null {
    const chain = this.getDowngradeChain(model);
    return chain.length > 0 ? chain[0] : null;
  }

  getDeepDowngradedModel(model: string, steps: number): string | null {
    const chain = this.getDowngradeChain(model);
    if (chain.length === 0) return null;
    const idx = Math.min(steps - 1, chain.length - 1);
    return chain[idx];
  }

  calculateLatencyPenalty(_providerId: string, avgLatency: number, medianLatency: number): number {
    const cfg = CONFIG.router.scoring.latencyPenalty;
    if (medianLatency <= 0 || avgLatency <= medianLatency * cfg.thresholdRatio) return 0;
    return Math.min(cfg.max, ((avgLatency / medianLatency) - cfg.thresholdRatio) * cfg.slope);
  }

  calculateCostPenalty(model: string, promptLength: number): number {
    const pricing = this.deps.pricingService.getPricingForModel(model);
    if (!pricing) return 0;
    const inputTokens = promptLength / (CONFIG.router.costEstimate?.tokenDivisor || 4);
    const estimatedCost = (inputTokens / (CONFIG.router.costEstimate?.per1kDivisor || 1000)) * (pricing.input || 0.0001);
    return estimatedCost * (CONFIG.router.scoring.costPenalty?.scalar || 100);
  }

  calculateBudgetPenalty(_provider: string, spentThisMonth: number, monthlyBudget: number): number {
    if (monthlyBudget <= 0) return 0;
    const pct = spentThisMonth / monthlyBudget;
    const thresholds = CONFIG.router.budgetPenalty.thresholds;
    for (const t of thresholds) {
      if (pct >= t.pct) return t.penalty;
    }
    return 0;
  }

  calculateHealthPenalties(input: HealthPenaltyInput): HealthPenaltyResult {
    const mCfg = CONFIG.monitoring;
    let score = 1.0;
    const issues: string[] = [];

    if (input.avgLatency > mCfg.latencyPenalty.thresholdMs) {
      const penalty = Math.min(mCfg.latencyPenalty.cap, (input.avgLatency - mCfg.latencyPenalty.thresholdMs) / mCfg.latencyPenalty.divisor);
      score -= penalty;
      issues.push(`High latency: ${Math.round(input.avgLatency)}ms`);
    }

    if (input.errorRate > mCfg.errorRatePenalty.threshold) {
      const penalty = Math.min(mCfg.errorRatePenalty.cap, input.errorRate * mCfg.errorRatePenalty.multiplier);
      score -= penalty;
      issues.push(`High error rate: ${(input.errorRate * 100).toFixed(1)}%`);
    }

    if (input.successRate < mCfg.successRatePenalty.floor) {
      score -= (mCfg.successRatePenalty.floor - input.successRate) * mCfg.successRatePenalty.multiplier;
      issues.push(`Low success rate: ${(input.successRate * 100).toFixed(1)}%`);
    }

    if (input.criticalAlerts > 0) {
      const penalty = Math.min(mCfg.alertPenalty.cap, input.criticalAlerts * mCfg.alertPenalty.perAlert);
      score -= penalty;
      issues.push(`${input.criticalAlerts} unresolved critical alerts`);
    }

    return { score: Math.max(0, Math.min(1, score)), issues };
  }

  recordPenalty(provider: string, type: PenaltyRecord['type'], amount: number): void {
    this.penaltyHistory.unshift({ provider, type, amount, timestamp: Date.now() });
    if (this.penaltyHistory.length > MAX_PENALTY_HISTORY) this.penaltyHistory.pop();
  }

  getPenaltyHistory(): PenaltyRecord[] {
    return [...this.penaltyHistory];
  }

  getSLAWeights(slaMode: string): { ttft: number; tps: number; reliability: number } {
    const w = CONFIG.router.weights;
    const mapping: Record<string, keyof typeof w> = {
      LOW_LATENCY: 'latency',
      HIGH_QUALITY: 'reliability',
      BALANCED: 'default',
      ECONOMY: 'cost',
      FREE_FIRST: 'freeFirst',
      PERFORMANCE: 'performance',
    };
    const key = mapping[slaMode] || 'default';
    return w[key] || w.default;
  }
}
