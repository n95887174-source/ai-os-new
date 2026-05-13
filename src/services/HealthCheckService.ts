import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';
import { adapterRegistry } from './providers/AdapterRegistry';

export interface HealthCheckResult {
  keyId: string;
  provider: string;
  status: 'active' | 'error';
  latency: number;
  timestamp: number;
  models?: string[];
  error?: string;
}

export interface HealthSummary {
  total: number;
  active: number;
  error: number;
  checking: number;
  inactive: number;
  avgLatency: number;
  lastRun: number;
  results: HealthCheckResult[];
}

class HealthCheckService {
  private adapters = adapterRegistry.getAllAdapters();
  private unsubs: Array<() => void> = [];
  private results: Map<string, HealthCheckResult> = new Map();
  private lastRun = 0;
  private isRunning = false;
  private scheduleInterval: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs: number;

  constructor(intervalMs: number = 300000) {
    this.checkIntervalMs = intervalMs;
    this.setupListeners();
    this.startScheduledChecks();
  }

  setCheckInterval(ms: number) {
    this.checkIntervalMs = ms;
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
    }
    this.startScheduledChecks();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
    }
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on(EVENTS.CHECK_HEALTH, (id) => this.checkKey(id)),
      eventBus.on(EVENTS.CHECK_ALL_HEALTH, () => this.checkAll())
    );
  }

  private startScheduledChecks() {
    this.scheduleInterval = setInterval(() => {
      const keys = keyService.getKeys();
      const activeKeys = keys.filter(k => k.status === 'active' || k.status === 'error');
      if (activeKeys.length > 0) {
        this.checkAll();
      }
    }, this.checkIntervalMs);
  }

  getResult(keyId: string): HealthCheckResult | undefined {
    return this.results.get(keyId);
  }

  getSummary(): HealthSummary {
    const results = Array.from(this.results.values());
    return {
      total: results.length,
      active: results.filter(r => r.status === 'active').length,
      error: results.filter(r => r.status === 'error').length,
      checking: keyService.getKeys().filter(k => k.status === 'checking').length,
      inactive: keyService.getKeys().filter(k => k.status === 'inactive').length,
      avgLatency: results.filter(r => r.status === 'active').reduce((sum, r) => sum + r.latency, 0) /
        Math.max(1, results.filter(r => r.status === 'active').length),
      lastRun: this.lastRun,
      results,
    };
  }

  async checkAll(): Promise<HealthCheckResult[]> {
    if (this.isRunning) return [];
    this.isRunning = true;
    this.lastRun = Date.now();

    const keys = keyService.getKeys();
    const activeKeys = keys.filter(k => k.status === 'active' || k.status === 'error' || k.status === 'checking');

    const concurrency = 4;
    const results: (HealthCheckResult | undefined)[] = [];
    const pool = activeKeys.map(key => () => this.checkKey(key.id).catch(() => undefined));

    let idx = 0;
    async function worker(): Promise<void> {
      while (idx < pool.length) {
        const i = idx++;
        results[i] = await pool[i]();
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, pool.length) }, () => worker()));

    this.isRunning = false;
    const validResults = results.filter((r): r is HealthCheckResult => r !== undefined);
    
    eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Health check complete: ${validResults.filter(r => r.status === 'active').length}/${validResults.length} active`,
      type: 'info',
    });

    return validResults;
  }

  async checkKey(id: string): Promise<HealthCheckResult | undefined> {
    const key = keyService.getKeys().find(k => k.id === id);
    if (!key) return;

    keyService.updateKeyStatus(id, 'checking');
    eventBus.emit(EVENTS.KEY_HEALTH_STARTED, id);

    const adapter = this.adapters[key.provider.toLowerCase()];
    if (!adapter) {
      const errorMsg = `Adapter for ${key.provider} not found`;
      keyService.handleProviderError(id, errorMsg);
      const result: HealthCheckResult = {
        keyId: id, provider: key.provider, status: 'error',
        latency: 0, timestamp: Date.now(), error: errorMsg,
      };
      this.results.set(id, result);
      eventBus.emit(EVENTS.KEY_HEALTH_FAILED, { id, provider: key.provider, error: errorMsg });
      eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id });
      return result;
    }

    const startTime = performance.now();
    try {
      const result = await adapter.checkHealth(key.key);
      const latency = Math.round(performance.now() - startTime);

      if (result.status === 'active') {
        keyService.updateKeyStatus(id, 'active', latency);
        keyService.updateAvailableModels(id, result.models);

        const checkResult: HealthCheckResult = {
          keyId: id, provider: key.provider, status: 'active',
          latency, timestamp: Date.now(), models: result.models,
        };
        this.results.set(id, checkResult);
        eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id });
        return checkResult;
      } else {
        keyService.handleProviderError(id, result.error || 'Health check failed');
        const checkResult: HealthCheckResult = {
          keyId: id, provider: key.provider, status: 'error',
          latency, timestamp: Date.now(), error: result.error,
        };
        this.results.set(id, checkResult);
        eventBus.emit(EVENTS.KEY_HEALTH_FAILED, { id, provider: key.provider, error: result.error || 'Health check failed' });
        eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id });
        return checkResult;
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      keyService.handleProviderError(id, errorMsg);
      const checkResult: HealthCheckResult = {
        keyId: id, provider: key.provider, status: 'error',
        latency: Math.round(performance.now() - startTime),
        timestamp: Date.now(), error: errorMsg,
      };
      this.results.set(id, checkResult);
      eventBus.emit(EVENTS.KEY_HEALTH_FAILED, { id, provider: key.provider, error: errorMsg });
      eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id });
      return checkResult;
    }
  }

  async checkProvider(provider: string): Promise<HealthCheckResult[]> {
    const keys = keyService.getKeys().filter(k => k.provider.toLowerCase() === provider.toLowerCase());
    return Promise.all(
      keys.map(key => this.checkKey(key.id).catch(() => undefined))
    ).then(r => r.filter((x): x is HealthCheckResult => x !== undefined));
  }
}

export const healthCheckService = new HealthCheckService();
