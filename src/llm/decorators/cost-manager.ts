import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';

export interface ModelPricing {
  inputPer1K: number;
  outputPer1K: number;
}

export interface CostManagerConfig {
  pricing: Record<string, ModelPricing>;
  monthlyBudget?: number;
  weeklyBudget?: number;
  dailyBudget?: number;
  onExceeded?: 'block' | 'downgrade';
  downgradeModel?: string;
  logCosts: boolean;
}

export interface CostRecord {
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  byModel: Record<string, { cost: number; requests: number; inputTokens: number; outputTokens: number }>;
}

const DEFAULT_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { inputPer1K: 0.005, outputPer1K: 0.015 },
  'gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
  'claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3-haiku': { inputPer1K: 0.00025, outputPer1K: 0.00125 },
  'gemini-1.5-pro': { inputPer1K: 0.0035, outputPer1K: 0.0105 },
  'gemini-1.5-flash': { inputPer1K: 0.000075, outputPer1K: 0.0003 },
};

export class CostManagerDecorator implements LLMProviderAdapter {
  private records: CostRecord[] = [];
  private config: CostManagerConfig;
  private budgetExceeded = false;

  readonly #inner: LLMProviderAdapter;

  constructor(
    inner: LLMProviderAdapter,
    config?: Partial<CostManagerConfig>,
  ) {
    this.#inner = inner;
    this.config = {
      pricing: DEFAULT_PRICING,
      logCosts: false,
      ...config,
    };
  }

  get id(): string {
    return `${this.#inner.id}[cost]`;
  }

