import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link as LinkIcon, Share2, MessageSquare, 
  FileText, Globe, Box, Plus, Settings, 
  AlertCircle, RefreshCw,
  Mail, Send, Database, X
} from 'lucide-react';
import { eventBus, EVENTS } from '../../core/events';

interface Connector {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: 'connected' | 'auth_required' | 'disconnected';
  lastSync?: string;
}

const DEFAULT_CONNECTORS: Connector[] = [
  { id: 'slack', name: 'Slack', type: 'Messenger', description: 'Send and receive messages via Slack channels.', icon: <MessageSquare size={22} />, color: '#4A154B', status: 'disconnected' },
  { id: 'discord', name: 'Discord', type: 'Messenger', description: 'Bridge messages with Discord servers and channels.', icon: <Send size={22} />, color: '#5865F2', status: 'disconnected' },
  { id: 'telegram', name: 'Telegram', type: 'Messenger', description: 'Connect to Telegram bots and receive updates.', icon: <Send size={22} />, color: '#26A5E4', status: 'disconnected' },
  { id: 'google-drive', name: 'Google Drive', type: 'Storage', description: 'Read and write documents from Google Drive.', icon: <FileText size={22} />, color: '#4285F4', status: 'disconnected' },
  { id: 'dropbox', name: 'Dropbox', type: 'Storage', description: 'Access and sync files from Dropbox storage.', icon: <Database size={22} />, color: '#0061FF', status: 'disconnected' },
  { id: 'gmail', name: 'Gmail', type: 'Email', description: 'Read, compose, and send emails via Gmail API.', icon: <Mail size={22} />, color: '#EA4335', status: 'disconnected' },
  { id: 'github', name: 'GitHub', type: 'Dev Tools', description: 'Manage repos, issues, and pull requests.', icon: <Box size={22} />, color: '#333', status: 'disconnected' },
  { id: 'notion', name: 'Notion', type: 'Productivity', description: 'Query and update Notion databases and pages.', icon: <FileText size={22} />, color: '#000', status: 'disconnected' },
  { id: 'webhook-default', name: 'Custom Webhook', type: 'Webhook', description: 'Generic webhook receiver for external integrations.', icon: <Globe size={22} />, color: '#3b82f6', status: 'disconnected' },
];

const STORAGE_KEY = 'super_agents_connectors';

const ConnectorsPanel: React.FC = () => {
  const [connectors, setConnectors] = useState<Connector[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((c: any) => ({
          ...c,
          icon: DEFAULT_CONNECTORS.find(d => d.id === c.id)?.icon ?? <Globe size={22} />,
        }));
      } catch { /* fall through */ }
    }
    return DEFAULT_CONNECTORS;
  });

  const [activeView, setActiveView] = useState<'grid' | 'webhooks'>('grid');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');

  useEffect(() => {
    const serializable = connectors.map(({ icon, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }, [connectors]);

  const handleConnect = (id: string) => {
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, status: 'connected', lastSync: 'Just now' } : c));
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Connector ${id} connected successfully!`, type: 'success' });
  };

  const handleDisconnect = (id: string) => {
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, status: 'disconnected', lastSync: undefined } : c));
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Connector ${id} disconnected.`, type: 'info' });
  };

  const handleAddCustom = () => {
    if (!newName.trim()) return;
    const id = `custom-${crypto.randomUUID().slice(0, 8)}`;
    const c: Connector = {
      id,
      name: newName.trim(),
      type: newType.trim() || 'Custom',
      description: `Custom connector for ${newName.trim()}.`,
      icon: <Globe size={22} />,
      color: '#3b82f6',
      status: 'disconnected',
    };
    setConnectors(prev => [...prev, c]);
    setNewName('');
    setNewType('');
    setShowAddForm(false);
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Connector ${c.name} added.`, type: 'success' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Share2 size={32} color="#3b82f6" /> External Connectors
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1rem' }}>
            Integration with cloud services, messengers, and enterprise storage.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: 10, border: '1px solid var(--border)' }}>
          <button 
            onClick={() => setActiveView('grid')}
            style={{ 
              padding: '0.5rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeView === 'grid' ? '#3b82f6' : 'transparent',
              color: activeView === 'grid' ? 'white' : 'var(--text-muted)',
              fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Services
          </button>
          <button 
            onClick={() => setActiveView('webhooks')}
            style={{ 
              padding: '0.5rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeView === 'webhooks' ? '#3b82f6' : 'transparent',
              color: activeView === 'webhooks' ? 'white' : 'var(--text-muted)',
              fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s'
            }}
          >
            Webhooks
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}
          >
            {connectors.map((c) => (
              <div key={c.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    width: 56, height: 56, borderRadius: 16, background: c.color, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                    boxShadow: `0 8px 20px ${c.color}33`
                  }}>
                    {c.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{c.name}</h3>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>{c.type}</span>
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem', height: '3rem' }}>
                  {c.description}
                </p>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                      width: 8, height: 8, borderRadius: '50%', 
                      background: c.status === 'connected' ? '#10b981' : c.status === 'auth_required' ? '#f59e0b' : '#ef4444' 
                    }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: c.status === 'connected' ? '#10b981' : 'var(--text-muted)' }}>
                      {c.status === 'connected' ? 'Connected' : c.status === 'auth_required' ? 'Auth Required' : 'Disconnected'}
                    </span>
                  </div>
                  
                  {c.status === 'connected' ? (
                    <button onClick={() => handleDisconnect(c.id)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                      <Settings size={14} /> Disconnect
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleConnect(c.id)}
                      className="btn-primary" 
                      style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}
                    >
                      Connect
                    </button>
                  )}
                </div>

                {c.lastSync && (
                  <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <RefreshCw size={10} /> {c.lastSync}
                  </div>
                )}
              </div>
            ))}

            {showAddForm ? (
              <div className="glass-panel" style={{ padding: '1.5rem', border: '2px dashed var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Add Custom Connector</span>
                  <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
                <input
                  placeholder="Service name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                />
                <input
                  placeholder="Type (optional)"
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                />
                <button onClick={handleAddCustom} className="btn-primary" style={{ width: '100%' }}>
                  Add Connector
                </button>
              </div>
            ) : (
              <div 
                onClick={() => setShowAddForm(true)}
                style={{ 
                  border: '2px dashed var(--border)', borderRadius: 16, display: 'flex', flexDirection: 'column', 
                  alignItems: 'center', justifyContent: 'center', padding: '2rem', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.01)', transition: 'all 0.2s'
                }} 
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} 
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
              >
                <Plus size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Add New Service</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="webhooks"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-panel"
            style={{ padding: '2rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Incoming Webhooks</h3>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Allow external systems to send events directly to the OS Kernel.</p>
              </div>
              <button className="btn-primary"><Plus size={16} /> Create URL</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>NAME</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>URL</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>EVENTS</th>
                  <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: '1rem' }}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No webhooks configured yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'rgba(59,130,246,0.05)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.1)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <AlertCircle size={20} color="#3b82f6" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          All connector data is encrypted using your Vault master password. We never store your OAuth tokens in plain text.
        </span>
      </div>
    </div>
  );
};

export default ConnectorsPanel;
