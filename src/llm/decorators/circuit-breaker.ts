import type { ChatMessage, ProviderResponse, HealthCheckResult, SendMessageOptions } from '../core/types';
import { BaseDecorator } from '../core/base-decorator';
import { LLMError, RetryableError } from '../core/errors';
import { CONFIG } from '../../kernel/services/config-registry';
import { crossTabStateSync } from '../../kernel/services/cross-tab-state';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { rootLogger } from '../../kernel/services/logger-service';
const LOGGER = rootLogger.child('CircuitBreaker');

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
  private unsubSync: (() => void) | null = null;
  // LLM-C02: Prevent race between timer-triggered OPEN→HALF_OPEN and concurrent callWithCircuit.
  // Only one transition should occur; subsequent callers during transition wait for it.
  private transitioningToHalfOpen = false;
  /** Track the current request's signal to distinguish user-abort from timeout-abort */
  private currentSignal?: AbortSignal;
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
        // LLM-L04: Use try/finally so flag is always cleared even if state
        // assignment throws — prevents permanent half-open lockout.
        this.transitioningToHalfOpen = true;
        try {
          this.state.state = 'half-open';
          this.state.successes = 0;
          this.state.currentTimeoutMs = undefined;
          LOGGER.debug('CircuitBreaker', 'open → half-open', { provider: this.inner.id });
        } finally {
          this.transitioningToHalfOpen = false;
        }
      }
    }
    return this.state.state;
  }

  /**
   * Purely read current state without triggering any transitions.
   * Useful for monitoring/diagnostics.
   */
  peekState(): CircuitState {
    return this.state.state;
  }

  /**
   * Get state and potentially trigger transition from OPEN to HALF_OPEN if timeout passed.
   * This is the "intended" way to get state for actual request execution.
   */
  getState(): CircuitState {
    return this.updateAndGetState();
  }

  /**
   * @deprecated Use peekState() for passive reading or getState() for active transition-aware reading.
   */
  checkAndGetState(): CircuitState {
    return this.updateAndGetState();
  }

  forceReset(): void {
    this.reset();
  }

  forceOpen(): void {
    this.state.state = 'open';
    this.state.openSince = Date.now();
    this.state.currentTimeoutMs = this.config.openTimeoutMs;
    this.transitioningToHalfOpen = false;
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
      this.onSuccess(circuitState);
      return result;
    } catch (e) {
      const statusCode = this.getStatusCodeForNonCircuit(e);
      if (statusCode !== undefined && NON_CIRCUIT_HTTP_STATUSES.has(statusCode)) {
        throw e;
      }
      this.onFailure(e, circuitState);
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
        this.inFlightHalfOpen = Math.max(0, this.inFlightHalfOpen - 1);
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

  private isUserInitiatedAbort(e: unknown): boolean {
    if (!(e instanceof DOMException) || e.name !== 'AbortError') return false;
    return this.currentSignal?.aborted === true;
  }

  private onSuccess(capturedState: CircuitState): void {
    if (capturedState === 'half-open') {
      if (this.state.state !== 'half-open') return;
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
    } else if (capturedState === 'closed' && this.state.state === 'closed') {
      this.state.failures = 0;
    }
  }

  private onFailure(e?: unknown, capturedState?: CircuitState): void {
    if (this.isUserInitiatedAbort(e)) return;
    const statusCode = this.getStatusCode(e);
    if (statusCode !== undefined && NON_CIRCUIT_HTTP_STATUSES.has(statusCode)) {
      return;
    }

    if (capturedState && capturedState !== this.state.state && capturedState !== 'half-open') return;

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
      const prev = this.state.state;
      this.state.state = 'open';
      this.state.openSince = Date.now();
      if (customTimeoutMs) this.state.currentTimeoutMs = customTimeoutMs;
      LOGGER.debug('CircuitBreaker', 'state → open', { provider: this.inner.id, prev, failures: this.state.failures, rateLimit: isRateLimit });

      crossTabStateSync.updateCircuitBreaker({
        provider: this.getProviderId(),
        keyId: this.inner.id,
        status: 'open',
        failureCount: this.state.failures,
        lastFailure: this.state.lastFailureTime
      });

      if (statusCode === 402) {
        eventBus.emit(EVENTS.NOTIFICATION, {
          message: `Provider ${this.getProviderId()} key ${this.inner.id.slice(0, 8)}...: Payment Required — circuit opened for 5min`,
          type: 'error',
        });
      }
    }
  }

  private getStatusCode(e: unknown): number | undefined {
    if (!e || typeof e !== 'object' || !('statusCode' in e)) return undefined;
    const statusCode = (e as Record<string, unknown>).statusCode;
    return typeof statusCode === 'number' ? statusCode : undefined;
  }

  private reset(): void {
    const prev = this.state.state;
    this.state = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      openSince: 0,
      currentTimeoutMs: undefined,
    };
    this.transitioningToHalfOpen = false;
    this.inFlightHalfOpen = 0;
    if (prev !== 'closed') {
      LOGGER.debug('CircuitBreaker', 'state → closed', { provider: this.inner.id, prev });
    }
  }

  listenToCrossTabSync(): void {
    const key = `${this.getProviderId()}:${this.inner.id}`;
    this.unsubSync = eventBus.on(EVENTS.PROVIDER_CIRCUIT_BREAKER_SYNCED, (state: unknown) => {
      const s = state as { provider: string; keyId: string; status: string };
      const syncKey = `${s.provider}:${s.keyId}`;
      if (syncKey !== key) return;
      if (s.status === 'open') {
        this.forceOpen();
      } else if (s.status === 'closed') {
        this.reset();
      }
    });
  }

  destroy(): void {
    if (this.unsubSync) { this.unsubSync(); this.unsubSync = null; }
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
    this.currentSignal = signal;
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
    this.currentSignal = signal;
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
