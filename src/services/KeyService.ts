import type { SecurityService } from '../core/SecurityService';
import type { PricingService } from './PricingService';
import type { DatabaseService } from '../core/DatabaseService';
import { dexieDb } from '../core/DatabaseService';
import { EVENTS } from '../core/events';

const STORAGE_KEY = 'super_agents_api_keys';

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

export class KeyService {
  private deps!: { eventBus: any; securityService: SecurityService; pricingService: PricingService; database: DatabaseService };
  private keys: ApiKey[] = [];
  private unsubs: Array<() => void> = [];
  private freeTierLimits: Record<string, FreeTierLimit> = { ...DEFAULT_FREE_TIER_LIMITS };

  constructor(deps?: { eventBus: any; securityService: SecurityService; pricingService: PricingService; database: DatabaseService }) {
    if (deps) this.deps = deps;
    this.keys = this.getDefaultKeys();
  }

  async init() {
    if (!this.deps) return;
    this.notify();
    await this.loadConfig();
    await this.loadKeys();
    this.setupListeners();
  }

  private async loadConfig() {
    try {
      const saved = await this.deps.database.getKv<Record<string, FreeTierLimit>>('global_free_tier_limits');
      if (saved) this.freeTierLimits = saved;
    } catch (e) {
      console.warn('[KeyService] Failed to load global limits', e);
    }
  }

