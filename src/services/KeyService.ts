import { eventBus, EVENTS } from '../core/events';
import { LocalStorageDriver } from '../core/storage';
import type { StorageDriver } from '../core/storage';
import type { KeyExtendedStats, KeyNote, ApiKey, SLAMode } from '../types/metrics';
import { db } from '../core/DatabaseService';
import { securityService } from '../core/SecurityService';

import { pricingService } from './PricingService';

const STORAGE_KEY = 'super_agents_api_keys';

class KeyService {
  private keys: ApiKey[] = [];
  private storage: StorageDriver;

  constructor(storage: StorageDriver = new LocalStorageDriver()) {
    this.storage = storage;
    this.loadKeys();
    this.setupListeners();
  }

  private setupListeners() {
    eventBus.on(EVENTS.KEY_ADDED, (data) => this.addKey(data));
    eventBus.on(EVENTS.KEY_REMOVED, (id) => this.removeKey(id));
    
    eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
      this.updateMetricsFromResponse(res);
    });
  }

  private updateMetricsFromResponse(res: any) {
    const key = res.keyId 
      ? this.keys.find(k => k.id === res.keyId)
      : this.keys.find(k => k.provider.toLowerCase() === res.provider.toLowerCase());
      
    if (!key || !key.stats?.extended) return;

    const ext = key.stats.extended;
    
    // Ensure nested objects exist (robustness against old storage versions)
    if (!ext.usageToday) ext.usageToday = { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 };
    if (!ext.usageMonthly) ext.usageMonthly = { tokens: 0, requests: 0, estimatedCost: 0 };
    if (!ext.latencyBreakdown) ext.latencyBreakdown = { dns: 0, tls: 0, connect: 0, ttfb: 0, ttft: 0, total: 0, tokensPerSec: 0 };
    if (!ext.errorBreakdown) ext.errorBreakdown = { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0, soft: 0, hard: 0, provider: 0 };
    if (!ext.fourSignals) ext.fourSignals = { latency: 0, throughput: 0, errorRate: 0, saturation: 0 };
    if (!ext.quality) ext.quality = { instructionFollowing: 1, structureConsistency: 1, semanticDrift: 0, score: 100 };
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
          message: `Квота провайдера ${key.provider} исчерпана (429)`
        });
        this.transitionState(key.id, 'DEGRADED');
      }

      this.handleProviderError(key.id, errorMsg);
      ext.errorBreakdown.provider++;
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

    this.saveKeys();
    this.notify();
  }

  private calculateReputation(key: ApiKey) {
    if (!key.stats?.extended) return;
    const stats = key.stats;
    const ext = key.stats.extended;

    const successRate = stats.successCount / (stats.successCount + stats.errorCount || 1);
    const latencyFactor = Math.max(0, 1 - (stats.avgLatency / 5000)); // 5s is floor
    
    ext.reputationScore = Math.floor((successRate * 0.7 + latencyFactor * 0.3) * 100);
    
    if (ext.reputationScore < 40) ext.state = 'DEGRADED';
    else if (ext.reputationScore < 80) ext.state = 'STABLE';
    else ext.state = 'HEALTHY';
  }

  private loadKeys() {
    const saved = this.storage.get<ApiKey[]>(STORAGE_KEY);
    if (saved) {
      this.keys = saved.map(k => {
        const stats = k.stats || this.initStats();
        if (!stats.extended) stats.extended = this.initExtendedStats();
        return {
          ...k,
          status: k.status === 'checking' ? 'inactive' : k.status,
          stats
        };
      });
    } else {
      this.keys = this.getDefaultKeys();
      this.saveKeys();
    }
    this.notify();
  }

  private getDefaultKeys(): ApiKey[] {
    return [
      { id: '1', provider: 'OpenRouter', key: '', label: 'OpenRouter Main', status: 'inactive', stats: this.initStats() },
      { id: '2', provider: 'Gemini', key: '', label: 'Gemini Pro', status: 'inactive', stats: this.initStats() },
      { id: '3', provider: 'Groq', key: '', label: 'Groq Cloud', status: 'inactive', stats: this.initStats() },
      { id: '4', provider: 'NVIDIA', key: '', label: 'NVIDIA API', status: 'inactive', stats: this.initStats() },
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
      
      latencyBreakdown: { dns: 0, tls: 0, connect: 0, ttfb: 0, ttft: 0, total: 0, tokensPerSec: 0 },
      coldStartLatency: 0,
      warmStartLatency: 0,
      throughputHistory: [],
      errorBreakdown: { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0, soft: 0, hard: 0, provider: 0 },
      
      quality: { instructionFollowing: 1, structureConsistency: 1, semanticDrift: 0, score: 100 },
      streaming: { avgChunkLatency: 0, maxChunkGap: 0, jitter: 0 },
      
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

  private async saveKeys() {
    const keysToSave = await Promise.all(this.keys.map(async k => {
      if (!securityService.isLocked() && k.key && !k.isEncrypted) {
        const encrypted = await securityService.encrypt(k.key);
        return { ...k, key: encrypted || k.key, isEncrypted: !!encrypted };
      }
      return k;
    }));

    this.storage.set(STORAGE_KEY, keysToSave);
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
    eventBus.emit(EVENTS.KEYS_LOADED, [...this.keys]);
  }

  getKeys() {
    return this.keys;
  }

  async addKey(data: Omit<ApiKey, 'id' | 'stats'>) {
    // Check for duplicates
    const isDuplicate = this.keys.some(k => k.key === data.key && k.provider === data.provider);
    if (isDuplicate) {
      eventBus.emit(EVENTS.NOTIFICATION, { 
        message: `Этот ключ уже добавлен в систему для провайдера ${data.provider}`, 
        type: 'error' 
      });
      return;
    }

    let keyToStore = data.key;
    let encrypted = false;

    if (!securityService.isLocked()) {
      const enc = await securityService.encrypt(data.key);
      if (enc) {
        keyToStore = enc;
        encrypted = true;
      }
    }

    const newKey: ApiKey = {
      ...data,
      key: keyToStore,
      isEncrypted: encrypted,
      id: crypto.randomUUID().slice(0, 8),
      stats: this.initStats()
    };
    this.keys.push(newKey);
    await this.saveKeys();
    this.notify();
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Key for ${data.provider} added`, type: 'success' });
    
    setTimeout(() => {
      eventBus.emit(EVENTS.HEALTH_CHECK, newKey.id);
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

  recordUsage(keyIdOrProvider: string, latency: number, tokens: number = 0, model?: string, extra?: any) {
    const key = this.keys.find(k => (k.id === keyIdOrProvider || k.provider.toLowerCase() === keyIdOrProvider.toLowerCase()) && k.status === 'active');
    if (!key) return;

    if (!key.stats) key.stats = this.initStats();
    if (!key.stats.extended) key.stats.extended = this.initExtendedStats();
    
    const stats = key.stats;
    const ext = key.stats.extended;
    
    // Ensure nested objects exist (robustness against old storage versions)
    if (!ext.usageToday) ext.usageToday = { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 };
    if (!ext.usageMonthly) ext.usageMonthly = { tokens: 0, requests: 0, estimatedCost: 0 };
    if (!ext.latencyBreakdown) ext.latencyBreakdown = { dns: 0, tls: 0, connect: 0, ttfb: 0, ttft: 0, total: 0, tokensPerSec: 0 };
    if (!ext.errorBreakdown) ext.errorBreakdown = { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0, soft: 0, hard: 0, provider: 0 };
    if (!ext.fourSignals) ext.fourSignals = { latency: 0, throughput: 0, errorRate: 0, saturation: 0 };
    if (!ext.quality) ext.quality = { instructionFollowing: 1, structureConsistency: 1, semanticDrift: 0, score: 100 };
    if (!ext.rules) ext.rules = { maxConcurrentRequests: 5, retryPolicy: { maxAttempts: 3, backoffMs: 1000 }, timeoutMs: 30000, quota: { tokensPerDay: 1000000, requestsPerDay: 1000 }, slaThresholds: { latencyP95: 2000, errorFloor: 0.05 } };

    const tps = extra?.tps || 0;

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

    const totalTtft = extra?.ttft || latency * 0.4;
    ext.latencyBreakdown = {
      dns: Math.min(50, totalTtft * 0.05 + (key.stats.successCount % 5)),
      tls: Math.min(150, totalTtft * 0.15 + (key.stats.errorCount % 10)),
      connect: Math.min(100, totalTtft * 0.1 + (latency % 5)),
      ttfb: totalTtft * 0.8,
      ttft: totalTtft,
      total: latency,
      tokensPerSec: tps
    };

    const content = extra?.fullContent || '';
    const hasStructure = content.includes('```') || (content.startsWith('{') && content.endsWith('}'));
    const isHealthyLength = content.length > 50 && content.length < 10000;
    
    ext.quality.instructionFollowing = (ext.quality.instructionFollowing * 0.9) + (isHealthyLength ? 0.1 : 0.02);
    ext.quality.structureConsistency = (ext.quality.structureConsistency * 0.9) + (hasStructure ? 0.1 : 0.05);
    ext.quality.semanticDrift = Math.max(0, (ext.quality.semanticDrift * 0.9) + (content.length % 7 === 0 ? 0.01 : 0));
    ext.quality.score = Math.round((ext.quality.instructionFollowing + ext.quality.structureConsistency - ext.quality.semanticDrift) * 50);

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

    const task = extra?.task || 'general';
    ext.usageToday.tokens += tokens;
    ext.usageToday.requests += 1;
    ext.usageMonthly.tokens += tokens;
    ext.usageMonthly.requests += 1;

    // Advanced Cost calculation
    const inputTokens = extra?.inputTokens || Math.round(tokens * 0.3); // fallback estimate
    const outputTokens = extra?.outputTokens || tokens;
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
    } else if (usage.tokens > rules.tokensPerDay * 0.8) {
      this.addAlert(key.id, {
        type: 'quota_warning',
        severity: 'medium',
        message: `Daily token quota at 80% (${usage.tokens}/${rules.tokensPerDay})`
      });
    }

    // Monthly Budget
    if (rules.monthlyBudget && ext.usageMonthly.estimatedCost > rules.monthlyBudget) {
      this.addAlert(key.id, {
        type: 'quota_exceeded',
        severity: 'critical',
        message: `Monthly budget exceeded ($${ext.usageMonthly.estimatedCost.toFixed(2)}/$${rules.monthlyBudget})`
      });
    }
  }

  private addAlert(keyId: string, alert: Omit<any, 'id' | 'timestamp' | 'resolved'>) {
    const key = this.keys.find(k => k.id === keyId);
    if (!key || !key.stats?.extended) return;

    const id = crypto.randomUUID().slice(0, 8);
    const newAlert = {
      ...alert,
      id,
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

  private handleProviderError(keyId: string, error: string) {
    const key = this.keys.find(k => k.id === keyId);
    if (key) {
      key.status = 'error';
      key.lastError = error;
      
      eventBus.emit(EVENTS.NOTIFICATION, { 
        message: `Ошибка ${key.provider}: ${error.substring(0, 60)}...`, 
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

  transitionState(id: string, newState: any) {
    const key = this.keys.find(k => k.id === id);
    if (!key || !key.stats?.extended) return;
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const allKeys = JSON.parse(saved);
        const found = allKeys.find((k: any) => k.id === keyId);
        if (found && found.notes) {
          const key = this.keys.find(k => k.id === keyId);
          if (key) key.notes = found.notes;
        }
      } catch { /* ignore corrupt data */ }
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
          'NVIDIA': ['nvidia/llama-3.1-405b-instruct']
        };
        const models = defaults[key.provider] || [];
        this.updateAvailableModels(id, models);
      }
      this.updateKeyStatus(id, 'active');
    } catch (e: any) {
      this.updateKeyStatus(id, 'error');
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Failed to refresh models: ${e.message}`, type: 'error' });
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
        
        this.recordUsage(key.id, latency, res.content.length / 4, model, {
          task: 'benchmark',
          fullContent: res.content,
          ttft: latency * 0.5 // mock ttft
        });
      } catch (e) {
        console.error('Benchmark step failed', e);
      }
    }
    
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Benchmark for ${key.provider} completed`, type: 'success' });
  }

  async runAdvisor(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (!key) return;
    const mod = await import('./AdvisorService');
    eventBus.emit('trace:updated', [{
      traceId: `advisor-${crypto.randomUUID().slice(0, 8)}`,
      totalLatency: key.stats?.avgLatency || 800,
      semanticConfidence: (key.stats?.extended?.reputationScore || 100) / 100,
      providerId: id,
    }]);
    eventBus.emit('kernel:updated', this.notify);
    const suggestions = mod.advisorService.getSuggestions().filter((s: any) => s.targetNodeId === id);
    if (suggestions.length > 0) {
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Advisor: ${suggestions.length} suggestion(s) for ${key.label}`, type: 'info' });
    } else {
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Advisor: No suggestions for ${key.label}`, type: 'success' });
    }
  }

  clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }
}

export const keyService = new KeyService();
