import React, { useState, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  Radio,
  MessageSquare,
  Brain,
  Key,
  Settings,
  Users,
  Database,
  Wrench,
  Box,
  Zap,
  LayoutDashboard,
  Share2,
  Terminal,
  BookOpen,
  Heart,
  Search,
  History,
  Bot,
  Thermometer,
  CheckSquare, BarChart3, Waves, MessageCircle, GitMerge, Hexagon, Layers, GitBranch, Shield, Server, Activity, Briefcase, FileText, DollarSign, Shuffle, Crosshair, BookText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MissionControl = React.lazy(() => import('./components/LiveCognition/MissionControl'));
const LiveWorkspace = React.lazy(() => import('./components/LiveCognition/LiveWorkspace'));
import ChatPanel from './components/ChatPanel/ChatPanel';
const CognitiveBuilder = React.lazy(() => import('./components/BuilderPanel/CognitiveBuilder'));
import DashboardPanel from './components/DashboardPanel/DashboardPanel';
const TracesPanel = React.lazy(() => import('./components/TracesPanel/TracesPanel'));
import EventsPanel from './components/EventsPanel/EventsPanel';
import ProviderManager from './components/ProviderManager/ProviderManager';
import AgentsPanel from './components/AgentsPanel/AgentsPanel';
import ToolsPanel from './components/ToolsPanel/ToolsPanel';
import ConnectorsPanel from './components/ConnectorsPanel/ConnectorsPanel';
const MemoryPanel = React.lazy(() => import('./components/MemoryPanel/MemoryPanel'));
import KnowledgePanel from './components/KnowledgePanel/KnowledgePanel';
const HealthPanel = React.lazy(() => import('./components/HealthPanel/HealthPanel'));
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import DocumentationPanel from './components/DocumentationPanel/DocumentationPanel';
import AnalyticsPanel from './components/AnalyticsPanel/AnalyticsPanel';
const AquariumPanel = React.lazy(() => import('./components/AquariumPanel/AquariumPanel'));
const HivePanel = React.lazy(() => import('./components/HivePanel/HivePanel'));
const DebatePanel = React.lazy(() => import('./components/DebatePanel/DebatePanel'));
const DebateRuntimePanel = React.lazy(() => import('./components/DebateRuntimePanel/DebateRuntimePanel'));
import SkillsPanel from './components/SkillsPanel/SkillsPanel';
import TasksPanel from './components/TasksPanel/TasksPanel';
import RolesPanel from './components/RolesPanel/RolesPanel';
import ChatAdminPanel from './components/ChatAdminPanel/ChatAdminPanel';
import EventsTimeline from './components/EventsTimeline/EventsTimeline';
const SREAgentPanel = React.lazy(() => import('./components/SREAgentPanel/SREAgentPanel'));
const WhatIfPanel = React.lazy(() => import('./components/WhatIfPanel/WhatIfPanel'));
const PressureMapPanel = React.lazy(() => import('./components/PressureMapPanel/PressureMapPanel'));
const DiagnosticPanel = React.lazy(() => import('./components/DiagnosticPanel/DiagnosticPanel'));
import AuditLogView from './components/AuditLogView/AuditLogView';
import ConfigHistoryView from './components/ConfigHistoryView/ConfigHistoryView';
import PoolStatusPanel from './components/PoolStatusPanel/PoolStatusPanel';
const RoutingIntelligence = React.lazy(() => import('./components/RoutingIntelligence/RoutingIntelligence'));
import AlertLayer from './components/AlertLayer/AlertLayer';
import PolicyPanel from './components/PolicyPanel/PolicyPanel';
import MCPPanel from './components/MCPPanel/MCPPanel';
import PatternsPanel from './components/PatternsPanel/PatternsPanel';
const PricingPanel = React.lazy(() => import('./components/AnalyticsPanel/PricingPanel'));
const PressureMap = React.lazy(() => import('./components/PressureMap/PressureMap'));

import { eventBus, EVENTS, type EventMap } from './core/events';
import { settingsService } from './services/SettingsService';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { useTranslation } from './i18n/useTranslation';
import { setLanguage } from './i18n/translations';
import type { TranslationKey } from './i18n/translations';

const PanelLoader: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <ErrorBoundary name={name} variant="panel">
    <Suspense fallback={<div style={{ padding: '2rem', color: '#64748b', textAlign: 'center' }}>Loading {name}...</div>}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const navigation = [
  { id: 'section-control', type: 'header', label: 'CONTROL PLANE' },
  { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Overview', color: '#3b82f6' },
  { id: 'chat', icon: <MessageSquare size={18} />, label: 'Chat', color: '#10b981' },
  { id: 'tasks', icon: <CheckSquare size={18} />, label: 'Tasks', color: '#f59e0b' },
  { id: 'sre', icon: <Bot size={18} />, label: 'SRE Agent', color: '#8b5cf6' },

  { id: 'section-infra', type: 'header', label: 'INFRASTRUCTURE' },
  { id: 'keys', icon: <Key size={18} />, label: 'Providers', color: '#3b82f6' },
  { id: 'pools', icon: <Layers size={18} />, label: 'Key Pools', color: '#3b82f6' },
  { id: 'connectors', icon: <Share2 size={18} />, label: 'Connectors', color: '#3b82f6' },
  { id: 'mcp', icon: <Server size={18} />, label: 'MCP Servers', color: '#a855f7' },
  { id: 'skills', icon: <GitMerge size={18} />, label: 'Skills', color: '#f59e0b' },
  { id: 'tools', icon: <Wrench size={18} />, label: 'Tools', color: '#f59e0b' },

  { id: 'section-gov', type: 'header', label: 'GOVERNANCE' },
  { id: 'policies', icon: <Shield size={18} />, label: 'Policies', color: '#10b981' },
  { id: 'roles', icon: <Users size={18} />, label: 'Roles', color: '#3b82f6' },
  { id: 'audit', icon: <Search size={18} />, label: 'Audit Log', color: '#94a3b8' },
  { id: 'history', icon: <History size={18} />, label: 'Config History', color: '#f59e0b' },

  { id: 'section-econ', type: 'header', label: 'ECONOMIC PLANE' },
  { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Analytics', color: '#8b5cf6' },
  { id: 'routing', icon: <GitBranch size={18} />, label: 'Routing AI', color: '#8b5cf6' },
  { id: 'pricing', icon: <DollarSign size={18} />, label: 'Economics', color: '#10b981' },

  { id: 'section-obs', type: 'header', label: 'OBSERVABILITY' },
  { id: 'events', icon: <Terminal size={18} />, label: 'Logs', color: '#94a3b8' },
  { id: 'timeline', icon: <Activity size={18} />, label: 'Timeline', color: '#a855f7' },
  { id: 'debugger', icon: <Brain size={18} />, label: 'Traces', color: '#a855f7' },
  { id: 'memory', icon: <Database size={18} />, label: 'Memory', color: '#a855f7' },
  { id: 'health', icon: <Heart size={18} />, label: 'Health', color: '#ef4444' },
  { id: 'pressure', icon: <Thermometer size={18} />, label: 'Pressure Map', color: '#f97316' },
  { id: 'what-if', icon: <Shuffle size={18} />, label: 'What-If', color: '#8b5cf6' },
  { id: 'runtime-pressure', icon: <Thermometer size={18} />, label: 'Runtime Pressure', color: '#f97316' },
  { id: 'diagnostics', icon: <Crosshair size={18} />, label: 'Diagnostics', color: '#10b981' },

  { id: 'section-lab', type: 'header', label: 'LAB & KNOWLEDGE' },
  { id: 'patterns', icon: <BookOpen size={18} />, label: 'Patterns', color: '#10b981' },
  { id: 'knowledge', icon: <Brain size={18} />, label: 'Knowledge', color: '#a855f7' },
  { id: 'mission', icon: <Zap size={18} />, label: 'Mission Control', color: '#f59e0b' },
  { id: 'live', icon: <Radio size={18} />, label: 'Live Workspace', color: '#3b82f6' },
  { id: 'aquarium', icon: <Waves size={18} />, label: 'Aquarium', color: '#06b6d4' },
  { id: 'hive', icon: <Hexagon size={18} />, label: 'Hive', color: '#eab308' },
  { id: 'debate', icon: <MessageCircle size={18} />, label: 'Debate Arena', color: '#a855f7' },
  { id: 'debate-runtime', icon: <GitBranch size={18} />, label: 'Debate Runtime', color: '#a855f7' },
  { id: 'builder', icon: <Box size={18} />, label: 'Builder', color: '#f59e0b' },
  { id: 'agents', icon: <Users size={18} />, label: 'Agents', color: '#3b82f6' },
  { id: 'docs', icon: <BookText size={18} />, label: 'Documentation', color: '#8b5cf6' },
  { id: 'settings', icon: <Settings size={18} />, label: 'Settings', color: '#3b82f6' }
];

const navLabelKey: Record<string, TranslationKey> = {
  'section-control': 'nav.control_plane',
  'dashboard': 'nav.overview', 'chat': 'nav.chat', 'tasks': 'nav.tasks', 'sre': 'nav.sre_agent',
  'section-infra': 'nav.infrastructure',
  'keys': 'nav.providers', 'pools': 'nav.key_pools', 'connectors': 'nav.connectors',
  'mcp': 'nav.mcp_servers', 'skills': 'nav.skills', 'tools': 'nav.tools',
  'section-gov': 'nav.governance',
  'policies': 'nav.policies', 'roles': 'nav.roles', 'audit': 'nav.audit_log', 'history': 'nav.config_history',
  'section-econ': 'nav.economic_plane',
  'analytics': 'nav.analytics', 'routing': 'nav.routing_ai', 'pricing': 'nav.economics',
  'section-obs': 'nav.observability',
  'events': 'nav.logs', 'timeline': 'nav.timeline', 'debugger': 'nav.traces',
  'memory': 'nav.memory', 'health': 'nav.health', 'pressure': 'nav.pressure_map',
  'what-if': 'nav.what_if', 'runtime-pressure': 'nav.runtime_pressure_map', 'diagnostics': 'nav.diagnostics',
  'section-lab': 'nav.lab_knowledge',
  'patterns': 'nav.patterns', 'knowledge': 'nav.knowledge', 'mission': 'nav.mission_control',
  'live': 'nav.live_workspace', 'aquarium': 'nav.aquarium', 'hive': 'nav.hive',
  'debate': 'nav.debate_arena', 'debate-runtime': 'nav.debate_runtime_arena', 'builder': 'nav.builder', 'agents': 'nav.agents', 'docs': 'nav.docs', 'settings': 'nav.settings',
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const activeTab = location.pathname.split('/')[1] || 'dashboard';
  const [isSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');

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
      <Route path="/events" element={<ErrorBoundary name="Events" variant="panel"><EventsPanel /></ErrorBoundary>} />
      <Route path="/timeline" element={<ErrorBoundary name="Timeline" variant="panel"><EventsTimeline /></ErrorBoundary>} />
      <Route path="/sre" element={<PanelLoader name="SREAgent"><SREAgentPanel /></PanelLoader>} />
      <Route path="/routing" element={<PanelLoader name="Routing"><RoutingIntelligence /></PanelLoader>} />
      <Route path="/audit" element={<ErrorBoundary name="AuditLog" variant="panel"><AuditLogView /></ErrorBoundary>} />
      <Route path="/history" element={<ErrorBoundary name="ConfigHistory" variant="panel"><ConfigHistoryView /></ErrorBoundary>} />
      <Route path="/tasks" element={<ErrorBoundary name="Tasks" variant="panel"><TasksPanel /></ErrorBoundary>} />
      <Route path="/memory" element={<PanelLoader name="Memory"><MemoryPanel /></PanelLoader>} />
      <Route path="/knowledge" element={<ErrorBoundary name="Knowledge" variant="panel"><KnowledgePanel /></ErrorBoundary>} />
      <Route path="/health" element={<PanelLoader name="Health"><HealthPanel /></PanelLoader>} />
      <Route path="/pressure" element={<PanelLoader name="PressureMap"><PressureMap /></PanelLoader>} />
      <Route path="/what-if" element={<PanelLoader name="WhatIf"><WhatIfPanel /></PanelLoader>} />
      <Route path="/runtime-pressure" element={<PanelLoader name="RuntimePressure"><PressureMapPanel /></PanelLoader>} />
      <Route path="/diagnostics" element={<PanelLoader name="Diagnostics"><DiagnosticPanel /></PanelLoader>} />
      <Route path="/settings" element={<ErrorBoundary name="Settings" variant="panel"><SettingsPanel /></ErrorBoundary>} />
      <Route path="/connectors" element={<ErrorBoundary name="Connectors" variant="panel"><ConnectorsPanel /></ErrorBoundary>} />
      <Route path="/skills" element={<ErrorBoundary name="Skills" variant="panel"><SkillsPanel /></ErrorBoundary>} />
      <Route path="/tools" element={<ErrorBoundary name="Tools" variant="panel"><ToolsPanel /></ErrorBoundary>} />
      <Route path="/mission" element={<PanelLoader name="MissionControl"><MissionControl /></PanelLoader>} />
      <Route path="/live" element={<PanelLoader name="LiveWorkspace"><LiveWorkspace /></PanelLoader>} />
      <Route path="/aquarium" element={<PanelLoader name="Aquarium"><AquariumPanel /></PanelLoader>} />
      <Route path="/hive" element={<PanelLoader name="Hive"><HivePanel /></PanelLoader>} />
      <Route path="/debate" element={<PanelLoader name="Debate"><DebatePanel /></PanelLoader>} />
      <Route path="/debate-runtime" element={<PanelLoader name="DebateRuntime"><DebateRuntimePanel /></PanelLoader>} />
      <Route path="/builder" element={<PanelLoader name="Builder"><CognitiveBuilder /></PanelLoader>} />
      <Route path="/debugger" element={<PanelLoader name="Traces"><TracesPanel /></PanelLoader>} />
      <Route path="/pricing" element={<PanelLoader name="Pricing"><PricingPanel /></PanelLoader>} />
      <Route path="/agents" element={<PanelLoader name="Agents"><AgentsPanel /></PanelLoader>} />
      <Route path="/patterns" element={<PanelLoader name="Patterns"><PatternsPanel /></PanelLoader>} />
      <Route path="/docs" element={<ErrorBoundary name="Docs" variant="panel"><DocumentationPanel /></ErrorBoundary>} />
      <Route path="*" element={<ErrorBoundary name="Dashboard" variant="panel"><DashboardPanel onNavigate={(p) => navigate(`/${p}`)} /></ErrorBoundary>} />
    </Routes>
  );

  return (
    <div className="app-container">
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
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
          {navigation.filter(item =>
            item.type === 'header' ||
            item.label.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
          ).map((item) => (
            item.type === 'header' ? (
              !isSidebarCollapsed && (
                <div key={item.id} className="nav-section-header">{t(navLabelKey[item.id] ?? 'nav.overview')}</div>
              )
            ) : (
              <button
                key={item.id}
                onClick={() => navigate(`/${item.id}`)}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
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
            {!isSidebarCollapsed && <span>RUNTIME ONLINE</span>}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <div className="search-bar">
            <Search size={18} color="var(--text-muted)" />
            <input type="text" placeholder="Search providers, logs, settings..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearch} />
          </div>
          <div className="header-actions">
            <div className="session-timer">
              <History size={16} />
              <span>LOCAL SESSION</span>
            </div>
            <div className="user-profile">
              <div className="avatar" />
              <span>Operator</span>
            </div>
          </div>
        </header>

        <section className="content-viewport">
          {/* Decorative background for glassmorphism */}
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%', position: 'relative', zIndex: 10 }}
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
