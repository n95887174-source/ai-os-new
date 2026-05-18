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
