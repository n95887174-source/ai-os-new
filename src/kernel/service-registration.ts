import type { IContainer } from './container';
import type { IEventBus, IDatabaseService, ISecurityService, IRuntimeManager } from './types/interfaces';
import type { DataAccessLayer } from './dal';
import type { StorageLayer, KeyStore, TraceStore, DebateStore, SkillsStore, RolesStore } from './contracts/storage/storage-layer';
import type { IStorageAdapter } from './contracts/storage-adapter';
import { LoggerService } from './services/logger-service';
import { RouterService } from './services/provider-router';
import { ProviderAdapterRegistry } from './services/provider-adapter-registry';
import { KeyService, FREE_TIER_LIMITS } from './services/key-management/key-service';
import { SettingsService, type SettingsServiceDeps } from './services/settings-service';
import { PricingService } from './services/pricing-service';
import { ProviderTracker } from './services/provider-tracker';
import { CollaborativeService } from './services/collaborative-service';
import { DebateApiService } from './services/debate-api';
import { DebateKnowledgeSyncService } from './services/debate-knowledge-sync';
import { HypothesisService } from './services/hypothesis-service';
import { ResearchRunService } from './services/research-run-service';
import { ArchitectureReviewService } from './services/architecture-review-service';
import { PromptAuditService } from './services/prompt-audit-service';
import { RoutingExperimentsService } from './services/routing-experiments-service';
import { GovStressTestService } from './services/gov-stress-test-service';
import { ObsGapsService } from './services/obs-gaps-service';
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
import { StrategyRegistry } from './services/debate-runtime/debate-strategy-registry';
import { DebateModeManagerPersistent } from './services/debate-runtime/debate-mode-manager';
import { DebateWorkspace } from './services/debate-runtime/debate-workspace';
import { DebateRoom } from './services/debate-runtime/debate-room';
import { DebatePolicyEngine } from './services/debate-runtime/debate-policy-engine';
import { CognitiveIntelligenceService } from './services/cognitive-intelligence/cognitive-intelligence-service';
import { WhatIfService } from './services/runtime-intelligence/whatif-service';
import { PressureMapService } from './services/runtime-intelligence/pressure-map-service';
import { DiagnosticService } from './services/runtime-intelligence/diagnostic-service';
import { AgentService } from './services/agent-service';
import { TemplateService } from './services/template-service';
import { AgentVersionService } from './services/agent-version-service';
import { RoleVersionService } from './services/role-version-service';
import { AgentHealthMonitor } from './services/agent-health-monitor';
import { TraceService } from './services/trace-service';
import { HealthService as HealthCheckService } from './services/health-service';
import { OrchestrationService as Orchestrator } from './services/orchestration-service';
import { BlackboardService } from './services/blackboard-service';
import { RoleService } from './services/role-service';
import { SkillService } from './services/skill-service';
import { SandboxService } from './services/sandbox-service';
import { MCPService } from './services/mcp-service';
import { TaskHandoffService } from './services/task-handoff';
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
import { TopologyManager } from './services/topology-manager';
import { RaceExecutor } from './services/race-executor';
import { WorkforceFederation } from './services/workforce-federation';
import { AgentMarketplace } from './services/agent-marketplace';
import { EloRatingService, eloRatingService } from './services/elo/elo-service';
import { ChatSummarizerService, chatSummarizerService } from './services/chat-summarizer-service';
import { personaService } from './services/persona-service';

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
  const asDeps = <T>(value: unknown): T => value as T;

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

  register('keyStateStore', new KeyStateStore(get<IEventBus>('eventBus')));

  register('providerTracker', new ProviderTracker({
    costCalculator: get<PricingService>('pricingService'),
    keyStateStore: get<KeyStateStore>('keyStateStore'),
    database: get<IDatabaseService>('database'),
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
  const storageLayer = get<StorageLayer>('storageLayer');
  const keyStore = storageLayer?.keys;
  const configStore = storageLayer?.config;

  // Defensive wrapper — guarantees all KeyStore methods exist regardless of storageLayer state
  const safeKeyStore: KeyStore = keyStore && typeof keyStore.listKeys === 'function'
    ? keyStore
    : (() => {
        console.warn('[ServiceRegistration] keyStore missing or incomplete — using safe stub');
        return {
          saveKey: async () => {},
          getKey: async () => null,
          listKeys: async () => [],
          deleteKey: async () => {},
          bulkPut: async () => {},
          bulkAdd: async () => {},
          where: async () => undefined,
          exportAll: async () => '[]',
          importAll: async () => {},
          clear: async () => {},
        } as unknown as KeyStore;
      })();

  register('keyService', new KeyService(asDeps<ConstructorParameters<typeof KeyService>[0]>({
    database: get<IDatabaseService>('database'),
    keyStore: safeKeyStore,
    eventBus: get<IEventBus>('eventBus'),
    securityService: get<ISecurityService>('securityService'),
    pricingService: get<PricingService>('pricingService'),
    providerAdapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
    get advisorService() { return ksContainer.get<AdvisorService>('advisorService'); },
  })));

  register('groupManagerService', new GroupManagerService(asDeps<ConstructorParameters<typeof GroupManagerService>[0]>({
    keyService: get<KeyService>('keyService'),
    eventBus: get<IEventBus>('eventBus'),
    storage: {
      getKv: async <T>(id: string) => configStore ? configStore.get<T>(id) : null,
      setKv: async <T>(id: string, value: T) => { if (configStore) await configStore.set(id, value); },
    },
  })));

  register('sessionAffinityStore', new SessionAffinityStore(get<IEventBus>('eventBus'), get<KeyStateStore>('keyStateStore')));

  register('systemStatusService', new SystemStatusService({
    groupManager: get<GroupManagerService>('groupManagerService'),
    keyService: get<KeyService>('keyService'),
    keyStateStore: get<KeyStateStore>('keyStateStore'),
  }));

  register('rotationService', new RotationService(asDeps<ConstructorParameters<typeof RotationService>[0]>({
    keyManager: get<KeyService>('keyService'),
    eventBus: get<IEventBus>('eventBus'),
    adapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
    logger: get<LoggerService>('logger'),
    groupManager: get<GroupManagerService>('groupManagerService'),
  })));

  register('policyService', new PolicyService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('toolService', new ToolService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('featureFlagService', new FeatureFlagService());

  register('memoryService', new MemoryService(asDeps<ConstructorParameters<typeof MemoryService>[0]>({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    featureFlags: get<FeatureFlagService>('featureFlagService'),
  })));

  register('externalSecretsService', new ExternalSecretsService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
  }));

  const blackboardService = new BlackboardService({ eventBus: get<IEventBus>('eventBus') });
  register('blackboardService', blackboardService);

  register('cognitiveService', new CognitiveService({
    traceStore: storageLayer?.traces ?? {
      saveTrace: async () => {},
      getTrace: async () => null,
      queryTraces: async () => [],
      deleteTrace: async () => {},
      count: async () => 0,
      bulkPut: async () => {},
      clear: async () => {},
      exportAll: async () => '[]',
      importAll: async () => {},
    } as unknown as TraceStore,
    eventBus: get<IEventBus>('eventBus'),
    get routerService() { return get<CognitiveServiceDeps['routerService']>('routerService'); },
    get keyService() { return get<CognitiveServiceDeps['keyService']>('keyService'); },
    get roleService() { return get<CognitiveServiceDeps['roleService']>('roleService'); },
    get adapterRegistry() { return get<CognitiveServiceDeps['adapterRegistry']>('providerAdapterRegistry'); },
    blackboardService,
  }));

  const debateContainer = container;
  register('debateService', new DebateService(asDeps<ConstructorParameters<typeof DebateService>[0]>({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    get routerService() { return debateContainer.get<RouterService>('routerService'); },
    get keyService() { return debateContainer.get<KeyService>('keyService'); },
    get adapterRegistry() { return debateContainer.get<ProviderAdapterRegistry>('providerAdapterRegistry'); },
    get workspaceService() { return debateContainer.get<WorkspaceService>('workspaceService'); },
    getFeatureFlagService: () => debateContainer.get<FeatureFlagService>('featureFlagService'),
    debateStore: storageLayer?.debates ?? {
      saveSnapshot: async () => {},
      getSnapshot: async () => null,
      listSessions: async () => [],
      deleteSession: async () => {},
      saveVerdict: async () => {},
      getVerdict: async () => null,
      count: async () => 0,
    } as unknown as DebateStore,
  })));

  register('collaborativeService', new CollaborativeService({
    eventBus: get<IEventBus>('eventBus'),
    debateService: get<DebateService>('debateService'),
  }));

  register('debateApiService', new DebateApiService({
    eventBus: get<IEventBus>('eventBus'),
    debateService: get<DebateService>('debateService'),
    get orchestrator() { return debateContainer.get<Orchestrator>('orchestrator'); },
  }));

  register('debateKnowledgeSync', new DebateKnowledgeSyncService({
    eventBus: get<IEventBus>('eventBus'),
    memoryService: get<MemoryService>('memoryService'),
  }));

  register('hypothesisService', new HypothesisService({
    eventBus: get<IEventBus>('eventBus'),
    database: get<IDatabaseService>('database'),
  }));

  register('researchRunService', new ResearchRunService({
    database: get<IDatabaseService>('database'),
  }));

  register('architectureReviewService', new ArchitectureReviewService());

  register('promptAuditService', new PromptAuditService({
    get getAllRoles() {
      return () => debateContainer.get<RoleService>('roleService').getAllRoles();
    },
  }));

  register('routingExperimentsService', new RoutingExperimentsService({
    database: get<IDatabaseService>('database'),
    getAdapter: (provider: string) => {
      const registry = debateContainer.get<ProviderAdapterRegistry>('providerAdapterRegistry');
      return registry.getAdapter(provider) as unknown as { sendMessage: (messages: Array<{ role: string; content: string }>, model: string, systemPrompt: string, temperature?: number, maxTokens?: number) => Promise<{ content?: string }> } | null;
    },
  }));

  register('debateEngine', new DebateEngine({
    eventBus: get<IEventBus>('eventBus'),
    get getRouterService() { return () => debateContainer.get<RouterService>('routerService'); },
    get getKeyService() { return () => debateContainer.get<KeyService>('keyService'); },
    get getAdapterRegistry() { return () => debateContainer.get<ProviderAdapterRegistry>('providerAdapterRegistry'); },
    debateStore: storageLayer?.debates ?? {
      saveSnapshot: async () => {},
      getSnapshot: async () => null,
      listSessions: async () => [],
      deleteSession: async () => {},
      saveVerdict: async () => {},
      getVerdict: async () => null,
      count: async () => 0,
    } as unknown as DebateStore,
  }));

  debateContainer.get<DebateService>('debateService').setEngine(debateContainer.get<DebateEngine>('debateEngine'));

  register('strategyRegistry', new StrategyRegistry());
  register('debateModeManager', new DebateModeManagerPersistent(storageLayer ?? { debates: { saveSnapshot: async () => {}, getSnapshot: async () => null, listSessions: async () => [], deleteSession: async () => {}, saveVerdict: async () => {}, getVerdict: async () => null, count: async () => 0 } } as unknown as StorageLayer));

  register('debateRoom', new DebateRoom({
    getEngine: () => debateContainer.get<DebateEngine>('debateEngine'),
  }));

  register('debateWorkspace', new DebateWorkspace({
    getRoom: () => debateContainer.get<DebateRoom>('debateRoom') as unknown as DebateRoom,
    getEngine: () => debateContainer.get<DebateEngine>('debateEngine'),
    storage: storageLayer ?? { debates: { saveSnapshot: async () => {}, getSnapshot: async () => null, listSessions: async () => [], deleteSession: async () => {}, saveVerdict: async () => {}, getVerdict: async () => null, count: async () => 0 } } as unknown as StorageLayer,
  }));

  register('debatePolicyEngine', new DebatePolicyEngine());

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

  const templateService = new TemplateService({ database: get<IDatabaseService>('database') });
  register('templateService', templateService);
  void templateService.init();

  register('agentVersionService', new AgentVersionService({ database: get<IDatabaseService>('database') }));

  const roleVersionService = new RoleVersionService(get<IStorageAdapter>('storageAdapter'));
  register('roleVersionService', roleVersionService);
  roleVersionService.init();

  register('agentHealthMonitor', new AgentHealthMonitor({
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('taskHandoffService', new TaskHandoffService({
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('traceService', new TraceService(asDeps<ConstructorParameters<typeof TraceService>[0]>({
    eventBus: get<IEventBus>('eventBus'),
    database: get<IDatabaseService>('database'),
  })));

  register('healthCheckService', new HealthCheckService(asDeps<ConstructorParameters<typeof HealthCheckService>[0]>({
    eventBus: get<IEventBus>('eventBus'),
    keyService: get<KeyService>('keyService'),
    adapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
    keyStateStore: get<KeyStateStore>('keyStateStore'),
  })));

  // Register orchestrator early (before orchestrator-dependent services) so it exists in the container.
  // guarded by !has so bootstrap's own instance in initServices() is NOT overwritten — it's the one that
  // actually gets lifecycle.init() called and AuditorTopology mounted.
  if (!container.has('orchestrator')) {
    container.register('orchestrator', new Orchestrator({
      eventBus: get<IEventBus>('eventBus'),
      toolService: get<ToolService>('toolService'),
      cognitiveService: get<CognitiveService>('cognitiveService'),
      policyService: get<PolicyService>('policyService'),
    }));
    registerWithLifecycle('orchestrator', container.get<Orchestrator>('orchestrator'));
  }

  register('roleService', new RoleService({
    rolesStore: storageLayer?.roles ?? {
      loadAll: async () => [],
      saveAll: async () => {},
      toArray: async () => [],
      bulkAdd: async () => {},
      bulkPut: async () => {},
      count: async () => 0,
      clear: async () => {},
      exportAll: async () => '[]',
      importAll: async () => {},
    } as unknown as RolesStore,
    keyValue: {
      get: async (id: string) => {
        const val = configStore ? await configStore.get<unknown>(id) : null;
        return val != null ? { id, value: val } : undefined;
      },
      put: async (item: { id: string; value: unknown; createdAt?: number }) => {
        if (configStore) await configStore.set(item.id, item.value);
      },
    },
    eventBus: get<IEventBus>('eventBus'),
    toolService: get<ToolService>('toolService'),
    orchestrator: get<Orchestrator>('orchestrator'),
  }));

  register('govStressTestService', new GovStressTestService({
    getPolicies: () => debateContainer.get<PolicyService>('policyService').getPolicies().map(p => ({ type: String(p.type), value: typeof p.value === 'number' ? p.value : Number(p.value), enabled: (p as unknown as { enabled?: boolean }).enabled ?? true })),
    getViolations: (onlyActive, limit) =>
      debateContainer.get<PolicyService>('policyService').getViolations(onlyActive, limit),
    getRoleCount: () => debateContainer.get<RoleService>('roleService').getAllRoles().length,
  }));

  register('obsGapsService', new ObsGapsService());

  register('skillService', new SkillService({
    skillsStore: storageLayer?.skills ?? {
      loadAll: async () => [],
      saveAll: async () => {},
      toArray: async () => [],
      bulkAdd: async () => {},
      bulkPut: async () => {},
      count: async () => 0,
      clear: async () => {},
      exportAll: async () => '[]',
      importAll: async () => {},
    } as unknown as SkillsStore,
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

  register('raceExecutor', new RaceExecutor(get<ProviderAdapterRegistry>('providerAdapterRegistry')));

  register('routerService', new RouterService(asDeps<ConstructorParameters<typeof RouterService>[0]>({
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
  })));

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

  register('advisorService', new AdvisorService(asDeps<ConstructorParameters<typeof AdvisorService>[0]>({
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
  })));

  register('adminService', new AdminService(asDeps<ConstructorParameters<typeof AdminService>[0]>({
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
  })));

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
      const key = keyService.selectWithBurst(provider) ?? keyService.selectFromPool(provider);
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

  register('chatService', new ChatService(asDeps<ConstructorParameters<typeof ChatService>[0]>({
    eventBus: get<IEventBus>('eventBus'),
    keyService: get<KeyService>('keyService'),
    virtualKeyService: get<VirtualKeyService>('virtualKeyService'),
    settingsService: get<SettingsService>('settingsService'),
    routerService: get<RouterService>('routerService'),
    raceExecutor: get<RaceExecutor>('raceExecutor'),
    cacheService: get<CacheService>('cacheService'),
    policyService: get<PolicyService>('policyService'),
    freeTierLimits: get('freeTierLimits'),
    providerRuntime: get<ProviderRuntimeService>('providerRuntimeService'),
    routingPolicyService: get<RoutingPolicyService>('routingPolicyService'),
    getProviderState: (provider: string) => {
      const state = get<SystemKernel>('kernel').getState();
      return state.providers[provider] ?? state.providers[provider.toLowerCase()];
    },
    logger: get<LoggerService>('logger'),
  })));

  register('workspaceService', new WorkspaceService({
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('probeService', new ProbeService(asDeps<ConstructorParameters<typeof ProbeService>[0]>({
    keyService: get<KeyService>('keyService'),
    adapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
    keyStateStore: get<KeyStateStore>('keyStateStore'),
    eventBus: get<IEventBus>('eventBus'),
  })));

  const _bootstrapContainer = container;
  register('autoDebateService', new AutoDebateService({
    keyService: get<KeyService>('keyService'),
    debateService: {
      startDebate: (topic, participants, strategy, maxRounds, config) =>
        _bootstrapContainer.get<DebateService>('debateService').startDebate(topic, participants, strategy as Parameters<DebateService['startDebate']>[2], maxRounds, config as Parameters<DebateService['startDebate']>[4]),
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
    kv: get<DataAccessLayer>('dal').kv,
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
  register('consistencyHealingPipeline', get<ConsistencyChecker>('consistencyChecker'));

  register('topologyManager', new TopologyManager({
    eventBus: get<IEventBus>('eventBus'),
    orchestrator: get<Orchestrator>('orchestrator'),
    agentHealthMonitor: get<AgentHealthMonitor>('agentHealthMonitor'),
    agentService: get<AgentService>('agentService'),
    metricsService: get<MetricsService>('metricsService'),
  }));

  register('workforceFederation', new WorkforceFederation({
    eventBus: get<IEventBus>('eventBus'),
    agentService: get<AgentService>('agentService'),
  }));

  register('agentMarketplace', new AgentMarketplace({
    eventBus: get<IEventBus>('eventBus'),
  }));

  register('eloService', eloRatingService);

  register('chatSummarizerService', chatSummarizerService);

  register('personaService', personaService);
}
