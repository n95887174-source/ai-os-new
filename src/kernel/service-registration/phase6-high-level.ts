/**
 * Phase 6 — High-level Services.
 *
 * Chat, workspace, probe, auto-debate, event-sourcing, webhooks,
 * consistency, topology, federation, marketplace, ELO, and the
 * post-bootstrap helper services.
 *
 * A-04: All services now use registerFactory (lazy instantiation).
 * Imperative setup calls (setDatabase, setEngine) moved inside factories.
 */
import type { Phase } from './helpers';
import type { IEventBus, IDatabaseService, IProviderTracker } from '../types/interfaces';
import type { ICostCalculator } from '../contracts/pricing';
import type { IExecutionGovernor } from '../contracts/execution-governor';
import type { IMemoryEngine } from '../contracts/memory';
import type { IResearchEngine } from '../contracts/research-engine';
import type { LoggerService } from '../services/logger-service';
import type { DataAccessLayer } from '../dal';
import type { KeyService } from '../services/key-management/key-service';
import type { ProviderAdapterRegistry } from '../services/provider-adapter-registry';
import type { KeyStateStore } from '../services/key-state-store';
import type { SettingsService } from '../services/settings-service';
import type { CacheService } from '../services/cache-service';
import type { PolicyService } from '../services/policy-service';
import type { RaceExecutor } from '../services/race-executor';
import type { RouterService } from '../services/provider-router';
import type { RoutingPolicyService } from '../services/routing-policy/routing-policy-service';
import type { VirtualKeyService } from '../services/virtual-key-service';
import type { ProviderRuntimeService } from '../services/provider-runtime/provider-service';
import type { LLMClientService } from '../services/llm-client-service';
import type { SystemKernel } from '../kernel';
import type { DebateSyncManager } from '../services/debate-runtime/debate-sync-manager';
type DebateService = DebateSyncManager;
import type { OrchestrationService } from '../services/orchestration-service';
import type { AgentService } from '../services/agent-service';
import type { MetricsService } from '../services/metrics-service';
import type { AgentHealthMonitor } from '../services/agent-health-monitor';
import { ChatService } from '../services/chat-service';
import { WorkspaceService } from '../services/workspace-service';
import { ProbeService } from '../services/probe-service';
import { AutoDebateService } from '../services/debate-runtime/auto-debate/auto-debate-service';
import { EventRecorder } from '../services/event-sourcing/event-recorder';
import { NotificationWebhookService } from '../services/notification-webhook-service';
import { CompromiseWebhookService } from '../services/compromise-webhook-service';
import { ConsistencyChecker } from '../services/consistency-checker';
import { TopologyManager } from '../services/topology-manager';
import { WorkforceFederation } from '../services/workforce-federation';
import { AgentMarketplace } from '../services/agent-marketplace';
import { EloRatingService } from '../services/elo/elo-service';
import { ChatSummarizerService } from '../services/chat-summarizer-service';
import { AgentWizardService } from '../services/agent-wizard-service';
import { RoleTestingSandboxService } from '../services/role-testing-sandbox';
import { PersonaService } from '../services/persona-service';
import { BridgeKeeperService } from '../services/guardian-registry';
import { ReconnectionService } from '../services/reconnection-service';
import { AudienceService } from '../services/audience-service';
import { TutorialService } from '../services/tutorial-service';
import { TeamCollaborationService } from '../services/team-collaboration-service';
import { FineTuningService } from '../services/fine-tuning-service';
import { DistillationService } from '../services/model-distillation-service';
import { DeployService } from '../services/deploy-service';
import { BudgetAlertService } from '../services/budget-alert-service';
import { TopologyTemplateService } from '../services/topology-template-service';
import { KeyUsageAnalyticsService } from '../services/key-usage-analytics-service';
import { ProviderTracker } from '../services/provider-tracker';
import { PromptVersionService } from '../services/prompt-version-service';
import { ProviderMigrationService } from '../services/provider-migration-service';
import { HealthSlaService } from '../services/health-sla-service';
import { ResearchReportService } from '../services/research-report-service';
import { VoiceInputService } from '../services/voice-input-service';
import { AgentProtocolService } from '../services/agent-protocol-service';
import { FederatedMemoryService } from '../services/federated-memory-service';
import { PluginSdkService } from '../services/plugin-sdk-service';
import { PersonaMarketplaceService } from '../services/persona-marketplace-service';
import { TemplateSharingService } from '../services/template-sharing-service';
import { MemoryTransferService } from '../services/memory-transfer-service';
import { AquariumTradingService } from '../services/aquarium-trading-service';
import { TimeMachineService } from '../services/time-machine-service';
import { ContributionService } from '../services/contribution-service';
import { MetaLearningService } from '../services/meta-learning-service';
import { QuantumInspirationService } from '../services/quantum-inspiration-service';
import { SmartRoutingService } from '../services/smart-routing-service';
import {
    NvidiaEnterpriseService,
    type NvidiaEnterpriseDeps,
} from '../services/nvidia-enterprise-service';
import { GeminiCacheService } from '../services/gemini-cache-service';
import { ProviderAchievementService } from '../services/provider-achievement-service';
import { PromptSecurityService } from '../services/prompt-security-service';
import { GoogleGenAIService } from '../services/google-genai-service';
import { GeminiLiveService } from '../services/gemini-live-service';
import { WorkflowService } from '../services/workflow-service';
import { SourceAdapterRegistry } from '../services/research-adapters/source-adapter-registry';
import { PromptLibraryService } from '../services/prompt-library-service';
import { BatchProcessorService } from '../services/batch-processor-service';
import { AgentAvatarService } from '../services/agent-avatar-service';

