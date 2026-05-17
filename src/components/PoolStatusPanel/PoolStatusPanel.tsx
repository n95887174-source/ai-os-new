import React, { useEffect, useState } from 'react';
import { RotateCw, BarChart3, Shuffle, Layers, Activity, Settings2, Save, Zap, Server, Cpu } from 'lucide-react';
import { eventBus, EVENTS } from '../../core/events';
import { keyService } from '../../services/KeyService';
import type { PoolStrategy } from '../../services/KeyService';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import type { ApiKey } from '../../types/metrics';

const STRATEGY_ICONS: Record<PoolStrategy, React.ReactNode> = {
  'round-robin': <RotateCw size={16} />,
  'least-usage': <BarChart3 size={16} />,
  'random': <Shuffle size={16} />,
};

const POOL_STRATEGIES: PoolStrategy[] = ['round-robin', 'least-usage', 'random'];

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  checking: '#3b82f6',
  pending: '#f59e0b',
  quota_exhausted: '#ef4444',
  invalid: '#ef4444',
  duplicate: '#a855f7',
  quarantined: '#f59e0b',
  probation: '#f59e0b',
  error: '#ef4444',
  inactive: '#64748b',
};

interface PoolConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  providers: string[];
}

const POOLS: PoolConfig[] = [
  { id: 'fast', name: 'Fast Compute', icon: <Zap size={20} />, color: '#f59e0b', description: 'Low-latency inference for real-time agents', providers: ['groq', 'nvidia'] },
  { id: 'balanced', name: 'Balanced', icon: <Server size={20} />, color: '#3b82f6', description: 'General-purpose routing with cost-quality tradeoff', providers: ['gemini', 'openrouter', 'google'] },
  { id: 'free', name: 'Free Tier', icon: <Activity size={20} />, color: '#10b981', description: 'Zero-cost models with quota limits for experimentation', providers: ['groq', 'google', 'openrouter'] },
  { id: 'experimental', name: 'Experimental', icon: <Cpu size={20} />, color: '#8b5cf6', description: 'New/unstable providers and bleeding-edge models', providers: ['nvidia', 'openrouter', 'together', 'fireworks', 'deepseek', 'mistral', 'cohere'] },
];

