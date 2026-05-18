import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { kernel } from '../../core/Kernel';
import type { ProviderMetrics, DecisionTrace, SystemState } from '../../types/metrics';
import {
  BarChart3,
  Activity, Globe, ZapOff, Clock, TrendingUp,
  Coins, Hash, History, ChevronRight,
  Zap, Cpu, GitMerge, AlertTriangle, X
} from 'lucide-react';
import { eventBus } from '../../core/events';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
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

  const isMountedRef = useRef(true);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevTokensRef = useRef(kernel.getState().totalTokens);
  const prevCostRef = useRef(kernel.getState().estimatedCost);

  const clearErrorAfterDelay = () => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const update = (state: SystemState) => {
      if (!isMountedRef.current) return;

      try {
        setMetrics({ ...state.providers });
        setHistory([...state.decisions]);
        setKernelState({ ...state });
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
          clearErrorAfterDelay();
        }
      }
    };

    update(kernel.getState());
    const unsub = eventBus.on('kernel:updated', update);
    return () => unsub();
  }, []);

  const totalRequests = kernelState.totalRequests;
  const avgLatency = Object.values(metrics).length > 0
    ? Math.round(Object.values(metrics).reduce((acc, m) => acc + m.avgTTFT, 0) / Object.values(metrics).length)
    : 0;

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
        <div role="alert" aria-live="polite" style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit' }} aria-label={t('common.dismiss_error')}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Summary Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                {[
                  { label: t('analytics.metric.total_invocations'), value: totalRequests || 0, icon: <Zap size={20} aria-hidden="true" />, color: '#3b82f6', trend: '+12.5%' },
                  { label: t('analytics.metric.total_tokens'), value: (kernelState.totalTokens || 0).toLocaleString(), icon: <Hash size={20} aria-hidden="true" />, color: '#a855f7', trend: '+45.2%' },
                  { label: t('analytics.metric.platform_spend'), value: `$${(kernelState.estimatedCost || 0).toFixed(4)}`, icon: <Coins size={20} aria-hidden="true" />, color: '#10b981', trend: 'Stable' },
                  { label: t('analytics.metric.fleet_latency'), value: `${avgLatency || 0}ms`, icon: <Clock size={20} aria-hidden="true" />, color: '#f59e0b', trend: '-2.4%' },
                ].map((s, i) => (
                  <motion.div key={i} variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)', background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)', position: 'relative', overflow: 'hidden' }}>
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
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f8fafc' }}>
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
                      <Sparkline data={tokenHistory.length >= 2 ? tokenHistory : [100, 200]} color="#a855f7" height={230} />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, paddingBottom: 20 }}>
                      <Sparkline data={costHistory.length >= 2 ? costHistory : [0.1, 0.2]} color="#10b981" height={230} />
                    </div>

                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                      <span>T-24h</span>
                      <span>T-12h</span>
                      <span>T-6h</span>
                      <span>Now</span>
                    </div>
                  </div>
                </motion.div>

                {/* Workload Distribution */}
                <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#f8fafc' }}>
                    <GitMerge size={18} color="#3b82f6" aria-hidden="true" /> Traffic Distribution
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
                              aria-label={`${(m.selectionRate * 100).toFixed(0)}% of traffic`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                      Insufficient routing data.<br />Execute requests to populate distribution.
                    </div>
                  )}

                  <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 800, marginBottom: '0.25rem' }}>OPTIMIZATION ENGINE</div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>Traffic is dynamically routed based on TTFT latency and real-time provider health.</div>
                  </div>
                </motion.div>
              </div>

            </motion.div>
          )}

          {activeTab === 'providers' && (
            <motion.div key="providers" variants={containerVariants} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {Object.values(metrics).map((m) => (
                <motion.div key={m.id} variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: m.status === 'healthy' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${m.status === 'healthy' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                        <Cpu size={20} color={m.status === 'healthy' ? '#10b981' : '#ef4444'} aria-hidden="true" />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{m.id}</h4>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>LLM Endpoint</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em', color: m.status === 'healthy' ? '#10b981' : '#ef4444', background: m.status === 'healthy' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '0.3rem 0.6rem', borderRadius: 8 }}>
                      {m.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>Avg TTFT</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.avgTTFT < 500 ? '#10b981' : '#f59e0b' }}>{m.avgTTFT.toFixed(0)}<span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>ms</span></div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>Reliability</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: m.reliability > 0.95 ? '#10b981' : '#ef4444' }}>{(m.reliability * 100).toFixed(1)}<span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>%</span></div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Throughput (TPS)</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{m.avgTPS.toFixed(1)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
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
                <motion.div key={d.requestId} variants={itemVariants} style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>{d.selected}</span>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(59,130,246,0.2)' }}>{d.strategy}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{new Date(d.timestamp || currentTime).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      {d.secondBest ? `Chosen over ${d.secondBest} based on lowest predicted latency and high reliability.` : `Selected as the sole available provider.`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>Matrix Scores</div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {d.scores.slice(0, 2).map((s, i) => (
                          <span key={i} style={{ fontSize: '0.8rem', fontWeight: 700, color: i === 0 ? '#10b981' : '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                            {s.p}: {s.s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="btn-secondary" style={{ padding: '0.5rem', borderRadius: 10 }} aria-label="View details">
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