  private getPricing(model: string): ModelPricing {
    return this.config.pricing[model] ?? { inputPer1K: 0.002, outputPer1K: 0.008 };
  }

  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const p = this.getPricing(model);
    return (inputTokens / 1000) * p.inputPer1K + (outputTokens / 1000) * p.outputPer1K;
  }

  private checkBudget(): void {
    const now = Date.now();
    const day = 86400000;
    const week = 7 * day;
    const month = 30 * day;

    // Auto-reset budget if enough time has passed since the last record in the window
    if (this.budgetExceeded) {
      const lastRecord = this.records[this.records.length - 1];
      if (lastRecord) {
        const windows = [
          this.config.dailyBudget !== undefined ? { window: day, budget: this.config.dailyBudget } : null,
          this.config.weeklyBudget !== undefined ? { window: week, budget: this.config.weeklyBudget } : null,
          this.config.monthlyBudget !== undefined ? { window: month, budget: this.config.monthlyBudget } : null,
        ].filter(Boolean) as { window: number; budget: number }[];
        if (windows.length > 0) {
          const allUnder = windows.every(w => {
            const sum = this.records.filter(r => now - r.timestamp < w.window).reduce((s, r) => s + r.cost, 0);
            return sum < w.budget;
          });
          if (allUnder) {
            this.budgetExceeded = false;
            if (this.config.logCosts) console.info('[CostManager] Budget auto-reset');
            return;
          }
        }
      }
      return;
    }
    const getCost = (window: number) =>
      this.records.filter(r => now - r.timestamp < window).reduce((s, r) => s + r.cost, 0);

    if (this.config.dailyBudget !== undefined && getCost(day) >= this.config.dailyBudget) {
      this.budgetExceeded = true;
      if (this.config.logCosts) console.warn(`[CostManager] Daily budget $${this.config.dailyBudget} exceeded`);
    } else if (this.config.weeklyBudget !== undefined && getCost(week) >= this.config.weeklyBudget) {
      this.budgetExceeded = true;
      if (this.config.logCosts) console.warn(`[CostManager] Weekly budget $${this.config.weeklyBudget} exceeded`);
    } else if (this.config.monthlyBudget !== undefined && getCost(month) >= this.config.monthlyBudget) {
      this.budgetExceeded = true;
      if (this.config.logCosts) console.warn(`[CostManager] Monthly budget $${this.config.monthlyBudget} exceeded`);
    }
  }

  private handleBudgetExceeded(model: string, _messages: ChatMessage[], _apiKey: string, _signal: AbortSignal | undefined): { model: string; blocked: boolean } {
    if (!this.budgetExceeded) return { model, blocked: false };

    if (this.config.onExceeded === 'downgrade' && this.config.downgradeModel) {
      if (this.config.logCosts) console.warn(`[CostManager] Downgrading from ${model} to ${this.config.downgradeModel}`);
      return { model: this.config.downgradeModel, blocked: false };
    }

    return { model, blocked: true };
  }

  private record(model: string, inputTokens: number, outputTokens: number, cost: number): void {
    this.records.push({ timestamp: Date.now(), model, inputTokens, outputTokens, cost });
    if (this.records.length > 100000) {
      this.records = this.records.slice(-50000);
    }
  }

  getCosts(windowMs?: number): CostSummary {
    const now = Date.now();
    const filtered = windowMs ? this.records.filter(r => now - r.timestamp < windowMs) : this.records;

    const byModel: CostSummary['byModel'] = {};
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const r of filtered) {
      totalCost += r.cost;
      totalInputTokens += r.inputTokens;
      totalOutputTokens += r.outputTokens;
      if (!byModel[r.model]) byModel[r.model] = { cost: 0, requests: 0, inputTokens: 0, outputTokens: 0 };
      byModel[r.model].cost += r.cost;
      byModel[r.model].requests++;
      byModel[r.model].inputTokens += r.inputTokens;
      byModel[r.model].outputTokens += r.outputTokens;
    }

    return { totalCost, totalInputTokens, totalOutputTokens, requestCount: filtered.length, byModel };
  }

  resetBudget(): void {
    this.budgetExceeded = false;
  }

  clearRecords(): void {
    this.records = [];
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    this.checkBudget(); // CRITICAL (Audit P0 Fix): Refresh budget status before checking
    const { model: resolvedModel, blocked } = this.handleBudgetExceeded(model, messages, apiKey, signal);
    if (blocked) throw new Error(`Budget exceeded for ${this.id}. Request blocked.`);

    const inputTokens = messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);

    const res = await this.#inner.sendMessage(messages, resolvedModel, apiKey, signal);
    const outputTokens = res.tokens;
    const cost = this.calculateCost(resolvedModel, inputTokens, outputTokens);
    this.record(resolvedModel, inputTokens, outputTokens, cost);
    if (this.config.logCosts) console.debug(`[CostManager] ${resolvedModel}: $${cost.toFixed(6)} (${inputTokens}+${outputTokens}t)`);
    this.checkBudget();
    return res;
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    this.checkBudget(); // CRITICAL (Audit P0 Fix): Refresh budget status before checking
    const { model: resolvedModel, blocked } = this.handleBudgetExceeded(model, messages, apiKey, signal);
    if (blocked) throw new Error(`Budget exceeded for ${this.id}. Request blocked.`);

    const inputTokens = messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
    let outputTokens = 0;
    let finalMeta: Record<string, unknown> | undefined;

    const wrapped: typeof onChunk = (chunk, meta) => {
      if (meta) finalMeta = meta as Record<string, unknown>;
      outputTokens += Math.ceil(chunk.length / 4);
      onChunk(chunk, meta);
    };

    await this.#inner.streamMessage!(messages, resolvedModel, apiKey, wrapped, signal);
    const finalTokens = (finalMeta?.usage as { total_tokens?: number })?.total_tokens ?? outputTokens;
    const cost = this.calculateCost(resolvedModel, inputTokens, finalTokens);
    this.record(resolvedModel, inputTokens, finalTokens, cost);
    if (this.config.logCosts) console.debug(`[CostManager] ${resolvedModel} stream: $${cost.toFixed(6)} (${inputTokens}+${finalTokens}t)`);
    this.checkBudget();
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    return this.#inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return this.#inner.getAvailableModels(apiKey);
  }
}
