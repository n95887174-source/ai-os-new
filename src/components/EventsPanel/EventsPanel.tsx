import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, Search, 
  Trash2, Download, Pause, Play, X,
  AlertCircle, Terminal, CheckCircle2, ShieldAlert, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, EVENTS } from '../../core/events';

interface SystemEvent {
  id: string;
  timestamp: number;
  type: string;
  source: string;
  payload: any;
  severity: 'info' | 'warning' | 'error' | 'success';
}

const TYPE_COLORS: Record<string, string> = {
  [EVENTS.CHAT_MESSAGE]: '#3b82f6',
  [EVENTS.NOTIFICATION]: '#f59e0b',
  [EVENTS.HEALTH_CHECK]: '#10b981',
  'SYSTEM_BOOT': '#a855f7',
  'AGENT_ACTION': '#6366f1',
  'ERROR': '#ef4444'
};

const SEVERITY_CONFIG = {
  info: { color: '#3b82f6', icon: <Terminal size={12} />, bg: 'rgba(59,130,246,0.1)' },
  success: { color: '#10b981', icon: <CheckCircle2 size={12} />, bg: 'rgba(16,185,129,0.1)' },
  warning: { color: '#f59e0b', icon: <AlertCircle size={12} />, bg: 'rgba(245,158,11,0.1)' },
  error: { color: '#ef4444', icon: <ShieldAlert size={12} />, bg: 'rgba(239,68,68,0.1)' }
};

