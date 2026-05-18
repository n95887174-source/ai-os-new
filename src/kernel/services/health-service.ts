import { EVENTS } from '../events/event-names';
export type { KeyHealthCheckResult, KeyHealthSummary } from '../contracts/health';

export interface HealthServiceDeps {
  eventBus: { on: (event: string, cb: (...args: unknown[]) => void) => () => void; emit: (event: string, data?: unknown) => void };
  keyService: {
    getKeys: () => { id: string; provider: string; key: string; status: string }[];
    updateKeyStatus: (id: string, status: string, latency?: number) => void;
    handleProviderError: (id: string, error: string) => void;
    updateAvailableModels: (id: string, models?: string[]) => void;
  };
  adapterRegistry: {
    getAdapter: (provider: string) => { checkHealth: (key: string) => Promise<{ status: string; error?: string; models?: string[] }> } | undefined;
  };
}

export class HealthService {

  private unsubs: Array<() => void> = [];
  private results: Map<string, KeyHealthCheckResult> = new Map();
  private lastRun = 0;
  private isRunning = false;
  private scheduleInterval: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs: number;
  private deps: HealthServiceDeps;

  constructor(deps: HealthServiceDeps, intervalMs: number = 300000) {
    this.deps = deps;
    this.checkIntervalMs = intervalMs;
  }

  async init() {
    this.setupListeners();
    this.startScheduledChecks();
  }

  setCheckInterval(ms: number) {
    this.checkIntervalMs = ms;
    if (this.scheduleInterval) { clearInterval(this.scheduleInterval); this.scheduleInterval = null; }
    this.startScheduledChecks();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    if (this.scheduleInterval) { clearInterval(this.scheduleInterval); }
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.CHECK_HEALTH, (id: unknown) => this.checkKey(id as string)),
      this.deps.eventBus.on(EVENTS.CHECK_ALL_HEALTH, () => this.checkAll())
    );
  }

  private startScheduledChecks() {
    this.scheduleInterval = setInterval(() => {
      const keys = this.deps.keyService.getKeys();
      const activeKeys = keys.filter(k => k.status === 'active' || k.status === 'error');
      if (activeKeys.length > 0) { this.checkAll(); }
    }, this.checkIntervalMs);
  }

  getResult(keyId: string): KeyHealthCheckResult | undefined { return this.results.get(keyId); }

  getSummary(): KeyHealthSummary {
    const results = Array.from(this.results.values());
    return {
      total: results.length,
      active: results.filter(r => r.status === 'active').length,
      error: results.filter(r => r.status === 'error').length,
      checking: this.deps.keyService.getKeys().filter(k => k.status === 'checking').length,
      inactive: this.deps.keyService.getKeys().filter(k => k.status === 'inactive').length,
      avgLatency: results.filter(r => r.status === 'active').reduce((sum, r) => sum + r.latency, 0) /
        Math.max(1, results.filter(r => r.status === 'active').length),
      lastRun: this.lastRun,
      results,
    };
  }

  async checkAll(): Promise<KeyHealthCheckResult[]> {
    if (this.isRunning) return [];
    this.isRunning = true;
    this.lastRun = Date.now();

    const keys = this.deps.keyService.getKeys();
    const activeKeys = keys.filter(k => k.status === 'active' || k.status === 'error' || k.status === 'checking');

    const concurrency = 4;
    const results: (KeyHealthCheckResult | undefined)[] = [];
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
    const validResults = results.filter((r): r is KeyHealthCheckResult => r !== undefined);

    this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Health check complete: ${validResults.filter(r => r.status === 'active').length}/${validResults.length} active`,
      type: 'info',
    });

    return validResults;
  }

  async checkKey(id: string): Promise<KeyHealthCheckResult | undefined> {
    const key = this.deps.keyService.getKeys().find(k => k.id === id);
    if (!key) return;

    this.deps.keyService.updateKeyStatus(id, 'checking');
    this.deps.eventBus.emit(EVENTS.KEY_HEALTH_STARTED, id);

    const adapter = this.deps.adapterRegistry.getAdapter(key.provider.toLowerCase());
    if (!adapter) {
      const errorMsg = `Adapter for ${key.provider} not found`;
      this.deps.keyService.handleProviderError(id, errorMsg);
      const result: KeyHealthCheckResult = {
        keyId: id, provider: key.provider, status: 'error',
        latency: 0, timestamp: Date.now(), error: errorMsg,
      };
      this.results.set(id, result);
      this.deps.eventBus.emit(EVENTS.KEY_HEALTH_FAILED, { id, provider: key.provider, error: errorMsg });
      this.deps.eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id });
      return result;
    }

    const startTime = performance.now();
    try {
      const result = await adapter.checkHealth(key.key);
      const latency = Math.round(performance.now() - startTime);

      if (result.status === 'active') {
        this.deps.keyService.updateKeyStatus(id, 'active', latency);
        this.deps.keyService.updateAvailableModels(id, result.models);

        const checkResult: KeyHealthCheckResult = {
          keyId: id, provider: key.provider, status: 'active',
          latency, timestamp: Date.now(), models: result.models,
        };
        this.results.set(id, checkResult);
        this.deps.eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id });
        return checkResult;
      } else {
        this.deps.keyService.handleProviderError(id, result.error || 'Health check failed');
        const checkResult: KeyHealthCheckResult = {
          keyId: id, provider: key.provider, status: 'error',
          latency, timestamp: Date.now(), error: result.error,
        };
        this.results.set(id, checkResult);
        this.deps.eventBus.emit(EVENTS.KEY_HEALTH_FAILED, { id, provider: key.provider, error: result.error || 'Health check failed' });
        this.deps.eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id });
        return checkResult;
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      this.deps.keyService.handleProviderError(id, errorMsg);
      const checkResult: KeyHealthCheckResult = {
        keyId: id, provider: key.provider, status: 'error',
        latency: Math.round(performance.now() - startTime),
        timestamp: Date.now(), error: errorMsg,
      };
      this.results.set(id, checkResult);
      this.deps.eventBus.emit(EVENTS.KEY_HEALTH_FAILED, { id, provider: key.provider, error: errorMsg });
      this.deps.eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id });
      return checkResult;
    }
  }

  async checkProvider(provider: string): Promise<KeyHealthCheckResult[]> {
    const keys = this.deps.keyService.getKeys().filter(k => k.provider.toLowerCase() === provider.toLowerCase());
    return Promise.all(
      keys.map(key => this.checkKey(key.id).catch(() => undefined))
    ).then(r => r.filter((x): x is KeyHealthCheckResult => x !== undefined));
  }
}