export const registerPhase6: Phase = (helpers, ctx) => {
    const { register, asDeps } = helpers;

    register(
        'chatService',
        (c) =>
            new ChatService(
                asDeps<ConstructorParameters<typeof ChatService>[0]>({
                    eventBus: c.get<IEventBus>('eventBus'),
                    keyService: c.get<KeyService>('keyService'),
                    virtualKeyService: c.get<VirtualKeyService>('virtualKeyService'),
                    settingsService: c.get<SettingsService>('settingsService'),
                    routerService: c.get<RouterService>('routerService'),
                    raceExecutor: c.get<RaceExecutor>('raceExecutor'),
                    cacheService: c.get<CacheService>('cacheService'),
                    policyService: c.get<PolicyService>('policyService'),
                    freeTierLimits: c.get('freeTierLimits'),
                    providerRuntime: c.get<ProviderRuntimeService>('providerRuntimeService'),
                    routingPolicyService: c.get<RoutingPolicyService>('routingPolicyService'),
                    getProviderState: (provider: string) => {
                        const state = c.get<SystemKernel>('kernel').getState();
                        return state.providers[provider] ?? state.providers[provider.toLowerCase()];
                    },
                    logger: c.get<LoggerService>('logger'),
                    llmClient: c.get<LLMClientService>('llmClientService'),
                    executionGovernor: (() => {
                        try {
                            return ctx.container.get<IExecutionGovernor>('executionGovernor');
                        } catch {
                            return undefined;
                        }
                    })(),
                }),
            ),
    );

    // A-04: workspaceRepo extracted inside factory (lazy)
    register('workspaceService', (c) => {
        const workspaceRepo = c.get<DataAccessLayer>('dal')
            .workspace as import('../dal/workspace-repository').WorkspaceRepository;
        return new WorkspaceService({
            eventBus: c.get<IEventBus>('eventBus'),
            repo: workspaceRepo,
        });
    });

    register(
        'probeService',
        (c) =>
            new ProbeService(
                asDeps<ConstructorParameters<typeof ProbeService>[0]>({
                    keyService: c.get<KeyService>('keyService'),
                    adapterRegistry: c.get<ProviderAdapterRegistry>('providerAdapterRegistry'),
                    keyStateStore: c.get<KeyStateStore>('keyStateStore'),
                    eventBus: c.get<IEventBus>('eventBus'),
                }),
            ),
    );

    register(
        'autoDebateService',
        (c) =>
            new AutoDebateService({
                keyService: c.get<KeyService>('keyService'),
                getKeyStateStore: () => c.get<KeyStateStore>('keyStateStore'),
                getAdapterRegistry: () => c.get<ProviderAdapterRegistry>('providerAdapterRegistry'),
                debateService: {
                    startDebate: (topic, participants, strategy, maxRounds, config) =>
                        c
                            .get<DebateService>('debateService')
                            .startDebate(
                                topic,
                                participants,
                                strategy as Parameters<DebateService['startDebate']>[2],
                                maxRounds,
                                config as Parameters<DebateService['startDebate']>[4],
                            ),
                },
            }),
    );

    register(
        'eventSourcingService',
        (c) =>
            new EventRecorder(
                undefined,
                c.get<DataAccessLayer>('dal').eventLog,
                undefined,
                c.get<DataAccessLayer>('dal').kv,
            ),
    );

    register(
        'notificationWebhookService',
        (c) =>
            new NotificationWebhookService({
                eventBus: c.get<IEventBus>('eventBus'),
                database: c.get<IDatabaseService>('database'),
            }),
    );

    register(
        'compromiseWebhookService',
        (c) =>
            new CompromiseWebhookService({
                eventBus: c.get<IEventBus>('eventBus'),
                keyService: c.get<KeyService>('keyService'),
            }),
    );

    register('consistencyChecker', (_c) => new ConsistencyChecker());
    // SR-3: Alias without lifecycle registration — prevents double dispose()
    // A-04: wrap in registerFactory so it's lazy
    if (!ctx.container.has('consistencyHealingPipeline')) {
        ctx.container.registerFactory('consistencyHealingPipeline', (c) =>
            c.get<ConsistencyChecker>('consistencyChecker'),
        );
    }

    register(
        'topologyManager',
        (c) =>
            new TopologyManager({
                eventBus: c.get<IEventBus>('eventBus'),
                orchestrator: c.get<OrchestrationService>('orchestrator'),
                agentHealthMonitor: c.get<AgentHealthMonitor>('agentHealthMonitor'),
                agentService: c.get<AgentService>('agentService'),
                metricsService: c.get<MetricsService>('metricsService'),
            }),
    );

    register(
        'workforceFederation',
        (c) =>
            new WorkforceFederation({
                eventBus: c.get<IEventBus>('eventBus'),
                agentService: c.get<AgentService>('agentService'),
            }),
    );

    register('agentMarketplace', (c) => {
        const svc = new AgentMarketplace({
            eventBus: c.get<IEventBus>('eventBus'),
            database: c.get<IDatabaseService>('database'),
        });
        void svc.init().catch((e) => console.error('[AgentMarketplace] init() failed', e));
        return svc;
    });

    register('eloService', (_c) => new EloRatingService());

    register(
        'chatSummarizerService',
        (c) => new ChatSummarizerService(c.get<LLMClientService>('llmClientService')),
    );
    register(
        'agentWizardService',
        (c) => new AgentWizardService(c.get<LLMClientService>('llmClientService')),
    );
    register(
        'roleTestingSandboxService',
        (c) => new RoleTestingSandboxService(c.get<LLMClientService>('llmClientService')),
    );

    register('personaService', (c) => {
        const svc = new PersonaService();
        svc.setDatabase(c.get<IDatabaseService>('database'));
        void svc.init().catch((e) => console.error('[PersonaService] init() failed', e));
        return svc;
    });

    // ── Bridge-Keeper System ─────────────────────────────────────
    register('bridgeKeeperService', (_c) => new BridgeKeeperService());
    // ── Reconnection Service ─────────────────────────────────────
    register('reconnectionService', (_c) => new ReconnectionService());
    // ── Audience Service ──────────────────────────────────────────
    register('audienceService', (_c) => new AudienceService());
    // ── Tutorial Service ─────────────────────────────────────────
    register('tutorialService', (_c) => new TutorialService());
    // ── Team Collaboration Service ──────────────────────────────
    register('teamCollaborationService', (_c) => new TeamCollaborationService());
    // ── Fine-Tuning Service ───────────────────────────────────
    register('fineTuningService', (_c) => new FineTuningService());
    // ── Distillation Service ─────────────────────────────────
    register('distillationService', (_c) => new DistillationService());
    // ── Deploy to Production Service ─────────────────────────
    register('deployService', (_c) => new DeployService());
    // ── Budget Alert Service ────────────────────────────
    register('budgetAlertService', (c) => {
        const svc = new BudgetAlertService();
        svc.setBudgetService(
            c.get<import('../services/budget-service').BudgetService>('budgetService'),
        );
        return svc;
    });
    // ── Topology Template Service ─────────────────────────
    register('topologyTemplateService', (_c) => new TopologyTemplateService());
    // ── Key Usage Analytics Service ───────────────────────
    register(
        'keyUsageAnalyticsService',
        (c) =>
            new KeyUsageAnalyticsService({
                keyStateStore: c.get<KeyStateStore>('keyStateStore'),
                providerTracker: c.get<ProviderTracker>('providerTracker'),
            }),
    );
    // ── Prompt Version Service ──────────────────────────
    register('promptVersionService', (_c) => new PromptVersionService());
    // ── Provider Migration Service ─────────────────────────
    register(
        'providerMigrationService',
        (c) => new ProviderMigrationService({ keyService: c.get<KeyService>('keyService') }),
    );
    // ── Health SLA Service ──────────────────────────────
    register(
        'healthSlaService',
        (c) => new HealthSlaService({ providerTracker: c.get('providerTracker') }),
    );
    // ── Research Report Service ─────────────────────────
    register(
        'researchReportService',
        (c) => new ResearchReportService(c.get<IResearchEngine>('researchEngine')),
    );
    // ── Voice Input Service ─────────────────────────────
    register('voiceInputService', (_c) => new VoiceInputService());
    // ── Agent Protocol Service ─────────────────────────
    register('agentProtocolService', (_c) => new AgentProtocolService());
    // ── Federated Memory Service ──────────────────────
    register(
        'federatedMemoryService',
        (c) => new FederatedMemoryService({ database: c.get<IDatabaseService>('database') }),
    );
    // ── Plugin SDK Service ────────────────────────────
    register('pluginSdkService', (_c) => new PluginSdkService());
    // ── Persona Marketplace Service ───────────────────
    register('personaMarketplaceService', (_c) => new PersonaMarketplaceService());
    // ── Template Sharing Service ──────────────────────
    register('templateSharingService', (_c) => new TemplateSharingService());
    // ── Memory Transfer Service ───────────────────────
    register(
        'memoryTransferService',
        (c) =>
            new MemoryTransferService({
                memoryService: c.get<IMemoryEngine>('memoryService'),
                database: c.get<IDatabaseService>('database'),
            }),
    );
    // ── Aquarium Trading Service ──────────────────────
    register('aquariumTradingService', (_c) => new AquariumTradingService());
    // ── Time Machine Service ──────────────────────────
    register(
        'timeMachineService',
        (c) =>
            new TimeMachineService({
                eventBus: c.get('eventBus'),
                database: c.get<IDatabaseService>('database'),
                snapshotService: c.get('snapshotService'),
            }),
    );
    // ── Contribution Service ──────────────────────────
    register(
        'contributionService',
        (c) => new ContributionService({ eventBus: c.get<IEventBus>('eventBus') }),
    );
    // ── Prompt Security Service ─────────────────────────
    register('promptSecurityService', (_c) => new PromptSecurityService());
    // ── Google GenAI Service ───────────────────────────
    register('googleGenAIService', (_c) => new GoogleGenAIService());
    // ── Workflow Service ───────────────────────────────
    register('workflowService', (_c) => new WorkflowService());
    // ── Source Adapter Registry ────────────────────────
    register('sourceAdapterRegistry', (_c) => new SourceAdapterRegistry());
    // ── Prompt Library Service ─────────────────────────
    register('promptLibraryService', (_c) => new PromptLibraryService());
    // ── Batch Processor Service ────────────────────────
    register('batchProcessorService', (_c) => new BatchProcessorService());
    // ── Agent Avatar Service ───────────────────────────
    register('agentAvatarService', (_c) => new AgentAvatarService());
    // ── Meta-Learning / Self-Improvement Service ─────
    register('metaLearningService', (_c) => new MetaLearningService());
    // ── Quantum Inspiration Service ─────────────────
    register('quantumInspirationService', (_c) => new QuantumInspirationService());
    // ── Smart Routing Service ─────────────────────
    register(
        'smartRoutingService',
        (c) =>
            new SmartRoutingService({
                providerTracker: c.get('providerTracker'),
                pricingService: c.get('costCalculator'),
            }),
    );
    // ── NVIDIA Enterprise Service ─────────────────
    register('nvidiaEnterpriseService', (c) => {
        const deps: NvidiaEnterpriseDeps = {
            providerTracker: c.get<IProviderTracker>('providerTracker'),
            pricingService: c.get<ICostCalculator>('costCalculator'),
        };
        return new NvidiaEnterpriseService(deps);
    });
    // ── Gemini Cache Service ─────────────────────
    register('geminiCacheService', (_c) => new GeminiCacheService());
    // ── Provider Achievement Service ──────────────
    register(
        'providerAchievementService',
        (c) => new ProviderAchievementService(c.get<IDatabaseService>('database')),
    );
    // ── Gemini Live Service ───────────────────────
    register('geminiLiveService', (_c) => new GeminiLiveService());
};
