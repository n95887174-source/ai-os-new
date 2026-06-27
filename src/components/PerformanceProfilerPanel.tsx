import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Gauge, Activity, Clock, Zap, BarChart3, X, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNow } from '../hooks/useNow';
import { rootLogger } from '../kernel/instances';
import { useTranslation } from '../i18n/useTranslation';
import { errorContainer, dismissBtnRed, textMutedXs, textWhiteXs } from '../styles/common'
import type { LogEntry } from '../kernel/contracts/logger';

interface ServiceStats {
  service: string;
  count: number;
  totalLatency: number;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  min: number;
  errorCount: number;
  warnCount: number;
  lastSeen: number;
}

function computePercentiles(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

function aggregate(entries: ReadonlyArray<LogEntry>): ServiceStats[] {
  const byService = new Map<string, number[]>();
  const errorCount = new Map<string, number>();
  const warnCount = new Map<string, number>();
  const lastSeen = new Map<string, number>();
  for (const e of entries) {
    if (e.service && typeof e.latency === 'number' && e.latency > 0) {
      const list = byService.get(e.service) ?? [];
      list.push(e.latency);
      byService.set(e.service, list);
      const t = e.timestamp;
      if (!lastSeen.has(e.service) || (lastSeen.get(e.service) ?? 0) < t) lastSeen.set(e.service, t);
    }
    if (e.level === 'error') errorCount.set(e.service ?? 'unknown', (errorCount.get(e.service ?? 'unknown') ?? 0) + 1);
    if (e.level === 'warn') warnCount.set(e.service ?? 'unknown', (warnCount.get(e.service ?? 'unknown') ?? 0) + 1);
  }
  const out: ServiceStats[] = [];
  for (const [service, lats] of byService.entries()) {
    const sorted = [...lats].sort((a, b) => a - b);
    const sum = sorted.reduce((s, v) => s + v, 0);
    out.push({
      service,
      count: sorted.length,
      totalLatency: sum,
      avgLatency: sum / sorted.length,
      p50: computePercentiles(sorted, 0.5),
      p95: computePercentiles(sorted, 0.95),
      p99: computePercentiles(sorted, 0.99),
      max: sorted[sorted.length - 1] ?? 0,
      min: sorted[0] ?? 0,
      errorCount: errorCount.get(service) ?? 0,
      warnCount: warnCount.get(service) ?? 0,
      lastSeen: lastSeen.get(service) ?? 0,
    });
  }
  return out.sort((a, b) => b.avgLatency - a.avgLatency);
}

export const PerformanceProfilerPanel: React.FC = () => {
  const { t } = useTranslation();
  const now = useNow(60_000);
  const [entries, setEntries] = useState<ReadonlyArray<LogEntry>>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const update = () => {
      if (isMountedRef.current) setEntries(rootLogger.getBuffer());
    };
    update();
    const interval = setInterval(update, 1500);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => aggregate(entries), [entries]);
  const totalSamples = stats.reduce((s, x) => s + x.count, 0);
  const overallAvg = totalSamples === 0 ? 0 : stats.reduce((s, x) => s + x.totalLatency, 0) / totalSamples;
  const totalErrors = entries.filter(e => e.level === 'error').length;
  const totalWarns = entries.filter(e => e.level === 'warn').length;

  const slowServices = useMemo(() => stats.filter(s => s.p95 > 2000).slice(0, 5), [stats]);

  if (stats.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', flexDirection: 'column', gap: '0.5rem' }}>
        <Activity size={48} color="#475569" />
        <p>{t('performance_profiler.empty')}</p>
        <p style={textMutedXs}>{t('performance_profiler.empty_hint')}</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', overflow: 'auto' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
          <Gauge size={26} color="#a855f7" /> {t('performance_profiler.title')}
        </h2>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('performance_profiler.subtitle')}</p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={errorContainer}>
          {error}
          <button onClick={() => setError(null)} style={dismissBtnRed}><X size={18} /></button>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        <StatBox icon={<BarChart3 size={14} color="#3b82f6" />} label={t('performance_profiler.services')} value={stats.length} color="#3b82f6" />
        <StatBox icon={<Activity size={14} color="#10b981" />} label={t('performance_profiler.samples')} value={totalSamples} color="#10b981" />
        <StatBox icon={<Clock size={14} color="#f59e0b" />} label={t('performance_profiler.avg_latency')} value={`${overallAvg.toFixed(0)}ms`} color="#f59e0b" />
        <StatBox icon={<AlertCircle size={14} color="#ef4444" />} label={t('performance_profiler.errors_warns')} value={`${totalErrors} / ${totalWarns}`} color="#ef4444" />
      </div>

      {slowServices.length > 0 && (
        <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={14} color="#f59e0b" />
          <span style={{ color: '#fbbf24', fontSize: '0.8rem' }}>{t('performance_profiler.slow_warning', { count: slowServices.length, services: slowServices.map(s => s.service).join(', ') })}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.7fr 0.7fr', gap: 4, padding: '0.4rem 0.5rem', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span>{t('performance_profiler.col_service')}</span>
          <span style={{ textAlign: 'right' }}>{t('performance_profiler.col_count')}</span>
          <span style={{ textAlign: 'right' }}>{t('performance_profiler.col_avg')}</span>
          <span style={{ textAlign: 'right' }}>{t('performance_profiler.col_p50')}</span>
          <span style={{ textAlign: 'right' }}>{t('performance_profiler.col_p95')}</span>
          <span style={{ textAlign: 'right' }}>{t('performance_profiler.col_p99')}</span>
          <span style={{ textAlign: 'right' }}>{t('performance_profiler.col_err')}</span>
          <span style={{ textAlign: 'right' }}>{t('performance_profiler.col_warn')}</span>
        </div>
        {stats.map(s => (
          <button
            key={s.service}
            onClick={() => setSelectedService(selectedService === s.service ? null : s.service)}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.7fr 0.7fr',
              gap: 4,
              padding: '0.4rem 0.5rem',
              borderRadius: 6,
              border: `1px solid ${selectedService === s.service ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.03)'}`,
              background: selectedService === s.service ? 'rgba(168,85,247,0.05)' : 'rgba(0,0,0,0.2)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              textAlign: 'left',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#cbd5e1', fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace' }}>{s.service}</span>
            <span style={{ textAlign: 'right', color: '#94a3b8' }}>{s.count}</span>
            <LatencyCell value={s.avgLatency} />
            <LatencyCell value={s.p50} />
            <LatencyCell value={s.p95} highlight />
            <LatencyCell value={s.p99} highlight />
            <span style={{ textAlign: 'right', color: s.errorCount > 0 ? '#fca5a5' : '#475569' }}>{s.errorCount}</span>
            <span style={{ textAlign: 'right', color: s.warnCount > 0 ? '#fcd34d' : '#475569' }}>{s.warnCount}</span>
          </button>
        ))}
      </div>

      {selectedService && (() => {
        const sel = stats.find(s => s.service === selectedService);
        if (!sel) return null;
        const recent = entries.filter(e => e.service === selectedService && typeof e.latency === 'number').slice(-20).reverse();
        const all = entries.filter(e => e.service === selectedService);
        const oneMinuteAgo = now - 60_000;
        const lastMinute = all.filter(e => e.timestamp >= oneMinuteAgo).length;
        return (
          <div style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(168,85,247,0.2)', background: 'rgba(168,85,247,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc' }}>{selectedService}</h3>
              <button onClick={() => setSelectedService(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <MiniStat label="min" value={`${sel.min.toFixed(0)}ms`} color="#10b981" />
              <MiniStat label="max" value={`${sel.max.toFixed(0)}ms`} color="#ef4444" />
              <MiniStat label="total" value={`${sel.totalLatency.toFixed(0)}ms`} color="#f59e0b" />
              <MiniStat label="last 60s" value={lastMinute.toString()} color="#a855f7" />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 50, padding: '0.4rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {recent.map((e, i) => {
                const lat = e.latency ?? 0;
                const maxLat = Math.max(...recent.map(r => r.latency ?? 0), 1);
                const h = Math.max(2, (lat / maxLat) * 50);
                const color = lat > 2000 ? '#ef4444' : lat > 500 ? '#f59e0b' : '#10b981';
                return <div key={i} style={{ flex: 1, height: h, background: color, borderRadius: 1, minWidth: 2 }} title={`${lat}ms`} />;
              })}
            </div>
            <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recent.slice(0, 5).map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                  <span style={{ minWidth: 70 }}>{new Date(e.timestamp).toISOString().slice(11, 19)}</span>
                  <span style={{ color: '#cbd5e1', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.message.slice(0, 80)}</span>
                  <span style={{ color: '#a78bfa' }}>{e.latency}ms</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div style={{ padding: '0.4rem 0.6rem', borderRadius: 8, border: `1px solid ${color}20`, background: `linear-gradient(145deg, ${color}05, rgba(0,0,0,0.2))` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>{icon}<span style={{ ...textMutedXs, fontSize: '0.65rem' }}>{label}</span></div>
    <div style={{ ...textWhiteXs, fontSize: '0.95rem', fontWeight: 700, color }}>{value}</div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ padding: '0.25rem 0.4rem', borderRadius: 4, background: 'rgba(0,0,0,0.2)' }}>
    <div style={{ ...textMutedXs, fontSize: '0.6rem' }}>{label}</div>
    <div style={{ color, fontSize: '0.8rem', fontWeight: 600 }}>{value}</div>
  </div>
);

const LatencyCell: React.FC<{ value: number; highlight?: boolean }> = ({ value, highlight }) => {
  const color = value > 2000 ? '#fca5a5' : value > 500 ? '#fcd34d' : '#86efac';
  return <span style={{ textAlign: 'right', color: highlight ? color : '#cbd5e1', fontWeight: highlight ? 600 : 400 }}>{value.toFixed(0)}ms</span>;
};

export default PerformanceProfilerPanel;
