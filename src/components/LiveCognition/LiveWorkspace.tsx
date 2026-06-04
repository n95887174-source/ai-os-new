import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Terminal, Network, Brain, AlertTriangle, X
} from 'lucide-react';
import AgentLiveBoard from '../DashboardPanel/AgentLiveBoard';
import IntelligenceGraph from '../DashboardPanel/IntelligenceGraph';
import { adminService } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { kernel } from '../../core/Kernel';

const LiveWorkspace: React.FC = () => {
  const [health, setHealth] = useState(() => { try { return adminService.getSystemHealth(); } catch { return null; } });
  const [logs, setLogs] = useState<Array<{ time: string; event: string; type: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      try {
        setHealth(adminService.getSystemHealth());
        setError(null);
      } catch (e) {
        console.warn('[LiveWorkspace] Failed to update health:', e);
        if (isMountedRef.current) {
          setError('Failed to update system health');
          clearErrorAfterDelay();
        }
      }
    }, 2000);

    let unsubscribeAll: (() => void) | undefined;
    const eventHandler = ({ event, data }: { event: string; data: Record<string, unknown> }) => {
      if (!isMountedRef.current) return;
      try {
        setLogs(prev => {
          const newEntry = {
            time: new Date().toLocaleTimeString(),
            event: `${event}: ${(data?.output as string)?.substring(0, 50) || (data?.message as string) || 'Activity detected'}`,
            type: event.includes('error') ? 'warning' : event.includes('success') ? 'success' : 'info'
          };
          return [newEntry, ...prev].slice(0, 15);
        });
        setError(null);
      } catch (e) {
        console.warn('[LiveWorkspace] Failed to process event:', e);
        if (isMountedRef.current) {
          setError('Failed to process event');
          clearErrorAfterDelay();
        }
      }
    };

    const maybeUnsubscribe = eventBus.subscribeAll(eventHandler);
    if (typeof maybeUnsubscribe === 'function') {
      unsubscribeAll = maybeUnsubscribe;
    } else {
      console.warn('[LiveWorkspace] eventBus.subscribeAll does not return an unsubscribe function');
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (unsubscribeAll) unsubscribeAll();
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, [clearErrorAfterDelay]);

  const avgLatency = useCallback(() => {
    try {
      const state = kernel.getState();
      const latencies = Object.values(state.providers).map(p => p.avgTTFT).filter(Boolean);
      return latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    } catch (e) {
      console.warn('[LiveWorkspace] Failed to compute avg latency:', e);
      return 0;
    }
  }, []);

  const stats = [
    { label: 'Throughput', value: health?.vitals?.throughput ?? 0, unit: 'req/min', color: '#f59e0b' },
    { label: 'Collective Latency', value: avgLatency().toString(), unit: 'ms', color: '#3b82f6' },
    { label: 'Total Requests', value: health?.vitals?.totalRequests ?? 0, unit: 'req', color: '#10b981' },
    { label: 'Total Tokens', value: ((health?.vitals?.totalTokens ?? 0) / 1000).toFixed(1), unit: 'k', color: '#a855f7' }
  ];

  const eventContent = logs.length === 0 ? (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Waiting for system events...</div>
  ) : logs.map((log, i) => (
    <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.03)' }}>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.7rem' }}>[{log.time}]</span>
      <span style={{ 
        color: log.type === 'warning' ? '#f59e0b' : log.type === 'success' ? '#10b981' : 'white',
        flex: 1
      }}>
        {log.event}
      </span>
    </div>
  ));

  const handleInitializeRequest = useCallback(() => {
    try {
      adminService.initializeRequest();
      setError(null);
    } catch (e) {
      console.warn('[LiveWorkspace] Failed to initialize request:', e);
      setError('Failed to initialize request');
      clearErrorAfterDelay();
    }
  }, [clearErrorAfterDelay]);

  const handleReloadRuntime = useCallback(() => {
    try {
      adminService.reloadRuntime();
      setError(null);
    } catch (e) {
      console.warn('[LiveWorkspace] Failed to reload runtime:', e);
      setError('Failed to reload runtime');
      clearErrorAfterDelay();
    }
  }, [clearErrorAfterDelay]);

  const handleManualRoute = useCallback(() => {
    try {
      adminService.manualRoute();
      setError(null);
    } catch (e) {
      console.warn('[LiveWorkspace] Failed to manual route:', e);
      setError('Failed to manual route');
      clearErrorAfterDelay();
    }
  }, [clearErrorAfterDelay]);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
    setError(null);
  }, []);

  const handleCheckAllHealth = useCallback(() => {
    try {
      eventBus.emit(EVENTS.CHECK_ALL_HEALTH, undefined);
      setError(null);
    } catch (e) {
      console.warn('[LiveWorkspace] Failed to check all health:', e);
      setError('Failed to check all health');
      clearErrorAfterDelay();
    }
  }, [clearErrorAfterDelay]);

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: 'auto 1fr', gap: '1.5rem', overflow: 'hidden' }}>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ padding: '0.6rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}
            role="alert"
            aria-live="polite"
          >
            <AlertTriangle size={14} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit' }} aria-label="Dismiss error">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{ padding: '1rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            aria-label={`${stat.label}: ${stat.value} ${stat.unit}`}
          >
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{stat.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stat.value}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{stat.unit}</span>
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: `${stat.color}11`, borderRadius: 8 }}>
              <Activity size={16} color={stat.color} aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '1.5rem', minHeight: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>
          <div style={{ flex: 1, padding: '1.5rem', position: 'relative', overflow: 'hidden', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Network size={18} color="#3b82f6" aria-hidden="true" /> System Architecture Pulse
              </h3>
              <div style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}
                />
                LIVE TOPOLOGY
              </div>
            </div>
            <div style={{ height: 'calc(100% - 3rem)' }}>
              <IntelligenceGraph />
            </div>
          </div>

          <div style={{ height: '320px', padding: '1.5rem', overflowY: 'auto', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={18} color="#a855f7" aria-hidden="true" /> Distributed Agent Radar
              </h3>
            </div>
            <AgentLiveBoard />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 0 }}>
          <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal size={18} color="#3b82f6" aria-hidden="true" /> Cognitive Event Stream
              </h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }} role="log" aria-live="polite" aria-label="System event log">
              {eventContent}
            </div>
          </div>

          <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="#3b82f6" aria-hidden="true" /> Control Plane Actions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={handleInitializeRequest}
                style={{ padding: '0.75rem', fontSize: '0.8rem', borderRadius: 10, background: 'linear-gradient(90deg, #3b82f6, #2563eb)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                aria-label="Initialize a test request"
              >
                Initialize Request
              </button>
              <button
                onClick={handleReloadRuntime}
                style={{ padding: '0.75rem', fontSize: '0.8rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                aria-label="Reload runtime configuration"
              >
                Reload Runtime
              </button>
              <button
                onClick={handleManualRoute}
                style={{ padding: '0.75rem', fontSize: '0.8rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                aria-label="Manually trigger routing"
              >
                Manual Routing
              </button>
              <button
                onClick={handleClearLogs}
                style={{ padding: '0.75rem', fontSize: '0.8rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                aria-label="Clear event logs"
              >
                Clear Logs
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button
                onClick={handleCheckAllHealth}
                style={{ padding: '0.75rem', fontSize: '0.8rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                aria-label="Check health of all providers"
              >
                Check All Providers
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveWorkspace;
