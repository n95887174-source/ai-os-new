import type { ApiKey, KeyHistoryEntry, ProviderAlert, KeyNote } from '../../types/metrics-types';
import { EVENTS } from '../../events/event-names';
import { PROVIDER_DEFAULT_MODELS } from '../../utils/provider-default-models';
import { KeyVault } from './key-vault';
import { KeyRegistry } from './key-registry';
import { KeyHealth } from './key-health';
import { KeyQuotas } from './key-quotas';
import { KeyAnalytics } from './key-analytics';
import { KeyFingerprints } from './key-fingerprints';
import { KeyAlerts } from './key-alerts';
import { KeyLifecycle } from './key-lifecycle';
import { BucketStorageAdapter } from '../../storage-adapter-instance';
import { KeyPoolSelector } from './key-pool-selector';
import { KeyDiagnostics } from './key-diagnostics';
import { debounce } from '../../../utils/debounce';
import type { IAdapterRegistry } from '../../contracts/provider-adapter';
import type { IKeyVaultService } from '../../contracts/key-vault';
import type { IHealthCheckService } from '../../contracts/health-check';
import type { IKeyAnalyticsService } from '../../contracts/key-analytics';
import type { PoolStrategy } from '../../contracts/pool-selector';
import type { IGroupManager } from '../../contracts/group-manager';
import type { IKeyStateStore } from '../../contracts/key-state';
import type { IKeyRotationManager } from '../../contracts/key-rotation';
import type { KeyStore } from '../../contracts/storage/key-store';
import { CONFIG } from '../config-registry';
import { rootLogger } from '../logger-service';

import type { FreeTierLimit } from './key-types';

const DEFAULT_FREE_TIER_LIMITS: Record<string, FreeTierLimit> = {
    ...CONFIG.keys.freeTierLimits,
    Together: { requestsPerDay: 0, tokensPerDay: 0 },
};

export const FREE_TIER_LIMITS = DEFAULT_FREE_TIER_LIMITS;

const STORAGE_KEY = 'super_agents_api_keys';

export interface KeyServiceDeps {
    eventBus: {
        on: (event: string, cb: (...args: unknown[]) => void) => () => void;
        onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
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
    keyStateStore?: IKeyStateStore;
}

export class KeyService implements IKeyRotationManager {
    private vault: KeyVault;
    private registry: KeyRegistry;
    private health: KeyHealth;
    private quotas: KeyQuotas;
    private analytics: KeyAnalytics;
    private fingerprints: KeyFingerprints;
    private alerts: KeyAlerts;
    private lifecycle: KeyLifecycle;
    private poolSelector: KeyPoolSelector;
    private groupManager?: IGroupManager;
    private diagnostics: KeyDiagnostics;

    readonly vaultService: IKeyVaultService;
    readonly healthCheckService: IHealthCheckService;
    readonly analyticsService: IKeyAnalyticsService;

    private freeTierLimits: Record<string, FreeTierLimit> = { ...DEFAULT_FREE_TIER_LIMITS };
    private unsubs: Array<() => void> = [];
    private _initialized = false;
    private deps: KeyServiceDeps;
    private _globalSLAMode: string = 'BALANCED';
    private _latencyThreshold: number = 1500;

    get globalSLAMode(): string {
        return this._globalSLAMode;
    }
    get latencyThreshold(): number {
        return this._latencyThreshold;
    }

    getRoutingPolicy(): { globalSLAMode: string; latencyThreshold: number } {
        return { globalSLAMode: this._globalSLAMode, latencyThreshold: this._latencyThreshold };
    }

    constructor(deps: KeyServiceDeps) {
        this.deps = deps;

        this.vault = new KeyVault();

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
            this.freeTierLimits,
        );

        this.health = new KeyHealth({
            eventBus: deps.eventBus,
            onStateChanged: (id, provider, newState, previousState) => {
                deps.eventBus.emit(EVENTS.KEY_STATE_CHANGED, {
                    id,
                    provider,
                    state: newState,
                    previousState,
                });
            },
            addAlert: (keyId, alert) => {
                const key = this.registry.getKey(keyId);
                if (key) this.alerts.addAlert(key, alert);
            },
            saveKeys: () => this.registry.saveKeys(),
            notify: () => this.notify(),
            getKey: (id) => this.registry.getKey(id),
            getActiveKeys: () => this.registry.getActiveKeys(),
            modifyKey: (id, fn) => this.registry.modifyKey(id, fn),
            providerAdapterRegistry: deps.providerAdapterRegistry,
        });

