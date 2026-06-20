/**
 * Phase 4 — Agents, Roles & Orchestration.
 *
 * Agent lifecycle, role/skills services, orchestrator, and the
 * services that depend on them (budget, sandbox, MCP, governance,
 * health checks, traces).
 */
import type { Phase } from './helpers';
import type { IEventBus, IDatabaseService } from '../types/interfaces'
import type { IContainer } from '../container';
import type { IStorageAdapter } from '../contracts/storage-adapter';
import type { StorageLayer, RolesStore, SkillsStore } from '../contracts/storage/storage-layer';
import type { KeyService } from '../services/key-management/key-service';
import type { ProviderAdapterRegistry } from '../services/provider-adapter-registry';
import type { KeyStateStore } from '../services/key-state-store';
import type { PricingService } from '../services/pricing-service';
import type { ToolService } from '../services/tool-executor';
import type { PolicyService } from '../services/policy-service';
import type { CognitiveService } from '../services/cognitive-service';
import type { OrchestrationService } from '../services/orchestration-service';
import { AgentService } from '../services/agent-service';
import { TemplateService } from '../services/template-service';
import { AgentVersionService } from '../services/agent-version-service';
import { RoleVersionService } from '../services/role-version-service';
import { AgentHealthMonitor } from '../services/agent-health-monitor';
import { TaskHandoffService } from '../services/task-handoff';
import { TraceService } from '../services/trace-service';
import { HealthService as HealthCheckService } from '../services/health-service';
import { OrchestrationService as OrchestratorClass } from '../services/orchestration-service';
import { RoleService } from '../services/role-service';
import { SkillService } from '../services/skill-service';
import { SandboxService } from '../services/sandbox-service';
import { MCPService } from '../services/mcp-service';
import { BudgetService } from '../services/budget-service';
import { RoutingPolicyService } from '../services/routing-policy/routing-policy-service';
import { GovStressTestService } from '../services/gov-stress-test-service';
import { ObsGapsService } from '../services/obs-gaps-service';

const EMPTY_ROLES_STORE: RolesStore = {
  loadAll: async () => [],
  saveAll: async () => { /* no-op */ },
  toArray: async () => [],
  bulkAdd: async () => { /* no-op */ },
  bulkPut: async () => { /* no-op */ },
  count: async () => 0,
  clear: async () => { /* no-op */ },
  exportAll: async () => '[]',
  importAll: async () => { /* no-op */ },
};

const EMPTY_SKILLS_STORE: SkillsStore = {
  loadAll: async () => [],
  saveAll: async () => { /* no-op */ },
  toArray: async () => [],
  bulkAdd: async () => { /* no-op */ },
  bulkPut: async () => { /* no-op */ },
  count: async () => 0,
  clear: async () => { /* no-op */ },
  exportAll: async () => '[]',
  importAll: async () => { /* no-op */ },
};

export const registerPhase4: Phase = (helpers, ctx) => {
  const { register, get, asDeps } = helpers;
  const _container: IContainer = ctx.container;
  const storageLayer = get<StorageLayer>('storageLayer');
  const configStore = storageLayer?.config;

  register('agentService', new AgentService({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    pricingService: get<PricingService>('pricingService'),
    get orchestrator() { return _container.get<OrchestrationService>('orchestrator'); },
  }));

  const templateService = new TemplateService({ database: get<IDatabaseService>('database') });
  register('templateService', templateService);
  void templateService.init();

  const avs = new AgentVersionService({ database: get<IDatabaseService>('database'), eventBus: get<IEventBus>('eventBus') });
  register('agentVersionService', avs);
  avs.start();

  const roleVersionService = new RoleVersionService(get<IStorageAdapter>('storageAdapter'));
  register('roleVersionService', roleVersionService);
  roleVersionService.init();

  const agentHealthMonitor = new AgentHealthMonitor({
    eventBus: get<IEventBus>('eventBus'),
  });
  register('agentHealthMonitor', agentHealthMonitor);
  ctx.registerWithLifecycle('agentHealthMonitor', agentHealthMonitor);

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

  // Orchestrator is registered late (after orchestrator-dependent
  // services) but kept here so the `!has` guard prevents a duplicate
  // registration if bootstrap already created one.
  if (!_container.has('orchestrator')) {
    _container.register('orchestrator', new OrchestratorClass({
      eventBus: get<IEventBus>('eventBus'),
      toolService: get<ToolService>('toolService'),
      cognitiveService: get<CognitiveService>('cognitiveService'),
      policyService: get<PolicyService>('policyService'),
    }));
    ctx.registerWithLifecycle('orchestrator', _container.get<OrchestrationService>('orchestrator'));
  }

  register('roleService', new RoleService({
    rolesStore: storageLayer?.roles ?? EMPTY_ROLES_STORE,
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
    orchestrator: get<OrchestrationService>('orchestrator'),
  }));

  register('govStressTestService', new GovStressTestService({
    getPolicies: () => _container.get<PolicyService>('policyService').getPolicies().map(p => ({
      type: String(p.type),
      value: typeof p.value === 'number' ? p.value : Number(p.value),
      enabled: true,
    })),
    getViolations: (onlyActive, limit) =>
      _container.get<PolicyService>('policyService').getViolations(onlyActive, limit),
    getRoleCount: () => _container.get<RoleService>('roleService').getAllRoles().length,
  }));

  register('obsGapsService', new ObsGapsService());

  register('skillService', new SkillService({
    skillsStore: storageLayer?.skills ?? EMPTY_SKILLS_STORE,
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
    settingsService: get<import('../services/settings-service').SettingsService>('settingsService'),
    pricingService: get<PricingService>('pricingService'),
  }));
};
