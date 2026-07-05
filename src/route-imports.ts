import React, { Suspense } from 'react';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { PanelSkeleton } from './components/Common/Skeleton';

// ── Lazy panels ───────────────────────────────────────────────────────────────
const MissionControl = React.lazy(() => import('./components/LiveCognition/MissionControl'));
const LiveWorkspace = React.lazy(() => import('./components/LiveCognition/LiveWorkspace'));
const ChatPanel = React.lazy(() => import('./components/ChatPanel/ChatPanel'));
const CognitiveBuilder = React.lazy(() => import('./components/BuilderPanel/CognitiveBuilder'));
const TracesPanel = React.lazy(() => import('./components/TracesPanel/TracesPanel'));
const LogsPanel = React.lazy(() => import('./components/LogsPanel/LogsPanel'));
const MemoryPanel = React.lazy(() => import('./components/MemoryPanel/MemoryPanel'));
const HealthPanel = React.lazy(() => import('./components/HealthPanel/HealthPanel'));
const SystemHealthPanel = React.lazy(
    () => import('./components/SystemHealthPanel/SystemHealthPanel'),
);
const AquariumPanel = React.lazy(() => import('./components/AquariumPanel/AquariumPanel'));
const DebateArena = React.lazy(() => import('./components/DebateArena/DebateArena'));
const ArgumentGraphPanel = React.lazy(
    () => import('./components/ArgumentGraphPanel/ArgumentGraphPanel'),
);
const DebateReplayPanel = React.lazy(() => import('./components/DebateReplayPanel'));
const TournamentPanel = React.lazy(() => import('./components/TournamentPanel'));
const SREAgentPanel = React.lazy(() => import('./components/SREAgentPanel/SREAgentPanel'));
const WhatIfPanel = React.lazy(() => import('./components/WhatIfPanel/WhatIfPanel'));
const DocsHealthPanel = React.lazy(() => import('./components/DocsHealthPanel'));
const WebhooksPanel = React.lazy(() => import('./components/WebhooksPanel'));
const RotationsPanel = React.lazy(() => import('./components/RotationsPanel'));
const BudgetPanel = React.lazy(() => import('./components/BudgetPanel'));
const CostAnalyticsPanel = React.lazy(
    () => import('./components/CostAnalyticsPanel/CostAnalyticsPanel'),
);
const ProviderMarketplace = React.lazy(
    () => import('./components/ProviderMarketplace/ProviderMarketplace'),
);
const AgentMarketplacePanel = React.lazy(
    () => import('./components/AgentMarketplacePanel/AgentMarketplacePanel'),
);
const PressureMapPanelLazy = React.lazy(
    () => import('./components/PressureMapPanel/PressureMapPanel'),
);
const DiagnosticPanel = React.lazy(() => import('./components/DiagnosticPanel/DiagnosticPanel'));
const ShadowPanel = React.lazy(() => import('./components/ShadowPanel/ShadowPanel'));
const CausalDebugger = React.lazy(() => import('./components/CausalDebugger/CausalDebugger'));
const CounterfactualPanel = React.lazy(
    () => import('./components/CounterfactualPanel/CounterfactualPanel'),
);
const SessionBindingsPanel = React.lazy(
    () => import('./components/SessionBindingsPanel/SessionBindingsPanel'),
);
const CachePanel = React.lazy(() => import('./components/CachePanel'));
const BookmarksPanel = React.lazy(() => import('./components/BookmarksPanel/BookmarksPanel'));
const DebateAnalysisPanel = React.lazy(() => import('./components/DebateAnalysisPanel'));
const TopicSuggesterPanel = React.lazy(() => import('./components/TopicSuggesterPanel'));
const DebatesManagerPanel = React.lazy(
    () => import('./components/DebatesManager/DebatesManagerPanel'),
);
const ChatSessionsManagerPanel = React.lazy(
    () => import('./components/ChatSessionsManager/ChatSessionsManagerPanel'),
);
const SessionHubPanel = React.lazy(() => import('./components/SessionHubPanel/SessionHubPanel'));
const KeyNotesPanel = React.lazy(() => import('./components/KeyNotesPanel'));
const AgentJournalPanel = React.lazy(() => import('./components/AgentJournalPanel'));
const DecisionLogPanel = React.lazy(() => import('./components/DecisionLogPanel'));
const StateInspectorPanel = React.lazy(
    () => import('./components/StateInspectorPanel/StateInspectorPanel'),
);
const PerformanceProfilerPanel = React.lazy(() => import('./components/PerformanceProfilerPanel'));
const ProviderDashboard = React.lazy(
    () => import('./components/ProviderDashboard/ProviderDashboard'),
);
const GroqSpeedDashboard = React.lazy(
    () => import('./components/ProviderManager/GroqSpeedDashboard'),
);
const DebateSystemResearch = React.lazy(
    () => import('./components/DebateResearch/DebateSystemResearch'),
);
const ProjectOsExplorer = React.lazy(() => import('./components/DebateResearch/ProjectOsExplorer'));
const HypothesisGenerator = React.lazy(
    () => import('./components/DebateResearch/HypothesisGenerator'),
);
const ArchitectureReview = React.lazy(
    () => import('./components/DebateResearch/ArchitectureReview'),
);
const PromptAudit = React.lazy(() => import('./components/DebateResearch/PromptAudit'));
const RoutingExperiments = React.lazy(
    () => import('./components/DebateResearch/RoutingExperiments'),
);
const GovStressTest = React.lazy(() => import('./components/DebateResearch/GovStressTest'));
const ObsGaps = React.lazy(() => import('./components/DebateResearch/ObsGaps'));
const RoutingIntelligence = React.lazy(
    () => import('./components/RoutingIntelligence/RoutingIntelligence'),
);
const RouterTraceView = React.lazy(() => import('./components/RouterTraceView/RouterTraceView'));
const DependencyMapPanel = React.lazy(
    () => import('./components/DependencyMapPanel/DependencyMapPanel'),
);
const ServiceRegistryPanel = React.lazy(
    () => import('./components/ServiceRegistryPanel/ServiceRegistryPanel'),
);
const GuardiansPanel = React.lazy(() => import('./components/GuardiansPanel/GuardiansPanel'));
const ModelComparePanel = React.lazy(
    () => import('./components/ModelComparePanel/ModelComparePanel'),
);
const PromptLibraryPanel = React.lazy(
    () => import('./components/PromptLibrary/PromptLibraryPanel'),
);
const BatchProcessingPanel = React.lazy(
    () => import('./components/BatchProcessor/BatchProcessingPanel'),
);
const WorkflowPanel = React.lazy(() => import('./components/Workflows/WorkflowPanel'));
const PromptSecurityPanel = React.lazy(
    () => import('./components/SecurityScan/PromptSecurityPanel'),
);
const MemoryPalacePanel = React.lazy(() => import('./components/MemoryPanel/MemoryPalacePanel'));
const EvalDatasetPanel = React.lazy(() => import('./components/EvalDatasets/EvalDatasetPanel'));
const CustomMetricsPanel = React.lazy(
    () => import('./components/CustomMetrics/CustomMetricsPanel'),
);
const CostOptimizationPanel = React.lazy(
    () => import('./components/CostOptimization/CostOptimizationPanel'),
);
const ABTestPanel = React.lazy(() => import('./components/ABTest/ABTestPanel'));
const PricingPanel = React.lazy(() => import('./components/AnalyticsPanel/PricingPanel'));
const PressureMap = React.lazy(() => import('./components/PressureMap/PressureMap'));
const GroupsPanel = React.lazy(() => import('./components/GroupsPanel/GroupsPanel'));
const WorkspacePanel = React.lazy(() => import('./components/WorkspacePanel/WorkspacePanel'));
const DebateWorkspacePanel = React.lazy(
    () => import('./components/DebatePanel/DebateWorkspacePanel'),
);
const DebateStrategyBuilderPanel = React.lazy(
    () => import('./components/DebatePanel/DebateStrategyBuilder'),
);
const DebateHistoryPage = React.lazy(() => import('./components/DebatePanel/DebateHistoryPage'));
const DebateLivePanel = React.lazy(() => import('./components/DebateLive/DebateLivePanel'));
const PolicyEditorPanelLazy = React.lazy(() => import('./components/PolicyEditorPanel'));
const RolesConsortiaPanel = React.lazy(() => import('./components/RolesPanel/RolesConsortiaPanel'));
const ResearchEnginePanelLazy = React.lazy(
    () => import('./components/ResearchPanel/ResearchEnginePanel'),
);
const ResearchEngineAdvancedPanelLazy = React.lazy(
    () => import('./components/ResearchPanel/ResearchEngineAdvancedPanel'),
);
const EcosystemDashboardLazy = React.lazy(
    () => import('./components/AquariumPanel/EcosystemDashboard'),
);
const GoogleStudioPanelLazy = React.lazy(
    () => import('./components/GoogleStudio/GoogleStudioPanel'),
);
const GeminiLivePanelLazy = React.lazy(() => import('./components/GeminiLive/GeminiLivePanel'));
const GoogleCachePanelLazy = React.lazy(() => import('./components/GoogleCache/GoogleCachePanel'));
const MetaLearningPanelLazy = React.lazy(
    () => import('./components/MetaLearning/MetaLearningPanel'),
);
const GeminiResearchLazy = React.lazy(
    () => import('./components/GeminiResearch/GeminiResearchPanel'),
);
const QuantumInspirationPanelLazy = React.lazy(
    () => import('./components/QuantumInspiration/QuantumInspirationPanel'),
);
const AudiencePanelLazy = React.lazy(() => import('./components/AudiencePanel/AudiencePanel'));
const EditorsPanelLazy = React.lazy(() => import('./components/Editors/EditorsPanel'));
const TutorialPanelLazy = React.lazy(() => import('./components/TutorialPanel/TutorialPanel'));
const CommunityHubPanelLazy = React.lazy(
    () => import('./components/CommunityHub/CommunityHubPanel'),
);
const ExportImportPanelLazy = React.lazy(
    () => import('./components/ExportImport/ExportImportPanel'),
);
const CollaborationPanelLazy = React.lazy(
    () => import('./components/TeamCollaboration/CollaborationPanel'),
);
const FineTuningPanelLazy = React.lazy(() => import('./components/FineTuning/FineTuningPanel'));
const AgentComparisonPanelLazy = React.lazy(
    () => import('./components/AgentComparison/AgentComparisonPanel'),
);
const DebateTemplatesPanelLazy = React.lazy(
    () => import('./components/DebateTemplates/DebateTemplatesPanel'),
);
const SmartRoutingPanelLazy = React.lazy(
    () => import('./components/SmartRouting/SmartRoutingPanel'),
);
const NvidiaEnterprisePanelLazy = React.lazy(
    () => import('./components/NvidiaEnterprise/NvidiaEnterprisePanel'),
);
const HealthSlaPanelLazy = React.lazy(() => import('./components/HealthSla/HealthSlaPanel'));
const SocialLeaderboardPanelLazy = React.lazy(
    () => import('./components/SocialLeaderboard/SocialLeaderboardPanel'),
);
const ResearchReportPanelLazy = React.lazy(
    () => import('./components/ResearchReport/ResearchReportPanel'),
);
const VoiceInputPanelLazy = React.lazy(() => import('./components/VoiceInput/VoiceInputPanel'));
const AgentProtocolPanelLazy = React.lazy(
    () => import('./components/AgentProtocol/AgentProtocolPanel'),
);
const DistillationPanelLazy = React.lazy(
    () => import('./components/ModelDistillation/DistillationPanel'),
);
const DeployPanelLazy = React.lazy(() => import('./components/DeployToProduction/DeployPanel'));
const BudgetAlertsPanelLazy = React.lazy(
    () => import('./components/BudgetAlerts/BudgetAlertsPanel'),
);
const TopologyGalleryPanelLazy = React.lazy(
    () => import('./components/TopologyGallery/TopologyGalleryPanel'),
);
const KeyUsageAnalyticsPanelLazy = React.lazy(
    () => import('./components/KeyUsageAnalytics/KeyUsageAnalyticsPanel'),
);
const PromptVersionPanelLazy = React.lazy(
    () => import('./components/PromptVersionHistory/PromptVersionPanel'),
);

