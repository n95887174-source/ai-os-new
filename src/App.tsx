import React, { useState } from 'react';
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
  History
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

import { CheckSquare, BarChart3, Waves, MessageCircle, GitMerge, Hexagon } from 'lucide-react';
import { eventBus, EVENTS } from './core/events';

const navigation = [
  { id: 'section-control', type: 'header', label: 'CONTROL PLANE' },
  { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Overview', color: '#3b82f6' },
  { id: 'analytics', icon: <BarChart3 size={18} />, label: 'Analytics', color: '#8b5cf6' },
  { id: 'keys', icon: <Key size={18} />, label: 'Providers', color: '#3b82f6' },
  { id: 'roles', icon: <Users size={18} />, label: 'Roles', color: '#3b82f6' },
  { id: 'chat', icon: <MessageSquare size={18} />, label: 'Chat', color: '#10b981' },
  { id: 'chat-admin', icon: <History size={18} />, label: 'Chat History', color: '#10b981' },
  { id: 'events', icon: <Terminal size={18} />, label: 'Logs', color: '#94a3b8' },
  { id: 'tasks', icon: <CheckSquare size={18} />, label: 'Tasks', color: '#f59e0b' },
  { id: 'memory', icon: <Database size={18} />, label: 'Memory', color: '#a855f7' },
  { id: 'knowledge', icon: <Brain size={18} />, label: 'Knowledge', color: '#a855f7' },
  { id: 'health', icon: <Heart size={18} />, label: 'Health', color: '#ef4444' },
  { id: 'settings', icon: <Settings size={18} />, label: 'Settings', color: '#3b82f6' },

  { id: 'section-integrations', type: 'header', label: 'INTEGRATIONS' },
  { id: 'connectors', icon: <Share2 size={18} />, label: 'Connectors', color: '#3b82f6' },
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed] = useState(false);

  React.useEffect(() => {
    const unsub = eventBus.on(EVENTS.NAVIGATE, (target: string) => {
      setActiveTab(target);
    });
    return () => unsub();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPanel onNavigate={setActiveTab} />;
      case 'analytics': return <AnalyticsPanel />;
      case 'keys': return <ProviderManager />;
      case 'roles': return <RolesPanel />;
      case 'chat': return <ChatPanel />;
      case 'chat-admin': return <ChatAdminPanel />;
      case 'events': return <EventsPanel />;
      case 'tasks': return <TasksPanel />;
      case 'memory': return <MemoryPanel />;
      case 'knowledge': return <KnowledgePanel />;
      case 'health': return <HealthPanel />;
      case 'settings': return <SettingsPanel />;
      case 'connectors': return <ConnectorsPanel />;
      case 'skills': return <SkillsPanel />;
      case 'tools': return <ToolsPanel />;
      case 'mission': return <MissionControl />;
      case 'live': return <LiveWorkspace />;
      case 'aquarium': return <AquariumPanel />;
      case 'hive': return <HivePanel />;
      case 'debate': return <DebatePanel />;
      case 'builder': return <CognitiveBuilder />;
      case 'debugger': return <TracesPanel />;
      case 'agents': return <AgentsPanel />;
      case 'docs': return <DocumentationPanel />;
      default: return <DashboardPanel onNavigate={setActiveTab} />;
    }
  };

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

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            item.type === 'header' ? (
              !isSidebarCollapsed && (
                <div key={item.id} className="nav-section-header">{item.label}</div>
              )
            ) : (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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
            <input type="text" placeholder="Search providers, logs, settings..." />
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
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%' }}
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
