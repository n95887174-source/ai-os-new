import { genId } from '../../utils/gen-id';
import { storageAdapter } from '../../kernel/instances';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalShell } from '../ModalShell';
import { 
  Share2, MessageSquare, 
  FileText, Globe, Box, Plus, Settings, 
  RefreshCw, Layers,
  Mail, Send, Database, X, ShieldCheck,
  Server, Search, AlertTriangle
} from 'lucide-react';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { dexieDb } from '../../kernel/services/database-service';
import { useTranslation } from '../../i18n/useTranslation';
import type { Connector } from '../../types/domain';
import { getStatusColor } from '../Common/status-vocabulary';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { btnDangerLg, btnSecondaryLg, flexAlignCenterGap2 } from '../../styles/common';

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

function getConnectorStyle(status: string) {
  const color = getStatusColor(status);
  return {
    color,
    dotBg: color,
    dotShadow: status === 'connected' ? `0 0 10px ${color}` : 'none',
  };
}

const STAT_LABELS: Record<string, string> = {
  connected: 'connectors.status.authenticated',
  auth_required: 'connectors.status.auth_needed',
  disconnected: 'connectors.status.offline',
};

const generateId = (): string => genId();

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
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Автоочистка ошибки
  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setErrorMsg(null);
    }, 5000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const load = async () => {
      try {
        const count = await dexieDb.connectors.count();
        if (count > 0) {
          const saved = await dexieDb.connectors.toArray();
          if (isMountedRef.current) setConnectors(saved);
        } else {
          const stored = storageAdapter.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                await dexieDb.connectors.bulkPut(parsed);
                if (isMountedRef.current) setConnectors(parsed);
                storageAdapter.removeItem(STORAGE_KEY);
              } else {
                throw new Error('Invalid connector data');
              }
            } catch (e) {
              console.warn('[ConnectorsPanel] Failed to migrate connectors from localStorage:', e);
              await dexieDb.connectors.bulkPut(DEFAULT_CONNECTORS);
              if (isMountedRef.current) setConnectors(DEFAULT_CONNECTORS);
              if (isMountedRef.current) {
                setErrorMsg('Corrupted storage – using defaults');
                clearErrorAfterDelay();
              }
            }
          } else {
            await dexieDb.connectors.bulkPut(DEFAULT_CONNECTORS);
            if (isMountedRef.current) setConnectors(DEFAULT_CONNECTORS);
          }
        }
      } catch (e) {
        console.warn('[ConnectorsPanel] Failed to load connectors, using defaults:', e);
        if (isMountedRef.current) {
          setErrorMsg('Could not load connectors. Using default configuration.');
          clearErrorAfterDelay();
          setConnectors(DEFAULT_CONNECTORS);
        }
      } finally {
        if (isMountedRef.current) setLoaded(true);
      }
    };
    load();

    return () => {
      isMountedRef.current = false;
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, [clearErrorAfterDelay]);

  useEffect(() => {
    if (confirmDisconnect && modalRef.current) {
      const btn = modalRef.current.querySelector<HTMLButtonElement>('.connector-modal-actions button:last-child');
      btn?.focus();
    }
  }, [confirmDisconnect]);

  // Сохранение в базу с проверкой монтирования
  const persist = useCallback(async (updated: Connector[]) => {
    if (!isMountedRef.current) return;
    try {
      await dexieDb.connectors.bulkPut(updated);
    } catch (e) {
      console.warn('[ConnectorsPanel] Failed to save connectors:', e);
      if (isMountedRef.current) {
        setErrorMsg('Could not save connector changes.');
        clearErrorAfterDelay();
      }
    }
  }, [clearErrorAfterDelay]);

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

  const handleConnect = useCallback((id: string) => {
    if (!isMountedRef.current) return;
    setConnectors(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, status: 'connected' as const, lastSync: 'Just now' } : c);
      persist(updated);
      return updated;
    });
    eventBus.emit('system:notification', { message: `Simulated connection to ${id} API — real OAuth flow not yet implemented.`, type: 'info' });
  }, [persist]);

  const handleDisconnect = useCallback((id: string) => {
    if (!isMountedRef.current) return;
    setConnectors(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, status: 'disconnected' as const, lastSync: undefined } : c);
      persist(updated);
      return updated;
    });
    setConfirmDisconnect(null);
    eventBus.emit('system:notification', { message: `OAuth token for ${id} revoked.`, type: 'info' });
  }, [persist]);

  const handleAddCustom = useCallback(() => {
    if (!isMountedRef.current) return;
    if (!newName.trim()) {
      setErrorMsg(t('connectors.error_name'));
      clearErrorAfterDelay();
      return;
    }
    const id = `custom-${generateId().slice(0, 8)}`;
    const newConnector: Connector = {
      id,
      name: newName.trim(),
      type: newType.trim() || 'Custom REST',
      description: `Custom integrated API endpoint for ${newName.trim()}.`,
      color: '#3b82f6',
      status: 'disconnected',
    };
    setConnectors(prev => {
      const updated = [...prev, newConnector];
      persist(updated);
      return updated;
    });
    setNewName('');
    setNewType('');
    setShowAddForm(false);
    eventBus.emit('system:notification', { message: `Connector ${newConnector.name} added.`, type: 'success' });
  }, [newName, newType, persist, clearErrorAfterDelay]);

  const handleViewChange = useCallback((view: 'grid' | 'webhooks') => {
    setActiveView(view);
  }, []);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, view: 'grid' | 'webhooks') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleViewChange(view);
    }
  }, [handleViewChange]);

  if (!loaded) {
    return (
      <div className="connector-loader">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          {t('connectors.loading')}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="connector-wrapper">
      <div className="connector-header">
        <div className="connector-header-left">
          <h2 className="connector-heading">
            <Server size={28} color="#3b82f6" aria-hidden="true" /> {t('connectors.title')}
          </h2>
          <p className="connector-subtitle">{t('connectors.subtitle')}</p>
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
            <Share2 size={16} aria-hidden="true" /> {t('connectors.tab.api')}
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
            <Globe size={16} aria-hidden="true" /> {t('connectors.tab.webhooks')}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="connector-error" role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> {errorMsg}
          <X size={14} onClick={() => setErrorMsg(null)} className="connector-error-close" aria-label={t('common.dismiss_error')} />
        </div>
      )}

      <div className="connector-controls">
        <div className="connector-search-wrapper">
          <Search size={14} className="connector-search-icon" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('connectors.search_placeholder')}
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
                  <Globe size={40} opacity={0.3} aria-hidden="true" />
                  <p>{searchQuery || statusFilter !== 'all' ? t('connectors.empty_filter') : t('connectors.empty_none')}</p>
                </div>
              ) : filteredConnectors.map((c) => {
                const sc = getConnectorStyle(c.status);
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
                      <div style={flexAlignCenterGap2}>
                        <div className="connector-status-dot" style={{ background: sc.dotBg, boxShadow: sc.dotShadow }} />
                        <span className="connector-status-label" style={{ color: sc.color }}>
                          {t(STAT_LABELS[c.status] || 'connectors.status.offline')}
                        </span>
                      </div>
                      
                      {c.status === 'connected' ? (
                        <button onClick={() => setConfirmDisconnect(c.id)} className="btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.8rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }} aria-label={t('connectors.revoke_aria').replace('{0}', c.name)}>
                          <Settings size={14} aria-hidden="true" /> {t('connectors.revoke')}
                        </button>
                      ) : (
                        <button onClick={() => handleConnect(c.id)} className="btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', borderRadius: 10, fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }} aria-label={t('connectors.connect_aria').replace('{0}', c.name)}>
                          {t('connectors.connect')}
                        </button>
                      )}
                    </div>

                    {c.lastSync && (
                      <div className="connector-sync-badge">
                        <RefreshCw size={12} aria-hidden="true" /> {t('connectors.card.synced')}
                      </div>
                    )}
                  </div>
                );
              })}

              {showAddForm ? (
                <div className="connector-form-card">
                  <div className="connector-form-header">
                    <span className="connector-form-title">{t('connectors.form_title')}</span>
                    <button onClick={() => setShowAddForm(false)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8 }} aria-label={t('connectors.close_form_aria')}>
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <input
                    placeholder={t('connectors.name_placeholder')}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="connector-input"
                    aria-label="API endpoint name"
                  />
                  <input
                    placeholder={t('connectors.category_placeholder')}
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                    className="connector-input"
                    aria-label="Connector category"
                  />
                  <button onClick={handleAddCustom} className="btn-primary" style={{ width: '100%', padding: '0.85rem', borderRadius: 10, marginTop: '0.5rem', fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }}>
                    {t('connectors.deploy')}
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setShowAddForm(true)}
                  className="connector-add-card"
                  role="button"
                  tabIndex={0}
                  aria-label={t('connectors.register_aria')}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowAddForm(true); } }}
                >
                  <div className="connector-add-icon-box">
                    <Plus size={28} color="#94a3b8" aria-hidden="true" />
                  </div>
                  <span className="connector-add-label">{t('connectors.register_button')}</span>
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
                  <h3 className="connector-webhooks-title">{t('connectors.webhooks_heading')}</h3>
                  <p className="connector-webhooks-subtitle">Allow external systems to push asynchronous events directly into the OS EventBus.</p>
                </div>
                <button className="btn-primary" onClick={() => { eventBus.emit(EVENTS.NOTIFICATION, { message: 'Webhook URL generation coming soon', type: 'info' }); }} style={{ padding: '0.85rem 1.5rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
                  <Plus size={18} aria-hidden="true" /> Generate URL
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
                          <Globe size={48} className="connector-empty-icon" aria-hidden="true" />
                          <div className="connector-empty-label">{t('connectors.webhooks_empty')}</div>
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
          <ShieldCheck size={24} color="#10b981" aria-hidden="true" />
        </div>
        <span className="connector-security-text">
          <strong style={{ color: '#10b981' }}>Zero-Trust Architecture:</strong> All OAuth tokens and API keys are stored exclusively in the local browser vault. No credentials are ever transmitted to our telemetry servers.
        </span>
      </div>

      <ModalShell open={confirmDisconnect !== null} onClose={() => setConfirmDisconnect(null)} width={420}>
        <div ref={modalRef}>
          <div className="connector-modal-header">
            <AlertTriangle size={24} color="#ef4444" aria-hidden="true" />
            <h3 className="connector-modal-title">Revoke Connection?</h3>
          </div>
          <p className="connector-modal-body">
            This will revoke the OAuth token and disconnect the service. You can reconnect at any time.
          </p>
          <div className="connector-modal-actions">
            <button onClick={() => setConfirmDisconnect(null)} className="btn-secondary" style={btnSecondaryLg}>
              {t('common.cancel')}
            </button>
            <button onClick={() => confirmDisconnect && handleDisconnect(confirmDisconnect)} style={btnDangerLg}>
              Yes, Revoke
            </button>
          </div>
        </div>
      </ModalShell>
      <ModuleInfo moduleKey="connectors" />
    </div>
  );
};

export default ConnectorsPanel;
