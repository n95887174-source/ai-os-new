import type { IContainer } from './container';
import type { IEventBus, IDatabaseService, ISecurityService, IRuntimeManager } from './types/interfaces';
import type { StorageLayer } from './contracts/storage/storage-layer';
import { LoggerService } from './services/logger-service';
import { RouterService } from './services/provider-router';
import { ProviderAdapterRegistry } from './services/provider-adapter-registry';
import { KeyService, FREE_TIER_LIMITS } from './services/key-management/key-service';
import { SettingsService, type SettingsServiceDeps } from './services/settings-service';
import { PricingService } from './services/pricing-service';
import { ProviderTracker } from './services/provider-tracker';
import { SystemKernel } from './kernel';
import { MetricsService } from './services/metrics-service';
import { RotationService } from './services/rotation-service';
import { PolicyService } from './services/policy-service';
import { ToolService } from './services/tool-executor';
import { MemoryService } from './services/memory-engine';
import { ExternalSecretsService } from './services/external-secrets-service';
import { CognitiveService, type CognitiveServiceDeps } from './services/cognitive-service';
import { DebateService } from './services/debate-service';
import { DebateEngine } from './services/debate-runtime/debate-engine';
import { CognitiveIntelligenceService } from './services/cognitive-intelligence/cognitive-intelligence-service';
import { WhatIfService } from './services/runtime-intelligence/whatif-service';
import { PressureMapService } from './services/runtime-intelligence/pressure-map-service';
import { DiagnosticService } from './services/runtime-intelligence/diagnostic-service';
import { AgentService } from './services/agent-service';
import { TraceService } from './services/trace-service';
import { HealthService as HealthCheckService } from './services/health-service';
import { OrchestrationService as Orchestrator } from './services/orchestration-service';
import { RoleService } from './services/role-service';
import { SkillService } from './services/skill-service';
import { MCPService } from './services/mcp-service';
import { SandboxService } from './services/sandbox-service';
import { BudgetService } from './services/budget-service';
import { RoutingPolicyService } from './services/routing-policy/routing-policy-service';
import { KeyStateStore } from './services/key-state-store';
import { UsageTracker } from './services/usage-tracker';
import { CacheService } from './services/cache-service';
import { ConfigService } from './services/config-service';
import { SnapshotService } from './services/snapshot-service';
import { AdvisorService } from './services/advisor-service';
import { AdminService } from './services/admin-service';
import { TimelineService } from './services/timeline-service';
import { MonitoringService } from './services/monitoring-service';
import { LLMClientService } from './services/llm-client-service';
import { VirtualKeyService } from './services/virtual-key-service';
import { ProviderRuntimeService } from './services/provider-runtime/provider-service';
import { ChatService } from './services/chat-service';
import { WorkspaceService } from './services/workspace-service';
import { ProbeService } from './services/probe-service';
import { GroupManagerService } from './services/group-manager';
import { SessionAffinityStore } from './services/session-affinity-store';
import { SystemStatusService } from './services/system-status-service';
import { FeatureFlagService } from './services/feature-flag-service';
import { AutoDebateService } from './services/auto-debate/auto-debate-service';
import { EventSourcingService } from './services/event-sourcing/event-sourcing-service';
import { NotificationWebhookService } from './services/notification-webhook-service';
import { CompromiseWebhookService } from './services/compromise-webhook-service';
import { ConsistencyChecker } from './services/consistency-checker';

