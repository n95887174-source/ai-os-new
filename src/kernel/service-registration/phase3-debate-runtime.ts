/**
 * Phase 3 — Debate & Runtime.
 *
 * Debate services, research services, and runtime intelligence
 * (cognitive intelligence, what-if, pressure map, diagnostics).
 *
 * A-04: All services now use registerFactory (lazy instantiation).
 * Imperative calls (setDeps, setEngine) remain outside factories.
 */
import type { Phase } from './helpers';
import type { IEventBus, IDatabaseService } from '../types/interfaces';
import type { IContainer } from '../container';
import type { IExecutionGovernor } from '../contracts/execution-governor';
import type { StorageLayer, DebateStore } from '../contracts/storage/storage-layer';
import type { KeyService } from '../services/key-management/key-service';
import type { ProviderAdapterRegistry } from '../services/provider-adapter-registry';
import type { ISessionManager } from '../contracts/session-manager';
import type { WorkspaceService } from '../services/workspace-service';
import type { RoleService } from '../services/role-service';
import type { OrchestrationService } from '../services/orchestration-service';
import type { MemoryService } from '../services/memory-engine';
import type { ChatMessage } from '../types/llm-types';
import {
    debateService as debateServiceModule,
    setDeps,
    isInitialized,
} from '../services/debate-runtime/debate-service';
import type { DebateServiceDeps } from '../services/debate-runtime/debate-service';
import { CollaborativeService } from '../services/collaborative-service';
import { DebateApiService } from '../services/debate-runtime/debate-api';
import { DebateKnowledgeSyncService } from '../services/debate-runtime/debate-knowledge-sync';
import { HypothesisService } from '../services/hypothesis-service';
import { ResearchRunService } from '../services/research-run-service';
import { ArchitectureReviewService } from '../services/architecture-review-service';
import { PromptAuditService } from '../services/prompt-audit-service';
import { RoutingExperimentsService } from '../services/routing-experiments-service';
import { DebateEngine } from '../services/debate-runtime/debate-engine';
import { DebateQueryEngine } from '../services/debate-runtime/debate-query-engine';
import { StrategyManager } from '../services/debate-runtime/debate-strategy-manager';
import { DebateModeManagerPersistent } from '../services/debate-runtime/debate-mode-manager';
import { DebateWorkspace } from '../services/debate-runtime/debate-workspace';
import { DebatePolicyEngine } from '../services/debate-runtime/debate-policy-engine';
import { DebateRAGRetriever } from '../services/debate-runtime/debate-rag-retriever';
import { DebateEmbeddingPipeline } from '../services/debate-runtime/debate-embedding-pipeline';
import { DebateMemoryExtractor } from '../services/debate-runtime/debate-memory-extractor';
import { DebateEvaluator } from '../services/debate-runtime/debate-evaluator';
import { CognitiveIntelligenceService } from '../services/cognitive-intelligence/cognitive-intelligence-service';
import { WhatIfService } from '../services/runtime-intelligence/whatif-service';
import { PressureMapService } from '../services/runtime-intelligence/pressure-map-service';
import { DiagnosticService } from '../services/runtime-intelligence/diagnostic-service';

/** Simple hash-based embedding for keyword overlap without an external embedding API. */
function simpleEmbedText(text: string): Promise<Float32Array> {
    const words = text
        .toLowerCase()
        .split(/[^a-zа-яё0-9]+/)
        .filter(Boolean);
    const freq = new Map<string, number>();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    const vocab = Array.from(freq.keys());
    const dim = 64;
    const vec = new Float32Array(dim);
    for (let i = 0; i < vocab.length && i < dim; i++) {
        vec[i] = (freq.get(vocab[i]) || 0) / words.length;
    }
    return Promise.resolve(vec);
}

const EMPTY_DEBATE_STORE: DebateStore = {
    saveSnapshot: async () => {
        throw new Error('DebateStore not available — storageLayer not configured');
    },
    getSnapshot: async () => {
        throw new Error('DebateStore not available — storageLayer not configured');
    },
    listSessions: async () => {
        throw new Error('DebateStore not available — storageLayer not configured');
    },
    listAllSessions: async () => {
        throw new Error('DebateStore not available — storageLayer not configured');
    },
    deleteSession: async () => {
        throw new Error('DebateStore not available — storageLayer not configured');
    },
    saveVerdict: async () => {
        throw new Error('DebateStore not available — storageLayer not configured');
    },
    getVerdict: async () => {
        throw new Error('DebateStore not available — storageLayer not configured');
    },
    count: async () => {
        throw new Error('DebateStore not available — storageLayer not configured');
    },
};

