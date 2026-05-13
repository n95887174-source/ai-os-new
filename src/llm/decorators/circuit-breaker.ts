import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitConfig {
  failureThreshold: number;
  successThreshold: number;
  openTimeoutMs: number;
  halfOpenMaxRequests: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  openTimeoutMs: 30000,
  halfOpenMaxRequests: 1,
};

interface CircuitStateData {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  openSince: number;
}

export class CircuitBreakerDecorator implements LLMProviderAdapter {
  private state: CircuitStateData = {
    state: 'closed',
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    openSince: 0,
  };

  private inFlightHalfOpen = 0;

  readonly #inner: LLMProviderAdapter;
  readonly #config: CircuitConfig;

  constructor(
    inner: LLMProviderAdapter,
    config: CircuitConfig = DEFAULT_CONFIG,
  ) {
    this.#inner = inner;
    this.#config = config;
  }

  get id(): string {
    return `${this.#inner.id}[cb]`;
  }

  getState(): CircuitState {
    if (this.state.state === 'open') {
      if (Date.now() - this.state.openSince >= this.#config.openTimeoutMs) {
        this.state.state = 'half-open';
        this.state.successes = 0;
        this.inFlightHalfOpen = 0;
      }
    }
    return this.state.state;
  }

  private async callWithCircuit<T>(fn: () => Promise<T>): Promise<T> {
    const circuitState = this.getState();
    if (circuitState === 'open') {
      throw new Error(`Circuit breaker is OPEN for ${this.#inner.id}. Retry in ${this.#config.openTimeoutMs - (Date.now() - this.state.openSince)}ms`);
    }
    const isHalfOpen = circuitState === 'half-open';
    if (isHalfOpen) {
      if (this.inFlightHalfOpen >= this.#config.halfOpenMaxRequests) {
        throw new Error(`Circuit breaker is HALF-OPEN for ${this.#inner.id}, max concurrent test requests reached`);
      }
      this.inFlightHalfOpen++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (e) {
      this.onFailure();
      throw e;
    } finally {
      // Guarantee counter decrement even on unexpected errors
      if (isHalfOpen && this.state.state === 'half-open' && this.inFlightHalfOpen > 0) {
        this.inFlightHalfOpen--;
      }
    }
  }

  private onSuccess(): void {
    if (this.state.state === 'half-open') {
      this.state.successes++;
      if (this.state.successes >= this.#config.successThreshold) {
        this.reset();
      } else {
        this.inFlightHalfOpen--;
      }
    } else {
      this.state.failures = 0;
    }
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.state === 'half-open') {
      this.state.state = 'open';
      this.state.openSince = Date.now();
      this.inFlightHalfOpen = 0;
      return;
    }

    if (this.state.failures >= this.#config.failureThreshold) {
      this.state.state = 'open';
      this.state.openSince = Date.now();
    }
  }

  private reset(): void {
    this.state = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      openSince: 0,
    };
    this.inFlightHalfOpen = 0;
  }

  forceOpen(): void {
    this.state.state = 'open';
    this.state.openSince = Date.now();
  }

  forceReset(): void {
    this.reset();
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    return this.callWithCircuit(() => this.#inner.sendMessage(messages, model, apiKey, signal));
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    return this.callWithCircuit(() => this.#inner.streamMessage!(messages, model, apiKey, onChunk, signal));
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const state = this.getState();
    if (state === 'open') {
      return { status: 'error', latency: 0, models: [], error: `Circuit breaker OPEN (${Math.round((Date.now() - this.state.openSince) / 1000)}s ago)` };
    }
    return this.#inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    if (this.getState() === 'open') return [];
    return this.#inner.getAvailableModels(apiKey);
  }
}
