import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Database, Wallet, TrendingUp,
  Activity, AlertCircle, Clock, Cpu, Copy, RotateCcw, Check, Power, PowerOff, AlertTriangle, X,
  BarChart3, Bug, Gauge, Hash
} from 'lucide-react';
import { keyService } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../core/events';
import type { ApiKey } from '../../types/metrics';

const Sparkline = ({ data }: { data: number[] }) => {
  if (data.length < 2) return <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>Insufficient data</div>;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 40 }}>
      <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={points} />
    </svg>
  );
};

interface OverviewTabProps {
  apiKey: ApiKey;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ apiKey }) => {
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = apiKey.stats?.extended;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  if (!stats) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Metrics not yet collected. Use the Sandbox to send your first request.
      </div>
    );
  }

  const reputationColor = (stats.reputationScore || 0) >= 80 ? '#10b981' : (stats.reputationScore || 0) >= 50 ? '#f59e0b' : '#ef4444';
  const formatMs = (ms: number) => `${Math.round(ms)}ms`;

  const handleCopyKey = async () => {
    try {
      if (apiKey.key) {
        await navigator.clipboard.writeText(apiKey.key);
        if (isMountedRef.current) setCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) setCopied(false);
        }, 2000);
      }
    } catch (e) {
      console.warn('[OverviewTab] Failed to copy API key:', e);
      if (isMountedRef.current) {
        setError('Failed to copy API key');
        clearErrorAfterDelay();
      }
    }
  };

  const handleResetMetrics = async () => {
    setResetting(true);
    try {
      if (typeof keyService.resetStats === 'function') {
        await keyService.resetStats(apiKey.id);
      } else {
        eventBus.emit(EVENTS.NOTIFICATION, { message: 'Metrics reset requested', type: 'info' });
      }
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Metrics reset successfully', type: 'success' });
      if (isMountedRef.current) setError(null);
    } catch (e) {
      console.warn('[OverviewTab] Failed to reset metrics:', e);
      if (isMountedRef.current) {
        setError('Failed to reset metrics');
        clearErrorAfterDelay();
      }
    } finally {
      if (isMountedRef.current) setResetting(false);
    }
  };

  const handleToggleStatus = () => {
    try {
      keyService.toggleKeyStatus(apiKey.id);
      if (isMountedRef.current) setError(null);
    } catch (e) {
      console.warn('[OverviewTab] Failed to toggle key status:', e);
      if (isMountedRef.current) {
        setError('Failed to toggle key status');
        clearErrorAfterDelay();
      }
    }
  };

  const handleSetSLA = (sla: string) => {
    try {
      keyService.setSLA(apiKey.id, sla);
      if (isMountedRef.current) setError(null);
    } catch (e) {
      console.warn('[OverviewTab] Failed to set SLA:', e);
      if (isMountedRef.current) {
        setError('Failed to set SLA');
        clearErrorAfterDelay();
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}
            role="alert"
          >
            <AlertTriangle size={14} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit' }} aria-label="Dismiss error">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ 
            padding: '0.3rem 0.8rem', 
            background: stats.state === 'HEALTHY' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
            color: stats.state === 'HEALTHY' ? '#10b981' : '#ef4444', 
            borderRadius: 100, fontSize: '0.65rem', fontWeight: 800,
            border: `1px solid ${stats.state === 'HEALTHY' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
          }}>
            {stats.state === 'HEALTHY' ? 'HEALTHY' : stats.state}
          </span>
          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '1rem' }}>
            {[
              { id: 'LOW_LATENCY', label: 'LOW LATENCY' },
              { id: 'HIGH_QUALITY', label: 'HIGH QUALITY' },
              { id: 'BALANCED', label: 'BALANCED' },
              { id: 'FREE_FIRST', label: 'FREE FIRST' }
            ].map(mode => (
              <button 
                key={mode.id} 
                onClick={() => handleSetSLA(mode.id)}
                style={{ 
                  padding: '0.2rem 0.5rem', fontSize: '0.6rem', 
                  background: stats.activeSLA === mode.id ? 'rgba(96,165,250,0.2)' : 'transparent', 
                  color: stats.activeSLA === mode.id ? '#60a5fa' : 'var(--text-muted)',
                  border: `1px solid ${stats.activeSLA === mode.id ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 4, cursor: 'pointer'
                }}
                aria-label={`Set SLA mode to ${mode.label}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleToggleStatus}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
            aria-label={apiKey.status === 'active' ? 'Disable provider' : 'Enable provider'}
          >
            {apiKey.status === 'active' ? <PowerOff size={16} aria-hidden="true" /> : <Power size={16} aria-hidden="true" />}
            {apiKey.status === 'active' ? 'Disable' : 'Enable'}
          </button>
          <button 
            onClick={handleCopyKey}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
            aria-label="Copy API key to clipboard"
          >
            {copied ? <Check size={16} color="#10b981" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} 
            {copied ? 'Copied!' : 'Copy Key'}
          </button>
          <button 
            onClick={handleResetMetrics}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
            disabled={resetting}
            aria-label="Reset metrics"
          >
            {resetting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <RotateCcw size={16} aria-hidden="true" />
              </motion.div>
            ) : (
              <RotateCcw size={16} aria-hidden="true" />
            )}
            Reset Metrics
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>REPUTATION</span>
            <Shield size={16} color={reputationColor} aria-hidden="true" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: reputationColor }}>{Math.round(stats.reputationScore || 0)}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>CONCURRENCY</span>
            <Database size={16} color="#3b82f6" aria-hidden="true" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>{stats.currentConcurrentRequests || 0}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {stats.rules?.maxConcurrentRequests || 5}</span></div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={14} color="#a855f7" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>AVAILABLE MODELS</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{apiKey.availableModels?.length || 0} models</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(apiKey.availableModels || []).slice(0, 8).map(m => (
            <span key={m} style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {m.split('/').pop()}
            </span>
          ))}
          {(apiKey.availableModels?.length || 0) > 8 && (
            <span style={{ fontSize: '0.65rem', color: '#3b82f6', alignSelf: 'center' }}>+{apiKey.availableModels!.length - 8} more</span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Wallet size={14} color="#10b981" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>DAILY LIMITS</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, ((stats.usageToday?.tokens || 0) / (stats.rules?.quota?.tokensPerDay || 100000)) * 100)}%`, height: '100%', background: '#10b981' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>{(stats.usageToday?.tokens || 0).toLocaleString()} tokens</span>
            <span>{Math.round(((stats.usageToday?.tokens || 0) / (stats.rules?.quota?.tokensPerDay || 100000)) * 100)}%</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TrendingUp size={14} color="#a855f7" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>MONTHLY SPEND</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${(stats.usageMonthly?.estimatedCost || 0).toFixed(2)}</div>
          {stats.rules?.quota?.monthlyBudget && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>of ${stats.rules.quota.monthlyBudget} budget</div>
          )}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={14} color="#3b82f6" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>LATENCY HISTORY (LAST 20)</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700 }}>{formatMs(stats.fourSignals?.latency || 0)} avg</span>
        </div>
        <Sparkline data={(stats.throughputHistory || []).map(h => typeof h === 'number' ? h : (h?.latency || 0))} />
      </div>

      {stats.alerts && stats.alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <AlertCircle size={14} color="#ef4444" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ACTIVE ALERTS</span>
          </div>
          {stats.alerts.map(alert => (
            <div key={alert.id} style={{ 
              padding: '0.75rem', 
              background: alert.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <AlertCircle size={16} color={alert.severity === 'critical' ? '#ef4444' : '#f59e0b'} aria-hidden="true" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{alert.message}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{new Date(alert.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Clock size={14} color="#3b82f6" aria-hidden="true" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>TTFT Breakdown</span>
        </div>
        {stats.latencyBreakdown && stats.latencyBreakdown.total > 0 ? (
          <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${((stats.latencyBreakdown.dns || 0) / stats.latencyBreakdown.total) * 100}%`, background: '#3b82f6' }} title="DNS" />
            <div style={{ width: `${((stats.latencyBreakdown.tls || 0) / stats.latencyBreakdown.total) * 100}%`, background: '#a855f7' }} title="TLS" />
            <div style={{ width: `${((stats.latencyBreakdown.connect || 0) / stats.latencyBreakdown.total) * 100}%`, background: '#ec4899' }} title="Connect" />
            <div style={{ width: `${(Math.max(0, stats.latencyBreakdown.ttft - ((stats.latencyBreakdown.dns || 0) + (stats.latencyBreakdown.tls || 0) + (stats.latencyBreakdown.connect || 0))) / stats.latencyBreakdown.total) * 100}%`, background: '#10b981' }} title="Processing" />
          </div>
        ) : (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>No latency data yet</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart3 size={14} color="#f59e0b" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>REQUEST QUOTA</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, ((stats.usageToday?.requests || 0) / (stats.rules?.quota?.requestsPerDay || 1000)) * 100)}%`, height: '100%', background: '#f59e0b' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>{(stats.usageToday?.requests || 0).toLocaleString()} req</span>
            <span>{Math.round(((stats.usageToday?.requests || 0) / (stats.rules?.quota?.requestsPerDay || 1000)) * 100)}%</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Bug size={14} color="#ef4444" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ERROR BREAKDOWN</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              { label: 'Rate Limit', value: stats.errorBreakdown?.rateLimit || 0, color: '#ef4444' },
              { label: 'Timeout', value: stats.errorBreakdown?.timeout || 0, color: '#f59e0b' },
              { label: 'Server', value: stats.errorBreakdown?.serverError || 0, color: '#ec4899' },
              { label: 'Validation', value: stats.errorBreakdown?.validationError || 0, color: '#a855f7' },
            ].map(e => (
              <div key={e.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{e.label}</span>
                <span style={{ color: e.color, fontWeight: 700 }}>{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Gauge size={14} color="#10b981" aria-hidden="true" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>FOUR SIGNALS</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { label: 'Latency', value: `${Math.round(stats.fourSignals?.latency || 0)}ms`, color: '#3b82f6' },
            { label: 'Throughput', value: `${Math.round(stats.fourSignals?.throughput || 0)} t/s`, color: '#10b981' },
            { label: 'Error Rate', value: `${(stats.fourSignals?.errorRate || 0).toFixed(2)}%`, color: stats.fourSignals?.errorRate && stats.fourSignals.errorRate > 5 ? '#ef4444' : '#94a3b8' },
            { label: 'Saturation', value: `${Math.round((stats.fourSignals?.saturation || 0) * 100)}%`, color: stats.fourSignals?.saturation && stats.fourSignals.saturation > 0.7 ? '#ef4444' : '#94a3b8' },
          ].map(s => (
            <div key={s.label} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{s.label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Hash size={14} color="#64748b" aria-hidden="true" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>KEY METADATA</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
          <div style={{ color: 'var(--text-muted)' }}>ID</div><div style={{ fontWeight: 600 }}>{apiKey.id}</div>
          <div style={{ color: 'var(--text-muted)' }}>Provider</div><div style={{ fontWeight: 600 }}>{apiKey.provider}</div>
          <div style={{ color: 'var(--text-muted)' }}>Key</div>
          <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            {apiKey.key.length > 12 ? `${apiKey.key.slice(0, 4)}...${apiKey.key.slice(-4)}` : '****'}
            <button
              onClick={handleCopyKey}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
              aria-label="Copy API key"
              title="Copy to clipboard"
            >
              {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            </button>
          </div>
          <div style={{ color: 'var(--text-muted)' }}>SLA Mode</div><div style={{ fontWeight: 600 }}>{stats.activeSLA || 'BALANCED'}</div>
          <div style={{ color: 'var(--text-muted)' }}>State</div><div style={{ fontWeight: 600, color: stats.state === 'HEALTHY' ? '#10b981' : '#ef4444' }}>{stats.state}</div>
          <div style={{ color: 'var(--text-muted)' }}>Stability</div><div style={{ fontWeight: 600 }}>{stats.stabilityForecast || '--'}</div>
          <div style={{ color: 'var(--text-muted)' }}>Group</div><div style={{ fontWeight: 600 }}>{apiKey.group || '\u2014'}</div>
          <div style={{ color: 'var(--text-muted)' }}>Account</div><div style={{ fontWeight: 600 }}>{apiKey.account || apiKey.accountId || '\u2014'}</div>
          <div style={{ color: 'var(--text-muted)' }}>Fingerprint</div><div style={{ fontWeight: 600, fontSize: '0.65rem', fontFamily: 'monospace' }}>{(stats.fingerprint || '--').slice(0, 16)}</div>
          <div style={{ color: 'var(--text-muted)' }}>Tags</div><div style={{ fontWeight: 600 }}>{(apiKey.tags || []).join(', ') || 'none'}</div>
          <div style={{ color: 'var(--text-muted)' }}>History</div><div style={{ fontWeight: 600 }}>{(apiKey.history || []).length} event{(apiKey.history || []).length !== 1 ? 's' : ''}</div>
          <div style={{ color: 'var(--text-muted)' }}>Expires</div>
          <div style={{ fontWeight: 600, color: apiKey.expiresAt && apiKey.expiresAt < Date.now() ? '#ef4444' : apiKey.expiresAt && apiKey.expiresAt < Date.now() + 7 * 86400000 ? '#f59e0b' : 'inherit' }}>
            {apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleDateString() : '\u2014'}
            {apiKey.expiresAt && apiKey.expiresAt < Date.now() ? ' (EXPIRED)' : apiKey.expiresAt && apiKey.expiresAt < Date.now() + 7 * 86400000 ? ' (expiring soon)' : ''}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OverviewTab;
