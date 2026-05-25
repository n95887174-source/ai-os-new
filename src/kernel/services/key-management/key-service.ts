import type { ApiKey, KeyHistoryEntry, ProviderAlert, KeyNote } from '../../types/metrics-types';
import { EVENTS } from '../../events/event-names';
import { KeyVault } from './key-vault';
import { KeyRegistry } from './key-registry';
import { KeyHealth } from './key-health';
import { KeyQuotas } from './key-quotas';
import { KeyAnalytics } from './key-analytics';
import { KeyFingerprints } from './key-fingerprints';
import { KeyAlerts } from './key-alerts';
import { KeyLifecycle } from './key-lifecycle';
import { KeyPoolSelector } from './key-pool-selector';
import type { IAdapterRegistry } from '../../contracts/provider-adapter';
import type { IKeyVaultService } from '../../contracts/key-vault';
import type { IHealthCheckService } from '../../contracts/health-check';
import type { IKeyAnalyticsService } from '../../contracts/key-analytics';
import type { PoolStrategy } from '../../contracts/pool-selector';
import type { KeyStore } from '../../contracts/storage/key-store';
import { CONFIG } from '../config-registry';

export interface FreeTierLimit {
  requestsPerDay: number;
  tokensPerDay: number;
}

const DEFAULT_FREE_TIER_LIMITS: Record<string, FreeTierLimit> = {
  ...CONFIG.keys.freeTierLimits,
  OpenRouter: { requestsPerDay: 0, tokensPerDay: 0 },
  Together: { requestsPerDay: 0, tokensPerDay: 0 },
  Cerebras: { requestsPerDay: 0, tokensPerDay: 0 },
  Cloudflare: { requestsPerDay: 0, tokensPerDay: 0 },
};

