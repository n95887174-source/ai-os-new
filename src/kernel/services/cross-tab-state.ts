import { eventBus } from '../events/event-bus';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';

const CHANNEL_NAME = 'provider-state-sync';
const LOGGER = rootLogger.child('CrossTabStateSync');
const HEARTBEAT_MS = 30_000;
const TAB_TIMESTAMP_KEY = 'cross-tab:timestamps';

export interface CrossTabStateMessage {
  type: 'circuit-breaker-update' | 'rate-limit-update' | 'error-update' | 'sync-request' | 'sync-response' | 'heartbeat';
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
  private tabTimestamp: number;
  private localCircuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private localRateLimits: Map<string, RateLimitState> = new Map();
  private localErrors: ErrorEntry[] = [];
  private listeners: Map<string, Set<(data: CrossTabStateMessage) => void>> = new Map();
  private knownTabTimestamps: Map<string, number> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private storageHandler: ((event: StorageEvent) => void) | null = null;
  private keyRemovedUnsub?: () => void;

  constructor() {
    this.tabId = `${Date.now().toString(36)}-${crypto.randomUUID()}`;
    this.tabTimestamp = Date.now();
    this.knownTabTimestamps.set(this.tabId, this.tabTimestamp);
    this.init();
  }

  private init(): void {
    // STATE-C4: Clean up circuit-breaker / rate-limit state when a key is removed.
    // Without this, deleted keys leave orphaned entries keyed by `${provider}:${keyId}`
    // that block new keys with the same ID on re-add, and leak memory.
    this.keyRemovedUnsub = eventBus.on(EVENTS.KEY_REMOVED, (id: unknown) => {
      const keyId = String(id);
      // We don't know the provider, but we scan all keys with matching suffix.
      for (const key of this.localCircuitBreakers.keys()) {
        if (key.endsWith(`:${keyId}`)) this.localCircuitBreakers.delete(key);
      }
      for (const key of this.localRateLimits.keys()) {
        if (key.endsWith(`:${keyId}`)) this.localRateLimits.delete(key);
      }
      this.localErrors = this.localErrors.filter(e => !e.keyId.endsWith(`:${keyId}`));
      LOGGER.debug('CrossTabStateSync', 'key removed', { keyId, cleanedCircuitBreakers: true, cleanedRateLimits: true });
    });

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

    this.broadcast({ type: 'sync-request', timestamp: Date.now(), tabId: this.tabId, payload: null });

    this.heartbeatTimer = setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        timestamp: Date.now(),
        tabId: this.tabId,
        payload: { hash: this.computeStateHash() },
      });
      this.pruneStaleTabs();
      this.pruneLocalStorage();
    }, HEARTBEAT_MS);

    this.syncTimer = setInterval(() => {
      this.broadcast({
        type: 'sync-request',
        timestamp: Date.now(),
        tabId: this.tabId,
        payload: null,
      });
      LOGGER.debug('CrossTabStateSync', 'Periodic full-sync requested', { tabId: this.tabId });
    }, HEARTBEAT_MS * 4);
  }

  private initLocalStorageFallback(): void {
    this.storageHandler = (event: StorageEvent) => {
      if (event.key?.startsWith('provider-state-sync:')) {
        try {
          const data = JSON.parse(event.newValue || '{}') as CrossTabStateMessage;
          this.handleMessage(data);
        } catch (e) {
          LOGGER.warn('CrossTabStateSync', 'Failed to parse localStorage sync message', { error: e });
        }
      }
    };
    window.addEventListener('storage', this.storageHandler);
  }

  private handleMessage(message: CrossTabStateMessage): void {
    if (message.tabId === this.tabId) return;

    if (message.timestamp > 0) {
      this.knownTabTimestamps.set(message.tabId, message.timestamp);
      this.persistTabTimestamps();
    }

    switch (message.type) {
      case 'heartbeat': {
        const remoteHash = (message.payload as { hash: string }).hash;
        const localHash = this.computeStateHash();
        if (remoteHash !== localHash) {
          LOGGER.warn('CrossTabStateSync', 'State hash mismatch detected', { tabId: message.tabId, remoteHash, localHash });
          eventBus.emit(EVENTS.PROVIDER_STATE_DESYNC, {
            localHash,
            remoteHash,
            mismatches: this.countMismatches(message.tabId),
          });
          this.broadcast({ type: 'sync-request', timestamp: Date.now(), tabId: this.tabId, payload: null });
        }
        break;
      }
      case 'circuit-breaker-update':
        this.handleCircuitBreakerUpdate(message.payload as CircuitBreakerState, message.timestamp);
        break;
      case 'rate-limit-update':
        this.handleRateLimitUpdate(message.payload as RateLimitState, message.timestamp);
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

  private handleCircuitBreakerUpdate(state: CircuitBreakerState, _incomingTimestamp: number): void {
    const key = `${state.provider}:${state.keyId}`;
    const existing = this.localCircuitBreakers.get(key);
    if (existing && existing.lastFailure >= state.lastFailure && existing.status === state.status) {
      return;
    }
    this.localCircuitBreakers.set(key, state);
    eventBus.emit(EVENTS.PROVIDER_CIRCUIT_BREAKER_SYNCED, state);
    LOGGER.debug('CrossTabStateSync', 'Circuit breaker synced from another tab', { key, status: state.status });
  }

  private handleRateLimitUpdate(state: RateLimitState, _incomingTimestamp: number): void {
    const key = `${state.provider}:${state.keyId}`;
    const existing = this.localRateLimits.get(key);
    if (existing && existing.resetAt >= state.resetAt) {
      return;
    }
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

  private handleSyncRequest(_message: CrossTabStateMessage): void {
    this.broadcast({
      type: 'sync-response',
      timestamp: Date.now(),
      tabId: this.tabId,
      payload: {
        circuitBreakers: Array.from(this.localCircuitBreakers.values()),
        rateLimits: Array.from(this.localRateLimits.values()),
        errors: this.localErrors.slice(-50),
      },
    });
  }

  private handleSyncResponse(message: CrossTabStateMessage): void {
    // Skip response from stale tabs (own timestamp is newer than theirs)
    const remoteTs = message.timestamp;
    if (remoteTs > 0) {
      const latestKnown = this.knownTabTimestamps.get(message.tabId) ?? 0;
      if (remoteTs < latestKnown) return;
    }

    const payload = message.payload as {
      circuitBreakers: CircuitBreakerState[];
      rateLimits: RateLimitState[];
      errors: ErrorEntry[];
    };

    for (const cb of payload.circuitBreakers) {
      this.handleCircuitBreakerUpdate(cb, message.timestamp);
    }
    for (const rl of payload.rateLimits) {
      this.handleRateLimitUpdate(rl, message.timestamp);
    }
    for (const err of payload.errors) {
      // Dedup errors by provider+keyId+timestamp — skip if we already have it
      const exists = this.localErrors.some(
        e => e.provider === err.provider && e.keyId === err.keyId && e.timestamp === err.timestamp
      );
      if (!exists) {
        this.handleErrorUpdate(err);
      }
    }
  }

  private computeStateHash(): string {
    const parts: string[] = [];
    for (const [, state] of this.localCircuitBreakers) {
      parts.push(`${state.provider}:${state.keyId}:${state.status}:${state.failureCount}`);
    }
    for (const [, rl] of this.localRateLimits) {
      parts.push(`${rl.provider}:${rl.keyId}:${rl.remaining}`);
    }
    parts.sort();
    let hash = 0;
    for (const p of parts) {
      hash = ((hash << 5) - hash + p.charCodeAt(0)) | 0;
    }
    return hash.toString(16);
  }

  private countMismatches(_remoteTabId: string): number {
    // L-12: Previously compared local→local (always 0). Now compute how many
    // local entries differ from the baseline (status=closed, failureCount=0).
    // Entries that are non-baseline represent real circuit states that differ
    // from a "clean slate" — meaningful as a mismatch indicator.
    let count = 0;
    for (const [, state] of this.localCircuitBreakers) {
      if (state.status !== 'closed' || state.failureCount > 0) count++;
    }
    return count;
  }

  private pruneStaleTabs(): void {
    const now = Date.now();
    const stale: string[] = [];
    for (const [tabId, ts] of this.knownTabTimestamps) {
      if (tabId !== this.tabId && now - ts > HEARTBEAT_MS * 3) {
        stale.push(tabId);
      }
    }
    for (const id of stale) {
      this.knownTabTimestamps.delete(id);
    }
  }

  private persistTabTimestamps(): void {
    try {
      const data: Record<string, number> = {};
      for (const [tabId, ts] of this.knownTabTimestamps) {
        data[tabId] = ts;
      }
      localStorage.setItem(TAB_TIMESTAMP_KEY, JSON.stringify(data));
    } catch (e) {
      LOGGER.warn('CrossTabStateSync', 'Failed to persist tab timestamps', { error: (e as Error).message });
    }
  }

  private readonly STORAGE_PREFIX = 'provider-state-sync:';
  private readonly MAX_STORAGE_KEYS = 50;

  private pruneLocalStorage(): void {
    const keys: string[] = [];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_PREFIX)) {
        keys.push(key);
      }
    }
    if (keys.length > this.MAX_STORAGE_KEYS) {
      // STATE-L6: Deduplicate by removing oldest entries (lowest timestamp suffix)
      keys.sort((a, b) => {
        const ta = parseInt(a.split(':').pop() || '0', 10);
        const tb = parseInt(b.split(':').pop() || '0', 10);
        return ta - tb;
      });
      keys.slice(0, keys.length - this.MAX_STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    }
  }

  private broadcast(message: CrossTabStateMessage): void {
    if (this.channel) {
      this.channel.postMessage(message);
    } else {
      this.pruneLocalStorage();
      localStorage.setItem(
        `${this.STORAGE_PREFIX}${message.type}:${Date.now()}`,
        JSON.stringify(message),
      );
    }
  }

  updateCircuitBreaker(state: CircuitBreakerState): void {
    const key = `${state.provider}:${state.keyId}`;
    this.localCircuitBreakers.set(key, state);
    this.broadcast({
      type: 'circuit-breaker-update',
      timestamp: Date.now(),
      tabId: this.tabId,
      payload: state,
    });
  }

  updateRateLimit(state: RateLimitState): void {
    const key = `${state.provider}:${state.keyId}`;
    this.localRateLimits.set(key, state);
    this.broadcast({
      type: 'rate-limit-update',
      timestamp: Date.now(),
      tabId: this.tabId,
      payload: state,
    });
  }

  reportError(entry: ErrorEntry): void {
    this.localErrors.push(entry);
    if (this.localErrors.length > 100) {
      this.localErrors = this.localErrors.slice(-100);
    }
    this.broadcast({
      type: 'error-update',
      timestamp: Date.now(),
      tabId: this.tabId,
      payload: entry,
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
      payload: null,
    });
  }

  isPrimary(): boolean {
    const localTs = this.tabTimestamp;
    for (const [, ts] of this.knownTabTimestamps) {
      if (ts > localTs) {
        return false;
      }
    }
    return true;
  }

  destroy(): void {
    this.keyRemovedUnsub?.();
    this.channel?.close();
    this.channel = null;

    if (this.storageHandler) {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.listeners.clear();
    this.localCircuitBreakers.clear();
    this.localRateLimits.clear();
    this.localErrors = [];
    LOGGER.info('CrossTabStateSync', 'Destroyed', { tabId: this.tabId });
  }
}

export const crossTabStateSync = new CrossTabStateSync();

// H-18: Clean up event listeners on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    crossTabStateSync.destroy();
  });
}

