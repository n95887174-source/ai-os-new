import { lazyService } from './service-helper';
import { rootLogger } from './services/logger-service';
export { rootLogger };
import { BucketStorageAdapter } from './storage-adapter-instance';
export { BucketStorageAdapter };
export const storageAdapter = BucketStorageAdapter;
import type { SettingsService } from './services/settings-service';
import type { KeyService } from './services/key-management/key-service';
import type { MemoryService } from './services/memory-engine';
import type { MCPService } from './services/mcp-service';
import { FREE_TIER_LIMITS } from './services/key-management/key-service';
import type { ChatService } from './services/chat-service';
import type { OrchestrationService } from './services/orchestration-service';
import type { CognitiveService } from './services/cognitive-service';
import type { RouterService } from './services/provider-router';
import type { PricingService } from './services/pricing-service';
import type { PolicyService } from './services/policy-service';
import type { AgentService } from './services/agent-service';
import type { ToolService } from './services/tool-executor';
import type { RoleService } from './services/role-service';
import type { AdminService } from './services/admin-service';
import type { MonitoringService } from './services/monitoring-service';
import type { SnapshotService } from './services/snapshot-service';
import type { AdvisorService } from './services/advisor-service';
import type { AutoDebateService } from './services/debate-runtime/auto-debate/auto-debate-service';
import type { DebateService } from './services/debate-runtime/debate-service';
import type { DebateEngine } from './services/debate-runtime/debate-engine';
import type { CognitiveIntelligenceService } from './services/cognitive-intelligence/cognitive-intelligence-service';
import type { PressureMapService } from './services/runtime-intelligence/pressure-map-service';
import type { DiagnosticService } from './services/runtime-intelligence/diagnostic-service';
import type { WhatIfService } from './services/runtime-intelligence/whatif-service';
import type { ConfigService } from './services/config-service';
import type { NotificationWebhookService } from './services/notification-webhook-service';
import type { ExternalSecretsService } from './services/external-secrets-service';
import type { CompromiseWebhookService } from './services/compromise-webhook-service';
import type { SkillService } from './services/skill-service';
import type { WorkspaceService } from './services/workspace-service';
import type { KeyStateStore } from './services/key-state-store';
import type { ProbeService } from './services/probe-service';
import type { SessionAffinityStore } from './services/session-affinity-store';
import type { IAdapterRegistry } from './contracts/provider-adapter';
import type { IExecutionGovernor } from './contracts/execution-governor';

export { FREE_TIER_LIMITS };

export * from './types/service-exports';

export const settingsService = lazyService<SettingsService>('settingsService', {
    getSettings: () => ({
        theme: 'dark',
        language: 'en',
        notifications: true,
        themeConfig: { mode: 'dark', primaryColor: '#3b82f6' },
    }),
    subscribe: () => () => {},
});

export const keyService = lazyService<KeyService>('keyService', {
    getKeys: () => [],
    getAlerts: () => [],
    getPools: () => [],
    getFreeTierLimits: () => ({}),
    getPoolStrategy: () => 'round-robin' as const,
    getPoolKeyDistribution: () => [],
    verifyKey: async () => false,
    detectProvider: () => null,
    getRoutingPolicy: () => ({ globalSLAMode: 'BALANCED' as const, latencyThreshold: 1500 }),
});

export const memoryService = lazyService<MemoryService>('memoryService');
export const mcpService = lazyService<MCPService>('mcpService');
export const routerService = lazyService<RouterService>('routerService');
export const orchestrator = lazyService<OrchestrationService>('orchestrator');
export const agentService = lazyService<AgentService>('agentService');
export const toolService = lazyService<ToolService>('toolService');
export const roleService = lazyService<RoleService>('roleService');
export const policyService = lazyService<PolicyService>('policyService');
export const pricingService = lazyService<PricingService>('pricingService');
export const adminService = lazyService<AdminService>('adminService');
export const snapshotService = lazyService<SnapshotService>('snapshotService');
export const cognitiveService = lazyService<CognitiveService>('cognitiveService');
export const advisorService = lazyService<AdvisorService>('advisorService');
export const pressureMapService = lazyService<PressureMapService>('pressureMapService');
export const debateService = lazyService<DebateService>('debateService');
import type { StrategyRegistry } from './services/debate-runtime/debate-strategy-registry';
export const strategyRegistry = lazyService<StrategyRegistry>('strategyRegistry');
import type { DebateModeManagerPersistent } from './services/debate-runtime/debate-mode-manager';
export const debateModeManager = lazyService<DebateModeManagerPersistent>('debateModeManager');
import type { DebateWorkspace } from './services/debate-runtime/debate-workspace';
export const debateWorkspace = lazyService<DebateWorkspace>('debateWorkspace');
import type { DebatePolicyEngine } from './services/debate-runtime/debate-policy-engine';
export const debatePolicyEngine = lazyService<DebatePolicyEngine>('debatePolicyEngine');
export const debateEngine = lazyService<DebateEngine>('debateEngine');
export const cognitiveIntelligenceService = lazyService<CognitiveIntelligenceService>(
    'cognitiveIntelligenceService',
);
export const diagnosticService = lazyService<DiagnosticService>('diagnosticService');
export const whatIfService = lazyService<WhatIfService>('whatIfService');
export const notificationWebhookService = lazyService<NotificationWebhookService>(
    'notificationWebhookService',
);
export const externalSecretsService = lazyService<ExternalSecretsService>('externalSecretsService');
export const configService = lazyService<ConfigService>('configService');
export const skillService = lazyService<SkillService>('skillService');
export const compromiseWebhookService = lazyService<CompromiseWebhookService>(
    'compromiseWebhookService',
);
export const monitoringService = lazyService<MonitoringService>('monitoringService');
export const chatService = lazyService<ChatService>('chatService');
export const adapterRegistry = lazyService<IAdapterRegistry>('providerAdapterRegistry');
export const autoDebateService = lazyService<AutoDebateService>('autoDebateService');
export const workspaceService = lazyService<WorkspaceService>('workspaceService');
export const keyStateStore = lazyService<KeyStateStore>('keyStateStore');
export const probeService = lazyService<ProbeService>('probeService');
export const sessionAffinityStore = lazyService<SessionAffinityStore>('sessionAffinityStore');
export const executionGovernor = lazyService<IExecutionGovernor>('executionGovernor');
import type { PersonaService as PersonaServiceType } from './services/persona-service';
export const personaService = lazyService<PersonaServiceType>('personaService');
export const roleVersionService =
    lazyService<import('../kernel/services/role-version-service').RoleVersionService>(
        'roleVersionService',
    );

