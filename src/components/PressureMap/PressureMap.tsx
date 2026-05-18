import React, { useState, useEffect } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Clock, Database, DollarSign,
  Globe, Layers, RefreshCw, Shield, Thermometer, TrendingDown, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../../i18n/translations';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { pressureMapService } from '../../services/PressureMapService';
import type { PressureMapSnapshot, ProviderPressureEntry, PressureLevel } from '../../services/PressureMapService';
import ModuleInfo from '../ModuleInfo/ModuleInfo';

const PRESSURE_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  critical: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.6)', text: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
  high:     { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.6)', text: '#f97316', glow: 'rgba(249, 115, 22, 0.3)' },
  normal:   { bg: 'rgba(234, 179, 8, 0.15)',  border: 'rgba(234, 179, 8, 0.6)',  text: '#eab308', glow: 'rgba(234, 179, 8, 0.3)' },
  low:      { bg: 'rgba(34, 197, 94, 0.1)',   border: 'rgba(34, 197, 94, 0.4)',  text: '#22c55e', glow: 'rgba(34, 197, 94, 0.2)' },
};

const LEVEL_TO_SCORE: Record<string, number> = {
  critical: 90, high: 70, normal: 45, low: 15,
};

function PressureGauge({ value, size = 40 }: { value: number; size?: number }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const level = value >= 80 ? 'critical' : value >= 60 ? 'high' : value >= 35 ? 'normal' : 'low';
  const color = PRESSURE_COLORS[level]?.text || '#64748b';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
    </div>
  );
}

const ProviderCard: React.FC<{ data: ProviderPressureEntry }> = ({ data }) => {
  const colors = PRESSURE_COLORS[data.level] || PRESSURE_COLORS.low;
  const statusScore = data.breakdown.status;
  const statusColor = statusScore >= 0.8 ? '#22c55e' : statusScore >= 0.5 ? '#eab308' : '#ef4444';

  return (
    <motion.div
      layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, minWidth: 220, boxShadow: `0 0 20px ${colors.glow}` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <ProviderIcon provider={data.provider} size={22} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{data.provider}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: statusColor }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
            {statusScore >= 0.8 ? 'HEALTHY' : statusScore >= 0.5 ? 'DEGRADED' : 'CRITICAL'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{(data.score * 100).toFixed(0)}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>{t('pressure_map.unit_pressure')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PressureGauge value={data.score * 100} size={44} />
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 11 }}>
          <span style={{ color: '#64748b' }}>Latency</span>
          <span>{(data.breakdown.latency * 100).toFixed(0)}%</span>
          <span style={{ color: '#64748b' }}>Reliability</span>
          <span>{(data.breakdown.reliability * 100).toFixed(0)}%</span>
          <span style={{ color: '#64748b' }}>Errors</span>
          <span style={{ color: data.breakdown.errorRate > 0.1 ? '#ef4444' : '#22c55e' }}>{(data.breakdown.errorRate * 100).toFixed(1)}%</span>
          <span style={{ color: '#64748b' }}>Status</span>
          <span style={{ color: statusColor }}>{(data.breakdown.status * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 3 }}>
          <span>{t('pressure_map.card.quota')}</span>
          <span style={{ color: data.breakdown.quotaPct > 80 ? '#ef4444' : data.breakdown.quotaPct > 60 ? '#eab308' : '#22c55e' }}>{(data.breakdown.quotaPct * 100).toFixed(0)}%</span>
        </div>
        <MiniBar pct={data.breakdown.quotaPct * 100} color={data.breakdown.quotaPct > 80 ? '#ef4444' : data.breakdown.quotaPct > 60 ? '#eab308' : '#22c55e'} />
      </div>

      {data.breakdown.budgetPct > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 3 }}>
            <span>{t('pressure_map.card.budget')}</span>
            <span style={{ color: data.breakdown.budgetPct > 80 ? '#ef4444' : '#22c55e' }}>{(data.breakdown.budgetPct * 100).toFixed(0)}%</span>
          </div>
          <MiniBar pct={data.breakdown.budgetPct * 100} color={data.breakdown.budgetPct > 80 ? '#ef4444' : '#22c55e'} />
        </div>
      )}
    </motion.div>
  );
};

const PressureMap: React.FC = () => {
  const [snapshot, setSnapshot] = useState<PressureMapSnapshot | null>(null);

  const refresh = () => {
    try {
      setSnapshot(pressureMapService.getSnapshot());
    } catch {}
  };

  useEffect(() => {
    refresh();
    const unsub = pressureMapService.onPressureChange(setSnapshot);
    const interval = setInterval(refresh, 10000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  if (!snapshot) {
    return (
      <div style={{ padding: 24, color: '#64748b', textAlign: 'center' }}>
        {t('pressure_map.loading')}
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Thermometer size={22} color="#f97316" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{t('pressure_map.title')}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {t('pressure_map.last_update')} {new Date(snapshot.timestamp).toLocaleTimeString()}
          </span>
          <button onClick={refresh} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '6px 10px', color: '#94a3b8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
          }}>
            <RefreshCw size={14} />
            {t('pressure_map.refresh')}
          </button>
        </div>
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${PRESSURE_COLORS[snapshot.global.level]?.bg || 'transparent'}, transparent)`,
        border: `1px solid ${PRESSURE_COLORS[snapshot.global.level]?.border || 'rgba(255,255,255,0.1)'}`,
        borderRadius: 12, padding: '16px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: PRESSURE_COLORS[snapshot.global.level]?.bg,
            border: `1px solid ${PRESSURE_COLORS[snapshot.global.level]?.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Thermometer size={24} color={PRESSURE_COLORS[snapshot.global.level]?.text} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{t('pressure_map.system_pressure')}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: PRESSURE_COLORS[snapshot.global.level]?.text }}>{(snapshot.global.score * 100).toFixed(0)}</div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'capitalize' }}>{snapshot.global.level}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {[
            { icon: <Globe size={14} />, label: 'Providers', value: `${snapshot.providers.length} active`, color: '#64748b' },
            { icon: <AlertTriangle size={14} />, label: 'Alerts', value: `${snapshot.alertCount} unacknowledged`, color: snapshot.alertCount > 0 ? '#ef4444' : '#64748b' },
            { icon: <Activity size={14} />, label: 'Sessions', value: `${snapshot.sessions.length} active`, color: '#64748b' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <div>
                <div style={{ color: '#64748b', fontSize: 10 }}>{s.label}</div>
                <div style={{ fontWeight: 500 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {snapshot.providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
          <Database size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div>{t('pressure_map.empty')}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          <AnimatePresence>
            {snapshot.providers.map(p => (
              <ProviderCard key={p.provider} data={p} />
            ))}
          </AnimatePresence>
        </div>
      )}
      <ModuleInfo moduleKey="pressure_map" />
    </div>
  );
};

export default PressureMap;
