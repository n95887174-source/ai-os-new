/**
 * Phase 3 — Debate & Runtime.
 *
 * Debate services, research services, and runtime intelligence
 * (cognitive intelligence, what-if, pressure map, diagnostics).
 */
import type { Phase } from './helpers';
import type { IEventBus, IDatabaseService } from '../types/interfaces';
import type { IContainer } from '../container';
import type { StorageLayer, DebateStore } from '../contracts/storage/storage-layer';
import type { KeyService } from '../services/key-management/key-service';
import type { ProviderAdapterRegistry } from '../services/provider-adapter-registry';
import type { WorkspaceService } from '../services/workspace-service';
import type { FeatureFlagService } from '../services/feature-flag-service';
import type { PolicyService } from '../services/policy-service';
import type { RoleService } from '../services/role-service';
import type { OrchestrationService } from '../services/orchestration-service';
import type { MemoryService } from '../services/memory-engine';
import { DebateService } from '../services/debate-service';
import { CollaborativeService } from '../services/collaborative-service';
import { DebateApiService } from '../services/debate-api';
import { DebateKnowledgeSyncService } from '../services/debate-knowledge-sync';
import { HypothesisService } from '../services/hypothesis-service';
import { ResearchRunService } from '../services/research-run-service';
import { ArchitectureReviewService } from '../services/architecture-review-service';
import { PromptAuditService } from '../services/prompt-audit-service';
import { RoutingExperimentsService } from '../services/routing-experiments-service';
import { DebateEngine } from '../services/debate-runtime/debate-engine';
import { StrategyRegistry } from '../services/debate-runtime/debate-strategy-registry';
import { DebateModeManagerPersistent } from '../services/debate-runtime/debate-mode-manager';
import { DebateWorkspace } from '../services/debate-runtime/debate-workspace';
import { DebateRoom } from '../services/debate-runtime/debate-room';
import { DebatePolicyEngine } from '../services/debate-runtime/debate-policy-engine';
import { CognitiveIntelligenceService } from '../services/cognitive-intelligence/cognitive-intelligence-service';
import { WhatIfService } from '../services/runtime-intelligence/whatif-service';
import { PressureMapService } from '../services/runtime-intelligence/pressure-map-service';
import { DiagnosticService } from '../services/runtime-intelligence/diagnostic-service';

const EMPTY_DEBATE_STORE: DebateStore = {
  saveSnapshot: async () => {},
  getSnapshot: async () => null,
  listSessions: async () => [],
  deleteSession: async () => {},
  saveVerdict: async () => {},
  getVerdict: async () => null,
  count: async () => 0,
};

export const registerPhase3: Phase = (helpers, ctx) => {
  const { register, get, asDeps } = helpers;
  const _container: IContainer = ctx.container;
  const storageLayer = get<StorageLayer>('storageLayer');

  register('debateService', new DebateService(asDeps<ConstructorParameters<typeof DebateService>[0]>({
    database: get<IDatabaseService>('database'),
    eventBus: get<IEventBus>('eventBus'),
    get routerService() { return _container.get<import('../services/provider-router').RouterService>('routerService'); },
    get keyService() { return _container.get<KeyService>('keyService'); },
    get adapterRegistry() { return _container.get<ProviderAdapterRegistry>('providerAdapterRegistry'); },
    get workspaceService() { return _container.get<WorkspaceService>('workspaceService'); },
    getFeatureFlagService: () => _container.get<FeatureFlagService>('featureFlagService'),
    debateStore: storageLayer?.debates ?? (EMPTY_DEBATE_STORE as unknown as DebateStore),
  })));

  register('collaborativeService', new CollaborativeService({
    eventBus: get<IEventBus>('eventBus'),
    debateService: get<DebateService>('debateService'),
  }));

  register('debateApiService', new DebateApiService({
    eventBus: get<IEventBus>('eventBus'),
    debateService: get<DebateService>('debateService'),
    get orchestrator() { return _container.get<OrchestrationService>('orchestrator'); },
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
      return () => _container.get<RoleService>('roleService').getAllRoles();
    },
  }));

  register('routingExperimentsService', new RoutingExperimentsService({
    database: get<IDatabaseService>('database'),
    getAdapter: (provider: string) => {
      const registry = _container.get<ProviderAdapterRegistry>('providerAdapterRegistry');
      return registry.getAdapter(provider) as unknown as { sendMessage: (messages: Array<{ role: string; content: string }>, model: string, systemPrompt: string, temperature?: number, maxTokens?: number) => Promise<{ content?: string }> } | null;
    },
  }));

  register('debateEngine', new DebateEngine({
    eventBus: get<IEventBus>('eventBus'),
    get getRouterService() { return () => _container.get<import('../services/provider-router').RouterService>('routerService'); },
    get getKeyService() { return () => _container.get<KeyService>('keyService'); },
    get getAdapterRegistry() { return () => _container.get<ProviderAdapterRegistry>('providerAdapterRegistry'); },
    debateStore: storageLayer?.debates ?? (EMPTY_DEBATE_STORE as unknown as DebateStore),
  }));

  _container.get<DebateService>('debateService').setEngine(_container.get<DebateEngine>('debateEngine'));

  register('strategyRegistry', new StrategyRegistry());
  register('debateModeManager', new DebateModeManagerPersistent(
    storageLayer ?? { debates: EMPTY_DEBATE_STORE } as unknown as StorageLayer
  ));

  register('debateRoom', new DebateRoom({
    getEngine: () => _container.get<DebateEngine>('debateEngine'),
  }));

  register('debateWorkspace', new DebateWorkspace({
    getRoom: () => _container.get<DebateRoom>('debateRoom') as unknown as DebateRoom,
    getEngine: () => _container.get<DebateEngine>('debateEngine'),
    storage: storageLayer ?? { debates: EMPTY_DEBATE_STORE } as unknown as StorageLayer,
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
};
