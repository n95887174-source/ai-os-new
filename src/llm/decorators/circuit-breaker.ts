import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult, SendMessageOptions } from '../core/types';
import { CONFIG } from '../../kernel/services/config-registry';

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitConfig {
  failureThreshold: number;
  successThreshold: number;
  openTimeoutMs: number;
  halfOpenMaxRequests: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: CONFIG?.llm?.circuitBreaker?.failureThreshold ?? 5,
  successThreshold: CONFIG?.llm?.circuitBreaker?.successThreshold ?? 2,
  openTimeoutMs: CONFIG?.llm?.circuitBreaker?.openTimeoutMs ?? 30000,
  halfOpenMaxRequests: CONFIG?.llm?.circuitBreaker?.halfOpenMaxRequests ?? 1,
};

interface CircuitStateData {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  openSince: number;
  currentTimeoutMs?: number;
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

  private get config(): CircuitConfig {
    return CONFIG?.llm?.circuitBreaker || this.#config;
  }

  private updateAndGetState(): CircuitState {
    if (this.state.state === 'open') {
      const timeout = this.state.currentTimeoutMs ?? this.config.openTimeoutMs;
      if (Date.now() - this.state.openSince >= timeout) {
        this.state.state = 'half-open';
        this.state.successes = 0;
        this.inFlightHalfOpen = 0;
        this.state.currentTimeoutMs = undefined;
      }
    }
    return this.state.state;
  }

  getState(): CircuitState {
    return this.state.state;
  }

  checkAndGetState(): CircuitState {
    return this.updateAndGetState();
  }

  private async callWithCircuit<T>(fn: () => Promise<T>): Promise<T> {
    const circuitState = this.updateAndGetState();
    if (circuitState === 'open') {
      const timeout = this.state.currentTimeoutMs ?? this.config.openTimeoutMs;
      throw new Error(`Circuit breaker is OPEN for ${this.#inner.id}. Retry in ${timeout - (Date.now() - this.state.openSince)}ms`);
    }
    const isHalfOpen = circuitState === 'half-open';
    if (isHalfOpen) {
      if (this.inFlightHalfOpen >= this.config.halfOpenMaxRequests) {
        throw new Error(`Circuit breaker is HALF-OPEN for ${this.#inner.id}, max concurrent test requests reached`);
      }
      this.inFlightHalfOpen++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (e) {
      this.onFailure(e);
      throw e;
    } finally {
      // Guarantee counter decrement even on unexpected errors
      if (isHalfOpen && this.inFlightHalfOpen > 0) {
        this.inFlightHalfOpen--;
      }
    }
  }

  private onSuccess(): void {
    if (this.state.state === 'half-open') {
      this.state.successes++;
      if (this.state.successes >= this.config.successThreshold) {
        this.reset();
      }
    } else {
      this.state.failures = 0;
    }
  }

  private onFailure(e?: unknown): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    let isRateLimit = false;
    let customTimeoutMs: number | undefined;

    if (e && typeof e === 'object' && 'statusCode' in e) {
      if ((e as Record<string, unknown>).statusCode === 429) {
        isRateLimit = true;
        const retryAfter = (e as Record<string, unknown>).retryAfter;
        if (typeof retryAfter === 'number' && retryAfter > 0) {
          customTimeoutMs = retryAfter;
        }
      }
    }

    if (this.state.state === 'half-open') {
      this.state.state = 'open';
      this.state.openSince = Date.now();
      if (customTimeoutMs) this.state.currentTimeoutMs = customTimeoutMs;
      return;
    }

    if (isRateLimit || this.state.failures >= this.config.failureThreshold) {
      this.state.state = 'open';
      this.state.openSince = Date.now();
      if (customTimeoutMs) this.state.currentTimeoutMs = customTimeoutMs;
    }
  }

  private reset(): void {
    this.state = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      openSince: 0,
      currentTimeoutMs: undefined,
    };
    this.inFlightHalfOpen = 0;
  }

  destroy(): void {
    this.reset();
  }

  forceOpen(): void {
    this.state.state = 'open';
    this.state.openSince = Date.now();
  }

  forceReset(): void {
    this.reset();
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<ProviderResponse> {
    return this.callWithCircuit(() => this.#inner.sendMessage(messages, model, apiKey, signal, options));
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<void> {
    return this.callWithCircuit(() => this.#inner.streamMessage!(messages, model, apiKey, onChunk, signal, options));
  }

  async batchSendMessage(requests: Array<{ messages: ChatMessage[]; model: string; apiKey: string; signal?: AbortSignal; options?: SendMessageOptions }>): Promise<ProviderResponse[]> {
    return this.callWithCircuit(() => this.#inner.batchSendMessage!(requests));
  }

  async batchStreamMessage(requests: Array<{ messages: ChatMessage[]; model: string; apiKey: string; onChunk: (chunk: string, meta?: unknown) => void; signal?: AbortSignal; options?: SendMessageOptions }>): Promise<void> {
    return this.callWithCircuit(() => this.#inner.batchStreamMessage!(requests));
  }

  async rotateKey(currentKey: string): Promise<{ newKey: string; label?: string } | null> {
    return this.#inner.rotateKey?.(currentKey) ?? null;
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const state = this.updateAndGetState();
    if (state === 'open') {
      return { status: 'error', latency: 0, models: [], error: `Circuit breaker OPEN (${Math.round((Date.now() - this.state.openSince) / 1000)}s ago)` };
    }
    return this.#inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    if (this.updateAndGetState() === 'open') return [];
    return this.#inner.getAvailableModels(apiKey);
  }
}