export const FREE_TIER_LIMITS = DEFAULT_FREE_TIER_LIMITS;

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
  keyStore: KeyStore;
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
    db: {
      keyValue: {
        put: (obj: { id: string; value: unknown; createdAt: number }) => Promise<void>;
      };
    };
  };
  advisorService?: {
    getSuggestions(): Array<{ targetNodeId?: string }>;
  };
  providerAdapterRegistry?: IAdapterRegistry;
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
  private poolSelector: KeyPoolSelector;

  readonly vaultService: IKeyVaultService;
  readonly healthCheckService: IHealthCheckService;
  readonly analyticsService: IKeyAnalyticsService;

  private freeTierLimits: Record<string, FreeTierLimit> = { ...DEFAULT_FREE_TIER_LIMITS };
  private unsubs: Array<() => void> = [];
  private deps: KeyServiceDeps;
  private _globalSLAMode: string = 'BALANCED';
  private _latencyThreshold: number = 1500;

  get globalSLAMode(): string { return this._globalSLAMode; }
  get latencyThreshold(): number { return this._latencyThreshold; }

  getRoutingPolicy(): { globalSLAMode: string; latencyThreshold: number } {
    return { globalSLAMode: this._globalSLAMode, latencyThreshold: this._latencyThreshold };
  }

  constructor(deps: KeyServiceDeps) {
    this.deps = deps;

    this.vault = new KeyVault({ securityService: deps.securityService });

    this.registry = new KeyRegistry({
      eventBus: deps.eventBus,
      keyStore: deps.keyStore,
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
          this.registry.pushHistory(id, 'quota_exceeded', `${quotaType} quota exceeded`);
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
        deps.eventBus.emit(EVENTS.KEY_REPUTATION_DOWN, { id, provider, score });
      },
      ensureExtendedStats: (key) => this.ensureExtendedStats(key),
    });

    this.fingerprints = new KeyFingerprints();
    this.lifecycle = new KeyLifecycle({
      getKey: (id) => this.registry.getKey(id),
      saveKeys: () => this.registry.saveKeys(),
      notify: () => this.notify(),
    });

    this.poolSelector = new KeyPoolSelector({
      eventBus: deps.eventBus,
      getPoolKeys: (provider) => this.registry.getPoolKeys(provider),
      getKeysByProvider: (provider) => this.registry.getKeysByProvider(provider),
      canUseKey: (key) => this.quotas.canUseKey(key),
      isKeyQuotaExhausted: (key) => this.quotas.isKeyQuotaExhausted(key),
      saveConfig: () => this.saveConfig(),
      freeTierLimits: this.freeTierLimits,
    });

    this.vaultService = this.vault;
    this.healthCheckService = this.health;
    this.analyticsService = this.analytics;
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
    if (!ext.rules) ext.rules = structuredClone(CONFIG.keys.defaultRules);
  }

  async init() {
    await this.loadConfig();
    await this.registry.loadKeys();
    this.notify();

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
      if (savedStrategies) this.poolSelector.setStrategies(savedStrategies);
      const savedSLA = await this.deps.database.getKv<string>('global_sla_mode');
      if (savedSLA) this._globalSLAMode = savedSLA;
      const savedLat = await this.deps.database.getKv<number>('latency_threshold');
      if (savedLat) this._latencyThreshold = savedLat;
    } catch (e) {
      console.warn('[KeyService] Failed to load global limits', e);
    }
  }

  private async saveConfig() {
    try {
      await this.deps.database.setKv('global_free_tier_limits', this.freeTierLimits);
      await this.deps.database.setKv('pool_strategies', this.poolSelector.getStrategies());
      await this.deps.database.setKv('global_sla_mode', this._globalSLAMode);
      await this.deps.database.setKv('latency_threshold', this._latencyThreshold);
    } catch (e) {
      console.error('[KeyService] Failed to save global limits', e);
    }
  }

  // ── Notification ───────────────────────────────────────────────────

  private notify() {
    const keys = [...this.registry.getKeys()];
    this.deps.eventBus.emit(EVENTS.KEY_UPDATED, keys);
    this.deps.eventBus.emit(EVENTS.KEYS_LOADED, keys);
  }

  // ── Vault ──────────────────────────────────────────────────────────

  async unlock(password: string): Promise<boolean> {
    const ok = await this.vault.unlock(password);
    if (!ok) return false;
    const decrypted = await this.vault.decryptAllKeys(this.registry.getKeys());
    this.registry.replaceKeys(decrypted);
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

  pushHistory(keyId: string, action: KeyHistoryEntry['action'], detail: string): void {
    this.registry.pushHistory(keyId, action, detail);
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
      const saved = await this.deps.keyStore.where('id', keyId);
      if (saved && (saved as unknown as { notes?: KeyNote[] }).notes) {
        const key = this.registry.getKey(keyId);
        if (key) key.notes = (saved as unknown as { notes?: KeyNote[] }).notes;
      }
    } catch (e) {
      console.warn(`[KeyService] Failed to load notes for key ${keyId}:`, e);
    }
    this.notify();
  }

  async refreshModels(id: string) {
    const key = this.registry.getKey(id);
    if (!key || !key.key) return;
    try {
      this.health.updateKeyStatus(key, 'checking');
      const registry = this.deps.providerAdapterRegistry;
      if (!registry) return;
      const adapter = registry.getAdapter(key.provider);
      if (adapter) {
        const models = await adapter.getAvailableModels(key.key);
        if (Array.isArray(models) && models.length > 0) {
          this.health.updateAvailableModels(key, models);
          this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Found ${models.length} models for ${key.provider}`, type: 'success' });
        }
      } else {
        const defaults: Record<string, string[]> = {
          'OpenRouter': ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-405b'],
          'Gemini': ['gemini-1.5-pro', 'gemini-1.5-flash'],
          'Groq': ['llama3-70b-8192', 'mixtral-8x7b-32768'],
          'NVIDIA': ['nvidia/llama-3.1-405b-instruct'],
          'Cerebras': ['cerebras-gpt-3.5'],
          'Cloudflare': ['@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
          'DeepSeek': ['deepseek-chat', 'deepseek-coder'],
          'Cohere': ['command-r-plus', 'command-r'],
          'Blackboxapi': ['blackboxai'],
          'Scaleway': ['llama-3.3-70b-instruct', 'mixtral-8x7b-instruct'],
          'Cometapi': ['gpt-4o', 'claude-3-5-sonnet'],
          'GitHub': ['gpt-4o', 'meta-llama-3.1-405b-instruct']
        };
        const models = defaults[key.provider] || [];
        this.health.updateAvailableModels(key, models);
      }
      this.health.updateKeyStatus(key, 'active');
    } catch (e) {
      this.health.updateKeyStatus(key, 'error');
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Failed to refresh models: ${e instanceof Error ? e.message : String(e)}`, type: 'error' });
    }
  }

  // ── Health ─────────────────────────────────────────────────────────

  updateKeyStatus(id: string, status: ApiKey['status'], latency?: number) {
    const key = this.registry.getKey(id);
    if (key) {
      const prev = key.status;
      this.health.updateKeyStatus(key, status, latency);
      this.registry.pushHistory(id, 'status_changed', `${prev} → ${status}`);
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
      const prev = key.status;
      this.health.toggleKeyStatus(key);
      this.registry.pushHistory(id, 'status_changed', `${prev} → ${key.status}`);
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

    this.deps.eventBus.emit('key:compromised', { id: key.id, provider: key.provider, source });

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

  isKeyInBackoff(keyId: string): { backoff: boolean; remainingMs: number } {
    const remaining = this.health.getBackoffRemaining(keyId);
    if (remaining === null || remaining <= 0) return { backoff: false, remainingMs: 0 };
    return { backoff: true, remainingMs: remaining };
  }

  isProviderCircuitOpen(provider: string): boolean {
    return this.deps.providerAdapterRegistry?.getProviderRuntimeStatus(provider).circuitOpen ?? false;
  }

  isProviderRateLimited(provider: string): boolean {
    return this.deps.providerAdapterRegistry?.getProviderRuntimeStatus(provider).rateLimited ?? false;
  }

  // ── Pool Selection ─────────────────────────────────────────────────

  getPoolStrategy(provider: string): PoolStrategy {
    return this.poolSelector.getPoolStrategy(provider);
  }

  setPoolStrategy(provider: string, strategy: PoolStrategy) {
    this.poolSelector.setPoolStrategy(provider, strategy);
  }

  selectFromPool(provider: string, strategy?: PoolStrategy): ApiKey | null {
    return this.poolSelector.selectFromPool(provider, strategy);
  }

  getPoolStatus(provider: string): { total: number; active: number; used: number; limit: number } {
    return this.poolSelector.getPoolStatus(provider);
  }

  getPoolKeyDistribution(provider: string): Array<{ id: string; label: string; used: number; limit: number; pct: number; status: string }> {
    return this.poolSelector.getPoolKeyDistribution(provider);
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
    if (extra?.failed) {
      this.registry.pushHistory(key.id, 'error', `${extra.error || 'Unknown error'} (${model || 'auto'})`);
    }
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

  extractAccountId(provider: string, apiKey: string): string {
    return this.fingerprints.extractAccountId(provider, apiKey);
  }

  extractAccountLabel(provider: string, apiKey: string): string {
    return this.fingerprints.extractAccountLabel(provider, apiKey);
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
    const keys = this.registry.getKeys();
    keys.forEach(k => this.lifecycle.applySLA(k, mode));
    this._globalSLAMode = mode;
    await this.saveConfig();
    await this.registry.saveKeys();
    this.notify();
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
    this._latencyThreshold = threshold;
    await this.saveConfig();
    await this.deps.database.db.keyValue.put({
      id: 'latency_threshold',
      value: threshold,
      createdAt: Date.now(),
    });
    this.deps.eventBus.emit('settings:latency-threshold', { threshold });
  }

  clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    this.deps.eventBus.emit(EVENTS.CLEAR_DATA, undefined);
  }

  handleProviderError(keyId: string, error: string) {
    const key = this.registry.getKey(keyId);
    if (key) {
      this.health.handleProviderError(key, error);
    }
  }

  // ── Extended: Introspection, Benchmark, Advisor ──────────────────────

  async getProviderIntrospection(provider: string, apiKey: string): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = { provider };
    try {
      const p = provider.toLowerCase();
      if (p === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(CONFIG.services.keyService.introspectionTimeoutMs),
        });
        if (res.ok) {
          const data = await res.json();
          result['credits'] = data.data?.credits ?? 'unknown';
          result['usage'] = data.data?.usage ?? 'unknown';
          result['limit'] = data.data?.limit ?? 'unknown';
          result['key_label'] = data.data?.key ?? 'unknown';
        } else {
          result['error'] = `HTTP ${res.status}: ${res.statusText}`;
        }
      } else if (p === 'openai') {
        const res = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(CONFIG.services.keyService.introspectionTimeoutMs),
        });
        if (res.ok) {
          const data = await res.json();
          result['total_granted'] = data.total_granted ?? 'unknown';
          result['total_used'] = data.total_used ?? 'unknown';
          result['total_available'] = data.total_available ?? 'unknown';
        } else {
          result['error'] = `HTTP ${res.status}: ${res.statusText}`;
        }
      } else if (p === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(CONFIG.services.keyService.introspectionTimeoutMs),
        });
        if (res.ok) {
          const remaining = res.headers.get('x-ratelimit-remaining-requests');
          const limit = res.headers.get('x-ratelimit-limit-requests');
          const remainingTokens = res.headers.get('x-ratelimit-remaining-tokens');
          const limitTokens = res.headers.get('x-ratelimit-limit-tokens');
          const data = await res.json();
          result['available_models'] = (data.data as Array<{id: string}> | undefined)?.length ?? 0;
          result['rate_limit_remaining'] = remaining ?? 'unknown';
          result['rate_limit_limit'] = limit ?? 'unknown';
          if (remainingTokens) result['tokens_remaining'] = remainingTokens;
          if (limitTokens) result['tokens_limit'] = limitTokens;
        } else {
          result['error'] = `HTTP ${res.status}: ${res.statusText}`;
        }
      } else if (p === 'gemini') {
        const res = await fetch('https://generativelanguage.googleapis.com/v1/models', {
          headers: { 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(CONFIG.services.keyService.introspectionTimeoutMs),
        });
        if (res.ok) {
          const data = await res.json();
          const models = (data.models as Array<{name: string; supportedGenerationMethods: string[]}> | undefined) ?? [];
          result['available_models'] = models.length;
          result['has_generation'] = models.some(m => m.supportedGenerationMethods?.includes('generateContent'));
        } else {
          result['note'] = 'Gemini tier info not available via API; check Google AI Studio dashboard.';
          result['models_check'] = `HTTP ${res.status}`;
        }
      } else {
        result['note'] = `No introspection endpoint for ${provider}.`;
      }
    } catch (e) {
      result['error'] = e instanceof Error ? e.message : 'Unknown request failed';
    }
    return result;
  }

  async runBenchmark(id: string) {
    const key = this.registry.getKey(id);
    if (!key || key.status !== 'active') return;
    const testPrompts = [
      "Say 'Hello World' in exactly 2 words.",
      "Write a JSON object with 5 keys describing a spaceship.",
      "Explain quantum entanglement to a 5-year old in 3 sentences.",
    ];
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Starting benchmark for ${key.provider}...`, type: 'info' });
    for (const prompt of testPrompts) {
      const startTime = Date.now();
      try {
        const adapter = this.deps.providerAdapterRegistry?.getAdapter(key.provider);
        const model = key.availableModels?.[0] || 'default';
        const res = await adapter!.sendMessage([{ role: 'user', content: prompt }], model, key.key);
        const latency = Date.now() - startTime;
        this.recordUsage(key.id, latency, Math.ceil(res.content.length / CONFIG.traces.tokenEstimateDivisor), model, {
          task: 'benchmark',
          fullContent: res.content,
          ttft: Math.min(latency, Math.max(50, latency * 0.3)),
        });
      } catch (e) {
        this.deps.eventBus.emit('system:notification', { message: 'Benchmark step failed', type: 'error' });
      }
    }
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Benchmark for ${key.provider} completed`, type: 'success' });
  }

  async runAdvisor(id: string) {
    const key = this.registry.getKey(id);
    if (!key || !this.deps.advisorService) return;
    this.getKeys();
    const suggestions = this.deps.advisorService.getSuggestions().filter((s: { targetNodeId?: string }) => s.targetNodeId === id);
    if (suggestions.length > 0) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Advisor: ${suggestions.length} suggestion(s) for ${key.label}`, type: 'info' });
    } else {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: `Advisor: No suggestions for ${key.label}`, type: 'success' });
    }
  }

  compromiseByFingerprint(fingerprint: string, source: string = 'webhook'): boolean {
    const key = this.registry.getKeys().find(k =>
      k.id === fingerprint ||
      k.label.toLowerCase().includes(fingerprint.toLowerCase()) ||
      k.provider.toLowerCase() === fingerprint.toLowerCase()
    );
    if (key) return this.compromiseKey(key.id, source);
    return false;
  }

  quarantineByFingerprint(fingerprint: string, source: string = 'manual'): boolean {
    const key = this.registry.getKeys().find(k =>
      k.id === fingerprint || k.label.toLowerCase().includes(fingerprint.toLowerCase())
    );
    if (key) return this.quarantineKey(key.id, source);
    return false;
  }
}
