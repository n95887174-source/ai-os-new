import type { ChatMessage, ProviderResponse, HealthCheckResult, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';
import { LLMError, RetryableError } from '../core/errors';
import { CONFIG } from '../../kernel/services/config-registry';
import { crossTabStateSync } from '../../kernel/services/cross-tab-state';

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

const NON_CIRCUIT_HTTP_STATUSES = new Set([400, 401, 403, 404, 405, 422]);

interface CircuitStateData {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  openSince: number;
  currentTimeoutMs?: number;
}

export class CircuitBreakerDecorator extends BaseDecorator {
  private state: CircuitStateData = {
    state: 'closed',
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    openSince: 0,
  };

  private inFlightHalfOpen = 0;
  // LLM-C02: Prevent race between timer-triggered OPEN→HALF_OPEN and concurrent callWithCircuit.
  // Only one transition should occur; subsequent callers during transition wait for it.
  private transitioningToHalfOpen = false;
  readonly #config: CircuitConfig;

  constructor(
    inner: import('../core/types').LLMProviderAdapter,
    config: CircuitConfig = DEFAULT_CONFIG,
  ) {
    super(inner);
    this.#config = config;
  }

  get id(): string {
    return `${this.inner.id}[cb]`;
  }

  private get config(): CircuitConfig {
    return CONFIG?.llm?.circuitBreaker || this.#config;
  }

  private updateAndGetState(): CircuitState {
    if (this.state.state === 'open') {
      // LLM-C02: Atomic OPEN→HALF_OPEN transition.
      // If another caller is already transitioning (timer + concurrent call), skip.
      if (this.transitioningToHalfOpen) return this.state.state;
      const timeout = this.state.currentTimeoutMs ?? this.config.openTimeoutMs;
      if (Date.now() - this.state.openSince >= timeout) {
        this.transitioningToHalfOpen = true;
        this.state.state = 'half-open';
        this.state.successes = 0;
        // LLM-C02: Only reset inFlightHalfOpen if no concurrent requests are in-flight.
        // If requests are already running (count > 0), let them complete naturally.
        if (this.inFlightHalfOpen === 0) {
          this.inFlightHalfOpen = 0;
        }
        this.state.currentTimeoutMs = undefined;
        this.transitioningToHalfOpen = false;
      }
    }
    return this.state.state;
  }

  getState(): CircuitState {
    return this.updateAndGetState();
  }

  checkAndGetState(): CircuitState {
    return this.updateAndGetState();
  }

  forceReset(): void {
    this.reset();
  }

  private async callWithCircuit<T>(fn: () => Promise<T>): Promise<T> {
    const circuitState = this.updateAndGetState();
    if (circuitState === 'open') {
      const timeout = this.state.currentTimeoutMs ?? this.config.openTimeoutMs;
      throw new LLMError(`Circuit breaker is OPEN for ${this.inner.id}. Retry in ${timeout - (Date.now() - this.state.openSince)}ms`, this.inner.id, 503);
    }
    const isHalfOpen = circuitState === 'half-open';
    if (isHalfOpen) {
      if (this.inFlightHalfOpen >= this.config.halfOpenMaxRequests) {
        throw new LLMError(`Circuit breaker is HALF-OPEN for ${this.inner.id}, max concurrent test requests reached`, this.inner.id, 503);
      }
      this.inFlightHalfOpen++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (e) {
      const statusCode = this.getStatusCodeForNonCircuit(e);
      if (statusCode !== undefined && NON_CIRCUIT_HTTP_STATUSES.has(statusCode)) {
        throw e;
      }
      this.onFailure(e);
      if (e instanceof RetryableError) {
        throw new LLMError(
          e instanceof Error ? e.message : String(e),
          this.inner.id,
          (e as unknown as { statusCode?: number }).statusCode,
          { cause: e },
        );
      }
      throw e;
    } finally {
      if (isHalfOpen && this.inFlightHalfOpen > 0) {
        this.inFlightHalfOpen--;
      }
    }
  }

  private getStatusCodeForNonCircuit(e: unknown): number | undefined {
    if (!e || typeof e !== 'object') return undefined;
    return this.getStatusCode(e);
  }

  private getProviderId(): string {
    return this.inner.id.replace(/\[(rl|cb|pq|rt|log|metrics|cache|fb|sr|cr|cm)\]/g, '');
  }

  private onSuccess(): void {
    if (this.state.state === 'half-open') {
      this.state.successes++;
      if (this.state.successes >= this.config.successThreshold) {
        this.reset();
        crossTabStateSync.updateCircuitBreaker({
          provider: this.getProviderId(),
          keyId: this.inner.id,
          status: 'closed',
          failureCount: 0,
          lastFailure: 0
        });
      }
    } else {
      this.state.failures = 0;
    }
  }

  private onFailure(e?: unknown): void {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    const statusCode = this.getStatusCode(e);
    if (statusCode !== undefined && NON_CIRCUIT_HTTP_STATUSES.has(statusCode)) {
      return;
    }

    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    let isRateLimit = false;
    let customTimeoutMs: number | undefined;

    if (statusCode !== undefined) {
      if (statusCode === 429 || statusCode === 402) {
        isRateLimit = true;
        const retryAfter = e && typeof e === 'object'
          ? (e as Record<string, unknown>).retryAfter
          : undefined;
        if (typeof retryAfter === 'number' && retryAfter > 0) {
          customTimeoutMs = retryAfter;
        }
        // 402 (Payment Required) — open circuit for longer
        if (statusCode === 402) {
          customTimeoutMs = Math.max(customTimeoutMs ?? 0, 5 * 60 * 1000);
        }
      }
    }

    if (this.state.state === 'half-open' || isRateLimit || this.state.failures >= this.config.failureThreshold) {
      this.state.state = 'open';
      this.state.openSince = Date.now();
      if (customTimeoutMs) this.state.currentTimeoutMs = customTimeoutMs;
      
      crossTabStateSync.updateCircuitBreaker({
        provider: this.getProviderId(),
        keyId: this.inner.id,
        status: 'open',
        failureCount: this.state.failures,
        lastFailure: this.state.lastFailureTime
      });
    }
  }

  private getStatusCode(e: unknown): number | undefined {
    if (!e || typeof e !== 'object' || !('statusCode' in e)) return undefined;
    const statusCode = (e as Record<string, unknown>).statusCode;
    return typeof statusCode === 'number' ? statusCode : undefined;
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
    this.transitioningToHalfOpen = false;
    // LLM-14: Don't zero inFlightHalfOpen — let finally blocks handle decrements
  }

  destroy(): void {
    this.reset();
    super.destroy();
  }

  async sendMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<ProviderResponse> {
    return this.callWithCircuit(() => this.inner.sendMessage(messages, model, apiKey, signal, options));
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
    options?: SendMessageOptions,
  ): Promise<void> {
    const streamMessage = this.inner.streamMessage;
    if (!streamMessage) throw new Error('CircuitBreaker: inner adapter does not support streaming');
    return this.callWithCircuit(() => streamMessage.call(this.inner, messages, model, apiKey, onChunk, signal, options));
  }

  async batchSendMessage(requests: Array<{ messages: ChatMessage[]; model: string; apiKey: string; signal?: AbortSignal; options?: SendMessageOptions }>): Promise<ProviderResponse[]> {
    return this.callWithCircuit(() => this.inner.batchSendMessage!(requests));
  }

  async batchStreamMessage(requests: Array<{ messages: ChatMessage[]; model: string; apiKey: string; onChunk: (chunk: string, meta?: unknown) => void; signal?: AbortSignal; options?: SendMessageOptions }>): Promise<void> {
    return this.callWithCircuit(() => this.inner.batchStreamMessage!(requests));
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    const state = this.updateAndGetState();
    if (state === 'open') {
      return { status: 'error', latency: 0, models: [], error: `Circuit breaker OPEN (${Math.round((Date.now() - this.state.openSince) / 1000)}s ago)` };
    }
    return this.inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
    if (this.updateAndGetState() === 'open') return [];
    return this.inner.getAvailableModels(apiKey, signal);
  }
}
