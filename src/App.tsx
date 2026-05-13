import React, { useState } from 'react';
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
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import MissionControl from './components/LiveCognition/MissionControl';
import LiveWorkspace from './components/LiveCognition/LiveWorkspace';
import ChatPanel from './components/ChatPanel/ChatPanel';
import CognitiveBuilder from './components/BuilderPanel/CognitiveBuilder';
import DashboardPanel from './components/DashboardPanel/DashboardPanel';
import TracesPanel from './components/TracesPanel/TracesPanel';
import EventsPanel from './components/EventsPanel/EventsPanel';
import ProviderManager from './components/ProviderManager/ProviderManager';
import AgentsPanel from './components/AgentsPanel/AgentsPanel';
import ToolsPanel from './components/ToolsPanel/ToolsPanel';
import ConnectorsPanel from './components/ConnectorsPanel/ConnectorsPanel';
import MemoryPanel from './components/MemoryPanel/MemoryPanel';
import KnowledgePanel from './components/KnowledgePanel/KnowledgePanel';
import HealthPanel from './components/HealthPanel/HealthPanel';
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import DocumentationPanel from './components/DocumentationPanel/DocumentationPanel';
import AnalyticsPanel from './components/AnalyticsPanel/AnalyticsPanel';
import AquariumPanel from './components/AquariumPanel/AquariumPanel';
import HivePanel from './components/HivePanel/HivePanel';
import DebatePanel from './components/DebatePanel/DebatePanel';
import SkillsPanel from './components/SkillsPanel/SkillsPanel';
import TasksPanel from './components/TasksPanel/TasksPanel';
import RolesPanel from './components/RolesPanel/RolesPanel';
import ChatAdminPanel from './components/ChatAdminPanel/ChatAdminPanel';
import EventsTimeline from './components/EventsTimeline/EventsTimeline';
import SREAgentPanel from './components/SREAgentPanel/SREAgentPanel';
import AuditLogView from './components/AuditLogView/AuditLogView';
import ConfigHistoryView from './components/ConfigHistoryView/ConfigHistoryView';
import PoolStatusPanel from './components/PoolStatusPanel/PoolStatusPanel';
import RoutingIntelligence from './components/RoutingIntelligence/RoutingIntelligence';
import PolicyPanel from './components/PolicyPanel/PolicyPanel';
import MCPPanel from './components/MCPPanel/MCPPanel';

import { CheckSquare, BarChart3, Waves, MessageCircle, GitMerge, Hexagon, Layers, GitBranch, Shield, Server } from 'lucide-react';
import { eventBus, EVENTS, type EventMap } from './core/events';
import { settingsService } from './services/SettingsService';
import ErrorBoundary from './components/Common/ErrorBoundary';

