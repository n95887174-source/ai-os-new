import type { DebatePhase } from './contracts/debate-types';

export type InitPhase = 'pending' | 'kernel' | 'services' | 'topology' | 'ready' | 'failed';

export interface BootstrapReport {
    phase: InitPhase;
    started: number;
    completed: number;
    duration: number;
    error: string | null;
    services: { name: string; status: 'ok' | 'error' | 'skipped'; error?: string }[];
}

export const CRITICAL_SERVICES = new Set(['configService', 'keyService', 'pricingService']);

export const SERVICE_PHASES: string[][] = [
    ['configService', 'settingsService', 'keyService', 'cacheService', 'pricingService'],
    [
        'keyStateStore',
        'routerService',
        'sessionAffinityStore',
        'llmClientService',
        'providerRuntimeService',
        'virtualKeyService',
        'raceExecutor',
        'groupManagerService',
    ],
    [
        'toolService',
        'sandboxService',
        'memoryService',
        'cognitiveService',
        'policyService',
        'roleService',
        'snapshotService',
        'agentService',
        'agentHealthMonitor',
    ],
    [
        'chatService',
        'debateService',
        'debateApiService',
        'debateKnowledgeSync',
        'debateEngine',
        'debateModeManager',
        'debateWorkspace',
        'hypothesisService',
        'metricsService',
        'advisorService',
        'budgetService',
        'usageTracker',
        'timelineService',
        'adminService',
    ],
    [
        'monitoringService',
        'traceService',
        'diagnosticService',
        'whatIfService',
        'pressureMapService',
        'cognitiveIntelligenceService',
        'blackboardService',
        'topologyManager',
        'workforceFederation',
        'routingPolicyService',
        'notificationWebhookService',
        'compromiseWebhookService',
        'externalSecretsService',
        'workspaceService',
        'skillService',
        'mcpService',
        'agentMarketplace',
        'probeService',
        'consistencyChecker',
        'systemStatusService',
    ],
];

export const RUNNING_DEBATE_PHASES = new Set<DebatePhase>([
    'initializing',
    'active',
    'deliberating',
    'consensus',
    'summarizing',
]);
