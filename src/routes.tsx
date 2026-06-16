import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { t as translate } from './i18n/translations';
import { Home } from 'lucide-react';

// Lazy panels
const MissionControl = React.lazy(() => import('./components/LiveCognition/MissionControl'));
const LiveWorkspace = React.lazy(() => import('./components/LiveCognition/LiveWorkspace'));
const ChatPanel = React.lazy(() => import('./components/ChatPanel/ChatPanel'));
const CognitiveBuilder = React.lazy(() => import('./components/BuilderPanel/CognitiveBuilder'));
const DashboardPanel = React.lazy(() => import('./components/DashboardPanel/DashboardPanel'));
const TracesPanel = React.lazy(() => import('./components/TracesPanel/TracesPanel'));
const LogsPanel = React.lazy(() => import('./components/LogsPanel/LogsPanel'));
const MemoryPanel = React.lazy(() => import('./components/MemoryPanel/MemoryPanel'));
const HealthPanel = React.lazy(() => import('./components/HealthPanel/HealthPanel'));
const SystemHealthPanel = React.lazy(() => import('./components/SystemHealthPanel/SystemHealthPanel'));
const AquariumPanel = React.lazy(() => import('./components/AquariumPanel/AquariumPanel'));
const DebateArena = React.lazy(() => import('./components/DebateArena/DebateArena'));
const ArgumentGraphPanel = React.lazy(() => import('./components/ArgumentGraphPanel/ArgumentGraphPanel'));
const DebateReplayPanel = React.lazy(() => import('./components/DebateReplayPanel'));
const TournamentPanel = React.lazy(() => import('./components/TournamentPanel'));
const SREAgentPanel = React.lazy(() => import('./components/SREAgentPanel/SREAgentPanel'));
const WhatIfPanel = React.lazy(() => import('./components/WhatIfPanel/WhatIfPanel'));
const DocsHealthPanel = React.lazy(() => import('./components/DocsHealthPanel'));
const WebhooksPanel = React.lazy(() => import('./components/WebhooksPanel'));
const RotationsPanel = React.lazy(() => import('./components/RotationsPanel'));
const BudgetPanel = React.lazy(() => import('./components/BudgetPanel'));
const CostAnalyticsPanel = React.lazy(() => import('./components/CostAnalyticsPanel/CostAnalyticsPanel'));
const ProviderMarketplace = React.lazy(() => import('./components/ProviderMarketplace/ProviderMarketplace'));
const AgentMarketplacePanel = React.lazy(() => import('./components/AgentMarketplacePanel/AgentMarketplacePanel'));
const PressureMapPanel = React.lazy(() => import('./components/PressureMapPanel/PressureMapPanel'));
const DiagnosticPanel = React.lazy(() => import('./components/DiagnosticPanel/DiagnosticPanel'));
const ShadowPanel = React.lazy(() => import('./components/ShadowPanel/ShadowPanel'));
const CausalDebugger = React.lazy(() => import('./components/CausalDebugger/CausalDebugger'));
const CounterfactualPanel = React.lazy(() => import('./components/CounterfactualPanel/CounterfactualPanel'));
const SessionBindingsPanel = React.lazy(() => import('./components/SessionBindingsPanel/SessionBindingsPanel'));
const CachePanel = React.lazy(() => import('./components/CachePanel'));
const BookmarksPanel = React.lazy(() => import('./components/BookmarksPanel'));
const ChatExportPanel = React.lazy(() => import('./components/ChatExportPanel'));
const DebateAnalysisPanel = React.lazy(() => import('./components/DebateAnalysisPanel'));
const TopicSuggesterPanel = React.lazy(() => import('./components/TopicSuggesterPanel'));
const KeyNotesPanel = React.lazy(() => import('./components/KeyNotesPanel'));
const AgentJournalPanel = React.lazy(() => import('./components/AgentJournalPanel'));
const DecisionLogPanel = React.lazy(() => import('./components/DecisionLogPanel'));
const StateInspectorPanel = React.lazy(() => import('./components/StateInspectorPanel'));
const PerformanceProfilerPanel = React.lazy(() => import('./components/PerformanceProfilerPanel'));
const MessageSearchPanel = React.lazy(() => import('./components/MessageSearchPanel'));
const ProviderDashboard = React.lazy(() => import('./components/ProviderDashboard/ProviderDashboard'));
const DebateSystemResearch = React.lazy(() => import('./components/DebateResearch/DebateSystemResearch'));
const ProjectOsExplorer = React.lazy(() => import('./components/DebateResearch/ProjectOsExplorer'));
const HypothesisGenerator = React.lazy(() => import('./components/DebateResearch/HypothesisGenerator'));
const ArchitectureReview = React.lazy(() => import('./components/DebateResearch/ArchitectureReview'));
const PromptAudit = React.lazy(() => import('./components/DebateResearch/PromptAudit'));
const RoutingExperiments = React.lazy(() => import('./components/DebateResearch/RoutingExperiments'));
const GovStressTest = React.lazy(() => import('./components/DebateResearch/GovStressTest'));
const ObsGaps = React.lazy(() => import('./components/DebateResearch/ObsGaps'));
const RoutingIntelligence = React.lazy(() => import('./components/RoutingIntelligence/RoutingIntelligence'));
const RouterTraceView = React.lazy(() => import('./components/RouterTraceView/RouterTraceView'));
const DependencyMapPanel = React.lazy(() => import('./components/DependencyMapPanel/DependencyMapPanel'));
const ServiceRegistryPanel = React.lazy(() => import('./components/ServiceRegistryPanel/ServiceRegistryPanel'));
const PricingPanel = React.lazy(() => import('./components/AnalyticsPanel/PricingPanel'));
const PressureMap = React.lazy(() => import('./components/PressureMap/PressureMap'));
const GroupsPanel = React.lazy(() => import('./components/GroupsPanel/GroupsPanel'));
const WorkspacePanel = React.lazy(() => import('./components/WorkspacePanel/WorkspacePanel'));
const DebateWorkspacePanel = React.lazy(() => import('./components/DebatePanel/DebateWorkspacePanel'));

