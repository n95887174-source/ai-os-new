import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  Activity, DollarSign,
  Key, MessageSquare, RefreshCw, ShieldAlert,
  Terminal, Zap, Server, Box, Network,
  AlertTriangle, X
} from 'lucide-react';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { kernel } from '../../core/Kernel';
import { settingsService } from '../../kernel/instances';
import { cognitiveService } from '../../kernel/instances';
import { pricingService } from '../../kernel/instances';
import { routerService } from '../../kernel/instances';
import { monitoringService } from '../../kernel/instances';
import { useKeyStore } from '../../stores/useKeyStore';
import { FREE_TIER_LIMITS } from '../../kernel/instances';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import type { SystemState } from '../../types/metrics';
import type { CognitiveTrace } from '../../types/domain';
import type { RouterDecision } from '../../kernel/instances';
import { getStatusColor, pctColor, latencyColor, thresholdColor, StatusBadge, ThresholdBar } from '../Common/status-vocabulary';
import { t as translate } from '../../i18n/translations';

import { dismissBtn, errorBanner, flex1, flex1Min0, flex1Min100, flexCenterGap2, flexCenterGap2Mb05, flexCenterGap3, flexCenterSmGap, flexColGap2, flexColGap3, metricBox, panelRounded16, progressBar8, statusDot, textLabelSmall, textSecondary, textSmMutedMarginTop, textXxsSecondary } from '../../styles/common';
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

