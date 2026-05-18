import { Container } from './container';
import { SystemBootstrap } from './bootstrap';
import { eventBus as coreEventBus } from '../core/events';
import { db as coreDatabase } from '../core/DatabaseService';
import { securityService as coreSecurity } from '../core/SecurityService';

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

  constructor() {
    const container = new Container();
    container.register('database', coreDatabase);
    container.register('eventBus', coreEventBus);
    container.register('securityService', coreSecurity);
    this.bootstrapper = new SystemBootstrap(container, coreEventBus);
  }

  async start(): Promise<boolean> {
    if (this.initialized) return true;
    this.startTime = Date.now();
    this.phase = 'initializing';

    try {
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
      return false;
    }
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

  getPhase(): RuntimePhase {
    return this.phase;
  }

  isReady(): boolean {
    return this.phase === 'ready' && this.initialized;
  }

  markServiceReady() {
    this.servicesReady = Math.min(this.servicesReady + 1, this.servicesTotal);
  }
}

export const runtime = new RuntimeManager();
