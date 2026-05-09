import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Activity, Zap, Search, 
  Filter, Trash2, Download, Pause, Play, 
  AlertCircle, Clock, Terminal
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

const EventsPanel: React.FC = () => {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
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
    setEvents(prev => [newEvent, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    const unsubAll = eventBus.subscribeAll(({ event, data }) => {
      if (isPaused) return;
      
      let severity: SystemEvent['severity'] = 'info';
      if (event.includes('error') || data?.status === 'error' || data?.type === 'error') severity = 'error';
      else if (event.includes('success') || data?.status === 'done' || data?.status === 'active') severity = 'success';
      else if (event.includes('violation') || event.includes('warn')) severity = 'warning';

      addEvent(event, data?.source || 'System', data, severity);
    });

    return () => {
      unsubAll();
    };
  }, [isPaused, addEvent]);

  const errorCount = events.filter(e => e.severity === 'error').length;
  const errorRate = events.length > 0 ? ((errorCount / events.length) * 100).toFixed(1) : '0.0';

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         e.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         JSON.stringify(e.payload).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || e.severity === filterType;
    return matchesSearch && matchesType;
  });

  const clearEvents = () => setEvents([]);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-main)' }}>
      {/* Header / Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Events', value: events.length, icon: <Activity size={16} />, color: '#3b82f6' },
          { label: 'Active Stream', value: isPaused ? 'Paused' : 'Live', icon: <Zap size={16} />, color: isPaused ? '#f59e0b' : '#10b981' },
          { label: 'Error Rate', value: `${errorRate}%`, icon: <AlertCircle size={16} />, color: '#ef4444' },
          { label: 'System Health', value: errorCount > 5 ? 'Warning' : 'Healthy', icon: <Terminal size={16} />, color: errorCount > 5 ? '#ef4444' : '#a855f7' }
        ].map(stat => (
          <div key={stat.label} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: 8, background: `${stat.color}15`, color: stat.color }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat.label}</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 250 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Filter stream..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.6rem 0.45rem 2.2rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
          <select 
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '0.45rem 0.8rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}
          >
            <option value="all">All Severities</option>
            <option value="info">Info Only</option>
            <option value="success">Success Only</option>
            <option value="warning">Warnings</option>
            <option value="error">Errors</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setIsPaused(!isPaused)} className="btn-secondary" style={{ padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
            {isPaused ? <Play size={14} /> : <Pause size={14} />} {isPaused ? 'Resume' : 'Pause Stream'}
          </button>
          <button onClick={clearEvents} className="btn-secondary" style={{ padding: '0.45rem 0.8rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', fontSize: '0.8rem' }}>
            <Trash2 size={14} />
          </button>
          <button onClick={downloadEvents} className="btn-secondary" style={{ padding: '0.45rem 0.8rem', fontSize: '0.8rem' }}><Download size={14} /></button>
        </div>
      </div>

      {/* Stream */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border)', padding: '0.5rem' }}>
        <AnimatePresence initial={false}>
          {filteredEvents.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              style={{ 
                display: 'grid', 
                gridTemplateColumns: '120px 180px 140px 1fr', 
                padding: '0.6rem 1rem', 
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                alignItems: 'center',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} />
                {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: TYPE_COLORS[event.type] || '#94a3b8' }} />
                <span style={{ fontWeight: 600, color: TYPE_COLORS[event.type] || '#94a3b8' }}>{event.type}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Terminal size={12} />
                {event.source}
              </div>
              <div style={{ 
                fontFamily: 'monospace', 
                color: event.severity === 'error' ? '#ef4444' : event.severity === 'success' ? '#10b981' : 'var(--text-main)',
                opacity: 0.9,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {JSON.stringify(event.payload)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {events.length === 0 && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem' }}>
            <Activity size={48} opacity={0.1} />
            <p>Listening for system events...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPanel;