        this.analytics = new KeyAnalytics({
            pricingService: deps.pricingService,
            eventBus: deps.eventBus,
            onLatencyBurst: (id, provider, latency) => {
                deps.eventBus.emit(EVENTS.KEY_LATENCY_BURST, { id, provider, latency });
            },
            onStateChanged: (id, provider, newState, previousState) => {
                deps.eventBus.emit(EVENTS.KEY_STATE_CHANGED, {
                    id,
                    provider,
                    state: newState,
                    previousState,
                });
            },
            onReputationThresholdCrossed: (id, provider, score) => {
                deps.eventBus.emit(EVENTS.KEY_REPUTATION_THRESHOLD_CROSSED, {
                    id,
                    provider,
                    score,
                });
            },
            ensureExtendedStats: (key) => this.ensureExtendedStats(key),
        });

        this.fingerprints = new KeyFingerprints();
        this.lifecycle = new KeyLifecycle({
            getKey: (id) => this.registry.getKey(id),
            saveKeys: () => this.registry.saveKeys(),
            notify: () => this.notify(),
            eventBus: this.deps.eventBus,
            keyHealth: this.health,
            keyStateStore: deps.keyStateStore,
        });

        this.poolSelector = this.createPoolSelector();

        this.diagnostics = new KeyDiagnostics({
            eventBus: deps.eventBus,
            providerAdapterRegistry: deps.providerAdapterRegistry,
            get advisorService() {
                return deps.advisorService;
            },
            recordUsage: (id, latency, tokens, model, extra) =>
                this.recordUsage(id, latency, tokens, model, extra),
            getKey: (id) => this.registry.getKey(id),
            getKeys: () => this.registry.getKeys(),
        });

        this.vaultService = this.vault;
        this.healthCheckService = this.health;
        this.analyticsService = this.analytics;
    }

    private ensureExtendedStats(key: ApiKey): void {
        if (!key.stats) key.stats = this.registry.initStats();
        if (!key.stats.extended) key.stats.extended = this.registry.initExtendedStats();
        const ext = key.stats.extended;
        if (!ext.usageToday)
            ext.usageToday = { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 };
        if (!ext.usageMonthly) ext.usageMonthly = { tokens: 0, requests: 0, estimatedCost: 0 };
        if (!ext.latencyBreakdown) ext.latencyBreakdown = { ttft: 0, total: 0, tokensPerSec: 0 };
        if (!ext.errorBreakdown)
            ext.errorBreakdown = {
                rateLimit: 0,
                timeout: 0,
                serverError: 0,
                validationError: 0,
                other: 0,
                provider: 0,
            };
        if (!ext.fourSignals)
            ext.fourSignals = { latency: 0, throughput: 0, errorRate: 0, saturation: 0 };
        if (!ext.rules) ext.rules = structuredClone(CONFIG.keys.defaultRules);
    }

