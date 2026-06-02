/**
 * Cross-Tab Provider State Synchronization
 * Uses BroadcastChannel API to sync provider state across multiple browser tabs
 * 
 * Syncs: circuit breaker state, rate limit tokens, recent errors
 * Fallback: localStorage events for older browsers
 */

import { EVENTS } from '../events/event-names';
import { eventBus } from '../event-bus';
import { rootLogger } from '../services/logger-service';

const CHANNEL_NAME = 'provider-state-sync';
const LOGGER = rootLogger.child('CrossTabStateSync');

export interface CrossTabStateMessage {
  type: 'circuit-breaker-update' | 'rate-limit-update' | 'error-update' | 'sync-request' | 'sync-response';
  timestamp: number;
  tabId: string;
  payload: unknown;
}

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

export interface ErrorEntry {
  provider: string;
  keyId: string;
  error: string;
  timestamp: number;
  statusCode?: number;
}

class CrossTabStateSync {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private isInitialized = false;
  private localCircuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private localRateLimits: Map<string, RateLimitState> = new Map();
  private localErrors: ErrorEntry[] = [];
  private listeners: Map<string, Set<(data: CrossTabStateMessage) => void>> = new Map();

  constructor() {
    this.tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.init();
  }

  private init(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<CrossTabStateMessage>) => {
          this.handleMessage(event.data);
        };
        LOGGER.info('CrossTabStateSync', 'Initialized with BroadcastChannel', { tabId: this.tabId });
      } catch (e) {
        LOGGER.warn('CrossTabStateSync', 'BroadcastChannel not available, using localStorage fallback', { error: e });
        this.initLocalStorageFallback();
      }
    } else {
      this.initLocalStorageFallback();
    }
    this.isInitialized = true;
    
    this.broadcast({ type: 'sync-request', timestamp: Date.now(), tabId: this.tabId, payload: null });
  }

  private initLocalStorageFallback(): void {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key?.startsWith('provider-state-sync:')) {
        try {
          const data = JSON.parse(event.newValue || '{}') as CrossTabStateMessage;
          this.handleMessage(data);
        } catch (e) {
          LOGGER.warn('CrossTabStateSync', 'Failed to parse localStorage sync message', { error: e });
        }
      }
    });
  }

  private handleMessage(message: CrossTabStateMessage): void {
    if (message.tabId === this.tabId) return;

    switch (message.type) {
      case 'circuit-breaker-update':
        this.handleCircuitBreakerUpdate(message.payload as CircuitBreakerState);
        break;
      case 'rate-limit-update':
        this.handleRateLimitUpdate(message.payload as RateLimitState);
        break;
      case 'error-update':
        this.handleErrorUpdate(message.payload as ErrorEntry);
        break;
      case 'sync-request':
        this.handleSyncRequest(message);
        break;
      case 'sync-response':
        this.handleSyncResponse(message);
        break;
    }

    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(listener => listener(message));
    }
  }

  private handleCircuitBreakerUpdate(state: CircuitBreakerState): void {
    const key = `${state.provider}:${state.keyId}`;
    this.localCircuitBreakers.set(key, state);
    eventBus.emit(EVENTS.PROVIDER_CIRCUIT_BREAKER_SYNCED, state);
    LOGGER.debug('CrossTabStateSync', 'Circuit breaker synced from another tab', { key, status: state.status });
  }

  private handleRateLimitUpdate(state: RateLimitState): void {
    const key = `${state.provider}:${state.keyId}`;
    this.localRateLimits.set(key, state);
    eventBus.emit(EVENTS.PROVIDER_RATE_LIMIT_SYNCED, state);
    LOGGER.debug('CrossTabStateSync', 'Rate limit synced from another tab', { key, remaining: state.remaining });
  }

  private handleErrorUpdate(entry: ErrorEntry): void {
    this.localErrors.push(entry);
    if (this.localErrors.length > 100) {
      this.localErrors = this.localErrors.slice(-100);
    }
    eventBus.emit(EVENTS.PROVIDER_ERROR_SYNCED, entry);
    LOGGER.debug('CrossTabStateSync', 'Error synced from another tab', { provider: entry.provider, error: entry.error });
  }

  private handleSyncRequest(message: CrossTabStateMessage): void {
    this.broadcast({
      type: 'sync-response',
      timestamp: Date.now(),
      tabId: this.tabId,
      payload: {
        circuitBreakers: Array.from(this.localCircuitBreakers.values()),
        rateLimits: Array.from(this.localRateLimits.values()),
        errors: this.localErrors.slice(-50)
      }
    });
  }

  private handleSyncResponse(message: CrossTabStateMessage): void {
    const payload = message.payload as {
      circuitBreakers: CircuitBreakerState[];
      rateLimits: RateLimitState[];
      errors: ErrorEntry[];
    };

    for (const cb of payload.circuitBreakers) {
      this.handleCircuitBreakerUpdate(cb);
    }
    for (const rl of payload.rateLimits) {
      this.handleRateLimitUpdate(rl);
    }
    for (const err of payload.errors) {
      this.handleErrorUpdate(err);
    }
  }

  private broadcast(message: CrossTabStateMessage): void {
    if (this.channel) {
      this.channel.postMessage(message);
    } else {
      localStorage.setItem(
        `provider-state-sync:${message.type}:${Date.now()}`,
        JSON.stringify(message)
      );
    }
  }

  broadcastCompatibility(type: string, keyId: string, data: any): void {
    if (type === 'circuit-change') {
      this.updateCircuitBreaker({
        provider: 'unknown',
        keyId,
        status: data.state,
        failureCount: 0,
        lastFailure: Date.now()
      });
    } else if (type === 'rate-limit-change') {
      this.updateRateLimit({
        provider: 'unknown',
        keyId,
        remaining: 0,
        resetAt: Date.now()
      });
    }
  }

  updateCircuitBreaker(state: CircuitBreakerState): void {
    const key = `${state.provider}:${state.keyId}`;
    this.localCircuitBreakers.set(key, state);
    this.broadcast({
      type: 'circuit-breaker-update',
      timestamp: Date.now(),
      tabId: this.tabId,
      payload: state
    });
  }

  updateRateLimit(state: RateLimitState): void {
    const key = `${state.provider}:${state.keyId}`;
    this.localRateLimits.set(key, state);
    this.broadcast({
      type: 'rate-limit-update',
      timestamp: Date.now(),
      tabId: this.tabId,
      payload: state
    });
  }

  reportError(entry: ErrorEntry): void {
    this.localErrors.push(entry);
    this.broadcast({
      type: 'error-update',
      timestamp: Date.now(),
      tabId: this.tabId,
      payload: entry
    });
  }

  getCircuitBreaker(provider: string, keyId: string): CircuitBreakerState | undefined {
    return this.localCircuitBreakers.get(`${provider}:${keyId}`);
  }

  getRateLimit(provider: string, keyId: string): RateLimitState | undefined {
    return this.localRateLimits.get(`${provider}:${keyId}`);
  }

  getRecentErrors(limit = 50): ErrorEntry[] {
    return this.localErrors.slice(-limit);
  }

  subscribe(type: CrossTabStateMessage['type'], callback: (data: CrossTabStateMessage) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  getAllCircuitBreakers(): CircuitBreakerState[] {
    return Array.from(this.localCircuitBreakers.values());
  }

  getAllRateLimits(): RateLimitState[] {
    return Array.from(this.localRateLimits.values());
  }

  requestFullSync(): void {
    this.broadcast({
      type: 'sync-request',
      timestamp: Date.now(),
      tabId: this.tabId,
      payload: null
    });
  }

  isPrimary(): boolean {
    const localMax = Math.max(
      ...Array.from(this.localCircuitBreakers.values()).map(s => s.lastFailure),
      ...Array.from(this.localRateLimits.values()).map(s => s.resetAt),
      0
    );
    return true;
  }

  destroy(): void {
    this.channel?.close();
    this.listeners.clear();
    this.isInitialized = false;
    LOGGER.info('CrossTabStateSync', 'Destroyed', { tabId: this.tabId });
  }
}

export const crossTabStateSync = new CrossTabStateSync();
