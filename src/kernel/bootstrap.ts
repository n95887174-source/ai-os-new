import type { IBootstrap, IEventBus } from './types/interfaces';
import { type IContainer } from './container';
import type { ILifecycle } from './contracts/lifecycle';
import { LifecycleManager } from './services/lifecycle-manager';
import { LoggerService } from './services/logger-service';
import { EVENTS } from './events/event-names';
import { AuditorTopology } from './state/topology-defaults';
import { SystemKernel } from './kernel';
import { ConfigService } from './services/config-service';
import { KeyService } from './services/key-management/key-service';
import { ProviderRuntimeService } from './services/provider-runtime/provider-service';
import { RotationService } from './services/rotation-service';
import { EventSourcingService } from './services/event-sourcing/event-sourcing-service';
import { OrchestrationService as Orchestrator } from './services/orchestration-service';
import { registerServices } from './service-registration';
import { BOOTSTRAP_SERVICES } from './services/service-list';

// Services whose failure should abort bootstrap entirely
const CRITICAL_SERVICES = new Set([
  'configService',
  'keyService',
  'pricingService',
]);

export type InitPhase = 'pending' | 'kernel' | 'services' | 'topology' | 'ready' | 'failed';

export interface BootstrapReport {
  phase: InitPhase;
  started: number;
  completed: number;
  duration: number;
  error: string | null;
  services: { name: string; status: 'ok' | 'error' | 'skipped'; error?: string }[];
}

export class SystemBootstrap implements IBootstrap {
  private isStarted = false;
  private phase: InitPhase = 'pending';
  private startTime = 0;
  private serviceStatus: BootstrapReport['services'] = [];
  private error: string | null = null;
  private container: IContainer;
  private eventBus: IEventBus;
  private lifecycle = new LifecycleManager();
  private logger: LoggerService;

  constructor(container: IContainer, eventBus: IEventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this.logger = new LoggerService('Bootstrap');
    this.container.register('logger', this.logger);
    this.container.register('container', this.container);
  }

  resolve<T>(name: string): T {
    return this.container.get<T>(name);
  }

  private registerMigratedServices() {
    registerServices(this.container, this.eventBus, this.registerWithLifecycle.bind(this));
  }

  async init(): Promise<BootstrapReport> {
    if (this.isStarted) return this.getReport();
    this.isStarted = true;
    this.startTime = Date.now();
    this.lifecycle.clearStatuses();
    this.error = null;

    this.logger.info('Bootstrap', 'Initializing Super-Agents OS Runtime...');

    this.phase = 'kernel';

    this.registerMigratedServices();

    const kernel = this.container.get<SystemKernel>('kernel');
    await this.lifecycle.tryInit('kernel', () => kernel.init());

    // Boot configService immediately to restore configuration overlays from database
    const configService = this.container.get<ConfigService>('configService');
    await this.lifecycle.tryInit('configService', () => configService.init());

    const results = await this.initServices();

    return this.getReport();
  }

  getReport(): BootstrapReport {
    return {
      phase: this.phase,
      started: this.startTime,
      completed: Date.now(),
      duration: this.startTime ? Date.now() - this.startTime : 0,
      error: this.error,
      services: [...this.lifecycle.getStatuses()],
    };
  }

  getPhase(): InitPhase {
    return this.phase;
  }

  isReady(): boolean {
    return this.phase === 'ready';
  }

  async shutdown() {
    if (!this.isStarted) return;
    this.logger.info('Bootstrap', 'Shutting down Super-Agents OS Runtime...');

    await this.lifecycle.shutdown();

    this.lifecycle.clearStatuses();
    this.error = null;
    this.isStarted = false;
    this.phase = 'pending';
    this.logger.info('Bootstrap', 'Shutdown complete.');
  }

  private async initServices(): Promise<boolean> {
    this.phase = 'services';

    const results = await this.lifecycle.initAllParallel([...BOOTSTRAP_SERVICES]);

    const entryNames = this.lifecycle.getEntries()
      .filter(e => BOOTSTRAP_SERVICES.includes(e.name))
      .map(e => e.name);

    let criticalFailed = false;
    for (let i = 0; i < results.length; i++) {
      if (!results[i]) {
        const name = entryNames[i] ?? `unknown-${i}`;
        if (CRITICAL_SERVICES.has(name)) {
          this.logger.error('Bootstrap', `Critical service ${name} failed — aborting`);
          criticalFailed = true;
        } else {
          this.logger.warn('Bootstrap', `Optional service ${name} failed — continuing`);
        }
      }
    }

    if (criticalFailed) {
      this.phase = 'failed';
      this.error = 'One or more critical services failed to initialize';
      return false;
    }

    this.phase = 'topology';

    await this.lifecycle.tryInit('eventSourcing', () => {
      this.container.get<EventSourcingService>('eventSourcingService').init();
    });

    await this.lifecycle.tryInit('providerRuntime', () => {
      const prs = this.container.get<ProviderRuntimeService>('providerRuntimeService');
      const ks = this.container.get<KeyService>('keyService');
      const keys: Array<{ id: string; key: string; provider: string }> = ks.getKeys?.() ?? [];
      for (const key of keys) {
        prs.createInstance(key);
      }
    });

    await this.lifecycle.tryInit('rotation', async () => {
      const svc = this.container.get<RotationService>('rotationService');
      return svc.init();
    });

    try {
      const orch = this.container.get<Orchestrator>('orchestrator');
      orch.mount(AuditorTopology);
    } catch (e) {
      this.logger.error('Bootstrap', 'Failed to mount topology', { error: e });
    }

    this.eventBus.emit(EVENTS.COMMAND, { action: 'run_health_checks' });
    this.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Super-Agents OS Runtime ready', type: 'success' });
    this.eventBus.emit(EVENTS.RUNTIME_READY, { timestamp: Date.now() });

    this.phase = 'ready';
    return true;
  }

  private registerWithLifecycle(name: string, instance: unknown) {
    if (instance && typeof (instance as ILifecycle).init === 'function' && typeof (instance as ILifecycle).destroy === 'function') {
      this.lifecycle.register(name, instance as ILifecycle);
    }
  }
}
