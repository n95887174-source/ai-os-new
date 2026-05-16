import type { ApiKey, ProviderAlert, KeyNote } from '../../../types/metrics';
import { EVENTS } from '../../events/event-names';
import { KeyVault } from './key-vault';
import { KeyRegistry } from './key-registry';
import { KeyHealth } from './key-health';
import { KeyQuotas } from './key-quotas';
import { KeyAnalytics } from './key-analytics';
import { KeyFingerprints } from './key-fingerprints';
import { KeyAlerts } from './key-alerts';
import { KeyLifecycle } from './key-lifecycle';

export interface FreeTierLimit {
  requestsPerDay: number;
  tokensPerDay: number;
}

const DEFAULT_FREE_TIER_LIMITS: Record<string, FreeTierLimit> = {
  Groq: { requestsPerDay: 14400, tokensPerDay: 700000 },
  Gemini: { requestsPerDay: 1500, tokensPerDay: 1000000 },
  OpenRouter: { requestsPerDay: 0, tokensPerDay: 0 },
  Together: { requestsPerDay: 0, tokensPerDay: 0 },
  Cerebras: { requestsPerDay: 0, tokensPerDay: 0 },
  Cloudflare: { requestsPerDay: 0, tokensPerDay: 0 },
};

export const FREE_TIER_LIMITS = DEFAULT_FREE_TIER_LIMITS;
export type PoolStrategy = 'round-robin' | 'least-usage' | 'random';

const STORAGE_KEY = 'super_agents_api_keys';

export interface KeyServiceDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  securityService: {
    initialize: (password: string, userId?: string) => Promise<boolean>;
    encrypt: (text: string) => Promise<string | null>;
    decrypt: (base64: string) => Promise<string | null>;
    isLocked: () => boolean;
    lock: () => void;
  };
  pricingService: {
    calculateCost: (model: string, inputTokens: number, outputTokens: number) => number;
  };
  database: {
    apiKeys: {
      toArray: () => Promise<ApiKey[]>;
      bulkAdd: (keys: ApiKey[]) => Promise<void>;
      bulkPut: (keys: ApiKey[]) => Promise<void>;
      where: (field: string) => { equals: (val: string) => { first: () => Promise<ApiKey | undefined> } };
    };
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
    db: {
      keyValue: {
        put: (obj: { id: string; value: unknown; createdAt: number }) => Promise<void>;
      };
    };
  };
}

export class KeyService {
  private vault: KeyVault;
  private registry: KeyRegistry;
  private health: KeyHealth;
  private quotas: KeyQuotas;
  private analytics: KeyAnalytics;
  private fingerprints: KeyFingerprints;
  private alerts: KeyAlerts;
  private lifecycle: KeyLifecycle;

  private freeTierLimits: Record<string, FreeTierLimit> = { ...DEFAULT_FREE_TIER_LIMITS };
  private poolStrategies: Record<string, PoolStrategy> = {};
  private poolIndex: Record<string, number> = {};
  private unsubs: Array<() => void> = [];
  private deps: KeyServiceDeps;