// ── Cache Service (for CachePanel) ─────────────────────────────────────────
import type { CacheService } from './services/cache-service';
export const cacheService = lazyService<CacheService>('cacheService');

// ── Event Bridge (shadow mode projections) ──────────────────────
import type {
    KeyStateProjection,
    ProjectedKeyState,
} from './services/projections/key-state-projection';
export type { ProjectedKeyState };
export const keyStateProjection = lazyService<KeyStateProjection>('keyStateProjection');
import type { RouterProjection, ProjectedDecision } from './services/projections/router-projection';
export type { ProjectedDecision };
export const routerProjection = lazyService<RouterProjection>('routerProjection');

// ── Session Manager ─────────────────────────────────────────────
import type { ISessionManager } from './contracts/session-manager';
export const sessionManager = lazyService<ISessionManager>('sessionManagerService');

// ── Causal Debugger Layer ───────────────────────────────────────
import type { ICausalScopeManager, CausalScope } from './contracts/causal-debugger';
export type { CausalScope };
export const causalScopeManager = lazyService<ICausalScopeManager>('causalScopeManager');
import type { ICausalTraceStore, CausalTraceEntry, CausalTrace } from './contracts/causal-debugger';
export type { CausalTraceEntry, CausalTrace };
export const causalTimelineService = lazyService<ICausalTraceStore>('causalTimelineService');

// ── Counterfactual Engine ────────────────────────────────────────
import type { ICounterfactualEngine } from './contracts/counterfactual';
export const counterfactualEngine = lazyService<ICounterfactualEngine>('counterfactualEngine');

// ── Counterfactual Explanation Service ───────────────────────────
import type { ICounterfactualExplanationService } from './contracts/counterfactual-explanation';
export const counterfactualExplanationService = lazyService<ICounterfactualExplanationService>(
    'counterfactualExplanationService',
);

// ── Counterfactual Narrative Service ────────────────────────────
import type { ICounterfactualNarrativeService } from './contracts/counterfactual-narrative';
export const counterfactualNarrativeService = lazyService<ICounterfactualNarrativeService>(
    'counterfactualNarrativeService',
);

// ── Temporal Replay Service ─────────────────────────────────────
import type { ITemporalReplayService } from './contracts/temporal-replay';
export const temporalReplayService = lazyService<ITemporalReplayService>('temporalReplayService');

// ── Truth Consistency Monitor ──────────────────────────────────
import type { ITruthConsistencyMonitor } from './contracts/truth-consistency';
export const truthConsistencyMonitor =
    lazyService<ITruthConsistencyMonitor>('truthConsistencyMonitor');

// ── Group Manager ──────────────────────────────────────────────
import type { IGroupManager } from './contracts/group-manager';
export const groupManager = lazyService<IGroupManager>('groupManagerService');

// ── System Status Service ──────────────────────────────────────
import type { ISystemStatusService } from './contracts/system-status';
export const systemStatusService = lazyService<ISystemStatusService>('systemStatusService');

// ── System Kernel (for state access) ───────────────────────────
import type { SystemState } from './types/metrics-types';
import type { HealthEvent, ProviderTracker } from './services/provider-tracker';
import type { ProviderRanking } from './types/interfaces';
export const kernel = lazyService<{
    getStateSnapshot(): SystemState;
    getState(): SystemState;
    getHealthEvents(provider?: string, limit?: number): HealthEvent[];
    getProviderRankings(catalogProviders?: string[]): ProviderRanking[];
    getCollaborativeSuggestions(
        installedProviders?: string[],
    ): Array<{ provider: string; reason: string; matchScore: number }>;
}>('kernel');
export const providerTracker = lazyService<ProviderTracker>('providerTracker');

