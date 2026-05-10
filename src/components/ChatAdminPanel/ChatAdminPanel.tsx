import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, Search, Trash2, 
  MessageCircle, Hash, ExternalLink, 
  BarChart3, Clock, Download,
  History, LayoutDashboard, Share2, AlertCircle, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../stores/useChatStore';

const ChatAdminPanel: React.FC = () => {
  const { sessions, deleteSession, setActiveSessionId } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'recent'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(false);
  }, []);

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

  const filteredSessions = useMemo(() => {
    let result = sessions.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterType === 'recent') {
      result = [...result].sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return result;
  }, [sessions, searchQuery, filterType]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <LayoutDashboard size={28} color="#3b82f6" /> Conversation History
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Manage all active threads, review past cognitive workflows, and clear agent memory.</p>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: '0.9rem' }}
          >
            <AlertCircle size={18} /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>X</button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#94a3b8', flex: 1 }}>
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Loader2 size={20} className="spin" /> Loading conversations...
          </motion.div>
        </div>
      ) : (
      <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Sessions', value: stats.totalSessions, icon: <MessageSquare size={20} color="#3b82f6" />, bg: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 100%)', border: 'rgba(59,130,246,0.2)' },
          { label: 'Total Prompts Executed', value: stats.totalMessages, icon: <History size={20} color="#10b981" />, bg: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0) 100%)', border: 'rgba(16,185,129,0.2)' },
          { label: 'AI Responses Generated', value: stats.totalResponses, icon: <MessageCircle size={20} color="#a855f7" />, bg: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0) 100%)', border: 'rgba(168,85,247,0.2)' },
          { label: 'Avg Turns / Session', value: stats.avgMessages, icon: <BarChart3 size={20} color="#f59e0b" />, bg: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(0,0,0,0) 100%)', border: 'rgba(245,158,11,0.2)' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel" style={{ background: stat.bg, padding: '1.25rem 1.5rem', borderRadius: 16, border: `1px solid ${stat.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
              <div style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>{stat.icon}</div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', borderRadius: 16, overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={16} />
                <input 
                  type="text" 
                  placeholder="Search context or titles..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.85rem', width: 280, outline: 'none', transition: 'border 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
              <select 
                value={filterType}
                onChange={e => setFilterType(e.target.value as 'all' | 'recent')}
                style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Records</option>
                <option value="recent">Sort by Recent</option>
              </select>
            </div>
          </div>
          <button className="btn-secondary" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10 }}>
            <Download size={16} /> Export JSON
          </button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '0 1rem 0.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Details</th>
                <th style={{ padding: '0 1rem 0.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stats</th>
                <th style={{ padding: '0 1rem 0.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Activity</th>
                <th style={{ padding: '0 1rem 0.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredSessions.map((session) => (
                  <motion.tr 
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{ background: 'rgba(255,255,255,0.02)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  >
                    <td style={{ padding: '1rem', borderRadius: '12px 0 0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.6rem', background: 'rgba(59,130,246,0.1)', borderRadius: 10 }}>
                          <MessageSquare size={18} color="#3b82f6" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem', marginBottom: 4 }}>
                            {session.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                            <Hash size={10} /> {session.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.6rem', borderRadius: 6 }}>
                          <History size={12} color="#10b981" /> {session.history.length} Prompts
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.6rem', borderRadius: 6 }}>
                          <Share2 size={12} color="#a855f7" /> 
                          {session.history.reduce((acc, h) => acc + h.responses.length, 0)} Responses
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={14} />
                        {new Date(session.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', borderRadius: '0 12px 12px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button onClick={() => { setActiveSessionId(session.id); document.getElementById('chat-tab')?.click(); }} className="btn-secondary" style={{ padding: '0.5rem', borderRadius: 8 }} title="Open in Terminal">
                          <ExternalLink size={16} />
                        </button>
                        <button onClick={() => deleteSession(session.id)} className="btn-secondary" style={{ padding: '0.5rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', borderRadius: 8 }} title="Delete Thread">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredSessions.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', color: '#64748b', gap: '1rem' }}>
              <MessageSquare size={48} opacity={0.2} />
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>No conversations found</div>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Try adjusting your search filters or start a new cognitive workflow.</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default ChatAdminPanel;
