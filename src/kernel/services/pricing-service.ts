import { EVENTS } from '../events/event-names';
import { CONFIG } from './config-registry';
import type { ICostCalculator, BudgetInfo, ProviderBudget, CostEstimate } from '../contracts/pricing';

const FALLBACK_PRICING: Record<string, { input: number; output: number; provider?: string }> = {
  'gpt-4o': { input: 2.50, output: 10.00, provider: 'openai' },
  'gpt-4o-mini': { input: 0.15, output: 0.60, provider: 'openai' },
  'gpt-4-turbo': { input: 10.00, output: 30.00, provider: 'openai' },
  'gpt-4': { input: 30.00, output: 60.00, provider: 'openai' },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50, provider: 'openai' },
  'claude-3-5-sonnet': { input: 3.00, output: 15.00, provider: 'anthropic' },
  'claude-3-opus': { input: 15.00, output: 75.00, provider: 'anthropic' },
  'claude-3-haiku': { input: 0.25, output: 1.25, provider: 'anthropic' },
  'claude-2': { input: 8.00, output: 24.00, provider: 'anthropic' },
  'gemini-2.0-flash': { input: 0.10, output: 0.40, provider: 'google' },
  'gemini-2.0-pro': { input: 2.00, output: 5.00, provider: 'google' },
  'gemini-1.5-pro': { input: 3.50, output: 10.50, provider: 'google' },
  'gemini-1.5-flash': { input: 0.35, output: 1.05, provider: 'google' },
  'llama-3.3-70b': { input: 0.60, output: 0.80, provider: 'meta' },
  'llama-3.1-405b': { input: 2.50, output: 2.50, provider: 'meta' },
  'llama-3-70b': { input: 0.60, output: 0.80, provider: 'meta' },
  'llama-3-8b': { input: 0.05, output: 0.10, provider: 'meta' },
  'mistral-large': { input: 2.00, output: 6.00, provider: 'mistral' },
  'mistral-medium': { input: 2.50, output: 7.50, provider: 'mistral' },
  'mistral-small': { input: 0.20, output: 0.60, provider: 'mistral' },
  'deepseek-chat': { input: 0.14, output: 0.28, provider: 'deepseek' },
  'deepseek-reasoner': { input: 0.55, output: 2.19, provider: 'deepseek' },
  'qwen-2-72b': { input: 0.90, output: 0.90, provider: 'alibaba' },
  'qwen-2.5-72b': { input: 1.20, output: 1.80, provider: 'alibaba' },
  'mixtral-8x7b': { input: 0.50, output: 0.50, provider: 'mistral' },
  'command-r-plus': { input: 3.00, output: 15.00, provider: 'cohere' },
  'dbrx-instruct': { input: 0.60, output: 2.40, provider: 'databricks' },
};

const OVERRIDES_KEY = 'super_agents_pricing_overrides';
const CACHE_KEY_DB = 'pricing_cache';
const BUDGET_KEY = 'super_agents_pricing_budget';

export interface PricingServiceDeps {
  eventBus: { on?: (event: string, cb: (...args: unknown[]) => void) => () => void; emit: (event: string, data?: unknown) => void };
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
}

export interface ModelPricing {
  input: number;
  output: number;
  provider?: string;
}

export class PricingService implements ICostCalculator {
  protected pricingData: Record<string, { input: number; output: number; provider?: string }> = { ...FALLBACK_PRICING };
  protected lastFetch: number = 0;
  protected costHistory: CostEstimate[] = [];
  protected monthlyBudget: number = CONFIG.pricing.defaultMonthlyBudget;
  protected providerBudgets: Record<string, number> = {};
  protected prefixCache = new Map<string, { input: number; output: number; provider?: string }>();
  protected userOverrides: Record<string, ModelPricing> = {};
  private fetchPromise: Promise<void> | null = null;
  private deps: PricingServiceDeps;

  constructor(deps: PricingServiceDeps) {
    this.deps = deps;
  }

  async init() {
    await this.loadCache();
    await this.loadBudget();
    await this.loadProviderBudgets();
    await this.loadHistory();
    await this.loadOverrides();
  }

  protected async saveCache() {
    try {
      await this.deps.database.setKv(CACHE_KEY_DB, {
        data: this.pricingData,
        timestamp: Date.now(),
      });
    } catch (e) { console.warn('[Pricing] Failed to save cache', e); }
  }

  protected async saveHistory() {
    try {
      await this.deps.database.setKv('super_agents_cost_history', this.costHistory);
    } catch (e) { console.warn('[Pricing] Failed to save history', e); }
  }

