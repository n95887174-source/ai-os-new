import React, { useState, Suspense, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Search,
  History,
  Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MissionControl = React.lazy(() => import('./components/LiveCognition/MissionControl'));
const LiveWorkspace = React.lazy(() => import('./components/LiveCognition/LiveWorkspace'));
import ChatPanel from './components/ChatPanel/ChatPanel';
const CognitiveBuilder = React.lazy(() => import('./components/BuilderPanel/CognitiveBuilder'));
import DashboardPanel from './components/DashboardPanel/DashboardPanel';
const TracesPanel = React.lazy(() => import('./components/TracesPanel/TracesPanel'));
const LogsPanel = React.lazy(() => import('./components/LogsPanel/LogsPanel'));
import ProviderManager from './components/ProviderManager/ProviderManager';
import AgentsPanel from './components/AgentsPanel/AgentsPanel';
import ToolsPanel from './components/ToolsPanel/ToolsPanel';
import ConnectorsPanel from './components/ConnectorsPanel/ConnectorsPanel';
const MemoryPanel = React.lazy(() => import('./components/MemoryPanel/MemoryPanel'));
import KnowledgePanel from './components/KnowledgePanel/KnowledgePanel';
const HealthPanel = React.lazy(() => import('./components/HealthPanel/HealthPanel'));
const SystemHealthPanel = React.lazy(() => import('./components/SystemHealthPanel/SystemHealthPanel'));
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import DocumentationPanel from './components/DocumentationPanel/DocumentationPanel';
import AnalyticsPanel from './components/AnalyticsPanel/AnalyticsPanel';
const AquariumPanel = React.lazy(() => import('./components/AquariumPanel/AquariumPanel'));
const DebateArena = React.lazy(() => import('./components/DebateArena/DebateArena'));
const ArgumentGraphPanel = React.lazy(() => import('./components/ArgumentGraphPanel/ArgumentGraphPanel'));
const DebateReplayPanel = React.lazy(() => import('./components/DebateReplayPanel'));
const TournamentPanel = React.lazy(() => import('./components/TournamentPanel'));
import SkillsPanel from './components/SkillsPanel/SkillsPanel';
import TasksPanel from './components/TasksPanel/TasksPanel';
import RolesPanel from './components/RolesPanel/RolesPanel';
import ChatAdminPanel from './components/ChatAdminPanel/ChatAdminPanel';
import EventsTimeline from './components/EventsTimeline/EventsTimeline';
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
import AuditLogView from './components/AuditLogView/AuditLogView';
import ConfigHistoryView from './components/ConfigHistoryView/ConfigHistoryView';
import PoolStatusPanel from './components/PoolStatusPanel/PoolStatusPanel';
const RoutingIntelligence = React.lazy(() => import('./components/RoutingIntelligence/RoutingIntelligence'));
const RouterTraceView = React.lazy(() => import('./components/RouterTraceView/RouterTraceView'));
import AlertLayer from './components/AlertLayer/AlertLayer';
import PolicyPanel from './components/PolicyPanel/PolicyPanel';
import MCPPanel from './components/MCPPanel/MCPPanel';
import PatternsPanel from './components/PatternsPanel/PatternsPanel';
const DependencyMapPanel = React.lazy(() => import('./components/DependencyMapPanel/DependencyMapPanel'));
const ServiceRegistryPanel = React.lazy(() => import('./components/ServiceRegistryPanel/ServiceRegistryPanel'));
const PricingPanel = React.lazy(() => import('./components/AnalyticsPanel/PricingPanel'));
const PressureMap = React.lazy(() => import('./components/PressureMap/PressureMap'));
const GroupsPanel = React.lazy(() => import('./components/GroupsPanel/GroupsPanel'));

const WorkspacePanel = React.lazy(() => import('./components/WorkspacePanel/WorkspacePanel'));
const DebateWorkspacePanel = React.lazy(() => import('./components/DebatePanel/DebateWorkspacePanel'));
import { eventBus, EVENTS, type EventMap } from './kernel/events/event-bus';
import { settingsService } from './kernel/instances';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { useTranslation } from './i18n/useTranslation';
import { setLanguage, t as translate } from './i18n/translations';
import type { TranslationKey } from './i18n/translations';
import { NAV_SECTIONS } from './route-registry';
import { featureFlagService } from './kernel/instances';

const PanelLoader: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <ErrorBoundary name={name} variant="panel">
    <Suspense fallback={<div style={{ padding: '2rem', color: '#64748b', textAlign: 'center' }}>{translate('common.loading')}</div>}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const navItems = NAV_SECTIONS.flatMap(section => [
  { id: section.id, type: 'header' as const, labelKey: section.labelKey },
  ...section.items.map(item => ({ ...item, type: 'item' as const })),
]);

const navLabelKey: Record<string, TranslationKey> = {};
for (const section of NAV_SECTIONS) {
  navLabelKey[section.id] = section.labelKey;
  for (const item of section.items) {
    navLabelKey[item.id] = item.labelKey;
  }
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const activeTab = location.pathname.split('/')[1] || 'dashboard';
  const [isSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [featureFlags, setFeatureFlags] = useState(() => featureFlagService.getAll());
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => featureFlagService.onChange(() => setFeatureFlags(featureFlagService.getAll())), []);

  const visibleNavItems = useMemo(() => {
    const q = sidebarSearchQuery.toLowerCase();
    const visibleItemIds = new Set(
      navItems
        .filter((item): item is typeof item & { type: 'item' } => item.type === 'item')
        .filter((item) => {
          if (item.featureFlag && !featureFlags[item.featureFlag]) return false;
          if (q && !t(navLabelKey[item.id] ?? 'nav.overview').toLowerCase().includes(q)) return false;
          return true;
        })
        .map((item) => item.id),
    );
    return navItems.filter((item) => {
      if (item.type === 'item') return visibleItemIds.has(item.id);
      const section = NAV_SECTIONS.find((s) => s.id === item.id);
      return section?.items.some((meta) => visibleItemIds.has(meta.id)) ?? false;
    });
  }, [featureFlags, sidebarSearchQuery, t]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      eventBus.emit(EVENTS.NAVIGATE as keyof EventMap, `search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  React.useEffect(() => {
    const unsub = eventBus.on(EVENTS.NAVIGATE, (target: string) => {
      navigate(`/${target}`);
    });
    return () => { unsub(); };
  }, [navigate]);

  React.useEffect(() => {
    const s = settingsService.getSettings();
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.dataset.highContrast = s.themeConfig?.highContrast ? 'true' : 'false';
    document.documentElement.lang = s.language;
    setLanguage(s.language === 'ru' ? 'ru' : 'en');

    const unsub = settingsService.subscribe((settings) => {
      document.documentElement.dataset.theme = settings.theme;
      document.documentElement.dataset.highContrast = settings.themeConfig?.highContrast ? 'true' : 'false';
      document.documentElement.lang = settings.language;
      setLanguage(settings.language === 'ru' ? 'ru' : 'en');
    });
    return () => { unsub(); };
  }, []);

  const renderContent = () => (
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
      <Route path="*" element={<ErrorBoundary name="Dashboard" variant="panel"><DashboardPanel onNavigate={(p) => navigate(`/${p}`)} /></ErrorBoundary>} />
    </Routes>
  );

  return (
    <div className="app-container">
      {!isDesktop && mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.5)' }} />
      )}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={!isDesktop ? { display: mobileMenuOpen ? 'flex' : 'none', position: 'fixed', zIndex: 100, height: '100vh' } : undefined}>
        <div className="sidebar-header">
          {!isDesktop && (
            <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', marginRight: '0.5rem' }} aria-label={t('common.close')}>
              <X size={20} />
            </button>
          )}
          <div className="logo-container">
            <div className="logo-orb">
              <div className="logo-core" />
            </div>
            {!isSidebarCollapsed && (
              <span className="logo-text">SUPER-AGENTS <span className="logo-suffix">OS</span></span>
            )}
          </div>
        </div>

        <div style={{ padding: '0.5rem 1rem' }}>
          <div className="provider-search-wrapper" style={{ marginBottom: '0.5rem' }}>
            <Search className="provider-search-icon" size={16} />
            <input
              type="text"
              placeholder={t('nav.search')}
              aria-label={t('nav.search')}
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              className="provider-search-input"
              style={{ fontSize: '0.8rem' }}
            />
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            item.type === 'header' ? (
              !isSidebarCollapsed && (
                <div key={item.id} className="nav-section-header">{t(navLabelKey[item.id] ?? 'nav.overview')}</div>
              )
            ) : (
              <button
                key={item.id}
                onClick={() => { navigate(`/${item.id}`); setMobileMenuOpen(false); }}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                aria-current={activeTab === item.id ? 'page' : undefined}
                style={{
                  '--active-color': item.color,
                  justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
                } as React.CSSProperties}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isSidebarCollapsed && <span className="nav-label">{t(navLabelKey[item.id] ?? 'nav.overview')}</span>}
                {!isSidebarCollapsed && activeTab === item.id && (
                  <motion.div layoutId="active-pill" className="active-pill" />
                )}
              </button>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-indicator online" />
            {!isSidebarCollapsed && <span role="status" aria-live="polite">{t('nav.runtime_online')}</span>}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          {!isDesktop && (
            <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', marginRight: '0.5rem' }} aria-label={t('nav.open_menu')}>
              <Menu size={20} />
            </button>
          )}
          <div className="search-bar">
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder={t('nav.search_placeholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearch} />
          </div>
          <div className="header-actions">
            <div className="session-timer">
              <History size={16} />
              <span>{t('nav.local_session')}</span>
            </div>
            <div className="user-profile">
              <div className="avatar" aria-hidden="true" />
              <span>{t('nav.operator')}</span>
            </div>
          </div>
        </header>

        <section className="content-viewport">
          {/* Decorative background for glassmorphism */}
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0, display: isDesktop ? 'block' : 'none' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0, display: isDesktop ? 'block' : 'none' }} />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </section>
        <AlertLayer />
      </main>
    </div>
  );
};

export default App;