// ── Section 11 P2+P3 Lazy Imports ─────────────────────────────────────────────
const FederatedMemoryPanelLazy = React.lazy(
    () => import('./components/FederatedMemory/FederatedMemoryPanel'),
);
const PluginSdkPanelLazy = React.lazy(() => import('./components/PluginSdk/PluginSdkPanel'));
const PersonaMarketplacePanelLazy = React.lazy(
    () => import('./components/PersonaMarketplace/PersonaMarketplacePanel'),
);
const PersonaPickerPanelLazy = React.lazy(
    () => import('./components/PersonaPicker/PersonaPickerPanel'),
);
const TemplateSharingPanelLazy = React.lazy(
    () => import('./components/TemplateSharing/TemplateSharingPanel'),
);
const MemoryTransferPanelLazy = React.lazy(
    () => import('./components/MemoryTransfer/MemoryTransferPanel'),
);
const AquariumTradingPanelLazy = React.lazy(
    () => import('./components/AquariumTrading/AquariumTradingPanel'),
);
const TimeMachinePanelLazy = React.lazy(() => import('./components/TimeMachine/TimeMachinePanel'));
const ContributionGraphPanelLazy = React.lazy(
    () => import('./components/ContributionGraph/ContributionGraphPanel'),
);

// ── Direct imports (non-lazy) ─────────────────────────────────────────────────
import ProviderManager from './components/ProviderManager/ProviderManager';
import AgentsPanel from './components/AgentsPanel/AgentsPanel';
import ToolsPanel from './components/ToolsPanel/ToolsPanel';
import ConnectorsPanel from './components/ConnectorsPanel/ConnectorsPanel';
import KnowledgePanel from './components/KnowledgePanel/KnowledgePanel';
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import DocumentationPanel from './components/DocumentationPanel/DocumentationPanel';
import AnalyticsPanel from './components/AnalyticsPanel/AnalyticsPanel';
import SkillsPanel from './components/SkillsPanel/SkillsPanel';
import TasksPanel from './components/TasksPanel/TasksPanel';
import RolesPanel from './components/RolesPanel/RolesPanel';
import AuditLogView from './components/AuditLogView/AuditLogView';
import ConfigHistoryView from './components/ConfigHistoryView/ConfigHistoryView';
import PoolStatusPanel from './components/PoolStatusPanel/PoolStatusPanel';
import PolicyPanel from './components/PolicyPanel/PolicyPanel';
import MCPPanel from './components/MCPPanel/MCPPanel';
import PatternsPanel from './components/PatternsPanel/PatternsPanel';

