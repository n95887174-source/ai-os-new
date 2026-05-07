import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { kernel } from '../../core/Kernel';
import type { ProviderMetrics, DecisionTrace, SystemState } from '../../types/metrics';
import { 
  AlertTriangle, ChevronRight, BarChart3, HelpCircle, 
  Activity, Globe, ZapOff, Clock, TrendingUp, 
  Coins, Hash, ShieldAlert, History
} from 'lucide-react';
import { eventBus } from '../../core/events';
import { routerService } from '../../services/RouterService';

const Sparkline: React.FC<{ data: number[], color: string }> = ({ data, color }) => {
  if (data.length < 2) return <div style={{ width: '100%', height: 40, opacity: 0.1, background: color, borderRadius: 4 }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 200;
  const height = 40;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - ((d - min) / range) * height}`).join(' ');
  
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path d={`M ${points}`} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M ${points} L ${width},${height} L 0,${height} Z`} fill={color} fillOpacity={0.1} />
    </svg>
  );
};

const AnalyticsPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<Record<string, ProviderMetrics>>({});
  const [history, setHistory] = useState<DecisionTrace[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'decisions'>('overview');
  const [kernelState, setKernelState] = useState(kernel.getState());

  useEffect(() => {
    const update = (state: SystemState) => {
      setMetrics({ ...state.providers });
      setHistory([...state.decisions]);
      setKernelState({ ...state });
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
    <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Tab Switcher */}
      <motion.div variants={itemVariants} style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)', padding: '0 0.5rem' }}>
        {[
          { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
          { id: 'providers', label: 'Provider Performance', icon: <Globe size={16} /> },
          { id: 'decisions', label: 'Decision Log', icon: <History size={16} /> },
        ].map((t) => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id as 'overview' | 'providers' | 'decisions')}
            style={{ 
              background: 'none', border: 'none', padding: '0.75rem 0', cursor: 'pointer',
              color: activeTab === t.id ? '#3b82f6' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === t.id ? '#3b82f6' : 'transparent'}`,
              fontSize: '0.95rem', fontWeight: activeTab === t.id ? 600 : 500,
              transition: 'all 0.2s', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              {[
                { label: 'Total Requests', value: totalRequests || 0, icon: <Activity size={18} />, color: '#3b82f6' },
                { label: 'Total Tokens', value: (kernelState.totalTokens || 0).toLocaleString(), icon: <Hash size={18} />, color: '#a855f7' },
                { label: 'Estimated Cost', value: `$${(kernelState.estimatedCost || 0).toFixed(4)}`, icon: <Coins size={18} />, color: '#10b981' },
                { label: 'Avg. Latency', value: `${avgLatency || 0}ms`, icon: <Clock size={18} />, color: '#f59e0b' },
              ].map((s, i) => (
                <motion.div key={i} variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
                    <div style={{ color: s.color, background: `${s.color}15`, padding: '0.4rem', borderRadius: 8 }}>{s.icon}</div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{s.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Main Dashboard Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
              {/* Latency History Chart */}
              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <TrendingUp size={20} color="#3b82f6" /> Latency Over Time
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 24 events</span>
                </div>
                <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Sparkline data={(kernelState.history || []).map(h => h.ttft).slice(-40)} color="#3b82f6" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Earlier</span>
                  <span>Now</span>
                </div>
              </motion.div>

              {/* Workload Share */}
              <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <BarChart3 size={20} color="#a855f7" /> Workload Share
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {Object.values(metrics).map((m) => (
                    <div key={m.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600 }}>{m.id}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{(m.selectionRate * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${m.selectionRate * 100}%` }} 
                          style={{ height: '100%', background: m.avgTTFT < 500 ? '#10b981' : '#f59e0b', borderRadius: 4 }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Safety Violations Log */}
            {kernelState.violations && kernelState.violations.length > 0 && (
              <motion.div variants={itemVariants} style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.05)', borderRadius: 16, border: '1px solid rgba(239,68,68,0.1)' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={18} /> Recent Safety Contract Violations
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {kernelState.violations.slice(-3).map((v, i) => (
                    <div key={i} style={{ fontSize: '0.85rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={14} /> {v}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'providers' && (
          <motion.div key="providers" variants={containerVariants} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {Object.values(metrics).map((m) => (
              <motion.div key={m.id} variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.status === 'healthy' ? '#10b981' : '#ef4444' }} />
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{m.id}</h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.6rem', borderRadius: 20 }}>
                    {m.status.toUpperCase()}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 10 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Avg. Latency</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6' }}>{m.avgTTFT.toFixed(0)}ms</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 10 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Success Rate</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{(m.reliability * 100).toFixed(0)}%</div>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>TPS (Throughput)</div>
                  <div style={{ height: 40, display: 'flex', alignItems: 'flex-end' }}>
                     <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{m.avgTPS.toFixed(1)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>tokens/sec</span></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'decisions' && (
          <motion.div key="decisions" variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {history.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <ZapOff size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                <p>No routing decisions recorded yet.</p>
              </div>
            )}
            {history.slice(0, 15).map((d) => (
              <motion.div key={d.requestId} variants={itemVariants} className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{d.selected}</span>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '0.15rem 0.5rem', borderRadius: 20, fontWeight: 700 }}>{d.strategy.toUpperCase()}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(d.timestamp || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {d.secondBest ? `Outperformed ${d.secondBest} based on ${d.strategy}` : `Selected as the best available provider`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Confidence</div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                      {d.scores.slice(0, 2).map((s, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', fontWeight: 600, color: i === 0 ? '#10b981' : 'var(--text-muted)' }}>
                          {s.p}: {s.s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants} style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(245,158,11,0.05)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <HelpCircle size={18} color="#f59e0b" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Analytics are processed in real-time by the <strong>System Kernel</strong>. 
          History is persisted locally in your browser to show performance trends over time.
        </span>
      </motion.div>
    </motion.div>
  );
};

export default AnalyticsPanel;
