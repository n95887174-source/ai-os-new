import { resolve } from './resolver';
import { LoggerService } from './services/logger-service';
export const rootLogger = new LoggerService('System', 'debug');
import { LocalStorageAdapter } from './services/storage/local-storage-adapter';
import type { IStorageAdapter } from './contracts/storage-adapter';
export const storageAdapter: IStorageAdapter = new LocalStorageAdapter();
import type {
  SettingsService, KeyService, MemoryService, MCPService,
  SystemSettings, ThemeConfig, NotificationPreferences, DataManagementSettings, SettingsProfile, SettingsListener,
  FreeTierLimit, PoolStrategy, SearchMode,
  MCPServerConfig, MCPResource, MCPTool,
  CognitiveStats,
} from './index';
import { FREE_TIER_LIMITS } from './services/key-vault';
import type { ChatService } from './services/chat-service';
import type { OrchestrationService } from './services/orchestration-service';
import type { CognitiveService } from './services/cognitive-service';
import type { RouterService, RouterDecision } from './services/provider-router';
import type { PricingService, ModelPricing } from './services/pricing-service';
import type { PolicyService, PolicyType, PolicyAction, PolicySeverity, PolicyViolation, PolicyStats, AgentPolicy, AgentPolicyCheck, SecurityPattern, ISPolicy, PrivacyEnforcementResult, ContentSafetyResult } from './services/policy-service';
import type { AgentService, AgentStats, AgentGroup } from './services/agent-service';
import type { ToolService, ToolDefinition, ToolExecution } from './services/tool-executor';
import type { RoleService, RoleUsageStats } from './services/role-service';
import type { AdminService, AdminAuditEntry, SystemHealthReport } from './services/admin-service';
import type { MonitoringService } from './services/monitoring-service';
import type { SnapshotService, SystemSnapshot, SnapshotDiff, RuntimeState } from './services/snapshot-service';
import type { AdvisorService } from './services/advisor-service';
import type { AutoDebateService } from './services/auto-debate/auto-debate-service';
import type { DebateService, DebateSession, DebateParticipant, DebateArgument, DebateConfig } from './services/debate-service';
import type { DebateEngine } from './services/debate-runtime/debate-engine';
import type { CognitiveIntelligenceService } from './services/cognitive-intelligence/cognitive-intelligence-service';
import type { PressureMapService } from './services/runtime-intelligence/pressure-map-service';
import type { DiagnosticService } from './services/runtime-intelligence/diagnostic-service';
import type { WhatIfService } from './services/runtime-intelligence/whatif-service';
import type { ConfigService } from './services/config-service';
import type { NotificationWebhookService } from './services/notification-webhook-service';
import type { ExternalSecretsService, BackendType, BackendStatus } from './services/external-secrets-service';
import type { CompromiseWebhookService } from './services/compromise-webhook-service';
import type { SkillService } from './services/skill-service';
import type { WorkspaceService } from './services/workspace-service';
import type { KeyStateStore } from './services/key-state-store';
import type { FeatureFlagService } from './services/feature-flag-service';
import type { ProbeService } from './services/probe-service';
import type { CognitiveTrace, CognitiveStep } from './services/cognitive-service';
import type {
  PressureMapSnapshot, ProviderPressureEntry, SessionPressureEntry, PressureTrendPoint, PressureAlert, IAdapterRegistry,
} from './contracts/index';
import type {
  AdvisorMetrics, OptimizationSuggestion, ProposedChange,
  DiagnosticFinding, ProviderDiagnostic, WhatIfScenario, RuntimeScenario,
} from './contracts/advisor';
import type {
  TopologyType, TopologyNode, TopologyEdge, DebateTopology,
  DebatePhase, AgentPhase, DebateSessionSnapshot, PressureLevel as DebatePressureLevel,
} from './contracts/debate-runtime';
import type {
  CognitiveMetricsSnapshot, CognitivePressure, CognitiveIssue, TopologyWhatIf,
} from './contracts/cognitive-intelligence';
import type {
  SystemDiagnostic, DiagnosticRunRecord,
} from './contracts/diagnostic-service';
import type {
  FallbackLink, RoutingPolicySnapshot,
} from './contracts/routing-policy';
import type {
  WebhookConfig, WebhookProvider, WebhookEventType,
} from './contracts/webhook';
import type {
  BudgetInfo,
} from './contracts/pricing';

export { FREE_TIER_LIMITS };

