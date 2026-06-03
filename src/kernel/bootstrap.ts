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
import { KeyStateStore } from './services/key-state-store';
import type { ToolService } from './services/tool-executor';
import type { CognitiveService } from './services/cognitive-service';
import type { PolicyService } from './services/policy-service';
import { ProviderRuntimeService } from './services/provider-runtime/provider-service';
import { RotationService } from './services/rotation-service';
import { EventSourcingService } from './services/event-sourcing/event-sourcing-service';
import { OrchestrationService as Orchestrator } from './services/orchestration-service';
import { registerServices } from './service-registration';
import { BOOTSTRAP_SERVICES } from './services/service-list';
import { RingEventLog } from './services/event-bridge/ring-event-log';
import { ProjectionRegistry } from './services/event-bridge/projection-registry';
import { EventBridge } from './services/event-bridge/event-bridge';
import { KeyStateProjection } from './services/projections/key-state-projection';
import { RouterProjection } from './services/projections/router-projection';
import { CausalScopeManager } from './services/causal-scope-manager';
import { CausalTimelineService } from './services/causal-timeline-service';
import { CounterfactualEngine } from './services/counterfactual-engine';
import { CounterfactualExplanationService } from './services/counterfactual-explanation-service';
import { CounterfactualNarrativeService } from './services/counterfactual-narrative-service';
import { TemporalReplayService } from './services/temporal-replay-service';
import { TruthConsistencyMonitor } from './services/truth-consistency-monitor';
import { GroupManagerService } from './services/group-manager';
import type { RouterService } from './services/provider-router';
import type { KernelEventLog } from './contracts/event-log';
import type { ICausalScopeManager } from './contracts/causal-debugger';
import type { ApiKey } from './types/metrics-types';

