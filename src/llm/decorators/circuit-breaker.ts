import type {
    ChatMessage,
    ProviderResponse,
    HealthCheckResult,
    SendMessageOptions,
} from '../core/types';
import { BaseDecorator } from '../core/base-decorator';
import { LLMError, RetryableError } from '../core/errors';
import { FALLBACK_LOGGER } from '../../shared/utils/logger';
import type { ICrossTabStateSync } from '../../kernel/contracts/cross-tab-state';
import type { IEventBus } from '../../kernel/types/interfaces';
const LOGGER = FALLBACK_LOGGER.child('CircuitBreaker');

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

// 402 = Payment Required (no credits). Fail fast — don't retry, don't accumulate circuit failures.
const NON_CIRCUIT_HTTP_STATUSES = new Set([400, 401, 402, 403, 405, 422]);
// P1-6: server errors (5xx) open circuit after 2 failures instead of waiting for default threshold (5)
const SERVER_ERROR_STATUSES = new Set([500, 502, 503, 504]);

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

    readonly #config: CircuitConfig;

    #crossTabStateSync?: ICrossTabStateSync;
    #eventBus?: IEventBus;

    constructor(
        inner: import('../core/types').LLMProviderAdapter,
        config: CircuitConfig = DEFAULT_CONFIG,
        crossTabStateSync?: ICrossTabStateSync,
        eventBus?: IEventBus,
    ) {
        super(inner);
        this.#config = config;
        this.#crossTabStateSync = crossTabStateSync;
        this.#eventBus = eventBus;
        if (eventBus) this.listenToCrossTabSync();
    }

    get id(): string {
        return `${this.inner.id}[cb]`;
    }

    private updateAndGetState(): CircuitState {
        if (this.state.state === 'open') {
            if (this.transitioningToHalfOpen) return this.state.state;
            const timeout = this.state.currentTimeoutMs ?? this.#config.openTimeoutMs;
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

    forceReset(): void {
        this.reset();
    }

    forceOpen(): void {
        this.state.state = 'open';
        this.state.openSince = Date.now();
        this.state.currentTimeoutMs = this.#config.openTimeoutMs;
        this.transitioningToHalfOpen = false;
        this.#crossTabStateSync?.updateCircuitBreaker({
            provider: this.getProviderId(),
            keyId: this.inner.id,
            status: 'open',
            failureCount: this.state.failures,
            lastFailure: this.state.lastFailureTime,
        });
    }

    private async callWithCircuit<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
        const circuitState = this.updateAndGetState();
        if (circuitState === 'open') {
            const timeout = this.state.currentTimeoutMs ?? this.#config.openTimeoutMs;
            throw new LLMError(
                `Circuit breaker is OPEN for ${this.inner.id}. Retry in ${timeout - (Date.now() - this.state.openSince)}ms`,
                this.inner.id,
                503,
            );
        }
        const isHalfOpen = circuitState === 'half-open';
        if (isHalfOpen) {
            if (this.inFlightHalfOpen >= this.#config.halfOpenMaxRequests) {
                throw new LLMError(
                    `Circuit breaker is HALF-OPEN for ${this.inner.id}, max concurrent test requests reached`,
                    this.inner.id,
                    503,
                );
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
            this.onFailure(e, circuitState, signal);
            if (e instanceof RetryableError) {
                const error = new LLMError(
                    e instanceof Error ? e.message : String(e),
                    this.inner.id,
                    (e as { statusCode?: number }).statusCode,
                    { cause: e },
                );
                // Preserve retryAfter for upstream consumers (chat-service fallback backoff)
                if (e.retryAfter !== undefined)
                    (error as { retryAfter?: number }).retryAfter = e.retryAfter;
                throw error;
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

    private isUserInitiatedAbort(e: unknown, signal?: AbortSignal): boolean {
        if (!(e instanceof DOMException) || e.name !== 'AbortError') return false;
        // C-03: Use the per-call signal, not `this.currentSignal` which is shared
        // across concurrent requests. When request B overwrites currentSignal,
        // request A's abort is misattributed as a circuit failure.
        return signal?.aborted === true;
    }

    private onSuccess(capturedState: CircuitState): void {
        if (capturedState === 'half-open') {
            if (this.state.state !== 'half-open') return;
            this.state.successes++;
            if (this.state.successes >= this.#config.successThreshold) {
                this.reset();
                this.#crossTabStateSync?.updateCircuitBreaker({
                    provider: this.getProviderId(),
                    keyId: this.inner.id,
                    status: 'closed',
                    failureCount: 0,
                    lastFailure: 0,
                });
            }
        } else if (capturedState === 'closed' && this.state.state === 'closed') {
            this.state.failures = 0;
        }
    }

    private onFailure(e?: unknown, capturedState?: CircuitState, signal?: AbortSignal): void {
        if (this.isUserInitiatedAbort(e, signal)) return;
        const statusCode = this.getStatusCode(e);
        if (statusCode !== undefined && NON_CIRCUIT_HTTP_STATUSES.has(statusCode)) {
            return;
        }

        if (capturedState && capturedState !== this.state.state) return;

        this.state.failures++;
        this.state.lastFailureTime = Date.now();

        let isRateLimit = false;
        let customTimeoutMs: number | undefined;
        let isServerError = false;

        if (statusCode !== undefined) {
            if (statusCode === 429) {
                isRateLimit = true;
                const retryAfter =
                    e && typeof e === 'object'
                        ? (e as Record<string, unknown>).retryAfter
                        : undefined;
                if (typeof retryAfter === 'number' && retryAfter > 0) {
                    customTimeoutMs = retryAfter;
                }
            }
            // P1-6: server errors (5xx) open circuit after 2 failures only
            if (SERVER_ERROR_STATUSES.has(statusCode)) {
                isServerError = true;
            }
        }

        const serverErrorThresholdReached = isServerError && this.state.failures >= 2;
        if (
            this.state.state === 'half-open' ||
            isRateLimit ||
            serverErrorThresholdReached ||
            this.state.failures >= this.#config.failureThreshold
        ) {
            const prev = this.state.state;
            this.state.state = 'open';
            this.state.openSince = Date.now();
            if (customTimeoutMs) this.state.currentTimeoutMs = customTimeoutMs;
            LOGGER.debug('CircuitBreaker', 'state → open', {
                provider: this.inner.id,
                prev,
                failures: this.state.failures,
                rateLimit: isRateLimit,
            });

            this.#crossTabStateSync?.updateCircuitBreaker({
                provider: this.getProviderId(),
                keyId: this.inner.id,
                status: 'open',
                failureCount: this.state.failures,
                lastFailure: this.state.lastFailureTime,
            });
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
        this.unsubSync =
            this.#eventBus?.on('provider:circuit-breaker:synced', (state: unknown) => {
                const s = state as { provider: string; keyId: string; status: string };
                const syncKey = `${s.provider}:${s.keyId}`;
                if (syncKey !== key) return;
                if (s.status === 'open') {
                    this.forceOpen();
                } else if (s.status === 'closed') {
                    this.reset();
                }
            }) ?? null;
    }

    destroy(): void {
        if (this.unsubSync) {
            this.unsubSync();
            this.unsubSync = null;
        }
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
        return this.callWithCircuit(
            () => this.inner.sendMessage(messages, model, apiKey, signal, options),
            signal,
        );
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
        if (!streamMessage)
            throw new Error('CircuitBreaker: inner adapter does not support streaming');
        return this.callWithCircuit(
            () => streamMessage.call(this.inner, messages, model, apiKey, onChunk, signal, options),
            signal,
        );
    }

    async batchSendMessage(
        requests: Array<{
            messages: ChatMessage[];
            model: string;
            apiKey: string;
            signal?: AbortSignal;
            options?: SendMessageOptions;
        }>,
    ): Promise<ProviderResponse[]> {
        return this.callWithCircuit(() => this.inner.batchSendMessage!(requests));
    }

    async batchStreamMessage(
        requests: Array<{
            messages: ChatMessage[];
            model: string;
            apiKey: string;
            onChunk: (chunk: string, meta?: unknown) => void;
            signal?: AbortSignal;
            options?: SendMessageOptions;
        }>,
    ): Promise<void> {
        return this.callWithCircuit(() => this.inner.batchStreamMessage!(requests));
    }

    async checkHealth(apiKey: string): Promise<HealthCheckResult> {
        const state = this.updateAndGetState();
        if (state === 'open') {
            return {
                status: 'error',
                latency: 0,
                models: [],
                error: `Circuit breaker OPEN (${Math.round((Date.now() - this.state.openSince) / 1000)}s ago)`,
            };
        }
        return this.inner.checkHealth(apiKey);
    }

    async getAvailableModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
        if (this.updateAndGetState() === 'open') return [];
        return this.inner.getAvailableModels(apiKey, signal);
    }
}
