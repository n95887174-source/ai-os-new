import type { ApiKey, KeyExtendedStats, KeyNote } from '../../types/metrics-types';
import { EVENTS } from '../../events/event-names';
import type { FreeTierLimit } from './key-service';
import { CONFIG } from '../config-registry';

const STORAGE_KEY = 'super_agents_api_keys';

export interface KeyRegistryDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
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
  };
  vault: {
    encryptKey: (plaintext: string) => Promise<string | null>;
    isLocked: () => boolean;
    decryptAllKeys: (keys: ApiKey[]) => Promise<ApiKey[]>;
    encryptAllKeys: (keys: ApiKey[]) => Promise<ApiKey[]>;
    stripPlaintextKeys: (keys: ApiKey[]) => ApiKey[];
  };
  freeTierLimits: Record<string, FreeTierLimit>;
}

export class KeyRegistry {
  private keys: ApiKey[] = [];
  private unsubs: Array<() => void> = [];
  private deps: KeyRegistryDeps;

  constructor(deps: KeyRegistryDeps) {
    this.deps = deps;
  }

  getKeys(): ApiKey[] {
    return this.keys;
  }

  getKey(id: string): ApiKey | undefined {
    return this.keys.find(k => k.id === id);
  }

  getKeysByProvider(provider: string): ApiKey[] {
    return this.keys.filter(k => k.provider.toLowerCase() === provider.toLowerCase());
  }

  getActiveKeys(): ApiKey[] {
    return this.keys.filter(k => k.status === 'active');
  }

  getPoolKeys(provider: string): ApiKey[] {
    return this.keys.filter(
      k => k.provider.toLowerCase() === provider.toLowerCase() && k.status === 'active'
    );
  }

  getDefaultKeys(): ApiKey[] {
    return [
      { id: '1', provider: 'OpenRouter', key: '', label: 'OpenRouter Main', status: 'inactive', stats: this.initStats() },
      { id: '2', provider: 'Gemini', key: '', label: 'Gemini Pro', status: 'inactive', stats: this.initStats() },
      { id: '3', provider: 'Groq', key: '', label: 'Groq Cloud', status: 'inactive', stats: this.initStats() },
      { id: '4', provider: 'NVIDIA', key: '', label: 'NVIDIA API', status: 'inactive', stats: this.initStats() },
      { id: '5', provider: 'Cerebras', key: '', label: 'Cerebras API', status: 'inactive', stats: this.initStats() },
      { id: '6', provider: 'Cloudflare', key: '', label: 'Cloudflare Workers AI', status: 'inactive', stats: this.initStats() },
      { id: '7', provider: 'DeepSeek', key: '', label: 'DeepSeek Main', status: 'inactive', stats: this.initStats() },
      { id: '8', provider: 'Cohere', key: '', label: 'Cohere Main', status: 'inactive', stats: this.initStats() },
      { id: '9', provider: 'Blackboxapi', key: '', label: 'Blackboxapi Main', status: 'inactive', stats: this.initStats() },
      { id: '10', provider: 'Scaleway', key: '', label: 'Scaleway Main', status: 'inactive', stats: this.initStats() },
      { id: '11', provider: 'Cometapi', key: '', label: 'CometAPI Main', status: 'inactive', stats: this.initStats() },
      { id: '12', provider: 'GitHub', key: '', label: 'GitHub Models', status: 'inactive', stats: this.initStats() },
    ];
  }