// Direct imports (non-lazy)
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
import ChatAdminPanel from './components/ChatAdminPanel/ChatAdminPanel';
import EventsTimeline from './components/EventsTimeline/EventsTimeline';
import AuditLogView from './components/AuditLogView/AuditLogView';
import ConfigHistoryView from './components/ConfigHistoryView/ConfigHistoryView';
import PoolStatusPanel from './components/PoolStatusPanel/PoolStatusPanel';
import PolicyPanel from './components/PolicyPanel/PolicyPanel';
import MCPPanel from './components/MCPPanel/MCPPanel';
import PatternsPanel from './components/PatternsPanel/PatternsPanel';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
      <div style={{ fontSize: '4rem', fontWeight: 800, color: '#64748b', opacity: 0.3 }}>404</div>
      <div style={{ fontSize: '1.2rem', color: '#94a3b8' }}>Page not found</div>
      <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1.2rem', borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}>
        <Home size={16} /> Go to Dashboard
      </button>
    </div>
  );
};

const PanelLoader: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <ErrorBoundary name={name} variant="panel">
    <Suspense fallback={<div style={{ padding: '2rem', color: '#64748b', textAlign: 'center' }}>{translate('common.loading')}</div>}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

export const AppRoutes: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <Routes location={location}>
      <Route path="/" element={<ErrorBoundary name="Dashboard" variant="panel"><DashboardPanel onNavigate={(p) => navigate(`/${p}`)} /></ErrorBoundary>} />
      <Route path="/dashboard" element={<ErrorBoundary name="Dashboard" variant="panel"><DashboardPanel onNavigate={(p) => navigate(`/${p}`)} /></ErrorBoundary>} />
      <Route path="/analytics" element={<ErrorBoundary name="Analytics" variant="panel"><AnalyticsPanel /></ErrorBoundary>} />
      <Route path="/keys" element={<ErrorBoundary name="Providers" variant="panel"><ProviderManager /></ErrorBoundary>} />
      <Route path="/pools" element={<ErrorBoundary name="Pools" variant="panel"><PoolStatusPanel /></ErrorBoundary>} />
      <Route path="/policies" element={<ErrorBoundary name="Policies" variant="panel"><PolicyPanel /></ErrorBoundary>} />
      <Route path="/mcp" element={<ErrorBoundary name="MCP" variant="panel"><MCPPanel /></ErrorBoundary>} />
      <Route path="/roles" element={<ErrorBoundary name="Roles" variant="panel"><RolesPanel /></ErrorBoundary>} />
      <Route path="/chat" element={<ErrorBoundary name="Chat" variant="panel"><ChatPanel /></ErrorBoundary>} />
      <Route path="/chat-admin" element={<ErrorBoundary name="ChatAdmin" variant="panel"><ChatAdminPanel /></ErrorBoundary>} />
      <Route path="/events" element={<Navigate to="/timeline" replace />} />
      <Route path="/logs" element={<PanelLoader name="Logs"><LogsPanel /></PanelLoader>} />
      <Route path="/timeline" element={<ErrorBoundary name="Timeline" variant="panel"><EventsTimeline /></ErrorBoundary>} />
      <Route path="/sre" element={<PanelLoader name="SREAgent"><SREAgentPanel /></PanelLoader>} />
      <Route path="/routing" element={<PanelLoader name="Routing"><RoutingIntelligence /></PanelLoader>} />
      <Route path="/audit" element={<ErrorBoundary name="AuditLog" variant="panel"><AuditLogView /></ErrorBoundary>} />
      <Route path="/history" element={<ErrorBoundary name="ConfigHistory" variant="panel"><ConfigHistoryView /></ErrorBoundary>} />
      <Route path="/tasks" element={<ErrorBoundary name="Tasks" variant="panel"><TasksPanel /></ErrorBoundary>} />
      <Route path="/memory" element={<PanelLoader name="Memory"><MemoryPanel /></PanelLoader>} />
      <Route path="/knowledge" element={<ErrorBoundary name="Knowledge" variant="panel"><KnowledgePanel /></ErrorBoundary>} />
      <Route path="/health" element={<PanelLoader name="Health"><HealthPanel /></PanelLoader>} />
      <Route path="/system-health" element={<PanelLoader name="SystemHealth"><SystemHealthPanel /></PanelLoader>} />
      <Route path="/provider-dashboard" element={<PanelLoader name="ProviderDashboard"><ProviderDashboard /></PanelLoader>} />
      <Route path="/docs-health" element={<PanelLoader name="DocsHealth"><DocsHealthPanel /></PanelLoader>} />
      <Route path="/pressure" element={<PanelLoader name="PressureMap"><PressureMap /></PanelLoader>} />
      <Route path="/what-if" element={<PanelLoader name="WhatIf"><WhatIfPanel /></PanelLoader>} />
      <Route path="/runtime-pressure" element={<PanelLoader name="RuntimePressure"><PressureMapPanel /></PanelLoader>} />
      <Route path="/dependency-map" element={<PanelLoader name="DependencyMap"><DependencyMapPanel /></PanelLoader>} />
      <Route path="/service-registry" element={<PanelLoader name="ServiceRegistry"><ServiceRegistryPanel /></PanelLoader>} />
      <Route path="/diagnostics" element={<PanelLoader name="Diagnostics"><DiagnosticPanel /></PanelLoader>} />
      <Route path="/state-inspector" element={<PanelLoader name="StateInspector"><StateInspectorPanel /></PanelLoader>} />
      <Route path="/performance-profiler" element={<PanelLoader name="PerformanceProfiler"><PerformanceProfilerPanel /></PanelLoader>} />
      <Route path="/message-search" element={<PanelLoader name="MessageSearch"><MessageSearchPanel /></PanelLoader>} />
      <Route path="/shadow" element={<PanelLoader name="Shadow"><ShadowPanel /></PanelLoader>} />
      <Route path="/causal-debugger" element={<PanelLoader name="CausalDebugger"><CausalDebugger /></PanelLoader>} />
      <Route path="/counterfactual" element={<PanelLoader name="Counterfactual"><CounterfactualPanel /></PanelLoader>} />
      <Route path="/session-bindings" element={<PanelLoader name="SessionBindings"><SessionBindingsPanel /></PanelLoader>} />
      <Route path="/settings" element={<ErrorBoundary name="Settings" variant="panel"><SettingsPanel /></ErrorBoundary>} />
      <Route path="/connectors" element={<ErrorBoundary name="Connectors" variant="panel"><ConnectorsPanel /></ErrorBoundary>} />
      <Route path="/skills" element={<ErrorBoundary name="Skills" variant="panel"><SkillsPanel /></ErrorBoundary>} />
      <Route path="/tools" element={<ErrorBoundary name="Tools" variant="panel"><ToolsPanel /></ErrorBoundary>} />
      <Route path="/cache" element={<PanelLoader name="Cache"><CachePanel /></PanelLoader>} />
      <Route path="/webhooks" element={<PanelLoader name="Webhooks"><WebhooksPanel /></PanelLoader>} />
      <Route path="/rotations" element={<PanelLoader name="Rotations"><RotationsPanel /></PanelLoader>} />
      <Route path="/groups" element={<PanelLoader name="Groups"><GroupsPanel /></PanelLoader>} />
      <Route path="/mission" element={<PanelLoader name="MissionControl"><MissionControl /></PanelLoader>} />
      <Route path="/live" element={<PanelLoader name="LiveWorkspace"><LiveWorkspace /></PanelLoader>} />
      <Route path="/files" element={<PanelLoader name="Workspace"><WorkspacePanel /></PanelLoader>} />
      <Route path="/aquarium" element={<PanelLoader name="Aquarium"><AquariumPanel /></PanelLoader>} />
      <Route path="/debate" element={<PanelLoader name="DebateArena"><DebateArena /></PanelLoader>} />
      <Route path="/debate-replay" element={<PanelLoader name="DebateReplay"><DebateReplayPanel /></PanelLoader>} />
      <Route path="/debate-tournament" element={<PanelLoader name="Tournament"><TournamentPanel /></PanelLoader>} />
      <Route path="/debate-runtime" element={<Navigate to="/debate" replace />} />
      <Route path="/argument-graph" element={<PanelLoader name="ArgumentGraph"><ArgumentGraphPanel /></PanelLoader>} />
      <Route path="/debate-workspace" element={<PanelLoader name="DebateWorkspace"><DebateWorkspacePanel /></PanelLoader>} />
      <Route path="/builder" element={<PanelLoader name="Builder"><CognitiveBuilder /></PanelLoader>} />
      <Route path="/debugger" element={<PanelLoader name="Traces"><TracesPanel /></PanelLoader>} />
      <Route path="/router-trace" element={<PanelLoader name="RouterTrace"><RouterTraceView /></PanelLoader>} />
      <Route path="/pricing" element={<PanelLoader name="Pricing"><PricingPanel /></PanelLoader>} />
      <Route path="/budget" element={<PanelLoader name="Budget"><BudgetPanel /></PanelLoader>} />
      <Route path="/bookmarks" element={<PanelLoader name="Bookmarks"><BookmarksPanel /></PanelLoader>} />
      <Route path="/chat-export" element={<PanelLoader name="ChatExport"><ChatExportPanel /></PanelLoader>} />
      <Route path="/debate-analysis" element={<PanelLoader name="DebateAnalysis"><DebateAnalysisPanel /></PanelLoader>} />
      <Route path="/topics" element={<PanelLoader name="Topics"><TopicSuggesterPanel /></PanelLoader>} />
      <Route path="/topic-suggester" element={<PanelLoader name="TopicSuggester"><TopicSuggesterPanel /></PanelLoader>} />
      <Route path="/key-notes" element={<PanelLoader name="KeyNotes"><KeyNotesPanel /></PanelLoader>} />
      <Route path="/agent-journal" element={<PanelLoader name="AgentJournal"><AgentJournalPanel /></PanelLoader>} />
      <Route path="/decision-log" element={<PanelLoader name="DecisionLog"><DecisionLogPanel /></PanelLoader>} />
      <Route path="/cost-analytics" element={<PanelLoader name="CostAnalytics"><CostAnalyticsPanel /></PanelLoader>} />
      <Route path="/provider-marketplace" element={<PanelLoader name="ProviderMarketplace"><ProviderMarketplace /></PanelLoader>} />
      <Route path="/agents" element={<PanelLoader name="Agents"><AgentsPanel /></PanelLoader>} />
      <Route path="/agent-marketplace" element={<PanelLoader name="AgentMarketplace"><AgentMarketplacePanel /></PanelLoader>} />
      <Route path="/patterns" element={<PanelLoader name="Patterns"><PatternsPanel /></PanelLoader>} />
      <Route path="/debate-system-research" element={<PanelLoader name="DebateSystemResearch"><DebateSystemResearch /></PanelLoader>} />
      <Route path="/project-os" element={<PanelLoader name="ProjectOsExplorer"><ProjectOsExplorer /></PanelLoader>} />
      <Route path="/hypothesis-gen" element={<PanelLoader name="HypothesisGenerator"><HypothesisGenerator /></PanelLoader>} />
      <Route path="/arch-review" element={<PanelLoader name="ArchitectureReview"><ArchitectureReview /></PanelLoader>} />
      <Route path="/prompt-audit" element={<PanelLoader name="PromptAudit"><PromptAudit /></PanelLoader>} />
      <Route path="/routing-experiments" element={<PanelLoader name="RoutingExperiments"><RoutingExperiments /></PanelLoader>} />
      <Route path="/gov-stress-test" element={<PanelLoader name="GovStressTest"><GovStressTest /></PanelLoader>} />
      <Route path="/obs-gaps" element={<PanelLoader name="ObsGaps"><ObsGaps /></PanelLoader>} />
      <Route path="/docs" element={<ErrorBoundary name="Docs" variant="panel"><DocumentationPanel /></ErrorBoundary>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
