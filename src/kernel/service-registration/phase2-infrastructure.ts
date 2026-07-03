/**
 * Phase 2 — Infrastructure.
 *
 * Services that depend on Phase 1 (settings, pricing, keyService, kernel,
 * eventBus) but not on memory/cognitive or debate.
 */
import type { Phase } from './helpers';
import type { IEventBus, IDatabaseService } from '../types/interfaces';
import type { IExecutionGovernor } from '../contracts/execution-governor';
import type { TraceStore } from '../contracts/storage/storage-layer';
import type { LoggerService } from '../services/logger-service';
import type { KeyService } from '../services/key-management/key-service';
import type { ProviderAdapterRegistry } from '../services/provider-adapter-registry';
import type { GroupManagerService } from '../services/group-manager';
import type { KeyStateStore } from '../services/key-state-store';
import { SessionAffinityStore } from '../services/session-affinity-store';
import { ChatBookmarksService } from '../services/chat-bookmarks-service';
import { AgentJournalService } from '../services/agent-journal-service';
import { SystemStatusService } from '../services/system-status-service';
import { RotationService } from '../services/rotation-service';
import { PolicyService } from '../services/policy-service';
import { ToolService } from '../services/tool-executor';
import { MemoryService } from '../services/memory-engine';
import { ExternalSecretsService } from '../services/external-secrets-service';
import { BlackboardService } from '../services/blackboard-service';
import { CognitiveService, type CognitiveServiceDeps } from '../services/cognitive-service';
import type { StorageLayer } from '../contracts/storage/storage-layer';

export const registerPhase2: Phase = (helpers, ctx) => {
    const { register, get, asDeps } = helpers;

    register(
        'sessionAffinityStore',
        new SessionAffinityStore(get<IEventBus>('eventBus'), get<KeyStateStore>('keyStateStore')),
    );

    register(
        'chatBookmarksService',
        new ChatBookmarksService({
            eventBus: get<IEventBus>('eventBus'),
            database: get<IDatabaseService>('database'),
            logger: get<LoggerService>('logger'),
        }),
    );

    register(
        'agentJournalService',
        new AgentJournalService({
            eventBus: get<IEventBus>('eventBus'),
            database: get<IDatabaseService>('database'),
            logger: get<LoggerService>('logger'),
        }),
    );

    register(
        'systemStatusService',
        new SystemStatusService({
            groupManager: get<GroupManagerService>('groupManagerService'),
            keyService: get<KeyService>('keyService'),
            keyStateStore: get<KeyStateStore>('keyStateStore'),
        }),
    );

    register(
        'rotationService',
        new RotationService(
            asDeps<ConstructorParameters<typeof RotationService>[0]>({
                keyManager: get<KeyService>('keyService'),
                eventBus: get<IEventBus>('eventBus'),
                adapterRegistry: get<ProviderAdapterRegistry>('providerAdapterRegistry'),
                logger: get<LoggerService>('logger'),
                groupManager: get<GroupManagerService>('groupManagerService'),
            }),
        ),
    );

    register(
        'policyService',
        new PolicyService({
            database: get<IDatabaseService>('database'),
            eventBus: get<IEventBus>('eventBus'),
        }),
    );

    register(
        'toolService',
        new ToolService({
            database: get<IDatabaseService>('database'),
            eventBus: get<IEventBus>('eventBus'),
        }),
    );

    register(
        'memoryService',
        new MemoryService(
            asDeps<ConstructorParameters<typeof MemoryService>[0]>({
                database: get<IDatabaseService>('database'),
                eventBus: get<IEventBus>('eventBus'),
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

    register(
        'externalSecretsService',
        new ExternalSecretsService({
            database: get<IDatabaseService>('database'),
            eventBus: get<IEventBus>('eventBus'),
        }),
    );

    const blackboardService = new BlackboardService({ eventBus: get<IEventBus>('eventBus') });
    register('blackboardService', blackboardService);

    const storageLayer = get<StorageLayer>('storageLayer');
    register(
        'cognitiveService',
        new CognitiveService({
            traceStore:
                storageLayer?.traces ??
                ({
                    saveTrace: async () => {},
                    getTrace: async () => null,
                    queryTraces: async () => [],
                    deleteTrace: async () => {},
                    count: async () => 0,
                    bulkPut: async () => {},
                    clear: async () => {},
                    exportAll: async () => '[]',
                    importAll: async () => {},
                } as TraceStore),
            eventBus: get<IEventBus>('eventBus'),
            get routerService() {
                return get<CognitiveServiceDeps['routerService']>('routerService');
            },
            get keyService() {
                return get<CognitiveServiceDeps['keyService']>('keyService');
            },
            get roleService() {
                return get<CognitiveServiceDeps['roleService']>('roleService');
            },
            get adapterRegistry() {
                return get<CognitiveServiceDeps['adapterRegistry']>('providerAdapterRegistry');
            },
            blackboardService,
        }),
    );
};