const navigation = [
  { id: 'section-control', type: 'header', label: 'CONTROL PLANE' },
  { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Overview', color: '#3b82f6' },
  { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Analytics', color: '#8b5cf6' },
  { id: 'keys', icon: <Key size={18} />, label: 'Providers', color: '#3b82f6' },
  { id: 'pools', icon: <Layers size={18} />, label: 'Key Pools', color: '#3b82f6' },
  { id: 'roles', icon: <Users size={18} />, label: 'Roles', color: '#3b82f6' },
  { id: 'policies', icon: <Shield size={18} />, label: 'Policies', color: '#10b981' },
  { id: 'chat', icon: <MessageSquare size={18} />, label: 'Chat', color: '#10b981' },
  { id: 'chat-admin', icon: <History size={18} />, label: 'Chat History', color: '#10b981' },
  { id: 'events', icon: <Terminal size={18} />, label: 'Logs', color: '#94a3b8' },
  { id: 'audit', icon: <Search size={18} />, label: 'Audit Log', color: '#94a3b8' },
  { id: 'history', icon: <History size={18} />, label: 'Config History', color: '#f59e0b' },
  { id: 'timeline', icon: <Activity size={18} />, label: 'Timeline', color: '#a855f7' },
  { id: 'sre', icon: <Bot size={18} />, label: 'SRE Agent', color: '#8b5cf6' },
  { id: 'routing', icon: <GitBranch size={18} />, label: 'Routing AI', color: '#8b5cf6' },
  { id: 'tasks', icon: <CheckSquare size={18} />, label: 'Tasks', color: '#f59e0b' },
  { id: 'memory', icon: <Database size={18} />, label: 'Memory', color: '#a855f7' },
  { id: 'knowledge', icon: <Brain size={18} />, label: 'Knowledge', color: '#a855f7' },
  { id: 'health', icon: <Heart size={18} />, label: 'Health', color: '#ef4444' },
  { id: 'settings', icon: <Settings size={18} />, label: 'Settings', color: '#3b82f6' },

  { id: 'section-integrations', type: 'header', label: 'INTEGRATIONS' },
  { id: 'connectors', icon: <Share2 size={18} />, label: 'Connectors', color: '#3b82f6' },
  { id: 'mcp', icon: <Server size={18} />, label: 'MCP Servers', color: '#a855f7' },
  { id: 'skills', icon: <GitMerge size={18} />, label: 'Skills', color: '#f59e0b' },
  { id: 'tools', icon: <Wrench size={18} />, label: 'Tools', color: '#f59e0b' },

  { id: 'section-lab', type: 'header', label: 'LAB' },
  { id: 'mission', icon: <Zap size={18} />, label: 'Mission Control', color: '#f59e0b' },
  { id: 'live', icon: <Radio size={18} />, label: 'Live Workspace', color: '#3b82f6' },
  { id: 'aquarium', icon: <Waves size={18} />, label: 'Aquarium', color: '#06b6d4' },
  { id: 'hive', icon: <Hexagon size={18} />, label: 'Hive', color: '#eab308' },
  { id: 'debate', icon: <MessageCircle size={18} />, label: 'Debate Arena', color: '#a855f7' },
  { id: 'builder', icon: <Box size={18} />, label: 'Builder', color: '#f59e0b' },
  { id: 'debugger', icon: <Brain size={18} />, label: 'Traces', color: '#a855f7' },
  { id: 'agents', icon: <Users size={18} />, label: 'Agents', color: '#3b82f6' },
  { id: 'docs', icon: <BookOpen size={18} />, label: 'Docs', color: '#10b981' }
];

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    document.documentElement.lang = s.language;

    const unsub = settingsService.subscribe((settings) => {
      document.documentElement.dataset.theme = settings.theme;
      document.documentElement.lang = settings.language;
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
      <Route path="/sre" element={<ErrorBoundary name="SREAgent" variant="panel"><SREAgentPanel /></ErrorBoundary>} />
      <Route path="/routing" element={<ErrorBoundary name="Routing" variant="panel"><RoutingIntelligence /></ErrorBoundary>} />
      <Route path="/audit" element={<ErrorBoundary name="AuditLog" variant="panel"><AuditLogView /></ErrorBoundary>} />
      <Route path="/history" element={<ErrorBoundary name="ConfigHistory" variant="panel"><ConfigHistoryView /></ErrorBoundary>} />
      <Route path="/tasks" element={<ErrorBoundary name="Tasks" variant="panel"><TasksPanel /></ErrorBoundary>} />
      <Route path="/memory" element={<ErrorBoundary name="Memory" variant="panel"><MemoryPanel /></ErrorBoundary>} />
      <Route path="/knowledge" element={<ErrorBoundary name="Knowledge" variant="panel"><KnowledgePanel /></ErrorBoundary>} />
      <Route path="/health" element={<ErrorBoundary name="Health" variant="panel"><HealthPanel /></ErrorBoundary>} />
      <Route path="/settings" element={<ErrorBoundary name="Settings" variant="panel"><SettingsPanel /></ErrorBoundary>} />
      <Route path="/connectors" element={<ErrorBoundary name="Connectors" variant="panel"><ConnectorsPanel /></ErrorBoundary>} />
      <Route path="/skills" element={<ErrorBoundary name="Skills" variant="panel"><SkillsPanel /></ErrorBoundary>} />
      <Route path="/tools" element={<ErrorBoundary name="Tools" variant="panel"><ToolsPanel /></ErrorBoundary>} />
      <Route path="/mission" element={<ErrorBoundary name="MissionControl" variant="panel"><MissionControl /></ErrorBoundary>} />
      <Route path="/live" element={<ErrorBoundary name="LiveWorkspace" variant="panel"><LiveWorkspace /></ErrorBoundary>} />
      <Route path="/aquarium" element={<ErrorBoundary name="Aquarium" variant="panel"><AquariumPanel /></ErrorBoundary>} />
      <Route path="/hive" element={<ErrorBoundary name="Hive" variant="panel"><HivePanel /></ErrorBoundary>} />
      <Route path="/debate" element={<ErrorBoundary name="Debate" variant="panel"><DebatePanel /></ErrorBoundary>} />
      <Route path="/builder" element={<ErrorBoundary name="Builder" variant="panel"><CognitiveBuilder /></ErrorBoundary>} />
      <Route path="/debugger" element={<ErrorBoundary name="Traces" variant="panel"><TracesPanel /></ErrorBoundary>} />
      <Route path="/agents" element={<ErrorBoundary name="Agents" variant="panel"><AgentsPanel /></ErrorBoundary>} />
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
              placeholder="Search menu..."
              aria-label="Search menu"
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
                <div key={item.id} className="nav-section-header">{item.label}</div>
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
                {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
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
      </main>
    </div>
  );
};

export default App;
