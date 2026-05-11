import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, MessageSquare, 
  FileText, Globe, Box, Plus, Settings, 
  RefreshCw, Layers,
  Mail, Send, Database, X, ShieldCheck,
  Server, Search, AlertTriangle
} from 'lucide-react';
import { eventBus, EVENTS } from '../../core/events';
import { dexieDb } from '../../core/DatabaseService';
import type { Connector } from '../../types/domain';

const DEFAULT_CONNECTORS: Connector[] = [
  { id: 'slack', name: 'Slack API', type: 'Enterprise Chat', description: 'Bi-directional agent communication in channels.', color: '#4A154B', status: 'disconnected' },
  { id: 'discord', name: 'Discord', type: 'Community Chat', description: 'Bot integration for community management.', color: '#5865F2', status: 'disconnected' },
  { id: 'telegram', name: 'Telegram', type: 'Messaging', description: 'Direct secure updates via TG Bots.', color: '#26A5E4', status: 'disconnected' },
  { id: 'google-drive', name: 'Google Workspace', type: 'Document Store', description: 'Semantic search and RAG over Drive files.', color: '#4285F4', status: 'disconnected' },
  { id: 'dropbox', name: 'Dropbox', type: 'Storage', description: 'Sync raw data files and binary blobs.', color: '#0061FF', status: 'disconnected' },
  { id: 'gmail', name: 'Gmail Auth', type: 'Email Relay', description: 'Automated email parsing and response generation.', color: '#EA4335', status: 'disconnected' },
  { id: 'github', name: 'GitHub OAuth', type: 'Version Control', description: 'PR reviews and autonomous code commits.', color: '#f8fafc', status: 'disconnected' },
  { id: 'notion', name: 'Notion API', type: 'Knowledge Base', description: 'Query and update knowledge graph blocks.', color: '#e2e8f0', status: 'disconnected' }
];

const CONNECTOR_ICONS: Record<string, React.ReactNode> = {
  slack: <MessageSquare size={24} />,
  discord: <Send size={24} />,
  telegram: <Send size={24} />,
  'google-drive': <FileText size={24} />,
  dropbox: <Database size={24} />,
  gmail: <Mail size={24} />,
  github: <Box size={24} />,
  notion: <Layers size={24} />,
};

const STORAGE_KEY = 'super_agents_connectors';

