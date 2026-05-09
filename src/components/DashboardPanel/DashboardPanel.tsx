import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Activity,
  CheckCircle2,
  Clock,
  DollarSign,
  Key,
  MessageSquare,
  Radio,
  RefreshCw,
  Route,
  ShieldAlert,
  Terminal
} from 'lucide-react';
import { eventBus } from '../../core/events';
import { kernel } from '../../core/Kernel';
import { settingsService } from '../../services/SettingsService';
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
  const settings = settingsService.getSettings();

  useEffect(() => {
    const unsubscribeKernel = eventBus.on('kernel:updated', (state) => setSystemState({ ...state }));
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
      }, ...prev].slice(0, 8));
    });

    return () => {
      unsubscribeKernel();
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
    () => keys.reduce((sum, key) => sum + (key.stats?.extended?.usageToday?.requests || 0), 0),
    [keys]
  );

  const recentDecisions = systemState.decisions.slice(0, 5);
  const latestEvent = events[0]?.time || 'No events yet';
  const hasProviderErrors = providerCounts.error > 0 || systemState.violations.length > 0;

  const stats = [
    {
      label: 'Providers',
      value: `${providerCounts.active}/${keys.length}`,
      hint: `${providerCounts.error} error, ${providerCounts.inactive} inactive`,
      icon: <Key size={18} />,
      color: providerCounts.active > 0 ? '#10b981' : '#71717a'
    },
    {
      label: 'Requests Today',
      value: todayRequests.toString(),
      hint: `${systemState.totalRequests} runtime total`,
      icon: <Radio size={18} />,
      color: '#3b82f6'
    },
    {
      label: 'Tokens',
      value: formatNumber(systemState.totalTokens),
      hint: 'counted from completed responses',
      icon: <MessageSquare size={18} />,
      color: '#a855f7'
    },
    {
      label: 'Estimated Cost',
      value: `$${systemState.estimatedCost.toFixed(4)}`,
      hint: 'rough local estimate',
      icon: <DollarSign size={18} />,
      color: '#f59e0b'
    }
  ];

  return (
    <div style={{ color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.4rem' }}>Overview</h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0 }}>
            Real control plane for local providers, routing, requests, and runtime events.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={checkAllHealth} style={{ padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} /> Check All
          </button>
          <button className="btn-primary" onClick={() => onNavigate('keys')} style={{ padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} /> Add Provider
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        padding: '0.85rem 1rem',
        borderRadius: 10,
        border: `1px solid ${hasProviderErrors ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.2)'}`,
        background: hasProviderErrors ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.05)'
      }}>
        {hasProviderErrors ? <ShieldAlert size={18} color="#ef4444" /> : <CheckCircle2 size={18} color="#10b981" />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            {hasProviderErrors ? 'Attention needed' : 'Runtime ready'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Fallback is {settings.fallbackEnabled ? 'enabled' : 'disabled'}, streaming is {settings.streamingEnabled ? 'enabled' : 'disabled'}, last event: {latestEvent}.
          </div>
        </div>
        <button onClick={() => onNavigate(hasProviderErrors ? 'events' : 'chat')} className="btn-secondary" style={{ padding: '0.5rem 0.8rem' }}>
          {hasProviderErrors ? 'Open Logs' : 'Open Chat'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
        {stats.map((stat) => (
          <div key={stat.label} className="glass-panel" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
              <div style={{ color: stat.color, background: `${stat.color}18`, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>{stat.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{stat.hint}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1rem', alignItems: 'start' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <SectionTitle icon={<Key size={18} color="#3b82f6" />} title="Providers" action="Manage" onAction={() => onNavigate('keys')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {keys.map((key) => (
              <div key={key.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr auto', gap: '1rem', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{key.label}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{key.provider}</div>
                </div>
                <StatusPill status={key.status} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{key.latency ? `${key.latency}ms` : 'not checked'}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{key.stats?.successCount || 0} ok / {key.stats?.errorCount || 0} err</div>
                <button onClick={() => onNavigate('keys')} className="btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem' }}>Open</button>
              </div>
            ))}
            {keys.length === 0 && (
              <EmptyState text="No providers configured yet." action="Add Provider" onAction={() => onNavigate('keys')} />
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <SectionTitle icon={<Terminal size={18} color="#94a3b8" />} title="Live Events" action="View Logs" onAction={() => onNavigate('events')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {events.map((event) => (
              <div key={`${event.id}-${event.event}`} style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '0.75rem', alignItems: 'start', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{event.time}</span>
                <div>
                  <div style={{ color: getSeverityColor(event.severity), fontWeight: 700 }}>{event.event}</div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.summary}</div>
                </div>
              </div>
            ))}
            {events.length === 0 && <EmptyState text="Waiting for runtime events." />}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <SectionTitle icon={<Route size={18} color="#10b981" />} title="Routing Decisions" action="Open Chat" onAction={() => onNavigate('chat')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentDecisions.map((decision) => (
              <div key={decision.requestId} style={{ padding: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{decision.selected}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{decision.strategy}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.35rem' }}>
                  {decision.secondBest ? `second best: ${decision.secondBest}` : 'no fallback candidate'} · scores: {decision.scores?.map((s: any) => `${s.p} ${s.s}`).join(', ') || 'n/a'}
                </div>
              </div>
            ))}
            {recentDecisions.length === 0 && <EmptyState text="No routing decisions yet. Send a chat request to generate one." />}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <SectionTitle icon={<Activity size={18} color="#f59e0b" />} title="Runtime Health" action="Details" onAction={() => onNavigate('health')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <HealthBox label="Active SLA" value={systemState.activeSLA} />
            <HealthBox label="Fallback" value={settings.fallbackEnabled ? 'Enabled' : 'Disabled'} />
            <HealthBox label="Provider Errors" value={totalErrors.toString()} tone={totalErrors > 0 ? 'error' : 'success'} />
            <HealthBox label="Violations" value={systemState.violations.length.toString()} tone={systemState.violations.length > 0 ? 'warning' : 'success'} />
          </div>
          {systemState.violations.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, color: '#fbbf24', fontSize: '0.78rem' }}>
              <AlertCircle size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
              {systemState.violations[systemState.violations.length - 1]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SectionTitle = ({ icon, title, action, onAction }: { icon: React.ReactNode; title: string; action?: string; onAction?: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 800, margin: 0 }}>
      {icon} {title}
    </h2>
    {action && (
      <button onClick={onAction} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>
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
    padding: '0.25rem 0.5rem',
    borderRadius: 999,
    color: statusColor[status],
    background: `${statusColor[status]}18`,
    fontSize: '0.7rem',
    fontWeight: 800,
    textTransform: 'uppercase'
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[status] }} />
    {status}
  </span>
);

const EmptyState = ({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) => (
  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 10, fontSize: '0.85rem' }}>
    <Clock size={24} opacity={0.25} />
    <div style={{ marginTop: '0.5rem' }}>{text}</div>
    {action && <button className="btn-primary" onClick={onAction} style={{ marginTop: '0.9rem', padding: '0.55rem 0.8rem' }}>{action}</button>}
  </div>
);

const HealthBox = ({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'success' | 'warning' | 'error' }) => {
  const color = tone === 'success' ? '#10b981' : tone === 'warning' ? '#f59e0b' : tone === 'error' ? '#ef4444' : 'var(--text-main)';
  return (
    <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800 }}>{label}</div>
      <div style={{ color, fontSize: '1rem', fontWeight: 800, marginTop: '0.25rem' }}>{value}</div>
    </div>
  );
};

const getSeverityColor = (severity: RecentEvent['severity']) => {
  if (severity === 'error') return '#ef4444';
  if (severity === 'warning') return '#f59e0b';
  if (severity === 'success') return '#10b981';
  return '#94a3b8';
};

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
};

const summarizeEvent = (data: any) => {
  if (!data) return 'no payload';
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.provider) return `${data.provider}${data.model ? ` / ${data.model}` : ''}`;
  if (data.requestId) return data.requestId;
  try {
    return JSON.stringify(data).slice(0, 140);
  } catch {
    return 'unserializable payload';
  }
};

export default DashboardPanel;
