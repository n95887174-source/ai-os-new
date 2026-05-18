import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, Search, Trash2, 
  MessageCircle, Hash, ExternalLink, 
  BarChart3, Clock, Download, Upload,
  History, LayoutDashboard, Share2, AlertCircle, Trash,
  X, CheckSquare, Square, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../stores/useChatStore';
import { eventBus, EVENTS } from '../../core/events';

type FilterType = 'all' | 'recent' | 'today' | 'week' | 'month';
type MessageFilter = 'all' | 'short' | 'medium' | 'long';

interface SessionPreview {
  title: string;
  history: Array<{
    text: string;
    responses: Array<{ provider: string; content: string }>;
  }>;
}

const ChatAdminPanel: React.FC = () => {
  const { sessions, deleteSession, setActiveSessionId, importSessions } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [messageFilter, setMessageFilter] = useState<MessageFilter>('all');
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [previewSession, setPreviewSession] = useState<SessionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportSessions = () => {
    const data = JSON.stringify(sessions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSessions = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          importSessions(imported);
          eventBus.emit(EVENTS.NOTIFICATION, { message: `Successfully imported ${imported.length} session(s)`, type: 'success' });
        }
      } catch (e) {
        console.warn('[ChatAdminPanel] Failed to parse imported file:', e);
        eventBus.emit(EVENTS.NOTIFICATION, { message: 'Failed to parse the imported file. Please check the JSON format.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteSelectedSessions = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedSessionIds.length} session(s)?`)) {
      selectedSessionIds.forEach(id => deleteSession(id));
      setSelectedSessionIds([]);
    }
  };

  const handleDeleteAllSessions = () => {
    if (window.confirm('Are you sure you want to delete ALL chat sessions?')) {
      sessions.forEach(session => deleteSession(session.id));
      setSelectedSessionIds([]);
    }
  };

  const toggleSessionSelection = (id: string) => {
    setSelectedSessionIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleAllSessions = () => {
    if (selectedSessionIds.length === filteredSessions.length) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(filteredSessions.map(s => s.id));
    }
  };

  const [todayStart] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const [filterTimestamp] = useState(() => Date.now());

  const stats = useMemo(() => {
    const totalMessages = sessions.reduce((acc, s) => acc + s.history.length, 0);
    const totalResponses = sessions.reduce((acc, s) => acc + s.history.reduce((a, e) => a + e.responses.length, 0), 0);
    const avgMessages = sessions.length > 0 ? (totalMessages / sessions.length).toFixed(1) : '0';
    
    return {
      totalSessions: sessions.length,
      totalMessages,
      totalResponses,
      avgMessages
    };
  }, [sessions]);

  const filteredSessions = (() => {
    let result = sessions.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterType === 'recent') {
      result = [...result].sort((a, b) => b.updatedAt - a.updatedAt);
    } else if (filterType === 'today') {
      result = result.filter(s => s.updatedAt >= todayStart);
    } else if (filterType === 'week') {
      const weekAgo = filterTimestamp - 7 * 24 * 60 * 60 * 1000;
      result = result.filter(s => s.updatedAt >= weekAgo);
    } else if (filterType === 'month') {
      const monthAgo = filterTimestamp - 30 * 24 * 60 * 60 * 1000;
      result = result.filter(s => s.updatedAt >= monthAgo);
    }

    if (messageFilter === 'short') {
      result = result.filter(s => s.history.length <= 3);
    } else if (messageFilter === 'medium') {
      result = result.filter(s => s.history.length > 3 && s.history.length <= 10);
    } else if (messageFilter === 'long') {
      result = result.filter(s => s.history.length > 10);
    }

    return result;
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 16, color: '#f8fafc' }}>
            <LayoutDashboard size={36} color="#3b82f6" /> Conversation History Admin
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '1rem' }}>Manage all active threads, review past cognitive workflows, and clear agent memory.</p>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '1rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, color: '#fca5a5', fontSize: '1rem' }}
          >
            <AlertCircle size={24} /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        {[
          { label: 'Total Sessions', value: stats.totalSessions, icon: <MessageSquare size={28} color="#3b82f6" />, bg: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(0,0,0,0) 100%)', border: 'rgba(59,130,246,0.3)' },
          { label: 'Total Prompts Executed', value: stats.totalMessages, icon: <History size={28} color="#10b981" />, bg: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(0,0,0,0) 100%)', border: 'rgba(16,185,129,0.3)' },
          { label: 'AI Responses Generated', value: stats.totalResponses, icon: <MessageCircle size={28} color="#a855f7" />, bg: 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(0,0,0,0) 100%)', border: 'rgba(168,85,247,0.3)' },
          { label: 'Avg Turns / Session', value: stats.avgMessages, icon: <BarChart3 size={28} color="#f59e0b" />, bg: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(0,0,0,0) 100%)', border: 'rgba(245,158,11,0.3)' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel" style={{ background: stat.bg, padding: '1.75rem', borderRadius: 20, border: `2px solid ${stat.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>{stat.icon}</div>
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f8fafc' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem', borderRadius: 20, overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', paddingBottom: '1.75rem', borderBottom: '2px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 300 }}>
                <Search style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={20} aria-hidden="true" />
                <input 
                  type="text" 
                  placeholder="Search context or titles..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ padding: '1rem 1.25rem 1rem 3.5rem', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 14, color: 'white', fontSize: '1rem', width: '100%', outline: 'none', transition: 'border 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  aria-label="Search chat sessions"
                />
              </div>
              <select 
                value={filterType}
                onChange={e => setFilterType(e.target.value as FilterType)}
                style={{ padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#e2e8f0', fontSize: '1rem', outline: 'none', cursor: 'pointer', minWidth: 160 }}
                aria-label="Filter sessions by date"
              >
                <option value="all">All Records</option>
                <option value="recent">Sort by Recent</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
              <select 
                value={messageFilter}
                onChange={e => setMessageFilter(e.target.value as MessageFilter)}
                style={{ padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#e2e8f0', fontSize: '1rem', outline: 'none', cursor: 'pointer', minWidth: 160 }}
                aria-label="Filter sessions by message length"
              >
                <option value="all">All Lengths</option>
                <option value="short">Short (≤3 msgs)</option>
                <option value="medium">Medium (4-10 msgs)</option>
                <option value="long">Long (&gt;10 msgs)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14, fontSize: '1rem' }} aria-label="Import chat sessions from JSON file">
              <Upload size={20} /> Import JSON
            </button>
            <button onClick={handleExportSessions} className="btn-secondary" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14, fontSize: '1rem' }} aria-label="Export chat sessions to JSON file">
              <Download size={20} /> Export JSON
            </button>
            {selectedSessionIds.length > 0 && (
              <button onClick={handleDeleteSelectedSessions} className="btn-secondary" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14, fontSize: '1rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} aria-label={`Delete ${selectedSessionIds.length} selected chat sessions`}>
                <Trash size={20} /> Delete {selectedSessionIds.length}
              </button>
            )}
            <button onClick={handleDeleteAllSessions} className="btn-secondary" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14, fontSize: '1rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} aria-label="Delete all chat sessions">
              <Trash2 size={20} /> Delete All
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.75rem' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '0 1.25rem 0.75rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={toggleAllSessions} role="button" aria-label="Toggle select all sessions">
                    {selectedSessionIds.length === filteredSessions.length && filteredSessions.length > 0 ? <CheckSquare size={18} color="#3b82f6" aria-hidden="true" /> : <Square size={18} color="#64748b" aria-hidden="true" />}
                    Select All
                  </div>
                </th>
                <th style={{ padding: '0 1.25rem 0.75rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Details</th>
                <th style={{ padding: '0 1.25rem 0.75rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stats</th>
                <th style={{ padding: '0 1.25rem 0.75rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Activity</th>
                <th style={{ padding: '0 1.25rem 0.75rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredSessions.map((session) => (
                  <motion.tr 
                    key={session.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{ background: selectedSessionIds.includes(session.id) ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = selectedSessionIds.includes(session.id) ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = selectedSessionIds.includes(session.id) ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)'}
                  >
                    <td style={{ padding: '1.25rem', borderRadius: '16px 0 0 16px' }}>
                      <div style={{ cursor: 'pointer' }} onClick={() => toggleSessionSelection(session.id)} role="button" aria-label={`Toggle selection for session ${session.title}`}>
                        {selectedSessionIds.includes(session.id) ? <CheckSquare size={20} color="#3b82f6" aria-hidden="true" /> : <Square size={20} color="#64748b" aria-hidden="true" />}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.15)', borderRadius: 14 }}>
                          <MessageSquare size={24} color="#3b82f6" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem', marginBottom: 6 }}>
                            {session.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                            <Hash size={12} /> {session.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#94a3b8', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 1rem', borderRadius: 10 }}>
                          <History size={16} color="#10b981" /> {session.history.length} Prompts
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.95rem', color: '#94a3b8', background: 'rgba(0,0,0,0.25)', padding: '0.5rem 1rem', borderRadius: 10 }}>
                          <Share2 size={16} color="#a855f7" /> 
                          {session.history.reduce((acc, h) => acc + h.responses.length, 0)} Responses
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem', color: '#94a3b8', fontSize: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={18} />
                        {new Date(session.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem', textAlign: 'right', borderRadius: '0 16px 16px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button onClick={() => setPreviewSession(session)} className="btn-secondary" style={{ padding: '0.75rem', borderRadius: 12, fontSize: '0.95rem' }} title="Preview Session" aria-label={`Preview session ${session.title}`}>
                          <Eye size={20} aria-hidden="true" />
                        </button>
                        <button onClick={() => { setActiveSessionId(session.id); document.getElementById('chat-tab')?.click(); }} className="btn-secondary" style={{ padding: '0.75rem', borderRadius: 12, fontSize: '0.95rem' }} title="Open in Terminal" aria-label={`Open session ${session.title} in chat`}>
                          <ExternalLink size={20} aria-hidden="true" />
                        </button>
                        <button onClick={() => deleteSession(session.id)} className="btn-secondary" style={{ padding: '0.75rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', borderRadius: 12, fontSize: '0.95rem' }} title="Delete Thread" aria-label={`Delete session ${session.title}`}>
                          <Trash2 size={20} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredSessions.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 0', color: '#64748b', gap: '1.5rem' }}>
              <MessageSquare size={64} opacity={0.2} />
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>No conversations found</div>
              <p style={{ margin: 0, fontSize: '1rem' }}>Try adjusting your search filters or start a new cognitive workflow.</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewSession && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }} role="dialog" aria-modal="true" aria-labelledby="preview-modal-title">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-panel"
              style={{ width: '100%', maxWidth: 900, maxHeight: '80vh', overflow: 'auto', borderRadius: 24, padding: '2rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 id="preview-modal-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>{previewSession.title}</h3>
                <button onClick={() => setPreviewSession(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }} aria-label="Close preview modal"><X size={28} aria-hidden="true" /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {previewSession.history.map((entry, i: number) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: 16 }}>
                    <div style={{ fontWeight: 700, color: '#3b82f6', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Prompt:</div>
                    <div style={{ color: '#e2e8f0', marginBottom: '1rem', fontSize: '1rem' }}>{entry.text}</div>
                    {entry.responses.map((res, j: number) => (
                      <div key={j} style={{ background: 'rgba(16,185,129,0.05)', padding: '1rem', borderRadius: 12, marginTop: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Response ({res.provider}):</div>
                        <div style={{ color: '#e2e8f0', fontSize: '1rem' }}>{res.content}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".json" 
        style={{ display: 'none' }} 
        onChange={handleImportSessions} 
      />
    </div>
  );
};

export default ChatAdminPanel;