    async init() {
        if (this._initialized) return;
        this._initialized = true;
        await this.loadConfig();
        await this.registry.loadKeys();
        const keysAfterLoad = this.registry.getKeys();
        if (import.meta.env.DEV)
            console.log('[KEY_FLOW] KeyService final keys count:', {
                count: keysAfterLoad.length,
                providers: [...new Set(keysAfterLoad.map((k) => k.provider))],
                activeCount: keysAfterLoad.filter((k) => k.status === 'active').length,
            });
        this.notify();

        this.lifecycle.startAutoRecovery();

        // NOTE: beforeunload cannot synchronously flush IndexedDB writes.
        // The `await` in groupManager.deleteKey() + `throw e` in key-registry
        // ensure that if the caller awaits the result, the Dexie write completes
        // before the function returns. The only vulnerability window is during
        // the async gap between in-memory mutation and Dexie write completion,
        // which is bounded by the event loop microtask queue.
        // For HMR scenarios, see main.tsx __cleanupKeyStore.

        this.registry.setupListeners({
            addKey: (data) => this.addKey(data),
            compromiseByFingerprint: (fingerprint, source) => {
                // CRIT-K5: Exact match only — id or SHA-256 fingerprint, no substring
                const matches = this.registry
                    .getKeys()
                    .filter((k) => k.id === fingerprint || k.fingerprint === fingerprint);
                for (const key of matches) {
                    this.compromiseKey(key.id, source);
                }
            },
            updateMetricsFromResponse: (res) => {
                const r = res as {
                    keyId?: string;
                    provider: string;
                    status: string;
                    error?: string;
                    latency?: number;
                    ttft?: number;
                    tokens?: number | { total?: number };
                    tps?: number;
                };
                const keyEntry = r.keyId
                    ? this.registry.getKey(r.keyId)
                    : this.registry
                          .getKeys()
                          .find((k) => k.provider.toLowerCase() === r.provider.toLowerCase());
                if (!keyEntry) return;
                const keyId = keyEntry.id;

                if (r.status === 'error' && r.error) {
                    const isRateLimit =
                        r.error.includes('429') ||
                        r.error.toLowerCase().includes('quota') ||
                        r.error.toLowerCase().includes('rate limit');
                    if (isRateLimit) {
                        this.health.check429Spike(keyId);
                        const backoffMs = this.health.getBackoffMs(keyId);
                        this.registry.modifyKey(keyId, (key) => {
                            this.alerts.addAlert(key, {
                                type: 'rate_limit',
                                severity: 'medium',
                                message: `Provider ${key.provider} quota exhausted (429)`,
                            });
                            if (key.stats?.extended) {
                                key.stats.extended.state = 'DEGRADED' as NonNullable<
                                    ApiKey['stats']['extended']
                                >['state'];
                            }
                            key.status = 'inactive';
                        });
                        this.deps.eventBus.emit(EVENTS.KEY_QUOTA_EXCEEDED, {
                            id: keyId,
                            provider: keyEntry.provider,
                            quotaType: 'requests',
                        });
                        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
                            message: `${keyEntry.provider} hit 429 — retrying in ${Math.round(backoffMs / 1000)}s (exponential backoff)`,
                            type: 'warning',
                        });
                        setTimeout(() => {
                            this.deps.eventBus.emit(EVENTS.CHECK_HEALTH, keyId);
                        }, backoffMs);
                    }
                    this.registry.modifyKey(keyId, (key) => {
                        const previousState = key.status;
                        key.status = 'error';
                        if (!key.stats) {
                            key.stats = this.registry.initStats();
                        }
                        key.stats.lastError = {
                            message: r.error || 'Unknown error',
                            timestamp: new Date().toISOString(),
                        };
                        this.deps.eventBus.emit(EVENTS.KEY_STATE_CHANGED, {
                            id: keyId,
                            provider: key.provider,
                            state: 'error',
                            previousState,
                        });
                    });
                }

                this.registry.modifyKey(keyId, (key) => {
                    this.analytics.updateMetricsFromResponse(key, r);
                });
                this.registry.saveKeys();
                this.notify();
            },
        });

        this.unsubs.push(
            this.deps.eventBus.on(EVENTS.KEY_REMOVED, async (id: unknown) => {
                if (typeof id === 'string') {
                    try {
                        const { getDexieDb } = await import('../database-service');
                        const db = getDexieDb();
                        const notes = await db.notes.where('keyId').equals(id).toArray();
                        if (notes.length > 0) {
                            await db.notes.bulkDelete(notes.map((n) => n.id!));
                        }
                    } catch {
                        /* note cleanup is best-effort */
                    }
                }
            }),
        );

        this.unsubs.push(
            this.deps.eventBus.on(EVENTS.CHECK_HEALTH, (id: unknown) => {
                if (typeof id === 'string') {
                    this.health.checkHealth(id);
                }
            }),
        );

        this.unsubs.push(
            this.deps.eventBus.on(EVENTS.CHECK_ALL_HEALTH, () => {
                this.health.checkAllHealth();
            }),
        );
    }

    destroy() {
        this._initialized = false;
        this.unsubs.forEach((u) => u());
        this.unsubs = [];
        this.registry.destroy();
        this.lifecycle.destroy();
    }

    async reload(): Promise<void> {
        await this.registry.reload();
        this.notify();
    }

    async loadKeys(): Promise<void> {
        await this.registry.loadKeys();
        this.notify();
    }

    /**
     * Wipe the in-memory KeyRegistry cache. Used by the canonical reset
     * pipeline; the next reload() re-hydrates from dexieDb.apiKeys.
     */
    clearKeys(): void {
        this.registry.clearKeys();
    }

    /**
     * Force-resync from dexieDb.apiKeys. Safety net for when the registry
     * ends up empty despite Dexie holding data (race, stub keyStore, etc.).
     */
    async forceResyncFromDexie(): Promise<number> {
        const restored = await this.registry.forceResyncFromDexie();
        if (restored > 0) {
            this.notify();
            this.deps.eventBus.emit(EVENTS.KEYS_LOADED, this.registry.getKeys());
        }
        return restored;
    }

    // -- Config Persistence ---------------------------------------------

    private async loadConfig() {
        try {
            const saved =
                await this.deps.database.getKv<Record<string, FreeTierLimit>>(
                    'global_free_tier_limits',
                );
            if (saved) this.freeTierLimits = saved;
            this.quotas.syncFreeTierLimits(this.freeTierLimits);
            const savedStrategies =
                await this.deps.database.getKv<Record<string, PoolStrategy>>('pool_strategies');
            if (savedStrategies) this.poolSelector.setStrategies(savedStrategies);
            const savedSLA = await this.deps.database.getKv<string>('global_sla_mode');
            if (savedSLA) this._globalSLAMode = savedSLA;
            const savedLat = await this.deps.database.getKv<number>('latency_threshold');
            if (savedLat) this._latencyThreshold = savedLat;
            // KM-17: Recreate poolSelector with fresh freeTierLimits reference
            this.poolSelector = this.createPoolSelector();
        } catch (e) {
            rootLogger.warn('KeyService', '[KeyService] Failed to load global limits', {
                error: e,
            });
        }
    }

    private async saveConfig() {
        try {
            await this.deps.database.setKv('global_free_tier_limits', this.freeTierLimits);
            await this.deps.database.setKv('pool_strategies', this.poolSelector.getStrategies());
            await this.deps.database.setKv('global_sla_mode', this._globalSLAMode);
            await this.deps.database.setKv('latency_threshold', this._latencyThreshold);
        } catch (e) {
            rootLogger.error('KeyService', '[KeyService] Failed to save global limits', {
                error: e,
            });
        }
    }

    // -- Notification ---------------------------------------------------

    private emitKeyUpdate = () => {
        const keys = [...this.registry.getKeys()];
        this.deps.eventBus.emit(EVENTS.KEY_UPDATED, keys);
        this.deps.eventBus.emit(EVENTS.KEYS_LOADED, keys);
    };

    // C-07: leading=true fires first update immediately, coalesces rapid subsequent calls
    private notify = debounce(this.emitKeyUpdate, 100, true);

    // -- Vault (removed) ------------------------------------------------

    // -- Registry -------------------------------------------------------

    getKeys() {
        return this.registry.getKeys();
    }
    getKey(id: string) {
        return this.registry.getKey(id);
    }
    getKeysByProvider(provider: string) {
        return this.registry.getKeysByProvider(provider);
    }
    getActiveKeys() {
        return this.registry.getActiveKeys();
    }
    getPoolKeys(provider: string) {
        return this.registry.getPoolKeys(provider);
    }
    getDefaultKeys() {
        return this.registry.getDefaultKeys();
    }
    getStats() {
        return this.registry.getStats();
    }
    getTotalTokens() {
        return this.registry.getTotalTokens();
    }
    getTotalRequests() {
        return this.registry.getTotalRequests();
    }
    getUniqueProviders() {
        return this.registry.getUniqueProviders();
    }

    async addKey(data: Omit<ApiKey, 'id' | 'stats'>) {
        const newKey = await this.registry.addKey(data);
        if (!newKey) return undefined;
        this.quotas.applyFreeTierQuota(newKey);
        await this.registry.saveKeys();
        this.notify();
        this.deps.eventBus.emit(EVENTS.KEY_ADDED, newKey);
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Key for ${data.provider} added`,
            type: 'success',
        });
        setTimeout(() => {
            this.deps.eventBus.emit(EVENTS.CHECK_HEALTH, newKey.id);
        }, 1000);
        return newKey;
    }

    async removeKey(id: string) {
        await this.registry.removeKey(id);
        // NOTE: registry.removeKey() already calls saveKeys() internally.
        // A second call is redundant � the snapshot hasn't changed.
        this.health.cleanupKey(id);
        this.lifecycle.cleanupKey(id);
        this.notify();
        this.deps.eventBus.emit(EVENTS.KEY_REMOVED, id);
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Key removed', type: 'info' });
    }

    pushHistory(keyId: string, action: KeyHistoryEntry['action'], detail: string): void {
        this.registry.pushHistory(keyId, action, detail);
    }

    updateKey(id: string, data: Partial<ApiKey>) {
        this.registry.updateKey(id, data);
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
            if (saved && 'notes' in saved && Array.isArray((saved as { notes?: unknown }).notes)) {
                const notes = (saved as { notes: KeyNote[] }).notes;
                this.registry.modifyKey(keyId, (key) => {
                    key.notes = notes;
                });
            }
        } catch (e) {
            rootLogger.warn('KeyService', `[KeyService] Failed to load notes for key ${keyId}`, {
                error: e,
            });
        }
        this.notify();
    }

    async refreshModels(id: string) {
        const key = this.registry.getKey(id);
        if (!key || !key.key) return;
        try {
            this.updateKeyStatus(id, 'checking');
            const registry = this.deps.providerAdapterRegistry;
            if (!registry) return;
            const adapter = registry.getAdapter(key.provider);
            if (adapter) {
                const models = await adapter.getAvailableModels(key.key);
                if (Array.isArray(models) && models.length > 0) {
                    this.registry.modifyKey(id, (k) => {
                        k.availableModels = models;
                    });
                    this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
                        message: `Found ${models.length} models for ${key.provider}`,
                        type: 'success',
                    });
                }
            } else {
                const defaults: Record<string, string[]> = {
                    OpenRouter: [
                        PROVIDER_DEFAULT_MODELS.openrouter,
                        'openrouter/free',
                        'anthropic/claude-3-haiku-20240307',
                    ],
                    Gemini: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
                    Groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
                    NVIDIA: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.3-70b-instruct'],
                    Cerebras: ['cerebras-gpt-3.5'],
                    Cloudflare: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
                    DeepSeek: ['deepseek-chat', 'deepseek-coder'],
                    Cohere: ['command-r-plus', 'command-r'],
                    Blackboxapi: ['blackboxai'],
                    Scaleway: ['llama-3.3-70b-instruct', 'mistral-7b-instruct'],
                    Cometapi: ['gpt-4o', 'claude-3-5-sonnet'],
                    GitHub: ['gpt-4o', 'meta-llama-3.1-405b-instruct'],
                };
                const models = defaults[key.provider] || [];
                this.registry.modifyKey(id, (k) => {
                    k.availableModels = models;
                });
            }
            this.updateKeyStatus(id, 'active');
        } catch (e) {
            this.updateKeyStatus(id, 'error');
            this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
                message: `Failed to refresh models: ${e instanceof Error ? e.message : String(e)}`,
                type: 'error',
            });
        }
    }

    // -- Health ---------------------------------------------------------

    updateKeyStatus(id: string, status: ApiKey['status'], latency?: number) {
        let prev: ApiKey['status'] | undefined;
        let provider = '';
        this.registry.modifyKey(id, (key) => {
            prev = key.status;
            provider = key.provider;
            key.statusVersion = (key.statusVersion ?? 0) + 1;
            key.status = status;
            if (latency !== undefined) key.latency = latency;
            if (!key.history) key.history = [];
            key.history.push({
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                action: 'status_changed',
                detail: `${prev} > ${status}`,
            });
            if (key.history.length > 100) key.history = key.history.slice(-99);
        });
        if (prev === undefined) return;
        this.registry.saveKeys();
        this.notify();
        this.deps.eventBus.emit(EVENTS.KEY_STATE_CHANGED, {
            id,
            provider,
            state: status,
            previousState: prev,
        });
    }

    updateAvailableModels(id: string, models: string[]) {
        this.registry.modifyKey(id, (key) => {
            key.availableModels = models;
        });
        this.registry.saveKeys();
        this.notify();
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
        let prev: ApiKey['status'] | undefined;
        this.registry.modifyKey(id, (key) => {
            prev = key.status;
            key.statusVersion = (key.statusVersion ?? 0) + 1;
            if (key.status === 'active') {
                key.status = 'inactive';
            } else if (key.status === 'inactive' || key.status === 'error') {
                key.status = 'active';
            }
            if (!key.history) key.history = [];
            key.history.push({
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                action: 'status_changed',
                detail: `${prev} > ${key.status}`,
            });
            if (key.history.length > 100) key.history = key.history.slice(-99);
        });
        if (prev !== undefined) {
            await this.registry.saveKeys();
            this.notify();
        }
    }

    async enableAllKeys() {
        const keys = this.registry.getKeys();
        for (const k of keys) {
            this.registry.modifyKey(k.id, (key) => {
                key.status = 'active';
            });
        }
        await this.registry.saveKeys();
        this.notify();
    }

    async disableAllKeys() {
        const keys = this.registry.getKeys();
        for (const k of keys) {
            this.registry.modifyKey(k.id, (key) => {
                key.status = 'inactive';
            });
        }
        await this.registry.saveKeys();
        this.notify();
    }

    quarantineKey(idOrFingerprint: string, source: string = 'manual'): boolean {
        let found = false;
        this.registry.modifyKey(idOrFingerprint, (key) => {
            this.health.quarantineKey(key, source);
            found = true;
        });
        if (!found) return false;
        this.registry.saveKeys();
        this.notify();
        return true;
    }

    compromiseKey(id: string, source: string = 'webhook'): boolean {
        let provider = '';
        let found = false;
        this.registry.modifyKey(id, (key) => {
            provider = key.provider;
            this.health.compromiseKey(key, source);
            found = true;
        });
        if (!found) return false;
        this.registry.saveKeys();
        this.notify();

        this.deps.eventBus.emit(EVENTS.KEY_COMPROMISED, {
            id,
            provider,
            source,
        });

        return true;
    }

    // -- Quotas ---------------------------------------------------------

    getFreeTierLimits() {
        return this.quotas.getFreeTierLimits();
    }

    async setFreeTierLimit(provider: string, limit: FreeTierLimit) {
        this.freeTierLimits[provider.toLowerCase()] = limit;
        this.quotas.setFreeTierLimit(provider, limit);
        await this.saveConfig();
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
        return (
            this.deps.providerAdapterRegistry?.getProviderRuntimeStatus(provider).circuitOpen ??
            false
        );
    }

    isProviderRateLimited(provider: string): boolean {
        return (
            this.deps.providerAdapterRegistry?.getProviderRuntimeStatus(provider).rateLimited ??
            false
        );
    }

    // -- Pool Selection -------------------------------------------------

    getPoolStrategy(provider: string): PoolStrategy {
        return this.poolSelector.getPoolStrategy(provider);
    }

    async setPoolStrategy(provider: string, strategy: PoolStrategy) {
        try {
            await this.poolSelector.setPoolStrategy(provider, strategy);
        } catch (e) {
            rootLogger.error('KeyService', '[KeyService] Failed to set pool strategy', {
                error: e,
            });
        }
    }

    attachGroupManager(groupManager: IGroupManager): void {
        this.groupManager = groupManager;
        this.poolSelector = this.createPoolSelector();
        // STATE-C4: Start KEY_REMOVED listener so pool selector cleans up stale entries.
        this.poolSelector.start();
    }

    private createPoolSelector(): KeyPoolSelector {
        const gm = this.groupManager;
        return new KeyPoolSelector({
            eventBus: this.deps.eventBus,
            getPoolKeys: (provider) => this.registry.getPoolKeys(provider),
            getKeysByProvider: (provider) => this.registry.getKeysByProvider(provider),
            canUseKey: (key) => this.quotas.canUseKey(key),
            isKeyQuotaExhausted: (key) => this.quotas.isKeyQuotaExhausted(key),
            saveConfig: () => this.saveConfig(),
            freeTierLimits: this.freeTierLimits,
            getGroupKeys: gm
                ? (groupId) => {
                      if (!groupId) return undefined;
                      const group = gm.getGroup(groupId);
                      if (!group) return undefined;
                      return group.keyIds
                          .map((id) => this.registry.getKey(id))
                          .filter((k): k is ApiKey => !!k && typeof k === 'object');
                  }
                : undefined,
            getKeyGroupId: gm ? (keyId) => gm.getPassport(keyId)?.groupId : undefined,
        });
    }

    selectFromPool(provider: string, strategy?: PoolStrategy): ApiKey | null {
        return this.poolSelector.selectFromPool(provider, strategy);
    }

    selectWithBurst(provider: string, strategy?: PoolStrategy): ApiKey | null {
        return this.poolSelector.selectWithBurst(provider, strategy);
    }

    getBurstCapacity(provider: string): {
        totalQuota: number;
        usedQuota: number;
        availableBurst: number;
        keys: number;
    } {
        return this.poolSelector.getBurstCapacity(provider);
    }

    getQuotaShare(provider: string): {
        total: number;
        used: number;
        available: number;
        sharedPool: number;
    } {
        return this.poolSelector.getQuotaShare(provider);
    }

    getPoolStatus(provider: string): {
        total: number;
        active: number;
        used: number;
        limit: number;
    } {
        return this.poolSelector.getPoolStatus(provider);
    }

    getPoolKeyDistribution(provider: string): Array<{
        id: string;
        label: string;
        used: number;
        limit: number;
        pct: number;
        status: string;
    }> {
        return this.poolSelector.getPoolKeyDistribution(provider);
    }

    // -- Analytics ------------------------------------------------------

    recordUsage(
        keyIdOrProvider: string,
        latency: number,
        tokens: number = 0,
        model?: string,
        extra?: Record<string, unknown>,
    ) {
        const keyEntry = this.registry
            .getKeys()
            .find(
                (k) =>
                    (k.id === keyIdOrProvider ||
                        k.provider.toLowerCase() === keyIdOrProvider.toLowerCase()) &&
                    k.status === 'active',
            );
        if (!keyEntry) return;
        const keyId = keyEntry.id;

        this.registry.modifyKey(keyId, (key) => {
            this.ensureExtendedStats(key);
            this.analytics.recordUsage(key, latency, tokens, model, extra);
            this.quotas.checkQuotas(key);
            if (extra?.failed) {
                if (!key.history) key.history = [];
                key.history.push({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    action: 'error',
                    detail: `${extra.error || 'Unknown error'} (${model || 'auto'})`,
                });
                if (key.history.length > 100) key.history = key.history.slice(-99);
                this.lifecycle.onError(keyId);
            } else {
                this.lifecycle.onSuccess(keyId);
            }
        });
        this.registry.saveKeys();
        this.notify();
    }

    incrementConcurrency(id: string) {
        this.registry.modifyKey(id, (key) => {
            if (key.stats?.extended) {
                key.stats.extended.currentConcurrentRequests++;
            }
        });
        this.notify();
    }

    decrementConcurrency(id: string) {
        this.registry.modifyKey(id, (key) => {
            if (key.stats?.extended) {
                key.stats.extended.currentConcurrentRequests = Math.max(
                    0,
                    key.stats.extended.currentConcurrentRequests - 1,
                );
            }
        });
        this.notify();
    }

    async recalculateAllReputations() {
        const keys = this.registry.getKeys();
        for (const k of keys) {
            this.registry.modifyKey(k.id, (key) => {
                this.analytics.calculateReputation(key);
            });
        }
        await this.registry.saveKeys();
        this.notify();
    }

    async resetKeyStats(keyId: string) {
        let label = '';
        this.registry.modifyKey(keyId, (key) => {
            label = key.label || '';
            this.analytics.resetKeyStats(key);
        });
        if (!label) return;
        await this.registry.saveKeys();
        this.notify();
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Statistics reset for ${label}`,
            type: 'info',
        });
    }

    // -- Alerts ---------------------------------------------------------

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

    // -- Fingerprints ---------------------------------------------------

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

    suggestModel(provider: string): string | null {
        return this.fingerprints.suggestModel(provider);
    }

    // -- Lifecycle / SLA / Rotation -------------------------------------

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
        for (const k of keys) {
            this.registry.modifyKey(k.id, (key) => {
                if (!key.stats?.extended) return;
                key.stats.extended.activeSLA = mode as NonNullable<
                    ApiKey['stats']['extended']
                >['activeSLA'];
                const profile = CONFIG.keys.slaProfiles[mode] ?? CONFIG.keys.slaProfiles.DEFAULT;
                key.stats.extended.rules.timeoutMs = profile.timeoutMs;
                key.stats.extended.rules.slaThresholds.latencyP95 = profile.latencyP95;
            });
        }
        this._globalSLAMode = mode;
        await this.saveConfig();
        await this.registry.saveKeys();
        this.notify();
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Global SLA set to ${mode}`,
            type: 'success',
        });
    }

    async setSLA(id: string, mode: string) {
        let provider = '';
        this.registry.modifyKey(id, (key) => {
            provider = key.provider;
            if (!key.stats?.extended) return;
            key.stats.extended.activeSLA = mode as NonNullable<
                ApiKey['stats']['extended']
            >['activeSLA'];
            const profile = CONFIG.keys.slaProfiles[mode] ?? CONFIG.keys.slaProfiles.DEFAULT;
            key.stats.extended.rules.timeoutMs = profile.timeoutMs;
            key.stats.extended.rules.slaThresholds.latencyP95 = profile.latencyP95;
        });
        if (!provider) return;
        await this.registry.saveKeys();
        this.notify();
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `${provider} SLA set to ${mode}`,
            type: 'info',
        });
    }

    // -- Misc -----------------------------------------------------------

    transitionState(id: string, newState: string) {
        this.registry.modifyKey(id, (key) => {
            if (!key.stats?.extended) return;
            const oldState = key.stats.extended.state;
            if (oldState === newState) return;
            key.stats.extended.state = newState as NonNullable<
                ApiKey['stats']['extended']
            >['state'];
        });
        this.notify();
    }

    resetStats(keyId: string) {
        return this.resetKeyStats(keyId);
    }

    async setLatencyThreshold(threshold: number) {
        this._latencyThreshold = threshold;
        await this.saveConfig();
        await this.deps.database.setKv('latency_threshold', threshold);
        this.deps.eventBus.emit(EVENTS.SETTINGS_LATENCY_THRESHOLD, { threshold });
    }

    async clearAllData(): Promise<void> {
        try {
            const { getDexieDb } = await import('../database-service');
            const db = getDexieDb();
            await Promise.allSettled([
                db.keyValue.clear(),
                db.apiKeys.clear(),
                db.memories.clear(),
                db.sessions.clear(),
                db.roles.clear(),
                db.cognitiveTraces.clear(),
                db.traces.clear(),
                db.skills.clear(),
                db.connectors.clear(),
                db.debateSessions.clear(),
                db.debateVerdicts.clear(),
                db.debateTimeline.clear(),
                db.debateOverrides.clear(),
                db.sessionLinks.clear(),
                db.eventLog.clear(),
                db.notes.clear(),
            ]);
        } catch (e) {
            rootLogger
                ?.child('KeyService')
                ?.error('KeyService', 'clearAllData: Dexie clear failed', { error: e });
        }
        BucketStorageAdapter.removeItem(STORAGE_KEY);
        this.deps.eventBus.emit(EVENTS.CLEAR_DATA, undefined);
    }

    handleProviderError(keyId: string, error: string) {
        this.registry.modifyKey(keyId, (key) => {
            const previousState = key.status;
            key.status = 'error';
            if (!key.stats) {
                key.stats = this.registry.initStats();
            }
            key.stats.lastError = { message: error, timestamp: new Date().toISOString() };
            this.deps.eventBus.emit(EVENTS.KEY_STATE_CHANGED, {
                id: keyId,
                provider: key.provider,
                state: 'error',
                previousState,
            });
        });
        this.lifecycle.onError(keyId);
    }

    // -- Diagnostics -----------------------------------------------------

    async getProviderIntrospection(
        provider: string,
        apiKey: string,
    ): Promise<Record<string, unknown>> {
        return this.diagnostics.getProviderIntrospection(provider, apiKey);
    }

    async runBenchmark(id: string) {
        return this.diagnostics.runBenchmark(id);
    }

    async runAdvisor(id: string) {
        return this.diagnostics.runAdvisor(id);
    }

    compromiseByFingerprint(fingerprint: string, source: string = 'webhook'): boolean {
        const matches = this.registry
            .getKeys()
            .filter((k) => k.id === fingerprint || k.fingerprint === fingerprint);
        if (matches.length === 0) return false;
        for (const key of matches) {
            this.compromiseKey(key.id, source);
        }
        return true;
    }

    quarantineByFingerprint(fingerprint: string, source: string = 'manual'): boolean {
        const matches = this.registry
            .getKeys()
            .filter((k) => k.id === fingerprint || k.fingerprint === fingerprint);
        if (matches.length === 0) return false;
        for (const key of matches) {
            this.quarantineKey(key.id, source);
        }
        return true;
    }
}
