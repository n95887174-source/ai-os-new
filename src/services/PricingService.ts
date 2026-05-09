
export interface ModelPricing {
  input: number;  // per 1M tokens
  output: number; // per 1M tokens
}

class PricingService {
  private pricingData: Record<string, ModelPricing> = {
    // OpenAI
    'gpt-4o': { input: 5.00, output: 15.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    
    // Anthropic (via OpenRouter/Direct)
    'claude-3-5-sonnet': { input: 3.00, output: 15.00 },
    'claude-3-opus': { input: 15.00, output: 75.00 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    
    // Google
    'gemini-1.5-pro': { input: 3.50, output: 10.50 },
    'gemini-1.5-flash': { input: 0.35, output: 1.05 },
    
    // Meta/Llama (via Groq/OpenRouter)
    'llama-3-70b': { input: 0.60, output: 0.80 },
    'llama-3-8b': { input: 0.05, output: 0.10 },
    'llama-3.1-405b': { input: 3.00, output: 3.00 },
    
    // Default fallback
    'default': { input: 1.00, output: 2.00 }
  };

  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const key = Object.keys(this.pricingData).find(k => model.toLowerCase().includes(k)) || 'default';
    const pricing = this.pricingData[key];
    
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    
    return inputCost + outputCost;
  }

  getPricing(model: string): ModelPricing {
    const key = Object.keys(this.pricingData).find(k => model.toLowerCase().includes(k)) || 'default';
    return this.pricingData[key];
  }
}

export const pricingService = new PricingService();
