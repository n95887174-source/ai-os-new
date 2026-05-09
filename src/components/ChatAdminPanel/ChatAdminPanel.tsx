import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, Search, Trash2, Calendar, 
  MessageCircle, Hash, ExternalLink, Filter,
  BarChart3, Clock, ArrowRight, Download,
  GitFork, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../stores/useChatStore';

const ChatAdminPanel: React.FC = () => {
  const { sessions, deleteSession, setActiveSessionId, renameSession } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'active'>('all');

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* Stats Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Sessions', value: stats.totalSessions, icon: <MessageSquare size={16} color="#3b82f6" />, bg: 'rgba(59,130,246,0.1)' },
          { label: 'Total Cycles', value: stats.totalMessages, icon: <History size={16} color="#10b981" />, bg: 'rgba(16,185,129,0.1)' },
          { label: 'AI Responses', value: stats.totalResponses, icon: <MessageCircle size={16} color="#a855f7" />, bg: 'rgba(168,85,247,0.1)' },
          { label: 'Avg Cycles/Session', value: stats.avgMessages, icon: <BarChart3 size={16} color="#f59e0b" />, bg: 'rgba(245,158,11,0.1)' },
        ].map((stat, i) => (
          <div key={i} style={{ background: stat.bg, padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{stat.label.toUpperCase()}</span>
              {stat.icon}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.5rem', borderRadius: 10 }}>
              <MessageSquare size={20} color="#10b981" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Chat Administration</h3>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
              <input 
                type="text" 
                placeholder="Search sessions..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 10, color: 'white', fontSize: '0.85rem', width: 240 }}
              />
            </div>
            <select 
              value={filterType}
              onChange={e => setFilterType(e.target.value as 'all' | 'recent' | 'active')}
              style={{ padding: '0.6rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 10, color: 'white', fontSize: '0.85rem' }}
            >
              <option value="all">All Sessions</option>
              <option value="recent">Recently Updated</option>
              <option value="active">Active Now</option>
            </select>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>SESSION</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>CYCLES</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>CREATED</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>LAST ACTIVITY</th>
                <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
              {filteredSessions.map(session => (
                <motion.tr 
                  key={session.id} 
                  variants={itemVariants}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}
                  whileHover={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={16} color="#3b82f6" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{session.title}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{session.tags?.join(', ') || 'No tags'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{session.id}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Hash size={12} color="var(--text-muted)" />
                      <span style={{ fontWeight: 700 }}>{session.history.length}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={12} />
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                      <Clock size={12} />
                      {new Date(session.updatedAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => setActiveSessionId(session.id)}
                        title="Open Chat"
                        style={{ padding: '0.4rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-panel)', color: '#3b82f6', cursor: 'pointer' }}
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button 
                        onClick={() => deleteSession(session.id)}
                        title="Delete Session"
                        style={{ padding: '0.4rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-panel)', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
          {filteredSessions.length === 0 && (
            <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.5 }}>
              <Search size={48} style={{ marginBottom: '1rem' }} />
              <h3>No sessions found</h3>
              <p>Try a different search term or filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatAdminPanel;
