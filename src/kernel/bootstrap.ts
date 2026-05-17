import type { IBootstrap, IContainer, IEventBus } from './types/interfaces';
import type { ILifecycle } from './contracts/lifecycle';
import { LifecycleManager } from './services/lifecycle-manager';
import { LoggerService } from './services/logger-service';
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
import { KeyService, FREE_TIER_LIMITS } from './services/key-management/key-service';
import { SettingsService } from './services/settings-service';
import { PolicyService } from './services/policy-service';
import { RoleService } from './services/role-service';
import { ToolService } from './services/tool-executor';
import { MemoryService } from './services/memory-engine';
import { ExternalSecretsService } from './services/external-secrets-service';
import { CognitiveService } from './services/cognitive-service';
import { PricingService } from './services/pricing-service';
import { MetricsService } from './services/metrics-service';
import { DebateService } from './services/debate-service';
import { AgentService } from './services/agent-service';
import { OrchestrationService as Orchestrator } from './services/orchestration-service';
import { HealthService as HealthCheckService } from './services/health-service';
import { TraceService } from './services/trace-service';
import { RouterService } from './services/provider-router';
import { EVENTS } from './events/event-names';
import { AuditorTopology } from '../core/IntelligenceDSL';
import { dexieDb } from '../core/DatabaseService';
import { SystemKernel } from './kernel';
import { SkillService } from './services/skill-service';
import { MCPService } from './services/mcp-service';


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
  }

  private registerMigratedServices() {
    const register = <T>(name: string, instance: T) => {
      if (!this.container.has(name)) {
        this.container.register(name, instance);
        this.registerWithLifecycle(name, instance);
      }
    };
    const get = <T>(name: string) => this.container.get<T>(name);

    register('settingsService', new SettingsService({
      database: get('database'),
      eventBus: get('eventBus'),
    }));

    register('pricingService', new PricingService({
      database: get('database'),
    }));

    register('providerTracker', new ProviderTracker({
      costCalculator: get('pricingService'),
    }));

    register('kernel', new SystemKernel({
      database: get('database'),
      eventBus: get('eventBus'),
      providerTracker: get('providerTracker'),
    }));

    register('metricsService', new MetricsService({
      database: get('database'),
      eventBus: get('eventBus'),
      kernel: get('kernel'),
    }));

    register('keyService', new KeyService({
      database: get('database'),
      eventBus: get('eventBus'),
      securityService: get('securityService'),
    }));

    register('policyService', new PolicyService({
      database: get('database'),
      eventBus: get('eventBus'),
    }));

    register('toolService', new ToolService({
      database: get('database'),
      eventBus: get('eventBus'),
    }));

    register('memoryService', new MemoryService({
      database: get('database'),
      eventBus: get('eventBus'),
    }));

    register('externalSecretsService', new ExternalSecretsService({
      database: get('database'),
      eventBus: get('eventBus'),
    }));

    register('cognitiveService', new CognitiveService({
      database: get('database'),
      eventBus: get('eventBus'),
      memoryService: get('memoryService'),
    }));

    const debateContainer = this.container;
    register('debateService', new DebateService({
      database: get('database'),
      eventBus: get('eventBus'),
      get routerService() { return debateContainer.get<any>('routerService'); },
      get keyService() { return debateContainer.get<any>('keyService'); },
      get adapterRegistry() { return debateContainer.get<any>('providerAdapterRegistry'); },
    }));

    // AgentService needs orchestrator (registered after it). Use a closure-captured ref so
    // the getter resolves at call-time, not at registration-time.
    const _container = this.container;
    const agentServiceDeps = {
      database: get<any>('database'),
      eventBus: get<any>('eventBus'),
      pricingService: get<any>('pricingService'),
      get orchestrator() { return _container.get<any>('orchestrator'); },
    };

    register('agentService', new AgentService(agentServiceDeps));

    register('traceService', new TraceService({
      eventBus: get('eventBus'),
    }));

    register('providerAdapterRegistry', new ProviderAdapterRegistry());

    register('healthCheckService', new HealthCheckService({
      eventBus: get('eventBus'),
      keyService: get('keyService'),
      adapterRegistry: get('providerAdapterRegistry'),
    }));

    register('orchestrator', new Orchestrator({
      eventBus: get('eventBus'),
      agentService: get('agentService'),
      toolService: get('toolService'),
    }));

    register('roleService', new RoleService({
      database: get('database'),
      eventBus: get('eventBus'),
      toolService: get('toolService'),
      orchestrator: get('orchestrator'),
    }));

    register('skillService', new SkillService({
      database: get('database'),
      eventBus: get('eventBus'),
    }));

    register('mcpService', new MCPService({
      database: get('database'),
      eventBus: get('eventBus'),
    }));

    register('budgetService', new BudgetService({
      eventBus: get('eventBus'),
      database: get('database'),
      costCalculator: get('pricingService'),
    }));

    register('routerService', new RouterService({
      kernel: get('kernel'),
      keyService: get('keyService'),
      pricingService: get('pricingService'),
      eventBus: get('eventBus'),
      budgetService: get('budgetService'),
      policyService: get('policyService'),
      database: get('database'),
      settingsService: get('settingsService'),
    }));

    register('providerTracker', new ProviderTracker({
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
      adapterRegistry: get('providerAdapterRegistry'),
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



    const keyService = get<any>('keyService');
    register('llmClientService', new LLMClientService({
      resolveApiKey: (provider: string) => {
        const key = keyService.selectFromPool(provider);
        return key?.key;
      },
    }, get('providerAdapterRegistry')));

    register('freeTierLimits', FREE_TIER_LIMITS);

    register('virtualKeyService', new VirtualKeyService({
      database: get('database'),
      eventBus: get('eventBus'),
      keyService: get('keyService'),
    }));

    register('providerRuntimeService', new ProviderRuntimeService({
      onStateChange: (snap) => {
        this.eventBus.emit('provider-runtime:state', snap);
      },
      onBudgetChange: (snap) => {
        this.eventBus.emit('provider-runtime:budget', snap);
      },
    }));

    register('chatService', new ChatService({
      eventBus: get('eventBus'),
      keyService: get('keyService'),
      virtualKeyService: get('virtualKeyService'),
      settingsService: get('settingsService'),
      routerService: get('routerService'),
      cacheService: get('cacheService'),
      policyService: get('policyService'),
      freeTierLimits: get('freeTierLimits'),
      providerRuntime: get('providerRuntimeService'),
    }));

    register('eventSourcingService', new EventSourcingService({
      subscribeAll: (cb) => this.eventBus.subscribeAll(cb),
      getStateSnapshot: () => {
        try {
          const kernel = get<any>('kernel');
          return kernel.getState?.() ?? {};
        } catch { return {}; }
      },
      onReplayEvent: (event) => {
        this.logger.info('EventSourcing', `Replay: ${event.eventName} #${event.sequence}`);
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
          this.logger.warn('Bootstrap', `Service '${name}' attempt ${attempt}/${retries} failed, retrying...`);
          await new Promise(r => setTimeout(r, 500 * attempt));
        } else {
          this.serviceStatus.push({ name, status: 'error', error: msg });
          this.logger.error('Bootstrap', `Service '${name}' failed after ${retries} attempts`, { error: e });
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

    this.logger.info('Bootstrap', 'Initializing Super-Agents OS Runtime...');

    this.phase = 'kernel';

    this.registerMigratedServices();

    const kernel = this.container.get<any>('kernel');
    await this.tryInit('kernel', () => kernel.init());

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
      this.tryInit('healthCheckService', () => this.container.get<any>('healthCheckService').init()),
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

      // Init non-migrated legacy services (Phase 1.1)
      await this.tryInit('rotation', async () => {
        const { rotationService } = await import('../services/rotation/RotationService');
        return rotationService.init();
      });

      try {
        const orch = this.container.get<any>('orchestrator');
        orch.mount(AuditorTopology);
        this.serviceStatus.push({ name: 'topology', status: 'ok' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.serviceStatus.push({ name: 'topology', status: 'error', error: msg });
      }

      this.eventBus.emit('system:command', { action: 'run_health_checks' });
      this.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Super-Agents OS Runtime ready', type: 'success' });
      this.eventBus.emit('system:runtime_ready', { timestamp: Date.now() });

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
    this.logger.info('Bootstrap', 'Shutting down Super-Agents OS Runtime...');

    await this.lifecycle.shutdown();

    this.serviceStatus = [];
    this.error = null;
    this.isStarted = false;
    this.phase = 'pending';
    this.logger.info('Bootstrap', 'Shutdown complete.');
  }

  private registerWithLifecycle(name: string, instance: unknown) {
    if (instance && typeof (instance as ILifecycle).init === 'function' && typeof (instance as ILifecycle).destroy === 'function') {
      this.lifecycle.register(name, instance as ILifecycle);
    }
  }
}
