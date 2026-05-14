import React, { useEffect, useState } from 'react';
import { RotateCw, BarChart3, Shuffle, Layers, Activity, CheckCircle, AlertTriangle, Settings2, Save, Info } from 'lucide-react';
import { eventBus, EVENTS } from '../../core/events';
import { keyService } from '../../services/KeyService';
import type { ApiKey } from '../../types/metrics';

type PoolStrategy = 'round-robin' | 'least-usage' | 'random';

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

const PoolStatusPanel: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [strategy, setStrategy] = useState<PoolStrategy>('round-robin');
  const [quotas, setQuotas] = useState<Record<string, any>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState({ requestsPerDay: 0, tokensPerDay: 0 });

  useEffect(() => {
    const update = () => {
      setKeys([...keyService.getKeys()]);
      setQuotas(keyService.getFreeTierLimits());
    };
    update();
    const unsub = eventBus.on(EVENTS.KEY_UPDATED, update);
    return unsub;
  }, []);

  const handleSaveQuota = () => {
    if (editingProvider) {
      keyService.setFreeTierLimit(editingProvider, editLimit);
      setEditingProvider(null);
      setQuotas(keyService.getFreeTierLimits());
    }
  };

  const providers = [...new Set(keys.map(k => k.provider))].sort();

  const getPoolKeys = (provider: string) => keys.filter(k => k.provider === provider);
  const getActivePoolKeys = (provider: string) => getPoolKeys(provider).filter(k => k.status === 'active');

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Layers size={28} style={{ color: '#3b82f6' }} />
        <div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>Key Pool Status</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Multi-account round-robin pool management</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Pool Selection Strategy:</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {POOL_STRATEGIES.map(s => (
            <button
              key={s}
              onClick={() => setStrategy(s)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.8rem', borderRadius: 8,
                border: `1px solid ${strategy === s ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                background: strategy === s ? 'rgba(59,130,246,0.15)' : 'rgba(0,0,0,0.2)',
                color: strategy === s ? '#60a5fa' : '#94a3b8',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
              }}
            >
              {STRATEGY_ICONS[s]}
              {s === 'round-robin' ? 'Round Robin' : s === 'least-usage' ? 'Least Usage' : 'Random'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {providers.map(provider => {
          const pool = getPoolKeys(provider);
          const active = getActivePoolKeys(provider);
          const poolStatus = keyService.getPoolStatus(provider);
          const usagePct = poolStatus.limit > 0 ? Math.round((poolStatus.used / poolStatus.limit) * 100) : 0;

          return (
            <div key={provider} className="glass-panel" style={{ padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Activity size={18} style={{ color: '#60a5fa' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{provider}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {poolStatus.limit > 0 ? `${poolStatus.used}/${poolStatus.limit} requests today` : 'No daily limit'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: active.length > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                    {active.length}/{pool.length} active
                  </span>
                </div>
              </div>

              {poolStatus.limit > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#94a3b8' }}>Daily Quota Burn</span>
                    <span style={{ color: usagePct > 80 ? '#ef4444' : usagePct > 50 ? '#f59e0b' : '#94a3b8' }}>{usagePct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${usagePct}%`, height: '100%', background: usagePct > 80 ? '#ef4444' : usagePct > 50 ? '#f59e0b' : '#3b82f6', borderRadius: 3 }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {pool.map(k => {
                    const statusColor = STATUS_COLORS[k.status] || '#64748b';
                    return (
                      <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                        {k.status === 'active' ? <CheckCircle size={14} style={{ color: '#10b981' }} /> : <AlertTriangle size={14} style={{ color: statusColor }} />}
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1', flex: 1 }}>{k.label}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {k.stats?.extended?.usageToday?.requests || 0} req
                        </span>
                        <span style={{ fontSize: '0.7rem', color: statusColor, fontWeight: 600 }}>
                          {k.status === 'quota_exhausted' ? 'exhausted' : k.status}
                        </span>
                      </div>
                    );
                  })}
                {pool.length === 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>
                    No keys configured for {provider}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Global Quotas Configuration */}
      <div style={{ marginTop: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Settings2 size={24} style={{ color: '#10b981' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Global Provider Quotas (Free Tier)</h3>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {Object.entries(quotas).map(([provider, limit]: [string, any]) => (
              <div key={provider} style={{ padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>{provider}</span>
                  <button 
                    onClick={() => { setEditingProvider(provider); setEditLimit(limit); }}
                    style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Adjust
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Req/Day: <span style={{ color: '#e2e8f0' }}>{limit.requestsPerDay.toLocaleString()}</span></div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tokens/Day: <span style={{ color: '#e2e8f0' }}>{limit.tokensPerDay.toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 12, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Info size={18} style={{ color: '#3b82f6' }} />
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              These quotas are used for keys tagged as <b>tier:free</b>. Paid keys bypass these limits.
            </p>
          </div>
        </div>
      </div>

      {editingProvider && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}>
          <div className="glass-panel" style={{ width: 400, padding: '2rem', borderRadius: 24, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>Adjust Quota: {editingProvider}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Requests Per Day</label>
                <input 
                  type="number" 
                  value={editLimit.requestsPerDay}
                  onChange={e => setEditLimit({ ...editLimit, requestsPerDay: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Tokens Per Day</label>
                <input 
                  type="number" 
                  value={editLimit.tokensPerDay}
                  onChange={e => setEditLimit({ ...editLimit, tokensPerDay: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setEditingProvider(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveQuota} style={{ flex: 1, padding: '0.75rem', borderRadius: 12, background: '#10b981', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Save size={18} /> Save Quota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolStatusPanel;