// Dependency groups (order matters — registered top-down; lazy getters break cycles)
// Group 1: Foundation (no deps on kernel services) — settings, pricing, tracker
// Group 2: Kernel (depends on database + eventBus)
// Group 3: Infrastructure (adapter registry, key service, rotation, policy, tool, feature flags)
// Group 4: Memory & cognitive (depends on infra)
// Group 5: Debate, routing, orchestration (depends on infra + cognitive)
// Group 6: High-level services (admin, monitoring, chat, probe, event sourcing)
export function registerServices(
  container: IContainer,
  eventBus: IEventBus,
  registerWithLifecycle: (name: string, instance: unknown) => void,
): void {
  const register = <T>(name: string, instance: T) => {
    if (!container.has(name)) {
      container.register(name, instance);
      registerWithLifecycle(name, instance);
    }
  };
  const get = <T>(name: string) => container.get<T>(name);

  register('settingsService', new SettingsService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    get routerService() { return get<SettingsServiceDeps['routerService']>('routerService'); },
    get kernel() { return get<SettingsServiceDeps['kernel']>('kernel'); },
  }));

  register('pricingService', new PricingService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('providerTracker', new ProviderTracker({
    costCalculator: get<PricingService>('pricingService'),
  }));

  register('kernel', new SystemKernel({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    providerTracker: get<ProviderTracker>('providerTracker'),
  }));

  register('metricsService', new MetricsService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    kernel: get<SystemKernel>('kernel'),
  }));

  register('providerAdapterRegistry', new ProviderAdapterRegistry());

  const ksContainer = container;
  register('keyService', new KeyService({
    database: get<IDatabaseService>('database'),
    keyStore: get<StorageLayer>('storageLayer').keys,
    eventBus: get<IEventBus>('eventBus'),
    securityService: get<ISecurityService>('securityService'),
    pricingService: get<PricingService>('pricingService'),
    providerAdapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
    get advisorService() { return ksContainer.get<AdvisorService>('advisorService'); },
  }));

  register('groupManagerService', new GroupManagerService({
    keyService: get<KeyService>('keyService'),
    eventBus: get<IEventBus>('eventBus'),
    storage: {
      getKv: async <T>(id: string) => get<IDatabaseService>('database').getKv<T>(id),
      setKv: async <T>(id: string, value: T) => get<IDatabaseService>('database').setKv(id, value),
    },
  }));

  register('keyStateStore', new KeyStateStore(get<IEventBus>('eventBus')));

  register('sessionAffinityStore', new SessionAffinityStore(get<IEventBus>('eventBus'), get<KeyStateStore>('keyStateStore')));

  register('systemStatusService', new SystemStatusService({
    groupManager: get<GroupManagerService>('groupManagerService'),
    keyService: get<KeyService>('keyService'),
    keyStateStore: get<KeyStateStore>('keyStateStore'),
  }));

  register('rotationService', new RotationService({
    keyManager: get<KeyService>('keyService'),
    eventBus: get<IEventBus>('eventBus'),
    adapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
    logger: get<LoggerService>('logger'),
    groupManager: get<GroupManagerService>('groupManagerService'),
  }));

  register('policyService', new PolicyService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('toolService', new ToolService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('featureFlagService', new FeatureFlagService());

  register('memoryService', new MemoryService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    featureFlags: get<FeatureFlagService>('featureFlagService'),
  }));

  register('externalSecretsService', new ExternalSecretsService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('cognitiveService', new CognitiveService({
    traceStore: get<StorageLayer>('storageLayer').traces,
    eventBus: get<IEventBus>('eventBus'),
    get routerService() { return get<CognitiveServiceDeps['routerService']>('routerService'); },
    get keyService() { return get<CognitiveServiceDeps['keyService']>('keyService'); },
    get roleService() { return get<CognitiveServiceDeps['roleService']>('roleService'); },
    get adapterRegistry() { return get<CognitiveServiceDeps['adapterRegistry']>('providerAdapterRegistry'); },
  }));

  const debateContainer = container;
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

  register('cognitiveIntelligenceService', new CognitiveIntelligenceService(get<IEventBus>('eventBus')));

  register('whatIfService', new WhatIfService({
    cognitiveIntelligenceService: get<CognitiveIntelligenceService>('cognitiveIntelligenceService'),
  }));

  register('pressureMapService', new PressureMapService({
    eventBus: get<IEventBus>('eventBus'),
    cognitiveIntelligenceService: get<CognitiveIntelligenceService>('cognitiveIntelligenceService'),
  }));

  register('diagnosticService', new DiagnosticService({
    eventBus: get<IEventBus>('eventBus'),
    cognitiveIntelligenceService: get<CognitiveIntelligenceService>('cognitiveIntelligenceService'),
  }));

  const _container = container;
  const agentServiceDeps = {
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    pricingService: get<PricingService>('pricingService'),
    get orchestrator() { return _container.get<Orchestrator>('orchestrator'); },
  };

  register('agentService', new AgentService(agentServiceDeps));

  register('traceService', new TraceService({
    eventBus: get<IEventBus>('eventBus'),
    database: get<IDatabaseService>('database'),
  }));

  register('healthCheckService', new HealthCheckService({
    eventBus: get<IEventBus>('eventBus'),
    keyService: get<KeyService>('keyService'),
    adapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
  }));

  register('orchestrator', new Orchestrator({
    eventBus: get<IEventBus>('eventBus'),
    toolService: get<ToolService>('toolService'),
    cognitiveService: get<CognitiveService>('cognitiveService'),
    policyService: get<PolicyService>('policyService'),
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
    eventBus: get<IEventBus>('eventBus'),
    toolService: get<ToolService>('toolService'),
    orchestrator: get<Orchestrator>('orchestrator'),
  }));

  register('skillService', new SkillService({
    skillsStore: get<StorageLayer>('storageLayer').skills,
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('mcpService', new MCPService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('sandboxService', new SandboxService({
    toolService: get<ToolService>('toolService'),
  }));

  register('budgetService', new BudgetService({
    eventBus: get<IEventBus>('eventBus'),
    database: get<IDatabaseService>('database'),
    costCalculator: get<PricingService>('pricingService'),
  }));

  register('routingPolicyService', new RoutingPolicyService({
    settingsService: get<SettingsService>('settingsService'),
    pricingService: get<PricingService>('pricingService'),
  }));

  register('routerService', new RouterService({
    kernel: get<SystemKernel>('kernel'),
    keyService: get<KeyService>('keyService'),
    pricingService: get<PricingService>('pricingService'),
    eventBus: get<IEventBus>('eventBus'),
    budgetService: get<BudgetService>('budgetService'),
    policyService: get<PolicyService>('policyService'),
    database: get<IDatabaseService>('database'),
    routingPolicyService: get<RoutingPolicyService>('routingPolicyService'),
    keyStateStore: get<KeyStateStore>('keyStateStore'),
    sessionAffinityStore: get<SessionAffinityStore>('sessionAffinityStore'),
  }));

  register('usageTracker', new UsageTracker({
    database: get<IDatabaseService>('database'),
  }));

  register('cacheService', new CacheService({
    database: get<IDatabaseService>('database'),
  }));

  register('configService', new ConfigService({
    database: get<IDatabaseService>('database'),
  }));

  register('snapshotService', new SnapshotService({
    eventBus: get<IEventBus>('eventBus'),
    database: get<IDatabaseService>('database'),
    kernel: get<SystemKernel>('kernel'),
    orchestrator: get<Orchestrator>('orchestrator'),
  }));

  register('advisorService', new AdvisorService({
    eventBus: get<IEventBus>('eventBus'),
    database: get<IDatabaseService>('database'),
    kernel: get<SystemKernel>('kernel'),
    keyService: get<KeyService>('keyService'),
    routerService: get<RouterService>('routerService'),
    adapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
    orchestrator: get<Orchestrator>('orchestrator'),
    pricingService: get<PricingService>('pricingService'),
    budgetService: get<BudgetService>('budgetService'),
    healthCheckService: get<HealthCheckService>('healthCheckService'),
    metricsService: get<MetricsService>('metricsService'),
  }));

  register('adminService', new AdminService({
    eventBus: get<IEventBus>('eventBus'),
    keyService: get<KeyService>('keyService'),
    kernel: get<SystemKernel>('kernel'),
    orchestrator: get<Orchestrator>('orchestrator'),
    settingsService: get<SettingsService>('settingsService'),
    agentService: get<AgentService>('agentService'),
    metricsService: get<MetricsService>('metricsService'),
    toolService: get<ToolService>('toolService'),
    roleService: get<RoleService>('roleService'),
    snapshotService: get<SnapshotService>('snapshotService'),
    runtime: get<IRuntimeManager>('runtime'),
  }));

  register('timelineService', new TimelineService({
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('monitoringService', new MonitoringService({
    eventBus: get<IEventBus>('eventBus'),
    traceService: get<TraceService>('traceService'),
    metricsService: get<MetricsService>('metricsService'),
    timelineService: get<TimelineService>('timelineService'),
    routingPolicyService: get<RoutingPolicyService>('routingPolicyService'),
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
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    keyService: get<KeyService>('keyService'),
  }));

  register('providerRuntimeService', new ProviderRuntimeService({
    onStateChange: (snap) => {
      eventBus.emit('provider-runtime:state', snap);
    },
    onBudgetChange: (snap) => {
      eventBus.emit('provider-runtime:budget', snap);
    },
  }));

  register('chatService', new ChatService({
    eventBus: get<IEventBus>('eventBus'),
    keyService: get<KeyService>('keyService'),
    virtualKeyService: get<VirtualKeyService>('virtualKeyService'),
    settingsService: get<SettingsService>('settingsService'),
    routerService: get<RouterService>('routerService'),
    cacheService: get<CacheService>('cacheService'),
    policyService: get<PolicyService>('policyService'),
    freeTierLimits: get('freeTierLimits'),
    providerRuntime: get<ProviderRuntimeService>('providerRuntimeService'),
    routingPolicyService: get<RoutingPolicyService>('routingPolicyService'),
    logger: get<LoggerService>('logger'),
  }));

  register('workspaceService', new WorkspaceService({
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('probeService', new ProbeService({
    keyService: get<KeyService>('keyService'),
    adapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
    keyStateStore: get<KeyStateStore>('keyStateStore'),
    eventBus: get<IEventBus>('eventBus'),
  }));

  const _bootstrapContainer = container;
  register('autoDebateService', new AutoDebateService({
    keyService: get<KeyService>('keyService'),
    debateService: {
      startDebate: (topic, participants, strategy, maxRounds, config) =>
        _bootstrapContainer.get<DebateService>('debateService').startDebate(topic, participants, strategy as any, maxRounds, config as any),
    },
  }));

  register('eventSourcingService', new EventSourcingService({
    subscribeAll: (cb) => eventBus.subscribeAll(cb),
    getStateSnapshot: () => {
      try {
        const kernel = get<SystemKernel>('kernel');
        return kernel.getState?.() ?? {};
      } catch { return {}; }
    },
    onReplayEvent: (event) => {
      const logger = get<LoggerService>('logger');
      logger.info('EventSourcing', `Replay: ${event.event} #${event.sequence}`);
    },
  }));

  register('notificationWebhookService', new NotificationWebhookService({
    eventBus: get<IEventBus>('eventBus'),
    database: get<IDatabaseService>('database'),
  }));

  register('compromiseWebhookService', new CompromiseWebhookService({
    eventBus: get<IEventBus>('eventBus'),
    keyService: get<KeyService>('keyService'),
  }));

  register('consistencyChecker', new ConsistencyChecker());
}