export const registerPhase3: Phase = (helpers, ctx) => {
    const { register, asDeps } = helpers;
    const _container: IContainer = ctx.container;
    const storageLayer = ctx.container.get<StorageLayer>('storageLayer');

    // A-04: embedPipeline created once as a plain const — used directly by
    // all dependent services (debateRAGRetriever, debateEngine).
    const embedPipeline = new DebateEmbeddingPipeline({ embedText: simpleEmbedText });
    const debateEvaluator = new DebateEvaluator();
    const debateMemoryExtractor = new DebateMemoryExtractor();
    const debateRAGRetriever = new DebateRAGRetriever({ embeddingPipeline: embedPipeline });

    // A-04: setDeps() is imperative — mutates module-level singleton.
    // Keep outside factory; runs once at registration time.
    if (!isInitialized()) {
        setDeps(
            asDeps<DebateServiceDeps>({
                database: _container.get<IDatabaseService>('database'),
                eventBus: _container.get<IEventBus>('eventBus'),
                get routerService() {
                    return _container.get<import('../services/provider-router').RouterService>(
                        'routerService',
                    );
                },
                get keyService() {
                    return _container.get<KeyService>('keyService');
                },
                get adapterRegistry() {
                    return _container.get<ProviderAdapterRegistry>('providerAdapterRegistry');
                },
                get workspaceService() {
                    return _container.get<WorkspaceService>('workspaceService');
                },
                queryEngine: new DebateQueryEngine(),
                debateStore: storageLayer?.debates ?? EMPTY_DEBATE_STORE,
                get sessionManager() {
                    return _container.get<
                        import('../services/session-manager-service').SessionManagerService
                    >('sessionManagerService');
                },
            }),
        );
    }
    register('debateService', (_c) => debateServiceModule);

    register(
        'collaborativeService',
        (c) =>
            new CollaborativeService({
                eventBus: c.get<IEventBus>('eventBus'),
                get humanService() {
                    return c.get<
                        import('../services/debate-runtime/debate-human-service').DebateHumanService
                    >('debateHumanService');
                },
            }),
    );

    register(
        'debateApiService',
        (c) =>
            new DebateApiService({
                eventBus: c.get<IEventBus>('eventBus'),
                debateService: c.get<typeof debateServiceModule>('debateService'),
                get orchestrator() {
                    return c.get<OrchestrationService>('orchestrator');
                },
                get sessionManager() {
                    return c.get<ISessionManager>('sessionManagerService');
                },
            }),
    );

    register(
        'debateKnowledgeSync',
        (c) =>
            new DebateKnowledgeSyncService({
                eventBus: c.get<IEventBus>('eventBus'),
                memoryService: c.get<MemoryService>('memoryService'),
            }),
    );

    register(
        'hypothesisService',
        (c) =>
            new HypothesisService({
                eventBus: c.get<IEventBus>('eventBus'),
                database: c.get<IDatabaseService>('database'),
            }),
    );

    register(
        'researchRunService',
        (c) =>
            new ResearchRunService({
                database: c.get<IDatabaseService>('database'),
            }),
    );

    register('architectureReviewService', (_c) => new ArchitectureReviewService());

    register(
        'promptAuditService',
        (c) =>
            new PromptAuditService({
                get getAllRoles() {
                    return () => c.get<RoleService>('roleService').getAllRoles();
                },
            }),
    );

    register(
        'routingExperimentsService',
        (c) =>
            new RoutingExperimentsService({
                database: c.get<IDatabaseService>('database'),
                resolveApiKey: (provider: string) => {
                    const keyService = c.get<KeyService>('keyService');
                    const keys = keyService.getKeysByProvider(provider);
                    return keys?.[0]?.key ?? '';
                },
                getAdapter: (provider: string) => {
                    const registry = c.get<ProviderAdapterRegistry>('providerAdapterRegistry');
                    const adapter = registry.getAdapter(provider);
                    if (!adapter) return null;
                    return {
                        sendMessage: async (
                            messages: Array<{ role: string; content: string }>,
                            model: string,
                            apiKey: string,
                            temperature?: number,
                            maxTokens?: number,
                        ) => {
                            return adapter.sendMessage(
                                messages as ChatMessage[],
                                model,
                                apiKey,
                                undefined,
                                { temperature, maxOutputTokens: maxTokens },
                            ) as Promise<{ content?: string }>;
                        },
                    };
                },
            }),
    );

    register('debatePolicyEngine', (_c) => new DebatePolicyEngine());

    // A-04: embedPipeline, evaluator, extractor created as plain consts above.
    // They are singletons but not registered individually — they are passed
    // directly to services that need them, avoiding extra factory indirection.
    register('debateEmbeddingPipeline', (_c) => embedPipeline);
    register('debateRAGRetriever', (_c) => debateRAGRetriever);
    register('debateMemoryExtractor', (_c) => debateMemoryExtractor);
    register('debateEvaluator', (_c) => debateEvaluator);

    register('debateEngine', (c) => {
        const noopGet = () => undefined;
        const noopUpdate = () => {};
        return new DebateEngine({
            eventBus: c.get<IEventBus>('eventBus'),
            get getRouterService() {
                return () =>
                    c.get<import('../services/provider-router').RouterService>('routerService');
            },
            get getKeyService() {
                return () => c.get<KeyService>('keyService');
            },
            get getAdapterRegistry() {
                return () => c.get<ProviderAdapterRegistry>('providerAdapterRegistry');
            },
            get getKeyStateStore() {
                const getter = (): {
                    get: (id: string) =>
                        | {
                              flags: {
                                  authFailed: boolean;
                                  circuitOpen: boolean;
                                  rateLimited: boolean;
                              };
                          }
                        | undefined;
                    update: (id: string, patch: { flags: Record<string, boolean> }) => void;
                } => {
                    try {
                        return c.get<import('../services/key-state-store').KeyStateStore>(
                            'keyStateStore',
                        ) as unknown as {
                            get: (id: string) =>
                                | {
                                      flags: {
                                          authFailed: boolean;
                                          circuitOpen: boolean;
                                          rateLimited: boolean;
                                      };
                                  }
                                | undefined;
                            update: (id: string, patch: { flags: Record<string, boolean> }) => void;
                        };
                    } catch {
                        return { get: noopGet, update: noopUpdate };
                    }
                };
                return getter;
            },
            get getExecutionGovernor() {
                return () => c.get<IExecutionGovernor>('executionGovernor');
            },
            debateStore: storageLayer?.debates ?? EMPTY_DEBATE_STORE,
            policyEngine: c.get<DebatePolicyEngine>('debatePolicyEngine'),
            ragRetriever: debateRAGRetriever,
            memoryExtractor: debateMemoryExtractor,
            evaluator: debateEvaluator,
        });
    });

    register(
        'debateHumanService',
        (c) => c.get<typeof debateServiceModule>('debateService').humanService,
    );
    register('strategyManager', (_c) => new StrategyManager(storageLayer.config));
    register('debateModeManager', (_c) => new DebateModeManagerPersistent(storageLayer));

    register(
        'debateWorkspace',
        (c) =>
            new DebateWorkspace({
                getRoom: () => undefined,
                getEngine: () => c.get<DebateEngine>('debateEngine'),
                storage: storageLayer,
            }),
    );

    register(
        'cognitiveIntelligenceService',
        (c) => new CognitiveIntelligenceService(c.get<IEventBus>('eventBus')),
    );

    register(
        'whatIfService',
        (c) =>
            new WhatIfService({
                eventBus: c.get<IEventBus>('eventBus'),
                cognitiveIntelligenceService: c.get<CognitiveIntelligenceService>(
                    'cognitiveIntelligenceService',
                ),
            }),
    );

    register(
        'pressureMapService',
        (c) =>
            new PressureMapService({
                eventBus: c.get<IEventBus>('eventBus'),
                cognitiveIntelligenceService: c.get<CognitiveIntelligenceService>(
                    'cognitiveIntelligenceService',
                ),
            }),
    );

    register(
        'diagnosticService',
        (c) =>
            new DiagnosticService({
                eventBus: c.get<IEventBus>('eventBus'),
                cognitiveIntelligenceService: c.get<CognitiveIntelligenceService>(
                    'cognitiveIntelligenceService',
                ),
            }),
    );

    // A-04: setEngine() is imperative — wire debateEngine to debateService.
    // Runs after registration; by this point factories have executed.
    const debateSvc = _container.get<typeof debateServiceModule>('debateService');
    const debateEng = _container.get<DebateEngine>('debateEngine');
    debateSvc.setEngine(debateEng);
};
