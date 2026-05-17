import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, AlertTriangle, BarChart3, CheckCircle2,
  Clock, Cloud, Cpu, Database, DollarSign,
  Gauge, Globe, Layers, RefreshCw, Shield,
  Thermometer, TrendingDown, TrendingUp, XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { pressureMapService } from '../../services/PressureMapService';
import type { PressureMapSnapshot, ProviderPressure, GlobalPressure, PressureLevel } from '../../services/PressureMapService';

const PRESSURE_COLORS: Record<PressureLevel, { bg: string; border: string; text: string; glow: string }> = {
  critical: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.6)', text: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
  high:     { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.6)', text: '#f97316', glow: 'rgba(249, 115, 22, 0.3)' },
  medium:   { bg: 'rgba(234, 179, 8, 0.15)',  border: 'rgba(234, 179, 8, 0.6)',  text: '#eab308', glow: 'rgba(234, 179, 8, 0.3)' },
  low:      { bg: 'rgba(34, 197, 94, 0.1)',   border: 'rgba(34, 197, 94, 0.4)',  text: '#22c55e', glow: 'rgba(34, 197, 94, 0.2)' },
  none:     { bg: 'rgba(100, 116, 139, 0.08)', border: 'rgba(100, 116, 139, 0.3)', text: '#64748b', glow: 'rgba(100, 116, 139, 0.15)' },
};

function PressureGauge({ value, size = 40 }: { value: number; size?: number }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const level = value >= 80 ? 'critical' : value >= 60 ? 'high' : value >= 35 ? 'medium' : 'low';
  const color = PRESSURE_COLORS[level].text;
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

const ProviderCard: React.FC<{ data: ProviderPressure }> = ({ data }) => {
  const colors = PRESSURE_COLORS[data.level];
  const statusColor = data.status === 'healthy' ? '#22c55e' : data.status === 'degraded' ? '#eab308' : '#ef4444';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: 16,
        minWidth: 220,
        boxShadow: `0 0 20px ${colors.glow}`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <ProviderIcon provider={data.label} size={22} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{data.label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: statusColor }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
            {data.status.toUpperCase()}
            {data.forecast === 'degrading' && <TrendingDown size={12} />}
            {data.forecast === 'improving' && <TrendingUp size={12} />}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{data.score}</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>pressure</div>
        </div>
      </div>

      {/* Pressure Gauge + Quick Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PressureGauge value={data.score} size={44} />
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 11 }}>
          <span style={{ color: '#64748b' }}>Keys</span>
          <span>{data.keysActive}/{data.keysTotal} active</span>
          <span style={{ color: '#64748b' }}>Latency</span>
          <span>{data.avgLatency > 0 ? `${Math.round(data.avgLatency)}ms` : '—'}</span>
          <span style={{ color: '#64748b' }}>Reliability</span>
          <span>{(data.reliability * 100).toFixed(0)}%</span>
          <span style={{ color: '#64748b' }}>Alerts</span>
          <span style={{ color: data.alertCount > 0 ? '#ef4444' : '#22c55e' }}>{data.alertCount}</span>
        </div>
      </div>

      {/* Quota bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 3 }}>
          <span>Quota</span>
          <span style={{ color: data.quotaPct > 80 ? '#ef4444' : data.quotaPct > 60 ? '#eab308' : '#22c55e' }}>{data.quotaPct}%</span>
        </div>
        <MiniBar pct={data.quotaPct} color={data.quotaPct > 80 ? '#ef4444' : data.quotaPct > 60 ? '#eab308' : '#22c55e'} />
      </div>

      {/* Budget bar */}
      {data.budgetPct > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 3 }}>
            <span>Budget</span>
            <span style={{ color: data.budgetPct > 80 ? '#ef4444' : '#22c55e' }}>{data.budgetPct}%</span>
          </div>
          <MiniBar pct={data.budgetPct} color={data.budgetPct > 80 ? '#ef4444' : '#22c55e'} />
        </div>
      )}

      {/* Four signals micro bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
        {[
          { label: 'Latency', value: data.latencySignal, color: '#8b5cf6' },
          { label: 'Error Rate', value: data.errorRateSignal, color: data.errorRateSignal > 0.1 ? '#ef4444' : '#22c55e' },
          { label: 'Saturation', value: data.saturation, color: data.saturation > 0.7 ? '#ef4444' : '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ fontSize: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: 2 }}>
              <span>{s.label}</span>
              <span>{(s.value * 100).toFixed(0)}%</span>
            </div>
            <MiniBar pct={s.value * 100} color={s.color} />
          </div>
        ))}
      </div>

      {/* Remaining capacity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span>Remaining: {data.remainingQuota.toLocaleString()} req</span>
        {data.remainingBudget < Infinity && <span>${data.remainingBudget.toFixed(2)}</span>}
      </div>
    </motion.div>
  );
};

const GlobalHeader: React.FC<{ data: GlobalPressure }> = ({ data }) => {
  const colors = PRESSURE_COLORS[data.level];
  return (
    <div style={{
      background: `linear-gradient(135deg, ${colors.bg}, transparent)`,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Thermometer size={24} color={colors.text} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#64748b' }}>System Pressure</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>{data.score}</div>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'capitalize' }}>{data.level}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { icon: <Layers size={14} />, label: 'Keys', value: `${data.activeKeys}/${data.totalKeys} active`, color: data.activeKeys / data.totalKeys < 0.5 ? '#eab308' : '#22c55e' },
          { icon: <AlertTriangle size={14} />, label: 'Alerts', value: `${data.totalAlerts} (${data.criticalAlerts} critical)`, color: data.criticalAlerts > 0 ? '#ef4444' : '#64748b' },
          { icon: <DollarSign size={14} />, label: 'Budget', value: `${data.budgetUsagePct}% used`, color: data.budgetUsagePct > 80 ? '#ef4444' : '#22c55e' },
          { icon: <Activity size={14} />, label: 'Requests', value: data.totalRequests.toLocaleString(), color: '#64748b' },
          { icon: <BarChart3 size={14} />, label: 'Cost', value: `$${data.totalCost.toFixed(2)}`, color: '#64748b' },
          { icon: <Clock size={14} />, label: 'Degraded', value: `${data.degradedKeys} keys`, color: data.degradedKeys > 0 ? '#eab308' : '#22c55e' },
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
  );
};

const PressureMap: React.FC = () => {
  const [snapshot, setSnapshot] = useState<PressureMapSnapshot | null>(pressureMapService.getLastSnapshot());
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    pressureMapService.startAutoRefresh(5000);
    const unsub = pressureMapService.onUpdate(setSnapshot);
    if (!snapshot) setSnapshot(pressureMapService.generateSnapshot());
    return () => { unsub(); pressureMapService.stopAutoRefresh(); };
  }, []);

  const handleRefresh = () => {
    const snap = pressureMapService.generateSnapshot();
    setSnapshot(snap);
  };

  if (!snapshot) {
    return (
      <div style={{ padding: 24, color: '#64748b', textAlign: 'center' }}>
        Generating pressure map...
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Thermometer size={22} color="#f97316" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>System Pressure Map</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Last: {new Date(snapshot.timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 10px', color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global header */}
      <GlobalHeader data={snapshot.global} />

      {/* Provider cards grid */}
      {snapshot.providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
          <Database size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
          <div>No providers configured. Add API keys to see pressure data.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          <AnimatePresence>
            {snapshot.providers.map(p => (
              <ProviderCard key={p.id} data={p} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default PressureMap;