  constructor(deps: KeyServiceDeps) {
    this.deps = deps;

    this.vault = new KeyVault({ securityService: deps.securityService });

    this.registry = new KeyRegistry({
      eventBus: deps.eventBus,
      database: deps.database,
      vault: this.vault,
      freeTierLimits: this.freeTierLimits,
    });

    this.alerts = new KeyAlerts({ eventBus: deps.eventBus });

    this.quotas = new KeyQuotas(
      {
        eventBus: deps.eventBus,
        onQuotaExceeded: (id, provider, quotaType) => {
          deps.eventBus.emit(EVENTS.KEY_QUOTA_EXCEEDED, { id, provider, quotaType });
        },
        onStateTransition: (id, newState) => {
          const key = this.registry.getKey(id);
          if (key) this.health.transitionState(key, newState);
        },
        addAlert: (keyId, alert) => {
          const key = this.registry.getKey(keyId);
          if (key) this.alerts.addAlert(key, alert);
        },
      },
      this.freeTierLimits
    );

    this.health = new KeyHealth({
      eventBus: deps.eventBus,
      onStateChanged: (id, provider, newState, previousState) => {
        deps.eventBus.emit(EVENTS.KEY_STATE_CHANGED, { id, provider, state: newState, previousState });
      },
      addAlert: (keyId, alert) => {
        const key = this.registry.getKey(keyId);
        if (key) this.alerts.addAlert(key, alert);
      },
      saveKeys: () => this.registry.saveKeys(),
      notify: () => this.notify(),
      getKey: (id) => this.registry.getKey(id),
      getActiveKeys: () => this.registry.getActiveKeys(),
    });

    this.analytics = new KeyAnalytics({
      pricingService: deps.pricingService,
      eventBus: deps.eventBus,
      onLatencyBurst: (id, provider, latency) => {
        deps.eventBus.emit(EVENTS.KEY_LATENCY_BURST, { id, provider, latency });
      },
      onStateChanged: (id, provider, newState, previousState) => {
        deps.eventBus.emit(EVENTS.KEY_STATE_CHANGED, { id, provider, state: newState, previousState });
      },
      onReputationThresholdCrossed: (id, provider, score) => {
        deps.eventBus.emit('key:reputation-threshold-crossed', { id, provider, score });
      },
      ensureExtendedStats: (key) => this.ensureExtendedStats(key),
    });

    this.fingerprints = new KeyFingerprints();
    this.lifecycle = new KeyLifecycle({
      getKey: (id) => this.registry.getKey(id),
      saveKeys: () => this.registry.saveKeys(),
      notify: () => this.notify(),
    });
  }

  private ensureExtendedStats(key: ApiKey): void {
    if (!key.stats) key.stats = this.registry.initStats();
    if (!key.stats.extended) key.stats.extended = this.registry.initExtendedStats();
    const ext = key.stats.extended;
    if (!ext.usageToday) ext.usageToday = { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 };
    if (!ext.usageMonthly) ext.usageMonthly = { tokens: 0, requests: 0, estimatedCost: 0 };
    if (!ext.latencyBreakdown) ext.latencyBreakdown = { ttft: 0, total: 0, tokensPerSec: 0 };
    if (!ext.errorBreakdown) ext.errorBreakdown = { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0, provider: 0 };
    if (!ext.fourSignals) ext.fourSignals = { latency: 0, throughput: 0, errorRate: 0, saturation: 0 };
    if (!ext.rules) ext.rules = { maxConcurrentRequests: 5, retryPolicy: { maxAttempts: 3, backoffMs: 1000 }, timeoutMs: 30000, quota: { tokensPerDay: 1000000, requestsPerDay: 1000 }, slaThresholds: { latencyP95: 2000, errorFloor: 0.05 } };
  }

  async init() {
    this.notify();
    await this.loadConfig();
    await this.registry.loadKeys();

    this.registry.setupListeners({
      addKey: (data) => this.addKey(data),
      removeKey: (id) => this.removeKey(id),
      compromiseByFingerprint: (fingerprint, source) => {
        const key = this.registry.getKeys().find(k =>
          k.id === fingerprint ||
          k.label.toLowerCase().includes(fingerprint.toLowerCase()) ||
          k.provider.toLowerCase() === fingerprint.toLowerCase()
        );
        if (key) this.compromiseKey(key.id, source);
      },
      updateMetricsFromResponse: (res) => {
        const r = res as { keyId?: string; provider: string; status: string; error?: string; latency?: number; ttft?: number; tokens?: number | { total?: number }; tps?: number };
        const key = r.keyId
          ? this.registry.getKey(r.keyId)
          : this.registry.getKeys().find(k => k.provider.toLowerCase() === r.provider.toLowerCase());
        if (!key) return;

        if (r.status === 'error' && r.error) {
          const isRateLimit = r.error.includes('429') || r.error.toLowerCase().includes('quota') || r.error.toLowerCase().includes('rate limit');
          if (isRateLimit) {
            this.alerts.addAlert(key, {
              type: 'rate_limit',
              severity: 'medium',
              message: `Provider ${key.provider} quota exhausted (429)`,
            });
            this.health.check429Spike(key.id);
            this.health.transitionState(key, 'DEGRADED');
            key.status = 'inactive';
            this.deps.eventBus.emit(EVENTS.KEY_QUOTA_EXCEEDED, { id: key.id, provider: key.provider, quotaType: 'requests' });
            const backoffMs = this.health.getBackoffMs(key.id);
            this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
              message: `${key.provider} hit 429 — retrying in ${Math.round(backoffMs / 1000)}s (exponential backoff)`,
              type: 'warning',
            });
            setTimeout(() => {
              this.deps.eventBus.emit(EVENTS.CHECK_HEALTH, key.id);
            }, backoffMs);
          }
          this.health.handleProviderError(key, r.error);
        }

        this.analytics.updateMetricsFromResponse(key, r);
        this.registry.saveKeys();
        this.notify();
      },
    });
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.registry.destroy();
  }

  // ── Config Persistence ─────────────────────────────────────────────

  private async loadConfig() {
    try {
      const saved = await this.deps.database.getKv<Record<string, FreeTierLimit>>('global_free_tier_limits');
      if (saved) this.freeTierLimits = saved;
      const savedStrategies = await this.deps.database.getKv<Record<string, PoolStrategy>>('pool_strategies');
      if (savedStrategies) this.poolStrategies = savedStrategies;
    } catch (e) {
      console.warn('[KeyService] Failed to load global limits', e);
    }
  }

  private async saveConfig() {
    try {
      await this.deps.database.setKv('global_free_tier_limits', this.freeTierLimits);
      await this.deps.database.setKv('pool_strategies', this.poolStrategies);
    } catch (e) {
      console.error('[KeyService] Failed to save global limits', e);
    }
  }

  // ── Notification ───────────────────────────────────────────────────

  private notify() {
    this.deps.eventBus.emit(EVENTS.KEY_UPDATED, [...this.registry.getKeys()]);
  }

  // ── Vault ──────────────────────────────────────────────────────────

  async unlock(password: string): Promise<boolean> {
    const ok = await this.vault.unlock(password);
    if (!ok) return false;
    const decrypted = await this.vault.decryptAllKeys(this.registry.getKeys());
    this.registry.updateKey('', {}); // flush — rebuild key array
    const keys = this.registry.getKeys();
    keys.length = 0;
    keys.push(...decrypted);
    this.notify();
    return true;
  }

  async unlockVault(password: string): Promise<boolean> {
    return this.unlock(password);
  }

  // ── Registry ───────────────────────────────────────────────────────

  getKeys() { return this.registry.getKeys(); }
  getKey(id: string) { return this.registry.getKey(id); }
  getKeysByProvider(provider: string) { return this.registry.getKeysByProvider(provider); }
  getActiveKeys() { return this.registry.getActiveKeys(); }
  getPoolKeys(provider: string) { return this.registry.getPoolKeys(provider); }
  getDefaultKeys() { return this.registry.getDefaultKeys(); }
  getStats() { return this.registry.getStats(); }
  getTotalTokens() { return this.registry.getTotalTokens(); }
  getTotalRequests() { return this.registry.getTotalRequests(); }
  getUniqueProviders() { return this.registry.getUniqueProviders(); }

  async addKey(data: Omit<ApiKey, 'id' | 'stats'>) {
    const newKey = await this.registry.addKey(data);
    if (!newKey) return;
    this.quotas.applyFreeTierQuota(newKey);
    await this.registry.saveKeys();
    this.notify();
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Key for ${data.provider} added`, type: 'success' });
    setTimeout(() => {
      this.deps.eventBus.emit(EVENTS.CHECK_HEALTH, newKey.id);
    }, 1000);
  }

  async removeKey(id: string) {
    await this.registry.removeKey(id);
    await this.registry.saveKeys();
    this.notify();
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Key removed', type: 'info' });
  }

  updateKey(id: string, data: Partial<ApiKey>) {
    this.registry.updateKey(id, data);
    this.registry.saveKeys();
    this.notify();
  }

  async importKeys(jsonData: string): Promise<number> {
    const count = await this.registry.importKeys(jsonData);
    await this.registry.saveKeys();
    this.notify();
    return count;
  }

  async exportKeys(): Promise<string> {
    return this.registry.exportKeys((plaintext) => this.vault.encryptKey(plaintext));
  }

  async addNote(keyId: string, text: string, type: KeyNote['type'] = 'admin', author?: string) {
    return this.registry.addNote(keyId, text, type, author);
  }

  async removeNote(keyId: string, noteId: string) {
    await this.registry.removeNote(keyId, noteId);
    this.notify();
  }

  async loadNotes(keyId: string) {
    try {
      const saved = await this.deps.database.apiKeys.where('id').equals(keyId).first();
      if (saved && (saved as unknown as { notes?: KeyNote[] }).notes) {
        const key = this.registry.getKey(keyId);
        if (key) key.notes = (saved as unknown as { notes?: KeyNote[] }).notes;
      }
    } catch (e) {
      console.warn(`[KeyService] Failed to load notes for key ${keyId}:`, e);
    }
    this.notify();
  }

  async refreshModels(keyId: string) {
    const key = this.registry.getKey(keyId);
    if (!key) return;
    try {
      this.health.updateKeyStatus(key, 'checking');
      const saved = await this.deps.database.apiKeys.where('id').equals(keyId).first();
      if (saved?.availableModels) {
        this.health.updateAvailableModels(key, saved.availableModels);
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Found ${key.availableModels?.length ?? 0} models for ${key.provider}`, type: 'success' });
      } else {
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `No models cached for ${key.provider}`, type: 'error' });
      }
    } catch (e) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Failed to refresh models: ${e instanceof Error ? e.message : String(e)}`, type: 'error' });
    }
  }

  // ── Health ─────────────────────────────────────────────────────────

  updateKeyStatus(id: string, status: ApiKey['status'], latency?: number) {
    const key = this.registry.getKey(id);
    if (key) {
      this.health.updateKeyStatus(key, status, latency);
      this.registry.saveKeys();
      this.notify();
    }
  }

  updateAvailableModels(id: string, models: string[]) {
    const key = this.registry.getKey(id);
    if (key) {
      this.health.updateAvailableModels(key, models);
      this.registry.saveKeys();
      this.notify();
    }
  }

  async checkHealth(keyId?: string) {
    if (keyId) return this.health.checkHealth(keyId);
    const first = this.registry.getKeys()[0];
    if (first) return this.health.checkHealth(first.id);
    return { id: 'none', provider: 'none', status: 'error', latency: 0 };
  }

  async checkAllHealth() {
    return this.health.checkAllHealth();
  }

  async toggleKeyStatus(id: string) {
    const key = this.registry.getKey(id);
    if (key) {
      this.health.toggleKeyStatus(key);
      await this.registry.saveKeys();
      this.notify();
    }
  }

  async enableAllKeys() {
    this.health.enableAllKeys(this.registry.getKeys());
    await this.registry.saveKeys();
    this.notify();
  }

  async disableAllKeys() {
    this.health.disableAllKeys(this.registry.getKeys());
    await this.registry.saveKeys();
    this.notify();
  }

  quarantineKey(idOrFingerprint: string, source: string = 'manual'): boolean {
    const key = this.registry.getKey(idOrFingerprint);
    if (key) {
      this.health.quarantineKey(key, source);
      this.registry.saveKeys();
      this.notify();
      return true;
    }
    return false;
  }

  compromiseKey(id: string, source: string = 'webhook'): boolean {
    const key = this.registry.getKey(id);
    if (!key) return false;
    this.health.compromiseKey(key, source);
    this.registry.saveKeys();
    this.notify();

    import('../../kernel').then(({ SystemKernel }) => {
      try {
        const kernel = (window as any).__kernel;
        if (kernel && kernel.markProviderOffline) {
          kernel.markProviderOffline(key.provider, `Key compromised: ${key.label}`);
        }
      } catch {}
    });

    return true;
  }

  // ── Quotas ─────────────────────────────────────────────────────────

  getFreeTierLimits() { return this.quotas.getFreeTierLimits(); }

  setFreeTierLimit(provider: string, limit: FreeTierLimit) {
    this.quotas.setFreeTierLimit(provider, limit);
    this.saveConfig();
  }

  canUseKey(id: string): { can: boolean; reason?: string } {
    const key = this.registry.getKey(id);
    if (!key) return { can: false, reason: 'Key not found' };
    return this.quotas.canUseKey(key);
  }

  // ── Pool Selection ─────────────────────────────────────────────────

  getPoolStrategy(provider: string): PoolStrategy {
    return this.poolStrategies[provider.toLowerCase()] || 'round-robin';
  }

  setPoolStrategy(provider: string, strategy: PoolStrategy) {
    this.poolStrategies[provider.toLowerCase()] = strategy;
    this.saveConfig();
    this.notify();
  }

  selectFromPool(provider: string, strategy?: PoolStrategy): ApiKey | null {
    strategy = strategy || this.getPoolStrategy(provider);
    const pool = this.registry
      .getPoolKeys(provider)
      .filter(k => this.quotas.canUseKey(k).can);
    if (pool.length === 0) return null;

    switch (strategy) {
      case 'round-robin': {
        const key = provider.toLowerCase();
        const startIdx = (this.poolIndex[key] ?? 0) % pool.length;
        for (let i = 0; i < pool.length; i++) {
          const idx = (startIdx + i) % pool.length;
          if (!this.quotas.isKeyQuotaExhausted(pool[idx])) {
            this.poolIndex[key] = idx + 1;
            return pool[idx];
          }
        }
        this.poolIndex[key] = startIdx + 1;
        return pool[startIdx];
      }
      case 'least-usage':
        return pool.sort((a, b) => (a.stats?.successCount || 0) - (b.stats?.successCount || 0))[0];
      case 'random':
        return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  getPoolStatus(provider: string): { total: number; active: number; used: number; limit: number } {
    const pool = this.registry.getPoolKeys(provider);
    const limit = this.freeTierLimits[provider]?.requestsPerDay || 0;
    const used = pool.reduce((sum, k) => sum + (k.stats?.extended?.usageToday?.requests || 0), 0);
    return {
      total: this.registry.getKeysByProvider(provider).length,
      active: pool.length,
      used,
      limit,
    };
  }

  getPoolKeyDistribution(provider: string): Array<{ id: string; label: string; used: number; limit: number; pct: number; status: string }> {
    return this.registry
      .getKeysByProvider(provider)
      .map(k => {
        const used = k.stats?.extended?.usageToday?.requests || 0;
        const limit = k.stats?.extended?.rules?.quota?.requestsPerDay || 0;
        return {
          id: k.id,
          label: k.label,
          used,
          limit,
          pct: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
          status: k.status,
        };
      });
  }

  // ── Analytics ──────────────────────────────────────────────────────

  recordUsage(keyIdOrProvider: string, latency: number, tokens: number = 0, model?: string, extra?: Record<string, unknown>) {
    const key = this.registry
      .getKeys()
      .find(
        k =>
          (k.id === keyIdOrProvider ||
            k.provider.toLowerCase() === keyIdOrProvider.toLowerCase()) &&
          k.status === 'active'
      );
    if (!key) return;
    this.ensureExtendedStats(key);
    this.analytics.recordUsage(key, latency, tokens, model, extra);
    this.quotas.checkQuotas(key);
    this.registry.saveKeys();
    this.notify();
  }

  incrementConcurrency(id: string) {
    const key = this.registry.getKey(id);
    if (key) {
      this.analytics.incrementConcurrency(key);
      this.notify();
    }
  }

  decrementConcurrency(id: string) {
    const key = this.registry.getKey(id);
    if (key) {
      this.analytics.decrementConcurrency(key);
      this.notify();
    }
  }

  async recalculateAllReputations() {
    this.analytics.recalculateAllReputations(this.registry.getKeys());
    await this.registry.saveKeys();
    this.notify();
  }

  async resetKeyStats(keyId: string) {
    const key = this.registry.getKey(keyId);
    if (!key) return;
    this.analytics.resetKeyStats(key);
    await this.registry.saveKeys();
    this.notify();
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Statistics reset for ${key.label}`, type: 'info' });
  }

  // ── Alerts ─────────────────────────────────────────────────────────

  getAlerts(): ProviderAlert[] {
    return this.alerts.getAlerts(this.registry.getKeys());
  }

  resolveAlert(alertId: string) {
    this.alerts.resolveAlert(this.registry.getKeys(), alertId);
    this.registry.saveKeys();
  }

  getAlertSummary() {
    return this.alerts.getAlertSummary(this.registry.getKeys());
  }

  // ── Fingerprints ───────────────────────────────────────────────────

  async fingerprintKey(apiKey: string): Promise<string> {
    return this.fingerprints.fingerprintKey(apiKey);
  }

  async findDuplicateFingerprints(keys: string[]): Promise<Map<string, string[]>> {
    return this.fingerprints.findDuplicateFingerprints(this.registry.getKeys(), keys);
  }

  detectProvider(apiKey: string): string | null {
    return this.fingerprints.detectProvider(apiKey);
  }

  async verifyKey(provider: string, apiKey: string): Promise<boolean> {
    return this.fingerprints.verifyKey(provider, apiKey);
  }

  // ── Lifecycle / SLA / Rotation ─────────────────────────────────────

  setKeyTTL(id: string, ttlHours: number, autoRotate = false) {
    this.lifecycle.setKeyTTL(id, ttlHours, autoRotate);
  }

  clearKeyTTL(id: string) {
    this.lifecycle.clearKeyTTL(id);
  }

  async requestKeyRotation(id: string): Promise<boolean> {
    return this.lifecycle.requestKeyRotation(id);
  }

  async setGlobalSLA(mode: string) {
    await this.lifecycle.setGlobalSLA(
      this.registry.getKeys(),
      mode,
      () => this.registry.saveKeys(),
      () => this.notify()
    );
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Global SLA set to ${mode}`, type: 'success' });
  }

  async setSLA(id: string, mode: string) {
    const key = this.registry.getKey(id);
    if (key) {
      this.lifecycle.applySLA(key, mode);
      await this.registry.saveKeys();
      this.notify();
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `${key.provider} SLA set to ${mode}`, type: 'info' });
    }
  }

  // ── Misc ───────────────────────────────────────────────────────────

  transitionState(id: string, newState: string) {
    const key = this.registry.getKey(id);
    if (key) {
      this.health.transitionState(key, newState);
      this.notify();
    }
  }

  resetStats(keyId: string) {
    return this.resetKeyStats(keyId);
  }

  async setLatencyThreshold(threshold: number) {
    await this.deps.database.db.keyValue.put({
      id: 'latency_threshold',
      value: threshold,
      createdAt: Date.now(),
    });
    this.deps.eventBus.emit('settings:latency_threshold', { threshold });
  }

  clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    this.deps.eventBus.emit('system:clear_data', undefined);
  }

  handleProviderError(keyId: string, error: string) {
    const key = this.registry.getKey(keyId);
    if (key) {
      this.health.handleProviderError(key, error);
    }
  }
}