  private async loadCache() {
    try {
      const cached = await this.deps.database.getKv<{ data: Record<string, { input: number; output: number; provider?: string }>; timestamp: number }>(CACHE_KEY_DB);
      if (cached && Date.now() - cached.timestamp < CONFIG.pricing.cacheTTLMs) {
        this.pricingData = { ...FALLBACK_PRICING, ...cached.data };
        this.lastFetch = cached.timestamp;
      }
    } catch (e) { console.warn('[Pricing] Failed to load pricing cache', e); }
  }

  private async loadBudget() {
    try {
      const saved = await this.deps.database.getKv<{ monthlyBudget: number }>(BUDGET_KEY);
      if (saved) this.monthlyBudget = saved.monthlyBudget;
    } catch (e) { console.warn('[Pricing] Failed to load budget', e); }
  }

  private async loadProviderBudgets() {
    try {
      const saved = await this.deps.database.getKv<Record<string, number>>('provider_budgets');
      if (saved) this.providerBudgets = saved;
    } catch (e) { console.warn('[Pricing] Failed to load provider budgets', e); }
  }

  private async loadHistory() {
    try {
      const saved = await this.deps.database.getKv<CostEstimate[]>('super_agents_cost_history');
      if (saved) {
        this.costHistory = saved.map(c => ({
          model: c.model,
          provider: (c as Record<string, unknown>).provider as string ||
            (c.model.includes('/') ? c.model.split('/')[0] : c.model),
          inputTokens: c.inputTokens,
          outputTokens: c.outputTokens,
          inputCost: c.inputCost,
          outputCost: c.outputCost,
          totalCost: c.totalCost,
          timestamp: c.timestamp,
        }));
      }
    } catch (e) { console.warn('[Pricing] Failed to load cost history', e); }
  }

  private async loadOverrides() {
    try {
      const saved = await this.deps.database.getKv<Record<string, ModelPricing>>(OVERRIDES_KEY);
      if (saved) this.userOverrides = saved;
    } catch (e) { console.warn('[Pricing] Failed to load overrides', e); }
  }

  private async saveOverrides() {
    try { await this.deps.database.setKv(OVERRIDES_KEY, this.userOverrides); } catch (e) { console.warn('[Pricing] Failed to save overrides', e); }
  }