// Component map: nav id → React component (dashboard handled manually for onNavigate)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PANEL_COMPONENTS: Record<string, React.ComponentType<any>> = {
    analytics: AnalyticsPanel,
    pricing: PricingPanel,
    budget: BudgetPanel,
    'cost-analytics': CostAnalyticsPanel,
    routing: RoutingIntelligence,
    chat: ChatPanel,
    'chat-sessions': ChatSessionsManagerPanel,
    'session-hub': SessionHubPanel,
    bookmarks: BookmarksPanel,
    tasks: TasksPanel,
    files: WorkspacePanel,
    debate: DebateArena,
    builder: CognitiveBuilder,
    'debate-live': DebateLivePanel,
    'debate-workspace': DebateWorkspacePanel,
    'debate-replay': DebateReplayPanel,
    'debate-tournament': TournamentPanel,
    audience: AudiencePanelLazy,
    editors: EditorsPanelLazy,
    'argument-graph': ArgumentGraphPanel,
    'strategy-builder': DebateStrategyBuilderPanel,
    'debate-analysis': DebateAnalysisPanel,
    'debate-history': DebateHistoryPage,
    'debates-manager': DebatesManagerPanel,
    topics: TopicSuggesterPanel,
    agents: AgentsPanel,
    roles: RolesPanel,
    'roles-consortia': RolesConsortiaPanel,
    sre: SREAgentPanel,
    'agent-journal': AgentJournalPanel,
    mission: MissionControl,
    live: LiveWorkspace,
    'agent-marketplace': AgentMarketplacePanel,
    keys: ProviderManager,
    pools: PoolStatusPanel,
    groups: GroupsPanel,
    'key-notes': KeyNotesPanel,
    'provider-dashboard': ProviderDashboard,
    'groq-speed': GroqSpeedDashboard,
    'smart-routing': SmartRoutingPanelLazy,
    'nvidia-enterprise': NvidiaEnterprisePanelLazy,
    'provider-marketplace': ProviderMarketplace,
    connectors: ConnectorsPanel,
    mcp: MCPPanel,
    'session-bindings': SessionBindingsPanel,
    guardians: GuardiansPanel,
    playground: ModelComparePanel,
    prompts: PromptLibraryPanel,
    batch: BatchProcessingPanel,
    workflows: WorkflowPanel,
    security: PromptSecurityPanel,
    'cost-optimization': CostOptimizationPanel,
    'ab-testing': ABTestPanel,
    'custom-metrics': CustomMetricsPanel,
    logs: LogsPanel,
    debugger: TracesPanel,
    'router-trace': RouterTraceView,
    memory: MemoryPanel,
    'memory-palace': MemoryPalacePanel,
    health: HealthPanel,
    'system-health': SystemHealthPanel,
    'docs-health': DocsHealthPanel,
    pressure: PressureMap,
    'runtime-pressure': PressureMapPanelLazy,
    'what-if': WhatIfPanel,
    'dependency-map': DependencyMapPanel,
    diagnostics: DiagnosticPanel,
    'state-inspector': StateInspectorPanel,
    'performance-profiler': PerformanceProfilerPanel,
    shadow: ShadowPanel,
    'causal-debugger': CausalDebugger,
    counterfactual: CounterfactualPanel,
    aquarium: AquariumPanel,
    patterns: PatternsPanel,
    knowledge: KnowledgePanel,
    docs: DocumentationPanel,
    'decision-log': DecisionLogPanel,
    'project-os': ProjectOsExplorer,
    'hypothesis-gen': HypothesisGenerator,
    'research-advanced': ResearchEngineAdvancedPanelLazy,
    'research-gemini': GeminiResearchLazy,
    'eval-datasets': EvalDatasetPanel,
    'arch-review': ArchitectureReview,
    'prompt-audit': PromptAudit,
    'routing-experiments': RoutingExperiments,
    'gov-stress-test': GovStressTest,
    'obs-gaps': ObsGaps,
    'debate-system-research': DebateSystemResearch,
    'research-engine': ResearchEnginePanelLazy,
    ecosystem: EcosystemDashboardLazy,
    skills: SkillsPanel,
    tools: ToolsPanel,
    cache: CachePanel,
    webhooks: WebhooksPanel,
    rotations: RotationsPanel,
    'service-registry': ServiceRegistryPanel,
    'google-studio': GoogleStudioPanelLazy,
    'google-cache': GoogleCachePanelLazy,
    'gemini-live': GeminiLivePanelLazy,
    'meta-learning': MetaLearningPanelLazy,
    'quantum-inspiration': QuantumInspirationPanelLazy,
    tutorials: TutorialPanelLazy,
    'team-collaboration': CollaborationPanelLazy,
    'fine-tuning': FineTuningPanelLazy,
    'model-distillation': DistillationPanelLazy,
    deploy: DeployPanelLazy,
    'budget-alerts': BudgetAlertsPanelLazy,
    'topology-templates': TopologyGalleryPanelLazy,
    'key-usage-analytics': KeyUsageAnalyticsPanelLazy,
    'prompt-versions': PromptVersionPanelLazy,
    'community-hub': CommunityHubPanelLazy,
    'export-import': ExportImportPanelLazy,
    'agent-comparison': AgentComparisonPanelLazy,
    'debate-templates': DebateTemplatesPanelLazy,
    'health-sla': HealthSlaPanelLazy,
    leaderboard: SocialLeaderboardPanelLazy,
    'research-reports': ResearchReportPanelLazy,
    'voice-input': VoiceInputPanelLazy,
    'agent-protocol': AgentProtocolPanelLazy,
    settings: SettingsPanel,
    policies: PolicyPanel,
    'policy-editor': PolicyEditorPanelLazy,
    audit: AuditLogView,
    history: ConfigHistoryView,
    'federated-memory': FederatedMemoryPanelLazy,
    'plugin-sdk': PluginSdkPanelLazy,
    'persona-marketplace': PersonaMarketplacePanelLazy,
    'persona-picker': PersonaPickerPanelLazy,
    'template-sharing': TemplateSharingPanelLazy,
    'memory-export-import': MemoryTransferPanelLazy,
    'aquarium-trading': AquariumTradingPanelLazy,
    'time-machine': TimeMachinePanelLazy,
    'contribution-graph': ContributionGraphPanelLazy,
};

export const PanelLoader: React.FC<{ name: string; children: React.ReactNode }> = (props) => {
    const inner = React.createElement(
        Suspense,
        { fallback: React.createElement(PanelSkeleton, null) },
        props.children,
    );
    return React.createElement(ErrorBoundary, {
        name: props.name,
        variant: 'panel' as const,
        children: inner,
    });
};
