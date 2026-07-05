export interface CircuitBreakerState {
    provider: string;
    keyId: string;
    status: 'closed' | 'half-open' | 'open';
    failureCount: number;
    lastFailure: number;
}

export interface RateLimitState {
    provider: string;
    keyId: string;
    remaining: number;
    resetAt: number;
}

export interface ICrossTabStateSync {
    updateCircuitBreaker(state: CircuitBreakerState): void;
    updateRateLimit(state: RateLimitState): void;
}