  protected lookup(model: string): { input: number; output: number; provider?: string } {
    const key = model.toLowerCase().trim();
    const override = this.userOverrides[key];
    if (override) return override;
    const exact = this.pricingData[key];
    if (exact) return exact;
    const cached = this.prefixCache.get(key);
    if (cached) return cached;
    const prefix = Object.keys(this.pricingData)
      .filter(k => key.startsWith(k) || k.startsWith(key))
      .sort((a, b) => b.length - a.length);
    const result = prefix.length > 0 ? this.pricingData[prefix[0]] : { input: 0.15, output: 0.60 };
    if (this.prefixCache.size < CONFIG.pricing.prefixCacheMaxSize) this.prefixCache.set(key, result);
    return result;
  }

  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.lookup(model);
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;
    const provider = pricing.provider || (model.includes('/') ? model.split('/')[0] : model);
    this.costHistory.push({
      model, provider, inputTokens, outputTokens, inputCost, outputCost,
      totalCost, timestamp: Date.now(),
    });
    if (this.costHistory.length > CONFIG.pricing.costHistoryMax) this.costHistory = this.costHistory.slice(-CONFIG.pricing.costHistoryMax);
    return totalCost;
  }

  estimateCost(model: string, promptLength: number, estimatedOutputTokens: number = CONFIG.pricing.defaultEstimatedOutputTokens): number {
    const inputTokens = Math.ceil(promptLength / CONFIG.llm.tokenEstimateDivisor);
    return this.calculateCost(model, inputTokens, estimatedOutputTokens);
  }

  getInputCost(model: string): number { return this.lookup(model).input; }
  getOutputCost(model: string): number { return this.lookup(model).output; }

  getPricingForModel(model: string): { input: number; output: number } {
    const p = this.lookup(model);
    return { input: p.input, output: p.output };
  }

  getPricingCapabilities(model: string) {
    return {
      supportsStreaming: true,
      supportsFunctionCalling: false,
      supportsVision: model.toLowerCase().includes('vision'),
      maxTokens: CONFIG.pricing.defaultEstimatedOutputTokens,
      supportedModels: Object.keys(this.pricingData),
    };
  }

  getBudgetInfo(): BudgetInfo {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const monthlyCost = this.costHistory
      .filter(c => c.timestamp >= startOfMonth)
      .reduce((sum, c) => sum + c.totalCost, 0);

    const providerBudgets: ProviderBudget[] = [];
    const providers = new Set(this.costHistory.filter(c => c.timestamp >= startOfMonth).map(c => c.provider));
    for (const provider of providers) {
      const spent = this.costHistory
        .filter(c => c.timestamp >= startOfMonth && c.provider === provider)
        .reduce((sum, c) => sum + c.totalCost, 0);
      const budget = this.providerBudgets[provider] || 0;
      providerBudgets.push({
        provider,
        monthlyBudget: budget,
        spentThisMonth: spent,
        remainingBudget: budget > 0 ? Math.max(0, budget - spent) : Number.MAX_SAFE_INTEGER,
      });
    }

    return {
      monthlyBudget: this.monthlyBudget,
      spentThisMonth: monthlyCost,
      remainingBudget: Math.max(0, this.monthlyBudget - monthlyCost),
      dailyAverage: dayOfMonth > 0 ? monthlyCost / dayOfMonth : 0,
      projectedMonthly: dayOfMonth > 0 ? (monthlyCost / dayOfMonth) * daysInMonth : 0,
      providerBudgets,
    };
  }

  getProviderBudget(provider: string): number {
    return this.providerBudgets[provider.toLowerCase()] || 0;
  }

  setMonthlyBudget(budget: number) {
    this.monthlyBudget = budget;
    this.deps.database.setKv(BUDGET_KEY, { monthlyBudget: budget }).catch(() => {});
  }

  setProviderBudget(provider: string, budget: number) {
    this.providerBudgets[provider.toLowerCase()] = budget;
    this.deps.database.setKv('provider_budgets', this.providerBudgets).catch(() => {});
  }

  getCostHistory(limit = 50): CostEstimate[] {
    return this.costHistory.slice(-limit);
  }

  async syncFromOpenRouter(): Promise<void> {
    if (this.fetchPromise) return this.fetchPromise;
    this.fetchPromise = (async () => {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/models');
        if (!res.ok) return;
        const body = await res.json();
        const models: { id: string; pricing: { prompt: string; completion: string } }[] = body?.data || [];
        for (const model of models) {
          const id = model.id.toLowerCase();
          const p = model.pricing;
          if (p?.prompt && p?.completion) {
            this.pricingData[id] = { input: parseFloat(p.prompt), output: parseFloat(p.completion), provider: id.split('/')[0] };
          }
        }
        this.lastFetch = Date.now();
        this.prefixCache.clear();
        await this.saveCache();
        this.deps.eventBus.emit(EVENTS.PRICING_UPDATED, this.pricingData);
      } catch { console.warn('[Pricing] OpenRouter sync failed, using fallback prices'); }
      finally { this.fetchPromise = null; }
    })();
    return this.fetchPromise;
  }

  getAllPrices(): Record<string, ModelPricing> { return { ...this.pricingData }; }
  getLastSync(): number { return this.lastFetch; }

  checkProviderBudget(provider: string, cost: number): boolean {
    const budget = this.providerBudgets[provider.toLowerCase()];
    if (!budget || budget <= 0) return true;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const spent = this.costHistory.filter(c =>
      c.timestamp >= startOfMonth && (c.provider || c.model).toLowerCase().startsWith(provider.toLowerCase())
    ).reduce((sum, c) => sum + c.totalCost, 0);
    return (spent + cost) <= budget;
  }

  getCostByProvider(): Record<string, number> {
    const byProvider: Record<string, number> = {};
    for (const c of this.costHistory) {
      const provider = c.provider || this.lookup(c.model).provider || 'unknown';
      byProvider[provider] = (byProvider[provider] || 0) + c.totalCost;
    }
    return byProvider;
  }

  getCostByModel(): Record<string, number> {
    const byModel: Record<string, number> = {};
    for (const c of this.costHistory) {
      byModel[c.model] = (byModel[c.model] || 0) + c.totalCost;
    }
    return byModel;
  }

  clearHistory() {
    this.costHistory = [];
  }

  setOverride(model: string, pricing: ModelPricing) {
    this.userOverrides[model.toLowerCase().trim()] = pricing;
    this.prefixCache.clear();
    this.saveOverrides();
  }

  removeOverride(model: string) {
    delete this.userOverrides[model.toLowerCase().trim()];
    this.prefixCache.clear();
    this.saveOverrides();
  }

  getUserOverrides(): Record<string, ModelPricing> {
    return { ...this.userOverrides };
  }

  destroy() {
    this.prefixCache.clear();
    this.costHistory = [];
    this.fetchPromise = null;
  }
}
