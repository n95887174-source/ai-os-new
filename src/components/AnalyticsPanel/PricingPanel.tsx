import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  RefreshCcw, 
  Settings, 
  PieChart, 
  AlertCircle,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  BarChart3,
  LayoutDashboard,
  CloudLightning,
  Info
} from 'lucide-react';
import { pricingService, type ModelPricing, type BudgetInfo } from '../../services/PricingService';
import { motion, AnimatePresence } from 'framer-motion';

const PricingPanel: React.FC = () => {
  const [prices, setPrices] = useState<Record<string, ModelPricing>>({});
  const [overrides, setOverrides] = useState<Record<string, ModelPricing>>({});
  const [budget, setBudget] = useState<BudgetInfo | null>(null);
  const [lastSync, setLastSync] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<ModelPricing>({ input: 0, output: 0 });

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = () => {
    setPrices(pricingService.getAllPrices());
    setOverrides(pricingService.getUserOverrides());
    setBudget(pricingService.getBudgetInfo());
    setLastSync(pricingService.getLastSync());
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await pricingService.syncFromOpenRouter();
    refreshData();
    setIsSyncing(false);
  };

  const saveOverride = () => {
    if (editingModel) {
      pricingService.setOverride(editingModel, editPrice);
      setEditingModel(null);
      refreshData();
    }
  };

  const removeOverride = (model: string) => {
    pricingService.removeOverride(model);
    refreshData();
  };

  const startEdit = (model: string, current: ModelPricing) => {
    setEditingModel(model);
    setEditPrice({ ...current });
  };

  return (
    <div className="pricing-panel-container" style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <DollarSign size={28} color="#10b981" /> ECONOMIC PLANE
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Manage model costs, budgets, and pricing synchronization</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', 
              borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: '#f8fafc', 
              border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '0.9rem' 
            }}
          >
            <RefreshCcw size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync OpenRouter'}
          </button>
        </div>
      </header>

      {/* Budget Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
          <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Spent This Month</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>${budget?.spentThisMonth.toFixed(2)}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>Daily Avg: ${budget?.dailyAverage.toFixed(2)}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
          <div style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Remaining Budget</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>${budget?.remainingBudget === Infinity ? '∞' : budget?.remainingBudget.toFixed(2)}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>of ${budget?.monthlyBudget.toFixed(2)} goal</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
          <div style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Projected Month-End</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>${budget?.projectedMonthly.toFixed(2)}</div>
          <div style={{ fontSize: '0.8rem', color: budget?.projectedMonthly! > budget?.monthlyBudget! ? '#ef4444' : '#10b981', marginTop: '0.5rem' }}>
            {budget?.projectedMonthly! > budget?.monthlyBudget! ? 'Exceeds budget' : 'Within budget'}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Last Sync</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>{lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>TTL: 60 min</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
        {/* Pricing Table */}
        <section className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} color="#3b82f6" /> Model Pricing Catalog
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}>
                  <th style={{ textAlign: 'left', padding: '1rem' }}>Model ID</th>
                  <th style={{ textAlign: 'right', padding: '1rem' }}>Input ($/1M)</th>
                  <th style={{ textAlign: 'right', padding: '1rem' }}>Output ($/1M)</th>
                  <th style={{ textAlign: 'center', padding: '1rem' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(prices).slice(0, 15).map(([id, p]) => (
                  <tr key={id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#e2e8f0' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{id}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>${p.input.toFixed(2)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>${p.output.toFixed(2)}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {overrides[id] ? (
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700 }}>OVERRIDDEN</span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>SYNCED</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button onClick={() => startEdit(id, overrides[id] || p)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', marginRight: '0.5rem' }}>Edit</button>
                      {overrides[id] && (
                        <button onClick={() => removeOverride(id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Reset</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sidebar Controls */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={16} /> Budget Configuration
            </h4>
            <div style={{ marginBottom: '1.2rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Monthly Global Budget ($)</label>
              <input 
                type="number" 
                value={budget?.monthlyBudget || 0}
                onChange={(e) => pricingService.setMonthlyBudget(parseFloat(e.target.value))}
                style={{ width: '100%', padding: '0.6rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(59,130,246,0.05)', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(59,130,246,0.1)' }}>
              <Info size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
              Budgets are enforced at the Router level. System will prioritize free models when approaching limit.
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20, background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.1)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>Active Overrides</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.keys(overrides).length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>No manual price overrides active.</div>
              ) : (
                Object.entries(overrides).map(([id, p]) => (
                  <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 10 }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>{id}</div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981' }}>In: ${p.input} | Out: ${p.output}</div>
                    </div>
                    <button onClick={() => removeOverride(id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {editingModel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel"
              style={{ width: 400, padding: '2rem', borderRadius: 24, background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>Edit Pricing: {editingModel}</h3>
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Input Cost ($ per 1M tokens)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={editPrice.input}
                  onChange={(e) => setEditPrice({ ...editPrice, input: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.5rem' }}>Output Cost ($ per 1M tokens)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={editPrice.output}
                  onChange={(e) => setEditPrice({ ...editPrice, output: parseFloat(e.target.value) })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => setEditingModel(null)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={saveOverride}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 12, background: '#10b981', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Save size={18} /> Save Override
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PricingPanel;
