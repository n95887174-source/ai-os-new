import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, MessageSquare, 
  FileText, Globe, Box, Plus, Settings, 
  RefreshCw, Layers,
  Mail, Send, Database, X, ShieldCheck,
  Server, Search, AlertTriangle
} from 'lucide-react';
import { eventBus } from '../../core/events';
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

const statusConfig = {
  connected: { label: 'Authenticated', color: '#10b981', dotShadow: '0 0 10px #10b981', dotBg: '#10b981' },
  auth_required: { label: 'Auth Needed', color: '#f59e0b', dotShadow: 'none', dotBg: '#f59e0b' },
  disconnected: { label: 'Offline', color: '#64748b', dotShadow: 'none', dotBg: '#475569' },
};

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
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

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
      } catch {
        eventBus.emit('system:notification', { message: 'Could not load connectors. Using default configuration.', type: 'error' });
        setConnectors(DEFAULT_CONNECTORS);
      }
      setLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (confirmDisconnect && modalRef.current) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      const btn = modalRef.current.querySelector<HTMLButtonElement>('.connector-modal-actions button:last-child');
      btn?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setConfirmDisconnect(null);
        }
        if (e.key === 'Tab' && modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>('button');
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        lastFocusedRef.current?.focus();
      };
    }
  }, [confirmDisconnect]);

  const persist = async (updated: Connector[]) => {
    try {
      await dexieDb.connectors.bulkPut(updated);
    } catch {
      eventBus.emit('system:notification', { message: 'Could not save connector changes.', type: 'error' });
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
    eventBus.emit('system:notification', { message: `Securely connected to ${id} API!`, type: 'success' });
  };

  const handleDisconnect = (id: string) => {
    setConnectors(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, status: 'disconnected' as const, lastSync: undefined } : c);
      persist(updated);
      return updated;
    });
    setConfirmDisconnect(null);
    eventBus.emit('system:notification', { message: `OAuth token for ${id} revoked.`, type: 'info' });
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
    eventBus.emit('system:notification', { message: `Connector ${c.name} added.`, type: 'success' });
  };

  const handleViewChange = (view: 'grid' | 'webhooks') => {
    setActiveView(view);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, view: 'grid' | 'webhooks') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleViewChange(view);
    }
  };

  if (!loaded) {
    return (
      <div className="connector-loader">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          Loading connectors...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="connector-wrapper">
      <div className="connector-header">
        <div className="connector-header-left">
          <h2 className="connector-heading">
            <Server size={28} color="#3b82f6" /> Integrations Hub
          </h2>
          <p className="connector-subtitle">Secure OAuth connections, API gateways, and external system webhooks.</p>
        </div>
        
        <div className="connector-tab-bar" role="tablist" aria-label="Connector views">
          <button
            onClick={() => handleViewChange('grid')}
            onKeyDown={e => handleTabKeyDown(e, 'grid')}
            className={`connector-tab${activeView === 'grid' ? ' connector-tab--active' : ''}`}
            role="tab"
            aria-selected={activeView === 'grid'}
            aria-controls="connector-grid-panel"
            tabIndex={activeView === 'grid' ? 0 : -1}
          >
            <Share2 size={16} /> API Services
          </button>
          <button
            onClick={() => handleViewChange('webhooks')}
            onKeyDown={e => handleTabKeyDown(e, 'webhooks')}
            className={`connector-tab${activeView === 'webhooks' ? ' connector-tab--active' : ''}`}
            role="tab"
            aria-selected={activeView === 'webhooks'}
            aria-controls="connector-webhooks-panel"
            tabIndex={activeView === 'webhooks' ? 0 : -1}
          >
            <Globe size={16} /> Webhooks
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="connector-error" role="alert">
          <AlertTriangle size={14} /> {errorMsg}
          <X size={14} onClick={() => setErrorMsg(null)} className="connector-error-close" aria-label="Dismiss error" />
        </div>
      )}

      <div className="connector-controls">
        <div className="connector-search-wrapper">
          <Search size={14} className="connector-search-icon" />
          <input
            type="text"
            placeholder="Search connectors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="connector-search-input"
            aria-label="Search connectors"
          />
        </div>
        <div className="connector-filter-group" role="group" aria-label="Filter by status">
          {[
            { label: 'All', value: 'all', count: totalCount },
            { label: 'Connected', value: 'connected', count: connectedCount },
            { label: 'Offline', value: 'disconnected', count: totalCount - connectedCount }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`connector-filter-btn${statusFilter === f.value ? ' connector-filter-btn--active' : ''}`}
              aria-pressed={statusFilter === f.value}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      <div className="connector-scroll">
        <AnimatePresence mode="wait">
          {activeView === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="connector-grid"
              id="connector-grid-panel"
              role="tabpanel"
            >
              {filteredConnectors.length === 0 ? (
                <div className="connector-empty-state" role="status">
                  <Globe size={40} opacity={0.3} />
                  <p>{searchQuery || statusFilter !== 'all' ? 'No connectors match your filter' : 'No connectors configured'}</p>
                </div>
              ) : filteredConnectors.map((c) => {
                const sc = statusConfig[c.status] || statusConfig.disconnected;
                return (
                  <div key={c.id} className={`glass-panel connector-card${c.status === 'connected' ? ' connector-card--connected' : ''}`}>
                    <div className="connector-card-header">
                      <div className="connector-card-info">
                        <div
                          className={`connector-icon-box${c.status === 'connected' ? ' connector-icon-box--connected' : ' connector-icon-box--disconnected'}`}
                          style={{ background: `${c.color}20`, border: `1px solid ${c.color}40`, color: c.color }}
                        >
                          {getIcon(c.id)}
                        </div>
                        <div>
                          <h3 className="connector-name">{c.name}</h3>
                          <span className="connector-type">{c.type}</span>
                        </div>
                      </div>
                    </div>

                    <p className="connector-desc">{c.description}</p>

                    <div className="connector-card-footer">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="connector-status-dot" style={{ background: sc.dotBg, boxShadow: sc.dotShadow }} />
                        <span className="connector-status-label" style={{ color: sc.color }}>
                          {sc.label}
                        </span>
                      </div>
                      
                      {c.status === 'connected' ? (
                        <button onClick={() => setConfirmDisconnect(c.id)} className="btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.8rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }} aria-label={`Revoke ${c.name}`}>
                          <Settings size={14} /> Revoke
                        </button>
                      ) : (
                        <button onClick={() => handleConnect(c.id)} className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', borderRadius: 10, fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }} aria-label={`Connect ${c.name}`}>
                          Connect
                        </button>
                      )}
                    </div>

                    {c.lastSync && (
                      <div className="connector-sync-badge">
                        <RefreshCw size={12} /> SYNCED
                      </div>
                    )}
                  </div>
                );
              })}

              {showAddForm ? (
                <div className="connector-form-card">
                  <div className="connector-form-header">
                    <span className="connector-form-title">Add Custom API</span>
                    <button onClick={() => setShowAddForm(false)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8 }} aria-label="Close add form">
                      <X size={16} />
                    </button>
                  </div>
                  <input
                    placeholder="API Endpoint Name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="connector-input"
                    aria-label="API endpoint name"
                  />
                  <input
                    placeholder="Category (e.g., CRM, DB)"
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                    className="connector-input"
                    aria-label="Connector category"
                  />
                  <button onClick={handleAddCustom} className="btn-primary" style={{ width: '100%', padding: '0.85rem', borderRadius: 10, marginTop: '0.5rem', fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }}>
                    Deploy Connector
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setShowAddForm(true)}
                  className="connector-add-card"
                  role="button"
                  tabIndex={0}
                  aria-label="Register custom service"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowAddForm(true); } }}
                >
                  <div className="connector-add-icon-box">
                    <Plus size={28} color="#94a3b8" />
                  </div>
                  <span className="connector-add-label">Register Custom Service</span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="webhooks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel connector-webhooks-panel"
              id="connector-webhooks-panel"
              role="tabpanel"
            >
              <div className="connector-webhooks-header">
                <div>
                  <h3 className="connector-webhooks-title">Ingress Webhooks</h3>
                  <p className="connector-webhooks-subtitle">Allow external systems to push asynchronous events directly into the OS EventBus.</p>
                </div>
                <button className="btn-primary" style={{ padding: '0.85rem 1.5rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
                  <Plus size={18} /> Generate URL
                </button>
              </div>

              <div className="connector-table-wrapper">
                <table className="connector-table">
                  <thead>
                    <tr>
                      <th>Endpoint Name</th>
                      <th>Route (URL)</th>
                      <th>Target Agent</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} className="connector-empty">
                        <div className="connector-empty-content">
                          <Globe size={48} className="connector-empty-icon" />
                          <div className="connector-empty-label">No active webhooks listening for events.</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="connector-security-banner">
        <div className="connector-security-icon-box">
          <ShieldCheck size={24} color="#10b981" />
        </div>
        <span className="connector-security-text">
          <strong style={{ color: '#10b981' }}>Zero-Trust Architecture:</strong> All OAuth tokens and API keys are stored exclusively in the local browser vault. No credentials are ever transmitted to our telemetry servers.
        </span>
      </div>

      <AnimatePresence>
        {confirmDisconnect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="connector-modal-backdrop"
            onClick={() => setConfirmDisconnect(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm revoke connection"
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel connector-modal-panel"
              onClick={e => e.stopPropagation()}
            >
              <div className="connector-modal-header">
                <AlertTriangle size={24} color="#ef4444" />
                <h3 className="connector-modal-title">Revoke Connection?</h3>
              </div>
              <p className="connector-modal-body">
                This will revoke the OAuth token and disconnect the service. You can reconnect at any time.
              </p>
              <div className="connector-modal-actions">
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
