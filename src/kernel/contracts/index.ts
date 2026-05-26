export type { Result, AsyncResult } from './results';
export { ok, fail, isOk, isFail } from './results';

export type {
  ProviderError, QuotaError, MemoryError, ToolError, RoutingError,
  KernelError, ConfigError, KernelErrorUnion,
} from './errors';
export { isProviderError, isQuotaError, isMemoryError, isToolError, isRoutingError } from './errors';

export type { ICostCalculator, IUsageTracker, CostEstimate, ProviderBudget, BudgetInfo, PricingCapability, CostCalculationError } from './pricing';
export type { IProviderRouter, IProviderStateManager, ProviderCapability, RequestClassification, RouterDecision } from './provider';
export type { IMemoryEngine, IToolExecutor, MemoryCapability, MemoryQuery } from './memory';
export type { IToolRegistry, ToolDescriptor, ToolCategory, ToolExecutionRequest, ToolExecutionResult, ToolCapabilityDescriptor } from './tool';
export type { IRoutingEngine, IFallbackChain, RoutingRequest, RoutingCandidate, RoutingDecision, RoutingStrategy, RoutingCapability } from './routing';

export type {
  TimelineEvent, TimelineFilter, TimelineEventType, TimelineCategory,
  ITraceContract, IMetricsContract, ITimelineContract, IMonitoringContract,
} from './observability';
export type { ITimelineStore, ITimelineIngester, TimelinePreset } from './timeline';

export type {
  AdapterMessage, AdapterSafetyRating, AdapterFinishReason,
  AdapterResponse, AdapterHealthResult,
  IProviderAdapter, IAdapterRegistry, IAdapterFactory,
  ILLMClientConfig, ILLMClientService, ProviderAdapterEvents, IAdapterHealthTracker,
  BatchRequest, BatchStreamRequest,
} from './provider-adapter';

export type { CacheEntry, ICacheService } from './cache';

export type {
  ThemeConfig, NotificationPreferences, DataManagementSettings,
  SystemSettings, SettingsProfile, ISettingsService,
} from './settings';

export type { AgentBudget, SpendSummary, BudgetAlert, IBudgetService } from './budget';

export { checkToHealth, normalizeHealthStatus } from './health';
export type { CanonicalHealthStatus, KeyHealthCheckResult, KeyHealthSummary, IHealthService } from './health';

export type { VirtualKey, IVirtualKeyService, VirtualKeyServiceEvents } from './virtual-key';

export type { SecretRef, SecretStoreConfig, SecretStore } from './secret-store';

export type { WebhookConfig, WebhookProvider, WebhookEventType } from './webhook';

export type { ILifecycle } from './lifecycle';
export type { ITransaction, ITransactional } from './transaction';
export type { ILogger, ITraceContext, LogEntry, LogLevel } from './logger';

export type { CompromiseSignal, WebhookSource, GitHubSecretAlert, SentryAlert } from './compromise';

export type { IKeyIntelligencePipeline, KeyIntelligenceInput, KeyImportReport, ParsedKeyResult, KeyRiskAssessment, RiskFactor, AccountGroup } from './key-intelligence';

export type { ConfigRegistry, RouterConfigSection, MonitoringConfigSection, MetricsConfigSection, TracesConfigSection, WebhooksConfigSection, KeysConfigSection, LlmConfigSection, PressureConfigSection, PricingConfigSection } from './config-registry';

// ── Debate Runtime ─────────────────────────────────────────────────────
export type {
  TopologyType, TopologyNode, TopologyEdge, DebateTopology,
  ITopologyService,
  DebatePhase, AgentPhase, AgentStateEntry,
  IDebateSession, DebateSessionSnapshot,
  DebateBudgetLimits, PressureLevel, PressureAction,
  IDebateBudget, BudgetSnapshot,
  Claim, Conflict, ConsensusResult, IConsensusEngine,
  ReasoningStep, ReasoningChain, IDebateMemory, MemorySnapshot,
  AgentScore, IDebateEvaluator,
  OrchestratorEvent, IDebateOrchestrator,
  TimelineEntry, IDebateTimeline,
  ParticipantConfig, IDebateEngine,
} from './debate-runtime';