  setupListeners(handlers: { addKey: (data: Omit<ApiKey, 'id' | 'stats'>) => void; removeKey: (id: string) => void; compromiseByFingerprint: (fingerprint: string, source: string) => void; updateMetricsFromResponse: (res: any) => void }) {
    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.KEY_ADDED, (data: unknown) => handlers.addKey(data as Omit<ApiKey, 'id' | 'stats'>)),
      this.deps.eventBus.on(EVENTS.KEY_REMOVED, (id: unknown) => handlers.removeKey(id as string)),
      this.deps.eventBus.on(EVENTS.MESSAGE_RESPONSE, (res: unknown) => handlers.updateMetricsFromResponse(res)),
      this.deps.eventBus.on(EVENTS.COMPROMISE_SIGNAL, (data: unknown) => {
        const d = data as { id?: string; fingerprint?: string; source?: string };
        if (d.fingerprint) handlers.compromiseByFingerprint(d.fingerprint, d.source || 'external signal');
      })
    );
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  async loadKeys(): Promise<void> {
    try {
      const saved = await this.deps.database.apiKeys.toArray();
      let loaded: ApiKey[];
      if (saved && saved.length > 0) {
        loaded = saved.map(k => {
          const stats = k.stats || this.initStats();
          if (!stats.extended) stats.extended = this.initExtendedStats();
          return { ...k, stats };
        });
        const real = loaded.filter(k => k.key);
        if (real.length !== loaded.length) {
          loaded = real;
          await this.deps.database.apiKeys.bulkPut(real);
        }
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          loaded = parsed.map((k: { id: string; provider: string; key: string; label: string; status: string; stats?: ApiKey['stats'] }) => {
            const stats = k.stats || this.initStats();
            if (!stats.extended) stats.extended = this.initExtendedStats();
            return { ...k, stats };
          }).filter((k: ApiKey) => k.key);
          if (loaded.length > 0) await this.deps.database.apiKeys.bulkAdd(loaded);
        } else {
          loaded = [];
        }
      }

      // Decrypt any encrypted loaded keys first to handle in-memory plaintext operations
      if (!this.deps.vault.isLocked() && loaded.length > 0) {
        loaded = await this.deps.vault.decryptAllKeys(loaded);
      }

      // Auto-seed user-specified keys if they are not already present
      const seedData = [
        { provider: 'Groq', key: 'placeholder-groq-primary', label: 'Groq Primary' },
        { provider: 'Blackboxapi', key: 'placeholder-blackboxapi', label: 'Blackboxapi Main' },
        { provider: 'Scaleway', key: 'placeholder-scaleway', label: 'Scaleway (Dedibox)' },
        { provider: 'Groq', key: 'placeholder-groq-secondary', label: 'Groq Secondary' },
        { provider: 'OpenRouter', key: 'placeholder-openrouter-dedicated', label: 'OpenRouter Dedicated' },
        { provider: 'DeepSeek', key: 'placeholder-deepseek', label: 'DeepSeek Main' },
        { provider: 'Cometapi', key: 'placeholder-cometapi', label: 'CometAPI Main' },
        { provider: 'Cohere', key: 'placeholder-cohere-1', label: 'Cohere Key 1' },
        { provider: 'Gemini', key: 'placeholder-gemini-key-1', label: 'Gemini Key 1' },
        { provider: 'Gemini', key: 'placeholder-gemini-key-2', label: 'Gemini Key 2' },
        { provider: 'GitHub', key: 'placeholder-github', label: 'GitHub Models' },
        { provider: 'Cohere', key: 'placeholder-cohere-2', label: 'Cohere Key 2' },
        { provider: 'Cohere', key: 'placeholder-cohere-3', label: 'Cohere Key 3' }
      ];

      let seededNew = false;
      for (const item of seedData) {
        const exists = loaded.some(k => k.key === item.key || (k.provider.toLowerCase() === item.provider.toLowerCase() && k.key.includes(item.key.slice(-8))));
        if (!exists) {
          loaded.push({
            id: crypto.randomUUID().slice(0, 8),
            provider: item.provider,
            key: item.key,
            label: item.label,
            status: 'active',
            isEncrypted: false,
            stats: this.initStats(),
            tags: ['env:production'],
          });
          seededNew = true;
        }
      }

      this.keys.length = 0;
      this.keys.push(...loaded);

      // If we seeded any new keys, save them encrypted immediately to the database
      if (seededNew) {
        await this.saveKeys();
      }
    } catch (e) {
      console.warn('[KeyRegistry] Failed to load API keys:', e);
      this.deps.eventBus.emit('system:notification', { message: 'Failed to load API keys from DB, trying localStorage', type: 'warning' });
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.keys.length = 0;
          this.keys.push(...parsed.map((k: { id: string; provider: string; key: string; label: string; status: string; stats?: ApiKey['stats'] }) => {
            const stats = k.stats || this.initStats();
            if (!stats.extended) stats.extended = this.initExtendedStats();
            return { ...k, stats };
          }).filter((k: ApiKey) => k.key));
          if (this.keys.length > 0) await this.deps.database.apiKeys.bulkAdd(this.keys);
          return;
        }
      } catch { /* ignore localStorage fallback failure */ }
      this.deps.eventBus.emit('system:notification', { message: 'Failed to load API keys, using defaults', type: 'error' });
      this.keys.length = 0;
      this.keys.push(...this.getDefaultKeys());
    }
  }

  async saveKeys(): Promise<void> {
    try {
      const keysToSave = await this.deps.vault.encryptAllKeys(this.keys);
      await this.deps.database.apiKeys.bulkPut(keysToSave);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keysToSave));
    } catch (e) {
      console.error('[KeyRegistry] Failed to save keys', e);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.keys));
      } catch (lsError) {
        console.error('[KeyRegistry] Failed to save keys to localStorage', lsError);
      }
    }
  }

  async addKey(data: Omit<ApiKey, 'id' | 'stats'>): Promise<ApiKey | null> {
    const isDuplicate = this.keys.some(k => k.key === data.key && k.provider === data.provider);
    if (isDuplicate) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Key already configured for provider ${data.provider}`,
        type: 'error',
      });
      return null;
    }

    if (this.deps.vault.isLocked()) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: 'Vault is locked. Please unlock to add new keys securely.',
        type: 'error',
      });
      return null;
    }

    const enc = await this.deps.vault.encryptKey(data.key);
    if (!enc) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: 'Encryption failed. Key was not added.',
        type: 'error',
      });
      return null;
    }

    const inferredTags: string[] = [];
    const labelLower = data.label.toLowerCase();
    if (/\b(prod|production)\b/.test(labelLower)) inferredTags.push('env:production');
    if (/\b(dev|development)\b/.test(labelLower)) inferredTags.push('env:development');
    if (/\b(staging|stage)\b/.test(labelLower)) inferredTags.push('env:staging');
    if (/\b(test|testing)\b/.test(labelLower)) inferredTags.push('env:test');
    if (/\bfree\b/.test(labelLower)) inferredTags.push('tier:free');

    const newKey: ApiKey = {
      ...data,
      key: enc,
      isEncrypted: true,
      tags: [...(data.tags || []), ...inferredTags],
      id: crypto.randomUUID().slice(0, 8),
      stats: this.initStats(),
    };

    this.keys.push(newKey);
    return newKey;
  }

  async removeKey(id: string): Promise<void> {
    this.keys = this.keys.filter(k => k.id !== id);
  }

  updateKey(id: string, updates: Partial<ApiKey>): void {
    this.keys = this.keys.map(k => (k.id === id ? { ...k, ...updates } : k));
  }

  modifyKey(id: string, fn: (key: ApiKey) => void): void {
    const key = this.keys.find(k => k.id === id);
    if (key) fn(key);
  }

  async importKeys(jsonData: string): Promise<number> {
    const imported = JSON.parse(jsonData);
    if (!Array.isArray(imported)) throw new Error('Invalid data format');
    let count = 0;
    for (const item of imported) {
      if (!item.id || !item.provider || !item.label) continue;
      const exists = this.keys.some(k => k.id === item.id);
      if (!exists) {
        this.keys.push({
          ...item,
          key: item.key || '',
          isEncrypted: item.isEncrypted ?? false,
          stats: item.stats || this.initStats(),
        });
        count++;
      }
    }
    return count;
  }

  async exportKeys(encryptFn: (plaintext: string) => Promise<string | null>): Promise<string> {
    const exportData = await Promise.all(
      this.keys.map(async (k) => {
        let keyVal = k.key;
        let isEnc = k.isEncrypted;
        if (!this.deps.vault.isLocked() && k.key && !k.isEncrypted) {
          const encrypted = await encryptFn(k.key);
          if (encrypted) {
            keyVal = encrypted;
            isEnc = true;
          }
        }
        return {
          id: k.id,
          provider: k.provider,
          key: keyVal,
          label: k.label,
          tags: k.tags,
          status: k.status,
          isEncrypted: isEnc,
          availableModels: k.availableModels,
          notes: k.notes,
          stats: k.stats,
        };
      })
    );
    return JSON.stringify(exportData, null, 2);
  }

  async addNote(keyId: string, text: string, type: KeyNote['type'] = 'admin', author?: string): Promise<KeyNote> {
    const note: KeyNote = {
      id: crypto.randomUUID().slice(0, 8),
      keyId,
      text,
      timestamp: Date.now(),
      type,
      author,
    };
    const key = this.keys.find(k => k.id === keyId);
    if (key) {
      key.notes = [...(key.notes || []), note];
    }
    return note;
  }

  async removeNote(keyId: string, noteId: string): Promise<void> {
    const key = this.keys.find(k => k.id === keyId);
    if (key?.notes) {
      key.notes = key.notes.filter(n => n.id !== noteId);
    }
  }

  getStats() {
    const active = this.keys.filter(k => k.status === 'active');
    const totalTokens = this.keys.reduce((s, k) => s + (k.stats?.totalTokens || 0), 0);
    const totalCost = this.keys.reduce((s, k) => s + (k.stats?.extended?.estimatedCost || 0), 0);
    return {
      total: this.keys.length,
      active: active.length,
      inactive: this.keys.filter(k => k.status === 'inactive').length,
      error: this.keys.filter(k => k.status === 'error').length,
      totalTokens,
      totalCost,
      providers: new Set(this.keys.map(k => k.provider)).size,
    };
  }

  getTotalTokens(): number {
    return this.keys.reduce((sum, k) => sum + (k.stats?.totalTokens || 0), 0);
  }

  getTotalRequests(): number {
    return this.keys.reduce((sum, k) => sum + (k.stats?.successCount || 0) + (k.stats?.errorCount || 0), 0);
  }

  getUniqueProviders(): string[] {
    return [...new Set(this.keys.map(k => k.provider))];
  }

  initStats() {
    return {
      successCount: 0,
      errorCount: 0,
      totalTokens: 0,
      avgLatency: 0,
      minLatency: 0,
      maxLatency: 0,
      extended: this.initExtendedStats(),
    };
  }

  initExtendedStats(): KeyExtendedStats {
    return {
      reputationScore: 100,
      stabilityForecast: 'stable',
      fingerprint: crypto.randomUUID().slice(0, 6),
      state: 'HEALTHY',
      activeSLA: 'BALANCED',
      stabilityIndex: 1,
      retryImpactScore: 0,
      rateLimitPressure: 0,
      keyAgeScore: 1,
      latencyBreakdown: { ttft: 0, total: 0, tokensPerSec: 0 },
      coldStartLatency: 0,
      warmStartLatency: 0,
      throughputHistory: [],
      errorBreakdown: { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0, provider: 0 },
      estimatedCost: 0,
      tokenEfficiency: 1,
      quality: { score: 1, semanticDrift: 0, instructionFollowing: 1, structureConsistency: 1 },
      contextUtilization: 0,
      retentionCurve: [],
      streaming: {},
      userPreferenceScore: 0.5,
      manualSwitches: 0,
      cancellations: 0,
      traces: [],
      fourSignals: { latency: 0, throughput: 0, errorRate: 0, saturation: 0 },
      rules: structuredClone(CONFIG.keys.defaultRules),
      learning: {
        specialization: [],
        performanceByTask: {},
        taskMatrix: {},
        advisorInsights: { recommendedFor: [], avoidFor: [], confidence: 0 },
        lastFiveResults: [],
      },
      currentConcurrentRequests: 0,
      usageToday: { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 },
      usageMonthly: { tokens: 0, requests: 0, estimatedCost: 0 },
      alerts: [],
      lastUsageDate: new Date().toDateString(),
      hourlyUsage: new Array(24).fill(0),
    };
  }
}
