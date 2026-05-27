import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { GitBranch, ArrowRight, Activity, TrendingUp, Search, BarChart3, Info, Layers, Server, Wifi, Scale, Minus, Plus, XCircle, AlertTriangle } from 'lucide-react';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { eventBus } from '../../core/events';
import type { DecisionPayload, ScoringComponents, SkippedEntry } from '../../kernel/events';

import { cardHeaderRow, feedItemDefault, flexCenterGap2, flexCenterGap3, flexCenterSmGap, flexColGap1, flexColGap4, inputDarkBg, liveFeedPanel, panelRounded16, providerBadge, scoreHeader, scoreRowDefault, searchInputCompact, skippedRow, tagSmall, textMutedWeight700XsMargin, textSecondary, winnerRow } from '../../styles/common';
import { useTranslation } from '../../i18n/useTranslation';
const STRATEGY_LABELS: Record<string, string> = {
  broadcast: 'router_trace.strategy.broadcast',
  performance: 'router_trace.strategy.performance',
  reliability: 'router_trace.strategy.reliability',
  latency: 'router_trace.strategy.latency',
  auto: 'router_trace.strategy.auto',
  race: 'router_trace.strategy.race',
  cost: 'router_trace.strategy.cost',
  free_first: 'router_trace.strategy.free_first',
};

const providerColor = (provider: string): string => {
  const colors: Record<string, string> = { groq: '#10b981', gemini: '#8b5cf6', openrouter: '#3b82f6', nvidia: '#f59e0b', openai: '#10b981' };
  return colors[provider.toLowerCase()] || '#94a3b8';
};

const ScoreBar: React.FC<{ label: string; value: number; max?: number; color?: string; invert?: boolean }> = ({ label, value, max = 1, color = '#3b82f6', invert }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const isNegative = invert ? value > 0 : value < 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem' }}>
      <span style={{ width: 90, color: '#94a3b8', flexShrink: 0, textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, height: 14, borderRadius: 7, background: 'rgba(0,0,0,0.25)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 7, background: isNegative ? '#ef4444' : color, opacity: 0.7, transition: 'width 0.3s' }} />
      </div>
      <span style={{ width: 56, fontFamily: 'monospace', fontWeight: 600, color: isNegative ? '#ef4444' : value > 0.5 ? '#10b981' : '#e2e8f0', textAlign: 'right' }}>{value.toFixed(3)}</span>
    </div>
  );
};

const ClassificationBadge: React.FC<{ cls: DecisionPayload['classification'] }> = ({ cls }) => {
  if (!cls) return null;
  const tags: { label: string; color: string; icon: React.ReactNode }[] = [];
  tags.push({ label: cls.complexity, color: cls.complexity === 'complex' ? '#f59e0b' : cls.complexity === 'medium' ? '#3b82f6' : '#10b981', icon: <BarChart3 size={12} /> });
  if (cls.isCode) tags.push({ label: 'code', color: '#8b5cf6', icon: <Layers size={12} /> });
  if (cls.isLong) tags.push({ label: 'long', color: '#06b6d4', icon: <Server size={12} /> });
  if (cls.isMultimodal) tags.push({ label: 'multimodal', color: '#ec4899', icon: <Wifi size={12} /> });
  return (
    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      {tags.map(t => (
        <span key={t.label} style={{ ...providerBadge, background: `${t.color}15`, color: t.color }}>
          {t.icon}{t.label}
        </span>
      ))}
    </div>
  );
};

const ComponentRow: React.FC<{ label: string; value: number; type: 'bonus' | 'penalty' | 'neutral' }> = ({ label, value, type }) => {
  if (value === 0) return null;
  const color = type === 'bonus' ? '#10b981' : type === 'penalty' ? '#ef4444' : '#94a3b8';
  const icon = type === 'bonus' ? <Plus size={12} /> : type === 'penalty' ? <Minus size={12} /> : <Minus size={12} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', color }}>
      {icon}<span style={textSecondary}>{label}</span>
      <span style={{ fontWeight: 600, marginLeft: 'auto', fontFamily: 'monospace' }}>{type === 'bonus' ? '+' : ''}{value.toFixed(4)}</span>
    </div>
  );
};

