// Infrastructure
export { Container } from './container';
export type { IContainer } from './container';
export type { ServiceIdentifier } from './container';

export { EventBus } from './event-bus';
export { DatabaseService, dexieDb } from './services/database-service';
export { SecurityService } from './security';

// Kernel
export { SystemKernel } from './kernel';
export { RuntimeManager } from './runtime';
export type { RuntimePhase, RuntimeStatus } from './runtime';
export type { RuntimePhase as RuntimePhaseEnum, RuntimeStatus as RuntimeStatusInfo } from './state';
export { SystemBootstrap } from './bootstrap';
export type { InitPhase, BootstrapReport } from './bootstrap';

// Services
export { KeyService } from './services/key-vault';
export type { KeyServiceDeps, FreeTierLimit, PoolStrategy } from './services/key-vault';

export { RouterService } from './services/provider-router';
export type { RouterServiceDeps } from './services/provider-router';

export { MCPService } from './services/mcp-service';
export type { MCPServiceDeps, MCPServerConfig, MCPResource, MCPTool } from './services/mcp-service';

export { ToolService } from './services/tool-executor';
export type { ToolServiceDeps, ToolDefinition, ToolExecution } from './services/tool-executor';

export { MemoryService } from './services/memory-engine';
export type { MemoryServiceDeps, SearchMode } from './services/memory-engine';

export { PricingService } from './services/pricing-service';
export type { PricingServiceDeps, ModelPricing } from './services/pricing-service';

export { UsageTracker } from './services/usage-tracker';
export type { UsageTrackerDeps, UsageStats, UsageRecord } from './services/usage-tracker';

export { BudgetService } from './services/budget-service';
export type { BudgetServiceDeps } from './services/budget-service';

export { PolicyService } from './services/policy-service';
export type { PolicyServiceDeps, PolicyType, PolicyAction, PolicySeverity, PolicyViolation, PolicyStats, AgentPolicy, AgentPolicyCheck, SecurityPattern, ISPolicy, PrivacyEnforcementResult, ContentSafetyResult } from './services/policy-service';

export { ChatService } from './services/chat-service';
export type { ChatServiceDeps } from './services/chat-service';

export { AgentService } from './services/agent-service';
export type { AgentServiceDeps, AgentStats, AgentGroup } from './services/agent-service';

export { SettingsService } from './services/settings-service';
export type { SettingsServiceDeps, SettingsListener } from './services/settings-service';

export { SandboxService } from './services/sandbox-service';
export type { SandboxServiceDeps } from './services/sandbox-service';

export { CognitiveService } from './services/cognitive-service';
export type { CognitiveServiceDeps, CognitiveStats, DecisionAlternative } from './services/cognitive-service';

export { RoleService } from './services/role-service';
export type { RoleServiceDeps, RoleUsageStats } from './services/role-service';

export { DebateService } from './services/debate-service';
export type { DebateServiceDeps, DebateSession, DebateParticipant, DebateArgument, DebateConfig, HumanVote } from './services/debate-service';

export { SkillService } from './services/skill-service';
export type { SkillServiceDeps } from './services/skill-service';

export { ProviderTracker } from './services/provider-tracker';
export type { ProviderTrackerDeps, ProviderMetricData, HealthEvent, HealthEventType } from './services/provider-tracker';

export { SnapshotService } from './services/snapshot-service';
export type { SnapshotServiceDeps, SystemSnapshot, SnapshotDiff, RuntimeState } from './services/snapshot-service';

export { AdminService } from './services/admin-service';
export type { AdminServiceDeps, AdminAuditEntry, SystemHealthReport } from './services/admin-service';

export { TimelineService } from './services/timeline-service';
export type { TimelineServiceDeps } from './services/timeline-service';

export { MonitoringService } from './services/monitoring-service';
export type { MonitoringServiceDeps } from './services/monitoring-service';

export { AdvisorService } from './services/advisor-service';
export type { AdvisorServiceDeps } from './types/advisor-deps';

export { ProviderAdapterRegistry } from './services/provider-adapter-registry';

export { LLMClientService } from './services/llm-client-service';
export type { ILLMClientConfig } from './contracts/provider-adapter';

export { VirtualKeyService } from './services/virtual-key-service';
export type { VirtualKeyServiceDeps } from './services/virtual-key-service';
export type {
  AdvisorMetrics, OptimizationSuggestion, ProposedChange,
  PressureMapSnapshot, ProviderPressure, GlobalPressure, PressureLevel,
  DiagnosticFinding, ProviderDiagnostic,
  WhatIfScenario, RuntimeScenario,
  SREAlert, IPressureEngine, IDiagnosticsEngine, IWhatIfEngine, IInsightEngine, IOptimizationEngine,
} from './contracts/advisor';

