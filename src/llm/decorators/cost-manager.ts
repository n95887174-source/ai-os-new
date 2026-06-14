import type { ChatMessage, ProviderResponse, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';
import { CONFIG } from '../../kernel/services/config-registry';
import { LLMError } from '../core/errors';
import { estimateTokenCount } from '../utils/token-counter';

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
  ...(CONFIG?.llm?.pricing as Record<string, ModelPricing> | undefined),
};

const FALLBACK_PRICING: ModelPricing = {
  inputPer1K: CONFIG?.llm?.pricingFallback?.inputPer1K ?? 0.002,
  outputPer1K: CONFIG?.llm?.pricingFallback?.outputPer1K ?? 0.008,
};

export class CostManagerDecorator extends BaseDecorator {
  private records: CostRecord[] = [];
  private cumulativeCost = 0;
  private config: CostManagerConfig;
  private budgetExceeded = false;

  constructor(
    inner: import('../core/types').LLMProviderAdapter,
    config?: Partial<CostManagerConfig>,
  ) {
    super(inner);
    this.config = {
      pricing: DEFAULT_PRICING,
      logCosts: false,
      ...config,
    };
  }

  get id(): string {
    return `${this.inner.id}[cost]`;
  }

  private getPricing(model: string): ModelPricing {
    return this.config.pricing[model] ?? FALLBACK_PRICING;
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

    let costDay = 0, costWeek = 0;
    for (const r of this.records) {
      const age = now - r.timestamp;
      if (age < week) costWeek += r.cost;
      if (age < day) costDay += r.cost;
    }
    const costMonth = this.cumulativeCost;

    const exceeded = (
      (this.config.dailyBudget !== undefined && costDay >= this.config.dailyBudget) ||
      (this.config.weeklyBudget !== undefined && costWeek >= this.config.weeklyBudget) ||
      (this.config.monthlyBudget !== undefined && costMonth >= this.config.monthlyBudget)
    );

    if (exceeded && !this.budgetExceeded) {
      this.budgetExceeded = true;
      if (this.config.logCosts) console.warn('[CostManager] Budget exceeded');
    } else if (!exceeded && this.budgetExceeded) {
      this.budgetExceeded = false;
      if (this.config.logCosts) console.info('[CostManager] Budget auto-reset');
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
    this.cumulativeCost += cost;
    this.records.push({ timestamp: Date.now(), model, inputTokens, outputTokens, cost });
    if (this.records.length > 100000) {
      this.records = this.records.slice(-50000);
    }
    if (this.records.length > 1000) {
      this.evictOldRecords();
    }
  }

  private evictOldRecords(): void {
    const cutoff = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const idx = this.records.findIndex(r => r.timestamp >= cutoff);
    if (idx > 0) {
      this.records = this.records.slice(idx);
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

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal, options?: SendMessageOptions): Promise<ProviderResponse> {
    this.checkBudget(); // CRITICAL (Audit P0 Fix): Refresh budget status before checking
    const { model: resolvedModel, blocked } = this.handleBudgetExceeded(model, messages, apiKey, signal);
    if (blocked) throw new LLMError(`Budget exceeded for ${this.id}. Request blocked.`, this.id, 429);

    const inputTokens = messages.reduce((s, m) => s + estimateTokenCount(m.content), 0);

    const res = await this.inner.sendMessage(messages, resolvedModel, apiKey, signal, options);
    const outputTokens = Math.max(0, (res.tokens ?? 0) - inputTokens);
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
    options?: SendMessageOptions,
  ): Promise<void> {
    this.checkBudget(); // CRITICAL (Audit P0 Fix): Refresh budget status before checking
    const { model: resolvedModel, blocked } = this.handleBudgetExceeded(model, messages, apiKey, signal);
    if (blocked) throw new LLMError(`Budget exceeded for ${this.id}. Request blocked.`, this.id, 429);

    const inputTokens = messages.reduce((s, m) => s + estimateTokenCount(m.content), 0);
    let outputTokens = 0;
    let finalMeta: Record<string, unknown> | undefined;

    const wrapped: typeof onChunk = (chunk, meta) => {
      if (meta) finalMeta = meta as Record<string, unknown>;
      outputTokens += estimateTokenCount(chunk);
      onChunk(chunk, meta);
    };

    if (!this.inner.streamMessage) throw new Error('CostManager: inner adapter does not support streaming');
    await this.inner.streamMessage(messages, resolvedModel, apiKey, wrapped, signal, options);
    const totalTokens = (finalMeta?.usage as { total_tokens?: number })?.total_tokens ?? outputTokens;
    const streamOutputTokens = Math.max(0, totalTokens - inputTokens);
    const cost = this.calculateCost(resolvedModel, inputTokens, streamOutputTokens);
    this.record(resolvedModel, inputTokens, streamOutputTokens, cost);
    if (this.config.logCosts) console.debug(`[CostManager] ${resolvedModel} stream: $${cost.toFixed(6)} (${inputTokens}+${streamOutputTokens}t)`);
    this.checkBudget();
  }

  destroy(): void {
    super.destroy();
  }
}