export type {
  SystemSettings, ThemeConfig, NotificationPreferences, DataManagementSettings, SettingsProfile, SettingsListener,
  FreeTierLimit, PoolStrategy, SearchMode,
  MCPServerConfig, MCPResource, MCPTool,
  RouterDecision, ModelPricing,
  PolicyType, PolicyAction, PolicySeverity, PolicyViolation, PolicyStats, AgentPolicy, AgentPolicyCheck, SecurityPattern, ISPolicy, PrivacyEnforcementResult, ContentSafetyResult,
  AgentStats, AgentGroup, ToolDefinition, ToolExecution, RoleUsageStats,
  AdminAuditEntry, SystemHealthReport, SystemSnapshot, SnapshotDiff, RuntimeState,
  DebateSession, DebateParticipant, DebateArgument, DebateConfig,
  CognitiveStats, AdvisorMetrics, OptimizationSuggestion, ProposedChange,
  PressureMapSnapshot, ProviderPressureEntry, SessionPressureEntry, PressureTrendPoint, PressureAlert,
  DiagnosticFinding, ProviderDiagnostic, WhatIfScenario, RuntimeScenario,
  TopologyType, TopologyNode, TopologyEdge, DebateTopology,
  DebatePhase, AgentPhase, DebateSessionSnapshot, DebatePressureLevel as PressureLevel,
  CognitiveMetricsSnapshot, CognitivePressure, CognitiveIssue, TopologyWhatIf,
  SystemDiagnostic, DiagnosticRunRecord,
  CognitiveTrace, CognitiveStep,
  FallbackLink, RoutingPolicySnapshot,
  WebhookConfig, WebhookProvider, WebhookEventType,
  BackendType, BackendStatus,
  BudgetInfo,
};

export const settingsService = resolve<SettingsService>('settingsService', {
  getSettings: () => ({ theme: 'dark', language: 'en', notifications: true, themeConfig: { mode: 'dark', primaryColor: '#3b82f6' } }),
  subscribe: () => () => {},
});

export const keyService = resolve<KeyService>('keyService', {
  getKeys: () => [],
  getAlerts: () => [],
  getPools: () => [],
  getFreeTierLimits: () => ({}),
  getPoolStrategy: () => 'round-robin' as const,
  getPoolKeyDistribution: () => [],
  verifyKey: async () => true,
  detectProvider: () => null,
  getRoutingPolicy: () => ({ globalSLAMode: 'BALANCED' as const, latencyThreshold: 1500 }),
});

export const memoryService = resolve<MemoryService>('memoryService');
export const mcpService = resolve<MCPService>('mcpService');
export const routerService = resolve<RouterService>('routerService');
export const orchestrator = resolve<OrchestrationService>('orchestrator');
export const agentService = resolve<AgentService>('agentService');
export const toolService = resolve<ToolService>('toolService');
export const roleService = resolve<RoleService>('roleService');
export const policyService = resolve<PolicyService>('policyService');
export const pricingService = resolve<PricingService>('pricingService');
export const adminService = resolve<AdminService>('adminService');
export const snapshotService = resolve<SnapshotService>('snapshotService');
export const cognitiveService = resolve<CognitiveService>('cognitiveService');
export const advisorService = resolve<AdvisorService>('advisorService');
export const pressureMapService = resolve<PressureMapService>('pressureMapService');
export const debateService = resolve<DebateService>('debateService');
export const debateEngine = resolve<DebateEngine>('debateEngine');
export const cognitiveIntelligenceService = resolve<CognitiveIntelligenceService>('cognitiveIntelligenceService');
export const diagnosticService = resolve<DiagnosticService>('diagnosticService');
export const whatIfService = resolve<WhatIfService>('whatIfService');
export const notificationWebhookService = resolve<NotificationWebhookService>('notificationWebhookService');
export const externalSecretsService = resolve<ExternalSecretsService>('externalSecretsService');
export const configService = resolve<ConfigService>('configService');
export const skillService = resolve<SkillService>('skillService');
export const compromiseWebhookService = resolve<CompromiseWebhookService>('compromiseWebhookService');
export const monitoringService = resolve<MonitoringService>('monitoringService');
export const chatService = resolve<ChatService>('chatService');
export const adapterRegistry = resolve<IAdapterRegistry>('providerAdapterRegistry');
export const autoDebateService = resolve<AutoDebateService>('autoDebateService');
export const workspaceService = resolve<WorkspaceService>('workspaceService');
export const featureFlagService = resolve<FeatureFlagService>('featureFlagService');
export const keyStateStore = resolve<KeyStateStore>('keyStateStore');
export const probeService = resolve<ProbeService>('probeService');
