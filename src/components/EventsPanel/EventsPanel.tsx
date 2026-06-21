// DEPRECATED — use EventsTimeline instead (has grouping, localStorage, and all EventsPanel features). Will be removed in a future version.
import { genId } from '../../utils/gen-id';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Activity, Search, 
  Trash2, Download, Pause, Play, X,
  AlertCircle, Terminal, CheckCircle2, ShieldAlert, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalShell } from '../ModalShell';
import { eventBus } from '../../kernel/events/event-bus'
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { btnDangerLg, btnSecondaryLg, dismissBtn, errorBanner, flexGap2, h3White, loadingContainer } from '../../styles/common';

interface SystemEvent {
  id: string;
  type: string;
  severity: 'info' | 'success' | 'warning' | 'error' | 'critical';
  timestamp: number;
  source: string;
  message?: string;
  payload?: unknown;
}

const SEVERITY_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  info: { color: '#3b82f6', icon: <Terminal size={14} /> },
  success: { color: '#10b981', icon: <CheckCircle2 size={14} /> },
  warning: { color: '#f59e0b', icon: <AlertTriangle size={14} /> },
  error: { color: '#ef4444', icon: <AlertCircle size={14} /> },
  critical: { color: '#dc2626', icon: <ShieldAlert size={14} /> },
};

const TYPE_COLORS: Record<string, string> = {
  'system:notification': '#a855f7',
  'budget:alert': '#f59e0b',
  'key:state:changed': '#10b981',
  'key:quota:exceeded': '#ef4444',
  'router:decision': '#3b82f6',
  'debate:round': '#8b5cf6',
  'chat:stream:end': '#06b6d4',
  'memory:stored': '#84cc16',
  'provider:error': '#ef4444',
  'system:error': '#dc2626',
};

const generateId = (): string => {
  return genId();
};

