import { Container, type IContainer } from './container';
import { SystemBootstrap } from './bootstrap';
import { eventBus as coreEventBus } from './events/event-bus';
import { db as coreDatabase } from './services/database-service';
import { securityService as coreSecurity } from './security';
import { createSqliteStorage } from './services/storage/sqlite-storage';
import { DataAccessLayerImpl } from './dal/data-access-layer';
import { LocalStorageAdapter } from './services/storage/local-storage-adapter';

export type RuntimePhase = 'loading' | 'initializing' | 'ready' | 'degraded' | 'shutdown' | 'error';

export interface RuntimeStatus {
  phase: RuntimePhase;
  uptime: number;
  startTime: number;
  servicesReady: number;
  servicesTotal: number;
  lastError: string | null;
  memoryUsage: number;
}

export class RuntimeManager {
  private phase: RuntimePhase = 'loading';
  private startTime = 0;
  private servicesReady = 0;
  private servicesTotal = 0;
  private lastError: string | null = null;
  private initialized = false;
  private shutdownInitiated = false;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private bootstrapper: SystemBootstrap;
  private container: IContainer;

  constructor(container: IContainer, bootstrapper: SystemBootstrap) {
    this.container = container;
    this.bootstrapper = bootstrapper;
    container.register('runtime', this);
  }

  private startPromise: Promise<boolean> | null = null;

  async start(): Promise<boolean> {
    if (this.initialized) return true;
    if (this.shutdownInitiated) return false;
    if (this.startPromise) return this.startPromise;
    this.startPromise = (async () => {
      this.startTime = Date.now();
      this.phase = 'initializing';

      try {
        const storage = await createSqliteStorage();
        console.log('[KEY_FLOW] storage init state:', {
          hasStorageLayer: !!storage,
          hasKeys: !!storage?.keys,
          keysType: typeof storage?.keys,
          hasListKeys: typeof storage?.keys?.listKeys === 'function',
        });
        this.container.register('storageLayer', storage);
        await this.bootstrapper.init();
        const report = this.bootstrapper.getReport();
        this.servicesTotal = report.services.length;
        this.servicesReady = report.services.filter(s => s.status === 'ok').length;
        this.phase = report.phase === 'ready' ? 'ready' : 'degraded';
        this.initialized = true;
        this.lastError = report.error;
        this.startHealthChecks();
        return this.phase === 'ready';
      } catch (e) {
        this.phase = 'error';
        this.lastError = e instanceof Error ? e.message : String(e);
        console.error('[Runtime] Failed to start:', e);
        await this.shutdown();
        return false;
      }
    })();
    return this.startPromise;
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      if (this.phase === 'shutdown') return;
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      if (mem && mem.usedJSHeapSize > 500 * 1024 * 1024) {
        this.phase = 'degraded';
      }
    }, 60000);
  }

  async shutdown(): Promise<void> {
    if (this.shutdownInitiated) return;
    this.shutdownInitiated = true;
    this.phase = 'shutdown';
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    await this.bootstrapper.shutdown();
    this.initialized = false;
    this.phase = 'loading';
    // H-07: Do NOT reset shutdownInitiated here — only restart() clears it
    // This prevents a race where start() is called before shutdown() finishes
  }

  async restart(): Promise<boolean> {
    await this.shutdown();
    this.shutdownInitiated = false;
    return this.start();
  }

  getStatus(): RuntimeStatus {
    return {
      phase: this.phase,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      startTime: this.startTime,
      servicesReady: this.servicesReady,
      servicesTotal: this.servicesTotal,
      lastError: this.lastError,
      memoryUsage: (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0,
    };
  }

  getService<T>(name: string): T {
    return this.bootstrapper.resolve<T>(name);
  }

  getContainer(): IContainer {
    return this.container;
  }

  getPhase(): RuntimePhase {
    return this.phase;
  }

  isReady(): boolean {
    return this.phase === 'ready' && this.initialized;
  }

  markServiceReady() {
    this.servicesReady = Math.min(this.servicesReady + 1, this.servicesTotal);
  }

  getDependencies(): Record<string, string[]> {
    return this.bootstrapper.resolve<any>('container')?.getDependencies() || {};
  }

  getServices(): string[] {
    return this.bootstrapper.resolve<any>('container')?.getServices() || [];
  }
}

const _container = new Container();
const localStorageAdapter = new LocalStorageAdapter();
_container.register('database', coreDatabase);
_container.register('dal', new DataAccessLayerImpl(coreDatabase));
_container.register('eventBus', coreEventBus);
_container.register('securityService', coreSecurity);
_container.register('storageAdapter', localStorageAdapter);
// storageLayer registered in RuntimeManager.start() via SQLite-over-IndexedDB — works in all browsers
export const runtime = new RuntimeManager(_container, new SystemBootstrap(_container, coreEventBus));
