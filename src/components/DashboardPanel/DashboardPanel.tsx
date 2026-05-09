import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Activity, CheckCircle2, Clock, DollarSign,
  Key, MessageSquare, Radio, RefreshCw, Route, ShieldAlert,
  Terminal, Zap, Server, ShieldCheck, Box, Network, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../../core/events';
import { kernel } from '../../core/Kernel';
import { settingsService } from '../../services/SettingsService';
import { traceService } from '../../services/TraceService';
import { useKeyStore } from '../../stores/useKeyStore';
import type { SystemState } from '../../types/metrics';

interface DashboardPanelProps {
  onNavigate: (page: string) => void;
}

type RecentEvent = {
  id: number;
  time: string;
  event: string;
  summary: string;
  severity: 'info' | 'success' | 'warning' | 'error';
};

const statusColor = {
  active: '#10b981',
  checking: '#f59e0b',
  error: '#ef4444',
  inactive: '#71717a'
};

const DashboardPanel: React.FC<DashboardPanelProps> = ({ onNavigate }) => {
  const { keys, checkAllHealth } = useKeyStore();
  const [systemState, setSystemState] = useState<SystemState>(() => kernel.getState());
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [traces, setTraces] = useState(() => traceService.getTraces());
  const settings = settingsService.getSettings();

  useEffect(() => {
    const unsubscribeKernel = eventBus.on('kernel:updated', (state) => setSystemState({ ...state }));
    const unsubscribeTraces = eventBus.on('trace:updated', (newTraces) => setTraces([...newTraces]));
    const unsubscribeEvents = eventBus.subscribeAll(({ event, data }) => {
      const severity: RecentEvent['severity'] =
        event.includes('error') || data?.type === 'error' ? 'error' :
        event.includes('violation') || data?.type === 'warning' ? 'warning' :
        event.includes('end') || data?.type === 'success' ? 'success' :
        'info';

      setEvents((prev) => [{
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        event,
        summary: summarizeEvent(data),
        severity
      }, ...prev].slice(0, 10));
    });

    return () => {
      unsubscribeKernel();
      unsubscribeTraces();
      unsubscribeEvents();
    };
  }, []);

  const providerCounts = useMemo(() => ({
    active: keys.filter(k => k.status === 'active').length,
    checking: keys.filter(k => k.status === 'checking').length,
    error: keys.filter(k => k.status === 'error').length,
    inactive: keys.filter(k => k.status === 'inactive').length
  }), [keys]);

  const totalErrors = useMemo(
    () => keys.reduce((sum, key) => sum + (key.stats?.errorCount || 0), 0),
    [keys]
  );

  const todayRequests = useMemo(
    () => traces.filter(t => t.startTime > Date.now() - 24 * 60 * 60 * 1000).length,
    [traces]
  );

  const totalTokens = useMemo(
    () => traces.reduce((sum, t) => sum + (t.totalTokens || 0), 0),
    [traces]
  );

  const estimatedCost = useMemo(
    () => (totalTokens / 1000) * 0.01, // Simple estimator: $0.01 per 1k tokens
    [totalTokens]
  );

  const hasProviderErrors = providerCounts.error > 0 || systemState.violations.length > 0;

  const stats = [
    { label: 'Active LLMs', value: `${providerCounts.active}/${keys.length}`, hint: `${providerCounts.error} error, ${providerCounts.inactive} inactive`, icon: <Server size={22} />, color: providerCounts.active > 0 ? '#10b981' : '#f59e0b' },
    { label: 'Global Throughput', value: todayRequests.toString(), hint: `${traces.length} total sessions`, icon: <Activity size={22} />, color: '#3b82f6' },
    { label: 'Token Burn', value: formatNumber(totalTokens), hint: 'Total aggregated context', icon: <MessageSquare size={22} />, color: '#a855f7' },
    { label: 'Calculated Cost', value: `$${estimatedCost.toFixed(4)}`, hint: 'Real-time billing estimation', icon: <DollarSign size={22} />, color: '#f59e0b' }
  ];

  return (
    <div style={{ color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase' }}>System Online</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.25rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>Mission Control</h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
            Unified command center for agent orchestration, provider telemetry, and cognitive routing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={checkAllHealth} style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12 }}>
            <RefreshCw size={16} /> Run Diagnostics
          </button>
          <button className="btn-primary" onClick={() => onNavigate('keys')} style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
            <Key size={16} /> Add Provider
          </button>
        </div>
      </div>

      {/* Critical Alert Banner */}
      <AnimatePresence>
        {hasProviderErrors && (
          <motion.div 
            initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }}
            style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem 1.5rem', borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)', background: 'linear-gradient(90deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)', overflow: 'hidden' }}
          >
            <ShieldAlert size={24} color="#ef4444" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fca5a5', marginBottom: '0.2rem' }}>System Attention Required</div>
              <div style={{ fontSize: '0.8rem', color: '#fecaca', opacity: 0.8 }}>
                Detected {providerCounts.error} provider errors and {systemState.violations.length} security violations. Fallback routing is {settings.fallbackEnabled ? 'active' : 'disabled'}.
              </div>
            </div>
            <button onClick={() => onNavigate('events')} className="btn-secondary" style={{ padding: '0.6rem 1rem', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              Review Logs
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-panel" 
            style={{ padding: '1.5rem', borderRadius: 16, position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)' }}
          >
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: stat.color, opacity: 0.05, filter: 'blur(20px)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ color: stat.color, background: `${stat.color}15`, padding: '0.6rem', borderRadius: 12, border: `1px solid ${stat.color}30` }}>{stat.icon}</div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: '0.25rem', lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>{stat.label}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>{stat.hint}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Active Providers List */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SectionTitle icon={<Network size={20} color="#3b82f6" />} title="Inference Mesh" action="Configure" onAction={() => onNavigate('keys')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {keys.map((key) => (
              <div key={key.id} className="hover-bright" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr auto', gap: '1rem', alignItems: 'center', padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                    <Cpu size={16} color="var(--text-muted)" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#e2e8f0' }}>{key.label}</div>
                    <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>{key.provider}</div>
                  </div>
                </div>
                <div><StatusPill status={key.status} /></div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={12} color={key.latency && key.latency < 500 ? '#10b981' : '#f59e0b'} /> {key.latency ? `${key.latency}ms` : '--'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{key.stats?.successCount || 0} reqs</div>
                <button onClick={() => onNavigate('keys')} className="btn-secondary" style={{ padding: '0.4rem 0.6rem', borderRadius: 8 }}>Inspect</button>
              </div>
            ))}
            {keys.length === 0 && (
              <EmptyState text="No inference providers configured." action="Connect Provider" onAction={() => onNavigate('keys')} />
            )}
          </div>
        </div>

        {/* Live Terminal / Event Log */}
        <div className="glass-panel" style={{ borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <SectionTitle icon={<Terminal size={18} color="#a855f7" />} title="Live System Stream" action="Full Logs" onAction={() => onNavigate('events')} />
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: '#020617', height: '100%', minHeight: 300 }}>
            {events.map((event) => (
              <div key={`${event.id}-${event.event}`} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: '#475569', flexShrink: 0, marginTop: 2 }}>[{event.time}]</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ color: getSeverityColor(event.severity), fontWeight: 700 }}>{event.event}</div>
                  <div style={{ color: '#cbd5e1', opacity: 0.8, lineHeight: 1.4, wordBreak: 'break-word' }}>{event.summary}</div>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
                <Activity size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <span>Awaiting telemetry data...</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

