import React, { useState, useCallback } from 'react';
import { GitBranch, ArrowRight, Search, Info, TrendingUp, Zap, Activity, DollarSign, Shield, Settings2, Plus, Trash2, Save, ChevronDown, ListFilter, Scale, FlaskConical, Play, Square, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useRoutingIntelligence } from '../../bridges/useRoutingIntelligence';
import type { FallbackLink } from '../../kernel/instances';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import type { ABTestConfig } from '../../kernel/types/routing-types';

import { flex1, flexBetween, flexCenterGap2, flexCenterGap4, flexCenterSmGap, flexColGap1, flexColGap2, flexColGap3, flexColGap4, flexColGap5, flexColGap6, glassPanel, grid4, iconBtnBlue, sectionHeader, textMutedSm, textMutedWeight700Xs, textSecondary, textWhiteWeight700Sm } from '../../styles/common';
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

function MetricBar({ label, control, experiment, higherIsBetter, format }: {
  label: string; control: number; experiment: number; higherIsBetter: boolean; format?: (v: number) => string;
}) {
  const f = format || ((v: number) => v.toFixed(2));
  const improvement = control > 0 ? ((experiment - control) / control) * 100 : 0;
  const win = higherIsBetter ? improvement > 0 : improvement < 0;
  return (
    <div style={flexColGap1}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
        <span>{label}</span>
        <span style={{ color: win ? '#10b981' : improvement === 0 ? '#94a3b8' : '#ef4444' }}>
          {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
        </span>
      </div>
      <div style={flexCenterGap2}>
        <div style={{ flex: 1, height: 24, borderRadius: 6, background: 'rgba(59,130,246,0.15)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '100%', width: `${Math.min(100, (control / Math.max(control, experiment)) * 100)}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: 6, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 700, width: 70, textAlign: 'right' }}>C: {f(control)}</span>
      </div>
      <div style={flexCenterGap2}>
        <div style={{ flex: 1, height: 24, borderRadius: 6, background: 'rgba(139,92,246,0.15)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '100%', width: `${Math.min(100, (experiment / Math.max(control, experiment)) * 100)}%`, background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)', borderRadius: 6, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: '0.72rem', color: '#8b5cf6', fontWeight: 700, width: 70, textAlign: 'right' }}>E: {f(experiment)}</span>
      </div>
    </div>
  );
}

function ABTestPanel({ abTest, profiles, actions }: {
  abTest: ABTestConfig | null; profiles: string[]; actions: { startABTest: (c: string, e: string, s: number) => Promise<boolean>; stopABTest: () => Promise<void> };
}) {
  const [control, setControl] = useState(profiles[0] || '');
  const [experiment, setExperiment] = useState(profiles[1] || profiles[0] || '');
  const [split, setSplit] = useState(30);

  if (abTest?.enabled) {
    const { control: cm, experiment: em } = abTest.metrics;
    return (
      <div style={flexColGap6}>
        <div style={flexBetween}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>A/B Test Running</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
              {abTest.controlProfile} vs {abTest.experimentProfile} &middot; {abTest.splitPercent}% experiment
            </div>
          </div>
          <button onClick={actions.stopABTest} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Square size={14} /> Stop Test
          </button>
        </div>

        <div style={grid4}>
          {[
            { label: 'Requests (C)', value: cm.requests.toString(), color: '#3b82f6' },
            { label: 'Requests (E)', value: em.requests.toString(), color: '#8b5cf6' },
            { label: 'Started', value: new Date(abTest.startedAt).toLocaleDateString(), color: '#64748b' },
            { label: 'Split', value: `${abTest.splitPercent}%`, color: '#f59e0b' },
          ].map(card => (
            <div key={card.label} style={{ padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={textMutedWeight700Xs}>{card.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: card.color, marginTop: '0.25rem' }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={flexColGap5}>
          <div style={textWhiteWeight700Sm}>Metrics Comparison</div>
          <MetricBar label="Avg Latency" control={cm.avgLatency} experiment={em.avgLatency} higherIsBetter={false} format={v => `${v.toFixed(0)}ms`} />
          <MetricBar label="Success Rate" control={cm.successRate} experiment={em.successRate} higherIsBetter={true} format={v => `${(v * 100).toFixed(1)}%`} />
          <MetricBar label="Avg Score" control={cm.avgScore} experiment={em.avgScore} higherIsBetter={true} />
        </div>
      </div>
    );
  }

  return (
    <div style={flexColGap6}>
      <div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>A/B Test</div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
          Compare two weight profiles to measure routing performance
        </div>
      </div>

      {profiles.length < 2 ? (
        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.15)', color: '#eab308', fontSize: '0.85rem' }}>
          Need at least 2 weight profiles to run an A/B test
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>Control Profile</label>
              <select value={control} onChange={e => setControl(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
                {profiles.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>Experiment Profile</label>
              <select value={experiment} onChange={e => setExperiment(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600 }}>
                {profiles.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>Experiment %</label>
              <div style={flexCenterGap2}>
                <input type="range" min={1} max={99} value={split} onChange={e => setSplit(Number(e.target.value))} style={flex1} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b', minWidth: 40, textAlign: 'right' }}>{split}%</span>
              </div>
            </div>
          </div>
          <button onClick={async () => {
            const ok = await actions.startABTest(control, experiment, split);
            if (!ok) alert('Failed to start A/B test');
          }} style={{ alignSelf: 'flex-start', padding: '0.6rem 1.25rem', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6366f1)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Play size={16} /> Start A/B Test
          </button>
        </>
      )}
    </div>
  );
}

const RoutingIntelligence: React.FC = () => {
  const [selected, setSelected] = useState<RouterDecision | null>(null);
  const [view, setView] = useState<'history' | 'decision-tree' | 'advanced' | 'ab-test'>('history');
  const { decisions, config, slaMode, abTest, actions } = useRoutingIntelligence();
  const { t } = useTranslation();

  const saveFallback = (strategy: string, chain: FallbackLink[]) => {
    actions.setFallbackChain(strategy, chain);
  };

  const saveDowngrade = (model: string, chain: string[]) => {
    actions.setDowngradeChain(model, chain);
  };

  const updateFallbackLink = (strategy: string, idx: number, patch: Partial<FallbackLink>) => {
    setConfig(current => {
      if (!current) return current;
      const chain = current.fallbackChains[strategy] || [];
      return {
        ...current,
        fallbackChains: {
          ...current.fallbackChains,
          [strategy]: chain.map((link, i) => i === idx ? { ...link, ...patch } : link),
        },
      };
    });
  };

  const addFallbackLink = (strategy: string) => {
    setConfig(current => {
      if (!current) return current;
      const chain = current.fallbackChains[strategy] || [];
      return {
        ...current,
        fallbackChains: {
          ...current.fallbackChains,
          [strategy]: [...chain, { provider: '', model: '' }],
        },
      };
    });
  };

  const removeFallbackLink = (strategy: string, idx: number) => {
    setConfig(current => {
      if (!current) return current;
      const chain = current.fallbackChains[strategy] || [];
      return {
        ...current,
        fallbackChains: {
          ...current.fallbackChains,
          [strategy]: chain.filter((_, i) => i !== idx),
        },
      };
    });
  };

  const moveFallbackLink = (strategy: string, idx: number, direction: -1 | 1) => {
    setConfig(current => {
      if (!current) return current;
      const chain = [...(current.fallbackChains[strategy] || [])];
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= chain.length) return current;
      [chain[idx], chain[nextIdx]] = [chain[nextIdx], chain[idx]];
      return {
        ...current,
        fallbackChains: {
          ...current.fallbackChains,
          [strategy]: chain,
        },
      };
    });
  };

  const updateDowngradeItem = (model: string, idx: number, value: string) => {
    setConfig(current => {
      if (!current) return current;
      const chain = current.modelDowngradeChains[model] || [];
      return {
        ...current,
        modelDowngradeChains: {
          ...current.modelDowngradeChains,
          [model]: chain.map((item, i) => i === idx ? value : item),
        },
      };
    });
  };

  const renameDowngradeChain = (model: string, nextModel: string) => {
    setConfig(current => {
      if (!current || nextModel === model || nextModel.length === 0) return current;
      if (current.modelDowngradeChains[nextModel]) return current;
      const entries = Object.entries(current.modelDowngradeChains).map(([key, value]) =>
        key === model ? [nextModel, value] : [key, value]
      );
      return {
        ...current,
        modelDowngradeChains: Object.fromEntries(entries) as Record<string, string[]>,
      };
    });
  };

  const addDowngradeItem = (model: string) => {
    setConfig(current => {
      if (!current) return current;
      const chain = current.modelDowngradeChains[model] || [];
      return {
        ...current,
        modelDowngradeChains: {
          ...current.modelDowngradeChains,
          [model]: [...chain, ''],
        },
      };
    });
  };

  const removeDowngradeItem = (model: string, idx: number) => {
    setConfig(current => {
      if (!current) return current;
      const chain = current.modelDowngradeChains[model] || [];
      return {
        ...current,
        modelDowngradeChains: {
          ...current.modelDowngradeChains,
          [model]: chain.filter((_, i) => i !== idx),
        },
      };
    });
  };

  const addDowngradeChain = () => {
    setConfig(current => {
      if (!current) return current;
      const base = 'new-model';
      let name = base;
      let idx = 1;
      while (current.modelDowngradeChains[name]) {
        idx += 1;
        name = `${base}-${idx}`;
      }
      return {
        ...current,
        modelDowngradeChains: {
          ...current.modelDowngradeChains,
          [name]: [''],
        },
      };
    });
  };

  const removeDowngradeChain = (model: string) => {
    setConfig(current => {
      if (!current) return current;
      const { [model]: _removed, ...rest } = current.modelDowngradeChains;
      return {
        ...current,
        modelDowngradeChains: rest,
      };
    });
  };

  const updateSlaMode = (mode: string) => {
    actions.setSlaMode(mode);
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
        <div style={flexCenterGap4}>
          <GitBranch size={28} style={{ color: '#8b5cf6' }} />
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>{t('routing.title')}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('routing.subtitle')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: 12 }}>
          <button 
            onClick={() => setView('history')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: view === 'history' ? 'rgba(139,92,246,0.2)' : 'transparent', color: view === 'history' ? '#f8fafc' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Activity size={16} /> {t('routing.tab.history')}
          </button>
          <button 
            onClick={() => setView('decision-tree')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: view === 'decision-tree' ? 'rgba(139,92,246,0.2)' : 'transparent', color: view === 'decision-tree' ? '#f8fafc' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <GitBranch size={16} /> {t('routing.tab.decision_tree')}
          </button>
          <button 
            onClick={() => setView('advanced')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: view === 'advanced' ? 'rgba(139,92,246,0.2)' : 'transparent', color: view === 'advanced' ? '#f8fafc' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Settings2 size={16} /> {t('routing.tab.advanced')}
          </button>
          <button 
            onClick={() => setView('ab-test')}
            style={{ padding: '0.5rem 1rem', borderRadius: 8, background: view === 'ab-test' ? 'rgba(139,92,246,0.2)' : 'transparent', color: view === 'ab-test' ? '#f8fafc' : '#64748b', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <FlaskConical size={16} /> A/B Test
          </button>
        </div>
      </div>

      {view === 'ab-test' ? (
        <ABTestPanel abTest={abTest} profiles={config?.weightProfiles ? Object.keys(config.weightProfiles) : []} actions={actions} />
      ) : view === 'decision-tree' ? (
        <div>
          <div style={textMutedSm}>
            Visual decision flow — how each request is routed through the scoring pipeline
          </div>
          {/* Latest decision tree */}
          {decisions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(() => {
                const d = decisions[0];
                const top = d.scores[0];
                const classification = d.promptLength > 2000 ? 'Long' : d.promptLength > 500 ? 'Medium' : 'Short';
                const treeNodes = [
                  {
                    label: 'Incoming Request',
                    sub: `${d.promptLength} chars`,
                    color: '#8b5cf6',
                    children: [
                      {
                        label: `Classified: ${classification}`,
                        sub: `Prompt length threshold`,
                        color: '#3b82f6',
                        children: [
                          {
                            label: `Strategy: ${STRATEGY_LABELS[d.strategy] || d.strategy}`,
                            sub: 'Selected based on classification & context',
                            color: '#f59e0b',
                            children: [
                              {
                                label: `Weights: TTFT ${(d.weights.ttft * 100).toFixed(0)}% / TPS ${(d.weights.tps * 100).toFixed(0)}% / Reliability ${(d.weights.reliability * 100).toFixed(0)}%`,
                                sub: 'Balanced for request type',
                                color: '#10b981',
                                children: d.scores.slice(0, 3).map(s => ({
                                  label: `${s.provider} — score: ${s.score.toFixed(3)}`,
                                  sub: `TTFT ${(s.breakdown.ttft * 100).toFixed(0)}% · TPS ${(s.breakdown.tps * 100).toFixed(0)}% · Reliability ${(s.breakdown.reliability * 100).toFixed(0)}% · Cost ${s.breakdown.cost.toFixed(4)}`,
                                  color: s.provider === d.selected ? '#10b981' : '#64748b',
                                  children: s.provider === d.selected ? [
                                    { label: `SELECTED — ${d.selected}`, sub: d.secondBest ? `Fallback: ${d.secondBest}` : 'Primary route', color: '#10b981', children: [] }
                                  ] : []
                                }))
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ];

                const renderTree = (nodes: any[], depth: number = 0): React.ReactNode => {
                  return nodes.map((node, i) => (
                    <React.Fragment key={`${depth}-${i}`}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', paddingLeft: depth > 0 ? 60 : 0 }}>
                        {depth > 0 && (
                          <div style={{ position: 'absolute', left: 20, top: 0, bottom: '50%', width: 24, borderLeft: '2px solid rgba(255,255,255,0.08)', borderBottom: '2px solid rgba(255,255,255,0.08)', borderBottomLeftRadius: 8 }} />
                        )}
                        <div style={{ flex: 1, marginLeft: depth > 0 ? 44 : 0 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 12, border: `1px solid ${node.color}30`, background: `linear-gradient(135deg, ${node.color}10 0%, rgba(0,0,0,0.2) 100%)`, marginBottom: '0.75rem', minWidth: 280 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: node.color, flexShrink: 0 }} />
                            <div>
                              <div style={textWhiteWeight700Sm}>{node.label}</div>
                              {node.sub && <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>{node.sub}</div>}
                            </div>
                          </div>
                          {node.children.length > 0 && (
                            <div style={{ borderLeft: `2px solid rgba(255,255,255,0.06)`, marginLeft: 16, paddingLeft: 0 }}>
                              {renderTree(node.children, depth + 1)}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  ));
                };

                return renderTree(treeNodes);
              })()}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
              {t('routing.history.empty')}
            </div>
          )}
          {/* Decision tree legend */}
          <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Legend</div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.7rem' }}>
              <span style={flexCenterSmGap}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} /> Input</span>
              <span style={flexCenterSmGap}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Classification</span>
              <span style={flexCenterSmGap}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Strategy</span>
              <span style={flexCenterSmGap}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Weights / Scoring</span>
            </div>
          </div>
        </div>
      ) : view === 'history' ? (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        <div>
          <div style={textMutedSm}>
            Last {decisions.length} routing decisions
          </div>
          <div style={flexColGap2}>
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
                    <ArrowRight size={12} style={textSecondary} />
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
                {t('routing.history.empty')}
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div>
            <div style={textMutedSm}>Decision Details</div>

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
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t('routing.detail.selected')}</div>
                    <div style={{ fontSize: '0.85rem', color: providerColor(selected.selected), fontWeight: 700 }}>{selected.selected}</div>
                  </div>
                </div>
                {selected.secondBest && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                    <Shield size={16} style={{ color: '#10b981' }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t('routing.detail.fallback')}</div>
                      <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>{selected.secondBest}</div>
                    </div>
                  </div>
                )}
                {selected.estimatedCost && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                    <DollarSign size={16} style={{ color: '#10b981' }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t('routing.detail.estimated_cost')}</div>
                      <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 600 }}>${selected.estimatedCost.toFixed(4)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700, marginBottom: '0.75rem' }}>Scores</div>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>{t('routing.detail.table.provider')}</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>{t('routing.detail.table.score')}</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>{t('routing.detail.table.ttft')}</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>{t('routing.detail.table.tps')}</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>{t('routing.detail.table.reliability')}</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>{t('routing.detail.table.cost')}</th>
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
        <div style={flexColGap5}>
          
          {/* SLA Mode Configuration */}
          <div className="glass-panel" style={glassPanel}>
            <h3 style={sectionHeader}>
              <Settings2 size={18} color="#f59e0b" /> Service Level Agreement (SLA) Mode
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[
                { id: 'BALANCED', label: 'Balanced', desc: 'Optimal mix of speed and cost' },
                { id: 'PERFORMANCE', label: 'Performance', desc: 'Prioritize low latency and quality' },
                { id: 'COST', label: 'Economy', desc: 'Strictly minimize token costs' }
              ].map(mode => (
                <div 
                  key={mode.id}
                  onClick={() => updateSlaMode(mode.id)}
                  style={{
                    padding: '1rem', borderRadius: 8, cursor: 'pointer',
                    background: slaMode === mode.id ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${slaMode === mode.id ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.05)'}`
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: slaMode === mode.id ? '#f59e0b' : '#f8fafc', marginBottom: '0.25rem' }}>{mode.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{mode.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Weight Profiles */}
          <div className="glass-panel" style={glassPanel}>
            <h3 style={sectionHeader}>
              <Scale size={18} color="#8b5cf6" /> Weight Profiles
            </h3>
            {config && (() => {
              const names = Object.keys(config.weightProfiles || {});
              const active = config.activeProfile || 'default';
              return (
                <div style={flexColGap3}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Active:</span>
                    {names.map(name => (
                      <button key={name} onClick={async () => { await actions.setActiveProfile(name); }} style={{ padding: '0.35rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: `1px solid ${name === active ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`, background: name === active ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.2)', color: name === active ? '#a855f7' : '#94a3b8' }}>
                        {name}{name === 'default' ? ' (system)' : ''}
                      </button>
                    ))}
                  </div>
                  {names.filter(n => n !== 'default').length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>Create a new profile to experiment with weight tuning. Clone the default profile and adjust parameters.</div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Weight Tuner */}
          <div className="glass-panel" style={glassPanel}>
            <h3 style={sectionHeader}>
              <SlidersHorizontal size={18} color="#3b82f6" /> Weight Tuner &mdash; {config?.activeProfile || 'default'}
            </h3>
            {(() => {
              const profile = config?.weightProfiles?.[config?.activeProfile || 'default'];
              if (!profile) return <div style={{ color: '#64748b', fontSize: '0.8rem' }}>No active profile</div>;
              const w = profile.defaultWeights;
              const [localWeights, setLocalWeights] = React.useState(w);
              const [saved, setSaved] = React.useState(true);

              React.useEffect(() => {
                setLocalWeights(w);
                setSaved(true);
              }, [w.ttft, w.tps, w.reliability]);

              const hasChanges = localWeights.ttft !== w.ttft || localWeights.tps !== w.tps || localWeights.reliability !== w.reliability;

              const updateWeight = (key: 'ttft' | 'tps' | 'reliability', value: number) => {
                setLocalWeights(prev => ({ ...prev, [key]: value }));
                setSaved(false);
              };

              return (
                <div style={flexColGap4}>
                  {(['ttft', 'tps', 'reliability'] as const).map(key => {
                    const labels = { ttft: 'TTFT &mdash; Time to First Token', tps: 'TPS &mdash; Tokens Per Second', reliability: 'Reliability &mdash; Success Rate' };
                    const colors = { ttft: '#3b82f6', tps: '#10b981', reliability: '#8b5cf6' };
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: colors[key], fontWeight: 600 }}>{labels[key]}</span>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0' }}>{localWeights[key].toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={localWeights[key]}
                          onChange={e => updateWeight(key, parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: colors[key] }}
                        />
                      </div>
                    );
                  })}
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>Weights are renormalized automatically</div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={async () => {
                        await actions.updateActiveProfileWeights(localWeights);
                        setSaved(true);
                      }}
                      disabled={!hasChanges}
                      style={{
                        padding: '0.5rem 1.25rem', borderRadius: 8, fontWeight: 700, fontSize: '0.75rem', cursor: hasChanges ? 'pointer' : 'default',
                        background: hasChanges ? 'rgba(59,130,246,0.15)' : 'rgba(0,0,0,0.2)',
                        border: `1px solid ${hasChanges ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.05)'}`,
                        color: hasChanges ? '#60a5fa' : '#64748b',
                      }}
                    >
                      <Save size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />{saved ? 'SAVED' : 'SAVE'}
                    </button>
                    {hasChanges && (
                      <button
                        onClick={() => { setLocalWeights(w); setSaved(true); }}
                        style={{ padding: '0.5rem 1rem', borderRadius: 8, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                      >
                        <RotateCcw size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />UNDO
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.25rem' }}>
            <div className="glass-panel" style={glassPanel}>
              <h3 style={sectionHeader}>
                <Shield size={18} color="#10b981" /> Fallback Chains
              </h3>
            <div style={flexColGap4}>
              {config && Object.entries(config.fallbackChains).map(([strategy, chain]) => (
                <div key={strategy} style={{ padding: '0.9rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', textTransform: 'capitalize' }}>{strategy} Strategy</div>
                    <button
                      onClick={() => saveFallback(strategy, chain)}
                      title="Save fallback chain"
                      style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                    >
                      <Save size={14} />
                    </button>
                  </div>
                  <div style={flexColGap2}>
                    {chain.map((link, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '24px minmax(90px, 1fr) minmax(90px, 1fr) 72px', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{idx + 1}.</span>
                        <input
                          value={link.provider}
                          onChange={event => updateFallbackLink(strategy, idx, { provider: event.target.value })}
                          placeholder="provider"
                          style={{ minWidth: 0, padding: '0.45rem 0.5rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)', color: providerColor(link.provider), fontSize: '0.75rem', fontWeight: 700 }}
                        />
                        <input
                          value={link.model || ''}
                          onChange={event => updateFallbackLink(strategy, idx, { model: event.target.value })}
                          placeholder="model"
                          style={{ minWidth: 0, padding: '0.45rem 0.5rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)', color: '#cbd5e1', fontSize: '0.75rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => moveFallbackLink(strategy, idx, -1)} title="Move up" style={{ width: 24, height: 24, borderRadius: 6, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', transform: 'rotate(180deg)' }}><ChevronDown size={14} /></button>
                          <button onClick={() => moveFallbackLink(strategy, idx, 1)} title="Move down" style={{ width: 24, height: 24, borderRadius: 6, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronDown size={14} /></button>
                          <button onClick={() => removeFallbackLink(strategy, idx)} title="Remove provider" style={{ width: 24, height: 24, borderRadius: 6, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addFallbackLink(strategy)} style={{ marginTop: '0.25rem', padding: '0.5rem', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px dashed rgba(16,185,129,0.3)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      <Plus size={14} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> ADD PROVIDER
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={glassPanel}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <TrendingUp size={18} color="#3b82f6" /> Model Downgrade Map
              </h3>
              <button onClick={addDowngradeChain} title="Add downgrade chain" style={iconBtnBlue}>
                <Plus size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {config && Object.entries(config.modelDowngradeChains).map(([model, chain]) => (
                <div key={model} style={{ padding: '0.9rem', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                      <input
                        value={model}
                        onChange={event => renameDowngradeChain(model, event.target.value.trim())}
                        placeholder="source model"
                        style={{ minWidth: 0, flex: 1, padding: '0.45rem 0.5rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)', color: '#f8fafc', fontSize: '0.75rem', fontWeight: 700 }}
                      />
                      <ArrowRight size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                      <button
                        onClick={() => saveDowngrade(model, chain)}
                        title="Save downgrade chain"
                        style={iconBtnBlue}
                      >
                        <Save size={14} />
                      </button>
                      <button onClick={() => removeDowngradeChain(model)} title="Remove chain" style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(239,68,68,0.22)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {chain.map((item, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr) 30px', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{i + 1}.</span>
                        <input
                          value={item}
                          onChange={event => updateDowngradeItem(model, i, event.target.value)}
                          placeholder="downgrade model"
                          style={{ minWidth: 0, padding: '0.45rem 0.5rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)', color: '#93c5fd', fontSize: '0.75rem', fontWeight: 600 }}
                        />
                        <button onClick={() => removeDowngradeItem(model, i)} title="Remove model" style={{ width: 28, height: 28, borderRadius: 6, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                    <button onClick={() => addDowngradeItem(model)} style={{ padding: '0.45rem', borderRadius: 8, background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px dashed rgba(59,130,246,0.25)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                      <Plus size={14} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} /> ADD MODEL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}
      <ModuleInfo moduleKey="routing" />
    </div>
  );
};

export default RoutingIntelligence;
