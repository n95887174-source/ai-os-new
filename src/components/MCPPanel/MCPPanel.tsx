import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalShell } from '../ModalShell';
import {
  Plus, Trash2, Search, AlertTriangle,
  X, Plug, PlugZap, Server, Wrench, FileText, RefreshCw, Power, PowerOff
} from 'lucide-react';
import { mcpService, type MCPServerConfig, type MCPTool, type MCPResource } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { getStatusColor } from '../Common/status-vocabulary';

const MCPPanel: React.FC = () => {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingServer, setEditingServer] = useState<Partial<MCPServerConfig> | null>(null);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [serverTools, setServerTools] = useState<Record<string, MCPTool[]>>({});
  const [serverResources, setServerResources] = useState<Record<string, MCPResource[]>>({});
  const [loadingTools, setLoadingTools] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [_connectingId, setConnectingId] = useState<string | null>(null);

  const { t } = useTranslation();
  const isMountedRef = useRef(true);

  const clearError = useAutoClearError(setError);

  useEffect(() => {
    isMountedRef.current = true;
    setServers(mcpService.getServers() ?? []);
    return () => { isMountedRef.current = false; };
  }, []);

  const stats = (() => { try { return mcpService.getConnectionStats(); } catch { return null; } })();

  const handleConnect = async (id: string) => {
    setConnectingId(id);
    try {
      await mcpService.connect(id);
      setServers(mcpService.getServers());
    } catch (err) {
      setServers(mcpService.getServers());
      setError(`${t('mcp.error_connect')}: ${err instanceof Error ? err.message : String(err)}`);
      clearError();
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    setConnectingId(id);
    try {
      await mcpService.disconnect(id);
      setServers(mcpService.getServers());
    } finally {
      setConnectingId(null);
    }
  };

  const handleReconnectAll = async () => {
    try {
      const count = await mcpService.reconnectAll();
      setServers(mcpService.getServers());
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Reconnected ${count} server(s)`, type: 'success' });
    } catch (err) {
      setError(t('mcp.error_reconnect'));
      clearError();
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedServer === id) {
      setExpandedServer(null);
      return;
    }
    setExpandedServer(id);
    const server = servers.find(s => s.id === id);
    if (!server) return;

    if (!serverTools[id]) {
      setLoadingTools(prev => ({ ...prev, [id]: true }));
      try {
        const [tools, resources] = await Promise.all([
          mcpService.listTools(id),
          mcpService.listResources(id),
        ]);
        if (isMountedRef.current) {
          setServerTools(prev => ({ ...prev, [id]: tools }));
          setServerResources(prev => ({ ...prev, [id]: resources }));
        }
      } catch (err) {
        setError(t('mcp.error_load'));
        clearError();
      } finally {
        if (isMountedRef.current) setLoadingTools(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const filteredServers = (servers ?? []).filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusLabel = (status: string) => {
    switch (status) {
      case 'connected': return t('mcp.status.connected');
      case 'disconnected': return t('mcp.status.disconnected');
      case 'error': return t('mcp.status.error');
      default: return t('mcp.status.unknown');
    }
  };

  return (
    <div style={{ color: 'var(--text-main)', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <Server size={28} color="#a855f7" /> {t('mcp.title')}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('mcp.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleReconnectAll} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.25rem', borderRadius: 12, fontWeight: 700, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer' }}>
            <RefreshCw size={18} /> {t('mcp.reconnect_all')}
          </button>
          <button onClick={() => setEditingServer({})} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.5rem', background: 'linear-gradient(90deg, #a855f7, #9333ea)', border: 'none', color: 'white', borderRadius: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(168,85,247,0.3)' }}>
            <Plus size={18} /> {t('mcp.add')}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: '0.9rem' }} role="alert">
            <AlertTriangle size={18} /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }} aria-label={t('common.dismiss_error')}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {stats && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: t('mcp.stats.total'), value: stats.total, color: '#a855f7', icon: <Server size={20} /> },
          { label: t('mcp.stats.connected'), value: stats.connected, color: '#10b981', icon: <Power size={20} /> },
          { label: t('mcp.stats.disconnected'), value: stats.disconnected, color: '#64748b', icon: <PowerOff size={20} /> },
          { label: t('mcp.stats.errors'), value: stats.error, color: '#ef4444', icon: <AlertTriangle size={20} /> },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.5rem', color: stat.color }}>{stat.icon}<span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>{stat.label}</span></div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{stat.value}</div>
          </div>
        ))}
      </div>
      )}

      <div style={{ position: 'relative', width: '100%', maxWidth: 450 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input type="text" placeholder={t('mcp.search_placeholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: 'white', fontSize: '0.9rem', outline: 'none' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredServers.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: '100%', color: '#64748b' }}>
            <Server size={48} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{searchQuery ? t('mcp.empty_search') : t('mcp.empty_none')}</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{t('mcp.empty_desc')}</p>
          </div>
        ) : (
          filteredServers.map(server => (
            <div key={server.id} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 1.5rem', cursor: 'pointer' }}
                onClick={() => toggleExpand(server.id)}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: getStatusColor(server.status), flexShrink: 0, boxShadow: `0 0 8px ${getStatusColor(server.status)}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{server.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>{server.url}</div>
                </div>
                <div style={{ padding: '0.3rem 0.6rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: `${getStatusColor(server.status)}15`, border: `1px solid ${getStatusColor(server.status)}30`, color: getStatusColor(server.status) }}>
                  {statusLabel(server.status)}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {server.status !== 'connected' ? (
                    <button onClick={e => { e.stopPropagation(); handleConnect(server.id); }}
                      style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', cursor: 'pointer' }}>
                      <Plug size={16} />
                    </button>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); handleDisconnect(server.id); }}
                      style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#94a3b8', cursor: 'pointer' }}>
                      <PlugZap size={16} />
                    </button>
                  )}
                  <button onClick={e => { e.stopPropagation(); setEditingServer(server); }}
                    style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer' }}>
                    <Wrench size={16} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); if (window.confirm(`Remove server "${server.name}"?`)) { mcpService.removeServer(server.id); setServers(mcpService.getServers()); } }}
                    style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {expandedServer === server.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem' }}>
                    {server.error && (
                      <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        {t('mcp.error_prefix')} {server.error}
                      </div>
                    )}
                    {server.lastConnected && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
                        Last connected: {new Date(server.lastConnected).toLocaleString()}
                      </div>
                    )}
                    {loadingTools[server.id] ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{t('mcp.loading_capabilities')}</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase' }}>
                            <Wrench size={14} color="#3b82f6" /> Tools ({serverTools[server.id]?.length || 0})
                          </h4>
                          {serverTools[server.id]?.length > 0 ? serverTools[server.id].map(tool => (
                            <div key={tool.name} style={{ padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', marginBottom: '0.5rem' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>{tool.name}</div>
                              {tool.description && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{tool.description}</div>}
                            </div>
                          )) : (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>{t('mcp.no_tools')}</div>
                          )}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase' }}>
                            <FileText size={14} color="#10b981" /> Resources ({serverResources[server.id]?.length || 0})
                          </h4>
                          {serverResources[server.id]?.length > 0 ? serverResources[server.id].map(res => (
                            <div key={res.uri} style={{ padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', marginBottom: '0.5rem' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.25rem' }}>{res.name}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>{res.uri}</div>
                              {res.description && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{res.description}</div>}
                            </div>
                          )) : (
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>{t('mcp.no_resources')}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      <ModalShell open={editingServer !== null} onClose={() => setEditingServer(null)}>
        {(() => {
          const editing = editingServer;
          if (!editing) return null;
          return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                {editing.id ? t('mcp.edit_title') : t('mcp.add_title')}
              </h3>
              <button onClick={() => setEditingServer(null)} style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Server Name</label>
                <input type="text" value={editing.name || ''} onChange={e => setEditingServer({ ...editing, name: e.target.value })}
                  style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none', fontSize: '0.9rem' }}
                  placeholder={t('mcp.name_placeholder')} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Server URL</label>
                <input type="text" value={editing.url || ''} onChange={e => setEditingServer({ ...editing, url: e.target.value })}
                  style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', outline: 'none', fontSize: '0.9rem', fontFamily: 'monospace' }}
                  placeholder={t('mcp.url_placeholder')} />
              </div>
              {editing.id && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Server ID</label>
                  <div style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#64748b', fontSize: '0.85rem', fontFamily: 'monospace' }}>{editing.id}</div>
                </div>
              )}
            </div>
            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setEditingServer(null)} style={{ padding: '0.8rem 1.5rem', borderRadius: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer' }}>{t('mcp.cancel')}</button>
              <button onClick={() => {
                if (!editing.name || !editing.url) return;
                try {
                  if (editing.id) {
                    mcpService.updateServer(editing.id, { name: editing.name, url: editing.url });
                  } else {
                    mcpService.addServer({ id: `mcp-${crypto.randomUUID().slice(0, 8)}`, name: editing.name, url: editing.url });
                  }
                  setEditingServer(null);
                  setServers(mcpService.getServers());
                } catch (err) {
                  setError(`Failed to save server: ${err instanceof Error ? err.message : String(err)}`);
                  clearError();
                }
              }} style={{ padding: '0.8rem 2rem', borderRadius: 12, fontWeight: 800, background: 'linear-gradient(90deg, #a855f7, #9333ea)', border: 'none', color: 'white', cursor: 'pointer' }}>
                {editing.id ? t('mcp.update') : t('mcp.add_server')}
              </button>
            </div>
          </div>
        )})()}
      </ModalShell>
      <ModuleInfo moduleKey="mcp" />
    </div>
  );
};

export default MCPPanel;
