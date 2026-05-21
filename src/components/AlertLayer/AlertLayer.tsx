import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, AlertTriangle, Info, CheckCircle, Zap, ShieldAlert, Activity } from 'lucide-react';
import { eventBus, EVENTS } from '../../core/events';
import { keyService } from '../../kernel/instances';
import type { ProviderAlert } from '../../types/metrics';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
}

const TOAST_DURATION = 6000;
const MAX_TOASTS = 5;

const ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle size={16} color="#10b981" />,
  error: <X size={16} color="#ef4444" />,
  info: <Info size={16} color="#3b82f6" />,
  warning: <AlertTriangle size={16} color="#f59e0b" />,
};

const getTypeFromSeverity = (severity: string): 'success' | 'error' | 'info' | 'warning' => {
  if (severity === 'critical') return 'error';
  if (severity === 'high') return 'warning';
  if (severity === 'medium') return 'info';
  return 'info';
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const AlertLayer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [alerts, setAlerts] = useState<ProviderAlert[]>([]);
  const [expanded, setExpanded] = useState(false);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((type: Toast['type'], title: string, message: string) => {
    const id = genId();
    const toast: Toast = { id, type, title, message, timestamp: Date.now() };
    setToasts(prev => {
      const next = [toast, ...prev].slice(0, MAX_TOASTS);
      return next;
    });
    timers.current.set(id, setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timers.current.delete(id);
    }, TOAST_DURATION));
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const refreshAlerts = () => setAlerts(keyService.getAlerts().filter(a => !a.resolved));
    refreshAlerts();

    const unsubs = [
      eventBus.on(EVENTS.NOTIFICATION, (data: any) => {
        const msg = typeof data === 'string' ? data : data?.message || '';
        const type = data?.type || 'info';
        addToast(type, 'System', msg);
      }),
      eventBus.on(EVENTS.KEY_QUOTA_EXCEEDED, (data: any) => {
        addToast('warning', 'Quota Exceeded', `${data.provider}: ${data.quotaType} limit reached`);
        refreshAlerts();
      }),
      eventBus.on(EVENTS.KEY_LATENCY_BURST, (data: any) => {
        addToast('warning', 'Latency Burst', `${data.provider} spike: ${data.latency}ms`);
      }),
      eventBus.on(EVENTS.KEY_HEALTH_FAILED, (data: any) => {
        addToast('error', 'Health Check Failed', `${data.provider}: ${data.error}`);
        refreshAlerts();
      }),
      eventBus.on(EVENTS.KEY_REPUTATION_DOWN, (data: any) => {
        addToast('warning', 'Reputation Drop', `${data.provider} score: ${data.score}`);
        refreshAlerts();
      }),
      eventBus.on(EVENTS.KEY_STATE_CHANGED, (data: any) => {
        addToast('info', 'State Changed', `${data.provider}: ${data.previousState} → ${data.state}`);
      }),
      eventBus.on(EVENTS.METRICS_ALERT, (data: any) => {
        const sev = data.severity === 'critical' ? 'error' : 'warning';
        addToast(sev, 'Metric Alert', `${data.metric} = ${typeof data.value === 'number' ? data.value.toFixed(2) : data.value} (${data.severity})`);
      }),
      eventBus.on(EVENTS.KEY_UPDATED, refreshAlerts),
    ];

    const interval = setInterval(refreshAlerts, 5000);
    return () => {
      unsubs.forEach(u => u());
      clearInterval(interval);
      timers.current.forEach(t => clearTimeout(t));
    };
  }, [addToast]);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = alerts.filter(a => a.severity === 'high' || a.severity === 'medium').length;

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 380, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            pointerEvents: 'auto',
            padding: '0.75rem 1rem',
            borderRadius: 12,
            background: '#1e293b',
            border: `1px solid ${t.type === 'error' ? '#ef4444' : t.type === 'warning' ? '#f59e0b' : t.type === 'success' ? '#10b981' : '#3b82f6'}30`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            animation: 'slideIn 0.3s ease',
          }}
        >
          <div style={{ marginTop: 2 }}>{ICONS[t.type]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>{t.title}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', wordBreak: 'break-word' }}>{t.message}</div>
          </div>
          <button onClick={() => dismissToast(t.id)} aria-label="Close notification" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}

      {alerts.length > 0 && (
        <div style={{ pointerEvents: 'auto', marginTop: '0.25rem' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 10,
              background: criticalAlerts > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${criticalAlerts > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.2)'}`,
              color: criticalAlerts > 0 ? '#fca5a5' : '#fde68a',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertTriangle size={14} />
            <span>{criticalAlerts} critical, {warningAlerts} warnings</span>
            <Activity size={14} style={{ marginLeft: 'auto' }} />
          </button>
          {expanded && (
            <div style={{ marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {alerts.slice(0, 8).map(a => (
                <div
                  key={a.id}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '0.65rem',
                    color: '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: a.severity === 'critical' ? '#ef4444' : a.severity === 'high' ? '#f59e0b' : '#3b82f6',
                  }} />
                  <span style={{ flex: 1 }}>{a.message}</span>
                  <span style={{ color: '#64748b', fontSize: '0.6rem' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
              {alerts.length > 8 && (
                <div style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'center', padding: '0.25rem' }}>
                  +{alerts.length - 8} more
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertLayer;
