import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult, SendMessageOptions } from '../core/types';

interface CanaryTarget {
  adapter: LLMProviderAdapter;
  model: string;
  weight: number;
}

export interface CanaryRouterConfig {
  targets: CanaryTarget[];
  stickySession: boolean;
}

export interface CanaryResult {
  target: string;
  model: string;
  success: boolean;
  latency: number;
  tokens: number;
  timestamp: number;
}

function pickTarget(targets: CanaryTarget[]): CanaryTarget {
  const totalWeight = targets.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const t of targets) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return targets[targets.length - 1];
}

export class CanaryRouterDecorator implements LLMProviderAdapter {
  private sessionMap = new Map<string, number>();
  private results: CanaryResult[] = [];
  private readonly maxResults: number;

  readonly #config: CanaryRouterConfig;

  constructor(
    config: CanaryRouterConfig,
    options?: { maxResults?: number },
  ) {
    if (config.targets.length < 2) throw new Error('CanaryRouter requires at least 2 targets');
    this.#config = config;
    this.maxResults = options?.maxResults ?? 1000;
  }

  get id(): string {
    return this.#config.targets.map(t => `${t.adapter.id}:${t.model}`).join('|');
  }

  getControl(): CanaryTarget {
    return this.#config.targets[0];
  }

  getCandidate(): CanaryTarget {
    return this.#config.targets[1];
  }

  private selectTarget(messages: ChatMessage[], model: string): CanaryTarget {
    if (this.#config.stickySession) {
      const sessionKey = `${model}:${messages[0]?.content?.slice(0, 50)}`;
      const cached = this.sessionMap.get(sessionKey);
      if (cached !== undefined && cached < this.#config.targets.length) {
        return this.#config.targets[cached];
      }
      const chosen = pickTarget(this.#config.targets);
      this.sessionMap.set(sessionKey, this.#config.targets.indexOf(chosen));
      if (this.sessionMap.size > 1000) {
        const first = this.sessionMap.keys().next();
        if (first.value) this.sessionMap.delete(first.value);
      }
      return chosen;
    }
    return pickTarget(this.#config.targets);
  }

  private record(r: CanaryResult): void {
    this.results.push(r);
    if (this.results.length > this.maxResults) {
      this.results = this.results.slice(-this.maxResults);
    }
  }

  getResults(): CanaryResult[] {
    return [...this.results];
  }

  getSummary(): {
    control: { requests: number; avgLatency: number; avgTokens: number; errors: number };
    candidate: { requests: number; avgLatency: number; avgTokens: number; errors: number };
  } {
    const control = this.results.filter(r => r.target === this.getControl().adapter.id);
    const candidate = this.results.filter(r => r.target === this.getCandidate().adapter.id);

    const summarize = (items: CanaryResult[]) => {
      if (items.length === 0) return { requests: 0, avgLatency: 0, avgTokens: 0, errors: 0 };
      return {
        requests: items.length,
        avgLatency: items.reduce((s, r) => s + r.latency, 0) / items.length,
        avgTokens: items.reduce((s, r) => s + r.tokens, 0) / items.length,
        errors: items.filter(r => !r.success).length,
      };
    };

    return { control: summarize(control), candidate: summarize(candidate) };
  }

  clearResults(): void {
    this.results = [];
  }

  async sendMessage(messages: ChatMessage[], _model: string, apiKey: string, signal?: AbortSignal, options?: SendMessageOptions): Promise<ProviderResponse> {
    const target = this.selectTarget(messages, _model);
    const start = Date.now();
    try {
      const res = await target.adapter.sendMessage(messages, target.model, apiKey, signal, options);
      this.record({ target: target.adapter.id, model: target.model, success: true, latency: res.latency, tokens: res.tokens, timestamp: Date.now() });
      return res;
    } catch (e) {
      this.record({ target: target.adapter.id, model: target.model, success: false, latency: Date.now() - start, tokens: 0, timestamp: Date.now() });
      throw e;
    }
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<void> {
    const target = this.selectTarget(messages, model);
    const start = Date.now();
    try {
      await target.adapter.streamMessage!(messages, target.model, apiKey, onChunk, signal, options);
      this.record({ target: target.adapter.id, model: target.model, success: true, latency: Date.now() - start, tokens: 0, timestamp: Date.now() });
    } catch (e) {
      this.record({ target: target.adapter.id, model: target.model, success: false, latency: Date.now() - start, tokens: 0, timestamp: Date.now() });
      throw e;
    }
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const primary = await this.#config.targets[0].adapter.checkHealth(apiKey);
    if (primary.status === 'error') return primary;
    return this.#config.targets[1].adapter.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    const all = await Promise.all(this.#config.targets.map(t => t.adapter.getAvailableModels(apiKey)));
    return [...new Set(all.flat())];
  }
}
