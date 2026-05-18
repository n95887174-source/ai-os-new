import { CONFIG } from '../config-registry';
import type { ApiKey } from '../../types/metrics-types';
import { EVENTS } from '../../events/event-names';

export interface KeyHealthDeps {
  eventBus: {
    emit: (event: string, data?: unknown) => void;
  };
  onStateChanged: (id: string, provider: string, newState: string, previousState: string) => void;
  addAlert: (keyId: string, alert: { type: string; severity: string; message: string }) => void;
  saveKeys: () => Promise<void>;
  notify: () => void;
  getKey: (id: string) => ApiKey | undefined;
  getActiveKeys: () => ApiKey[];
}

export class KeyHealth {
  private rateLimitHistory: Map<string, number[]> = new Map();
  private retryCounts: Map<string, number> = new Map();
  private backoffMap = new Map<string, number>();

  constructor(private deps: KeyHealthDeps) {}

  handleProviderError(key: ApiKey, error: string): void {
    key.status = 'error';
    key.stats.lastError = { message: error, timestamp: new Date().toISOString() };

    this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Error ${key.provider}: ${error.substring(0, 60)}...`,
      type: 'error',
    });
  }

  check429Spike(keyId: string): void {
    const now = Date.now();
    const window = now - CONFIG.keys.rateLimitSpikeWindowMs;
    const timestamps = (this.rateLimitHistory.get(keyId) || []).filter(t => t > window);
    timestamps.push(now);
    this.rateLimitHistory.set(keyId, timestamps);
    if (timestamps.length >= CONFIG.keys.rateLimitSpikeThreshold) {
      this.deps.addAlert(keyId, {
        type: 'quota_exceeded',
        severity: 'high',
        message: `429 spike: ${timestamps.length} rate limits in 60s`,
      });
    }
  }

  getBackoffMs(keyId: string): number {
    const current = this.backoffMap.get(keyId) || CONFIG.keys.initialBackoffMs;
    const next = Math.min(current * 2, CONFIG.keys.maxBackoffMs);
    this.backoffMap.set(keyId, next);
    return current;
  }

  resetRetryCount(keyId: string): void {
    this.retryCounts.delete(keyId);
  }

  transitionState(key: ApiKey, newState: string): void {
    if (!key.stats?.extended) return;
    const oldState = key.stats.extended.state;
    if (oldState === newState) return;
    key.stats.extended.state = newState as ApiKey['stats']['extended']['state'];
    this.deps.onStateChanged(key.id, key.provider, newState, oldState);
  }

  async checkHealth(keyId: string): Promise<{ id: string; provider: string; status: string; latency: number }> {
    const key = this.deps.getKey(keyId);
    if (!key) return { id: 'none', provider: 'none', status: 'error', latency: 0 };

    const start = performance.now();
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        signal: AbortSignal.timeout(CONFIG.keys.healthCheckTimeoutMs),
      });
      const latency = performance.now() - start;
      key.latency = latency;
      key.status = response.ok ? 'active' : 'error';
      if (response.ok && key.stats) {
        key.stats.avgLatency =
          (key.stats.avgLatency * (key.stats.successCount || 1) + latency) /
          (key.stats.successCount + 1);
      }
      await this.deps.saveKeys();
      this.deps.notify();
      return { id: key.id, provider: key.provider, status: key.status, latency };
    } catch {
      key.status = 'error';
      key.latency = performance.now() - start;
      await this.deps.saveKeys();
      this.deps.notify();
      return { id: key.id, provider: key.provider, status: 'error', latency: -1 };
    }
  }

  async checkAllHealth(): Promise<{ id: string; provider: string; status: string; latency: number }[]> {
    this.deps.eventBus.emit(EVENTS.KEY_HEALTH_STARTED);
    const activeKeys = this.deps.getActiveKeys();
    const results = await Promise.all(activeKeys.map(k => this.checkHealth(k.id)));
    this.deps.eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED);
    return results;
  }

  updateKeyStatus(key: ApiKey, status: ApiKey['status'], latency?: number): void {
    key.status = status;
    if (latency !== undefined) key.latency = latency;
  }

  updateAvailableModels(key: ApiKey, models: string[]): void {
    key.availableModels = models;
  }

  toggleKeyStatus(key: ApiKey): void {
    key.status = key.status === 'inactive' ? 'active' : 'inactive';
  }

  enableAllKeys(keys: ApiKey[]): void {
    keys.forEach(k => (k.status = 'active'));
  }

  disableAllKeys(keys: ApiKey[]): void {
    keys.forEach(k => (k.status = 'inactive'));
  }

  quarantineKey(key: ApiKey, source: string): boolean {
    key.status = 'quarantined' as ApiKey['status'];
    this.deps.addAlert(key.id, {
      type: 'security',
      severity: 'critical',
      message: `Key "${key.label}" quarantined — suspected compromise (source: ${source})`,
    });
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Key "${key.label}" quarantined due to suspected compromise (${source})`,
      type: 'error',
    });
    return true;
  }

  compromiseKey(key: ApiKey, source: string): void {
    const prevStatus = key.status;
    key.status = 'compromised' as ApiKey['status'];
    key.key = '[COMPROMISED]';
    key.isEncrypted = false;

    this.deps.addAlert(key.id, {
      type: 'compromise',
      severity: 'critical',
      message: `Key "${key.label}" marked COMPROMISED — revoked from rotation (source: ${source})`,
    });

    this.transitionState(key, 'DISABLED');

    this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Key "${key.label}" COMPROMISED via ${source} — revoked from all pools`,
      type: 'error',
    });

    this.deps.eventBus.emit(EVENTS.KEY_STATE_CHANGED, {
      id: key.id,
      provider: key.provider,
      state: 'compromised',
      previousState: prevStatus,
    });
  }
}
