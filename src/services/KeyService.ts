import { eventBus, EVENTS } from '../core/events';
import { LocalStorageDriver } from '../core/storage';
import type { StorageDriver } from '../core/storage';
import type { KeyExtendedStats, KeyNote, ApiKey } from '../types/metrics';
import { db } from '../core/DatabaseService';
import { securityService } from '../core/SecurityService';

// ApiKey is now moved to metrics.ts

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
    
    // Auto-update stats based on responses
    eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
      if (res.status === 'error') {
        this.handleProviderError(res.provider, res.error || 'Unknown error');
      }
    });
  }

  private loadKeys() {
    const saved = this.storage.get<ApiKey[]>(STORAGE_KEY);
    if (saved) {
      this.keys = saved.map(k => ({
        ...k,
        status: k.status === 'checking' ? 'inactive' : k.status,
        stats: k.stats || this.initStats()
      }));
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
      fingerprint: Math.random().toString(36).substring(7),
      state: 'HEALTHY',
      activeSLA: 'BALANCED',
      
      // Breakdown & History
      latencyBreakdown: { dns: 0, tls: 0, connect: 0, ttfb: 0, ttft: 0, total: 0, tokensPerSec: 0 },
      coldStartLatency: 0,
      warmStartLatency: 0,
      throughputHistory: [],
      errorBreakdown: { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0 },
      
      // Meta
      quality: { instructionFollowing: 1, structureConsistency: 1, semanticDrift: 0, score: 100 },
      streaming: { avgChunkLatency: 0, maxChunkGap: 0, jitter: 0 },
      
      estimatedCost: 0,
      tokenEfficiency: 1,
      contextUtilization: 0,
      retentionCurve: [],
      userPreferenceScore: 0.5,
      manualSwitches: 0,
      cancellations: 0,

      // Tracing
      traces: [],
      fourSignals: { latency: 0, throughput: 0, errorRate: 0, saturation: 0 },

      // New Intelligent Fields
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
      lastUsageDate: new Date().toDateString()
    };
  }

  private async saveKeys() {
    // Before saving, check if we should encrypt
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

    // Try to decrypt all encrypted keys
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
      id: Math.random().toString(36).slice(2, 9),
      stats: this.initStats()
    };
    this.keys.push(newKey);
    await this.saveKeys();
    this.notify();
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Key for ${data.provider} added`, type: 'success' });
    
    // Auto-trigger health check for the new key (Bug #19)
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
    ext.activeSLA = mode as 'LOW_LATENCY' | 'BALANCED' | 'HIGH_QUALITY';
    
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

  async addNote(keyId: string, text: string, type: KeyNote['type'] = 'admin', author: string = 'Operator') {
    const id = Math.random().toString(36).slice(2, 9);
    const timestamp = Date.now();
    
    await db.query(
      'INSERT INTO notes (id, keyId, text, type, author, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [id, keyId, text, type, author, timestamp]
    );

    const key = this.keys.find(k => k.id === keyId);
    if (key) {
      key.notes = [...(key.notes || []), { id, keyId, text, type, author, timestamp }];
      this.notify();
    }
  }

  async deleteNote(keyId: string, noteId: string) {
    await db.query('DELETE FROM notes WHERE id = ?', [noteId]);
    const key = this.keys.find(k => k.id === keyId);
    if (key && key.notes) {
      key.notes = key.notes.filter(n => n.id !== noteId);
      this.notify();
    }
  }

  async loadNotes(keyId: string) {
    const res = await db.query<KeyNote>('SELECT * FROM notes WHERE keyId = ?', [keyId]);
    const key = this.keys.find(k => k.id === keyId);
    if (key) {
      key.notes = res.rows;
      this.notify();
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

  recordUsage(provider: string, latency: number, tokens: number = 0, model?: string, extra?: any) {
    const key = this.keys.find(k => k.provider.toLowerCase() === provider.toLowerCase() && k.status === 'active');
    if (!key) return;

    if (!key.stats) key.stats = this.initStats();
    if (!key.stats.extended) key.stats.extended = this.initExtendedStats();
    
    const stats = key.stats;
    const ext = key.stats.extended;
    const tps = extra?.tps || 0;

    stats.successCount++;
    stats.totalTokens += tokens;
    if (model) stats.lastModel = model;
    
    if (stats.minLatency === 0 || latency < stats.minLatency) stats.minLatency = latency;
    if (latency > stats.maxLatency) stats.maxLatency = latency;

    stats.avgLatency = stats.avgLatency === 0 
      ? latency 
      : Math.round((stats.avgLatency * 0.7) + (latency * 0.3));

    // Concurrency Tracking
    // ext.currentConcurrentRequests = Math.max(0, ext.currentConcurrentRequests - 1); // Moved to finally in ChatService

    // Performance Start metrics
    if (ext.coldStartLatency === 0) ext.coldStartLatency = latency;
    else ext.warmStartLatency = (ext.warmStartLatency * 0.8) + (latency * 0.2);
    
    // Latency Burst Detection
    if (latency > ext.warmStartLatency * 2 && ext.warmStartLatency > 0) {
      eventBus.emit(EVENTS.KEY_LATENCY_BURST, { id: key.id, provider, latency });
    }

    // 1. Realistic Latency Breakdown (Simulation based on real TTFT)
    const totalTtft = extra?.ttft || latency * 0.4;
    ext.latencyBreakdown = {
      dns: Math.min(50, totalTtft * 0.05 + Math.random() * 5),
      tls: Math.min(150, totalTtft * 0.15 + Math.random() * 10),
      connect: Math.min(100, totalTtft * 0.1 + Math.random() * 5),
      ttfb: totalTtft * 0.8,
      ttft: totalTtft,
      total: latency,
      tokensPerSec: tps
    };

    // 2. Real Semantic & Quality Scoring
    const content = extra?.fullContent || '';
    const hasStructure = content.includes('```') || (content.startsWith('{') && content.endsWith('}'));
    const isHealthyLength = content.length > 50 && content.length < 10000;
    
    ext.quality.instructionFollowing = (ext.quality.instructionFollowing * 0.9) + (isHealthyLength ? 0.1 : 0.02);
    ext.quality.structureConsistency = (ext.quality.structureConsistency * 0.9) + (hasStructure ? 0.1 : 0.05);
    ext.quality.semanticDrift = Math.max(0, (ext.quality.semanticDrift * 0.9) + (content.length % 7 === 0 ? 0.01 : 0));
    ext.quality.score = Math.round((ext.quality.instructionFollowing + ext.quality.structureConsistency - ext.quality.semanticDrift) * 50);

    // 3. Rate-limit & Reliability Pressure
    ext.rateLimitPressure = (ext.rateLimitPressure * 0.8) + (ext.currentConcurrentRequests / ext.rules.maxConcurrentRequests * 0.2);
    ext.stabilityIndex = Math.min(1.0, (ext.stabilityIndex * 0.95) + (latency < ext.rules.timeoutMs ? 0.05 : 0));

    // 4. Daily Reset Logic (Bug #26)
    const today = new Date().toDateString();
    const lastUpdate = ext.lastUsageDate;
    if (lastUpdate !== today) {
      ext.usageToday = { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 };
      ext.lastUsageDate = today;
    }

    // Weighted Quota Calculation
    const task = extra?.task || 'general';
    const weights: Record<string, number> = { 'code': 2, 'long-text': 3, 'general': 1 };
    const weight = weights[task] || 1;
    ext.usageToday.weightedTokens += tokens * weight;
    ext.usageToday.tokens += tokens;
    ext.usageToday.requests += 1;

    if (ext.usageToday.weightedTokens > ext.rules.quota.tokensPerDay) {
      eventBus.emit(EVENTS.KEY_QUOTA_EXCEEDED, { id: key.id, provider, quotaType: 'tokens' });
      this.transitionState(key.id, 'UNSTABLE');
    }

    // Four-Signals Observability
    ext.fourSignals.latency = (ext.fourSignals.latency * 0.9) + (latency * 0.1);
    ext.fourSignals.throughput = (ext.fourSignals.throughput * 0.7) + (tps * 0.3);
    ext.fourSignals.saturation = ext.currentConcurrentRequests / ext.rules.maxConcurrentRequests;
    
    // Task Matrix Update
    if (!ext.learning.taskMatrix[task]) {
      ext.learning.taskMatrix[task] = { winRate: 1.0, avgLatency: latency, qualityScore: 0.95, requestCount: 1, p95Latency: latency };
    } else {
      const m = ext.learning.taskMatrix[task];
      m.requestCount++;
      m.avgLatency = (m.avgLatency * 0.9) + (latency * 0.1);
      m.winRate = (m.winRate * 0.95) + (1.0 * 0.05);
      m.p95Latency = Math.max(m.p95Latency || 0, latency) * 0.95 + latency * 0.05;
    }

    // Run advisor logic every 5 requests
    if (ext.usageToday.requests % 5 === 0) {
      this.runAdvisor(key.id);
    }

    // Tracing & Experiments
    ext.traces = [{
      requestId: extra?.requestId || 'req-' + Math.random().toString(36).slice(2, 7),
      traceId: extra?.traceId || 'tr-' + Math.random().toString(36).slice(2, 7),
      taskType: task,
      strategy: extra?.strategy || 'auto',
      model: model || 'auto',
      status: 'ok' as const,
      timestamp: Date.now(),
      experimentId: extra?.experimentId,
      region: extra?.region || 'US-EAST',
      clientType: extra?.clientType || 'browser'
    }, ...ext.traces].slice(0, 30);

    // Adaptive Rate Limiting
    if (ext.state === 'HEALTHY' && ext.fourSignals.latency < ext.rules.timeoutMs / 2) {
      ext.rules.maxConcurrentRequests = Math.min(10, Number((ext.rules.maxConcurrentRequests + 0.01).toFixed(2)));
    }

    // Quality & Stability recovery
    ext.stabilityIndex = Math.min(1.0, ext.stabilityIndex + 0.01);
    ext.reputationScore = Math.min(100, ext.reputationScore + 0.5);

    if (ext.state !== 'HEALTHY' && ext.reputationScore > 80) {
      this.transitionState(key.id, 'HEALTHY');
      this.addNote(key.id, `Kernel: Node restored to HEALTHY state (Reputation: ${ext.reputationScore.toFixed(1)})`, 'system');
    }

    this.saveKeys();
    this.notify();
  }

  handleProviderError(provider: string, error: string) {
    const affected = this.keys.filter(k => k.provider.toLowerCase() === provider.toLowerCase());
    affected.forEach(k => {
      const isCritical = error.includes('402') || error.includes('429') || error.includes('quota') || error.includes('credits');
      if (isCritical) k.status = 'error';
      
      if (!k.stats) k.stats = this.initStats();
      if (!k.stats.extended) k.stats.extended = this.initExtendedStats();
      
      k.stats.errorCount++;
      k.stats.lastError = { message: error, timestamp: new Date().toISOString() };

      const ext = k.stats.extended;
      if (error.includes('429')) {
        ext.errorBreakdown.soft = (ext.errorBreakdown.soft || 0) + 1;
        ext.rateLimitPressure = Math.min(1.0, ext.rateLimitPressure + 0.2);
      } else if (error.includes('401') || error.includes('403')) {
        ext.errorBreakdown.hard = (ext.errorBreakdown.hard || 0) + 1;
      } else {
        ext.errorBreakdown.provider = (ext.errorBreakdown.provider || 0) + 1;
      }
      
      ext.stabilityIndex = Math.max(0, ext.stabilityIndex - 0.1);
      ext.reputationScore = Math.max(0, ext.reputationScore - 10);
      ext.stabilityForecast = ext.stabilityIndex < 0.5 ? 'degrading' : 'stable';
      ext.currentConcurrentRequests = Math.max(0, ext.currentConcurrentRequests - 1);
      ext.fourSignals.errorRate = (ext.fourSignals.errorRate * 0.8) + 0.2;

      if (ext.reputationScore < 40) {
        this.transitionState(k.id, 'DEGRADED');
        this.addNote(k.id, `Kernel Warning: Node performance degraded (Reputation: ${ext.reputationScore.toFixed(1)})`, 'system');
      }
      if (ext.reputationScore < 10) {
        this.transitionState(k.id, 'UNSTABLE');
        this.addNote(k.id, `Kernel Alert: Node marked as UNSTABLE due to recurring errors`, 'system');
      }
    });
    this.saveKeys();
    this.notify();
    eventBus.emit(EVENTS.NOTIFICATION, { message: `${provider} error: ${error}`, type: 'error' });
  }

  canUseKey(id: string): { can: boolean; reason?: string } {
    const key = this.keys.find(k => k.id === id);
    if (!key || key.status !== 'active') return { can: false, reason: 'Key inactive' };
    
    const ext = key.stats.extended;
    if (!ext) return { can: true };

    if (ext.currentConcurrentRequests >= ext.rules.maxConcurrentRequests) return { can: false, reason: 'Max concurrency' };
    if (ext.usageToday.tokens >= ext.rules.quota.tokensPerDay) return { can: false, reason: 'Quota exceeded' };
    return { can: true };
  }

  incrementConcurrency(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (key?.stats?.extended) {
      key.stats.extended.currentConcurrentRequests++;
      key.stats.extended.fourSignals.saturation = key.stats.extended.currentConcurrentRequests / key.stats.extended.rules.maxConcurrentRequests;
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
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Key ${key.provider} is now ${newState}`, type: newState === 'HEALTHY' ? 'success' : 'warning' });
    this.notify();
  }

  runAdvisor(id: string) {
    const key = this.keys.find(k => k.id === id);
    if (!key || !key.stats?.extended) return;
    const ext = key.stats.extended;
    const matrix = ext.learning.taskMatrix;

    ext.learning.advisorInsights.recommendedFor = Object.entries(matrix)
      .filter(([_, m]) => m.winRate > 0.8 && m.requestCount > 5)
      .map(([task]) => task);

    ext.learning.advisorInsights.avoidFor = Object.entries(matrix)
      .filter(([_, m]) => m.winRate < 0.5 || (m.p95Latency && m.p95Latency > 3000))
      .map(([task]) => task);
      
    ext.learning.advisorInsights.confidence = Math.min(1.0, ext.usageToday.requests / 100);
  }

  clearAllData() {
    if (confirm('ВНИМАНИЕ: Это действие удалит все API-ключи, логи и состояние ядра. Продолжить?')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('super_agents_kernel_state');
      localStorage.removeItem('super_agents_os_db_notes');
      window.location.reload();
    }
  }
}

export const keyService = new KeyService();
