import { eventBus } from '../core/events';

export interface ModelPricing {
  input: number;
  output: number;
}

const CACHE_KEY = 'super_agents_pricing_cache';
const CACHE_TTL = 60 * 60 * 1000;
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

const FALLBACK_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-1.5-pro': { input: 3.50, output: 10.50 },
  'gemini-1.5-flash': { input: 0.35, output: 1.05 },
  'llama-3.3-70b': { input: 0.60, output: 0.80 },
  'llama-3.1-405b': { input: 2.50, output: 2.50 },
  'llama-3-70b': { input: 0.60, output: 0.80 },
  'llama-3-8b': { input: 0.05, output: 0.10 },
  'mistral-large': { input: 2.00, output: 6.00 },
  'mistral-medium': { input: 2.50, output: 7.50 },
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'qwen-2-72b': { input: 0.90, output: 0.90 },
};

class PricingService {
  private pricingData: Record<string, ModelPricing> = { ...FALLBACK_PRICING };
  private lastFetch: number = 0;
  private fetchPromise: Promise<void> | null = null;

  constructor() {
    this.loadCache();
    this.syncFromOpenRouter();
  }

  private loadCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          this.pricingData = { ...FALLBACK_PRICING, ...data };
          this.lastFetch = timestamp;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  private saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: this.pricingData,
        timestamp: this.lastFetch
      }));
    } catch (e) {
      // ignore
    }
  }

  async syncFromOpenRouter(): Promise<void> {
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = (async () => {
      try {
        const res = await fetch(OPENROUTER_MODELS_URL);
        if (!res.ok) return;

        const body = await res.json();
        const models: any[] = body?.data || [];

        for (const model of models) {
          const id = model.id.toLowerCase();
          const p = model.pricing;
          if (p?.prompt && p?.completion) {
            this.pricingData[id] = {
              input: parseFloat(p.prompt),
              output: parseFloat(p.completion)
            };
          }
        }

        this.lastFetch = Date.now();
        this.saveCache();
        eventBus.emit('pricing:updated', this.pricingData);
      } catch (e) {
        console.warn('[Pricing] OpenRouter sync failed, using fallback prices');
      } finally {
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  private lookup(model: string): ModelPricing {
    const key = model.toLowerCase();

    const exact = this.pricingData[key];
    if (exact) return exact;

    const sorted = Object.keys(this.pricingData).sort((a, b) => b.length - a.length);
    for (const k of sorted) {
      if (key.includes(k) || k.includes(key)) {
        return this.pricingData[k];
      }
    }

    return FALLBACK_PRICING['gpt-4o-mini'];
  }

  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.lookup(model);
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  estimateCost(model: string, promptLength: number, estimatedOutputTokens: number = 256): number {
    const inputTokens = Math.ceil(promptLength / 4);
    return this.calculateCost(model, inputTokens, estimatedOutputTokens);
  }

  getInputCost(model: string): number {
    return this.lookup(model).input;
  }

  getPricing(model: string): ModelPricing {
    return { ...this.lookup(model) };
  }

  getAllPrices(): Record<string, ModelPricing> {
    return { ...this.pricingData };
  }

  getLastSync(): number {
    return this.lastFetch;
  }
}

export const pricingService = new PricingService();
