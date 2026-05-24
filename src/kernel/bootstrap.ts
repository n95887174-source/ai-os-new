import type { IBootstrap, IEventBus, IDatabaseService, ISecurityService } from './types/interfaces';
import type { StorageLayer } from './contracts/storage/storage-layer';
import { type IContainer, Container } from './container';
import type { ILifecycle } from './contracts/lifecycle';
import type { IRuntimeManager } from './types/interfaces';
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
import { SettingsService, type SettingsServiceDeps } from './services/settings-service';
import { PolicyService } from './services/policy-service';
import { RoleService } from './services/role-service';
import { ToolService } from './services/tool-executor';
import { MemoryService } from './services/memory-engine';
import { ExternalSecretsService } from './services/external-secrets-service';
import { CognitiveService, type CognitiveServiceDeps } from './services/cognitive-service';
import { PricingService } from './services/pricing-service';
import { MetricsService } from './services/metrics-service';
import { DebateService } from './services/debate-service';
import { DebateEngine } from './services/debate-runtime/debate-engine';
import { CognitiveIntelligenceService } from './services/cognitive-intelligence/cognitive-intelligence-service';
import { AgentService } from './services/agent-service';
import { OrchestrationService as Orchestrator } from './services/orchestration-service';
import { HealthService as HealthCheckService } from './services/health-service';
import { TraceService } from './services/trace-service';
import { RouterService } from './services/provider-router';
import { RoutingPolicyService } from './services/routing-policy/routing-policy-service';
import { WhatIfService } from './services/runtime-intelligence/whatif-service';
import { PressureMapService } from './services/runtime-intelligence/pressure-map-service';
import { DiagnosticService } from './services/runtime-intelligence/diagnostic-service';
import { EVENTS } from './events/event-names';
import { AuditorTopology } from './state/topology-defaults';
import { SystemKernel } from './kernel';
import { SkillService } from './services/skill-service';
import { MCPService } from './services/mcp-service';
import { SandboxService } from './services/sandbox-service';
import { RotationService } from './services/rotation-service';
import { ConfigService } from './services/config-service';
import { NotificationWebhookService } from './services/notification-webhook-service';
import { CompromiseWebhookService } from './services/compromise-webhook-service';
import { AutoDebateService } from './services/auto-debate/auto-debate-service';
import { WorkspaceService } from './services/workspace-service';

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
      get routerService() { return get<SettingsServiceDeps['routerService']>('routerService'); },
      get kernel() { return get<SettingsServiceDeps['kernel']>('kernel'); },
    }));

    register('pricingService', new PricingService({
      database: get('database'),
      eventBus: get('eventBus'),
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

    register('providerAdapterRegistry', new ProviderAdapterRegistry());

    const ksContainer = this.container;
    register('keyService', new KeyService({
      database: get<IDatabaseService>('database'),
      keyStore: get<StorageLayer>('storageLayer').keys,
      eventBus: get<IEventBus>('eventBus'),
      securityService: get<ISecurityService>('securityService'),
      pricingService: get<PricingService>('pricingService'),
      providerAdapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
      get advisorService() { return ksContainer.get<AdvisorService>('advisorService'); },
    }));

    register('rotationService', new RotationService({
      keyManager: get('keyService'),
      eventBus: get('eventBus'),
      adapterRegistry: get('providerAdapterRegistry'),
      logger: get('logger'),
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
      traceStore: get<StorageLayer>('storageLayer').traces,
      eventBus: get('eventBus'),
      get routerService() { return get<CognitiveServiceDeps['routerService']>('routerService'); },
      get keyService() { return get<CognitiveServiceDeps['keyService']>('keyService'); },
      get roleService() { return get<CognitiveServiceDeps['roleService']>('roleService'); },
      get adapterRegistry() { return get<CognitiveServiceDeps['adapterRegistry']>('providerAdapterRegistry'); },
    }));

    const debateContainer = this.container;
    register('debateService', new DebateService({
      database: get<IDatabaseService>('database'),
      eventBus: get<IEventBus>('eventBus'),
      get routerService() { return debateContainer.get<RouterService>('routerService'); },
      get keyService() { return debateContainer.get<KeyService>('keyService'); },
      get adapterRegistry() { return debateContainer.get<ProviderAdapterRegistry>('providerAdapterRegistry'); },
      get workspaceService() { return debateContainer.get<WorkspaceService>('workspaceService'); },
    }));

    register('debateEngine', new DebateEngine({
      eventBus: get<IEventBus>('eventBus'),
      get getRouterService() { return () => debateContainer.get<RouterService>('routerService'); },
      get getKeyService() { return () => debateContainer.get<KeyService>('keyService'); },
      get getAdapterRegistry() { return () => debateContainer.get<ProviderAdapterRegistry>('providerAdapterRegistry'); },
    }));

    register('cognitiveIntelligenceService', new CognitiveIntelligenceService(get('eventBus')));

    register('whatIfService', new WhatIfService({
      cognitiveIntelligenceService: get('cognitiveIntelligenceService'),
    }));

    register('pressureMapService', new PressureMapService({
      eventBus: get('eventBus'),
      cognitiveIntelligenceService: get('cognitiveIntelligenceService'),
    }));

    register('diagnosticService', new DiagnosticService({
      eventBus: get('eventBus'),
      cognitiveIntelligenceService: get('cognitiveIntelligenceService'),
    }));

    // AgentService needs orchestrator (registered after it). Use a closure-captured ref so
    // the getter resolves at call-time, not at registration-time.
    const _container = this.container;
    const agentServiceDeps = {
      database: get<IDatabaseService>('database'),
      eventBus: get<IEventBus>('eventBus'),
      pricingService: get<PricingService>('pricingService'),
      get orchestrator() { return _container.get<Orchestrator>('orchestrator'); },
    };

    register('agentService', new AgentService(agentServiceDeps));

    register('traceService', new TraceService({
      eventBus: get('eventBus'),
      database: get('database'),
    }));

    register('healthCheckService', new HealthCheckService({
      eventBus: get('eventBus'),
      keyService: get('keyService'),
      adapterRegistry: get('providerAdapterRegistry'),
    }));

    register('orchestrator', new Orchestrator({
      eventBus: get('eventBus'),
      toolService: get('toolService'),
      cognitiveService: get('cognitiveService'),
      policyService: get('policyService'),
    }));

    const storage = get<StorageLayer>('storageLayer');
    register('roleService', new RoleService({
      rolesStore: storage.roles,
      keyValue: {
        get: async (id: string) => {
          const val = await storage.config.get<unknown>(id);
          return val != null ? { id, value: val } : undefined;
        },
        put: async (item: { id: string; value: unknown; createdAt?: number }) => {
          await storage.config.set(item.id, item.value);
        },
      },
      eventBus: get('eventBus'),
      toolService: get('toolService'),
      orchestrator: get('orchestrator'),
    }));

    register('skillService', new SkillService({
      skillsStore: get<StorageLayer>('storageLayer').skills,
      eventBus: get('eventBus'),
    }));

    register('mcpService', new MCPService({
      database: get('database'),
      eventBus: get('eventBus'),
    }));

    register('sandboxService', new SandboxService({
      toolService: get('toolService'),
    }));

    register('budgetService', new BudgetService({
      eventBus: get('eventBus'),
      database: get('database'),
      costCalculator: get('pricingService'),
    }));

    register('routingPolicyService', new RoutingPolicyService({
      settingsService: get('settingsService'),
      pricingService: get('pricingService'),
    }));

    register('routerService', new RouterService({
      kernel: get('kernel'),
      keyService: get('keyService'),
      pricingService: get('pricingService'),
      eventBus: get('eventBus'),
      budgetService: get('budgetService'),
      policyService: get('policyService'),
      database: get('database'),
      routingPolicyService: get('routingPolicyService'),
    }));

    register('usageTracker', new UsageTracker({
      database: get('database'),
    }));

    register('cacheService', new CacheService({
      database: get('database'),
    }));

    register('configService', new ConfigService({
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
      routingPolicyService: get('routingPolicyService'),
    }));



    const keyService = get<KeyService>('keyService');
    register('llmClientService', new LLMClientService({
      resolveApiKey: (provider: string) => {
        const key = keyService.selectFromPool(provider);
        return key?.key;
      },
    }, get<ProviderAdapterRegistry>('providerAdapterRegistry')));

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
      routingPolicyService: get('routingPolicyService'),
      logger: get('logger'),
    }));

    register('workspaceService', new WorkspaceService({
      eventBus: get('eventBus'),
    }));

    const _bootstrapContainer = this.container;
    register('autoDebateService', new AutoDebateService({
      keyService: get<KeyService>('keyService'),
      debateService: {
        startDebate: (topic, participants, strategy, maxRounds, config) =>
          _bootstrapContainer.get<DebateService>('debateService').startDebate(topic, participants, strategy as any, maxRounds, config as any),
      },
    }));

    register('eventSourcingService', new EventSourcingService({
      subscribeAll: (cb) => this.eventBus.subscribeAll(cb),
      getStateSnapshot: () => {
        try {
          const kernel = get<SystemKernel>('kernel');
          return kernel.getState?.() ?? {};
        } catch { return {}; }
      },
      onReplayEvent: (event) => {
        this.logger.info('EventSourcing', `Replay: ${event.event} #${event.sequence}`);
      },
    }));

    register('notificationWebhookService', new NotificationWebhookService({
      eventBus: get('eventBus'),
      database: get('database'),
    }));

    register('compromiseWebhookService', new CompromiseWebhookService({
      eventBus: get('eventBus'),
      keyService: get('keyService'),
    }));
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

    this.phase = 'services';

    // Legacy registration removed as part of migration cleanup

    const serviceNames = ['configService', 'settingsService', 'keyService', 'toolService', 'sandboxService', 'agentService',
      'memoryService', 'cognitiveService', 'policyService', 'roleService', 'snapshotService',
      'debateService', 'metricsService', 'advisorService', 'pricingService',
      'budgetService', 'usageTracker', 'cacheService', 'chatService',
      'timelineService', 'adminService', 'healthCheckService', 'monitoringService',
      'routingPolicyService', 'whatIfService', 'pressureMapService', 'diagnosticService',
      'notificationWebhookService', 'compromiseWebhookService', 'externalSecretsService',
      'workspaceService',
    ];
    const results = await this.lifecycle.initAllParallel(serviceNames);

    if (results.every(Boolean)) {
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

  private registerWithLifecycle(name: string, instance: unknown) {
    if (instance && typeof (instance as ILifecycle).init === 'function' && typeof (instance as ILifecycle).destroy === 'function') {
      this.lifecycle.register(name, instance as ILifecycle);
    }
  }
}
