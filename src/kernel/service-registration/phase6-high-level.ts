/**
 * Phase 6 — High-level Services.
 *
 * Chat, workspace, probe, auto-debate, event-sourcing, webhooks,
 * consistency, topology, federation, marketplace, ELO, and the
 * post-bootstrap helper services.
 */
import type { Phase } from './helpers';
import type { IEventBus, IDatabaseService } from '../types/interfaces';
import type { IContainer } from '../container';
import type { IExecutionGovernor } from '../contracts/execution-governor';
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
import type { DebateService } from '../services/debate-runtime/debate-service';
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
import { eloRatingService } from '../services/elo/elo-service';
import { ChatSummarizerService } from '../services/chat-summarizer-service';
import { AgentWizardService } from '../services/agent-wizard-service';
import { RoleTestingSandboxService } from '../services/role-testing-sandbox';
import { personaService } from '../services/persona-service';

export const registerPhase6: Phase = (helpers, ctx) => {
    const { register, get, asDeps } = helpers;
    const _container: IContainer = ctx.container;

    register(
        'chatService',
        new ChatService(
            asDeps<ConstructorParameters<typeof ChatService>[0]>({
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
                llmClient: get<LLMClientService>('llmClientService'),
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

    const workspaceRepo = get<DataAccessLayer>('dal')
        .workspace as import('../dal/workspace-repository').WorkspaceRepository;
    register(
        'workspaceService',
        new WorkspaceService({
            eventBus: get<IEventBus>('eventBus'),
            repo: workspaceRepo,
        }),
    );

    register(
        'probeService',
        new ProbeService(
            asDeps<ConstructorParameters<typeof ProbeService>[0]>({
                keyService: get<KeyService>('keyService'),
                adapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
                keyStateStore: get<KeyStateStore>('keyStateStore'),
                eventBus: get<IEventBus>('eventBus'),
            }),
        ),
    );

    register(
        'autoDebateService',
        new AutoDebateService({
            keyService: get<KeyService>('keyService'),
            getKeyStateStore: () => get<KeyStateStore>('keyStateStore'),
            getAdapterRegistry: () => get<ProviderAdapterRegistry>('providerAdapterRegistry'),
            debateService: {
                startDebate: (topic, participants, strategy, maxRounds, config) =>
                    _container
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
        new EventRecorder(
            undefined,
            get<DataAccessLayer>('dal').eventLog,
            undefined,
            undefined,
            get<DataAccessLayer>('dal').kv,
        ),
    );

    register(
        'notificationWebhookService',
        new NotificationWebhookService({
            eventBus: get<IEventBus>('eventBus'),
            database: get<IDatabaseService>('database'),
        }),
    );

    register(
        'compromiseWebhookService',
        new CompromiseWebhookService({
            eventBus: get<IEventBus>('eventBus'),
            keyService: get<KeyService>('keyService'),
        }),
    );

    register('consistencyChecker', new ConsistencyChecker());
    // SR-3: Alias without lifecycle registration — prevents double dispose()
    if (!ctx.container.has('consistencyHealingPipeline')) {
        ctx.container.register(
            'consistencyHealingPipeline',
            get<ConsistencyChecker>('consistencyChecker'),
        );
    }

    register(
        'topologyManager',
        new TopologyManager({
            eventBus: get<IEventBus>('eventBus'),
            orchestrator: get<OrchestrationService>('orchestrator'),
            agentHealthMonitor: get<AgentHealthMonitor>('agentHealthMonitor'),
            agentService: get<AgentService>('agentService'),
            metricsService: get<MetricsService>('metricsService'),
        }),
    );

    register(
        'workforceFederation',
        new WorkforceFederation({
            eventBus: get<IEventBus>('eventBus'),
            agentService: get<AgentService>('agentService'),
        }),
    );

    register(
        'agentMarketplace',
        new AgentMarketplace({
            eventBus: get<IEventBus>('eventBus'),
        }),
    );

    register('eloService', eloRatingService);

    register(
        'chatSummarizerService',
        new ChatSummarizerService(get<LLMClientService>('llmClientService')),
    );
    register(
        'agentWizardService',
        new AgentWizardService(get<LLMClientService>('llmClientService')),
    );
    register(
        'roleTestingSandboxService',
        new RoleTestingSandboxService(get<LLMClientService>('llmClientService')),
    );
    register('personaService', personaService);
};