const RouterTraceView: React.FC = () => {
  const { t } = useTranslation();
  const [decisions, setDecisions] = useState<DecisionPayload[]>([]);
  const [selected, setSelected] = useState<DecisionPayload | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = eventBus.onSafe<DecisionPayload>('system:decision', (d) => {
      setDecisions(prev => [d, ...prev].slice(0, 100));
    });
    return unsub;
  }, []);

  const filteredDecisions = useMemo(() => {
    if (!searchQuery.trim()) return decisions;
    const q = searchQuery.toLowerCase();
    return decisions.filter(d =>
      d.selected?.toLowerCase().includes(q) ||
      d.strategy?.toLowerCase().includes(q) ||
      d.requestId?.toLowerCase().includes(q)
    );
  }, [decisions, searchQuery]);

  const handleSelect = useCallback((d: DecisionPayload) => {
    setSelected(prev => prev?.requestId === d.requestId ? null : d);
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={flexCenterGap3}>
            <GitBranch size={24} style={{ color: '#8b5cf6' }} />
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>{t('router_trace.title')}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('router_trace.subtitle')}</div>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', width: 220 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('router_trace.search_placeholder')} aria-label={t('router_trace.search_aria')} style={searchInputCompact} />
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '380px 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Live feed */}
        <div className="glass-panel" style={liveFeedPanel}>
          <div style={cardHeaderRow}>
            <Activity size={16} style={{ color: '#a855f7' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>{t('router_trace.live_decisions')}</span>
            <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: 'auto' }}>{filteredDecisions.length}</span>
          </div>
          {filteredDecisions.length > 0 ? (
            <div style={flexColGap1}>
              {filteredDecisions.map((d, i) => {
                const isSelected = selected?.requestId === d.requestId;
                const topScore = d.scores[0];
                return (
                  <div key={`${d.requestId}-${i}`} onClick={() => handleSelect(d)} style={{ ...feedItemDefault, background: isSelected ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.12)', border: `1px solid ${isSelected ? 'rgba(139,92,246,0.3)' : 'transparent'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace' }}>{new Date(d.timestamp).toLocaleTimeString()}</span>
                      <span style={{ ...tagSmall, background: 'rgba(139,92,246,0.1)', color: '#a855f7' }}>{d.strategy}</span>
                      {d.profile && d.profile !== 'default' && (
                        <span style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem', borderRadius: 3, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 }}>{d.profile}</span>
                      )}
                      {d.isExperiment && (
                        <span style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem', borderRadius: 3, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700 }}>A/B</span>
                      )}
                    </div>
                    <div style={flexCenterSmGap}>
                      {topScore && <ProviderIcon provider={d.selected} size={14} />}
                      <span style={{ fontSize: '0.75rem', color: providerColor(d.selected), fontWeight: 700 }}>{d.selected}</span>
                      {topScore && <span style={{ fontSize: '0.6rem', color: '#64748b', marginLeft: 'auto' }}>score {topScore.s}</span>}
                    </div>
                    {d.classification && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <ClassificationBadge cls={d.classification} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem' }}>{t('router_trace.empty')}</div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={flexColGap4}>
            {/* Summary */}
            <div className="glass-panel" style={panelRounded16}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Info size={16} style={{ color: '#8b5cf6' }} /> {t('router_trace.decision_trace')}
                    <span style={{ fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 400 }}>{selected.requestId}</span>
                    {selected.profile && selected.profile !== 'default' && (
                      <span style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700 }}>Profile: {selected.profile}</span>
                    )}
                    {selected.isExperiment && (
                      <span style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', borderRadius: 4, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700 }}>A/B Experiment</span>
                    )}
                  </div>
                </div>
                {selected.classification && <ClassificationBadge cls={selected.classification} />}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div style={inputDarkBg}>
                  <div style={textMutedWeight700XsMargin}>{t('router_trace.strategy_label')}</div>
                  <div style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700 }}>{t(STRATEGY_LABELS[selected.strategy] || selected.strategy)}</div>
                </div>
                <div style={inputDarkBg}>
                  <div style={textMutedWeight700XsMargin}>{t('router_trace.selected_label')}</div>
                  <div style={flexCenterSmGap}>
                    <ProviderIcon provider={selected.selected} size={16} />
                    <span style={{ fontSize: '0.85rem', color: providerColor(selected.selected), fontWeight: 700 }}>{selected.selected}</span>
                  </div>
                </div>
                {selected.secondBest && (
                  <div style={inputDarkBg}>
                    <div style={textMutedWeight700XsMargin}>{t('router_trace.runner_up')}</div>
                    <div style={flexCenterSmGap}>
                      <ProviderIcon provider={selected.secondBest} size={16} />
                      <span style={{ fontSize: '0.85rem', color: providerColor(selected.secondBest), fontWeight: 700 }}>{selected.secondBest}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Effective Weights */}
            <div className="glass-panel" style={panelRounded16}>
              <div style={{ ...scoreHeader, marginBottom: '0.75rem' }}>
                <Scale size={16} style={{ color: '#f59e0b' }} /> {t('router_trace.effective_weights')}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', height: 24, borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                {(() => {
                  const w = selected.weights as { ttft: number; tps: number; reliability: number } | undefined;
                  if (!w) return null;
                  const total = w.ttft + w.tps + w.reliability;
                  const ttftPct = (w.ttft / total) * 100;
                  const tpsPct = (w.tps / total) * 100;
                  const relPct = (w.reliability / total) * 100;
                  return (
                    <>
                      <div style={{ width: `${ttftPct}%`, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'white' }}>
                        {ttftPct > 10 ? `TTFT ${(w.ttft * 100).toFixed(0)}%` : null}
                      </div>
                      <div style={{ width: `${tpsPct}%`, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'white' }}>
                        {tpsPct > 10 ? `TPS ${(w.tps * 100).toFixed(0)}%` : null}
                      </div>
                      <div style={{ width: `${relPct}%`, background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'white' }}>
                        {relPct > 10 ? `Rel ${(w.reliability * 100).toFixed(0)}%` : null}
                      </div>
                    </>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.65rem', color: '#64748b' }}>
                <span><span style={{ color: '#60a5fa' }}>■</span> {t('router_trace.legend_ttft')}</span>
                <span><span style={{ color: '#34d399' }}>■</span> {t('router_trace.legend_tps')}</span>
                <span><span style={{ color: '#a78bfa' }}>■</span> {t('router_trace.legend_reliability')}</span>
              </div>
            </div>

            {/* Skipped Providers */}
            {selected.skipped && selected.skipped.length > 0 && (
              <div className="glass-panel" style={panelRounded16}>
                <div style={{ ...scoreHeader, marginBottom: '0.75rem' }}>
                  <XCircle size={16} style={{ color: '#ef4444' }} /> {t('router_trace.skipped_providers', { count: selected.skipped.length })}
                </div>
                <div style={flexColGap1}>
                  {selected.skipped.map((s, i) => {
                    const stageColor: Record<string, string> = {
                      status: '#f59e0b', policy: '#ef4444', quota: '#8b5cf6',
                      score: '#3b82f6', budget: '#ec4899', unavailable: '#64748b',
                      circuit: '#dc2626', ratelimit: '#f97316', backoff: '#94a3b8',
                    };
                    return (
                      <div key={`skipped-${i}`} style={skippedRow}>
                        <ProviderIcon provider={s.provider} size={14} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', width: 100 }}>{s.provider}</span>
                        <span style={{ ...tagSmall, background: `${(stageColor[s.stage] || '#64748b')}20`, color: stageColor[s.stage] || '#64748b' }}>{s.stage}</span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', flex: 1 }}>{s.reason}</span>
                        {s.keyLabel && <span style={{ fontSize: '0.6rem', color: '#64748b' }}>({s.keyLabel})</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Provider Score Comparison */}
            <div className="glass-panel" style={panelRounded16}>
              <div style={scoreHeader}>
                <TrendingUp size={16} style={{ color: '#3b82f6' }} /> {t('router_trace.score_breakdown')}
              </div>
              <div style={flexColGap4}>
                {selected.scores.map((s, i) => {
                  const isWinner = i === 0;
                  const scoreVal = parseFloat(s.s);
                  const components = s.c;
                  return (
                    <div key={s.p} style={isWinner ? winnerRow : scoreRowDefault}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={flexCenterGap2}>
                          <ProviderIcon provider={s.p} size={20} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isWinner ? providerColor(s.p) : '#94a3b8' }}>{s.p}</span>
                          {isWinner && <span style={{ ...tagSmall, background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>{t('router_trace.selected_badge')}</span>}
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', color: isWinner ? '#10b981' : '#64748b' }}>{scoreVal.toFixed(3)}</span>
                      </div>

                      {/* Score components */}
                      {components && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 1.5rem' }}>
                          <div>
                            <ScoreBar label={t('router_trace.score_raw')} value={components.raw} color="#3b82f6" />
                            <ScoreBar label={t('router_trace.score_stability')} value={components.stabilityBonus} max={0.2} color="#06b6d4" />
                            <ScoreBar label={t('router_trace.score_reputation')} value={components.reputationBonus} max={0.2} color="#8b5cf6" />
                            <ScoreBar label={t('router_trace.score_exploration')} value={components.explorationBonus} max={0.5} color="#f59e0b" />
                            <ScoreBar label={t('router_trace.score_key_reputation')} value={components.keyReputationBonus} max={0.3} color="#a855f7" />
                            <ScoreBar label={t('router_trace.score_affinity')} value={components.affinityBonus} max={0.3} color="#ec4899" />
                            <ScoreBar label={t('router_trace.score_priority')} value={components.priorityBonus} max={0.3} color="#f97316" />
                          </div>
                          <div>
                            <ScoreBar label={t('router_trace.score_cost_penalty')} value={components.costPenalty} max={0.5} color="#ef4444" invert />
                            <ScoreBar label={t('router_trace.score_latency_penalty')} value={components.latencyPenalty} max={0.5} color="#ef4444" invert />
                            <ScoreBar label={t('router_trace.score_budget_penalty')} value={components.budgetPenalty} max={0.5} color="#ef4444" invert />
                          </div>
                        </div>
                      )}

                      {/* Bonus/Penalty summary */}
                      {components && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <ComponentRow label={t('router_trace.score_stability')} value={components.stabilityBonus} type="bonus" />
                          <ComponentRow label={t('router_trace.score_reputation')} value={components.reputationBonus} type="bonus" />
                          <ComponentRow label={t('router_trace.score_exploration')} value={components.explorationBonus} type="bonus" />
                          <ComponentRow label={t('router_trace.score_key_reputation')} value={components.keyReputationBonus} type="bonus" />
                          <ComponentRow label={t('router_trace.score_affinity')} value={components.affinityBonus} type="bonus" />
                          <ComponentRow label={t('router_trace.score_priority')} value={components.priorityBonus} type="bonus" />
                          <ComponentRow label={t('router_trace.score_cost_penalty')} value={components.costPenalty} type="penalty" />
                          <ComponentRow label={t('router_trace.score_latency_penalty')} value={components.latencyPenalty} type="penalty" />
                          <ComponentRow label={t('router_trace.score_budget_penalty')} value={components.budgetPenalty} type="penalty" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Winner vs Runner-up Comparison */}
            {selected.scores.length >= 2 && selected.scores[0].c && selected.scores[1].c && (
              <div className="glass-panel" style={panelRounded16}>
                <div style={scoreHeader}>
                  <GitBranch size={16} style={{ color: '#10b981' }} /> {t('router_trace.winner_vs_runner')}
                </div>
                {(() => {
                  const w = selected.scores[0];
                  const r = selected.scores[1];
                  const wScore = parseFloat(w.s);
                  const rScore = parseFloat(r.s);
                  if (!w.c || !r.c) return null;
                  const diff = wScore - rScore;
                  const wTotalBonuses = w.c.stabilityBonus + w.c.reputationBonus + w.c.explorationBonus + w.c.keyReputationBonus + w.c.affinityBonus + w.c.priorityBonus;
                  const wTotalPenalties = w.c.costPenalty + w.c.latencyPenalty + w.c.budgetPenalty;
                  const rTotalBonuses = r.c.stabilityBonus + r.c.reputationBonus + r.c.explorationBonus + r.c.keyReputationBonus + r.c.affinityBonus + r.c.priorityBonus;
                  const rTotalPenalties = r.c.costPenalty + r.c.latencyPenalty + r.c.budgetPenalty;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, marginBottom: '0.25rem' }}>{w.p}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>+{diff.toFixed(3)}</div>
                        <div style={{ fontSize: '0.6rem', color: '#64748b' }}>{t('router_trace.vs_raw', { raw: w.c.raw.toFixed(3), bonuses: wTotalBonuses.toFixed(3), penalties: wTotalPenalties.toFixed(3) })}</div>
                      </div>
                      <div style={{ textAlign: 'center', color: '#64748b' }}>
                        <ArrowRight size={20} />
                      </div>
                      <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.25rem' }}>{r.p}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#94a3b8' }}>{rScore.toFixed(3)}</div>
                        <div style={{ fontSize: '0.6rem', color: '#64748b' }}>{t('router_trace.vs_raw', { raw: r.c.raw.toFixed(3), bonuses: rTotalBonuses.toFixed(3), penalties: rTotalPenalties.toFixed(3) })}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouterTraceView;