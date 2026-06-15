import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';
import type { KeyHealthCheckResult, KeyHealthSummary, IHealthService } from '../contracts/health';
import type { IKeyStateStore } from '../contracts/key-state';
export type { KeyHealthCheckResult, KeyHealthSummary } from '../contracts/health';

const LOGGER = rootLogger.child('HealthService');

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
  keyStateStore: IKeyStateStore;
}

export class HealthService implements IHealthService {

  private unsubs: Array<() => void> = [];
  private lastRun = 0;
  private isRunning = false;
  private scheduleInterval: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs: number;
  private deps: HealthServiceDeps;
  private visibilityHandler: (() => void) | null = null;

  constructor(deps: HealthServiceDeps, intervalMs: number = 300000) {
    this.deps = deps;
    this.checkIntervalMs = intervalMs;
  }

  async init() {
    this.setupListeners();
    this.startScheduledChecks();
    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.hidden) {
          this.pauseScheduledChecks();
        } else {
          this.startScheduledChecks();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
      this.unsubs.push(() => {
        if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
      });
    }
  }

  setCheckInterval(ms: number) {
    this.checkIntervalMs = ms;
    this.pauseScheduledChecks();
    this.startScheduledChecks();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.pauseScheduledChecks();
    this.visibilityHandler = null;
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.CHECK_HEALTH, (id: unknown) => { if (typeof id === 'string') this.checkKey(id); }),
      this.deps.eventBus.on(EVENTS.CHECK_ALL_HEALTH, () => this.checkAll())
    );
  }

  private startScheduledChecks() {
    if (this.scheduleInterval) return;
    this.scheduleInterval = setInterval(() => {
      const keys = this.deps.keyService.getKeys();
      const activeKeys = keys.filter(k => k.status === 'active' || k.status === 'error');
      if (activeKeys.length > 0) { this.checkAll(); }
    }, this.checkIntervalMs);
  }

  private pauseScheduledChecks() {
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
    }
  }

  getResult(keyId: string): KeyHealthCheckResult | undefined {
    const state = this.deps.keyStateStore.get(keyId);
    if (!state) {
      const key = this.deps.keyService.getKeys().find(k => k.id === keyId);
      if (!key) return;
      return {
        keyId,
        provider: key.provider,
        status: 'unknown',
        latency: 0,
        timestamp: Date.now(),
        error: 'Key not found in KeyStateStore',
      };
    }
    return {
      keyId: state.id,
      provider: state.provider,
      status: state.status === 'ready' ? 'active' : state.status === 'unknown' ? 'unknown' : 'error',
      latency: state.lastProbe.latency,
      timestamp: state.lastProbe.timestamp,
      error: state.lastProbe.error,
    };
  }

  getAllResults(): KeyHealthCheckResult[] {
    const keys = this.deps.keyService.getKeys();
    return keys.map(k => this.getResult(k.id)).filter((r): r is KeyHealthCheckResult => r !== undefined);
  }

  private writeToKeyStateStore(id: string, provider: string, status: string, latency: number, error?: string): void {
    try {
      this.deps.keyStateStore.update(id, {
        status: status === 'active' ? 'ready' : 'broken',
        lastProbe: { status: status === 'active' ? 'ready' : 'broken', latency, error, timestamp: Date.now() },
        flags: { circuitOpen: false, rateLimited: false, authFailed: status !== 'active' },
      });
    } catch (e) { LOGGER.warn('HealthService', 'Failed to update keyStateStore after probe', { keyId: id, provider, error: e }); }
  }

  getSummary(): KeyHealthSummary {
    const states = this.deps.keyStateStore.getAll();
    return {
      total: states.length,
      active: states.filter(s => s.status === 'ready').length,
      error: states.filter(s => s.status === 'broken').length,
      unknown: states.filter(s => s.status === 'unknown').length,
      checking: this.deps.keyService.getKeys().filter(k => k.status === 'checking').length,
      inactive: this.deps.keyService.getKeys().filter(k => k.status === 'inactive').length,
      avgLatency: states.filter(s => s.status === 'ready').reduce((sum, s) => sum + s.lastProbe.latency, 0) /
        Math.max(1, states.filter(s => s.status === 'ready').length),
      lastRun: this.lastRun,
      results: states.map(s => ({
        keyId: s.id,
        provider: s.provider,
        status: s.status === 'ready' ? 'active' : s.status === 'unknown' ? 'unknown' : 'error',
        latency: s.lastProbe.latency,
        timestamp: s.lastProbe.timestamp,
        error: s.lastProbe.error,
      })),
    };
  }

  async checkAll(): Promise<KeyHealthCheckResult[]> {
    if (this.isRunning) return [];
    this.isRunning = true;

    try {
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

      const validResults = results.filter((r): r is KeyHealthCheckResult => r !== undefined);

      this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Health check complete: ${validResults.filter(r => r.status === 'active').length}/${validResults.length} active`,
        type: 'info',
      });

      return validResults;
    } finally {
      this.isRunning = false;
    }
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
      this.deps.eventBus.emit(EVENTS.KEY_HEALTH_FAILED, { id, provider: key.provider, error: errorMsg });
      this.deps.eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id });
      this.writeToKeyStateStore(id, key.provider, 'error', 0, errorMsg);
      return result;
    }

    const startTime = performance.now();
    const TIMEOUT_MS = 15000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const result = await Promise.race([
        adapter.checkHealth(key.key),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`Health check timed out after ${TIMEOUT_MS}ms for ${key.provider}`)), TIMEOUT_MS);
        }),
      ]);
      const latency = Math.round(performance.now() - startTime);

      if (result.status === 'active') {
        this.deps.keyService.updateKeyStatus(id, 'active', latency);
        this.deps.keyService.updateAvailableModels(id, result.models);

        const checkResult: KeyHealthCheckResult = {
          keyId: id, provider: key.provider, status: 'active',
          latency, timestamp: Date.now(), models: result.models,
        };
        // SI-53: Include models in payload so catalog can update
        this.deps.eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id, provider: key.provider, status: 'active', models: result.models });
        this.writeToKeyStateStore(id, key.provider, 'active', latency);
        return checkResult;
      } else {
        this.deps.keyService.handleProviderError(id, result.error || 'Health check failed');
        const checkResult: KeyHealthCheckResult = {
          keyId: id, provider: key.provider, status: 'error',
          latency, timestamp: Date.now(), error: result.error,
        };
        this.deps.eventBus.emit(EVENTS.KEY_HEALTH_FAILED, { id, provider: key.provider, error: result.error || 'Health check failed' });
        this.deps.eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id, provider: key.provider, status: 'error', error: result.error });
        this.writeToKeyStateStore(id, key.provider, 'error', latency, result.error);
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
      this.deps.eventBus.emit(EVENTS.KEY_HEALTH_FAILED, { id, provider: key.provider, error: errorMsg });
      this.deps.eventBus.emit(EVENTS.KEY_HEALTH_COMPLETED, { id, provider: key.provider, status: 'error', error: errorMsg });
      this.writeToKeyStateStore(id, key.provider, 'error', checkResult.latency, errorMsg);
      return checkResult;
    } finally {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    }
  }

  async checkProvider(provider: string): Promise<KeyHealthCheckResult[]> {
    const keys = this.deps.keyService.getKeys().filter(k => k.provider.toLowerCase() === provider.toLowerCase());
    return Promise.all(
      keys.map(key => this.checkKey(key.id).catch(() => undefined))
    ).then(r => r.filter((x): x is KeyHealthCheckResult => x !== undefined));
  }
}