  private async saveConfig() {
    try {
      await this.deps.database.setKv('global_free_tier_limits', this.freeTierLimits);
    } catch (e) {
      console.error('[KeyService] Failed to save global limits', e);
    }
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.KEY_ADDED, (data: any) => this.addKey(data)),
      this.deps.eventBus.on(EVENTS.KEY_REMOVED, (id: string) => this.removeKey(id)),
      this.deps.eventBus.on(EVENTS.MESSAGE_RESPONSE, (res: any) => {
        this.updateMetricsFromResponse(res);
      }),
      this.deps.eventBus.on('key:compromise-signal', (data: any) => {
        const d = data as { id?: string; fingerprint?: string; source?: string };
        if (d.id) this.quarantineKey(d.id, d.source || 'external signal');
        else if (d.fingerprint) this.quarantineByFingerprint(d.fingerprint, d.source || 'external signal');
      })
    );
  }

  private async updateMetricsFromResponse(res: { keyId?: string; provider: string; status: string; error?: string; latency?: number; ttft?: number; tokens?: number | { total?: number }; tps?: number }) {
    const key = res.keyId 
      ? this.keys.find(k => k.id === res.keyId)
      : this.keys.find(k => k.provider.toLowerCase() === res.provider.toLowerCase());
      
    if (!key || !key.stats || !key.stats.extended) return;

    const ext = key.stats.extended!;
    
    // Ensure nested objects exist (robustness against old storage versions)
    if (!ext.usageToday) ext.usageToday = { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 };
    if (!ext.usageMonthly) ext.usageMonthly = { tokens: 0, requests: 0, estimatedCost: 0 };
    if (!ext.latencyBreakdown) ext.latencyBreakdown = { ttft: 0, total: 0, tokensPerSec: 0 };
    if (!ext.errorBreakdown) ext.errorBreakdown = { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0, provider: 0 };
    if (!ext.fourSignals) ext.fourSignals = { latency: 0, throughput: 0, errorRate: 0, saturation: 0 };
    if (!ext.rules) ext.rules = { maxConcurrentRequests: 5, retryPolicy: { maxAttempts: 3, backoffMs: 1000 }, timeoutMs: 30000, quota: { tokensPerDay: 1000000, requestsPerDay: 1000 }, slaThresholds: { latencyP95: 2000, errorFloor: 0.05 } };

    if (res.status === 'error') {
      key.stats.errorCount++;
      const errorMsg = res.error || 'Unknown error';
      
      // Detect Rate Limit / Quota issues
      const isRateLimit = errorMsg.includes('429') || 
                         errorMsg.toLowerCase().includes('quota') || 
                         errorMsg.toLowerCase().includes('rate limit');

      if (isRateLimit) {
        this.addAlert(key.id, {
          type: 'rate_limit',
          severity: 'medium',
          message: `Provider ${key.provider} quota exhausted (429)`
        });
        this.check429Spike(key.id);
        this.transitionState(key.id, 'DEGRADED');
        key.status = 'inactive';
        this.deps.eventBus.emit(EVENTS.KEY_QUOTA_EXCEEDED, { id: key.id, provider: key.provider, quotaType: 'requests' });
        const backoffMs = this.getBackoffMs(key.id);
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
          message: `${key.provider} hit 429 — retrying in ${Math.round(backoffMs / 1000)}s (exponential backoff)`,
          type: 'warning',
        });
        setTimeout(() => {
          this.deps.eventBus.emit(EVENTS.CHECK_HEALTH, key.id);
        }, backoffMs);
      }

      this.handleProviderError(key.id, errorMsg);
      ext.errorBreakdown!.provider = (ext.errorBreakdown!.provider ?? 0) + 1;
    } else if (res.status === 'done') {
      key.stats.successCount++;
      
      // Update Latency
      if (res.latency) {
        key.stats.avgLatency = (key.stats.avgLatency * (key.stats.successCount - 1) + res.latency) / key.stats.successCount;
        key.latency = res.latency;
        ext.latencyBreakdown.total = res.latency;
        if (res.ttft) ext.latencyBreakdown.ttft = res.ttft;
      }

      // Update Tokens & Cost
      if (res.tokens) {
        const tokens = typeof res.tokens === 'number' ? res.tokens : (res.tokens?.total || 0);
        key.stats.totalTokens += tokens;
        ext.usageToday.tokens += tokens;
        
        // Calculate Cost (Estimated $0.01 per 1k tokens for simplicity, or can be model-specific)
        const cost = (tokens / 1000) * 0.01;
        ext.estimatedCost += cost;
        ext.usageToday.estimatedCost += cost;
      }

      // Update TPS
      if (res.tps) ext.latencyBreakdown.tokensPerSec = res.tps;

      // Update Throughput History (last 20 entries)
      const tokensCount = typeof res.tokens === 'number' ? res.tokens : (res.tokens?.total || 0);
      ext.throughputHistory = [...(ext.throughputHistory || []), {
        timestamp: Date.now(),
        latency: res.latency || 0,
        tokens: tokensCount
      }].slice(-20);

      // Recalculate Reputation
      this.calculateReputation(key);
    }

    await this.saveKeys();
    this.notify();
  }

  private calculateReputation(key: ApiKey) {
    if (!key.stats?.extended) return;
    const stats = key.stats;
    const ext = key.stats.extended;

    const successRate = stats.successCount / (stats.successCount + stats.errorCount || 1);
    const latencyFactor = Math.max(0, 1 - (stats.avgLatency / 5000)); // 5s is floor
    
    const prevScore = ext.reputationScore;
    ext.reputationScore = Math.floor((successRate * 0.7 + latencyFactor * 0.3) * 100);
    
    if (ext.reputationScore < 40) ext.state = 'DEGRADED';
    else if (ext.reputationScore < 80) ext.state = 'UNSTABLE';
    else ext.state = 'HEALTHY';

    if (prevScore && Math.abs(ext.reputationScore - prevScore) > 20) {
      this.deps.eventBus.emit('key:reputation-threshold-crossed', { id: key.id, provider: key.provider, score: ext.reputationScore });
    }
  }

  private async loadKeys() {
    try {
      const saved = await this.deps.database.apiKeys.toArray();
      let loaded: ApiKey[];
      if (saved && saved.length > 0) {
        loaded = saved.map(k => {
          const stats = k.stats || this.initStats();
          if (!stats.extended) stats.extended = this.initExtendedStats();
          return {
            ...k,
            stats
          };
        });
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const saved = JSON.parse(stored);
          loaded = saved.map((k: { id: string; provider: string; key: string; label: string; status: string; stats?: ApiKey['stats'] }) => {
            const stats = k.stats || this.initStats();
            if (!stats.extended) stats.extended = this.initExtendedStats();
            return {
              ...k,
              stats
            };
          });
          await this.deps.database.apiKeys.bulkAdd(loaded);
          localStorage.removeItem(STORAGE_KEY);
        } else {
          loaded = this.getDefaultKeys();
          await this.deps.database.apiKeys.bulkAdd(loaded);
        }
      }
      this.keys.length = 0;
      this.keys.push(...loaded);
    } catch (e) {
      console.warn('[KeyService] Failed to load API keys:', e);
      this.deps.eventBus.emit('system:notification', { message: 'Failed to load API keys, using defaults', type: 'error' });
      this.keys.length = 0;
      this.keys.push(...this.getDefaultKeys());
    }
    this.notify();
  }

  async unlock(password: string): Promise<boolean> {
    const ok = await this.deps.securityService.initialize(password);
    if (!ok) return false;

    // Decrypt all encrypted keys in memory
    const decryptedKeys = await Promise.all(this.keys.map(async k => {
      if (k.isEncrypted && k.key) {
        const decrypted = await this.deps.securityService.decrypt(k.key);
        if (decrypted) {
          return { ...k, key: decrypted, isEncrypted: false };
        }
      }
      return k;
    }));

    this.keys.length = 0;
    this.keys.push(...decryptedKeys);
    this.notify();
    return true;
  }

  private async saveKeys() {
    try {
      const isLocked = this.deps.securityService.isLocked();
      
      const keysToSave = await Promise.all(this.keys.map(async k => {
        // If vault is unlocked and key is plaintext, encrypt it before saving
        if (!isLocked && k.key && !k.isEncrypted) {
          const encrypted = await this.deps.securityService.encrypt(k.key);
          if (encrypted) {
            return { ...k, key: encrypted, isEncrypted: true };
          }
        }
        
        // CRITICAL (Audit P0): If vault is locked, we MUST NOT save a plaintext key to DB
        if (isLocked && k.key && !k.isEncrypted) {
          console.warn(`[KeyService] Refusing to save plaintext key for ${k.provider} while vault is locked.`);
          // We return the key WITHOUT the secret 'key' field to prevent plaintext leak
          const { key: _, ...rest } = k;
          return { ...rest, key: '', isEncrypted: false } as ApiKey;
        }
        
        return k;
      }));
      
      await this.deps.database.apiKeys.bulkPut(keysToSave);
    } catch (e) {
      console.error('[KeyService] Failed to save keys to DB', e);
    }
  }

  private getDefaultKeys(): ApiKey[] {
    return [
      { id: '1', provider: 'OpenRouter', key: '', label: 'OpenRouter Main', status: 'inactive', stats: this.initStats() },
      { id: '2', provider: 'Gemini', key: '', label: 'Gemini Pro', status: 'inactive', stats: this.initStats() },
      { id: '3', provider: 'Groq', key: '', label: 'Groq Cloud', status: 'inactive', stats: this.initStats() },
      { id: '4', provider: 'NVIDIA', key: '', label: 'NVIDIA API', status: 'inactive', stats: this.initStats() },
      { id: '5', provider: 'Cerebras', key: '', label: 'Cerebras API', status: 'inactive', stats: this.initStats() },
      { id: '6', provider: 'Cloudflare', key: '', label: 'Cloudflare Workers AI', status: 'inactive', stats: this.initStats() },
    ];
  }

  private initStats() {
    return { 
      successCount: 0, 
      errorCount: 0, 
      totalTokens: 0, 
      avgLatency: 0, 
      minLatency: 0, 
      maxLatency: 0,
      extended: this.initExtendedStats()
    };
  }
  private initExtendedStats(): KeyExtendedStats {
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
      contextUtilization: 0,
      retentionCurve: [],
      userPreferenceScore: 0.5,
      manualSwitches: 0,
      cancellations: 0,

      traces: [],
      fourSignals: { latency: 0, throughput: 0, errorRate: 0, saturation: 0 },

      rules: {
        maxConcurrentRequests: 5,
        retryPolicy: { maxAttempts: 3, backoffMs: 1000 },
        timeoutMs: 30000,
        quota: { tokensPerDay: 1000000, requestsPerDay: 1000 },
        slaThresholds: { latencyP95: 2000, errorFloor: 0.05 }
      },
      learning: {
        specialization: [],
        performanceByTask: {},
        taskMatrix: {},
        advisorInsights: { recommendedFor: [], avoidFor: [], confidence: 0 },
        lastFiveResults: []
      },
      currentConcurrentRequests: 0,
      usageToday: { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 },
      usageMonthly: { tokens: 0, requests: 0, estimatedCost: 0 },
      alerts: [],
      lastUsageDate: new Date().toDateString()
    };
  }

  async unlockVault(password: string): Promise<boolean> {
    const ok = await securityService.initialize(password);
    if (!ok) return false;

    const newKeys = [...this.keys];
    let fail = false;
    for (const k of newKeys) {
      if (k.isEncrypted) {
        const decrypted = await securityService.decrypt(k.key);
        if (decrypted) {
          k.key = decrypted;
          k.isEncrypted = false;
        } else {
          fail = true;
          break;
        }
      }
    }

    if (fail) {
      securityService.lock();
      return false;
    }

    this.keys = newKeys;
    this.notify();
    return true;
  }

  private notify() {
    this.deps.eventBus.emit(EVENTS.KEY_UPDATED, [...this.keys]);
  }

  getFreeTierLimits(): Record<string, FreeTierLimit> {
    return { ...this.freeTierLimits };
  }

  setFreeTierLimit(provider: string, limit: FreeTierLimit) {
    this.freeTierLimits[provider] = limit;
    this.saveConfig();
  }

  getKeys() {
    return this.keys;
  }

  async addKey(data: Omit<ApiKey, 'id' | 'stats'>) {
    // Check for duplicates
    const isDuplicate = this.keys.some(k => k.key === data.key && k.provider === data.provider);
    if (isDuplicate) {
      eventBus.emit(EVENTS.NOTIFICATION, { 
        message: `Key already configured for provider ${data.provider}`, 
        type: 'error' 
      });
      return;
    }

    let keyToStore = data.key;
    let encrypted = false;

    if (this.deps.securityService.isLocked()) {
      eventBus.emit(EVENTS.NOTIFICATION, { 
        message: `Vault is locked. Please unlock to add new keys securely.`, 
        type: 'error' 
      });
      return;
    }

    const enc = await this.deps.securityService.encrypt(data.key);
    if (!enc) {
      eventBus.emit(EVENTS.NOTIFICATION, { 
        message: `Encryption failed. Key was not added.`, 
        type: 'error' 
      });
      return;
    }

    keyToStore = enc;
    encrypted = true;

    const inferredTags: string[] = [];
    const labelLower = data.label.toLowerCase();
    if (/\b(prod|production)\b/.test(labelLower)) inferredTags.push('env:production');
    if (/\b(dev|development)\b/.test(labelLower)) inferredTags.push('env:development');
    if (/\b(staging|stage)\b/.test(labelLower)) inferredTags.push('env:staging');
    if (/\b(test|testing)\b/.test(labelLower)) inferredTags.push('env:test');
    if (/\bfree\b/.test(labelLower)) inferredTags.push('tier:free');

    const newKey: ApiKey = {
      ...data,
      key: keyToStore,
      isEncrypted: encrypted,
      tags: [...(data.tags || []), ...inferredTags],
      id: crypto.randomUUID().slice(0, 8),
      stats: this.initStats()
    };
    this.applyFreeTierQuota(newKey);
    this.keys.push(newKey);
    await this.saveKeys();
    this.notify();
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Key for ${data.provider} added`, type: 'success' });
    
    setTimeout(() => {
      eventBus.emit(EVENTS.CHECK_HEALTH, newKey.id);
    }, 1000);
  }

  async removeKey(id: string) {
    this.keys = this.keys.filter(k => k.id !== id);
    await this.saveKeys();
    this.notify();
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Key removed`, type: 'info' });
  }

  async setGlobalSLA(mode: string) {
    this.keys.forEach(k => this.applySLA(k, mode));
    await this.saveKeys();
    
    import('../core/Kernel').then(({ kernel }) => {
      kernel.setSLAMode(mode as SLAMode);
    });

    this.notify();
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Global SLA set to ${mode}`, type: 'success' });
  }

  async setSLA(id: string, mode: string) {
    const key = this.keys.find(k => k.id === id);
    if (key) {
      this.applySLA(key, mode);
      await this.saveKeys();
      this.notify();
      eventBus.emit(EVENTS.NOTIFICATION, { message: `${key.provider} SLA set to ${mode}`, type: 'info' });
    }
  }

  private applySLA(key: ApiKey, mode: string) {
    if (!key.stats?.extended) return;
    const ext = key.stats.extended;
    ext.activeSLA = mode as SLAMode;
    
    if (mode === 'LOW_LATENCY') {
      ext.rules.timeoutMs = 5000;
      ext.rules.slaThresholds.latencyP95 = 1200;
    } else if (mode === 'HIGH_QUALITY') {
      ext.rules.timeoutMs = 60000;
      ext.rules.slaThresholds.latencyP95 = 5000;
    } else if (mode === 'FREE_FIRST') {
      ext.rules.timeoutMs = 60000;
      ext.rules.slaThresholds.latencyP95 = 5000;
    } else {
      ext.rules.timeoutMs = 30000;
      ext.rules.slaThresholds.latencyP95 = 2000;
    }
  }

  updateKeyStatus(id: string, status: ApiKey['status'], latency?: number) {
    const key = this.keys.find(k => k.id === id);
    if (key) {
      key.status = status;
      if (latency !== undefined) key.latency = latency;
      this.saveKeys();
      this.notify();
    }
  }

  updateAvailableModels(id: string, models: string[]) {
    const key = this.keys.find(k => k.id === id);
    if (key) {
      key.availableModels = models;
      this.saveKeys();
      this.notify();
    }
  }

  recordUsage(keyIdOrProvider: string, latency: number, tokens: number = 0, model?: string, extra?: Record<string, unknown>) {
    const key = this.keys.find(k => (k.id === keyIdOrProvider || k.provider.toLowerCase() === keyIdOrProvider.toLowerCase()) && k.status === 'active');
    if (!key) return;

    if (!key.stats) key.stats = this.initStats();
    if (!key.stats.extended) key.stats.extended = this.initExtendedStats();
    
    const stats = key.stats;
    const ext = key.stats.extended;
    
    // Ensure nested objects exist (robustness against old storage versions)
    if (!ext.usageToday) ext.usageToday = { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 };
    if (!ext.usageMonthly) ext.usageMonthly = { tokens: 0, requests: 0, estimatedCost: 0 };
    if (!ext.latencyBreakdown) ext.latencyBreakdown = { ttft: 0, total: 0, tokensPerSec: 0 };
    if (!ext.errorBreakdown) ext.errorBreakdown = { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0, provider: 0 };
    if (!ext.fourSignals) ext.fourSignals = { latency: 0, throughput: 0, errorRate: 0, saturation: 0 };
    if (!ext.rules) ext.rules = { maxConcurrentRequests: 5, retryPolicy: { maxAttempts: 3, backoffMs: 1000 }, timeoutMs: 30000, quota: { tokensPerDay: 1000000, requestsPerDay: 1000 }, slaThresholds: { latencyP95: 2000, errorFloor: 0.05 } };

    const extExtra = extra as { tps?: number; ttft?: number; fullContent?: string; inputTokens?: number; outputTokens?: number; task?: string } | undefined;
    const tps = extExtra?.tps || 0;

    stats.successCount++;
    stats.totalTokens += tokens;
    if (model) stats.lastModel = model;
    
    if (stats.minLatency === 0 || latency < stats.minLatency) stats.minLatency = latency;
    if (latency > stats.maxLatency) stats.maxLatency = latency;

    stats.avgLatency = stats.avgLatency === 0 
      ? latency 
      : Math.round((stats.avgLatency * 0.7) + (latency * 0.3));

    if (ext.coldStartLatency === 0) ext.coldStartLatency = latency;
    else ext.warmStartLatency = (ext.warmStartLatency * 0.8) + (latency * 0.2);
    
    if (latency > ext.warmStartLatency * 2 && ext.warmStartLatency > 0) {
      eventBus.emit(EVENTS.KEY_LATENCY_BURST, { id: key.id, provider: key.provider, latency });
    }

    ext.latencyBreakdown = {
      ttft: extExtra?.ttft ?? latency * 0.4,
      total: latency,
      tokensPerSec: tps
    };

    ext.rateLimitPressure = (ext.rateLimitPressure * 0.8) + (ext.currentConcurrentRequests / ext.rules.maxConcurrentRequests * 0.2);
    ext.stabilityIndex = Math.min(1.0, (ext.stabilityIndex * 0.95) + (latency < ext.rules.timeoutMs ? 0.05 : 0));

    const today = new Date().toDateString();
    const lastUpdate = ext.lastUsageDate;
    const currentMonth = new Date().getMonth();
    const lastMonthUpdate = ext.lastUsageDate ? new Date(ext.lastUsageDate).getMonth() : -1;

    if (lastUpdate !== today) {
      ext.usageToday = { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 };
      ext.lastUsageDate = today;
    }

    if (currentMonth !== lastMonthUpdate) {
      ext.usageMonthly = { tokens: 0, requests: 0, estimatedCost: 0 };
    }

    ext.usageToday.tokens += tokens;
    ext.usageToday.requests += 1;
    ext.usageMonthly.tokens += tokens;
    ext.usageMonthly.requests += 1;

    // Advanced Cost calculation
    const inputTokens = extExtra?.inputTokens || Math.round(tokens * 0.3); // fallback estimate
    const outputTokens = extExtra?.outputTokens || tokens;
    const sessionCost = pricingService.calculateCost(model || key.stats.lastModel || 'default', inputTokens, outputTokens);
    
    ext.estimatedCost += sessionCost;
    ext.usageToday.estimatedCost += sessionCost;
    ext.usageMonthly.estimatedCost += sessionCost;

    // Quota Alerts
    this.checkQuotas(key);

    ext.fourSignals.latency = (ext.fourSignals.latency * 0.9) + (latency * 0.1);
    ext.fourSignals.throughput = (ext.fourSignals.throughput * 0.7) + (tps * 0.3);
    ext.fourSignals.saturation = ext.currentConcurrentRequests / ext.rules.maxConcurrentRequests;
    
    this.saveKeys();
    this.notify();
  }

  private checkQuotas(key: ApiKey) {
    if (!key.stats?.extended) return;
    const ext = key.stats.extended;
    const rules = ext.rules.quota;
    const usage = ext.usageToday;

    // Daily Token Quota
    if (usage.tokens > rules.tokensPerDay) {
      this.addAlert(key.id, {
        type: 'quota_exceeded',
        severity: 'critical',
        message: `Daily token quota exceeded (${usage.tokens}/${rules.tokensPerDay})`
      });
      this.transitionState(key.id, 'UNSTABLE');
      eventBus.emit('key:quota-exceeded' as keyof EventMap, { id: key.id, provider: key.provider, quotaType: 'tokens' });
    } else if (usage.tokens > rules.tokensPerDay * 0.8) {
      this.addAlert(key.id, {
        type: 'quota_warning',
        severity: 'medium',
        message: `Daily token quota at 80% (${usage.tokens}/${rules.tokensPerDay})`
      });
    } else if (usage.tokens > rules.tokensPerDay * 0.9) {
      this.addAlert(key.id, {
        type: 'quota_warning',
        severity: 'high',
        message: `Daily token quota at 90% (${usage.tokens}/${rules.tokensPerDay})`
      });
    }

    // Daily Request Quota
    if (usage.requests > rules.requestsPerDay) {
      this.addAlert(key.id, {
        type: 'quota_exceeded',
        severity: 'critical',
        message: `Daily request quota exceeded (${usage.requests}/${rules.requestsPerDay})`
      });
      this.transitionState(key.id, 'UNSTABLE');
    } else if (usage.requests > rules.requestsPerDay * 0.9) {
      this.addAlert(key.id, {
        type: 'quota_warning',
        severity: 'high',
        message: `Daily request quota at 90% (${usage.requests}/${rules.requestsPerDay})`
      });
    } else if (usage.requests > rules.requestsPerDay * 0.8) {
      this.addAlert(key.id, {
        type: 'quota_warning',
        severity: 'medium',
        message: `Daily request quota at 80% (${usage.requests}/${rules.requestsPerDay})`
      });
    }

    // Monthly Budget
    if (rules.monthlyBudget && ext.usageMonthly.estimatedCost > rules.monthlyBudget) {
      this.addAlert(key.id, {
        type: 'quota_exceeded',
        severity: 'critical',
        message: `Monthly budget exceeded ($${ext.usageMonthly.estimatedCost.toFixed(2)}/$${rules.monthlyBudget})`
      });
      eventBus.emit('key:quota-exceeded' as keyof EventMap, { id: key.id, provider: key.provider, quotaType: 'tokens' });
    }
  }

  private rateLimitHistory: Map<string, number[]> = new Map();
  private retryCounts: Map<string, number> = new Map();
  private rotationTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  setKeyTTL(id: string, ttlHours: number) {
    const existing = this.rotationTimers.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      const key = this.keys.find(k => k.id === id);
      if (key) {
        key.status = 'inactive';
        this.addAlert(key.id, {
          type: 'quota_exceeded',
          severity: 'high',
          message: `Key "${key.label}" TTL expired after ${ttlHours}h — rotation needed`,
        });
        eventBus.emit(EVENTS.NOTIFICATION, {
          message: `Key "${key.label}" TTL expired — rotation needed`,
          type: 'warning',
        });
        this.saveKeys();
        this.notify();
      }
      this.rotationTimers.delete(id);
    }, ttlHours * 3600000);
    this.rotationTimers.set(id, timer);
  }

  clearKeyTTL(id: string) {
    const timer = this.rotationTimers.get(id);
    if (timer) clearTimeout(timer);
    this.rotationTimers.delete(id);
  }

  private getBackoffMs(keyId: string): number {
    const retries = this.retryCounts.get(keyId) || 0;
    this.retryCounts.set(keyId, retries + 1);
    const baseMs = 15000;
    const maxMs = 300000;
    const backoff = Math.min(baseMs * Math.pow(2, retries), maxMs);
    return backoff;
  }

  private resetRetryCount(keyId: string) {
    this.retryCounts.delete(keyId);
  }

  private check429Spike(keyId: string) {
    const now = Date.now();
    const window = now - 60000;
    const timestamps = (this.rateLimitHistory.get(keyId) || []).filter(t => t > window);
    timestamps.push(now);
    this.rateLimitHistory.set(keyId, timestamps);
    if (timestamps.length >= 3) {
      const key = this.keys.find(k => k.id === keyId);
      if (key) {
        this.addAlert(keyId, {
          type: 'quota_exceeded',
          severity: 'high',
          message: `429 spike: ${timestamps.length} rate limits in 60s on ${key.provider}`
        });
      }
    }
  }

  private addAlert(keyId: string, alert: { type: string; severity: string; message: string }) {
    const key = this.keys.find(k => k.id === keyId);
    if (!key || !key.stats || !key.stats.extended) return;

    const id = crypto.randomUUID().slice(0, 8);
    const newAlert: ProviderAlert = {
      id,
      type: alert.type as ProviderAlert['type'],
      severity: alert.severity as ProviderAlert['severity'],
      message: alert.message,
      timestamp: Date.now(),
      resolved: false
    };

    // Only add if not duplicate within last hour
    const lastHour = Date.now() - 3600000;
    const isDuplicate = key.stats.extended.alerts.some(a => 
      a.type === alert.type && 
      a.timestamp > lastHour && 
      !a.resolved
    );

    if (!isDuplicate) {
      key.stats.extended.alerts = [newAlert, ...key.stats.extended.alerts].slice(0, 10);
      eventBus.emit(EVENTS.NOTIFICATION, { message: alert.message, type: alert.severity === 'critical' ? 'error' : 'warning' });
    }
  }

  updateKey(id: string, data: Partial<ApiKey>) {
    const key = this.keys.find(k => k.id === id);
    if (key) {
      Object.assign(key, data);
      this.saveKeys();
      this.notify();
    }
  }

  getAlerts(): ProviderAlert[] {
    const alerts: ProviderAlert[] = [];
    for (const key of this.keys) {
      if (key.stats?.extended?.alerts) {
        alerts.push(...key.stats.extended.alerts.filter(a => !a.resolved));
      }
    }
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  resolveAlert(alertId: string) {
    for (const key of this.keys) {
      const alert = key.stats?.extended?.alerts?.find(a => a.id === alertId);
      if (alert) {
        alert.resolved = true;
        this.saveKeys();
        return;
      }
    }
  }

  handleProviderError(keyId: string, error: string) {
    const key = this.keys.find(k => k.id === keyId);
    if (key) {
      key.status = 'error';
      key.stats.lastError = { message: error, timestamp: new Date().toISOString() };
      
      eventBus.emit(EVENTS.NOTIFICATION, { 
        message: `Error ${key.provider}: ${error.substring(0, 60)}...`, 
        type: 'error' 
      });
    }
  }

  canUseKey(id: string): { can: boolean; reason?: string } {
    const key = this.keys.find(k => k.id === id);
    if (!key || key.status !== 'active') return { can: false, reason: 'Key inactive' };
    const ext = key.stats.extended;
    if (!ext) return { can: true };
    if (ext.currentConcurrentRequests >= ext.rules.maxConcurrentRequests) return { can: false, reason: 'Max concurrency' };
    return { can: true };
  }

  private applyFreeTierQuota(key: ApiKey) {
    const limits = this.freeTierLimits[key.provider];
    if (!limits || limits.requestsPerDay === 0) return;
    if (!key.stats?.extended) return;
    const tags = key.tags ?? [];
    const isFree = tags.some(t => t === 'tier:free') || key.label.toLowerCase().includes('free');
    if (isFree) {
      key.stats.extended.rules.quota.requestsPerDay = limits.requestsPerDay;
      key.stats.extended.rules.quota.tokensPerDay = limits.tokensPerDay;
    }
  }

  private poolIndex: Record<string, number> = {};

  async fingerprintKey(apiKey: string): Promise<string> {
    const normalized = apiKey.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async findDuplicateFingerprints(keys: string[]): Promise<Map<string, string[]>> {
    const existing = new Set<string>();
    for (const k of this.keys) {
      existing.add(await this.fingerprintKey(k.key));
    }
    const batchFingerprints = new Map<string, string[]>();
    for (const key of keys) {
      const fp = await this.fingerprintKey(key);
      const existingBatch = batchFingerprints.get(fp) || [];
      existingBatch.push(key);
      batchFingerprints.set(fp, existingBatch);
    }
    const duplicates = new Map<string, string[]>();
    for (const [fp, batchKeys] of batchFingerprints) {
      if (batchKeys.length > 1 || existing.has(fp)) {
        duplicates.set(fp, batchKeys);
      }
    }
    return duplicates;
  }

  getPoolKeys(provider: string): ApiKey[] {
    return this.keys.filter(k =>
      k.provider.toLowerCase() === provider.toLowerCase() &&
      k.status === 'active'
    );
  }

  selectFromPool(provider: string, strategy: 'round-robin' | 'least-usage' | 'random' = 'round-robin'): ApiKey | null {
    const pool = this.getPoolKeys(provider).filter(k => this.canUseKey(k.id).can);
    if (pool.length === 0) return null;

    switch (strategy) {
      case 'round-robin': {
        const key = provider.toLowerCase();
        const idx = (this.poolIndex[key] ?? 0) % pool.length;
        this.poolIndex[key] = idx + 1;
        return pool[idx];
      }
      case 'least-usage': {
        return pool.sort((a, b) => (a.stats?.successCount || 0) - (b.stats?.successCount || 0))[0];
      }
      case 'random': {
        return pool[Math.floor(Math.random() * pool.length)];
      }
    }
  }

  getPoolStatus(provider: string): { total: number; active: number; used: number; limit: number } {
    const pool = this.getPoolKeys(provider);
    const limit = this.freeTierLimits[provider]?.requestsPerDay || 0;
    const used = pool.reduce((sum, k) => sum + (k.stats?.extended?.usageToday?.requests || 0), 0);
    return { total: this.keys.filter(k => k.provider.toLowerCase() === provider.toLowerCase()).length, active: pool.length, used, limit };
  }

  incrementConcurrency(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (key?.stats?.extended) {
      key.stats.extended.currentConcurrentRequests++;
      this.notify();
    }
  }

  decrementConcurrency(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (key?.stats?.extended) {
      key.stats.extended.currentConcurrentRequests = Math.max(0, key.stats.extended.currentConcurrentRequests - 1);
      this.notify();
    }
  }

  transitionState(id: string, newState: import('../types/metrics').KeyState) {
    const key = this.keys.find(k => k.id === id);
    if (!key || !key.stats || !key.stats.extended) return;
    const oldState = key.stats.extended.state;
    if (oldState === newState) return;
    key.stats.extended.state = newState;
    eventBus.emit(EVENTS.KEY_STATE_CHANGED, { id: key.id, provider: key.provider, state: newState, previousState: oldState });
    this.notify();
  }

  async addNote(keyId: string, text: string, type: KeyNote['type'] = 'admin', author: string = 'Operator') {
    const id = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const key = this.keys.find(k => k.id === keyId);
    if (key) {
      key.notes = [...(key.notes || []), { id, keyId, text, type, author, timestamp }];
    }
  }

  async deleteNote(keyId: string, noteId: string) {
    const key = this.keys.find(k => k.id === keyId);
    if (key && key.notes) {
      key.notes = key.notes.filter(n => n.id !== noteId);
      this.notify();
    }
  }

  async loadNotes(keyId: string) {
    try {
      const saved = await dexieDb.apiKeys.where('id').equals(keyId).first();
      if (saved && (saved as unknown as { notes?: KeyNote[] }).notes) {
        const key = this.keys.find(k => k.id === keyId);
        if (key) key.notes = (saved as unknown as { notes?: KeyNote[] }).notes;
      }
    } catch (e) {
      console.warn(`[KeyService] Failed to load notes for key ${keyId}:`, e);
    }
    this.notify();
  }

  async refreshModels(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (!key || !key.key) return;

    try {
      this.updateKeyStatus(id, 'checking');
      const { adapterRegistry } = await import('./providers/AdapterRegistry');
      const adapter = adapterRegistry.getAdapter(key.provider);
      
      if (adapter && 'getAvailableModels' in adapter) {
        const models = await (adapter as { getAvailableModels(apiKey: string): Promise<string[]> }).getAvailableModels(key.key);
        if (Array.isArray(models) && models.length > 0) {
          this.updateAvailableModels(id, models);
          eventBus.emit(EVENTS.NOTIFICATION, { message: `Found ${models.length} models for ${key.provider}`, type: 'success' });
        }
      } else {
        // Fallback for adapters without dynamic discovery
        const defaults: Record<string, string[]> = {
          'OpenRouter': ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-405b'],
          'Gemini': ['gemini-1.5-pro', 'gemini-1.5-flash'],
          'Groq': ['llama3-70b-8192', 'mixtral-8x7b-32768'],
          'NVIDIA': ['nvidia/llama-3.1-405b-instruct'],
          'Cerebras': ['cerebras-gpt-3.5'],
          'Cloudflare': ['@cf/meta/llama-3.3-70b-instruct-fp8-fast']
        };
        const models = defaults[key.provider] || [];
        this.updateAvailableModels(id, models);
      }
      this.updateKeyStatus(id, 'active');
    } catch (e: unknown) {
      this.updateKeyStatus(id, 'error');
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Failed to refresh models: ${e instanceof Error ? e.message : String(e)}`, type: 'error' });
    }
  }

  async runBenchmark(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (!key || key.status !== 'active') return;

    const testPrompts = [
      "Say 'Hello World' in exactly 2 words.",
      "Write a JSON object with 5 keys describing a spaceship.",
      "Explain quantum entanglement to a 5-year old in 3 sentences."
    ];

    eventBus.emit(EVENTS.NOTIFICATION, { message: `Starting benchmark for ${key.provider}...`, type: 'info' });
    
    for (const prompt of testPrompts) {
      const startTime = Date.now();
      try {
        const { adapterRegistry } = await import('./providers/AdapterRegistry');
        const adapter = adapterRegistry.getAdapter(key.provider);
        const model = key.availableModels?.[0] || 'default';
        
        const res = await adapter!.sendMessage([{ role: 'user', content: prompt }], model, key.key);
        const latency = Date.now() - startTime;
        
        this.recordUsage(key.id, latency, estimateTokens(res.content), model, {
          task: 'benchmark',
          fullContent: res.content,
          ttft: Math.min(latency, Math.max(50, latency * 0.3))
        });
      } catch (e) {
        console.warn('[KeyService] Benchmark step failed:', e);
        eventBus.emit('system:notification', { message: 'Benchmark step failed', type: 'error' });
      }
    }
    
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Benchmark for ${key.provider} completed`, type: 'success' });
  }

  async runAdvisor(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (!key) return;
    const mod = await import('./AdvisorService');
    eventBus.emit('trace:updated', [{
      id: `advisor-${crypto.randomUUID().slice(0, 8)}`,
      traceId: `advisor-${crypto.randomUUID().slice(0, 8)}`,
      startTime: Date.now(),
      input: `Advisor analysis for ${key.label}`,
      status: 'completed',
      steps: [],
      decisionGraph: { nodes: [], edges: [] },
      totalLatency: key.stats?.avgLatency || 800,
      totalTokens: 0,
      estimatedCost: 0,
      semanticConfidence: (key.stats?.extended?.reputationScore || 100) / 100,
    }]);
    this.notify();
    const suggestions = mod.advisorService.getSuggestions().filter((s: { targetNodeId?: string }) => s.targetNodeId === id);
    if (suggestions.length > 0) {
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Advisor: ${suggestions.length} suggestion(s) for ${key.label}`, type: 'info' });
    } else {
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Advisor: No suggestions for ${key.label}`, type: 'success' });
    }
  }

  async toggleKeyStatus(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (key) {
      key.status = key.status === 'inactive' ? 'active' : 'inactive';
      await this.saveKeys();
      this.notify();
    }
  }

  async enableAllKeys() {
    this.keys.forEach(k => k.status = 'active');
    await this.saveKeys();
    this.notify();
  }

  async disableAllKeys() {
    this.keys.forEach(k => k.status = 'inactive');
    await this.saveKeys();
    this.notify();
  }

  async exportKeys(): Promise<string> {
    const isLocked = this.deps.securityService.isLocked();
    const exportData = await Promise.all(this.keys.map(async k => {
      let keyVal = k.key;
      let isEnc = k.isEncrypted;

      // If we are unlocked, we might want to export everything encrypted for safety
      // but usually export means "backup". If the user wants to export, we should 
      // ideally encrypt the whole file. For now, let's ensure we don't leak 
      // plaintext if the user expects encryption.
      
      if (isLocked && !k.isEncrypted) {
        // Do not export plaintext keys if vault is locked for safety
        keyVal = '[LOCKED/ENCRYPTED]';
      } else if (!isLocked && k.key && !k.isEncrypted) {
        // Automatically encrypt for export if vault is open
        const encrypted = await this.deps.securityService.encrypt(k.key);
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
        stats: k.stats
      };
    }));
    return JSON.stringify(exportData, null, 2);
  }

  async importKeys(jsonData: string): Promise<number> {
    try {
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
            stats: item.stats || this.initStats()
          });
          count++;
        }
      }
      
      await this.saveKeys();
      this.notify();
      return count;
    } catch (e) {
      throw new Error('Failed to import keys', { cause: e });
    }
  }

  clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    eventBus.emit('system:clear_data', undefined);
  }

  quarantineKey(idOrFingerprint: string, source: string = 'manual'): boolean {
    const key = this.keys.find(k => k.id === idOrFingerprint);
    if (key) {
      key.status = 'quarantined' as ApiKey['status'];
      this.addAlert(key.id, {
        type: 'quota_exceeded',
        severity: 'critical',
        message: `Key "${key.label}" quarantined — suspected compromise (source: ${source})`,
      });
      this.saveKeys();
      this.notify();
      eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Key "${key.label}" quarantined due to suspected compromise (${source})`,
        type: 'error',
      });
      return true;
    }
    return false;
  }

  quarantineByFingerprint(fingerprint: string, source: string = 'manual'): boolean {
    const key = this.keys.find(k => {
      return k.id === fingerprint || k.label.toLowerCase().includes(fingerprint.toLowerCase());
    });
    if (key) return this.quarantineKey(key.id, source);
    return false;
  }

  resetStats(keyId: string) {
    const key = this.keys.find(k => k.id === keyId);
    if (!key) return;
    key.stats = this.initStats();
    this.saveKeys();
    this.notify();
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Statistics reset for ${key.label}`, type: 'info' });
  }

  async setLatencyThreshold(threshold: number) {
    await dexieDb.keyValue.put({ id: 'latency_threshold', value: threshold, createdAt: Date.now() });
    eventBus.emit('settings:latency_threshold', { threshold });
  }

  async verifyKey(provider: string, apiKey: string): Promise<boolean> {
    if (!apiKey.trim()) return false;
    const knownPrefixes: Record<string, RegExp> = {
      OpenAI: /^sk-/,
      OpenRouter: /^sk-or-/,
      Anthropic: /^sk-ant-/,
      Gemini: /^AIza/,
      Groq: /^gsk_/,
      DeepSeek: /^sk-/,
      Mistral: /^[A-Za-z0-9]{32,}$/,
      Cohere: /^[A-Za-z0-9]{40,}$/,
      HuggingFace: /^hf_/,
      Cerebras: /^cerebras_/,
    };
    const expected = knownPrefixes[provider];
    if (expected && !expected.test(apiKey.trim())) return false;
    return true;
  }

  async getProviderIntrospection(provider: string, apiKey: string): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = { provider };
    try {
      const p = provider.toLowerCase();
      if (p === 'openrouter') {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          result['credits'] = data.data?.credits ?? 'unknown';
          result['usage'] = data.data?.usage ?? 'unknown';
          result['limit'] = data.data?.limit ?? 'unknown';
          result['key'] = data.data?.key ?? 'unknown';
        } else {
          result['error'] = `HTTP ${res.status}`;
        }
      } else if (p === 'gemini') {
        result['note'] = 'Gemini tier info not available via API; check Google AI Studio dashboard.';
      } else if (p === 'groq') {
        result['note'] = 'Groq limits tracked via rate limit headers on each request.';
      }
    } catch (e) {
      result['error'] = e instanceof Error ? e.message : 'Unknown error';
    }
    return result;
  }

  detectProvider(apiKey: string): string | null {
    if (!apiKey.trim()) return null;
    const patterns: [string, RegExp][] = [
      ['Gemini', /^AIza/],
      ['Groq', /^gsk_/],
      ['Anthropic', /^sk-ant-/],
      ['NVIDIA', /^nvapi-/],
      ['HuggingFace', /^hf_/],
      ['OpenRouter', /^sk-or-/],
      ['Fireworks', /^fw_/],
      ['DeepSeek', /^sk-[a-f0-9]{32,}/],
      ['OpenAI', /^sk-[a-zA-Z0-9]{20,}/],
      ['Mistral', /^[A-Za-z0-9]{32,}$/],
      ['Cohere', /^[A-Za-z0-9]{40,}$/],
      ['Cerebras', /^cerebras_/],
    ];
    for (const [provider, regex] of patterns) {
      if (regex.test(apiKey.trim())) return provider;
    }
    return null;
  }
}

export const keyService = new KeyService();
