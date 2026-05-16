import type { IBootstrap, IContainer, IEventBus } from './types/interfaces';
import type { ILifecycle } from './contracts/lifecycle';
import { LifecycleManager } from './services/lifecycle-manager';
import { CacheService } from './services/cache-service';
import { SnapshotService } from './services/snapshot-service';
import { AdminService } from './services/admin-service';
import { AdvisorService } from './services/advisor-service';
import { ProviderTracker } from './services/provider-tracker';
import { BudgetService } from './services/budget-service';
import { UsageTracker } from './services/usage-tracker';
import { TimelineService } from './services/timeline-service';
import { MonitoringService } from './services/monitoring-service';
import { ProviderAdapterRegistry } from './services/provider-adapter-registry';
import { LLMClientService } from './services/llm-client-service';
import { ProviderRuntimeService } from './services/provider-runtime/provider-service';
import { EventSourcingService } from './services/event-sourcing/event-sourcing-service';
import { ChatService } from './services/chat-service';
import { VirtualKeyService } from './services/virtual-key-service';
import { FREE_TIER_LIMITS } from './services/key-management/key-service';

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

  constructor(container: IContainer, eventBus: IEventBus) {
    this.container = container;
    this.eventBus = eventBus;
  }

  private registerMigratedServices() {
    const register = <T>(name: string, instance: T) => {
      if (!this.container.has(name)) {
        this.container.register(name, instance);
        this.registerWithLifecycle(name, instance);
      }
    };
    const get = <T>(name: string) => this.container.get<T>(name);

    register('providerTracker', new ProviderTracker({
      costCalculator: this.container.has('pricingService') ? get('pricingService') : undefined,
    }));

    register('budgetService', new BudgetService({
      eventBus: get('eventBus'),
      database: get('database'),
      costCalculator: get('pricingService'),
    }));

    register('usageTracker', new UsageTracker({
      database: get('database'),
    }));

    register('cacheService', new CacheService({
      database: get('database'),
    }));

    register('snapshotService', new SnapshotService({
      eventBus: get('eventBus'),
      database: get('database'),
      kernel: get('kernel'),
      orchestrator: get('orchestrator'),
    }));

    register('advisorService', new AdvisorService({
      eventBus: get('eventBus'),
      database: get('database'),
      kernel: get('kernel'),
      keyService: get('keyService'),
      routerService: get('routerService'),
      adapterRegistry: get('adapterRegistry'),
      orchestrator: get('orchestrator'),
      pricingService: get('pricingService'),
      budgetService: get('budgetService'),
      healthCheckService: get('healthCheckService'),
      metricsService: get('metricsService'),
    }));

    register('adminService', new AdminService({
      eventBus: get('eventBus'),
      keyService: get('keyService'),
      kernel: get('kernel'),
      orchestrator: get('orchestrator'),
      settingsService: get('settingsService'),
      agentService: get('agentService'),
      metricsService: get('metricsService'),
      toolService: get('toolService'),
      roleService: get('roleService'),
      snapshotService: get('snapshotService'),
      runtime: get('runtime'),
    }));

    register('timelineService', new TimelineService({
      eventBus: get('eventBus'),
    }));

    register('monitoringService', new MonitoringService({
      eventBus: get('eventBus'),
      traceService: get('traceService'),
      metricsService: get('metricsService'),
      timelineService: get('timelineService'),
    }));

    register('providerAdapterRegistry', new ProviderAdapterRegistry());

    if (this.container.has('keyService')) {
      const keyService = get<any>('keyService');
      register('llmClientService', new LLMClientService({
        resolveApiKey: (provider: string) => {
          const key = keyService.selectFromPool(provider);
          return key?.key;
        },
      }, get('providerAdapterRegistry')));
    }

    register('freeTierLimits', FREE_TIER_LIMITS);

    if (this.container.has('keyService')) {
      register('virtualKeyService', new VirtualKeyService({
        database: get('database'),
        eventBus: get('eventBus'),
        keyService: get('keyService'),
      }));
    }

    register('providerRuntimeService', new ProviderRuntimeService({
      onStateChange: (snap) => {
        this.eventBus.emit('provider-runtime:state', snap);
      },
      onBudgetChange: (snap) => {
        this.eventBus.emit('provider-runtime:budget', snap);
      },
    }));

    if (this.container.has('keyService') && this.container.has('routerService')) {
      const vks = this.container.has('virtualKeyService') ? get('virtualKeyService') : undefined;
      register('chatService', new ChatService({
        eventBus: get('eventBus'),
        keyService: get('keyService'),
        virtualKeyService: vks,
        settingsService: get('settingsService'),
        routerService: get('routerService'),
        cacheService: get('cacheService'),
        policyService: get('policyService'),
        freeTierLimits: get('freeTierLimits'),
        providerRuntime: get('providerRuntimeService'),
      }));
    }

    register('eventSourcingService', new EventSourcingService({
      subscribeAll: (cb) => this.eventBus.subscribeAll(cb),
      getStateSnapshot: () => {
        try {
          const kernel = get<any>('kernel');
          return kernel.getState?.() ?? {};
        } catch { return {}; }
      },
      onReplayEvent: (event) => {
        console.log(`[EventSourcing] Replay: ${event.eventName} #${event.sequence}`);
      },
    }));
  }

  private async tryInit<T>(name: string, fn: () => Promise<T> | T, retries = 2): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await fn();
        this.serviceStatus.push({ name, status: 'ok' });
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (attempt < retries) {
          console.warn(`[Bootstrap] Service '${name}' attempt ${attempt}/${retries} failed, retrying...`);
          await new Promise(r => setTimeout(r, 500 * attempt));
        } else {
          this.serviceStatus.push({ name, status: 'error', error: msg });
          console.error(`[Bootstrap] Service '${name}' failed after ${retries} attempts:`, e);
        }
      }
    }
    return false;
  }

  async init(): Promise<BootstrapReport> {
    if (this.isStarted) return this.getReport();
    this.isStarted = true;
    this.startTime = Date.now();
    this.serviceStatus = [];
    this.error = null;

    console.log('[Bootstrap] Initializing Super-Agents OS Runtime...');

    this.phase = 'kernel';

    const kernel = this.container.get<any>('kernel');
    await this.tryInit('kernel', () => kernel.init());

    this.registerMigratedServices();

    this.phase = 'services';

    // Register legacy container services with lifecycle manager
    const legacyNames = ['kernel', 'settingsService', 'keyService', 'toolService', 'agentService',
      'memoryService', 'cognitiveService', 'policyService', 'roleService', 'snapshotService',
      'debateService', 'metricsService', 'pricingService',
      'orchestrator', 'traceService', 'healthCheckService', 'notificationWebhookService',
      'externalSecretsService', 'compromiseWebhookService', 'eventSourcingService',
    ];
    for (const name of legacyNames) {
      try { this.registerWithLifecycle(name, this.container.get(name)); } catch {}
    }

    const results = await Promise.all([
      this.tryInit('settings', () => this.container.get<any>('settingsService').init()),
      this.tryInit('keyService', () => this.container.get<any>('keyService').init()),
      this.tryInit('toolService', () => this.container.get<any>('toolService').init()),
      this.tryInit('agentService', () => this.container.get<any>('agentService').init()),
      this.tryInit('memoryService', () => this.container.get<any>('memoryService').init()),
      this.tryInit('cognitiveService', () => this.container.get<any>('cognitiveService').init()),
      this.tryInit('policyService', () => this.container.get<any>('policyService').init()),
      this.tryInit('roleService', () => this.container.get<any>('roleService').init()),
      this.tryInit('snapshotService', () => this.container.get<any>('snapshotService').init()),
      this.tryInit('debateService', () => this.container.get<any>('debateService').init()),
      this.tryInit('metricsService', () => this.container.get<any>('metricsService').init()),
      this.tryInit('advisorService', () => this.container.get<any>('advisorService').init()),
      this.tryInit('pricingService', () => this.container.get<any>('pricingService').init()),
      this.tryInit('budgetService', () => this.container.get<any>('budgetService').init()),
      this.tryInit('usageTracker', () => this.container.get<any>('usageTracker').init()),
      this.tryInit('cacheService', () => this.container.get<any>('cacheService').init()),
      this.tryInit('chatService', () => this.container.get<any>('chatService').init()),
      this.tryInit('timelineService', () => this.container.get<any>('timelineService').init()),
      this.tryInit('adminService', () => this.container.get<any>('adminService').init()),
    ]);

    if (results.every(Boolean)) {
      this.phase = 'topology';

      // Initialize event sourcing (binds recorder to event bus)
      await this.tryInit('eventSourcing', () => {
        this.container.get<any>('eventSourcingService').init();
      });

      // Create provider runtime instances from existing keys
      await this.tryInit('providerRuntime', () => {
        const prs = this.container.get<any>('providerRuntimeService');
        const ks = this.container.get<any>('keyService');
        const keys: Array<{ id: string; key: string; provider: string }> = ks.getKeys?.() ?? [];
        for (const key of keys) {
          prs.createInstance(key);
        }
      });

      try {
        this.container.get<any>('orchestrator').mount();
        this.serviceStatus.push({ name: 'topology', status: 'ok' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.serviceStatus.push({ name: 'topology', status: 'error', error: msg });
      }

      this.eventBus.emit('system:command', { action: 'run_health_checks' });

      this.phase = 'ready';
    } else {
      this.phase = 'failed';
      this.error = 'One or more core services failed to initialize';
    }

    return this.getReport();
  }

  getReport(): BootstrapReport {
    return {
      phase: this.phase,
      started: this.startTime,
      completed: Date.now(),
      duration: this.startTime ? Date.now() - this.startTime : 0,
      error: this.error,
      services: [...this.serviceStatus],
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
    console.log('[Bootstrap] Shutting down Super-Agents OS Runtime...');

    await this.lifecycle.shutdown();

    this.serviceStatus = [];
    this.error = null;
    this.isStarted = false;
    this.phase = 'pending';
    console.log('[Bootstrap] Shutdown complete.');
  }

  private registerWithLifecycle(name: string, instance: unknown) {
    if (instance && typeof (instance as ILifecycle).init === 'function' && typeof (instance as ILifecycle).destroy === 'function') {
      this.lifecycle.register(name, instance as ILifecycle);
    }
  }
}