const DashboardPanel: React.FC<DashboardPanelProps> = ({ onNavigate }) => {
  const { keys, checkAllHealth } = useKeyStore();
  const eventIdCounter = useRef(0);
  const [systemState, setSystemState] = useState<SystemState>(() => kernel.getState());
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [traces, setTraces] = useState(() => { try { return cognitiveService.getTraces() ?? []; } catch { return []; } });
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [routerDecisions, setRouterDecisions] = useState<RouterDecision[]>(() => {
    try {
      const result = routerService?.getDecisionHistory?.(10);
      return Array.isArray(result) ? result : [];
    } catch { return [] as RouterDecision[]; }
  });
  const [healthIndicators, setHealthIndicators] = useState(() => {
    try { return monitoringService?.getSystemHealthIndicators?.(); } catch { return null; }
  });
  const settings = (() => { try { return settingsService.getSettings(); } catch { return { theme: 'dark' as const, language: 'en', notifications: true, autoSave: true, fontSize: 14, codeTheme: 'dark', enableVault: false, vaultTimeout: 5, model: 'auto', temperature: 0.7, maxTokens: 2048, presencePenalty: 0, frequencyPenalty: 0, }; } })();
  const fallbackEnabled = 'fallbackEnabled' in settings ? settings.fallbackEnabled : true;
  const { t } = useTranslation();

  const isMountedRef = useRef(true);

  const clearError = useAutoClearError(setError);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isMountedRef.current && !document.hidden) {
        setCurrentTime(Date.now());
        try {
          const result = routerService?.getDecisionHistory?.();
          if (Array.isArray(result) && result.length > 0) {
            setRouterDecisions(Array.isArray(result) ? result.slice(0, 60) : []);
          }
        } catch {}
try { setHealthIndicators(monitoringService?.getSystemHealthIndicators?.()); } catch {}
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
          clearError();
        }
      }
    });

    const unsubscribeTraces = eventBus.onSafe<CognitiveTrace[]>('trace:updated', (newTraces) => {
      if (!isMountedRef.current) return;
      try {
        setTraces([...newTraces]);
        setError(null);
      } catch (e) {
        console.warn('[DashboardPanel] Failed to update traces:', e);
        if (isMountedRef.current) {
          setError('Failed to update traces');
          clearError();
        }
      }
    });

    const unsubscribeHealth = eventBus.on(EVENTS.SYSTEM_HEALTH_CHANGED, () => {
      if (!isMountedRef.current) return;
      try { setHealthIndicators(monitoringService?.getSystemHealthIndicators?.()); } catch {}
    });

    // Надёжная подписка на все события
    let unsubscribeAll: (() => void) | undefined;
    const handler = ({ event, data }: { event: string; data: Record<string, unknown> }) => {
      if (!isMountedRef.current) return;
      try {
        const severity: RecentEvent['severity'] =
          event.includes('error') || data?.type === 'error' ? 'error' :
          event.includes('violation') || data?.type === 'warning' ? 'warning' :
          event.includes('end') || data?.type === 'success' ? 'success' :
          'info';

        eventIdCounter.current += 1;
        const id = Date.now() * 1000 + (eventIdCounter.current % 1000);
        setEvents((prev) => [{
          id,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          event,
          summary: summarizeEvent(data),
          severity
        }, ...prev].slice(0, 10));
      } catch (e) {
        console.warn('[DashboardPanel] Failed to process event:', e);
        if (isMountedRef.current) {
          setError('Failed to process event');
          clearError();
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
      if (unsubscribeHealth) unsubscribeHealth();
      if (unsubscribeAll) unsubscribeAll();
    };
  }, [clearError]);

  const providerCounts = useMemo(() => ({
    active: (keys ?? []).filter(k => k.status === 'active').length,
    checking: (keys ?? []).filter(k => k.status === 'checking').length,
    error: (keys ?? []).filter(k => k.status === 'error').length,
    inactive: (keys ?? []).filter(k => k.status === 'inactive').length
  }), [keys]);

  const todayRequests = useMemo(
    () => (traces ?? []).filter(t => t.startTime > currentTime - 24 * 60 * 60 * 1000).length,
    [traces, currentTime]
  );

  const totalTokens = useMemo(
    () => traces.reduce((sum, t) => sum + (t.totalTokens || 0), 0),
    [traces]
  );

  const estimatedCost = useMemo(
    () => pricingService.getBudgetInfo()?.spentThisMonth ?? (totalTokens / 1000) * 0.01,
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
    const recentErrors = recent.filter(t => t.status === 'failed').length;
    const olderErrors = older.filter(t => t.status === 'failed').length;
    const recentPct = recent.length > 0 ? recentErrors / recent.length : 0;
    const olderPct = older.length > 0 ? olderErrors / older.length : 0;
    if (olderPct === 0 && recentPct === 0) return 'stable';
    if (recentPct <= olderPct * 0.8) return 'improving';
    if (recentPct >= olderPct * 1.2) return 'worsening';
    return 'stable';
  }, [traces, currentTime]);

  const hasProviderErrors = providerCounts.error > 0 || systemState.violations.length > 0;

  const stats = [
    { label: t('dashboard.active_llms'), value: `${providerCounts.active}/${keys.length}`, hint: t('dashboard.active_llms_hint', { error: providerCounts.error, inactive: providerCounts.inactive }), icon: <Server size={22} />, color: providerCounts.active > 0 ? '#10b981' : '#f59e0b' },
    { label: t('dashboard.global_throughput'), value: todayRequests.toString(), hint: t('dashboard.today_sessions', { count: traces.length }), icon: <Activity size={22} />, color: '#3b82f6' },
    { label: t('dashboard.rps'), value: rps.toString(), hint: t('dashboard.rps_hint'), icon: <Zap size={22} />, color: '#06b6d4' },
    { label: t('dashboard.token_burn'), value: formatNumber(totalTokens), hint: t('dashboard.token_burn_hint'), icon: <MessageSquare size={22} />, color: '#a855f7' },
    { label: t('dashboard.calculated_cost'), value: `$${estimatedCost.toFixed(4)}`, hint: t('dashboard.calculated_cost_hint'), icon: <DollarSign size={22} />, color: '#f59e0b' }
  ];

  return (
    <div style={{ color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={flexCenterGap2Mb05}>
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} style={statusDot} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('dashboard.system_online')}</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.25rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>{t('dashboard.mission_control')}</h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={() => { checkAllHealth(); }} 
            style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            aria-label={t('dashboard.run_diagnostics_aria')}
          >
            <RefreshCw size={16} aria-hidden="true" /> {t('dashboard.run_diagnostics')}
          </button>
          <button 
            onClick={() => onNavigate('keys')} 
            style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}
            aria-label={t('dashboard.add_provider_aria')}
          >
            <Key size={16} aria-hidden="true" /> {t('dashboard.add_provider')}
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
            <div style={flex1}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fca5a5', marginBottom: '0.2rem' }}>{t('dashboard.system_attention_required')}</div>
              <div style={{ fontSize: '0.8rem', color: '#fecaca', opacity: 0.8 }}>
                {t('dashboard.alert_provider_errors', { errors: providerCounts.error, violations: systemState.violations.length, fallback: fallbackEnabled ? t('common.active') : t('common.disabled') })}
              </div>
            </div>
            <button onClick={() => onNavigate('events')} style={{ padding: '0.6rem 1rem', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer', fontWeight: 700 }} aria-label={t('dashboard.review_logs_aria')}>
              {t('dashboard.review_logs')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div style={errorBanner} role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={dismissBtn} aria-label={t('common.dismiss_error')}>
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

      <div className="glass-panel" style={panelRounded16}>
        <SectionTitle icon={<Activity size={16} color="#10b981" />} title={t('dashboard.system_health')} action={t('dashboard.details')} onAction={() => onNavigate('health')} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={flex1Min100}>
              <div style={textLabelSmall}>{t('dashboard.health_label')}</div>
              <div style={progressBar8}>
                <div style={{ width: `${Math.max(10, Math.min(100, providerCounts.active / Math.max(1, keys.length) * 100))}%`, height: '100%', background: providerCounts.error > 0 ? '#ef4444' : '#10b981', borderRadius: 4, transition: 'width 0.5s' }} />
              </div>
              <div style={textSmMutedMarginTop}>{t('dashboard.active_count', { active: providerCounts.active, total: keys.length })}</div>
            </div>
            <div style={flex1Min100}>
              <div style={textLabelSmall}>{t('dashboard.error_rate_label')}</div>
              <div style={progressBar8}>
                <div style={{ width: `${Math.min(100, (providerCounts.error / Math.max(1, keys.length)) * 100)}%`, height: '100%', background: providerCounts.error > 2 ? '#ef4444' : providerCounts.error > 0 ? '#f59e0b' : '#10b981', borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('dashboard.error_count', { count: providerCounts.error })}
                <span style={{ color: errorRateTrend === 'improving' ? '#10b981' : errorRateTrend === 'worsening' ? '#ef4444' : '#64748b', fontSize: '0.65rem' }}>
                  {errorRateTrend === 'improving' ? t('dashboard.trend_improving') : errorRateTrend === 'worsening' ? t('dashboard.trend_worsening') : t('dashboard.trend_stable')}
                </span>
              </div>
            </div>
            <div style={flex1Min100}>
              <div style={textLabelSmall}>{t('dashboard.quota_burn_label')}</div>
              <div style={progressBar8}>
                {(() => {
                  const maxQuota = Math.max(1, ...keys.map(k => FREE_TIER_LIMITS[k.provider]?.requestsPerDay || 1));
                  const totalUsed = keys.reduce((s, k) => s + (k.stats?.extended?.usageToday?.requests || 0), 0);
                  const pct = Math.min(100, (totalUsed / maxQuota) * 100);
                  return <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#3b82f6', borderRadius: 4 }} />;
                })()}
              </div>
              <div style={textSmMutedMarginTop}>{keys.reduce((s, k) => s + (k.stats?.extended?.usageToday?.requests || 0), 0).toLocaleString()} / day</div>
            </div>
            <div style={flex1Min100}>
              <div style={textLabelSmall}>{t('dashboard.latency_label')}</div>
              <div style={progressBar8}>
                {(() => {
                  const avgLat = keys.filter(k => k.latency).reduce((s, k) => s + (k.latency || 0), 0) / Math.max(1, keys.filter(k => k.latency).length);
                  return <div style={{ width: `${Math.min(100, (avgLat / 2000) * 100)}%`, height: '100%', background: avgLat < 500 ? '#10b981' : avgLat < 1500 ? '#f59e0b' : '#ef4444', borderRadius: 4 }} />;
                })()}
              </div>
              <div style={textSmMutedMarginTop}>{keys.filter(k => k.latency).length > 0 ? `${Math.round(keys.filter(k => k.latency).reduce((s, k) => s + (k.latency || 0), 0) / Math.max(1, keys.filter(k => k.latency).length))}${t('dashboard.ms_avg')}` : t('dashboard.dash')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1rem' }}>
            {healthIndicators && (
              <div style={{ padding: '0.4rem 0.6rem', borderRadius: 8, background: `${healthIndicators.score >= 0.8 ? '#10b981' : healthIndicators.score >= 0.5 ? '#f59e0b' : '#ef4444'}15`, border: `1px solid ${healthIndicators.score >= 0.8 ? '#10b981' : healthIndicators.score >= 0.5 ? '#f59e0b' : '#ef4444'}30`, marginBottom: '0.25rem' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: '0.15rem' }}>{t('dashboard.health_score')}</div>
                <div style={flexCenterGap2}>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(healthIndicators.score * 100)}%`, height: '100%', background: healthIndicators.score >= 0.8 ? '#10b981' : healthIndicators.score >= 0.5 ? '#f59e0b' : '#ef4444', borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: healthIndicators.score >= 0.8 ? '#10b981' : healthIndicators.score >= 0.5 ? '#f59e0b' : '#ef4444' }}>{Math.round(healthIndicators.score * 100)}%</span>
                </div>
                <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '0.15rem', textTransform: 'capitalize' }}>{t('dashboard.status_label')} {healthIndicators.status}</div>
              </div>
            )}
            <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.15rem' }}>{t('dashboard.real_time_metrics')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              <div style={metricBox}>
                <span style={textXxsSecondary}>{t('dashboard.rps')}</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: rps > 10 ? '#10b981' : rps > 3 ? '#f59e0b' : '#64748b' }}>{rps}</div>
              </div>
              <div style={metricBox}>
                <span style={textXxsSecondary}>{t('dashboard.latency_p50')}</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  {keys.filter(k => k.latency).length > 0 ? `${Math.round(keys.filter(k => k.latency).reduce((s, k) => s + (k.latency || 0), 0) / Math.max(1, keys.filter(k => k.latency).length))}${t('chat.latency_ms')}` : t('dashboard.dash')}
                </div>
              </div>
              <div style={metricBox}>
                <span style={textXxsSecondary}>{t('dashboard.today_reqs')}</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{todayRequests}</div>
              </div>
              <div style={metricBox}>
                <span style={textXxsSecondary}>{t('dashboard.cost_today')}</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>${estimatedCost.toFixed(4)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={panelRounded16}>
        <SectionTitle icon={<Server size={16} color="#a855f7" />} title={t('dashboard.resource_pressure_map')} action={t('dashboard.pools')} onAction={() => onNavigate('pools')} />
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {Array.from(new Set(keys.map(k => k.provider))).map(provider => {
            const providerKeys = keys.filter(k => k.provider === provider);
            const totalUsed = providerKeys.reduce((s, k) => s + (k.stats?.extended?.usageToday?.requests || 0), 0);
            const totalLimit = providerKeys.reduce((s, k) => s + (FREE_TIER_LIMITS[k.provider]?.requestsPerDay || 0), 0);
            const avgLat = providerKeys.filter(k => k.latency).reduce((s, k) => s + (k.latency || 0), 0) / Math.max(1, providerKeys.filter(k => k.latency).length);
            const pct = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
            const color = thresholdColor(pct, 70, 90);
            return (
              <div key={provider} style={{ flex: '1 1 160px', padding: '0.6rem 0.75rem', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}25`, display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem' }}>
                <div style={flexCenterSmGap}>
                  <ProviderIcon provider={provider} size={14} />
                  <span style={{ fontWeight: 700, color: '#e2e8f0', textTransform: 'capitalize' }}>{provider}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 800, color }}>{pct}%</span>
                </div>
                <ThresholdBar pct={pct} />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.6rem' }}>
                  <span>{Math.round(avgLat)}{t('dashboard.ms_avg')}</span>
                  <span style={{ color: providerKeys.filter(k => k.status === 'error').length > 0 ? '#ef4444' : '#10b981' }}>
                    {t('dashboard.active_count', { active: providerKeys.filter(k => k.status === 'active').length, total: providerKeys.length })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={flexColGap2}>
          {keys.map(key => {
            const limit = FREE_TIER_LIMITS[key.provider]?.requestsPerDay;
            const used = key.stats?.extended?.usageToday?.requests || 0;
            const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
            return (
              <div key={key.id} style={flexCenterGap3}>
                <ProviderIcon provider={key.provider} size={14} />
                <div style={flex1Min0}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.15rem' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{key.label}</span>
                    <span style={{ color: thresholdColor(pct, 70, 90) }}>{limit ? `${Math.round(pct)}%` : `${formatNumber(used)} req`}</span>
                  </div>
                  <ThresholdBar pct={pct} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Routing Activity */}
      <div className="glass-panel" style={panelRounded16}>
        <SectionTitle icon={<Zap size={16} color="#f59e0b" />} title={t('dashboard.routing_activity')} action={t('dashboard.full_view')} onAction={() => onNavigate('routing')} />
        {routerDecisions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
            {routerDecisions.slice(0, 6).map((d, i) => {
              const top = d.scores[0];
              return (
                <div key={`${d.requestId}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.15)', fontSize: '0.7rem' }}>
                  <span style={{ color: '#475569', fontFamily: 'monospace', minWidth: 60 }}>{new Date(d.timestamp).toLocaleTimeString()}</span>
                  <span style={{ padding: '0.15rem 0.4rem', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 700, fontSize: '0.6rem' }}>{d.strategy}</span>
                  <span style={textSecondary}>→</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{d.selected}</span>
                  {d.secondBest && <span style={textSecondary}>(fallback: {d.secondBest})</span>}
                  {top && <span style={{ marginLeft: 'auto', color: '#64748b' }}>score: {top.score.toFixed(3)}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic' }}>
            {t('dashboard.no_routing_decisions')}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Active Providers List */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SectionTitle icon={<Network size={20} color="#3b82f6" />} title={t('dashboard.inference_mesh')} action={t('dashboard.configure')} onAction={() => onNavigate('keys')} />
          <div style={flexColGap3}>
            {keys.map((key) => (
              <div key={key.id} style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 0.7fr 1fr 0.6fr auto', gap: '0.75rem', alignItems: 'center', padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)'; }}
              >
                <div style={flexCenterGap3}>
                  <ProviderIcon provider={key.provider} size={18} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#e2e8f0' }}>{key.label}</div>
                    <div style={{ color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.1rem' }}>{key.provider}</div>
                  </div>
                </div>
                <div><StatusBadge status={key.status} size="sm" /></div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={12} color={latencyColor(key.latency || 0)} /> {key.latency ? `${key.latency}${t('chat.latency_ms')}` : t('dashboard.dash')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {key.stats?.extended?.usageToday ? <QuotaDisplay used={key.stats.extended.usageToday.requests} limit={FREE_TIER_LIMITS[key.provider]?.requestsPerDay} /> : t('dashboard.dash')}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{`${key.stats?.successCount || 0} ${t('dashboard.reqs_unit')}`}</div>
                <button onClick={() => onNavigate('keys')} style={{ padding: '0.4rem 0.6rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }} aria-label={`${t('dashboard.inspect_aria')} ${key.label}`}>
                  {t('dashboard.inspect')}
                </button>
              </div>
            ))}
            {keys.length === 0 && (
              <EmptyState text={t('dashboard.no_providers')} action={t('dashboard.connect_provider')} onAction={() => onNavigate('keys')} />
            )}
          </div>
        </div>

        {/* Live Terminal / Event Log */}
        <div className="glass-panel" style={{ borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <SectionTitle icon={<Terminal size={18} color="#a855f7" />} title={t('dashboard.live_system_stream')} action={t('dashboard.full_logs')} onAction={() => onNavigate('events')} />
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: '#020617', height: '100%', minHeight: 300 }}>
            {events.map((event) => (
              <div key={`${event.id}-${event.event}`} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: '#475569', flexShrink: 0, marginTop: 2 }}>[{event.time}]</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ color: getStatusColor(event.severity), fontWeight: 700 }}>{event.event}</div>
                  <div style={{ color: '#cbd5e1', opacity: 0.8, lineHeight: 1.4, wordBreak: 'break-word' }}>{event.summary}</div>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
                <Activity size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <span>{t('dashboard.awaiting_telemetry')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <ModuleInfo moduleKey="dashboard" />
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

const EmptyState = ({ text, action, onAction }: { text: string; action?: string; onAction?: () => void }) => (
  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, fontSize: '0.9rem' }}>
    <Box size={32} opacity={0.3} style={{ margin: '0 auto 1rem' }} aria-hidden="true" />
    <div>{text}</div>
    {action && <button onClick={onAction} style={{ marginTop: '1.25rem', padding: '0.6rem 1rem', borderRadius: 8, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }} aria-label={action}>{action}</button>}
  </div>
);

export const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
};

const QuotaDisplay = ({ used, limit }: { used: number; limit: number | undefined }) => {
  if (!limit || limit === 0) return <>{`${formatNumber(used)} ${translate('common.req_unit')}`}</>;
  const pct = Math.round((used / limit) * 100);
  return <><span style={{ color: pctColor(pct) }}>{formatNumber(used)}</span> / {formatNumber(limit)} {translate('common.req_unit')}</>;
};

const summarizeEvent = (data: Record<string, unknown> | string | null | undefined): string => {
  if (!data) return translate('dashboard.summary_no_payload');
  if (typeof data === 'string') return data;
  if (data.message) return String(data.message);
  if (data.provider) return `${String(data.provider)}${data.model ? ` / ${String(data.model)}` : ''}`;
  if (data.requestId) return `Req ID: ${String(data.requestId)}`;
  try {
    return JSON.stringify(data).slice(0, 100) + '...';
  } catch {
    return translate('dashboard.summary_complex_payload');
  }
};

export default DashboardPanel;