const PoolStatusPanel: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [quotas, setQuotas] = useState<Record<string, any>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState({ requestsPerDay: 0, tokensPerDay: 0 });
  const [viewMode, setViewMode] = useState<'pools' | 'providers'>('pools');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const update = () => {
      setKeys([...keyService.getKeys()]);
      setQuotas(keyService.getFreeTierLimits?.() || {});
    };
    update();
    const unsub = eventBus.on(EVENTS.KEY_UPDATED, update);
    return unsub;
  }, []);

  const handleSaveQuota = () => {
    if (editingProvider) {
      keyService.setFreeTierLimit(editingProvider, editLimit);
      setEditingProvider(null);
      setQuotas(keyService.getFreeTierLimits?.() || {});
    }
  };

  const providers = [...new Set(keys.map(k => k.provider))].sort();
  const getPoolKeys = (provider: string) => keys.filter(k => k.provider === provider);
  const getActivePoolKeys = (provider: string) => getPoolKeys(provider).filter(k => k.status === 'active');

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Layers size={28} style={{ color: '#3b82f6' }} />
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>Resource Pools</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Fast / Balanced / Free / Experimental pool management</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: 12 }}>
          <button onClick={() => setViewMode('pools')} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: viewMode === 'pools' ? 'rgba(59,130,246,0.2)' : 'transparent', color: viewMode === 'pools' ? '#f8fafc' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Layers size={14} /> Pools
          </button>
          <button onClick={() => setViewMode('providers')} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: viewMode === 'providers' ? 'rgba(59,130,246,0.2)' : 'transparent', color: viewMode === 'providers' ? '#f8fafc' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Settings2 size={14} /> Providers
          </button>
        </div>
      </div>

      {viewMode === 'pools' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {POOLS.map(pool => {
            const kps = keys.filter(k => pool.providers.includes(k.provider.toLowerCase()));
            const activeKeys = kps.filter(k => k.status === 'active').length;
            const totalUsage = kps.reduce((s, k) => s + (k.stats?.extended?.usageToday?.requests || 0), 0);
            const maxLimit = kps.reduce((s, k) => s + (quotas[k.provider]?.requestsPerDay || 0), 0);
            const usagePct = maxLimit > 0 ? Math.min(100, Math.round((totalUsage / maxLimit) * 100)) : 0;
            const avgLatency = kps.filter(k => k.latency).length > 0
              ? Math.round(kps.filter(k => k.latency).reduce((s, k) => s + (k.latency || 0), 0) / kps.filter(k => k.latency).length)
              : 0;

            return (
              <div
                key={pool.id}
                className="glass-panel"
                style={{ padding: '1.5rem', borderRadius: 16, border: `1px solid ${pool.color}20`, background: `linear-gradient(145deg, ${pool.color}08 0%, rgba(0,0,0,0.2) 100%)` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.6rem', borderRadius: 12, background: `${pool.color}15`, border: `1px solid ${pool.color}30`, color: pool.color }}>
                    {pool.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{pool.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{pool.description}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1, padding: '0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: activeKeys > 0 ? '#10b981' : '#64748b' }}>{activeKeys}/{kps.length}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</div>
                  </div>
                  <div style={{ flex: 1, padding: '0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: avgLatency > 0 ? avgLatency < 500 ? '#10b981' : avgLatency < 1500 ? '#f59e0b' : '#ef4444' : '#64748b' }}>{avgLatency > 0 ? `${avgLatency}ms` : '--'}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Latency</div>
                  </div>
                  <div style={{ flex: 1, padding: '0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>{kps.length}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keys</div>
                  </div>
                </div>

                {(totalUsage > 0 || maxLimit > 0) && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#94a3b8' }}>Quota Burn</span>
                      <span style={{ color: usagePct > 80 ? '#ef4444' : usagePct > 50 ? '#f59e0b' : '#94a3b8' }}>{usagePct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${usagePct}%`, height: '100%', background: usagePct > 80 ? '#ef4444' : usagePct > 50 ? '#f59e0b' : '#3b82f6', borderRadius: 3 }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {kps.slice(0, 4).map(k => {
                    const used = k.stats?.extended?.usageToday?.requests || 0;
                    const limit = k.stats?.extended?.rules?.quota?.requestsPerDay || 0;
                    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                    return (
                      <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 8, background: 'rgba(0,0,0,0.15)' }}>
                        <ProviderIcon provider={k.provider} size={12} />
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={k.label}>
                          {k.label}
                        </span>
                        {limit > 0 && (
                          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981', borderRadius: 2 }} />
                          </div>
                        )}
                        <span style={{ fontSize: '0.65rem', color: k.status === 'active' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{k.status === 'active' ? 'OK' : 'ERR'}</span>
                        {k.latency && <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{k.latency}ms</span>}
                      </div>
                    );
                  })}
                  {kps.length > 4 && (
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center', padding: '0.3rem' }}>
                      +{kps.length - 4} more keys
                    </div>
                  )}
                  {kps.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>
                      No providers in this pool
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', padding: '0 0.5rem', marginBottom: '0.25rem' }}>
            <span>Provider</span>
            <span style={{ display: 'flex', gap: '1rem' }}>
              <span>Strategy</span>
              <span>Active</span>
              <span>Quota Cap</span>
              <span>Actions</span>
            </span>
          </div>
          {providers.map(provider => {
            const poolKeys = getPoolKeys(provider);
            const activeCount = getActivePoolKeys(provider).length;
            const poolQuota = quotas[provider];
            const providerStrategy = keyService.getPoolStrategy(provider);
            const distribution = keyService.getPoolKeyDistribution(provider);
            return (
              <div key={provider} className="glass-panel" style={{ padding: '0.75rem 1rem', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ProviderIcon provider={provider} size={16} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', textTransform: 'capitalize' }}>{provider}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ position: 'relative' }}>
                    <select value={providerStrategy} onChange={e => { keyService.setPoolStrategy(provider, e.target.value as PoolStrategy); setRefresh(r => r + 1); }} style={{ padding: '0.3rem 0.5rem', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '0.7rem' }}>
                      {POOL_STRATEGIES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: activeCount > 0 ? '#10b981' : '#64748b', minWidth: 40, textAlign: 'center' }}>
                    {activeCount}/{poolKeys.length}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: 60, textAlign: 'right' }}>
                    {poolQuota ? `${poolQuota.requestsPerDay}/d` : '--'}
                  </span>
                  <button
                    onClick={() => setEditingProvider(editingProvider === provider ? null : provider)}
                    style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: editingProvider === provider ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Settings2 size={12} /> Quota
                  </button>
                </div>
                {editingProvider === provider && (
                  <div style={{ position: 'absolute', marginTop: '4rem', right: '1rem', padding: '1rem', borderRadius: 12, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10, minWidth: 220 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem' }}>Edit Free Tier Quota</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Requests / Day</label>
                      <input type="number" value={editLimit.requestsPerDay} onChange={e => setEditLimit(l => ({ ...l, requestsPerDay: Number(e.target.value) }))} style={{ padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.75rem' }} />
                      <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tokens / Day</label>
                      <input type="number" value={editLimit.tokensPerDay} onChange={e => setEditLimit(l => ({ ...l, tokensPerDay: Number(e.target.value) }))} style={{ padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.75rem' }} />
                      <button onClick={handleSaveQuota} style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: 8, background: '#3b82f6', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Save size={12} /> Save
                      </button>
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.65rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                      {distribution.filter(d => d.limit > 0).length > 0 && (
                        <div>
                          <div style={{ marginBottom: '0.3rem', color: '#94a3b8' }}>Key Usage</div>
                          {distribution.filter(d => d.limit > 0).map(d => (
                            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                              <span style={{ color: d.pct > 80 ? '#ef4444' : d.pct > 50 ? '#f59e0b' : '#10b981' }}>{d.used}/{d.limit}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default PoolStatusPanel;
