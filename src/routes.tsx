import React, { Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { t as translate } from './i18n/translations';
import { Home, Search, MessageSquare } from 'lucide-react';
import { NAV_SECTIONS } from './route-registry';

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
const PressureMapPanelLazy = React.lazy(() => import('./components/PressureMapPanel/PressureMapPanel'));
const DiagnosticPanel = React.lazy(() => import('./components/DiagnosticPanel/DiagnosticPanel'));
const ShadowPanel = React.lazy(() => import('./components/ShadowPanel/ShadowPanel'));
const CausalDebugger = React.lazy(() => import('./components/CausalDebugger/CausalDebugger'));
const CounterfactualPanel = React.lazy(() => import('./components/CounterfactualPanel/CounterfactualPanel'));
const SessionBindingsPanel = React.lazy(() => import('./components/SessionBindingsPanel/SessionBindingsPanel'));
const CachePanel = React.lazy(() => import('./components/CachePanel'));
const BookmarksPanel = React.lazy(() => import('./components/BookmarksPanel'));
const DebateAnalysisPanel = React.lazy(() => import('./components/DebateAnalysisPanel'));
const TopicSuggesterPanel = React.lazy(() => import('./components/TopicSuggesterPanel'));
const DebatesManagerPanel = React.lazy(() => import('./components/DebatesManager/DebatesManagerPanel'));
const ChatSessionsManagerPanel = React.lazy(() => import('./components/ChatSessionsManager/ChatSessionsManagerPanel'));
const SessionHubPanel = React.lazy(() => import('./components/SessionHubPanel/SessionHubPanel'));
const KeyNotesPanel = React.lazy(() => import('./components/KeyNotesPanel'));
const AgentJournalPanel = React.lazy(() => import('./components/AgentJournalPanel'));
const DecisionLogPanel = React.lazy(() => import('./components/DecisionLogPanel'));
const StateInspectorPanel = React.lazy(() => import('./components/StateInspectorPanel'));
const PerformanceProfilerPanel = React.lazy(() => import('./components/PerformanceProfilerPanel'));
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
const DebateStrategyBuilderPanel = React.lazy(() => import('./components/DebatePanel/DebateStrategyBuilder'));
const DebateHistoryPage = React.lazy(() => import('./components/DebatePanel/DebateHistoryPage'));
const DebateLivePanel = React.lazy(() => import('./components/DebateLive/DebateLivePanel'));
const PolicyEditorPanelLazy = React.lazy(() => import('./components/PolicyEditorPanel'));

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

// Component map: nav id → React component (dashboard handled manually for onNavigate)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PANEL_COMPONENTS: Record<string, React.ComponentType<any>> = {
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
  'argument-graph': ArgumentGraphPanel,
  'strategy-builder': DebateStrategyBuilderPanel,
  'debate-analysis': DebateAnalysisPanel,
  'debate-history': DebateHistoryPage,
  'debates-manager': DebatesManagerPanel,
  topics: TopicSuggesterPanel,
  agents: AgentsPanel,
  roles: RolesPanel,
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
  'provider-marketplace': ProviderMarketplace,
  connectors: ConnectorsPanel,
  mcp: MCPPanel,
  'session-bindings': SessionBindingsPanel,
  logs: LogsPanel,
  debugger: TracesPanel,
  'router-trace': RouterTraceView,
  memory: MemoryPanel,
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
  'arch-review': ArchitectureReview,
  'prompt-audit': PromptAudit,
  'routing-experiments': RoutingExperiments,
  'gov-stress-test': GovStressTest,
  'obs-gaps': ObsGaps,
  'debate-system-research': DebateSystemResearch,
  skills: SkillsPanel,
  tools: ToolsPanel,
  cache: CachePanel,
  webhooks: WebhooksPanel,
  rotations: RotationsPanel,
  'service-registry': ServiceRegistryPanel,
  settings: SettingsPanel,
  policies: PolicyPanel,
  'policy-editor': PolicyEditorPanelLazy,
  audit: AuditLogView,
  history: ConfigHistoryView,
};

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchVal, setSearchVal] = useState('');
  const suggestions = React.useMemo(() => {
    const allItems = NAV_SECTIONS.flatMap(s => s.items);
    const pathPart = location.pathname.split('/').filter(Boolean).pop()?.toLowerCase() || '';
    if (pathPart) {
      return allItems.filter(item => {
        const label = translate(item.labelKey).toLowerCase();
        return label.includes(pathPart) || item.id.includes(pathPart);
      }).slice(0, 6);
    }
    return allItems.slice(0, 8);
  }, [location.pathname]);
  const filtered = React.useMemo(() => {
    if (!searchVal) return suggestions;
    const q = searchVal.toLowerCase();
    return NAV_SECTIONS.flatMap(s => s.items).filter(item => {
      return translate(item.labelKey).toLowerCase().includes(q) || item.id.includes(q);
    }).slice(0, 8);
  }, [searchVal, suggestions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1.5rem', padding: '2rem' }}>
      <div style={{ fontSize: '5rem', fontWeight: 900, color: '#64748b', opacity: 0.15, lineHeight: 1, letterSpacing: '-0.05em' }}>404</div>
      <div style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: 600 }}>Page not found</div>
      <div style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 400, textAlign: 'center' }}>
        The page <code style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem' }}>{location.pathname}</code> doesn't exist.
      </div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
        <input
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          placeholder="Search pages..."
          autoFocus
          style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' }}
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', maxWidth: 500 }}>
        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(`/${item.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s' }}
          >
            {item.icon}
            <span>{translate(item.labelKey)}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1.2rem', borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}>
          <Home size={16} /> Dashboard
        </button>
        <button onClick={() => navigate('/chat')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1.2rem', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', cursor: 'pointer', fontWeight: 600 }}>
          <MessageSquare size={16} /> Chat
        </button>
      </div>
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
      {/* ── Landing & dashboard (manual — special onNavigate prop) ── */}
      <Route path="/" element={<PanelLoader name="Dashboard"><DashboardPanel onNavigate={(p) => navigate(`/${p}`)} /></PanelLoader>} />
      <Route path="/dashboard" element={<PanelLoader name="Dashboard"><DashboardPanel onNavigate={(p) => navigate(`/${p}`)} /></PanelLoader>} />

      {/* ── Primary routes from registry ── */}
      {NAV_SECTIONS.flatMap(s => s.items).filter(i => i.id !== 'dashboard').map(item => {
        const Component = PANEL_COMPONENTS[item.id];
        if (!Component) return null;
        const routePath = item.path ?? `/${item.id}`;
        return (
          <Route key={item.id} path={routePath} element={
            item.lazy
              ? <PanelLoader name={item.id}><Component /></PanelLoader>
              : <ErrorBoundary name={item.id} variant="panel"><Component /></ErrorBoundary>
          } />
        );
      })}

      {/* ── Redirects ── */}
      <Route path="/events" element={<Navigate to="/timeline" replace />} />
      <Route path="/message-search" element={<Navigate to="/chat" replace />} />
      <Route path="/chat-export" element={<Navigate to="/chat" replace />} />
      <Route path="/debate-runtime" element={<Navigate to="/debate?mode=runtime" replace />} />
      <Route path="/topic-suggester" element={<Navigate to="/topics" replace />} />

      {/* ── Nested URL aliases (debates/*) ── */}
      <Route path="/debates/arena" element={<PanelLoader name="DebateArena"><DebateArena /></PanelLoader>} />
      <Route path="/debates/live" element={<PanelLoader name="DebateLive"><DebateLivePanel /></PanelLoader>} />
      <Route path="/debates/replay" element={<PanelLoader name="DebateReplay"><DebateReplayPanel /></PanelLoader>} />
      <Route path="/debates/tournament" element={<PanelLoader name="Tournament"><TournamentPanel /></PanelLoader>} />
      <Route path="/debates/history" element={<PanelLoader name="DebateHistory"><DebateHistoryPage /></PanelLoader>} />
      <Route path="/debates/analysis" element={<PanelLoader name="DebateAnalysis"><DebateAnalysisPanel /></PanelLoader>} />
      <Route path="/debates/graph" element={<PanelLoader name="ArgumentGraph"><ArgumentGraphPanel /></PanelLoader>} />
      <Route path="/debates/topics" element={<PanelLoader name="Topics"><TopicSuggesterPanel /></PanelLoader>} />

      {/* ── Nested URL aliases (diagnostics/*) ── */}
      <Route path="/diagnostics/logs" element={<PanelLoader name="Logs"><LogsPanel /></PanelLoader>} />
      <Route path="/diagnostics/health" element={<PanelLoader name="Health"><HealthPanel /></PanelLoader>} />
      <Route path="/diagnostics/system" element={<PanelLoader name="SystemHealth"><SystemHealthPanel /></PanelLoader>} />
      <Route path="/diagnostics/traces" element={<PanelLoader name="Traces"><TracesPanel /></PanelLoader>} />
      <Route path="/diagnostics/memory" element={<PanelLoader name="Memory"><MemoryPanel /></PanelLoader>} />
      <Route path="/diagnostics/aquarium" element={<PanelLoader name="Aquarium"><AquariumPanel /></PanelLoader>} />

      {/* ── Nested URL aliases (services/*) ── */}
      <Route path="/services/keys" element={<ErrorBoundary name="Providers" variant="panel"><ProviderManager /></ErrorBoundary>} />
      <Route path="/services/groups" element={<PanelLoader name="Groups"><GroupsPanel /></PanelLoader>} />
      <Route path="/services/connectors" element={<ErrorBoundary name="Connectors" variant="panel"><ConnectorsPanel /></ErrorBoundary>} />
      <Route path="/services/mcp" element={<ErrorBoundary name="MCP" variant="panel"><MCPPanel /></ErrorBoundary>} />

      {/* ── Legacy admin route (no nav entry) ── */}
      <Route path="/chat-admin" element={<ErrorBoundary name="ChatAdmin" variant="panel"><ChatAdminPanel /></ErrorBoundary>} />

      {/* ── Legacy route for timeline/events ── */}
      <Route path="/timeline" element={<PanelLoader name="Timeline"><EventsTimeline /></PanelLoader>} />

      {/* ── 404 catch-all ── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
