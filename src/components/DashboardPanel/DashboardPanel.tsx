import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  Activity, DollarSign,
  Key, MessageSquare, RefreshCw, ShieldAlert,
  Terminal, Zap, Server, Box, Network,
  AlertTriangle, X
} from 'lucide-react';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../../core/events';
import { kernel } from '../../core/Kernel';
import { settingsService } from '../../services/SettingsService';
import { cognitiveService } from '../../services/CognitiveService';
import { pricingService } from '../../services/PricingService';
import { routerService } from '../../services/RouterService';
import { useKeyStore } from '../../stores/useKeyStore';
import { FREE_TIER_LIMITS } from '../../services/KeyService';
import type { SystemState } from '../../types/metrics';
import type { CognitiveTrace } from '../../types/domain';
import type { RouterDecision } from '../../services/RouterService';

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

let eventIdCounter = 0;

const DashboardPanel: React.FC<DashboardPanelProps> = ({ onNavigate }) => {
  const { keys, checkAllHealth } = useKeyStore();
  const [systemState, setSystemState] = useState<SystemState>(() => kernel.getState());
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [traces, setTraces] = useState(() => cognitiveService.getTraces());
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [routerDecisions, setRouterDecisions] = useState<RouterDecision[]>(() => routerService.getDecisionHistory(10));
  const settings = settingsService.getSettings();

  const isMountedRef = useRef(true);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Автоочистка ошибки
  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        setCurrentTime(Date.now());
        setRouterDecisions(routerService.getDecisionHistory(10));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribeKernel = eventBus.on('kernel:updated', (state) => {
      if (!isMountedRef.current) return;
      try {
        setSystemState({ ...state });
        setError(null);
      } catch (e) {
        console.warn('[DashboardPanel] Failed to update system state:', e);
        if (isMountedRef.current) {
          setError('Failed to update system state');
          clearErrorAfterDelay();
        }
      }
    });

    const unsubscribeTraces = eventBus.on('trace:updated', (newTraces) => {
      if (!isMountedRef.current) return;
      try {
        setTraces([...(newTraces as CognitiveTrace[])]);
        setError(null);
      } catch (e) {
        console.warn('[DashboardPanel] Failed to update traces:', e);
        if (isMountedRef.current) {
          setError('Failed to update traces');
          clearErrorAfterDelay();
        }
      }
    });

    // Надёжная подписка на все события
    let unsubscribeAll: (() => void) | undefined;
    const handler = ({ event, data }: { event: string; data: unknown }) => {
      if (!isMountedRef.current) return;
      try {
        const d = data as Record<string, unknown>;
        const severity: RecentEvent['severity'] =
          event.includes('error') || d?.type === 'error' ? 'error' :
          event.includes('violation') || d?.type === 'warning' ? 'warning' :
          event.includes('end') || d?.type === 'success' ? 'success' :
          'info';

        eventIdCounter += 1;
        const id = Date.now() * 1000 + (eventIdCounter % 1000);
        setEvents((prev) => [{
          id,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          event,
          summary: summarizeEvent(data as Record<string, unknown>),
          severity
        }, ...prev].slice(0, 10));
      } catch (e) {
        console.warn('[DashboardPanel] Failed to process event:', e);
        if (isMountedRef.current) {
          setError('Failed to process event');
          clearErrorAfterDelay();
        }
      }
    };

    const maybeUnsubscribe = eventBus.subscribeAll(handler);
    if (typeof maybeUnsubscribe === 'function') {
      unsubscribeAll = maybeUnsubscribe;
    } else {
      console.warn('[DashboardPanel] eventBus.subscribeAll does not return an unsubscribe function; event bus may leak');
    }

    return () => {
      unsubscribeKernel();
      unsubscribeTraces();
      if (unsubscribeAll) unsubscribeAll();
    };
  }, [clearErrorAfterDelay]);

  const providerCounts = useMemo(() => ({
    active: keys.filter(k => k.status === 'active').length,
    checking: keys.filter(k => k.status === 'checking').length,
    error: keys.filter(k => k.status === 'error').length,
    inactive: keys.filter(k => k.status === 'inactive').length
  }), [keys]);

  const todayRequests = useMemo(
    () => traces.filter(t => t.startTime > currentTime - 24 * 60 * 60 * 1000).length,
    [traces, currentTime]
  );

  const totalTokens = useMemo(
    () => traces.reduce((sum, t) => sum + (t.totalTokens || 0), 0),
    [traces]
  );

  const estimatedCost = useMemo(
    () => pricingService.getBudgetInfo().spentThisMonth || (totalTokens / 1000) * 0.01,
    [totalTokens]
  );

  const rps = useMemo(() => {
    const now = Date.now();
    const recentTraces = traces.filter(t => t.startTime > now - 60000);
    return recentTraces.length;
  }, [traces, currentTime]);

  const errorRateTrend = useMemo(() => {
    const now = Date.now();
    const recent = traces.filter(t => t.startTime > now - 300000);
    const older = traces.filter(t => t.startTime > now - 600000 && t.startTime <= now - 300000);
    const recentErrors = recent.filter(t => t.status === 'error').length;
    const olderErrors = older.filter(t => t.status === 'error').length;
    const recentPct = recent.length > 0 ? recentErrors / recent.length : 0;
    const olderPct = older.length > 0 ? olderErrors / older.length : 0;
    if (olderPct === 0 && recentPct === 0) return 'stable';
    if (recentPct <= olderPct * 0.8) return 'improving';
    if (recentPct >= olderPct * 1.2) return 'worsening';
    return 'stable';
  }, [traces, currentTime]);

  const hasProviderErrors = providerCounts.error > 0 || systemState.violations.length > 0;

  const stats = [
    { label: 'Active LLMs', value: `${providerCounts.active}/${keys.length}`, hint: `${providerCounts.error} error, ${providerCounts.inactive} inactive`, icon: <Server size={22} />, color: providerCounts.active > 0 ? '#10b981' : '#f59e0b' },
    { label: 'Global Throughput', value: todayRequests.toString(), hint: `${traces.length} total sessions`, icon: <Activity size={22} />, color: '#3b82f6' },
    { label: 'RPS', value: rps.toString(), hint: 'Requests per minute', icon: <Zap size={22} />, color: '#06b6d4' },
    { label: 'Token Burn', value: formatNumber(totalTokens), hint: 'Total aggregated context', icon: <MessageSquare size={22} />, color: '#a855f7' },
    { label: 'Calculated Cost', value: `$${estimatedCost.toFixed(4)}`, hint: 'Real-time billing estimation', icon: <DollarSign size={22} />, color: '#f59e0b' }
  ];

  return (
    <div style={{ color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase' }}>System Online</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.25rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>Mission Control</h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
            Unified command center for agent orchestration, provider telemetry, and cognitive routing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => { checkAllHealth(); }} 
            style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            aria-label="Run diagnostics on all providers"
          >
            <RefreshCw size={16} aria-hidden="true" /> Run Diagnostics
          </button>
          <button 
            onClick={() => onNavigate('keys')} 
            style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}
            aria-label="Add new provider key"
          >
            <Key size={16} aria-hidden="true" /> Add Provider
          </button>
        </div>
      </div>

      {/* Critical Alert Banner */}
      <AnimatePresence>
        {hasProviderErrors && (
          <motion.div 
            initial={{ opacity: 0, y: -20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }}
            style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem 1.5rem', borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)', background: 'linear-gradient(90deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.02) 100%)', overflow: 'hidden' }}
            role="alert"
            aria-live="polite"
          >
            <ShieldAlert size={24} color="#ef4444" aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fca5a5', marginBottom: '0.2rem' }}>System Attention Required</div>
              <div style={{ fontSize: '0.8rem', color: '#fecaca', opacity: 0.8 }}>
                Detected {providerCounts.error} provider errors and {systemState.violations.length} security violations. Fallback routing is {settings.fallbackEnabled ? 'active' : 'disabled'}.
              </div>
            </div>
            <button onClick={() => onNavigate('events')} style={{ padding: '0.6rem 1rem', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer', fontWeight: 700 }} aria-label="Review system logs">
              Review Logs
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }} role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit' }} aria-label="Dismiss error">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {/* Top Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass-panel" 
            style={{ padding: '1.5rem', borderRadius: 16, position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)' }}
          >
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: stat.color, opacity: 0.05, filter: 'blur(20px)' }} aria-hidden="true" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ color: stat.color, background: `${stat.color}15`, padding: '0.6rem', borderRadius: 12, border: `1px solid ${stat.color}30` }}>{stat.icon}</div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: '0.25rem', lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>{stat.label}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>{stat.hint}</div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
        <SectionTitle icon={<Activity size={16} color="#10b981" />} title="System Health" action="Details" onAction={() => onNavigate('health')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>HEALTH</div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(10, Math.min(100, providerCounts.active / Math.max(1, keys.length) * 100))}%`, height: '100%', background: providerCounts.error > 0 ? '#ef4444' : '#10b981', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>{providerCounts.active}/{keys.length} active</div>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>ERROR RATE</div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (providerCounts.error / Math.max(1, keys.length)) * 100)}%`, height: '100%', background: providerCounts.error > 2 ? '#ef4444' : providerCounts.error > 0 ? '#f59e0b' : '#10b981', borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                {providerCounts.error} errors
                <span style={{ color: errorRateTrend === 'improving' ? '#10b981' : errorRateTrend === 'worsening' ? '#ef4444' : '#64748b', fontSize: '0.65rem' }}>
                  {errorRateTrend === 'improving' ? '↓ improving' : errorRateTrend === 'worsening' ? '↑ worsening' : '→ stable'}
                </span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>QUOTA BURN</div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                {(() => {
                  const maxQuota = Math.max(1, ...keys.map(k => FREE_TIER_LIMITS[k.provider]?.requestsPerDay || 1));
                  const totalUsed = keys.reduce((s, k) => s + (k.stats?.extended?.usageToday?.requests || 0), 0);
                  const pct = Math.min(100, (totalUsed / maxQuota) * 100);
                  return <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#3b82f6', borderRadius: 4 }} />;
                })()}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>{keys.reduce((s, k) => s + (k.stats?.extended?.usageToday?.requests || 0), 0).toLocaleString()} / day</div>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>LATENCY</div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                {(() => {
                  const avgLat = keys.filter(k => k.latency).reduce((s, k) => s + (k.latency || 0), 0) / Math.max(1, keys.filter(k => k.latency).length);
                  return <div style={{ width: `${Math.min(100, (avgLat / 2000) * 100)}%`, height: '100%', background: avgLat < 500 ? '#10b981' : avgLat < 1500 ? '#f59e0b' : '#ef4444', borderRadius: 4 }} />;
                })()}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>{keys.filter(k => k.latency).length > 0 ? `${Math.round(keys.filter(k => k.latency).reduce((s, k) => s + (k.latency || 0), 0) / Math.max(1, keys.filter(k => k.latency).length))}ms avg` : '--'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.15rem' }}>REAL-TIME METRICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              <div style={{ padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.2)' }}>
                <span style={{ fontSize: '0.6rem', color: '#64748b' }}>RPS</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: rps > 10 ? '#10b981' : rps > 3 ? '#f59e0b' : '#64748b' }}>{rps}</div>
              </div>
              <div style={{ padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.2)' }}>
                <span style={{ fontSize: '0.6rem', color: '#64748b' }}>LATENCY (P50)</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  {keys.filter(k => k.latency).length > 0 ? `${Math.round(keys.filter(k => k.latency).reduce((s, k) => s + (k.latency || 0), 0) / Math.max(1, keys.filter(k => k.latency).length))}ms` : '--'}
                </div>
              </div>
              <div style={{ padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.2)' }}>
                <span style={{ fontSize: '0.6rem', color: '#64748b' }}>TODAY REQS</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{todayRequests}</div>
              </div>
              <div style={{ padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.2)' }}>
                <span style={{ fontSize: '0.6rem', color: '#64748b' }}>COST TODAY</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>${estimatedCost.toFixed(4)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
        <SectionTitle icon={<Server size={16} color="#a855f7" />} title="Resource Pressure Map" action="Pools" onAction={() => onNavigate('pools')} />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {Array.from(new Set(keys.map(k => k.provider))).map(provider => {
            const providerKeys = keys.filter(k => k.provider === provider);
            const totalUsed = providerKeys.reduce((s, k) => s + (k.stats?.extended?.usageToday?.requests || 0), 0);
            const totalLimit = providerKeys.reduce((s, k) => s + (FREE_TIER_LIMITS[k.provider]?.requestsPerDay || 0), 0);
            const avgLat = providerKeys.filter(k => k.latency).reduce((s, k) => s + (k.latency || 0), 0) / Math.max(1, providerKeys.filter(k => k.latency).length);
            const pct = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
            const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : pct > 0 ? '#3b82f6' : '#64748b';
            return (
              <div key={provider} style={{ flex: '1 1 160px', padding: '0.6rem 0.75rem', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}25`, display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ProviderIcon provider={provider} size={14} />
                  <span style={{ fontWeight: 700, color: '#e2e8f0', textTransform: 'capitalize' }}>{provider}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, color }}>{pct}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.6rem' }}>
                  <span>{Math.round(avgLat)}ms avg</span>
                  <span style={{ color: providerKeys.filter(k => k.status === 'error').length > 0 ? '#ef4444' : '#10b981' }}>
                    {providerKeys.filter(k => k.status === 'active').length}/{providerKeys.length} active
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {keys.map(key => {
            const limit = FREE_TIER_LIMITS[key.provider]?.requestsPerDay;
            const used = key.stats?.extended?.usageToday?.requests || 0;
            const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
            const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : pct > 0 ? '#3b82f6' : '#64748b';
            return (
              <div key={key.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ProviderIcon provider={key.provider} size={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.15rem' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{key.label}</span>
                    <span style={{ color }}>{limit ? `${Math.round(pct)}%` : `${formatNumber(used)} req`}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Routing Activity */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
        <SectionTitle icon={<Zap size={16} color="#f59e0b" />} title="Routing Activity" action="Full View" onAction={() => onNavigate('routing')} />
        {routerDecisions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
            {routerDecisions.slice(0, 6).map((d, i) => {
              const top = d.scores[0];
              return (
                <div key={`${d.requestId}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.15)', fontSize: '0.7rem' }}>
                  <span style={{ color: '#475569', fontFamily: 'monospace', minWidth: 60 }}>{new Date(d.timestamp).toLocaleTimeString()}</span>
                  <span style={{ padding: '0.15rem 0.4rem', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 700, fontSize: '0.6rem' }}>{d.strategy}</span>
                  <span style={{ color: '#64748b' }}>→</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{d.selected}</span>
                  {d.secondBest && <span style={{ color: '#64748b' }}>(fallback: {d.secondBest})</span>}
                  {top && <span style={{ marginLeft: 'auto', color: '#64748b' }}>score: {top.score.toFixed(3)}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic' }}>
            No routing decisions yet
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Active Providers List */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SectionTitle icon={<Network size={20} color="#3b82f6" />} title="Inference Mesh" action="Configure" onAction={() => onNavigate('keys')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {keys.map((key) => (
              <div key={key.id} style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 0.7fr 1fr 0.6fr auto', gap: '0.75rem', alignItems: 'center', padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ProviderIcon provider={key.provider} size={18} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#e2e8f0' }}>{key.label}</div>
                    <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>{key.provider}</div>
                  </div>
                </div>
                <div><StatusPill status={key.status} /></div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={12} color={key.latency && key.latency < 500 ? '#10b981' : '#f59e0b'} /> {key.latency ? `${key.latency}ms` : '--'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {key.stats?.extended?.usageToday ? <QuotaDisplay used={key.stats.extended.usageToday.requests} limit={FREE_TIER_LIMITS[key.provider]?.requestsPerDay} /> : '--'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{key.stats?.successCount || 0} reqs</div>
                <button onClick={() => onNavigate('keys')} style={{ padding: '0.4rem 0.6rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }} aria-label={`Inspect ${key.label}`}>
                  Inspect
                </button>
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
      <span aria-hidden="true">{icon}</span> {title}
    </h2>
    {action && (
      <button onClick={onAction} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#60a5fa'} onMouseOut={e => e.currentTarget.style.color = '#3b82f6'} aria-label={`${action} for ${title}`}>
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
  }} aria-label={`Status: ${status}`}>
    <motion.span 
      animate={status === 'active' || status === 'checking' ? { opacity: [0.4, 1, 0.4] } : {}}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[status], boxShadow: `0 0 8px ${statusColor[status]}` }} 
      aria-hidden="true" 
    />
    {status}
  </span>
);

const EmptyState = ({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) => (
  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, fontSize: '0.9rem' }}>
    <Box size={32} opacity={0.3} style={{ margin: '0 auto 1rem' }} aria-hidden="true" />
    <div>{text}</div>
    {action && <button onClick={onAction} style={{ marginTop: '1.25rem', padding: '0.6rem 1rem', borderRadius: 8, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }} aria-label={action}>{action}</button>}
  </div>
);

const getSeverityColor = (severity: RecentEvent['severity']) => {
  if (severity === 'error') return '#ef4444';
  if (severity === 'warning') return '#f59e0b';
  if (severity === 'success') return '#10b981';
  return '#3b82f6';
};

export const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
};

const QuotaDisplay = ({ used, limit }: { used: number; limit: number | undefined }) => {
  if (!limit || limit === 0) return <>{formatNumber(used)} req</>;
  const pct = Math.round((used / limit) * 100);
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#94a3b8';
  return <><span style={{ color }}>{formatNumber(used)}</span> / {formatNumber(limit)} req</>;
};

const summarizeEvent = (data: Record<string, unknown> | string | null | undefined): string => {
  if (!data) return 'No payload provided';
  if (typeof data === 'string') return data;
  if (data.message) return String(data.message);
  if (data.provider) return `${String(data.provider)}${data.model ? ` / ${String(data.model)}` : ''}`;
  if (data.requestId) return `Req ID: ${String(data.requestId)}`;
  try {
    return JSON.stringify(data).slice(0, 100) + '...';
  } catch (e) {
    console.warn('[DashboardPanel] Failed to stringify event payload:', e);
    return 'Binary or complex payload';
  }
};

export default DashboardPanel;
