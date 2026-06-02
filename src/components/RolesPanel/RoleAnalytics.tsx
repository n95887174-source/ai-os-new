import React from 'react';
import { BarChart3, Activity, Zap, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { RoleUsageStats } from '../../kernel/instances';

interface RoleAnalyticsProps {
  stats: Record<string, RoleUsageStats>;
  roles: Array<{ id: string; name: string; metadata: { category: string } }>;
}

const MiniBar: React.FC<{ value: number; max: number; color: string; height?: number }> = ({ value, max, color, height = 4 }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', width: '100%' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
        style={{ height: '100%', background: color, borderRadius: 2 }} />
    </div>
  );
};

const DonutChart: React.FC<{ segments: Array<{ label: string; value: number; color: string }>; size?: number }> = ({ segments, size = 90 }) => {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const dashOffset = -offset;
        offset += dash;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="6"
            strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={dashOffset} strokeLinecap="round" />
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="700">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="9">roles</text>
    </svg>
  );
};

export const RoleAnalytics: React.FC<RoleAnalyticsProps> = ({ stats, roles }) => {
  const totalInvocations = Object.values(stats).reduce((s, r) => s + (r.invocations || 0), 0);
  const totalErrors = Object.values(stats).reduce((s, r) => s + (r.errors || 0), 0);
  const avgLatency = roles.length > 0
    ? Math.round(Object.values(stats).reduce((s, r) => s + (r.avgLatency || 0), 0) / Math.max(1, Object.keys(stats).length))
    : 0;
  const successRate = totalInvocations > 0 ? Math.round(((totalInvocations - totalErrors) / totalInvocations) * 100) : 100;

  const maxInvocations = Math.max(...Object.values(stats).map(r => r.invocations || 0), 1);

  const categorySegments = (() => {
    const counts: Record<string, number> = {};
    roles.forEach(r => { counts[r.metadata.category] = (counts[r.metadata.category] || 0) + 1; });
    const colors: Record<string, string> = { technical: '#3b82f6', creative: '#a855f7', analytical: '#10b981', management: '#f59e0b' };
    return Object.entries(counts).map(([label, value]) => ({ label, value, color: colors[label] || '#64748b' }));
  })();

  const topRoles = roles.slice()
    .sort((a, b) => (stats[a.id]?.invocations || 0) - (stats[b.id]?.invocations || 0))
    .slice(-8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart3 size={18} color="#3b82f6" />
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0' }}>Role Usage Analytics</span>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        {[
          { label: 'Total Invocations', value: totalInvocations.toLocaleString(), icon: <Zap size={14} />, color: '#3b82f6' },
          { label: 'Success Rate', value: `${successRate}%`, icon: <Activity size={14} />, color: successRate > 90 ? '#10b981' : '#f59e0b' },
          { label: 'Avg Latency', value: `${avgLatency}ms`, icon: <BarChart3 size={14} />, color: avgLatency < 500 ? '#10b981' : '#f59e0b' },
          { label: 'Total Errors', value: totalErrors.toString(), icon: <AlertTriangle size={14} />, color: totalErrors > 0 ? '#ef4444' : '#10b981' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.6rem 0.75rem', border: `1px solid ${card.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, color: card.color }}>
              {card.icon}
              <span style={{ fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
        {/* Usage per Role */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Invocations per Role
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {topRoles.map(r => {
              const inv = stats[r.id]?.invocations || 0;
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', width: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  <div style={{ flex: 1 }}>
                    <MiniBar value={inv} max={maxInvocations} color="#3b82f6" />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', width: 36, textAlign: 'right' }}>{inv}</span>
                </div>
              );
            })}
            {topRoles.length === 0 && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>No role usage data yet</div>
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.75rem', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            By Category
          </div>
          <DonutChart segments={categorySegments} size={80} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' }}>
            {categorySegments.map(seg => (
              <div key={seg.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6rem', color: '#94a3b8' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color }} />
                {seg.label}: {seg.value}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleAnalytics;
