import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  HeartPulse, ShieldCheck, Activity, Cpu, 
  Clock, Globe, CheckCircle2,
  Server, RefreshCw, Layers, MemoryStick,
  Network, AlertTriangle, X, Loader2
} from 'lucide-react';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { motion } from 'framer-motion';
import { useKeyStore } from '../../stores/useKeyStore';
import { adminService, probeService, keyStateStore } from '../../kernel/instances';
import { eventBus } from '../../kernel/events/event-bus';
import { keyService, kernel } from '../../kernel/instances';
import type { HealthEvent } from '../../kernel/services/provider-tracker';
import { getHealthBand, HEALTH_THRESHOLDS } from '../../kernel/contracts/key-state';
import type { ProbeResult } from '../../kernel/contracts/probe';
import { APP_VERSION } from '../../utils/version';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { getStatusColor } from '../Common/status-vocabulary';
import { genId } from '../../utils/gen-id';
import {
  dismissBtn,
  flexBetweenXsMargin,
  flexCenterGap2Mb05,
  flexCenterGap2Mb075,
  h3White,
  progressBar4,
  sectionHeaderRow,
  statusDot,
  textSmSecondaryMargin,
  textWeight700Capitalize,
} from '../../styles/common';
import { HealthScoreBadge } from './HealthScoreBadge';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return genId();
};

interface Bee {
  id: string;
  providerId: string;
  x: number;
  y: number;
  delay: number;
}

const HealthPanel: React.FC = () => {
  const { t } = useTranslation();
  const { keys } = useKeyStore();
  const [health, setHealth] = useState(() => { try { return adminService.getSystemHealth(); } catch { return null; } });
  const safeHealth = health ?? { vitals: { cpu: 0, memory: 0, throughput: 0, totalRequests: 0, totalTokens: 0 }, uptime: 0, services: [] };
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kernelId] = useState(generateId().slice(0, 8));
  const [probeResults, setProbeResults] = useState<Map<string, ProbeResult> | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);
  const [expandedProbe, setExpandedProbe] = useState<string | null>(null);

  const [introspectionResults, setIntrospectionResults] = useState<Record<string, Record<string, unknown>>>({});
  const [introspectingKeys, setIntrospectingKeys] = useState(false);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [healthEventFilter, setHealthEventFilter] = useState<string>('all');
  const [keyHealthScores, setKeyHealthScores] = useState<Map<string, number>>(new Map());

  const [bees, setBees] = useState<Bee[]>([]);

  const isMountedRef = useRef(true);
  const allAlerts = useMemo(() => keyService.getAlerts(), [keys]);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearError = useAutoClearError(setError);

  useEffect(() => {
    const existing = document.getElementById('health-panel-keyframes');
    if (!existing) {
      const style = document.createElement('style');
      style.id = 'health-panel-keyframes';
      style.textContent = `
        @keyframes beeFloat {
          0% { transform: translate(-50%, -50%) translateY(0px) translateX(0px); }
          25% { transform: translate(-50%, -50%) translateY(-6px) translateX(3px); }
          50% { transform: translate(-50%, -50%) translateY(2px) translateX(-3px); }
          75% { transform: translate(-50%, -50%) translateY(-4px) translateX(2px); }
          100% { transform: translate(-50%, -50%) translateY(0px) translateX(0px); }
        }
        @keyframes beeWobble {
          0%, 100% { rotate: 0deg; }
          25% { rotate: 10deg; }
          75% { rotate: -10deg; }
        }
      `;
      document.head.appendChild(style);
    }
    isMountedRef.current = true;
    const unsub = eventBus.on('kernel:updated', () => {
      if (!isMountedRef.current) return;
      try {
        setHealth(adminService.getSystemHealth());
        setError(null);
      } catch (e) {
        console.warn('[HealthPanel] Failed to refresh system health:', e);
        if (isMountedRef.current) {
          setError(t('health.error_refresh'));
          clearError();
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      unsub();
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [clearError]);

  useEffect(() => {
    const activeKeys = keys.filter(k => k.status === 'active');
    const newBees: Bee[] = activeKeys.map((key, i) => ({
      id: generateId(),
      providerId: key.id,
      x: 10 + (i * 30) % 80,
      y: 10 + Math.random() * 80,
      delay: Math.random() * 3,
    }));
    setBees(newBees);
  }, [keys]);

  useEffect(() => {
    const activeKeys = keys.filter(k => k.status === 'active');
    if (activeKeys.length === 0) return;
    const ac = new AbortController();
    setIntrospectingKeys(true);
    (async () => {
      const results: Record<string, Record<string, unknown>> = {};
      for (const key of activeKeys) {
        if (ac.signal.aborted) break;
        try {
          results[key.id] = await keyService.getProviderIntrospection(key.provider, key.key);
        } catch {
          if (!ac.signal.aborted) results[key.id] = { error: 'Introspection failed' };
        }
      }
      if (!ac.signal.aborted) {
        setIntrospectionResults(results);
        setIntrospectingKeys(false);
      }
    })();
    return () => { ac.abort(); };
  }, [keys]);

  useEffect(() => {
    try {
      setHealthEvents(kernel.getHealthEvents());
    } catch { /* kernel may not be ready */ }
  }, []);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem', background: 'radial-gradient(circle at 20% 30%, #0a0f1e, #03060c)' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.1, backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 15 L60 45 L30 60 L0 45 L0 15 Z' fill='none' stroke='%23f59e0b' stroke-width='1' /%3E%3C/svg%3E")`, backgroundSize: '60px 60px' }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <HeartPulse size={28} color="#10b981" aria-hidden="true" /> {t('health.system_health_matrix')}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>{t('health.subtitle')}</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
            <div style={statusDot} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('health.all_systems_operational')}</span>
          </div>
          <button
            onClick={async () => {
              setProbeLoading(true);
              setProbeResults(null);
              try {
                const results = await probeService.probeAll();
                const map = new Map<string, ProbeResult>();

                for (const r of results) map.set(r.keyId, r);
                setProbeResults(map);
              } finally {
                setProbeLoading(false);
              }
            }}
            style={{ padding: '0.5rem 0.8rem', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 600 }}
            disabled={probeLoading}
            aria-label={t('health.quick_test_aria') ?? 'Quick Test All'}
          >
            {probeLoading ? <Loader2 size={14} className="spinning" /> : <Activity size={14} />}
            Quick Test All
          </button>
          <button
            onClick={handleRefresh}
            style={{ padding: '0.6rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={t('health.refresh_aria')}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <RefreshCw size={16} aria-hidden="true" />
              </motion.div>
            ) : (
              <RefreshCw size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ position: 'relative', zIndex: 2, padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }} role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={dismissBtn} aria-label={t('common.dismiss_error')}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        {[
          { title: t('health.cpu_load'), value: `${safeHealth.vitals.cpu.toFixed(1)}%`, icon: <Cpu size={24} />, color: '#3b82f6', subtitle: 'Global Threads', fill: safeHealth.vitals.cpu },
          { title: t('health.memory_allocation'), value: `${safeHealth.vitals.memory} MB`, icon: <MemoryStick size={24} />, color: '#a855f7', subtitle: 'Active JS Heap', fill: Math.min(100, (safeHealth.vitals.memory / 1024) * 100) },
          { title: t('health.system_uptime'), value: `${safeHealth.uptime}s`, icon: <Clock size={24} />, color: '#10b981', subtitle: 'Continuous Operation', fill: 100 },
          { title: t('health.throughput'), value: `${safeHealth.vitals.throughput}`, icon: <Activity size={24} />, color: '#f59e0b', subtitle: 'Requests / Minute', fill: Math.min(100, (safeHealth.vitals.throughput / 500) * 100) }
        ].map((vital, idx) => (
          <div key={idx} style={{ padding: '1.5rem', borderRadius: 16, borderTop: `4px solid ${vital.color}`, background: `linear-gradient(180deg, ${vital.color}0A 0%, rgba(0,0,0,0) 100%)`, backgroundColor: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ color: vital.color, padding: '0.5rem', background: `${vital.color}15`, borderRadius: 10 }} aria-hidden="true">
                {vital.icon}
              </div>
              <span style={{ fontSize: '0.65rem', color: vital.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{vital.title}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.25rem' }}>{vital.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>{vital.subtitle}</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${vital.fill}%` }} transition={{ type: 'spring' }} style={{ height: '100%', background: vital.color, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ padding: '2rem', borderRadius: 16, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={sectionHeaderRow}>
            <Layers size={22} color="#3b82f6" aria-hidden="true" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>{t('health.kernel_services')}</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {safeHealth.services.map(svc => {
              const statusColor = getStatusColor(svc.status);
              return (
                <div key={svc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Server size={18} color="#64748b" aria-hidden="true" />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{svc.name}</div>
                      <div style={textSmSecondaryMargin}>{t('health.core_microservice')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0.8rem', background: `${statusColor}15`, borderRadius: 8, border: `1px solid ${statusColor}30` }} aria-label={t('health.status_aria', { status: svc.status })}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} aria-hidden="true" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{svc.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ position: 'relative', padding: '2rem', borderRadius: 16, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={sectionHeaderRow}>
            <Network size={22} color="#10b981" aria-hidden="true" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>{t('health.distributed_nodes')}</h3>
            <div style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'rgba(245,158,11,0.2)', padding: '0.2rem 0.6rem', borderRadius: 20, color: '#f59e0b' }}>
              🐝 {t('health.active_workers', { count: totalActive })}
            </div>
          </div>

          {/* H-32: global keyframe style injected once via useInjectKeyframes below */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
            {bees.map(bee => {
              const keyObj = keys.find(k => k.id === bee.providerId);
              const latency = keyObj?.latency ?? 0;
              return (
                <div
                  key={bee.id}
                  style={{
                    position: 'absolute',
                    left: `${bee.x}%`,
                    top: `${bee.y}%`,
                    width: 24,
                    height: 24,
                    animation: `beeFloat 3s ease-in-out ${bee.delay}s infinite, beeWobble 0.5s ease-in-out ${bee.delay}s infinite`,
                    filter: 'drop-shadow(0 0 4px gold)',
                    cursor: 'default',
                    pointerEvents: 'auto',
                    fontSize: 18,
                  }}
                  title={t('health.bee_title', { provider: keyObj?.provider || 'Unknown', latency: latency ? `${latency}ms` : 'active' })}
                >
                  🐝
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', zIndex: 2 }}>
            {keys.map(key => {
              const isOnline = key.status === 'active';
              return (
                <div
                  key={key.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s' }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <ProviderIcon provider={key.provider} size={20} />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>{key.provider}</div>
                      <div style={textSmSecondaryMargin}>{key.model || t('health.auto_routing')}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: isOnline ? '#10b981' : '#ef4444' }}>
                      {key.latency ? `${key.latency}ms` : isOnline ? t('health.sub_10ms') : t('health.offline')}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>{t('health.ping_latency')}</div>
                    {keyHealthScores.has(key.id) && (
                      <HealthScoreBadge score={keyHealthScores.get(key.id)!} />
                    )}
                  </div>
                </div>
              );
            })}

            {keys.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', color: '#64748b', gap: '1rem' }}>
                <Globe size={32} opacity={0.3} aria-hidden="true" />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t('health.no_external_nodes')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Test All results */}
      {probeResults && (
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem 1.5rem', borderRadius: 16, background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.6rem' }}>
            <Activity size={16} color="#3b82f6" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>{t('health.probe_title')}</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#64748b' }}>
              {t('health.probe_ready', { ready: Array.from(probeResults.values()).filter(r => r.status === 'ready').length, total: probeResults.size })}
              <span style={{ marginLeft: 8, color: '#475569' }}>{t('health.probe_active_table', { count: keys.filter(k => k.status === 'active').length })}</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {Array.from(probeResults.entries()).map(([id, r]) => {
              const key = keys.find(k => k.id === id);
              const statusColors: Record<string, string> = { ready: '#10b981', degraded: '#f59e0b', limited: '#f97316', broken: '#ef4444', unknown: '#64748b' };
              const c = statusColors[r.status] || '#64748b';
              const isExpanded = expandedProbe === id;
              const preview = r.responseContent ? r.responseContent.slice(0, 60) + (r.responseContent.length > 60 ? '…' : '') : undefined;
              return (
                <div key={id}>
                  {/* Header row */}
                  <div
                    onClick={() => setExpandedProbe(isExpanded ? null : id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: isExpanded ? '10px 10px 0 0' : 10, background: 'rgba(0,0,0,0.2)', cursor: 'pointer', fontSize: '0.82rem', border: isExpanded ? '1px solid rgba(59,130,246,0.15)' : '1px solid transparent', borderBottom: isExpanded ? 'none' : '1px solid transparent' }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                    <span style={{ color: '#e2e8f0', fontWeight: 600, minWidth: 90, flexShrink: 0 }}>{key?.label || r.provider || id}</span>
                    <span style={{ color: c, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', minWidth: 45, flexShrink: 0 }}>{r.status}</span>
                    {r.latency > 0 && <span style={{ color: '#475569', fontSize: '0.72rem', minWidth: 40, flexShrink: 0 }}>{r.latency}ms</span>}
                    {preview ? (
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{preview}</span>
                    ) : r.error ? (
                      <span style={{ color: '#ef4444', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }} title={r.error}>{r.error}</span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.72rem', fontStyle: 'italic', flex: 1, minWidth: 0 }}>{t('health.no_response')}</span>
                    )}
                    <span style={{ color: '#475569', fontSize: '0.65rem', flexShrink: 0, marginLeft: 4 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  {/* Expanded response content */}
                  {isExpanded && (
                    <div style={{ padding: '10px 14px', borderRadius: '0 0 10px 10px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(59,130,246,0.15)', borderTop: 'none', fontSize: '0.82rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto', lineHeight: 1.5 }}>
                      {r.responseContent || <span style={{ color: '#64748b', fontStyle: 'italic' }}>{t('health.no_response')}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', borderRadius: 16, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
          <Activity size={20} color="#f59e0b" aria-hidden="true" />
          <h3 style={h3White}>{t('health.rate_limit_introspection')}</h3>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#64748b' }}>{t('health.quota_subtitle')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {keys.map(key => {
            const stats = key.stats?.extended;
            const usageRequests = stats?.usageToday?.requests || 0;
            const usageTokens = stats?.usageToday?.tokens || 0;
            const limitRequests = stats?.rules?.quota?.requestsPerDay || 0;
            const limitTokens = stats?.rules?.quota?.tokensPerDay || 0;
            const rateLimitCount = stats?.errorBreakdown?.rateLimit || 0;
            const pressure = stats?.rateLimitPressure || 0;
            const reqPct = limitRequests > 0 ? Math.min(100, Math.round((usageRequests / limitRequests) * 100)) : 0;
            const tokPct = limitTokens > 0 ? Math.min(100, Math.round((usageTokens / limitTokens) * 100)) : 0;
            const alerts = allAlerts.filter(a => a.keyId === key.id);

            return (
              <div key={key.id} style={{ padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={flexCenterGap2Mb075}>
                  <ProviderIcon provider={key.provider} size={14} />
                  <span style={textWeight700Capitalize}>{key.provider}</span>
                  {alerts.length > 0 && <span style={{ marginLeft: 'auto' }} title={alerts[0].message}><AlertTriangle size={12} color="#ef4444" /></span>}
                </div>

                {limitRequests > 0 && (
                  <>
                    <div style={flexBetweenXsMargin}>
                      <span style={{ color: '#94a3b8' }}>{t('health.rate_limit_requests')}</span>
                      <span style={{ color: reqPct > 80 ? '#ef4444' : reqPct > 50 ? '#f59e0b' : '#94a3b8' }}>{usageRequests}/{limitRequests}</span>
                    </div>
                    <div style={progressBar4}>
                      <div style={{ width: `${reqPct}%`, height: '100%', background: reqPct > 80 ? '#ef4444' : reqPct > 50 ? '#f59e0b' : '#3b82f6', borderRadius: 2 }} />
                    </div>
                  </>
                )}

                {limitTokens > 0 && (
                  <>
                    <div style={flexBetweenXsMargin}>
                      <span style={{ color: '#94a3b8' }}>{t('health.rate_limit_tokens')}</span>
                      <span style={{ color: tokPct > 80 ? '#ef4444' : tokPct > 50 ? '#f59e0b' : '#94a3b8' }}>{(usageTokens / 1000).toFixed(1)}k/{(limitTokens / 1000).toFixed(0)}k</span>
                    </div>
                    <div style={progressBar4}>
                      <div style={{ width: `${tokPct}%`, height: '100%', background: tokPct > 80 ? '#ef4444' : tokPct > 50 ? '#f59e0b' : '#a855f7', borderRadius: 2 }} />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: '#64748b', marginTop: '0.25rem' }}>
                  <span>{t('health.rate_limit_429s', { count: rateLimitCount })}</span>
                  <span>{t('health.pressure_label', { value: (pressure * 100).toFixed(0) })}</span>
                </div>
                {introspectionResults[key.id] && !introspectionResults[key.id].error && (
                  <div style={{ marginTop: '0.4rem', padding: '0.35rem 0.5rem', background: 'rgba(0,0,0,0.25)', borderRadius: 6, fontSize: '0.6rem', color: '#94a3b8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(() => {
                      const r = introspectionResults[key.id];
                      const parts: string[] = [];
                      if (r.credits !== undefined) parts.push(`credits: ${r.credits}`);
                      if (r.total_granted !== undefined) parts.push(`granted: ${r.total_granted}`);
                      if (r.total_available !== undefined) parts.push(`available: ${r.total_available}`);
                      if (r.rate_limit_remaining !== undefined) parts.push(`rate-limit: ${r.rate_limit_remaining}/${r.rate_limit_limit}`);
                      if (r.available_models !== undefined) parts.push(`models: ${r.available_models}`);
                      if (r.has_generation !== undefined) parts.push(`gen: ${r.has_generation}`);
                      return parts.length > 0 ? parts.join(' | ') : JSON.stringify(r).slice(0, 120);
                    })()}
                  </div>
                )}
                {Boolean(introspectionResults[key.id]?.error) && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.6rem', color: '#ef4444' }}>
                    introspection: {String(introspectionResults[key.id].error)}
                  </div>
                )}
                {introspectingKeys && !introspectionResults[key.id] && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.6rem', color: '#64748b' }}>
                    {t('health.loading_introspection')}
                  </div>
                )}
              </div>
            );
          })}
          {keys.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem' }}>
              {t('health.no_api_keys')}
            </div>
          )}
        </div>
      </div>

      {/* Health Score Overview */}
      {(() => {
        const allKeyStates = keyStateStore?.getAll() || [];
        if (allKeyStates.length === 0) return null;
        const healthBandColors: Record<string, string> = {
          healthy: '#10b981', warm: '#f59e0b', degraded: '#f97316', cooling: '#ef4444', dead: '#dc2626',
        };
        const healthBandLabels: Record<string, string> = {
          healthy: 'Healthy', warm: 'Warm', degraded: 'Degraded', cooling: 'Cooling', dead: 'Dead',
        };
        return (
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', borderRadius: 16, background: 'rgba(16,185,129,0.02)', border: '1px solid rgba(16,185,129,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(16,185,129,0.08)', paddingBottom: '0.75rem' }}>
              <HeartPulse size={20} color="#10b981" aria-hidden="true" />
              <h3 style={h3White}>{t('health.health_score_title') || 'Health Score Overview'}</h3>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#64748b' }}>KeyState Projection — recovery +5/min</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {allKeyStates.map(ks => {
                const band = getHealthBand(ks.healthScore);
                const color = healthBandColors[band] || '#64748b';
                const label = healthBandLabels[band] || band;
                const keyObj = keys.find(k => k.id === ks.id);
                const recoveryMinutes = ks.healthScore < HEALTH_THRESHOLDS.healthy
                  ? Math.ceil((HEALTH_THRESHOLDS.healthy - ks.healthScore) / 5)
                  : 0;
                const degradedAgo = ks.degradedSince
                  ? Math.round((Date.now() - ks.degradedSince) / 60000)
                  : null;
                const healthyAgo = ks.lastHealthyAt
                  ? Math.round((Date.now() - ks.lastHealthyAt) / 60000)
                  : null;
                return (
                  <div key={ks.id} style={{ padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: `1px solid ${color}20` }}>
                    <div style={flexCenterGap2Mb075}>
                      <ProviderIcon provider={keyObj?.provider || 'unknown'} size={14} />
                      <span style={textWeight700Capitalize}>{keyObj?.label || ks.id.slice(0, 8)}</span>
                      <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, color, background: `${color}20`, textTransform: 'uppercase' }}>{label}</span>
                    </div>
                    <div style={flexCenterGap2Mb05}>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, ks.healthScore)}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color, minWidth: 32, textAlign: 'right' }}>{ks.healthScore}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.65rem', color: '#64748b' }}>
                      {healthyAgo !== null && <span>Last healthy: {healthyAgo < 1 ? 'just now' : `${healthyAgo}m ago`}</span>}
                      {degradedAgo !== null && <span>Degraded since: {degradedAgo}m ago</span>}
                      {recoveryMinutes > 0 && <span style={{ color }}>Est. recovery: ~{recoveryMinutes}m</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', borderRadius: 16, background: 'rgba(139,92,246,0.02)', border: '1px solid rgba(139,92,246,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(139,92,246,0.08)', paddingBottom: '0.75rem' }}>
          <Activity size={20} color="#8b5cf6" aria-hidden="true" />
          <h3 style={h3White}>{t('health.health_timeline')}</h3>
          <select
            value={healthEventFilter}
            onChange={e => setHealthEventFilter(e.target.value)}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', color: '#94a3b8' }}
          >
            <option value="all">All</option>
            <option value="latency_spike">Latency</option>
            <option value="error_burst">Errors</option>
            <option value="status_change">Status</option>
            <option value="rate_limit">Rate Limit</option>
            <option value="recovery">Recovery</option>
          </select>
        </div>
        {healthEvents.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
            {t('health.timeline_empty')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 300, overflowY: 'auto' }}>
            {healthEvents
              .filter(e => healthEventFilter === 'all' || e.type === healthEventFilter)
              .slice(0, 50)
              .map((ev, i) => {
                const eventColor = ev.type === 'latency_spike' ? '#f59e0b'
                  : ev.type === 'error_burst' ? '#ef4444'
                  : ev.type === 'status_change' ? '#8b5cf6'
                  : ev.type === 'rate_limit' ? '#f97316'
                  : '#10b981';
                const eventIcon = ev.type === 'latency_spike' ? <span aria-hidden="true">⚡</span>
                  : ev.type === 'error_burst' ? <span aria-hidden="true">✕</span>
                  : ev.type === 'status_change' ? <span aria-hidden="true">◉</span>
                  : ev.type === 'rate_limit' ? <span aria-hidden="true">⚠</span>
                  : <span aria-hidden="true">✓</span>;
                const ago = Math.floor((Date.now() - ev.timestamp) / 1000);
                const agoStr = ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m`;
                return (
                  <div key={`${ev.provider}-${ev.timestamp}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.15)', fontSize: '0.75rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: eventColor, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem' }}>{eventIcon}</span>
                    <ProviderIcon provider={ev.provider} size={12} />
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{ev.provider}</span>
                    <span style={{ color: eventColor, fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      {ev.type === 'latency_spike' ? t('health.event_latency_spike')
                        : ev.type === 'error_burst' ? t('health.event_error_burst')
                        : ev.type === 'status_change' ? t('health.event_status_change')
                        : ev.type === 'rate_limit' ? t('health.event_rate_limit')
                        : t('health.event_recovery')}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#64748b' }}>{agoStr} ago</span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ev.detail}>{ev.detail}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 2, background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
          <ShieldCheck size={16} aria-hidden="true" /> {t('health.data_encryption')}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
          BUILD_VER: {APP_VERSION} | KERNEL_ID: {kernelId}
        </div>
      </div>
      <ModuleInfo moduleKey="health" />
    </div>
  );
};

export default HealthPanel;