const SectionTitle = ({ icon, title, action, onAction }: { icon: React.ReactNode; title: string; action?: string; onAction?: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
    <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
      {icon} {title}
    </h2>
    {action && (
      <button onClick={onAction} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#60a5fa'} onMouseOut={e => e.currentTarget.style.color = '#3b82f6'}>
        {action}
      </button>
    )}
  </div>
);

const StatusPill = ({ status }: { status: keyof typeof statusColor }) => (
  <span style={{
    width: 'fit-content',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '0.3rem 0.75rem',
    borderRadius: 999,
    color: statusColor[status],
    background: `${statusColor[status]}15`,
    fontSize: '0.7rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    border: `1px solid ${statusColor[status]}30`
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[status], boxShadow: `0 0 8px ${statusColor[status]}` }} className={status === 'active' || status === 'checking' ? 'pulsing' : ''} />
    {status}
  </span>
);

const EmptyState = ({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) => (
  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, fontSize: '0.9rem' }}>
    <Box size={32} opacity={0.3} style={{ margin: '0 auto 1rem' }} />
    <div>{text}</div>
    {action && <button className="btn-primary" onClick={onAction} style={{ marginTop: '1.25rem', padding: '0.6rem 1rem', borderRadius: 8 }}>{action}</button>}
  </div>
);

const getSeverityColor = (severity: RecentEvent['severity']) => {
  if (severity === 'error') return '#ef4444';
  if (severity === 'warning') return '#f59e0b';
  if (severity === 'success') return '#10b981';
  return '#3b82f6';
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
};

const summarizeEvent = (data: any) => {
  if (!data) return 'No payload provided';
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.provider) return `${data.provider}${data.model ? ` / ${data.model}` : ''}`;
  if (data.requestId) return `Req ID: ${data.requestId}`;
  try {
    return JSON.stringify(data).slice(0, 100) + '...';
  } catch {
    return 'Binary or complex payload';
  }
};

export default DashboardPanel;
