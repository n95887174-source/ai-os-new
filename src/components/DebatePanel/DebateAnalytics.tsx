import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, GitBranch, Shield, TrendingUp, Target, MessageSquare,
  Clock, Users, Bot, Zap,
} from 'lucide-react';
import type { DebateSession } from '../../kernel/instances';
import {
  glassPanelRounded24, flexColGap6, grid2, flexColGap3MarginTop3,
  grid2TinyGap, progressBgSmall, borderTopSection, metricBoxSmall,
  textXsSubtle, flexBetweenCenterSm, textMuted, textWeight600,
} from '../../styles/common';

const badgeGreen: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', fontWeight: 600 };
const badgeAmber: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontWeight: 600 };
const badgeRed: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontWeight: 600 };
const badgePink: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.25)', color: '#f472b6', fontWeight: 600 };
const badgeBlue: React.CSSProperties = { padding: '2px 8px', borderRadius: 6, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8', fontWeight: 600 };

interface DebateAnalyticsProps {
  session: DebateSession;
  getAgentLabel: (id: string) => string;
  t: (key: string) => string;
}

const DebateAnalytics: React.FC<DebateAnalyticsProps> = ({ session, getAgentLabel, t }) => {
  const voteAlignment = useMemo(() => {
    if (!session.roundVotes) return [];
    return Object.entries(session.roundVotes)
      .map(([roundStr, votes]) => {
        const round = Number(roundStr);
        const roundArgs = session.arguments.filter(a => a.round === round && a.agentId !== 'human');
        const aiPick = roundArgs.length > 0
          ? roundArgs.reduce((best, arg) => (arg.confidence > best.confidence ? arg : best)).agentId
          : null;
        const humanPicks = votes.filter(v => v.score >= 5).map(v => v.votedAgentId);
        return {
          round,
          humanPicks,
          aiPick,
          aligned: aiPick !== null && humanPicks.includes(aiPick),
        };
      })
      .sort((a, b) => a.round - b.round);
  }, [session]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
      <div className="glass-panel" style={glassPanelRounded24}>
        <h3 className="debate-panel-header">
          <BarChart3 size={18} color="#10b981" /> {t('debate.analytics')}
        </h3>
        <div style={flexColGap6}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 700 }}>
              <span style={textMuted}>{t('debate.convergence_score')}</span>
              <span style={{ color: session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444' }}>
                {Math.round(session.convergenceScore)}%
              </span>
            </div>
            <div className="debate-progress-track" role="progressbar"
              aria-valuenow={Math.round(session.convergenceScore)} aria-valuemin={0} aria-valuemax={100}
              aria-label={t('debate.convergence_score')}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${session.convergenceScore}%` }}
                transition={{ duration: 0.5 }}
                style={{
                  height: '100%',
                  background: session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444',
                  borderRadius: 4,
                  boxShadow: `0 0 10px ${session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444'}`,
                }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
              {session.convergenceScore > 85 ? t('debate.consensus_strong') : session.convergenceScore > 60 ? t('debate.consensus_moderate') : session.convergenceScore > 30 ? t('debate.consensus_divergent') : t('debate.consensus_early')}
            </div>
          </div>
          <div style={grid2}>
            <div className="debate-stat">
              <div className="debate-sub-label">{t('debate.total_arguments')}</div>
              <div className="debate-stat-value">{session.arguments.length}</div>
            </div>
            <div className="debate-stat">
              <div className="debate-sub-label">{t('debate.strategy_label')}</div>
              <div className="debate-stat-value debate-stat-value--sm">{session.strategy.replace('_', ' ')}</div>
            </div>
          </div>
        </div>
      </div>

      {voteAlignment.length > 0 && (
        <div className="glass-panel" style={glassPanelRounded24}>
          <h3 className="debate-panel-header">
            <Target size={18} color="#a855f7" /> Human vs AI verdict
          </h3>
          <div style={flexColGap3MarginTop3}>
            {voteAlignment.map(row => (
              <div key={row.round} style={metricBoxSmall}>
                <div style={flexBetweenCenterSm}>
                  <span style={textWeight600}>Round {row.round}</span>
                  <span style={row.aligned ? badgeGreen : badgeAmber}>
                    {row.aligned ? 'Aligned' : 'Divergent'}
                  </span>
                </div>
                <div style={{ ...textXsSubtle, marginTop: '0.35rem' }}>
                  You: {row.humanPicks.length > 0 ? row.humanPicks.map(getAgentLabel).join(', ') : '—'}
                </div>
                <div style={{ ...textXsSubtle, marginTop: '0.2rem' }}>
                  AI (top confidence): {row.aiPick ? getAgentLabel(row.aiPick) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {session.graphMetrics && (
        <div className="glass-panel" style={glassPanelRounded24}>
          <h3 className="debate-panel-header">
            <GitBranch size={18} color="#f59e0b" /> {t('debate.structural_metrics')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            {[
              { label: t('debate.max_depth'), value: String(session.graphMetrics.maxDepth), color: '#a78bfa' },
              { label: t('debate.avg_depth'), value: session.graphMetrics.avgDepth.toFixed(1), color: '#60a5fa' },
              { label: t('debate.branching'), value: session.graphMetrics.branchingFactor.toFixed(1), color: '#34d399' },
              { label: t('debate.orphan_rate'), value: `${(session.graphMetrics.orphanRate * 100).toFixed(0)}%`, color: session.graphMetrics.orphanRate > 0.3 ? '#ef4444' : '#f59e0b' },
              { label: t('debate.challenge_density'), value: `${(session.graphMetrics.challengeDensity * 100).toFixed(0)}%`, color: '#f472b6' },
              { label: t('debate.refinement_density'), value: `${(session.graphMetrics.refinementDensity * 100).toFixed(0)}%`, color: '#38bdf8' },
            ].map(m => (
              <div key={m.label} className="debate-stat" style={{ textAlign: 'center', padding: '0.5rem' }}>
                <div className="debate-sub-label" style={{ fontSize: '0.65rem' }}>{m.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.7rem', color: '#64748b' }}>
            {session.graphMetrics.maxDepth >= 4 && <span style={badgeGreen}>{t('debate.badge_deep')}</span>}
            {session.graphMetrics.branchingFactor > 2 && <span style={badgeAmber}>{t('debate.badge_branching')}</span>}
            {session.graphMetrics.orphanRate > 0.3 && <span style={badgeRed}>{t('debate.badge_orphan')}</span>}
            {session.graphMetrics.challengeDensity > 0.5 && <span style={badgePink}>{t('debate.badge_challenge')}</span>}
            {session.graphMetrics.refinementDensity > 0.5 && <span style={badgeBlue}>{t('debate.badge_refinement')}</span>}
          </div>
        </div>
      )}

      {session.status === 'completed' && session.strategy === 'constrained' && session.interpretation?.constraintCorrelation && (
        <div className="glass-panel" style={glassPanelRounded24}>
          <h3 className="debate-panel-header">
            <Shield size={18} color="#10b981" /> {t('debate.constraint_compliance')}
          </h3>
          <div style={flexColGap3MarginTop3}>
            {Object.entries(session.interpretation.constraintCorrelation.byConstraint).map(([constraint, data]) => {
              const pct = Math.round(data.compliance * 100);
              const color = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';
              return (
                <div key={constraint} style={{ fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600, textTransform: 'capitalize' }}>{constraint.replace('_', ' ')}</span>
                    <span style={{ color }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', color: '#64748b', fontSize: '0.65rem' }}>
                    <span>{t('debate.constraint_depth')}: {data.avgDepth}</span>
                    <span>{t('debate.constraint_confidence')}: {data.avgConfidence}</span>
                    <span>{t('debate.constraint_challenge')}: {Math.round(data.challengeRate * 100)}%</span>
                    <span>{t('debate.constraint_args')}: {data.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {session.status === 'completed' && session.interpretation && (
        <div className="glass-panel" style={glassPanelRounded24}>
          <h3 className="debate-panel-header">
            <TrendingUp size={18} color="#a855f7" /> {t('debate.analysis')}
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5, margin: '0.75rem 0' }}>
            {session.interpretation.summary}
          </p>
          {session.interpretation.disagreementPeak && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', borderRadius: 8,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
              marginBottom: '0.75rem',
            }}>
              <Zap size={14} color="#ef4444" />
              <div style={{ fontSize: '0.72rem', color: '#e2e8f0' }}>
                <strong>{t('debate.disagreement_peak')}</strong> {t('debate.at_round')} {session.interpretation.disagreementPeak.round} ({t('debate.intensity')}: {Math.round(session.interpretation.disagreementPeak.intensity * 100)}%)
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {session.interpretation.insights.map((insight, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: '#cbd5e1', alignItems: 'flex-start' }}>
                <span style={{ color: '#a855f7', flexShrink: 0 }}>{'\u25B8'}</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {session.status === 'completed' && session.qualityMetrics && (
        <div className="glass-panel" style={glassPanelRounded24}>
          <h3 className="debate-panel-header">
            <Target size={18} color="#10b981" /> {t('debate.quality_metrics')}
          </h3>
          <div style={flexColGap3MarginTop3}>
            <div>
              <div style={flexBetweenCenterSm}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8' }}>{t('debate.depth')}</span>
                <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>{Math.round(session.qualityMetrics.depth.depthScore * 100)}%</span>
              </div>
              <div style={grid2TinyGap}>
                <span>{t('debate.unique_args')}: <strong style={{ color: '#e2e8f0' }}>{session.qualityMetrics.depth.uniqueArguments}</strong> / {session.arguments.length}</span>
                <span>{t('debate.lexical_diversity')}: <strong style={{ color: '#e2e8f0' }}>{(session.qualityMetrics.depth.lexicalDiversity * 100).toFixed(0)}%</strong></span>
                <span>{t('debate.unique_bigrams')}: <strong style={{ color: '#e2e8f0' }}>{session.qualityMetrics.depth.uniqueBigrams}</strong></span>
                <span>{t('debate.topic_breadth')}: <strong style={{ color: '#e2e8f0' }}>{(session.qualityMetrics.depth.topicBreadth * 100).toFixed(0)}%</strong></span>
              </div>
              <div style={progressBgSmall}>
                <div style={{ width: `${Math.round(session.qualityMetrics.depth.depthScore * 100)}%`, height: '100%', background: '#38bdf8', borderRadius: 2 }} />
              </div>
            </div>
            <div style={borderTopSection}>
              <div style={flexBetweenCenterSm}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f472b6' }}>{t('debate.originality')}</span>
                <span style={{ fontSize: '0.7rem', color: '#f472b6', fontWeight: 600 }}>{Math.round(session.qualityMetrics.originality.noveltyScore * 100)}%</span>
              </div>
              <div style={grid2TinyGap}>
                <span>{t('debate.self_repetition')}: <strong style={{ color: session.qualityMetrics.originality.selfRepetition > 0.3 ? '#ef4444' : '#e2e8f0' }}>{(session.qualityMetrics.originality.selfRepetition * 100).toFixed(0)}%</strong></span>
                <span>{t('debate.cross_repetition')}: <strong style={{ color: session.qualityMetrics.originality.crossRepetition > 0.3 ? '#ef4444' : '#e2e8f0' }}>{(session.qualityMetrics.originality.crossRepetition * 100).toFixed(0)}%</strong></span>
              </div>
              <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.3rem' }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(session.qualityMetrics.originality.selfRepetition * 100, 100)}%`, height: '100%', background: '#f472b6', borderRadius: 2 }} />
                </div>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(session.qualityMetrics.originality.crossRepetition * 100, 100)}%`, height: '100%', background: '#a855f7', borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: '#64748b', marginTop: '0.15rem' }}>
                <span>{t('debate.self_repetition')}</span>
                <span>{t('debate.cross_repetition')}</span>
              </div>
            </div>
            <div style={borderTopSection}>
              <div style={flexBetweenCenterSm}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b' }}>{t('debate.usefulness')}</span>
                <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>{Math.round(session.qualityMetrics.usefulness.usefulnessScore * 100)}%</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.62rem', color: '#94a3b8' }}>
                <div style={metricBoxSmall}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>{Math.round(session.qualityMetrics.usefulness.relevanceScore * 100)}%</div>
                  <div style={textXsSubtle}>{t('debate.relevance')}</div>
                </div>
                <div style={metricBoxSmall}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa' }}>{Math.round(session.qualityMetrics.usefulness.evidenceScore * 100)}%</div>
                  <div style={textXsSubtle}>{t('debate.evidence')}</div>
                </div>
                <div style={metricBoxSmall}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa' }}>{Math.round(session.qualityMetrics.usefulness.structureScore * 100)}%</div>
                  <div style={textXsSubtle}>{t('debate.structure')}</div>
                </div>
              </div>
              <div style={progressBgSmall}>
                <div style={{ width: `${Math.round(session.qualityMetrics.usefulness.usefulnessScore * 100)}%`, height: '100%', background: '#f59e0b', borderRadius: 2 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {session.status === 'completed' && session.activityMetrics && (
        <div className="glass-panel" style={glassPanelRounded24}>
          <h3 className="debate-panel-header">
            <BarChart3 size={18} color="#f97316" /> {t('debate.activity_heatmap')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
            {session.activityMetrics.perAgent.map((a, i) => {
              const maxCount = Math.max(...session.activityMetrics!.perAgent.map(x => x.argumentCount), 1);
              const maxChildren = Math.max(...session.activityMetrics!.perAgent.map(x => x.childrenReceived), 1);
              const pct = (a.argumentCount / maxCount) * 100;
              const childrenPct = (a.childrenReceived / maxChildren) * 100;
              const heatColor = pct > 66 ? '#ef4444' : pct > 33 ? '#f59e0b' : '#3b82f6';
              return (
                <div key={a.agentId} style={{ fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.agentName}</span>
                    <span style={{ color: '#94a3b8', flexShrink: 0, marginLeft: '0.5rem' }}>{a.argumentCount} {t('debate.args')} &middot; {a.wordCount} {t('debate.words')} &middot; {Math.round(a.avgConfidence * 100)}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: heatColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ color: childrenPct > 0 ? '#f472b6' : '#475569', fontSize: '0.6rem', flexShrink: 0, width: 36, textAlign: 'right' }}>
                      {'\u21C4'}{a.childrenReceived}
                    </span>
                  </div>
                  {i < session.activityMetrics!.perAgent.length - 1 && i === Math.min(2, session.activityMetrics!.perAgent.length - 2) && session.activityMetrics!.perAgent.length > 4 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', margin: '0.4rem 0' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {session.status === 'completed' && session.activityMetrics && session.activityMetrics.mostDiscussed.length > 0 && (
        <div className="glass-panel" style={glassPanelRounded24}>
          <h3 className="debate-panel-header">
            <MessageSquare size={18} color="#a855f7" /> {t('debate.most_discussed')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
            {session.activityMetrics.mostDiscussed.map((arg) => {
              const maxChildren = Math.max(...session.activityMetrics!.mostDiscussed.map(x => x.childCount), 1);
              const pct = (arg.childCount / maxChildren) * 100;
              return (
                <div key={arg.argumentId} style={{ padding: '0.5rem 0.65rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 600 }}>
                      @{arg.agentName} <span style={{ color: '#64748b', fontWeight: 400 }}>&middot; {t('debate.round_label')} {arg.round}</span>
                    </span>
                    <span style={{ fontSize: '0.6rem', color: '#f472b6', fontWeight: 600 }}>{arg.childCount} {t('debate.responses')}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.4 }}>"{arg.content}"</div>
                  <div style={{ marginTop: '0.3rem', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#a855f7', borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {session.status === 'completed' && session.arguments.length > 0 && (
        (() => {
          const roundNumbers = [...new Set(session.arguments.map(a => a.round))].sort((a, b) => a - b);
          const roundCounts = roundNumbers.map(r => session.arguments.filter(a => a.round === r).length);
          const maxRoundCount = Math.max(...roundCounts, 1);
          return (
            <div className="glass-panel" style={glassPanelRounded24}>
              <h3 className="debate-panel-header">
                <Clock size={18} color="#60a5fa" /> {t('debate.round_timeline')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.75rem' }}>
                {roundNumbers.map((r, ri) => {
                  const args = session.arguments.filter(a => a.round === r);
                  const agentIds = [...new Set(args.map(a => a.agentId))];
                  const avgConf = args.reduce((s, a) => s + (a.confidence || 0), 0) / args.length;
                  const timelinePoint = session.interpretation?.disagreementTimeline?.find(point => point.round === r);
                  const intensity = timelinePoint?.intensity ?? roundCounts[ri] / maxRoundCount;
                  const isPeak = session.interpretation?.disagreementPeak?.round === r;
                  const intensityPct = Math.round(Math.min(intensity, 1) * 100);
                  return (
                    <div key={r} style={{
                      display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.35rem 0.5rem', borderRadius: 8,
                      background: isPeak ? 'rgba(239,68,68,0.06)' : 'transparent',
                      border: isPeak ? '1px solid rgba(239,68,68,0.12)' : 'none',
                    }}>
                      <div style={{ width: 24, textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: isPeak ? '#ef4444' : '#60a5fa', flexShrink: 0 }}>
                        {r}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <div style={{ fontSize: '0.6rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {agentIds.length} {t('debate.agents')} &middot; {args.length} {t('debate.arg_short')}{args.length !== 1 ? 's' : ''}
                          </div>
                          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                            <div style={{
                              width: `${intensityPct}%`, height: '100%',
                              background: isPeak ? '#ef4444' : `rgba(96,165,250,${0.3 + intensity * 0.7})`,
                              borderRadius: 2, transition: 'width 0.4s ease',
                            }} />
                          </div>
                          {isPeak && <Zap size={10} color="#ef4444" style={{ flexShrink: 0 }} />}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#64748b', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {agentIds.map(id => session.participants.find(p => p.id === id)?.name || id).join(', ')}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', flexShrink: 0, textAlign: 'right' }}>
                        <div>{Math.round(avgConf * 100)}%</div>
                        <div style={{ fontSize: '0.5rem' }}>{t('debate.conf_short')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      )}

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
        <h3 className="debate-panel-header">
          <Users size={18} color="#3b82f6" /> {t('debate.active_participants')}
        </h3>
        <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {session.participants.map((p, idx) => {
            const agentCount = session.arguments.filter(a => a.agentId === p.id).length;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', delay: idx * 0.1 }}
                className="debate-participant"
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.3)' }}>
                  <Bot size={22} color="#3b82f6" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="debate-agent-name" style={{ fontSize: '0.95rem' }}>{getAgentLabel(p.id)}</div>
                  <div className="debate-secondary-text">{agentCount} {t('debate.total_arguments').toLowerCase()}</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default DebateAnalytics;
