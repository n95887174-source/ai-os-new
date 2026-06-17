import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { kernel } from '../../kernel/kernel';
import { cacheService, providerTracker } from '../../kernel/instances';
import type { HealthEvent } from '../../kernel/services/provider-tracker';
import type { ProviderMetrics, DecisionTrace, SystemState } from '../../types/metrics'
import {
  BarChart3,
  Activity, Globe, ZapOff, Clock, TrendingUp,
  Coins, Hash, History, ChevronRight,
  Zap, Cpu, GitMerge, AlertTriangle, X, HardDrive
} from 'lucide-react';
import { eventBus } from '../../kernel/events/event-bus';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { dismissBtn, errorBanner, h3ChartTitle, providerMetricBox, summaryMetricCard, workloadInfoBox } from '../../styles/common'
import { t as translate } from '../../i18n/translations';

const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 40 }) => {
  if (!data.length) return null;
  if (data.length === 1) {
    return (
      <div style={{ width: '100%', height, background: `${color}20`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: '0.75rem' }}>
        {translate('analytics.sparkline.insufficient_data')}
      </div>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 200;

  const smoothLine = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / range) * height;
    if (i === 0) return `M ${x},${y}`;
    const prevX = ((i - 1) / (data.length - 1)) * width;
    const prevY = height - ((data[i - 1] - min) / range) * height;
    const cpX = prevX + (x - prevX) / 2;
    return `C ${cpX},${prevY} ${cpX},${y} ${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={`${smoothLine}`} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${smoothLine} L ${width},${height} L 0,${height} Z`} fill={`url(#grad-${color})`} />
    </svg>
  );
};

const SparklineMemo = React.memo(Sparkline);

