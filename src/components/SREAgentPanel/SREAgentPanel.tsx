import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Bot, Activity, AlertTriangle, Zap, DollarSign, Server, Shield, CheckCircle, X, RefreshCw, Cpu, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { advisorService } from '../../services/AdvisorService';
import { eventBus } from '../../core/events';
import type { OptimizationSuggestion } from '../../services/AdvisorService';

type SREAlert = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
};

const SEVERITY_CONFIG = {
  critical: { icon: <AlertTriangle size={16} />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  warning: { icon: <Zap size={16} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  info: { icon: <Activity size={16} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
};

const IMPACT_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
};

const SREAgentPanel: React.FC = () => {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [alerts, setAlerts] = useState<SREAlert[]>([]);
  const [metrics, setMetrics] = useState(advisorService.getMetrics());
  const [activeTab, setActiveTab] = useState<'suggestions' | 'alerts'>('suggestions');
  const [executingId, setExecutingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => {
      setSuggestions(advisorService.getSuggestions());
      setAlerts(advisorService.getSREAlerts());
      setMetrics(advisorService.getMetrics());
    };

    const unsub1 = eventBus.on('advisor:suggestion', refresh);
    const unsub2 = eventBus.on('advisor:suggestion_executed', refresh);
    const unsub3 = eventBus.on('advisor:suggestion_dismissed', refresh);
    const interval = setInterval(refresh, 5000);
    refresh();

    return () => {
      unsub1();
      unsub2();
      unsub3();
      clearInterval(interval);
    };
  }, []);

  const handleExecute = useCallback((id: string) => {
    setExecutingId(id);
    setTimeout(() => {
      advisorService.executeFix(id);
      setExecutingId(null);
    }, 500);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    advisorService.dismissSuggestion(id);
  }, []);

  const handleAutoFixToggle = useCallback(() => {
    const current = advisorService['config'] || { enableAutoFix: false };
    advisorService.updateConfig({ enableAutoFix: !current.enableAutoFix });
  }, []);

  const sreAlerts = advisorService.getSREAlerts();
  const criticalCount = sreAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = sreAlerts.filter(a => a.severity === 'warning').length;
  const autoFixEnabled = (advisorService as unknown as Record<string, unknown>)['config'] ? ((advisorService as unknown as Record<string, unknown>)['config'] as Record<string, unknown>)['enableAutoFix'] as boolean : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Bot size={28} color="#8b5cf6" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>AI SRE Agent</h1>
            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 6, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', fontWeight: 700, border: '1px solid rgba(139,92,246,0.2)' }}>v2.0</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Autonomous monitoring — analyzes latency, errors, 429s, quotas, and budget. Proposes routing optimizations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.4rem 0.8rem', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>
            <span style={{ color: '#64748b' }}>Auto-Fix</span>
            <button
              onClick={handleAutoFixToggle}
              style={{
                width: 36, height: 20, borderRadius: 10, border: 'none',
                background: autoFixEnabled ? '#10b981' : '#52525b',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              }}
              role="switch"
              aria-checked={autoFixEnabled}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 2, transition: 'left 0.2s',
                left: autoFixEnabled ? 18 : 2,
              }} />
            </button>
          </div>
          {(criticalCount > 0 || warningCount > 0) && (
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {criticalCount > 0 && <span style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>{criticalCount} critical</span>}
              {warningCount > 0 && <span style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>{warningCount} warnings</span>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Avg Latency</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: metrics.avgLatency < 1000 ? '#10b981' : metrics.avgLatency < 3000 ? '#f59e0b' : '#ef4444' }}>
            {Math.round(metrics.avgLatency)}<span style={{ fontSize: '0.7rem' }}>ms</span>
          </div>
        </div>
        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Error Rate</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: metrics.errorRate < 0.05 ? '#10b981' : metrics.errorRate < 0.15 ? '#f59e0b' : '#ef4444' }}>
            {(metrics.errorRate * 100).toFixed(1)}%
          </div>
        </div>
        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Cost/Req</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
            ${metrics.costPerRequest.toFixed(4)}
          </div>
        </div>
        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Suggestions</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#a78bfa' }}>{suggestions.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
        {(['suggestions', 'alerts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: activeTab === tab ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: activeTab === tab ? '#a78bfa' : '#64748b',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab === 'suggestions' ? <Cpu size={14} /> : <Shield size={14} />}
            {tab} {tab === 'alerts' && alerts.length > 0 && `(${alerts.length})`}
          </button>
        ))}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {activeTab === 'suggestions' ? (
          suggestions.length > 0 ? (
            <AnimatePresence>
              {suggestions.map(s => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.2)',
                    border: `1px solid ${IMPACT_COLORS[s.impact]}20`,
                    borderLeft: `4px solid ${IMPACT_COLORS[s.impact]}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: 4,
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: `${IMPACT_COLORS[s.impact]}20`,
                          color: IMPACT_COLORS[s.impact],
                        }}>
                          {s.impact} · {s.type}
                        </span>
                        {s.autoExecutable && (
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.6rem', fontWeight: 800, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                            Auto
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>{s.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>{s.description}</div>
                      {s.estimatedSavings && (
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.7rem', color: '#10b981' }}>
                          {s.estimatedSavings.latency && <span>Saves ~{Math.round(s.estimatedSavings.latency)}ms</span>}
                          {s.estimatedSavings.cost && <span>Saves ~${s.estimatedSavings.cost.toFixed(2)}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        onClick={() => handleExecute(s.id)}
                        disabled={executingId === s.id}
                        style={{
                          padding: '0.5rem 0.8rem',
                          borderRadius: 8,
                          border: '1px solid rgba(16,185,129,0.3)',
                          background: executingId === s.id ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
                          color: '#10b981',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          opacity: executingId === s.id ? 0.6 : 1,
                        }}
                      >
                        {executingId === s.id ? <RefreshCw size={12} className="provider-spin" /> : <CheckCircle size={12} />}
                        Execute
                      </button>
                      <button
                        onClick={() => handleDismiss(s.id)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(0,0,0,0.3)',
                          color: '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <Bot size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Current Suggestions</div>
              <div style={{ fontSize: '0.85rem' }}>System is running within normal parameters. The SRE Agent will analyze metrics and propose optimizations as needed.</div>
            </div>
          )
        ) : (
          alerts.length > 0 ? (
            alerts.slice(0, 50).map(a => {
              const cfg = SEVERITY_CONFIG[a.severity];
              return (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 600 }}>{a.message}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <Shield size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>No Alerts</div>
              <div style={{ fontSize: '0.85rem' }}>All systems nominal.</div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SREAgentPanel;