// Services whose failure should abort bootstrap entirely
const CRITICAL_SERVICES = new Set([
  'configService',
  'keyService',
  'pricingService',
]);
const BOOTSTRAP_SERVICE_NAMES = new Set<string>(BOOTSTRAP_SERVICES);

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
  private eventBridge: EventBridge | null = null;
  private causalTimeline: CausalTimelineService | null = null;

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

    if (this.causalTimeline) {
      try { this.causalTimeline.destroy(); } catch { /* ignore */ }
      this.causalTimeline = null;
    }
    if (this.eventBridge) {
      try { this.eventBridge.stop(); } catch { /* ignore */ }
      this.eventBridge = null;
    }

    await this.lifecycle.shutdown();

    this.lifecycle.clearStatuses();
    this.error = null;
    this.isStarted = false;
    this.phase = 'pending';
    this.logger.info('Bootstrap', 'Shutdown complete.');
  }

  private async initServices(): Promise<boolean> {
    this.phase = 'services';

    const PHASES: string[][] = [
      ['configService', 'settingsService', 'keyService', 'cacheService', 'pricingService'],
      ['keyStateStore', 'routerService', 'sessionAffinityStore', 'llmClientService', 'providerRuntimeService', 'virtualKeyService', 'raceExecutor', 'groupManagerService'],
      ['toolService', 'sandboxService', 'memoryService', 'featureFlagService', 'cognitiveService', 'policyService', 'roleService', 'snapshotService', 'agentService', 'agentHealthMonitor'],
      ['chatService', 'debateService', 'debateApiService', 'debateKnowledgeSync', 'hypothesisService', 'metricsService', 'advisorService', 'budgetService', 'usageTracker', 'timelineService', 'adminService'],
      ['healthCheckService', 'monitoringService', 'traceService', 'diagnosticService', 'whatIfService', 'pressureMapService', 'cognitiveIntelligenceService', 'blackboardService', 'topologyManager', 'workforceFederation', 'routingPolicyService', 'notificationWebhookService', 'compromiseWebhookService', 'externalSecretsService', 'workspaceService', 'probeService', 'consistencyChecker', 'consistencyHealingPipeline', 'systemStatusService'],
    ];

    let criticalFailed = false;
    for (const phaseServices of PHASES) {
      const results = await this.lifecycle.initAllParallel(phaseServices);
      const entryNames = this.lifecycle.getEntries()
        .filter(e => phaseServices.includes(e.name))
        .map(e => e.name);

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
      if (criticalFailed) break;
    }

    if (criticalFailed) {
      this.phase = 'failed';
      this.error = 'One or more critical services failed to initialize';
      return false;
    }

    this.phase = 'topology';

    await this.lifecycle.tryInit('eventSourcing', () => {
      return this.container.get<EventSourcingService>('eventSourcingService').init();
    });

    await this.lifecycle.tryInit('providerRuntime', () => {
      const prs = this.container.get<ProviderRuntimeService>('providerRuntimeService');
      const ks = this.container.get<KeyService>('keyService');
      const keys: ApiKey[] = ks.getKeys?.() ?? [];
      for (const key of keys) {
        prs.createInstance(key);
      }
    });

    await this.lifecycle.tryInit('rotation', async () => {
      const svc = this.container.get<RotationService>('rotationService');
      return svc.init();
    });

    try {
      const toolService = this.container.get<ToolService>('toolService');
      const cognitiveService = this.container.get<CognitiveService>('cognitiveService');
      const policyService = this.container.get<PolicyService>('policyService');
      
      const orch = new Orchestrator({
        eventBus: this.eventBus,
        toolService,
        cognitiveService,
        policyService,
      });
      this.container.register('orchestrator', orch);
      orch.mount(AuditorTopology);
    } catch (e) {
      this.logger.error('Bootstrap', 'Failed to mount topology', { error: e });
    }

    // Start EventBridge in shadow mode: captures all events into append-only log + projections
    this.logger.info('Bootstrap', 'Starting EventBridge (shadow mode)');
    try {
      const eventLog = new RingEventLog(10_000);
      const registry = new ProjectionRegistry();
      const keyStateProjection = new KeyStateProjection();
      const routerProjection = new RouterProjection();
      registry.register(keyStateProjection);
      registry.register(routerProjection);
      const bridge = new EventBridge(this.eventBus, eventLog, registry);
      bridge.start();
      this.eventBridge = bridge;
      this.container.register('eventLog', eventLog);
      this.container.register('projectionRegistry', registry);
      this.container.register('keyStateProjection', keyStateProjection);
      this.container.register('routerProjection', routerProjection);
      this.logger.info('Bootstrap', `EventBridge started — ${registry.size()} projection(s) registered`);

      // Start Causal Debugger Layer
      try {
        const causalScopeManager = new CausalScopeManager();
        const causalTimelineService = new CausalTimelineService(
          causalScopeManager,
          keyStateProjection,
          routerProjection,
          this.eventBus,
          this.logger,
        );
        causalTimelineService.start();
        this.causalTimeline = causalTimelineService;
        this.container.register('causalScopeManager', causalScopeManager);
        this.container.register('causalTimelineService', causalTimelineService);
        this.logger.info('Bootstrap', 'Causal Debugger Layer started');
      } catch (e) {
        this.logger.warn('Bootstrap', 'Causal Debugger Layer failed to start (non-critical)', { error: e });
      }

      // Start Counterfactual Engine
      try {
        const routerService = this.container.get<RouterService>('routerService');
        const counterfactualEngine = new CounterfactualEngine(routerService);
        this.container.register('counterfactualEngine', counterfactualEngine);
        this.logger.info('Bootstrap', 'Counterfactual Engine started');
      } catch (e) {
        this.logger.warn('Bootstrap', 'Counterfactual Engine failed to start (non-critical)', { error: e });
      }

      try {
        const explanationService = new CounterfactualExplanationService();
        this.container.register('counterfactualExplanationService', explanationService);
        this.logger.info('Bootstrap', 'Counterfactual Explanation Service started');
      } catch (e) {
        this.logger.warn('Bootstrap', 'Counterfactual Explanation Service failed to start (non-critical)', { error: e });
      }

      try {
        const narrativeService = new CounterfactualNarrativeService();
        this.container.register('counterfactualNarrativeService', narrativeService);
        this.logger.info('Bootstrap', 'Counterfactual Narrative Service started');
      } catch (e) {
        this.logger.warn('Bootstrap', 'Counterfactual Narrative Service failed to start (non-critical)', { error: e });
      }

      try {
        const routerService = this.container.get<RouterService>('routerService');
        const eventLog = this.container.get<KernelEventLog>('eventLog');
        const scopeManager = this.container.get<ICausalScopeManager>('causalScopeManager');
        const temporalReplayService = new TemporalReplayService(eventLog, routerService, scopeManager);
        this.container.register('temporalReplayService', temporalReplayService);
        this.logger.info('Bootstrap', 'Temporal Replay Service started');
      } catch (e) {
        this.logger.warn('Bootstrap', 'Temporal Replay Service failed to start (non-critical)', { error: e });
      }

      try {
        const monitor = new TruthConsistencyMonitor();
        this.container.register('truthConsistencyMonitor', monitor);
        this.logger.info('Bootstrap', 'Truth Consistency Monitor started');
      } catch (e) {
        this.logger.warn('Bootstrap', 'Truth Consistency Monitor failed to start (non-critical)', { error: e });
      }
    } catch (e) {
      this.logger.warn('Bootstrap', 'EventBridge failed to start (non-critical)', { error: e });
    }

    // Group Manager — wraps all key lifecycle (depends on keyService being ready)
    try {
      const gm = this.container.get<GroupManagerService>('groupManagerService');
      await gm.syncExistingKeys();
      this.container.get<KeyService>('keyService').attachGroupManager(gm);
      this.logger.info('Bootstrap', 'Group Manager synced existing keys');
    } catch (e) {
      this.logger.warn('Bootstrap', 'GroupManager syncExistingKeys failed (non-critical)', { error: e });
    }

    // Seed KeyStateStore with existing keys so projection is populated before first probe
    try {
      const ks = this.container.get<KeyService>('keyService');
      const kss = this.container.get<KeyStateStore>('keyStateStore');
      const existingKeys: ApiKey[] = ks.getKeys?.() ?? [];
      if (kss && existingKeys.length > 0) {
        kss.seedFromKeys(existingKeys);
        this.logger.info('Bootstrap', `KeyStateStore seeded with ${existingKeys.length} key(s)`);
      }
    } catch (e) {
      this.logger.warn('Bootstrap', 'KeyStateStore seed failed (non-critical)', { error: e });
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