export type {
  CognitiveMetricsSnapshot, CognitiveZone,
  CognitivePressure, CognitiveSessionSummary, ICognitivePressureEngine,
  SessionDiagnostic, CognitiveIssue, ICognitiveDiagnosticsEngine,
  TopologyWhatIf, ICognitiveWhatIfEngine,
  ICognitiveIntelligenceService,
} from './cognitive-intelligence';

export type {
  IRoutingPolicy,
  FallbackLink, FallbackRecord, PenaltyRecord,
  HealthPenaltyInput, HealthPenaltyResult,
  RoutingPolicyPreview, RoutingPolicyPreviewInput, RoutingPolicySnapshot,
} from './routing-policy';

export type {
  IWhatIfService,
  BudgetWhatIf, ProviderWhatIf, StrategyWhatIf, SimulationRecord,
} from './whatif-service';

export type {
  IPressureMapService,
  ProviderPressureEntry, SessionPressureEntry,
  PressureMapSnapshot, PressureTrendPoint, PressureAlert,
} from './pressure-map-service';

export type {
  IDiagnosticService,
  DiagnosticScope, ProviderDiagnostic, SystemDiagnostic, DiagnosticRunRecord,
} from './diagnostic-service';

export type { IKeyVaultService } from './key-vault';
export type { IHealthCheckService } from './health-check';
export type { IKeyAnalyticsService } from './key-analytics';
export type { IPoolSelectorService, PoolStrategy } from './pool-selector';

// ── Storage Layer ─────────────────────────────────────────────────
export type { StorageLayer, KeyStore, MemoryStore, TraceStore, SessionStore, ConfigStore, RolesStore, SkillsStore } from './storage/storage-layer';
export type { ChatSession, ChatEntry } from './storage/session-store';
export type { CognitiveTrace } from './storage/trace-store';

// ── Auto-Debate ───────────────────────────────────────────────────
export type { IAutoDebateService, AutoDebateOptions, AutoDebateResult, ProviderWinRate, BatchTestResult } from './auto-debate';

// ── Missing re-exports ────────────────────────────────────────────
export type { PressureLevel, ProviderPressure, GlobalPressure, PressureMapSnapshot, IPressureEngine, DiagnosticCategory, DiagnosticSeverity, DiagnosticFinding, ProviderDiagnostic, IDiagnosticsEngine, WhatIfScenario, RuntimeScenario, IWhatIfEngine, LLMAnalysisResult, IInsightEngine, AdvisorMetrics, AdvisorConfig, SuggestionType, SuggestionImpact, ProposedChange, OptimizationSuggestion, SREAlert, IOptimizationEngine } from './advisor';
export type { IKeyRotationManager, IRotationService } from './key-rotation';
export type { NodeType, ISNode, ISEdge, ISTopology, ISPolicy } from './topology';

export type { IWorkspaceService, FileNode, SearchMatch, FileReadRecord } from './workspace';
export { WORKSPACE_EVENTS } from './workspace';
export type { WorkspaceAttachPayload, WorkspaceFileReadPayload } from './workspace';

export type { IProbeService, ProbeResult, ProbeStatus } from './probe';

export type { IKeyStateStore, KeyState, KeyStatus, KeyProbeSnapshot, KeyHealthSnapshot, KeyQuotaSnapshot, KeyRoutingState } from './key-state';
export type { KeyStateEvent } from './key-state';

export { FEATURE_FLAGS, DEFAULT_FEATURE_FLAGS } from './feature-flags';
export type { IFeatureFlagService, FeatureFlag } from './feature-flags';

export type { IStorageAdapter } from './storage-adapter';
