import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';

export interface ModelPricing {
  input: number;
  output: number;
  provider?: string;
}

export interface CostEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  timestamp: number;
}

export interface ProviderBudget {
  provider: string;
  monthlyBudget: number;
  spentThisMonth: number;
  remainingBudget: number;
}

export interface BudgetInfo {
  monthlyBudget: number;
  spentThisMonth: number;
  remainingBudget: number;
  dailyAverage: number;
  projectedMonthly: number;
  providerBudgets: ProviderBudget[];
}

const CACHE_KEY = 'super_agents_pricing_cache';
const BUDGET_KEY = 'super_agents_pricing_budget';
const HISTORY_KEY = 'super_agents_cost_history';
const CACHE_TTL = 60 * 60 * 1000;
const CACHE_KEY_DB = 'pricing_cache';
const ROLE_STATS_KEY = 'role_usage_stats';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const MAX_HISTORY = 500;
const OVERRIDES_KEY = 'super_agents_pricing_overrides';

const FALLBACK_PRICING: Record<string, ModelPricing> = {
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

export class PricingService {
  private pricingData: Record<string, ModelPricing> = { ...FALLBACK_PRICING };
  private lastFetch: number = 0;
  private fetchPromise: Promise<void> | null = null;
  private costHistory: CostEstimate[] = [];
  private monthlyBudget: number = 50;
  private providerBudgets: Record<string, number> = {};
  private userOverrides: Record<string, ModelPricing> = {};
  private prefixCache = new Map<string, ModelPricing>();
  private prefixCacheDirty = false;

  constructor() {
    this.loadCache().catch(() => {});
    this.loadOverrides().catch(() => {});
    this.loadBudget();
    this.loadProviderBudgets();
    this.loadHistory();
    this.syncFromOpenRouter();
  }

  private async loadOverrides() {
    try {
      const saved = await db.getKv<Record<string, ModelPricing>>(OVERRIDES_KEY);
      if (saved) this.userOverrides = saved;
    } catch (e) { console.warn('[Pricing] Failed to load overrides', e); }
  }

  private async saveOverrides() {
    try {
      await db.setKv(OVERRIDES_KEY, this.userOverrides);
    } catch (e) { console.warn('[Pricing] Failed to save overrides', e); }
  }

  private async loadCache() {
    try {
      const cached = await db.getKv<{ data: Record<string, ModelPricing>; timestamp: number }>(CACHE_KEY_DB);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        this.pricingData = { ...FALLBACK_PRICING, ...cached.data };
        this.lastFetch = cached.timestamp;
      }
    } catch (e) { console.warn('[Pricing] Failed to load pricing cache', e); }
  }

  private async loadBudget() {
    try {
      const saved = await db.getKv<{ monthlyBudget: number }>(BUDGET_KEY);
      if (saved) this.monthlyBudget = saved.monthlyBudget;
    } catch (e) { console.warn('[Pricing] Failed to load budget', e); }
  }

  private async loadProviderBudgets() {
    try {
      const saved = await db.getKv<Record<string, number>>('provider_budgets');
      if (saved) this.providerBudgets = saved;
    } catch (e) { console.warn('[Pricing] Failed to load provider budgets', e); }
  }

  private async saveProviderBudgets() {
    try {
      await db.setKv('provider_budgets', this.providerBudgets);
    } catch (e) { console.warn('[Pricing] Failed to save provider budgets', e); }
  }

  private async loadHistory() {
    try {
      const saved = await db.getKv<CostEstimate[]>(HISTORY_KEY);
      if (saved) this.costHistory = saved;
    } catch (e) { console.warn('[Pricing] Failed to load cost history', e); }
  }

  private async saveBudget() {
    try {
      await db.setKv(BUDGET_KEY, { monthlyBudget: this.monthlyBudget });
    } catch (e) { console.warn('[Pricing] Failed to save budget', e); }
  }

  private saveHistoryDebounced: ReturnType<typeof setTimeout> | null = null;

  private async saveHistory() {
    if (this.saveHistoryDebounced) clearTimeout(this.saveHistoryDebounced);
    this.saveHistoryDebounced = setTimeout(async () => {
      try {
        await db.setKv(HISTORY_KEY, this.costHistory.slice(-MAX_HISTORY));
      } catch (e) { console.warn('[Pricing] Failed to save cost history', e); }
    }, 2000);
  }

  private saveCache() {
    db.setKv(CACHE_KEY_DB, { data: this.pricingData, timestamp: this.lastFetch }).catch(e =>
      console.warn('[Pricing] Failed to save pricing cache', e)
    );
  }

  async syncFromOpenRouter(): Promise<void> {
    if (this.fetchPromise) return this.fetchPromise;
    this.fetchPromise = (async () => {
      try {
        const res = await fetch(OPENROUTER_MODELS_URL);
        if (!res.ok) return;
        const body = await res.json();
        const models: { id: string; pricing: { prompt: string; completion: string } }[] = body?.data || [];
        for (const model of models) {
          const id = model.id.toLowerCase();
          const p = model.pricing;
          if (p?.prompt && p?.completion) {
            this.pricingData[id] = {
              input: parseFloat(p.prompt),
              output: parseFloat(p.completion),
              provider: id.split('/')[0],
            };
          }
        }
        this.lastFetch = Date.now();
        this.prefixCache.clear();
        this.saveCache();
        eventBus.emit('pricing:updated', this.pricingData);
      } catch {
        console.warn('[Pricing] OpenRouter sync failed, using fallback prices');
      } finally {
        this.fetchPromise = null;
      }
    })();
    return this.fetchPromise;
  }

  private lookup(model: string): ModelPricing {
    const key = model.toLowerCase().trim();
    
    // 1. Check User Overrides (Priority)
    const override = this.userOverrides[key];
    if (override) return override;

    // 2. Check Fetched/Fallback Data
    const exact = this.pricingData[key];
    if (exact) return exact;
    const cached = this.prefixCache.get(key);
    if (cached) return cached;
    const prefix = Object.keys(this.pricingData)
      .filter(k => key.startsWith(k) || k.startsWith(key))
      .sort((a, b) => b.length - a.length);
    const result = prefix.length > 0 ? this.pricingData[prefix[0]] : { input: 0.15, output: 0.60 };
    if (this.prefixCache.size < 500) this.prefixCache.set(key, result);
    return result;
  }

  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.lookup(model);
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    this.costHistory.push({
      model, inputTokens, outputTokens, inputCost, outputCost,
      totalCost: inputCost + outputCost, timestamp: Date.now(),
    });
    if (this.costHistory.length > MAX_HISTORY) this.costHistory = this.costHistory.slice(-MAX_HISTORY);
    this.saveHistory();
    this.checkBudgetAlert(inputCost + outputCost);
    return inputCost + outputCost;
  }

  estimateCost(model: string, promptLength: number, estimatedOutputTokens: number = 256): number {
    const inputTokens = Math.ceil(promptLength / 4);
    return this.calculateCost(model, inputTokens, estimatedOutputTokens);
  }

  private checkBudgetAlert(_cost: number) {
    const monthly = this.getBudgetInfo();
    if (monthly.projectedMonthly > this.monthlyBudget) {
      eventBus.emit('system:notification', {
        message: `Projected monthly cost $${monthly.projectedMonthly.toFixed(2)} exceeds budget $${this.monthlyBudget.toFixed(2)}`,
        type: 'warning',
      });
    }
  }

  getInputCost(model: string): number { return this.lookup(model).input; }
  getOutputCost(model: string): number { return this.lookup(model).output; }
  getPricingForModel(model: string): ModelPricing { return { ...this.lookup(model) }; }
  getAllPrices(): Record<string, ModelPricing> { return { ...this.pricingData }; }
  getLastSync(): number { return this.lastFetch; }

  getBudgetInfo(): BudgetInfo {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const monthlyCost = this.costHistory
      .filter(c => c.timestamp >= startOfMonth)
      .reduce((sum, c) => sum + c.totalCost, 0);

    const providerBudgets: ProviderBudget[] = [];
    const providers = new Set(this.costHistory.filter(c => c.timestamp >= startOfMonth).map(c => c.model.split('/')[0]));
    for (const provider of providers) {
      const spent = this.costHistory
        .filter(c => c.timestamp >= startOfMonth && c.model.startsWith(provider))
        .reduce((sum, c) => sum + c.totalCost, 0);
      const budget = this.providerBudgets[provider] || 0;
      providerBudgets.push({
        provider,
        monthlyBudget: budget,
        spentThisMonth: spent,
        remainingBudget: budget > 0 ? Math.max(0, budget - spent) : Infinity,
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

  setMonthlyBudget(budget: number) {
    this.monthlyBudget = budget;
    this.saveBudget();
  }

  setProviderBudget(provider: string, budget: number) {
    this.providerBudgets[provider.toLowerCase()] = budget;
    this.saveProviderBudgets();
  }

  getProviderBudget(provider: string): number {
    return this.providerBudgets[provider.toLowerCase()] || 0;
  }

  checkProviderBudget(provider: string, cost: number): boolean {
    const budget = this.providerBudgets[provider.toLowerCase()];
    if (!budget || budget <= 0) return true;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const spent = this.costHistory
      .filter(c => c.timestamp >= startOfMonth && c.model.toLowerCase().startsWith(provider.toLowerCase()))
      .reduce((sum, c) => sum + c.totalCost, 0);
    return (spent + cost) <= budget;
  }

  getCostHistory(limit = 50): CostEstimate[] {
    return this.costHistory.slice(-limit);
  }

  getCostByProvider(): Record<string, number> {
    const byProvider: Record<string, number> = {};
    for (const c of this.costHistory) {
      const pricing = this.lookup(c.model);
      const provider = pricing.provider || 'unknown';
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
    this.saveHistory();
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
}

export const pricingService = new PricingService();
