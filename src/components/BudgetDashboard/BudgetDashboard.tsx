import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Target, Wallet, Users, BarChart3, RefreshCcw, Bell, BellOff } from 'lucide-react';
import { eventBus, EVENTS } from '../../core/events';
import { budgetService, type SpendSummary, type BudgetAlert } from '../../services/BudgetService';
import { pricingService } from '../../services/PricingService';
import { agentService } from '../../services/AgentService';

const BudgetDashboard: React.FC = () => {
  const [summary, setSummary] = useState<SpendSummary | null>(null);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editProviderBudget, setEditProviderBudget] = useState(0);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editAgentBudget, setEditAgentBudget] = useState(0);
  const [globalBudget, setGlobalBudget] = useState(50);
  const [showAlerts, setShowAlerts] = useState(false);

  const refresh = () => {
    setSummary(budgetService.getSpendSummary());
    setAlerts(budgetService.getAlerts());
    setGlobalBudget(pricingService.getBudgetInfo().monthlyBudget);
    const agents = agentService.getAgents();
    const names: Record<string, string> = {};
    for (const a of agents) names[a.id] = a.name;
    setAgentNames(names);
  };

  useEffect(() => {
    refresh();
    const unsub = eventBus.on(EVENTS.KEY_UPDATED, refresh);
    const unsub2 = eventBus.on('budget:alert', refresh);
    const interval = setInterval(refresh, 10000);
    return () => { unsub(); unsub2(); clearInterval(interval); };
  }, []);

  const pctColor = (pct: number) => pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : pct >= 50 ? '#3b82f6' : '#10b981';

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Wallet size={28} style={{ color: '#10b981' }} />
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>Spend Governance</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Budgets & alerts per provider, agent, and global</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => setShowAlerts(!showAlerts)} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: showAlerts ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            {showAlerts ? <BellOff size={14} /> : <Bell size={14} />} Alerts ({alerts.length})
          </button>
          <button onClick={refresh} style={{ padding: '0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      {showAlerts && alerts.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {alerts.slice(-5).reverse().map((a, i) => (
            <div key={i} style={{ padding: '0.6rem 1rem', borderRadius: 8, background: a.level >= 100 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${a.level >= 100 ? '#ef4444' : '#f59e0b'}30`, color: '#cbd5e1', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={14} color={a.level >= 100 ? '#ef4444' : '#f59e0b'} />
              {a.message}
              <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#64748b' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Global Budget Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, marginBottom: '1.5rem', border: summary && summary.global.pct >= 80 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: 12, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Global Monthly Budget</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Across all providers and agents</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>$</span>
            <input type="number" value={globalBudget} onChange={e => { const v = parseFloat(e.target.value) || 0; setGlobalBudget(v); pricingService.setMonthlyBudget(v); refresh(); }} style={{ width: 80, padding: '0.3rem 0.5rem', borderRadius: 6, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.85rem', textAlign: 'right' }} />
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>/mo</span>
          </div>
        </div>
        {summary && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>SPENT</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: summary.global.pct > 80 ? '#ef4444' : '#f8fafc' }}>${summary.global.spent.toFixed(2)}</div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>REMAINING</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: summary.global.remaining > 0 ? '#10b981' : '#ef4444' }}>${summary.global.remaining.toFixed(2)}</div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>PROJECTED</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>${pricingService.getBudgetInfo().projectedMonthly.toFixed(2)}</div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>USAGE</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: pctColor(summary.global.pct) }}>{summary.global.pct}%</div>
              </div>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, summary.global.pct)}%`, height: '100%', background: summary.global.pct > 80 ? '#ef4444' : summary.global.pct > 50 ? '#f59e0b' : '#10b981', borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Provider Budgets */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <BarChart3 size={18} color="#3b82f6" />
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>Provider Budgets</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {summary?.providers.map(p => (
              <div key={p.provider} style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', textTransform: 'capitalize' }}>{p.provider}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: p.pct > 80 ? '#ef4444' : pctColor(p.pct) }}>
                      {p.budget > 0 ? `$${p.spent.toFixed(2)} / $${p.budget.toFixed(2)}` : `$${p.spent.toFixed(2)}`}
                    </span>
                    {p.budget > 0 ? (
                      <button onClick={() => { setEditingProvider(p.provider); setEditProviderBudget(p.budget); }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}>
                        <Target size={12} />
                      </button>
                    ) : (
                      <button onClick={() => { setEditingProvider(p.provider); setEditProviderBudget(10); }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>
                        +Set
                      </button>
                    )}
                  </div>
                </div>
                {p.budget > 0 && (
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, p.pct)}%`, height: '100%', background: p.pct > 80 ? '#ef4444' : p.pct > 50 ? '#f59e0b' : '#3b82f6', borderRadius: 2 }} />
                  </div>
                )}
                {editingProvider === p.provider && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>$</span>
                    <input type="number" value={editProviderBudget} onChange={e => setEditProviderBudget(parseFloat(e.target.value) || 0)} style={{ width: 80, padding: '0.25rem 0.4rem', borderRadius: 4, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.75rem' }} />
                    <button onClick={() => { pricingService.setProviderBudget(p.provider, editProviderBudget); setEditingProvider(null); refresh(); }} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: '#3b82f6', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem' }}>Save</button>
                    <button onClick={() => setEditingProvider(null)} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem' }}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
            {(!summary || summary.providers.length === 0) && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No provider spend data yet</div>
            )}
          </div>
        </div>

        {/* Agent Budgets */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Users size={18} color="#8b5cf6" />
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>Agent Budgets</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {summary?.agents.map(a => (
              <div key={a.agentId} style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>{agentNames[a.agentId] || a.agentId}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: a.pct > 80 ? '#ef4444' : pctColor(a.pct) }}>
                      ${a.spent.toFixed(2)} / ${a.budget.toFixed(2)}
                    </span>
                    <button onClick={() => { setEditingAgent(a.agentId); setEditAgentBudget(a.budget); }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}>
                      <Target size={12} />
                    </button>
                  </div>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, a.pct)}%`, height: '100%', background: a.pct > 80 ? '#ef4444' : a.pct > 50 ? '#f59e0b' : '#8b5cf6', borderRadius: 2 }} />
                </div>
                {editingAgent === a.agentId && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>$</span>
                    <input type="number" value={editAgentBudget} onChange={e => setEditAgentBudget(parseFloat(e.target.value) || 0)} style={{ width: 80, padding: '0.25rem 0.4rem', borderRadius: 4, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: '0.75rem' }} />
                    <button onClick={() => { budgetService.setAgentBudget(a.agentId, editAgentBudget); setEditingAgent(null); refresh(); }} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: '#8b5cf6', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.7rem' }}>Save</button>
                    <button onClick={() => setEditingAgent(null)} style={{ padding: '0.25rem 0.5rem', borderRadius: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.7rem' }}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
            {(!summary || summary.agents.length === 0) && (
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>
                No agent budgets configured. Set agent budgets to track per-agent spend.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetDashboard;