import type { IArchitectureReviewService } from './contracts/architecture-review';
export const architectureReviewService = lazyService<IArchitectureReviewService>(
    'architectureReviewService',
);

import type { IPromptAuditService } from './contracts/prompt-audit';
export const promptAuditService = lazyService<IPromptAuditService>('promptAuditService');

import type { IRoutingExperimentsService } from './contracts/routing-experiments';
export const routingExperimentsService = lazyService<IRoutingExperimentsService>(
    'routingExperimentsService',
);

import type { IGovStressTestService } from './contracts/gov-stress-test';
export const govStressTestService = lazyService<IGovStressTestService>('govStressTestService');

import type { IObsGapsService } from './contracts/obs-gaps';
export const obsGapsService = lazyService<IObsGapsService>('obsGapsService');

// ── Consistency Checker ─────────────────────────────────────────
import type {
    IConsistencyChecker,
    ConsistencyReport,
    ConsistencyCheckItem,
    CodeManifest,
} from './contracts/consistency-checker';
export type { ConsistencyReport, ConsistencyCheckItem, CodeManifest };
export const consistencyChecker = lazyService<IConsistencyChecker>('consistencyChecker');

// ── Consistency Healing Pipeline ────────────────────────────────
import type {
    IConsistencyHealingPipeline,
    HealingPlan,
    HealingTask,
    HealingFixSuggestion,
} from './contracts/consistency-healing';
export type { HealingPlan, HealingTask, HealingFixSuggestion };
export const consistencyHealingPipeline = lazyService<IConsistencyHealingPipeline>(
    'consistencyHealingPipeline',
);

// ── Rotation Service (for RotationsPanel) ──────────────────────
import type { IRotationService } from './contracts/key-rotation';
export const rotationService = lazyService<IRotationService>('rotationService');

// ── Budget Service (for BudgetPanel) ───────────────────────────
import type { IBudgetService } from './contracts/budget';
export const budgetService = lazyService<IBudgetService>('budgetService');

// ── Task Handoff Service ─────────────────────────────────────────
import type { TaskHandoffService } from './services/task-handoff';
export const taskHandoffService = lazyService<TaskHandoffService>('taskHandoffService');

// ── Template Service ─────────────────────────────────────────────
import type { TemplateService } from './services/template-service';
export const templateService = lazyService<TemplateService>('templateService');

// ── Agent Version Service ────────────────────────────────────────
import type { AgentVersionService } from './services/agent-version-service';
export const agentVersionService = lazyService<AgentVersionService>('agentVersionService');

// ── Metrics Service ──────────────────────────────────────────────
import type { MetricsService } from './services/metrics-service';
export const metricsService = lazyService<MetricsService>('metricsService');

import type { WorkforceFederation } from './services/workforce-federation';
export const workforceFederation = lazyService<WorkforceFederation>('workforceFederation');

import type { AgentMarketplace } from './services/agent-marketplace';
export const agentMarketplace = lazyService<AgentMarketplace>('agentMarketplace');

import type { TopologyManager } from './services/topology-manager';
export const topologyManager = lazyService<TopologyManager>('topologyManager');

import type { CollaborativeService } from './services/collaborative-service';
export const collaborativeService = lazyService<CollaborativeService>('collaborativeService');

import type { DebateApiService } from './services/debate-runtime/debate-api';
export const debateApiService = lazyService<DebateApiService>('debateApiService');

import type { DebateKnowledgeSyncService } from './services/debate-runtime/debate-knowledge-sync';
export const debateKnowledgeSync = lazyService<DebateKnowledgeSyncService>('debateKnowledgeSync');

import type { IHypothesisService } from './contracts/hypothesis';
export const hypothesisService = lazyService<IHypothesisService>('hypothesisService');
export { ResearchRunService, type ResearchRun } from './services/research-run-service';
import type { ResearchRunService as ResearchRunServiceType } from './services/research-run-service';
export const researchRunService = lazyService<ResearchRunServiceType>('researchRunService');

export { DEBATE_TEMPLATES, getDebateTemplate } from './services/debate-runtime/debate-templates';
export type { DebateTemplate } from './services/debate-runtime/debate-templates';

// ── ELO Rating Service ──────────────────────────────────────────
import type { EloRatingService, AgentElo } from './services/elo/elo-service';
export type { AgentElo };
export const eloService = lazyService<EloRatingService>('eloService');

// ── Chat Summarizer Service ─────────────────────────────────────
import type { ChatSummarizerService as ChatSummarizerServiceType } from './services/chat-summarizer-service';
export const chatSummarizerService =
    lazyService<ChatSummarizerServiceType>('chatSummarizerService');