const AnalyticsPanel: React.FC = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<Record<string, ProviderMetrics>>({});
  const [history, setHistory] = useState<DecisionTrace[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'decisions'>('overview');
  const [kernelState, setKernelState] = useState(kernel.getState());
  const [tokenHistory, setTokenHistory] = useState<number[]>([]);
  const [costHistory, setCostHistory] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState(() => { try { return cacheService.getStats(); } catch { return null; } });
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);

  const isMountedRef = useRef(true);
  const prevTokensRef = useRef(kernel.getState().totalTokens);
  const prevCostRef = useRef(kernel.getState().estimatedCost);

  const clearError = useAutoClearError(setError);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const update = (state: SystemState) => {
      if (!isMountedRef.current) return;

      try {
        setMetrics({ ...state.providers });
        setHistory(state.decisions ? [...state.decisions] : []);
        setKernelState(state ? { ...state } : kernel.getState());
        setCacheStats(cacheService.getStats());
        setHealthEvents(providerTracker.getHealthEvents(undefined, 12));
        setCurrentTime(Date.now());
        setError(null);

        const deltaTokens = state.totalTokens - prevTokensRef.current;
        prevTokensRef.current = state.totalTokens;
        setTokenHistory(prev => {
          const next = deltaTokens > 0 ? [...prev, deltaTokens] : prev;
          return next.length > 24 ? next.slice(-24) : next;
        });

        const deltaCost = state.estimatedCost - prevCostRef.current;
        prevCostRef.current = state.estimatedCost;
        setCostHistory(prev => {
          const next = deltaCost > 0 ? [...prev, deltaCost] : prev;
          return next.length > 24 ? next.slice(-24) : next;
        });
      } catch (e) {
        console.warn('[AnalyticsPanel] Failed to process telemetry update:', e);
        if (isMountedRef.current) {
          setError('Failed to process telemetry update');
          clearError();
        }
      }
    };

    update(kernel.getState());
    const unsub = eventBus.on('kernel:updated', update);
    return () => unsub();
  }, [clearError]);

  const totalRequests = kernelState.totalRequests;
  const avgLatency = Object.values(metrics).length > 0
    ? Math.round(Object.values(metrics).reduce((acc, m) => acc + m.avgTTFT, 0) / Object.values(metrics).length)
    : 0;

  const latencyHistory = kernelState.history?.slice(-24).map((h) => h.ttft) || [];
  const reliabilityHistory = kernelState.history?.slice(-24).map((h) => h.reliability * 100) || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <BarChart3 size={28} color="#3b82f6" aria-hidden="true" /> {t('analytics.title')}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>{t('analytics.subtitle')}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: 12, border: '1px solid var(--border)' }} role="tablist" aria-label="Analytics views">
          {[
            { id: 'overview', label: t('analytics.tab.overview'), icon: <Activity size={14} aria-hidden="true" /> },
            { id: 'providers', label: t('analytics.tab.providers'), icon: <Globe size={14} aria-hidden="true" /> },
            { id: 'decisions', label: t('analytics.tab.decisions'), icon: <History size={14} aria-hidden="true" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'providers' | 'decisions')}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-label={`Switch to ${tab.label}`}
              style={{
                padding: '0.6rem 1.25rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8,
                background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: activeTab === tab.id ? '#3b82f6' : 'var(--text-muted)'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="polite" style={errorBanner}>
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={dismissBtn} aria-label={t('common.dismiss_error')}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Summary Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                {[
                  { label: t('analytics.metric.total_invocations'), value: totalRequests || 0, icon: <Zap size={20} aria-hidden="true" />, color: '#3b82f6', trend: '+12.5%' },
                  { label: t('analytics.metric.total_tokens'), value: (kernelState.totalTokens || 0).toLocaleString(), icon: <Hash size={20} aria-hidden="true" />, color: '#a855f7', trend: '+45.2%' },
                  { label: t('analytics.metric.platform_spend'), value: `$${(kernelState.estimatedCost || 0).toFixed(4)}`, icon: <Coins size={20} aria-hidden="true" />, color: '#10b981', trend: 'Stable' },
                  { label: t('analytics.metric.fleet_latency'), value: `${avgLatency || 0}ms`, icon: <Clock size={20} aria-hidden="true" />, color: '#f59e0b', trend: '-2.4%' },
                ].map((s) => (
                  <motion.div key={s.label} variants={itemVariants} className="glass-panel" style={summaryMetricCard}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: s.color, opacity: 0.05, filter: 'blur(20px)' }} aria-hidden="true" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ color: s.color, background: `${s.color}15`, padding: '0.6rem', borderRadius: 12, border: `1px solid ${s.color}30` }}>{s.icon}</div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: s.trend.startsWith('+') ? '#10b981' : s.trend.startsWith('-') ? '#3b82f6' : 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.6rem', borderRadius: 10 }} aria-label={`Trend: ${s.trend}`}>{s.trend}</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{s.value}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Advanced Charts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

                {/* Main Telemetry Chart */}
                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                      <h3 style={{ ...h3ChartTitle, margin: '0 0 0.25rem' }}>
                        <TrendingUp size={18} color="#a855f7" aria-hidden="true" /> {t('analytics.chart.token_throughput')}
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Real-time telemetry aggregated over the last 24 hours.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7' }} aria-hidden="true" /> Tokens</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} aria-hidden="true" /> Spend ($)</span>
                    </div>
                  </div>

                  <div style={{ flex: 1, position: 'relative', minHeight: 250 }}>
                    <div style={{ position: 'absolute', inset: 0, paddingBottom: 20 }}>
                      <SparklineMemo data={tokenHistory.length >= 2 ? tokenHistory : [100, 200]} color="#a855f7" height={230} />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, paddingBottom: 20 }}>
                      <SparklineMemo data={costHistory.length >= 2 ? costHistory : [0.1, 0.2]} color="#10b981" height={230} />
                    </div>

                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                      <span>{t('analytics.time_24h')}</span>
                      <span>{t('analytics.time_12h')}</span>
                      <span>{t('analytics.time_6h')}</span>
                      <span>{t('analytics.time_now')}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Workload Distribution */}
                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16 }}>
                  <h3 style={h3ChartTitle}>
                    <GitMerge size={18} color="#3b82f6" aria-hidden="true" /> {t('analytics.traffic_distribution')}
                  </h3>

                  {Object.values(metrics).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {Object.values(metrics).map((m) => (
                        <div key={m.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{m.id}</span>
                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>{(m.selectionRate * 100).toFixed(1)}%</span>
                          </div>
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${m.selectionRate * 100}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              style={{ height: '100%', background: m.avgTTFT < 500 ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: 4 }}
                              aria-label={t('analytics.traffic_aria', { pct: (m.selectionRate * 100).toFixed(0) })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                      {t('analytics.empty_traffic_line1')}<br />{t('analytics.empty_traffic_line2')}
                    </div>
                  )}

                  <div style={workloadInfoBox}>
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 800, marginBottom: '0.25rem' }}>{t('analytics.optimization_engine')}</div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>{t('analytics.optimization_desc')}</div>
                  </div>
                </motion.div>
              </div>

              {/* Provider Health Section (M-02) */}
              {Object.values(metrics).length > 0 && (
                <motion.div variants={itemVariants} style={{ padding: '1.25rem 1.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                    <Activity size={18} color="#3b82f6" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>{t('analytics.provider_health')}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    {(() => {
                      const all = Object.values(metrics);
                      const healthy = all.filter(m => m.status === 'healthy').length;
                      const degraded = all.filter(m => m.status === 'degraded').length;
                      const offline = all.filter(m => m.status === 'offline').length;
                      const avgEwmaLatency = all.reduce((a, m) => a + m.avgTTFT, 0) / all.length;
                      const avgReliability = all.reduce((a, m) => a + m.reliability, 0) / all.length;
                      const totalReqs = all.reduce((a, m) => a + m.totalRequests, 0);
                      const errorRate = totalReqs > 0 ? (1 - avgReliability) * 100 : 0;
                      return (
                        <>
                          <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{t('analytics.active')}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{healthy}<span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>/{all.length}</span></div>
                          </div>
                          <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{t('analytics.degraded')}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>{degraded}</div>
                          </div>
                          <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{t('analytics.offline')}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{offline}</div>
                          </div>
                          <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{t('analytics.avg_ewma_latency')}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: avgEwmaLatency < 500 ? '#10b981' : '#f59e0b' }}>{avgEwmaLatency.toFixed(0)}<span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>ms</span></div>
                          </div>
                          <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{t('analytics.error_rate')}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: errorRate < 5 ? '#10b981' : '#ef4444' }}>{errorRate.toFixed(1)}<span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>%</span></div>
                          </div>
                          <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{t('analytics.reliability')}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: avgReliability > 0.95 ? '#10b981' : '#f59e0b' }}>{(avgReliability * 100).toFixed(1)}<span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>%</span></div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {Object.values(metrics).map((m) => (
                      <span key={m.id} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 6, fontWeight: 700, background: m.status === 'healthy' ? 'rgba(16,185,129,0.1)' : m.status === 'degraded' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: m.status === 'healthy' ? '#10b981' : m.status === 'degraded' ? '#f59e0b' : '#ef4444' }}>
                        {m.id} ({(m.avgTTFT).toFixed(0)}ms)
                      </span>
                    ))}
                  </div>
                  {(latencyHistory.length >= 2 || reliabilityHistory.length >= 2) && (
                    <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {latencyHistory.length >= 2 && (
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>Fleet EWMA latency (TTFT)</div>
                          <div style={{ height: 48 }}>
                            <SparklineMemo data={latencyHistory} color="#3b82f6" height={48} />
                          </div>
                        </div>
                      )}
                      {reliabilityHistory.length >= 2 && (
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>Fleet reliability trend</div>
                          <div style={{ height: 48 }}>
                            <SparklineMemo data={reliabilityHistory} color="#10b981" height={48} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {healthEvents.length > 0 && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem' }}>Recent health events (ProviderTracker)</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                        {healthEvents.map((ev, i) => (
                          <div key={`${ev.timestamp}-${i}`} style={{ fontSize: '0.7rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{
                              textTransform: 'uppercase',
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: 4,
                              flexShrink: 0,
                              color: ev.type === 'recovery' ? '#10b981' : ev.type === 'error_burst' ? '#ef4444' : '#f59e0b',
                              background: ev.type === 'recovery' ? 'rgba(16,185,129,0.15)' : ev.type === 'error_burst' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                            }}>
                              {ev.type.replace('_', ' ')}
                            </span>
                            <span style={{ color: '#94a3b8', flex: 1 }}>
                              <strong style={{ color: '#e2e8f0' }}>{ev.provider}</strong> — {ev.detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Cache Hit Rate Block (M-03) */}
              <motion.div variants={itemVariants} style={{ padding: '1rem 1.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <HardDrive size={20} color="#a855f7" />
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>{t('analytics.cache_hit_rate')}</span>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
                      {cacheStats?.hits ?? 0} {t('analytics.cache_hits')} / {(cacheStats?.hits ?? 0) + (cacheStats?.misses ?? 0)} {t('analytics.cache_requests')}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: (cacheStats?.hitRate ?? 0) > 0.3 ? '#10b981' : (cacheStats?.hitRate ?? 0) > 0.1 ? '#f59e0b' : '#64748b' }}>
                  {((cacheStats?.hitRate ?? 0) * 100).toFixed(1)}%
                </div>
              </motion.div>

            </motion.div>
          )}

          {activeTab === 'providers' && (
            <motion.div key="providers" variants={containerVariants} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {Object.values(metrics).map((m) => {
                const maxTTFT = Math.max(...Object.values(metrics).map(p => p.avgTTFT), 1);
                const maxTPS = Math.max(...Object.values(metrics).map(p => p.avgTPS), 1);
                return (
                <motion.div key={m.id} variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: m.status === 'healthy' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${m.status === 'healthy' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                        <Cpu size={20} color={m.status === 'healthy' ? '#10b981' : '#ef4444'} aria-hidden="true" />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{m.id}</h4>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>{m.totalRequests} requests</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', color: m.status === 'healthy' ? '#10b981' : '#ef4444', background: m.status === 'healthy' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '0.3rem 0.6rem', borderRadius: 8 }}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={providerMetricBox}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>{t('analytics.avg_ttft')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.avgTTFT < 500 ? '#10b981' : '#f59e0b' }}>{m.avgTTFT.toFixed(0)}<span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>ms</span></div>
                      <div style={{ marginTop: '0.3rem', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${Math.min((m.avgTTFT / maxTTFT) * 100, 100)}%`, background: m.avgTTFT < 500 ? '#10b981' : '#f59e0b' }} />
                      </div>
                    </div>
                    <div style={providerMetricBox}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>{t('analytics.reliability')}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.reliability > 0.95 ? '#10b981' : '#ef4444' }}>{(m.reliability * 100).toFixed(1)}<span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>%</span></div>
                      <div style={{ marginTop: '0.3rem', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${m.reliability * 100}%`, background: m.reliability > 0.95 ? '#10b981' : '#ef4444' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>TPS</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>{m.avgTPS.toFixed(1)}</div>
                      <div style={{ marginTop: '0.2rem', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${Math.min((m.avgTPS / maxTPS) * 100, 100)}%`, background: '#3b82f6' }} />
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>Stability</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: m.stabilityIndex > 0.8 ? '#10b981' : '#f59e0b' }}>{(m.stabilityIndex * 100).toFixed(0)}%</div>
                      <div style={{ marginTop: '0.2rem', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${m.stabilityIndex * 100}%`, background: m.stabilityIndex > 0.8 ? '#10b981' : '#f59e0b' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Reputation</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: m.reputationScore > 70 ? '#10b981' : m.reputationScore > 40 ? '#f59e0b' : '#ef4444' }}>{m.reputationScore.toFixed(0)}/100</span>
                  </div>
                </motion.div>
                );
              })}
              {Object.values(metrics).length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                  <Globe size={48} opacity={0.2} style={{ marginBottom: '1rem' }} aria-hidden="true" />
                  <p>{t('analytics.empty.providers')}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'decisions' && (
            <motion.div key="decisions" variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.length === 0 && (
                <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
                  <ZapOff size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} aria-hidden="true" />
                  <p>{t('analytics.empty.decisions')}</p>
                </div>
              )}
              {history.slice(0, 20).map((d) => (
                <motion.div key={d.requestId} variants={itemVariants} style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, borderLeft: `4px solid ${d.isExperiment ? '#f59e0b' : '#3b82f6'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>{d.selected}</span>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(59,130,246,0.2)' }}>{d.strategy}</span>
                      {d.classification && (
                        <span style={{ fontSize: '0.6rem', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 700 }}>
                          {d.classification.complexity}{d.classification.isCode ? ' +code' : ''}
                        </span>
                      )}
                      {d.profile && (
                        <span style={{ fontSize: '0.6rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 700 }}>
                          {d.profile}
                        </span>
                      )}
                      {d.isExperiment && (
                        <span style={{ fontSize: '0.6rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '0.15rem 0.5rem', borderRadius: 6, fontWeight: 700 }}>
                          A/B
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{new Date(d.timestamp || currentTime).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      {d.secondBest ? t('analytics.decision_chosen', { provider: d.secondBest }) : t('analytics.decision_sole')}
                    </div>
                    {d.skipped && d.skipped.length > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.3rem' }}>
                        Skipped: {d.skipped.map(s => s.provider).join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>{t('analytics.matrix_scores')}</div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {d.scores.slice(0, 3).map((s, i) => (
                          <span key={i} style={{ fontSize: '0.8rem', fontWeight: 700, color: i === 0 ? '#10b981' : '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                            {s.p}: {s.s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="btn-secondary" style={{ padding: '0.5rem', borderRadius: 10 }} aria-label={t('analytics.view_details')}>
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ModuleInfo moduleKey="analytics" />
    </div>
  );
};

export default AnalyticsPanel;