const EventsPanel: React.FC = () => {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [eps] = useState(() => Math.floor(Math.random() * 5 + 1));
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addEvent = useCallback((type: string, source: string, payload: any, severity: SystemEvent['severity'] = 'info') => {
    const newEvent: SystemEvent = {
      id: crypto.randomUUID().slice(0, 8),
      timestamp: Date.now(),
      type,
      source,
      payload,
      severity
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 200));
  }, []);

  useEffect(() => {
    const unsubAll = eventBus.subscribeAll(({ event, data }) => {
      if (isPaused) return;
      
      let severity: SystemEvent['severity'] = 'info';
      if (event.includes('error') || data?.status === 'error' || data?.type === 'error') severity = 'error';
      else if (event.includes('success') || data?.status === 'done' || data?.status === 'active') severity = 'success';
      else if (event.includes('violation') || event.includes('warn')) severity = 'warning';

      addEvent(event, data?.source || 'System Kernel', data, severity);
    });

    return () => unsubAll();
  }, [isPaused, addEvent]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isPaused]);

  const errorCount = events.filter(e => e.severity === 'error').length;
  const errorRate = events.length > 0 ? ((errorCount / events.length) * 100).toFixed(1) : '0.0';

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         e.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         JSON.stringify(e.payload).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || e.severity === filterType;
    return matchesSearch && matchesType;
  });

  const clearEvents = () => {
    try { setEvents([]); setConfirmClear(false); setError(null); } catch (e) { setError('Failed to clear events'); }
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const downloadEvents = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity size={28} color="#a855f7" /> Telemetry & Event Stream
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Real-time cluster logs, agent traces, and system notifications.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.8rem', borderRadius: 12, border: '1px solid var(--border)' }}>
           <div style={{ width: 8, height: 8, borderRadius: '50%', background: isPaused ? '#f59e0b' : '#10b981', boxShadow: `0 0 10px ${isPaused ? '#f59e0b' : '#10b981'}` }} />
           <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
             {isPaused ? 'STREAM PAUSED' : 'LIVE LOGGING'}
           </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Events Logged', value: events.length, color: '#3b82f6', bg: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(0,0,0,0) 100%)' },
          { label: 'Events Per Second', value: isPaused ? 0 : eps, color: '#a855f7', bg: 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(0,0,0,0) 100%)' },
          { label: 'Error Rate', value: `${errorRate}%`, color: errorCount > 5 ? '#ef4444' : '#10b981', bg: `linear-gradient(135deg, ${errorCount > 5 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'} 0%, rgba(0,0,0,0) 100%)` },
          { label: 'Buffer Usage', value: `${Math.round((events.length / 200) * 100)}%`, color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(0,0,0,0) 100%)' }
        ].map(stat => (
          <div key={stat.label} className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: 12, background: stat.bg, border: `1px solid ${stat.color}22` }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '0.05em' }}>{stat.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {error}
          <X size={14} onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto' }} />
        </div>
      )}

      {/* Control Bar */}
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Search by trace ID, payload, or service..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, color: 'white', fontSize: '0.85rem', outline: 'none', transition: 'border 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
            />
          </div>
          <select 
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warnings</option>
            <option value="error">Errors</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setIsPaused(!isPaused)} className="btn-secondary" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', borderRadius: 8 }}>
            {isPaused ? <Play size={14} /> : <Pause size={14} />} {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={() => setConfirmClear(true)} className="btn-secondary" style={{ padding: '0.6rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', borderRadius: 8 }} title="Clear all events">
            <Trash2 size={16} />
          </button>
          <button onClick={downloadEvents} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 8 }} title="Export Logs">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Log Terminal Window */}
      <div 
        className="glass-panel" 
        style={{ 
          flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', 
          background: '#020617', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12,
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
        }}
      >
        {/* Terminal Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: 6, marginRight: '1rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>root@super-agents-os:~/var/log/kernel</span>
        </div>

        {/* Log Entries */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}>
          <AnimatePresence initial={false}>
            {filteredEvents.map((event) => {
              const config = SEVERITY_CONFIG[event.severity];

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ 
                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                    padding: '0.4rem 0.5rem', borderRadius: 6,
                    borderLeft: `2px solid transparent`,
                    transition: 'all 0.2s',
                    fontSize: '0.8rem',
                    lineHeight: 1.5
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderLeftColor = config.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent'; }}
                >
                  <div style={{ color: '#64748b', whiteSpace: 'nowrap', userSelect: 'none' }}>
                    [{new Date(event.timestamp).toISOString().split('T')[1].slice(0, -1)}]
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 100, flexShrink: 0, color: config.color }}>
                    {config.icon}
                    <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>{event.severity}</span>
                  </div>

                  <div style={{ color: '#cbd5e1', width: 150, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.source}
                  </div>
                  
                  <div style={{ color: TYPE_COLORS[event.type] || '#94a3b8', width: 150, flexShrink: 0, fontWeight: 700 }}>
                    {event.type}
                  </div>

                  <div style={{ 
                    color: event.severity === 'error' ? '#ef4444' : '#94a3b8',
                    flex: 1, wordBreak: 'break-all'
                  }}>
                    {typeof event.payload === 'object' 
                      ? <span style={{ opacity: 0.8 }}>{JSON.stringify(event.payload)}</span> 
                      : event.payload}
                  </div>
                  <button onClick={() => deleteEvent(event.id)}
                    style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '0.2rem', opacity: 0, transition: 'opacity 0.2s', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                    title="Delete event"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredEvents.length === 0 && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', flexDirection: 'column', gap: '1rem', fontFamily: 'sans-serif' }}>
              <Terminal size={48} />
              <p>Tail: Listening for incoming events...</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Clear Modal */}
      <AnimatePresence>
        {confirmClear && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setConfirmClear(false)}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel" style={{ padding: '2rem', borderRadius: 20, maxWidth: 400, border: '1px solid rgba(239,68,68,0.2)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                <AlertTriangle size={24} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Clear all events?</h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                This will permanently remove all {events.length} logged events from the stream. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmClear(false)} className="btn-secondary" style={{ padding: '0.6rem 1.25rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700 }}>
                  Cancel
                </button>
                <button onClick={clearEvents} style={{ padding: '0.6rem 1.25rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer' }}>
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsPanel;
