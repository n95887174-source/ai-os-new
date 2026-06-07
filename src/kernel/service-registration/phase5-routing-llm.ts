/**
 * Phase 5 — Routing, LLM Client & Storage Plumbing.
 *
 * Race executor, router, LLM client, cache, config, snapshot,
 * advisor, admin, monitoring.  All depend on services registered
 * in earlier phases.
 */
import type { Phase } from './helpers';
import type { IEventBus, IDatabaseService, IRuntimeManager } from '../types/interfaces';
import type { IContainer } from '../container';
import type { DataAccessLayer } from '../dal';
import type { LoggerService } from '../services/logger-service';
import type { KeyService } from '../services/key-management/key-service';
import type { ProviderAdapterRegistry } from '../services/provider-adapter-registry';
import type { KeyStateStore } from '../services/key-state-store';
import type { SessionAffinityStore } from '../services/session-affinity-store';
import type { SettingsService } from '../services/settings-service';
import type { PricingService } from '../services/pricing-service';
import type { PolicyService } from '../services/policy-service';
import type { BudgetService } from '../services/budget-service';
import type { RoutingPolicyService } from '../services/routing-policy/routing-policy-service';
import type { OrchestrationService } from '../services/orchestration-service';
import type { SystemKernel } from '../kernel';
import type { AgentService } from '../services/agent-service';
import type { RoleService } from '../services/role-service';
import type { ToolService } from '../services/tool-executor';
import type { SnapshotService } from '../services/snapshot-service';
import type { TraceService } from '../services/trace-service';
import type { MetricsService } from '../services/metrics-service';
import type { HealthService as HealthCheckService } from '../services/health-service';
import type { RouterService } from '../services/provider-router';
import { RaceExecutor } from '../services/race-executor';
import { RouterService as RouterServiceClass } from '../services/provider-router';
import { UsageTracker } from '../services/usage-tracker';
import { CacheService } from '../services/cache-service';
import { ConfigService } from '../services/config-service';
import { SnapshotService as SnapshotServiceClass } from '../services/snapshot-service';
import { AdvisorService } from '../services/advisor-service';
import { AdminService } from '../services/admin-service';
import { TimelineService } from '../services/timeline-service';
import { MonitoringService } from '../services/monitoring-service';
import { LLMClientService } from '../services/llm-client-service';
import { FREE_TIER_LIMITS } from '../services/key-management/key-service';
import { VirtualKeyService } from '../services/virtual-key-service';
import { ProviderRuntimeService } from '../services/provider-runtime/provider-service';

export const registerPhase5: Phase = (helpers, ctx) => {
  const { register, get, asDeps } = helpers;
  const _container: IContainer = ctx.container;

  register('raceExecutor', new RaceExecutor(get<ProviderAdapterRegistry>('providerAdapterRegistry')));

  register('routerService', new RouterServiceClass(asDeps<ConstructorParameters<typeof RouterServiceClass>[0]>({
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

  register('snapshotService', new SnapshotServiceClass({
    eventBus: get<IEventBus>('eventBus'),
    database: get<IDatabaseService>('database'),
    kernel: get<SystemKernel>('kernel'),
    orchestrator: get<OrchestrationService>('orchestrator'),
  }));

  register('advisorService', new AdvisorService(asDeps<ConstructorParameters<typeof AdvisorService>[0]>({
    eventBus: get<IEventBus>('eventBus'),
    database: get<IDatabaseService>('database'),
    kernel: get<SystemKernel>('kernel'),
    keyService: get<KeyService>('keyService'),
    routerService: get<RouterService>('routerService'),
    adapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
    orchestrator: get<OrchestrationService>('orchestrator'),
    pricingService: get<PricingService>('pricingService'),
    budgetService: get<BudgetService>('budgetService'),
    healthCheckService: get<HealthCheckService>('healthCheckService'),
    metricsService: get<MetricsService>('metricsService'),
  })));

  register('adminService', new AdminService(asDeps<ConstructorParameters<typeof AdminService>[0]>({
    eventBus: get<IEventBus>('eventBus'),
    keyService: get<KeyService>('keyService'),
    kernel: get<SystemKernel>('kernel'),
    orchestrator: get<OrchestrationService>('orchestrator'),
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
      ctx.eventBus.emit('provider-runtime:state', snap);
    },
    onBudgetChange: (snap) => {
      ctx.eventBus.emit('provider-runtime:budget', snap);
    },
  }));
};