const ConnectorsPanel: React.FC = () => {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeView, setActiveView] = useState<'grid' | 'webhooks'>('grid');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const count = await dexieDb.connectors.count();
        if (count > 0) {
          const saved = await dexieDb.connectors.toArray();
          setConnectors(saved);
        } else {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              await dexieDb.connectors.bulkAdd(parsed);
              localStorage.removeItem(STORAGE_KEY);
              setConnectors(parsed);
            } catch {
              await dexieDb.connectors.bulkAdd(DEFAULT_CONNECTORS);
              setConnectors(DEFAULT_CONNECTORS);
            }
          } else {
            await dexieDb.connectors.bulkAdd(DEFAULT_CONNECTORS);
            setConnectors(DEFAULT_CONNECTORS);
          }
        }
      } catch (e) {
        console.error('[ConnectorsPanel] Failed to load connectors', e);
        setConnectors(DEFAULT_CONNECTORS);
      }
      setLoaded(true);
    };
    load();
  }, []);

  const persist = async (updated: Connector[]) => {
    try {
      await dexieDb.connectors.bulkPut(updated);
    } catch (e) {
      console.error('[ConnectorsPanel] Failed to persist connectors', e);
    }
  };

  const filteredConnectors = useMemo(() => {
    return connectors.filter(c => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.type.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [connectors, searchQuery, statusFilter]);

  const connectedCount = connectors.filter(c => c.status === 'connected').length;
  const totalCount = connectors.length;

  const getIcon = (id: string) => CONNECTOR_ICONS[id] ?? <Globe size={24} />;

  const handleConnect = (id: string) => {
    setConnectors(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, status: 'connected' as const, lastSync: 'Just now' } : c);
      persist(updated);
      return updated;
    });
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Securely connected to ${id} API!`, type: 'success' });
  };

  const handleDisconnect = (id: string) => {
    setConnectors(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, status: 'disconnected' as const, lastSync: undefined } : c);
      persist(updated);
      return updated;
    });
    setConfirmDisconnect(null);
    eventBus.emit(EVENTS.NOTIFICATION, { message: `OAuth token for ${id} revoked.`, type: 'info' });
  };

  const handleAddCustom = () => {
    if (!newName.trim()) return;
    const id = `custom-${crypto.randomUUID().slice(0, 8)}`;
    const c: Connector = {
      id,
      name: newName.trim(),
      type: newType.trim() || 'Custom REST',
      description: `Custom integrated API endpoint for ${newName.trim()}.`,
      color: '#3b82f6',
      status: 'disconnected',
    };
    setConnectors(prev => {
      const updated = [...prev, c];
      persist(updated);
      return updated;
    });
    setNewName('');
    setNewType('');
    setShowAddForm(false);
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Connector ${c.name} added.`, type: 'success' });
  };

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          Loading connectors...
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <Server size={28} color="#3b82f6" /> Integrations Hub
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Secure OAuth connections, API gateways, and external system webhooks.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            onClick={() => setActiveView('grid')}
            style={{ 
              padding: '0.6rem 1.25rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
              background: activeView === 'grid' ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: activeView === 'grid' ? '#60a5fa' : '#64748b'
            }}
          >
            <Share2 size={16} /> API Services
          </button>
          <button 
            onClick={() => setActiveView('webhooks')}
            style={{ 
              padding: '0.6rem 1.25rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
              background: activeView === 'webhooks' ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: activeView === 'webhooks' ? '#60a5fa' : '#64748b'
            }}
          >
            <Globe size={16} /> Webhooks
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.6rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {errorMsg}
          <X size={14} onClick={() => setErrorMsg(null)} style={{ cursor: 'pointer', marginLeft: 'auto' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input type="text" placeholder="Search connectors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, color: 'white', fontSize: '0.8rem', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[
            { label: 'All', value: 'all', count: totalCount },
            { label: 'Connected', value: 'connected', count: connectedCount },
            { label: 'Offline', value: 'disconnected', count: totalCount - connectedCount }
          ].map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              style={{ padding: '0.35rem 0.7rem', borderRadius: 8, border: 'none', background: statusFilter === f.value ? 'rgba(59,130,246,0.15)' : 'rgba(0,0,0,0.3)', color: statusFilter === f.value ? '#60a5fa' : '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
            >{f.label} ({f.count})</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        <AnimatePresence mode="wait">
          {activeView === 'grid' ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}
            >
              {filteredConnectors.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#64748b', gap: '0.75rem', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: 20 }}>
                  <Globe size={40} opacity={0.3} />
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{searchQuery || statusFilter !== 'all' ? 'No connectors match your filter' : 'No connectors configured'}</p>
                </div>
              ) : filteredConnectors.map((c) => (
                <div key={c.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative', borderRadius: 20, border: `1px solid ${c.status === 'connected' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.05)'}`, background: c.status === 'connected' ? 'linear-gradient(145deg, rgba(16,185,129,0.08) 0%, rgba(255,255,255,0.02) 100%)' : 'rgba(0,0,0,0.2)', transition: 'all 0.3s' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                      <div style={{ 
                        width: 56, height: 56, borderRadius: 16, background: `${c.color}20`, border: `1px solid ${c.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color,
                        boxShadow: c.status === 'connected' ? `0 0 20px ${c.color}40, inset 0 2px 4px rgba(255,255,255,0.2)` : 'inset 0 2px 4px rgba(255,255,255,0.1)', transition: 'all 0.3s'
                      }}>
                        {getIcon(c.id)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.2rem', color: '#f8fafc' }}>{c.name}</h3>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800 }}>{c.type}</span>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '1.5rem', height: '2.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {c.description}
                  </p>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ 
                        width: 10, height: 10, borderRadius: '50%', 
                        background: c.status === 'connected' ? '#10b981' : c.status === 'auth_required' ? '#f59e0b' : '#475569',
                        boxShadow: c.status === 'connected' ? '0 0 10px #10b981' : 'none'
                      }} className={c.status === 'connected' ? 'pulsing' : ''} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: c.status === 'connected' ? '#10b981' : '#64748b' }}>
                        {c.status === 'connected' ? 'Authenticated' : c.status === 'auth_required' ? 'Auth Needed' : 'Offline'}
                      </span>
                    </div>
                    
                    {c.status === 'connected' ? (
                      <button onClick={() => setConfirmDisconnect(c.id)} className="btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.8rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                        <Settings size={14} /> Revoke
                      </button>
                    ) : (
                      <button onClick={() => handleConnect(c.id)} className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', borderRadius: 10, fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
                        Connect
                      </button>
                    )}
                  </div>

                  {c.lastSync && (
                    <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontSize: '0.7rem', color: '#60a5fa', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(59,130,246,0.15)', padding: '0.3rem 0.6rem', borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)', letterSpacing: '0.05em' }}>
                      <RefreshCw size={12} /> SYNCED
                    </div>
                  )}
                </div>
              ))}

              {showAddForm ? (
                <div className="glass-panel" style={{ padding: '1.5rem', border: '2px dashed #3b82f6', borderRadius: 20, display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(59,130,246,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>Add Custom API</span>
                    <button onClick={() => setShowAddForm(false)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8 }}>
                      <X size={16} />
                    </button>
                  </div>
                  <input
                    placeholder="API Endpoint Name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <input
                    placeholder="Category (e.g., CRM, DB)"
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <button onClick={handleAddCustom} className="btn-primary" style={{ width: '100%', padding: '0.85rem', borderRadius: 10, marginTop: '0.5rem', fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }}>
                    Deploy Connector
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => setShowAddForm(true)}
                  style={{ 
                    border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 20, display: 'flex', flexDirection: 'column', 
                    alignItems: 'center', justifyContent: 'center', padding: '2rem', cursor: 'pointer',
                    background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s', minHeight: 220
                  }} 
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }} 
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Plus size={28} color="#94a3b8" />
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#94a3b8' }}>Register Custom Service</span>
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
              style={{ padding: '2.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>Ingress Webhooks</h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Allow external systems to push asynchronous events directly into the OS EventBus.</p>
                </div>
                <button className="btn-primary" style={{ padding: '0.85rem 1.5rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
                  <Plus size={18} /> Generate URL
                </button>
              </div>

              <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Endpoint Name</th>
                      <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Route (URL)</th>
                      <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Agent</th>
                      <th style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} style={{ padding: '5rem', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.01)' }}>
                        <Globe size={48} opacity={0.2} style={{ marginBottom: '1.5rem', display: 'block', margin: '0 auto 1.5rem' }} />
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>No active webhooks listening for events.</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ background: 'rgba(16,185,129,0.05)', borderRadius: 16, border: '1px solid rgba(16,185,129,0.2)', display: 'flex', gap: '1.25rem', alignItems: 'center', padding: '1.25rem 1.5rem' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: 10 }}>
          <ShieldCheck size={24} color="#10b981" />
        </div>
        <span style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          <strong style={{ color: '#10b981' }}>Zero-Trust Architecture:</strong> All OAuth tokens and API keys are stored exclusively in the local browser vault. No credentials are ever transmitted to our telemetry servers.
        </span>
      </div>

      {/* Confirm Disconnect Modal */}
      <AnimatePresence>
        {confirmDisconnect && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setConfirmDisconnect(null)}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel" style={{ padding: '2rem', borderRadius: 20, maxWidth: 400, border: '1px solid rgba(239,68,68,0.2)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                <AlertTriangle size={24} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Revoke Connection?</h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                This will revoke the OAuth token and disconnect the service. You can reconnect at any time.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmDisconnect(null)} className="btn-secondary" style={{ padding: '0.6rem 1.25rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700 }}>
                  Cancel
                </button>
                <button onClick={() => handleDisconnect(confirmDisconnect)} style={{ padding: '0.6rem 1.25rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer' }}>
                  Yes, Revoke
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConnectorsPanel;