const EventsPanel: React.FC = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const lastEpsUpdate = useRef(0);
  const epsCount = useRef(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [eps, setEps] = useState(0);
  const isMountedRef = useRef(true);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Автоочистка ошибки
  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  const addEvent = useCallback((type: string, source: string, payload: unknown, severity: SystemEvent['severity'] = 'info') => {
    if (!isMountedRef.current) return;
    const newEvent: SystemEvent = {
      id: generateId(),
      timestamp: Date.now(),
      type,
      source,
      payload,
      severity
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 200));
    epsCount.current++;
    const now = Date.now();
    if (now - lastEpsUpdate.current >= 2000) {
      setEps(Math.round(epsCount.current / ((now - lastEpsUpdate.current) / 1000)));
      epsCount.current = 0;
      lastEpsUpdate.current = now;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    lastEpsUpdate.current = Date.now();

    let unsubscribe: (() => void) | undefined;
    const handler = ({ event, data }: { event: string; data: Record<string, unknown> }) => {
      if (isPaused) return;
      if (!isMountedRef.current) return;
      let severity: SystemEvent['severity'] = 'info';
      if (event.includes('error') || data?.status === 'error' || data?.type === 'error') severity = 'error';
      else if (event.includes('success') || data?.status === 'done' || data?.status === 'active') severity = 'info';
      else if (event.includes('violation') || event.includes('warn')) severity = 'warning';
      addEvent(event, (data?.source as string) || 'System Kernel', data, severity);
      if (isMountedRef.current) setIsLoading(false);
    };

    const maybeUnsubscribe = eventBus.subscribeAll(handler);
    if (typeof maybeUnsubscribe === 'function') {
      unsubscribe = maybeUnsubscribe;
    } else {
      console.warn('[EventsPanel] eventBus.subscribeAll does not return an unsubscribe function, potential leak');
    }

    const loadingTimer = setTimeout(() => {
      if (isMountedRef.current) setIsLoading(false);
    }, 3000);

    return () => {
      isMountedRef.current = false;
      if (unsubscribe) unsubscribe();
      clearTimeout(loadingTimer);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, [isPaused, addEvent]);

  // Auto-scroll to top (newest events are prepended)
  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events, isPaused]);

  const errorCount = events.filter(e => e.severity === 'error').length;
  const errorRate = events.length > 0 ? ((errorCount / events.length) * 100).toFixed(1) : '0.0';

  const serializedPayloads = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of events) m.set(e.id, JSON.stringify(e.payload).toLowerCase());
    return m;
  }, [events]);

  const filteredEvents = useMemo(() => events.filter(e => {
    const matchesSearch = e.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         e.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (serializedPayloads.get(e.id) || '').includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || e.severity === filterType;
    return matchesSearch && matchesType;
  }), [events, searchQuery, filterType, serializedPayloads]);

  const clearEvents = () => {
    try {
      if (isMountedRef.current) setEvents([]);
      setConfirmClear(false);
      setError(null);
    } catch (e) {
      console.warn('[EventsPanel] Failed to clear events:', e);
      if (isMountedRef.current) {
        setError('Failed to clear events');
        clearErrorAfterDelay();
      }
    }
  };

  const deleteEvent = (id: string) => {
    if (isMountedRef.current) {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
  };

  const downloadEvents = () => {
    try {
      const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-events-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('[EventsPanel] Failed to export events:', e);
      if (isMountedRef.current) {
        setError(t('events.error_export'));
        clearErrorAfterDelay();
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity size={28} color="#a855f7" aria-hidden="true" /> {t('events.title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>{t('events.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.8rem', borderRadius: 12, border: '1px solid var(--border)' }}>
           <div style={{ width: 8, height: 8, borderRadius: '50%', background: isPaused ? '#f59e0b' : '#10b981', boxShadow: `0 0 10px ${isPaused ? '#f59e0b' : '#10b981'}` }} aria-hidden="true" />
           <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
             {isPaused ? t('events.stream_paused') : t('events.stream_live')}
           </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: t('events.total_events'), value: events.length, color: '#3b82f6', bg: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(0,0,0,0) 100%)' },
          { label: t('events.events_per_sec'), value: isPaused ? 0 : eps, color: '#a855f7', bg: 'linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(0,0,0,0) 100%)' },
          { label: t('events.error_rate'), value: `${errorRate}%`, color: errorCount > 5 ? '#ef4444' : '#10b981', bg: `linear-gradient(135deg, ${errorCount > 5 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'} 0%, rgba(0,0,0,0) 100%)` },
          { label: t('events.buffer_usage'), value: `${Math.round((events.length / 200) * 100)}%`, color: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(0,0,0,0) 100%)' }
        ].map(stat => (
          <div key={stat.label} className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: 12, background: stat.bg, border: `1px solid ${stat.color}22` }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '0.05em' }}>{stat.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={errorBanner} role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={dismissBtn} aria-label={t('common.dismiss_error')}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="glass-panel" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12 }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder={t('events.search_placeholder')}
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
            <option value="all">{t('events.filter_all')}</option>
            <option value="info">{t('events.filter_info')}</option>
            <option value="success">{t('events.filter_success')}</option>
            <option value="warning">{t('events.filter_warning')}</option>
            <option value="error">{t('events.filter_error')}</option>
          </select>
        </div>
        <div style={flexGap2}>
          <button onClick={() => setIsPaused(!isPaused)} className="btn-secondary" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', borderRadius: 8 }}>
            {isPaused ? <Play size={14} /> : <Pause size={14} />} {isPaused ? t('events.resume') : t('events.pause')}
          </button>
          <button onClick={() => setConfirmClear(true)} className="btn-secondary" style={{ padding: '0.6rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', borderRadius: 8 }} title={t('events.clear')}>
            <Trash2 size={16} />
          </button>
          <button onClick={downloadEvents} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 8 }} title={t('events.export')}>
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
                      : event.payload as React.ReactNode}
                  </div>
                  <button onClick={() => deleteEvent(event.id)}
                    style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '0.2rem', opacity: 0, transition: 'opacity 0.2s', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                    title={t('events.delete_aria')}
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {isLoading && (
            <div style={loadingContainer}>
              <Activity size={48} className="pulsing" />
              <p>{t('events.connecting')}</p>
            </div>
          )}
          {!isLoading && filteredEvents.length === 0 && (
            <div style={loadingContainer}>
              <Terminal size={48} />
              <p>Tail: Listening for incoming events...</p>
            </div>
          )}
        </div>
      </div>

      <ModalShell open={confirmClear} onClose={() => setConfirmClear(false)} width={420}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
          <AlertTriangle size={24} color="#ef4444" />
          <h3 style={h3White}>{t('events.clear_confirm_title')}</h3>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {t('events.clear_confirm_body')}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setConfirmClear(false)} className="btn-secondary" style={btnSecondaryLg}>
            {t('events.clear_cancel')}
          </button>
          <button onClick={clearEvents} style={btnDangerLg}>
            {t('events.clear_confirm_yes')}
          </button>
        </div>
      </ModalShell>
      <ModuleInfo moduleKey="events" />
    </div>
  );
};

export default EventsPanel;
