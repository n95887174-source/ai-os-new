import React, { useEffect, useState } from 'react';
import { GitBranch, ArrowRight, Search, Info, TrendingUp, Zap, Activity, DollarSign, Shield, Settings2, Plus, Trash2, Save, ChevronDown, ListFilter } from 'lucide-react';
import { routerService } from '../../services/RouterService';
import { keyService } from '../../services/KeyService';
import type { RouterDecision } from '../../services/RouterService';

const STRATEGY_LABELS: Record<string, string> = {
  broadcast: 'Broadcast all',
  performance: 'Performance',
  reliability: 'Reliability',
  latency: 'Low Latency',
  auto: 'Auto (UCB1)',
  race: 'Race',
  cost: 'Cost-saving',
  free_first: 'Free First',
};

const RoutingIntelligence: React.FC = () => {
  const [decisions, setDecisions] = useState<RouterDecision[]>([]);
  const [selected, setSelected] = useState<RouterDecision | null>(null);
  const [view, setView] = useState<'history' | 'advanced'>('history');
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    setDecisions(routerService.getDecisionHistory(50));
    setConfig(routerService.getRawConfig());
    const interval = setInterval(() => {
      setDecisions(routerService.getDecisionHistory(50));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const saveFallback = (strategy: string, chain: any) => {
    routerService.setFallbackChain(strategy, chain);
    setConfig(routerService.getRawConfig());
  };

  const saveDowngrade = (model: string, chain: string[]) => {
    routerService.setDowngradeChain(model, chain);
    setConfig(routerService.getRawConfig());
  };

  const providerColor = (provider: string): string => {
    const colors: Record<string, string> = {
      groq: '#10b981',
      gemini: '#8b5cf6',
      openrouter: '#3b82f6',
      nvidia: '#f59e0b',
    };
    return colors[provider.toLowerCase()] || '#94a3b8';
  };

  const getExplanation = (d: RouterDecision): string[] => {
    const lines: string[] = [];
    const top = d.scores[0];
    if (!top) return [];

    lines.push(`Strategy: ${STRATEGY_LABELS[d.strategy] || d.strategy}`);
    lines.push(`Classified: ${d.promptLength > 2000 ? 'long' : d.promptLength > 500 ? 'medium' : 'short'} request (${d.promptLength} chars)`);
    lines.push(`Weights: TTFT ${(d.weights.ttft * 100).toFixed(0)}% / TPS ${(d.weights.tps * 100).toFixed(0)}% / Reliability ${(d.weights.reliability * 100).toFixed(0)}%`);

    if (top.breakdown.ttft > 0.5) lines.push('TTFT weight high — favoring low-latency providers');
    if (top.breakdown.reliability > 0.5) lines.push('Reliability weight high — favoring stable providers');
    if (d.strategy === 'cost') lines.push('Cost strategy active — penalizing expensive models');
    if (d.estimatedCost) lines.push(`Estimated cost: $${d.estimatedCost.toFixed(4)}`);

    return lines;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <GitBranch size={28} style={{ color: '#8b5cf6' }} />
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>Routing Intelligence</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Real-time decision trace & advanced routing control</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: 12 }}>
          <button 
            onClick={() => setView('history')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: view === 'history' ? 'rgba(139,92,246,0.2)' : 'transparent', color: view === 'history' ? '#f8fafc' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Activity size={16} /> Decision Trace
          </button>
          <button 
            onClick={() => setView('advanced')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: view === 'advanced' ? 'rgba(139,92,246,0.2)' : 'transparent', color: view === 'advanced' ? '#f8fafc' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Settings2 size={16} /> Advanced Control
          </button>
        </div>
      </div>

      {view === 'history' ? (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
            Last {decisions.length} routing decisions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {decisions.map((d, i) => {
              const top = d.scores[0];
              return (
                <div
                  key={`${d.requestId}-${i}`}
                  onClick={() => setSelected(selected?.requestId === d.requestId ? null : d)}
                  style={{
                    padding: '1rem', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${selected?.requestId === d.requestId ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)'}`,
                    background: selected?.requestId === d.requestId ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </span>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: 'rgba(139,92,246,0.1)', color: '#a855f7', fontWeight: 600 }}>
                      {STRATEGY_LABELS[d.strategy] || d.strategy}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Request</span>
                    <ArrowRight size={12} style={{ color: '#64748b' }} />
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 4, background: `${providerColor(d.selected)}15`, color: providerColor(d.selected), fontWeight: 700 }}>
                      {d.selected}
                    </span>
                    {d.secondBest && (
                      <>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>(or {d.secondBest})</span>
                      </>
                    )}
                  </div>

                  {top && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.65rem', color: '#64748b' }}>
                      <span>Score: {top.score.toFixed(3)}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {decisions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No routing decisions yet — send a message in Chat to see routing in action.
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>Decision Details</div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={18} style={{ color: '#8b5cf6' }} /> Why this route
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                  <Zap size={16} style={{ color: '#f59e0b' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Strategy</div>
                    <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>{STRATEGY_LABELS[selected.strategy] || selected.strategy}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                  <TrendingUp size={16} style={{ color: '#3b82f6' }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Selected Provider</div>
                    <div style={{ fontSize: '0.85rem', color: providerColor(selected.selected), fontWeight: 700 }}>{selected.selected}</div>
                  </div>
                </div>
                {selected.secondBest && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                    <Shield size={16} style={{ color: '#10b981' }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fallback</div>
                      <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>{selected.secondBest}</div>
                    </div>
                  </div>
                )}
                {selected.estimatedCost && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                    <DollarSign size={16} style={{ color: '#10b981' }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Estimated Cost</div>
                      <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>${selected.estimatedCost.toFixed(4)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700, marginBottom: '0.75rem' }}>Scores</div>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Provider</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Score</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>TTFT</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>TPS</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Reliability</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.scores.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#e2e8f0' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 700, color: i === 0 ? providerColor(s.provider) : '#94a3b8' }}>{s.provider}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>{s.score.toFixed(3)}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(s.breakdown.ttft * 100).toFixed(0)}%</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(s.breakdown.tps * 100).toFixed(0)}%</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{(s.breakdown.reliability * 100).toFixed(0)}%</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{s.breakdown.cost.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 8, background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.1)' }}>
                <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 600, marginBottom: '0.5rem' }}>Explanation</div>
                <ul style={{ margin: 0, padding: '0 0 0 1rem', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.8 }}>
                  {getExplanation(selected).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Fallback Chains Editor */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shield size={18} color="#10b981" /> Fallback Chains
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {config && Object.entries(config.fallbackChains).map(([strategy, chain]: [string, any]) => (
                <div key={strategy} style={{ padding: '1rem', borderRadius: 16, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', textTransform: 'capitalize' }}>{strategy} Strategy</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {chain.map((link: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: 20 }}>{idx + 1}.</span>
                        <span style={{ fontSize: '0.8rem', color: providerColor(link.provider), fontWeight: 700 }}>{link.provider}</span>
                        {link.model && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({link.model})</span>}
                        <div style={{ flex: 1 }} />
                        <button style={{ color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }}><ChevronDown size={14} /></button>
                        <button style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button style={{ marginTop: '0.5rem', padding: '0.5rem', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px dashed rgba(16,185,129,0.3)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      <Plus size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> ADD PROVIDER
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Downgrade Editor */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingUp size={18} color="#3b82f6" /> Model Downgrade Map
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {config && Object.entries(config.modelDowngradeChains).map(([model, chain]: [string, any]) => (
                <div key={model} style={{ padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>{model}</span>
                    <ArrowRight size={14} style={{ color: '#64748b' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {chain.map((m: string, i: number) => (
                      <span key={i} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 600 }}>
                        {m}
                      </span>
                    ))}
                    <button style={{ padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.7rem', cursor: 'pointer' }}>+ ADD</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutingIntelligence;
