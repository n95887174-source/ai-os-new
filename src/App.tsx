import React, { useState, useEffect } from 'react';
import { ShieldCheck, Home, MessageSquare, Plug, BarChart, Settings, Wrench, BookOpen } from 'lucide-react';
import ProviderManager from './components/ProviderManager/ProviderManager';
import ChatPanel from './components/ChatPanel/ChatPanel';
import AnalyticsPanel from './components/AnalyticsPanel/AnalyticsPanel';
import DashboardPanel from './components/DashboardPanel/DashboardPanel';
import ToolsPanel from './components/ToolsPanel/ToolsPanel';
import DocumentationPanel from './components/DocumentationPanel/DocumentationPanel';
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import { eventBus, EVENTS } from './core/events';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorBoundary from './components/Common/ErrorBoundary';
import VaultLock from './components/Common/VaultLock';

// Initialize services
import './services/ChatService';
import './services/HealthCheckService';
import './services/MetricsService';

interface ToastMessage {
  id: string;
  message: string;
  type: string;
}

type Page = 'dashboard' | 'chat' | 'providers' | 'analytics' | 'tools' | 'docs' | 'settings';

interface MenuButtonProps {
  id: Page;
  icon: React.ReactNode;
  label: string;
  activePage: Page;
  setActivePage: (p: Page) => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ id, icon, label, activePage, setActivePage }) => (
  <button
    onClick={() => setActivePage(id)}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem', width: '100%',
      background: activePage === id ? 'rgba(59,130,246,0.1)' : 'transparent',
      color: activePage === id ? '#3b82f6' : 'var(--text-muted)',
      border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem', fontWeight: activePage === id ? 600 : 500,
      transition: 'all 0.2s', textAlign: 'left'
    }}
  >
    {icon}
    {label}
  </button>
);

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [notifications, setNotifications] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsub = eventBus.on(EVENTS.NOTIFICATION, (data) => {
      const id = Math.random().toString(36).substring(2, 9);
      setNotifications(prev => [...prev, { ...data as Omit<ToastMessage, 'id'>, id }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 4000);
    });
    return () => unsub();
  }, []);

  return (
    <ErrorBoundary>
      <VaultLock />
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-main)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: 260, background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        {/* Brand */}
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', padding: '0.5rem', borderRadius: 12 }}>
            <ShieldCheck size={24} color="#3b82f6" />
          </div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Super<span style={{ color: '#3b82f6' }}>Agents</span></h1>
        </div>

        {/* Menu */}
        <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingLeft: '1rem' }}>Меню</div>
          <MenuButton id="dashboard" icon={<Home size={18} />} label="Панель управления" activePage={activePage} setActivePage={setActivePage} />
          <MenuButton id="chat" icon={<MessageSquare size={18} />} label="Чат-интерфейс" activePage={activePage} setActivePage={setActivePage} />
          <MenuButton id="providers" icon={<Plug size={18} />} label="Провайдеры ИИ" activePage={activePage} setActivePage={setActivePage} />
          <MenuButton id="analytics" icon={<BarChart size={18} />} label="Аналитика" activePage={activePage} setActivePage={setActivePage} />
          <MenuButton id="tools" icon={<Wrench size={18} />} label="Инструменты" activePage={activePage} setActivePage={setActivePage} />
          <MenuButton id="docs" icon={<BookOpen size={18} />} label="Документация" activePage={activePage} setActivePage={setActivePage} />
          
          <div style={{ marginTop: 'auto' }}>
            <MenuButton id="settings" icon={<Settings size={18} />} label="Настройки" activePage={activePage} setActivePage={setActivePage} />
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header */}
        <header style={{ height: 70, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: 'var(--bg-panel)' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
              {{ 
                dashboard: '📊 Обзор', 
                chat: '💬 Чат', 
                providers: '🔌 Провайдеры ИИ', 
                analytics: '📈 Аналитика', 
                tools: '🛠️ Инструменты',
                docs: '📚 Документация',
                settings: '⚙️ Настройки' 
              }[activePage]}
            </h2>
          </div>
          <div className="system-status" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.4rem 0.8rem', borderRadius: 20, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em' }}>СИСТЕМА В НОРМЕ</span>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', height: '100%' }}>
            {activePage === 'chat' && <ChatPanel />}
            {activePage === 'providers' && <ProviderManager />}
            {activePage === 'analytics' && <div style={{ height: '100%' }}><AnalyticsPanel /></div>}
            {activePage === 'tools' && <ToolsPanel />}
            {activePage === 'docs' && <DocumentationPanel />}
            
            {activePage === 'dashboard' && <DashboardPanel onNavigate={setActivePage} />}
            
            {activePage === 'settings' && <SettingsPanel />}
          </div>
        </div>
      </main>

      {/* Global Notifications */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.75rem', pointerEvents: 'none' }}>
        <AnimatePresence>
          {notifications.map(note => (
            <motion.div
              key={note.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              style={{
                background: note.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 16, 16, 0.95)',
                color: 'white', padding: '1rem 1.2rem', borderRadius: 12,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: 280, position: 'relative', overflow: 'hidden'
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{note.message}</div>
              <motion.div 
                initial={{ width: '100%' }} animate={{ width: 0 }} transition={{ duration: 4, ease: 'linear' }}
                style={{ position: 'absolute', bottom: 0, left: 0, height: 3, background: 'rgba(255,255,255,0.3)' }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default App;