// Contracts — Core
export type { Result, AsyncResult } from './contracts/results';
export { ok, fail, isOk, isFail } from './contracts/results';

export type {
  ProviderError, QuotaError, MemoryError, ToolError, RoutingError,
  KernelError, ConfigError, KernelErrorUnion,
} from './contracts/errors';

export type { ICostCalculator, IUsageTracker, CostEstimate, ProviderBudget, BudgetInfo, PricingCapability, CostCalculationError } from './contracts/pricing';
export type { IProviderRouter, IProviderStateManager, ProviderCapability, RequestClassification, RouterDecision } from './contracts/provider';
export type { IMemoryEngine, IToolExecutor, MemoryCapability, MemoryQuery } from './contracts/memory';
export type { IToolRegistry, ToolDescriptor, ToolCategory, ToolExecutionRequest, ToolExecutionResult, ToolCapabilityDescriptor } from './contracts/tool';
export type { IRoutingEngine, IFallbackChain, RoutingRequest, RoutingCandidate, RoutingDecision, RoutingStrategy, RoutingCapability } from './contracts/routing';
export type {
  ITraceContract, IMetricsContract, ITimelineContract, IMonitoringContract,
} from './contracts/observability';

export type {
  AdapterMessage, AdapterSafetyRating, AdapterFinishReason,
  AdapterResponse, AdapterHealthResult,
  IProviderAdapter, IAdapterRegistry, IAdapterFactory,
  IAdapterHealthTracker, ProviderAdapterEvents,
} from './contracts/provider-adapter';

export type { CacheEntry, ICacheService } from './contracts/cache';

export type {
  ThemeConfig, NotificationPreferences, DataManagementSettings,
  SystemSettings, SettingsProfile, ISettingsService,
} from './contracts/settings';

export type { AgentBudget, SpendSummary, BudgetAlert, IBudgetService } from './contracts/budget';

export type { KeyHealthCheckResult, KeyHealthSummary, IHealthService } from './contracts/health';

export type { VirtualKey, IVirtualKeyService, VirtualKeyServiceEvents } from './contracts/virtual-key';

export { CounterfactualExplanationService } from './services/counterfactual-explanation-service';
export type {
  ICounterfactualExplanationService,
  DecisionExplanation, ProviderExplanation, ScoreComponentDelta, DecisiveComponent,
} from './contracts/counterfactual-explanation';

export { CounterfactualNarrativeService } from './services/counterfactual-narrative-service';
export type {
  ICounterfactualNarrativeService,
  NarrativeExplanation,
} from './contracts/counterfactual-narrative';

export { TemporalReplayService } from './services/temporal-replay-service';
export type {
  ITemporalReplayService,
  TemporalTrace,
  TemporalFrame,
  ScoreSnapshot,
} from './contracts/temporal-replay';

export { TruthConsistencyMonitor } from './services/truth-consistency-monitor';
export type {
  ITruthConsistencyMonitor,
  ConsistencyReport,
  DriftEntry,
  DriftSeverity,
} from './contracts/truth-consistency';

// Events
export { ProviderEvents, ChatEvents, SystemEvents, EVENTS, ObservabilityEvents } from './events';
export type {
  ProviderEventMap, ApiKeyPayload, QuotaExceededPayload,
  ChatEventMap, ChatSendPayload, StreamLifecyclePayload, StreamChunkPayload, StreamEndPayload, StreamErrorPayload,
  SystemEventMap, NotificationPayload, DecisionPayload,
  ObservabilityEventMap,
} from './events';

// State
export { isValidRuntimeTransition } from './state';
export type {
  RuntimeTransition, RuntimeStateChangeListener,
  HealthStatus, ProviderHealth, ProviderHealthSummary, HealthChangeEvent, HealthChangeListener, ProviderHealthTrend,
  ProviderStateStatus, ProviderRawMetrics, ProviderStateEntry, ProviderStateSnapshot,
  TokenBudget, RequestBudget, CostBudget, QuotaAlert, QuotaStateSnapshot, BudgetConfig,
  MemoryPlaneStats, CachePlaneStats, MemoryStateSnapshot, MemoryPressureIndicators,
  DebatePhase, DebateParticipantState, DebateSessionState, DebateStateSnapshot, ConsensusState,
  ObservabilityStateSnapshot, TimelineStateSnapshot, TraceStateSnapshot, MetricStateSnapshot, SystemHealthIndicators,
  CacheStateEntry, CacheStateSnapshot,
  SettingsStateSnapshot,
  BudgetStateEntry, BudgetAlertEntry, BudgetStateSnapshot,
  VirtualKeyStateSnapshot,
} from './state';

// Types
export type { IEventBus, IDatabaseService, ISecurityService, IRuntimeManager, IKernel, IBootstrap, IProviderTracker, KernelDeps } from './types/interfaces';
