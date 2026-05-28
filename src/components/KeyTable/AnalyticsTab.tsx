import React from 'react';
import { TrendingUp, TrendingDown, Users, Zap, Shield, Activity, BarChart3 } from 'lucide-react';
import type { ApiKey } from '../../types/metrics';

interface AnalyticsTabProps {
  apiKey: ApiKey;
}

const MetricCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }> = ({ label, value, icon, color, sub }) => (
  <div style={{ padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      <span style={{ color }}>{icon}</span> {label}
    </div>
    <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{value}</div>
    {sub && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{sub}</div>}
  </div>
);

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ apiKey }) => {
  const stats = apiKey.stats;
  const ext = stats?.extended;

  const reputationScore = ext?.reputationScore ?? 0.5;
  const concurrency = ext?.currentConcurrentRequests ?? 0;
  const stability = ext?.stabilityIndex ?? 0.5;
  const retryImpact = ext?.retryImpactScore ?? 0;
  const rateLimitPressure = ext?.rateLimitPressure ?? 0;
  const keyAgeScore = ext?.keyAgeScore ?? 1;
  const stabilityForecast = ext?.stabilityForecast ?? 0.5;

  const getReputationColor = (score: number) => score > 0.7 ? '#10b981' : score > 0.4 ? '#f59e0b' : '#ef4444';
  const getStabilityColor = (score: number) => score > 0.7 ? '#10b981' : score > 0.4 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
        <MetricCard
          label="Reputation"
          value={`${(reputationScore * 100).toFixed(0)}%`}
          icon={<Shield size={16} />}
          color={getReputationColor(reputationScore)}
          sub={reputationScore > 0.7 ? 'Trusted key' : reputationScore > 0.4 ? 'Moderate reliability' : 'Low reputation'}
        />
        <MetricCard
          label="Concurrency"
          value={concurrency}
          icon={<Users size={16} />}
          color="#3b82f6"
          sub={concurrency > 5 ? 'High load' : concurrency > 0 ? 'Active' : 'Idle'}
        />
        <MetricCard
          label="Stability"
          value={`${(stability * 100).toFixed(0)}%`}
          icon={<Activity size={16} />}
          color={getStabilityColor(stability)}
          sub={stability > 0.7 ? 'Stable' : stability > 0.4 ? 'Degraded' : 'Unstable'}
        />
        <MetricCard
          label="Key Age Score"
          value={`${(keyAgeScore * 100).toFixed(0)}%`}
          icon={<BarChart3 size={16} />}
          color="#a855f7"
          sub={keyAgeScore > 0.7 ? 'Recent key' : 'Aged key'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <div style={{ padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <TrendingUp size={16} color="#3b82f6" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Performance Indicators</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
              <span>Success Rate</span>
              <span style={{ color: getReputationColor(reputationScore), fontWeight: 700 }}>
                {stats ? ((stats.successCount / Math.max(1, stats.successCount + stats.errorCount)) * 100).toFixed(1) : '0'}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
              <span>Avg Latency</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{stats?.avgLatency?.toFixed(0) ?? '—'}ms</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
              <span>Total Tokens</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{(stats?.totalTokens ?? 0).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
              <span>Retry Impact</span>
              <span style={{ color: retryImpact > 0.3 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                {(retryImpact * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
              <span>Rate Limit Pressure</span>
              <span style={{ color: rateLimitPressure > 0.5 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                {(rateLimitPressure * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Zap size={16} color="#f59e0b" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Recommendations</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            {reputationScore < 0.4 && (
              <div style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                Low reputation — consider rotating this key
              </div>
            )}
            {rateLimitPressure > 0.5 && (
              <div style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
                High rate limit pressure — reduce concurrent usage
              </div>
            )}
            {stability < 0.4 && (
              <div style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
                Unstable key — check provider status
              </div>
            )}
            {retryImpact > 0.3 && (
              <div style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
                High retry impact — connection issues detected
              </div>
            )}
            {reputationScore >= 0.7 && stability >= 0.7 && (
              <div style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
                Key is healthy — ideal for production workloads
              </div>
            )}
            {!ext && (
              <div style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#94a3b8' }}>
                Insufficient data — more requests needed for analysis
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <TrendingDown size={16} color="#a855f7" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Stability Forecast</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <div style={{ width: `${stabilityForecast * 100}%`, height: '100%', borderRadius: 4, background: getStabilityColor(stabilityForecast), transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: getStabilityColor(stabilityForecast), minWidth: 40, textAlign: 'right' }}>
            {(stabilityForecast * 100).toFixed(0)}%
          </span>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>
          Projected stability based on recent performance trends and historical patterns
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
