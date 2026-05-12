import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, Database, Wallet, TrendingUp,
  Activity, AlertCircle, Clock, Cpu, Copy, RotateCcw, Check, Power, PowerOff
} from 'lucide-react';
import { keyService } from '../../services/KeyService';
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
  const stats = apiKey.stats?.extended;
  
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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Failed to copy API key', type: 'error' });
    }
  };

  const handleResetMetrics = async () => {
    setResetting(true);
    try {
      const key = keyService.getKeys().find(k => k.id === apiKey.id);
      if (key) {
        key.stats = keyService['initStats']();
        await keyService['saveKeys']();
        eventBus.emit(EVENTS.KEYS_LOADED, keyService.getKeys());
        eventBus.emit(EVENTS.NOTIFICATION, { message: 'Metrics reset successfully', type: 'success' });
      }
    } catch {
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Failed to reset metrics', type: 'error' });
    } finally {
      setResetting(false);
    }
  };

  const handleToggleStatus = () => {
    keyService.toggleKeyStatus(apiKey.id);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
              { id: 'BALANCED', label: 'BALANCED' }
            ].map(mode => (
              <button 
                key={mode.id} 
                onClick={() => keyService.setSLA(apiKey.id, mode.id)}
                style={{ 
                  padding: '0.2rem 0.5rem', fontSize: '0.6rem', 
                  background: stats.activeSLA === mode.id ? 'rgba(96,165,250,0.2)' : 'transparent', 
                  color: stats.activeSLA === mode.id ? '#60a5fa' : 'var(--text-muted)',
                  border: `1px solid ${stats.activeSLA === mode.id ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 4, cursor: 'pointer'
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={handleToggleStatus}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {apiKey.status === 'active' ? <PowerOff size={16} /> : <Power size={16} />}
            {apiKey.status === 'active' ? 'Disable' : 'Enable'}
          </button>
          <button 
            onClick={handleCopyKey}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />} 
            {copied ? 'Copied!' : 'Copy Key'}
          </button>
          <button 
            onClick={handleResetMetrics}
            className="btn-secondary"
            style={{ padding: '0.5rem 1rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}
            disabled={resetting}
          >
            <RotateCcw size={16} className={resetting ? 'provider-spin' : ''} /> 
            Reset Metrics
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="metric-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>REPUTATION</span>
            <Shield size={16} color={reputationColor} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: reputationColor }}>{Math.round(stats.reputationScore || 0)}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>

        <div className="metric-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>CONCURRENCY</span>
            <Database size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>{stats.currentConcurrentRequests || 0}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {stats.rules?.maxConcurrentRequests || 5}</span></div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={14} color="#a855f7" />
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
            <Wallet size={14} color="#10b981" />
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
            <TrendingUp size={14} color="#a855f7" />
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
            <Activity size={14} color="#3b82f6" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>LATENCY HISTORY (LAST 20)</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700 }}>{formatMs(stats.fourSignals?.latency || 0)} avg</span>
        </div>
        <Sparkline data={(stats.throughputHistory || []).map(h => typeof h === 'number' ? h : (h?.latency || 0))} />
      </div>

      {stats.alerts && stats.alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <AlertCircle size={14} color="#ef4444" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ACTIVE ALERTS</span>
          </div>
          {stats.alerts.map(alert => (
            <div key={alert.id} style={{ 
              padding: '0.75rem', 
              background: alert.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <AlertCircle size={16} color={alert.severity === 'critical' ? '#ef4444' : '#f59e0b'} />
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
          <Clock size={14} color="#3b82f6" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>TTFT Breakdown</span>
        </div>
        {stats.latencyBreakdown && stats.latencyBreakdown.total > 0 && (
          <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${((stats.latencyBreakdown.dns || 0) / stats.latencyBreakdown.total) * 100}%`, background: '#3b82f6' }} title="DNS" />
            <div style={{ width: `${((stats.latencyBreakdown.tls || 0) / stats.latencyBreakdown.total) * 100}%`, background: '#a855f7' }} title="TLS" />
            <div style={{ width: `${((stats.latencyBreakdown.connect || 0) / stats.latencyBreakdown.total) * 100}%`, background: '#ec4899' }} title="Connect" />
            <div style={{ width: `${(Math.max(0, stats.latencyBreakdown.ttft - ((stats.latencyBreakdown.dns || 0) + (stats.latencyBreakdown.tls || 0) + (stats.latencyBreakdown.connect || 0))) / stats.latencyBreakdown.total) * 100}%`, background: '#10b981' }} title="Processing" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OverviewTab;
