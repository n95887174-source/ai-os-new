import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, PieChart, Activity, RefreshCcw, Database, ShieldAlert } from 'lucide-react';
import { pricingService } from '../../kernel/instances';
import PanelLoader from '../PanelLoader';
import { glassPanel, glassPanelPad15r, textXsMuted, flexBetween, progressBarSmall } from '../../styles/common';

interface DailyCost { date: string; cost: number; count: number }
interface Anomaly { date: string; cost: number; expected: number; deviation: number; severity: 'low' | 'medium' | 'high' }

const CostAnalyticsPanel: React.FC = () => {
  const [dailyCosts, setDailyCosts] = useState<DailyCost[]>([]);
  const [trend, setTrend] = useState<{ direction: string; dailyAvg: number; projectedMonthly: number; forecast: number } | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [byProvider, setByProvider] = useState<Record<string, number>>({});
  const [byModel, setByModel] = useState<Record<string, number>>({});
  const [byAgent, setByAgent] = useState<Record<string, number>>({});
  const [budget, setBudget] = useState<{ spentThisMonth: number; monthlyBudget: number; projectedMonthly: number } | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [days]);

  const refresh = () => {
    setDailyCosts(pricingService.getDailyCosts(days));
    setTrend(pricingService.getCostTrend());
    setAnomalies(pricingService.detectAnomalies());
    setByProvider(pricingService.getCostByProvider());
    setByModel(pricingService.getCostByModel());
    setByAgent(pricingService.getCostByAgent());
    const bi = pricingService.getBudgetInfo();
    setBudget({ spentThisMonth: bi.spentThisMonth, monthlyBudget: bi.monthlyBudget, projectedMonthly: bi.projectedMonthly });
  };

  const totalCost = Object.values(byProvider).reduce((s, v) => s + v, 0);

  const renderSparkline = (data: DailyCost[]) => {
    if (data.length < 2) return null;
    const max = Math.max(...data.map(d => d.cost), 0.01);
    const h = 40; const w = 200;
    const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.cost / max) * h}`).join(' ');
    return (
      <svg width={w} height={h} style={{ display: 'block' }}>
        <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="1.5" />
        <circle cx={w} cy={h - (data[data.length - 1].cost / max) * h} r="2.5" fill="#10b981" />
      </svg>
    );
  };

  return (
    <PanelLoader title="Cost Analytics">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, height: '100%', overflow: 'auto' }}>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="glass-panel" style={{ ...glassPanel, flex: 1, padding: '12px 16px' }}>
            <div style={flexBetween}>
              <span style={textXsMuted}>Total Cost (all time)</span>
              <DollarSign size={16} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#e4e4e7' }}>${totalCost.toFixed(2)}</div>
          </div>
          <div className="glass-panel" style={{ ...glassPanel, flex: 1, padding: '12px 16px' }}>
            <div style={flexBetween}>
              <span style={textXsMuted}>This Month</span>
              <BarChart3 size={16} style={{ color: '#3b82f6' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#e4e4e7' }}>${(budget?.spentThisMonth || 0).toFixed(2)}</div>
            {budget && budget.monthlyBudget > 0 && (
              <div style={{ ...progressBarSmall, marginTop: 4, width: '100%', maxWidth: 200 }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(100, (budget.spentThisMonth / budget.monthlyBudget) * 100)}%`, background: budget.spentThisMonth / budget.monthlyBudget > 0.8 ? '#ef4444' : '#10b981' }} />
              </div>
            )}
          </div>
          <div className="glass-panel" style={{ ...glassPanel, flex: 1, padding: '12px 16px' }}>
            <div style={flexBetween}>
              <span style={textXsMuted}>Projected</span>
              <TrendingUp size={16} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#e4e4e7' }}>${(budget?.projectedMonthly || 0).toFixed(2)}</div>
            {trend && <span style={textXsMuted}>{trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.direction}</span>}
          </div>
          <div className="glass-panel" style={{ ...glassPanel, flex: 1, padding: '12px 16px' }}>
            <div style={flexBetween}>
              <span style={textXsMuted}>Daily Avg</span>
              <Activity size={16} style={{ color: '#8b5cf6' }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#e4e4e7' }}>${(trend?.dailyAvg || 0).toFixed(2)}</div>
            {trend && <span style={textXsMuted}>Forecast: ${trend.forecast.toFixed(2)}</span>}
          </div>
        </div>

        <div className="glass-panel" style={{ ...glassPanelPad15r, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={flexBetween}>
            <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>Daily Cost Trend</span>
            <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ background: '#1a1a2e', color: '#a1a1aa', border: '1px solid #2d2d44', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
            </select>
          </div>
          {dailyCosts.length === 0 ? (
            <div style={{ ...textXsMuted, textAlign: 'center', padding: 24 }}>No cost data yet</div>
          ) : (
            <>
              {renderSparkline(dailyCosts)}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
                {dailyCosts.slice(-14).map(d => (
                  <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a1a1aa', padding: '2px 4px', background: '#1a1a2e', borderRadius: 4 }}>
                    <span>{d.date.slice(5)}</span>
                    <span style={{ color: d.cost > 0.1 ? '#f59e0b' : '#71717a' }}>${d.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="glass-panel" style={{ ...glassPanelPad15r, flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>By Provider</div>
            {Object.entries(byProvider).length === 0 ? (
              <div style={textXsMuted}>No data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(byProvider).sort((a, b) => b[1] - a[1]).map(([p, c]) => (
                  <div key={p}>
                    <div style={flexBetween}>
                      <span style={{ fontSize: 12, color: '#e4e4e7' }}>{p}</span>
                      <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 600 }}>${c.toFixed(2)}</span>
                    </div>
                    <div style={{ ...progressBarSmall, marginTop: 2 }}>
                      <div style={{ ...progressBarSmall, width: `${(c / totalCost) * 100}%`, background: '#3b82f6' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ ...glassPanelPad15r, flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>By Model</div>
            {Object.entries(byModel).length === 0 ? (
              <div style={textXsMuted}>No data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
                {Object.entries(byModel).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([m, c]) => (
                  <div key={m} style={flexBetween}>
                    <span style={{ fontSize: 11, color: '#e4e4e7' }}>{m.split('/').pop()}</span>
                    <span style={{ fontSize: 11, color: '#a1a1aa' }}>${c.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ ...glassPanelPad15r, flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>By Agent</div>
            {Object.entries(byAgent).length === 0 ? (
              <div style={textXsMuted}>No agent cost data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
                {Object.entries(byAgent).sort((a, b) => b[1] - a[1]).map(([a, c]) => (
                  <div key={a} style={flexBetween}>
                    <span style={{ fontSize: 11, color: '#e4e4e7' }}>{a}</span>
                    <span style={{ fontSize: 11, color: '#a1a1aa' }}>${c.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {anomalies.length > 0 && (
          <div className="glass-panel" style={{ ...glassPanelPad15r }}>
            <div style={{ ...flexBetween, marginBottom: 8 }}>
              <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>Anomaly Detection</span>
              <ShieldAlert size={16} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {anomalies.slice(0, 10).map(a => (
                <div key={a.date} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#e4e4e7' }}>
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: a.severity === 'high' ? '#ef444420' : a.severity === 'medium' ? '#f59e0b20' : '#10b98120', color: a.severity === 'high' ? '#ef4444' : a.severity === 'medium' ? '#f59e0b' : '#10b981' }}>
                    {a.severity}
                  </span>
                  <span>{a.date}</span>
                  <span style={{ color: '#a1a1aa' }}>${a.cost} vs expected ${a.expected}</span>
                  <span style={{ color: '#f59e0b', fontSize: 11 }}>{(a.deviation).toFixed(1)}σ</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </PanelLoader>
  );
};

export default CostAnalyticsPanel;
