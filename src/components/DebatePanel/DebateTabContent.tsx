import React, { useState } from 'react';
import { MessageSquare, Clock, Brain, Eye, ThumbsUp, Loader2, Send, BarChart3, Swords } from 'lucide-react';
import DebateSetupWizard from './DebateSetupWizard';
import DebateHistoryPanel from './DebateHistoryPanel';
import DebateAnalytics from './DebateAnalytics';
import CollabDebatePanel from './CollabDebatePanel';
import { TournamentPanel } from './TournamentPanel';
import { DebateVerdictPanel } from './DebateVerdictPanel';
import { DebateMemoryPanel } from './DebateMemoryPanel';
import DebateSidebar from './DebateSidebar';
import DebateChat from './DebateChat';
import ErrorBoundary from '../Common/ErrorBoundary';
import type { DebateSession, DebateVerdict, HumanVote } from '../../kernel/contracts';
import type { DebateArchetypeId } from '../../kernel/services/debate-archetypes';
import type { ProbeResult } from '../../kernel/contracts/probe';
import type { AutoDebateResult, ProviderWinRate } from '../../kernel/contracts/auto-debate';
import { probeService, autoDebateService as autoDebate, debateService } from '../../kernel/instances';
import {
  debateArenaPanel,
  debateHistoryCountBadge,
  debateInjectButton,
  debateLoadingState,
  debateLogArea,
  debateReturnActiveBtn,
  debateTabBar,
  debateTabButton,
  debateVoteChoices,
  debateVoteDismissBtn,
  debateVoteHeader,
  debateVotePanel,
  debateVoteStatusRow,
  debateVoteStatusText,
  textWeight600,
} from '../../styles/common';

// FIX (audit): extracted from duplicate mobile/desktop JSX in DebatePanel.tsx
// Reduces ~553 lines of duplication. Mobile uses containerStyle=mobileFlex, showSidebar=false.
// Desktop uses containerStyle=desktopFlex, showSidebar=true.
export function DebateTabContent({
  containerStyle,
  showSidebar,
  session, viewTab, setViewTab, history, expandedHistory, setExpandedHistory,
  refreshHistory, getAgentLabel, availableAgents, selectedAgents, toggleAgent,
  onSelectAll, onDeselectAll, topic, onTopicChange, strategy, onStrategyChange,
  maxRounds, onMaxRoundsChange, debateTemperature, onTemperatureChange,
  agentArchetypes, onArchetypeChange, agentConstraints,
  selectedHistoricalIds, setShowHistoricalPicker,
  humanVotes, showVotePanel, setShowVotePanel, setHumanVotes, getRoundParticipants,
  streamingArgIds, verdict, userInjection, setUserInjection, actionLoading,
  handleInject, isLoading, t,
  probeResults, expandedProbe, setExpandedProbe, setProbeResults,
  showAuto, setShowAuto, autoResults, autoWinRates, refreshAuto,
  onConstraintChange, onStart,
}: {
  containerStyle: React.CSSProperties;
  showSidebar?: boolean;
  session: DebateSession | null;
  viewTab: string; setViewTab: (tab: string) => void;
  history: DebateSession[]; expandedHistory: Set<string>;
  setExpandedHistory: React.Dispatch<React.SetStateAction<Set<string>>>; refreshHistory: () => void;
  getAgentLabel: (id: string) => string;
  availableAgents: Array<{ id: string; label: string; config?: Record<string, unknown> }>; selectedAgents: string[];
  toggleAgent: (id: string) => void;
  onSelectAll: () => void; onDeselectAll: () => void;
  topic: string; onTopicChange: (t: string) => void;
  // CRIT-9 fix: use DebateSessionStrategy instead of string to preserve all valid values
  strategy: import('../../kernel/contracts/debate-types').DebateSessionStrategy;
  onStrategyChange: (v: import('../../kernel/contracts/debate-types').DebateSessionStrategy) => void;
  maxRounds: number; onMaxRoundsChange: (r: number) => void;
  debateTemperature: number; onTemperatureChange: (t: number) => void;
  agentArchetypes: Record<string, DebateArchetypeId>; onArchetypeChange: (key: string) => void;
  agentConstraints: Record<string, string>;
  selectedHistoricalIds: string[];
  setShowHistoricalPicker: (v: boolean) => void;
  humanVotes: HumanVote[]; showVotePanel: number | null; setShowVotePanel: (r: number | null) => void;
  setHumanVotes: (v: HumanVote[]) => void;
  getRoundParticipants: (round: number) => string[];
  streamingArgIds: Set<string>; verdict: DebateVerdict | null;
  userInjection: string; setUserInjection: (s: string) => void;
  actionLoading: 'start' | 'inject' | null; handleInject: () => void;
  isLoading: boolean; t: (k: string) => string;
  probeResults: Map<string, ProbeResult> | null;
  expandedProbe: string | null; setExpandedProbe: (id: string | null) => void;
  setProbeResults: (r: Map<string, ProbeResult> | null) => void;
  showAuto: boolean; setShowAuto: (v: boolean) => void;
  autoResults: AutoDebateResult[] | null;
  autoWinRates: ProviderWinRate[];
  refreshAuto: () => void;
  onConstraintChange: (id: string, constraint: string) => void;
  onStart: () => void;
}) {
  const flexColumn: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' };
  const [internalProbeLoading, setInternalProbeLoading] = useState(false);
  const combinedProbeLoading = internalProbeLoading;

  return (
    <div style={containerStyle}>
      {showSidebar && <DebateSidebar />}
      <div style={flexColumn}>
        {/* Tab Bar */}
        <div style={debateTabBar}>
          <button onClick={() => setViewTab('active')}
            className={`debate-tab ${viewTab === 'active' ? 'active' : ''}`}
            style={{ ...debateTabButton, background: viewTab === 'active' ? 'rgba(168,85,247,0.15)' : 'transparent', color: viewTab === 'active' ? '#a855f7' : '#64748b' }}>
            <MessageSquare size={16} /> Active
          </button>
          <button onClick={() => { setViewTab('history'); refreshHistory(); }}
            className={`debate-tab ${viewTab === 'history' ? 'active' : ''}`}
            style={{ ...debateTabButton, background: viewTab === 'history' ? 'rgba(59,130,246,0.15)' : 'transparent', color: viewTab === 'history' ? '#3b82f6' : '#64748b' }}>
            <Clock size={16} /> History {history.length > 0 && <span style={debateHistoryCountBadge}>{history.length}</span>}
          </button>
          <button onClick={() => setViewTab('tournament')}
            className={`debate-tab ${viewTab === 'tournament' ? 'active' : ''}`}
            style={{ ...debateTabButton, background: viewTab === 'tournament' ? 'rgba(239,68,68,0.15)' : 'transparent', color: viewTab === 'tournament' ? '#ef4444' : '#64748b' }}>
            <Swords size={16} /> Tournament
          </button>
          <button onClick={() => setViewTab('memory')}
            className={`debate-tab ${viewTab === 'memory' ? 'active' : ''}`}
            style={{ ...debateTabButton, background: viewTab === 'memory' ? 'rgba(139,92,246,0.15)' : 'transparent', color: viewTab === 'memory' ? '#8b5cf6' : '#64748b' }}>
            <Brain size={16} /> Memory
          </button>
          {session?.status === 'completed' && (
            <button onClick={() => setViewTab('verdict')}
              className={`debate-tab ${viewTab === 'verdict' ? 'active' : ''}`}
              style={{ ...debateTabButton, background: viewTab === 'verdict' ? 'rgba(16,185,129,0.15)' : 'transparent', color: viewTab === 'verdict' ? '#10b981' : '#64748b' }}>
              <ThumbsUp size={16} /> Verdict
            </button>
          )}
          {(session && (viewTab === 'history' || viewTab === 'verdict' || viewTab === 'memory')) && (
            <button onClick={() => setViewTab('active')} style={debateReturnActiveBtn}>
              <Eye size={16} /> Return to Active
            </button>
          )}
        </div>

        {viewTab === 'tournament' ? (
          <div style={{ flex: 1, overflow: 'auto' }}><TournamentPanel /></div>
        ) : viewTab === 'memory' ? (
          <div style={{ flex: 1, overflow: 'auto' }}><DebateMemoryPanel /></div>
        ) : viewTab === 'history' ? (
          <DebateHistoryPanel
            history={history}
            expandedHistory={expandedHistory}
            onToggleExpand={(id) => setExpandedHistory(prev => { const next = new Set<string>(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
            onRefresh={refreshHistory} t={t}
          />
        ) : viewTab === 'verdict' && verdict ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
            <DebateVerdictPanel verdict={verdict} sessionId={session?.id ?? ''} />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: session ? '1fr 380px' : '1fr', gap: '1.5rem', minHeight: 0, overflow: 'hidden' }}>
            {isLoading && !session && (
              <div aria-live="polite" aria-busy="true" style={debateLoadingState}>
                <Loader2 size={48} className="spinning" opacity={0.3} />
                <span style={textWeight600}>{t('debate.loading')}</span>
              </div>
            )}
            <div className="glass-panel" style={debateArenaPanel}>
              {!session ? (
                <DebateSetupWizard
                  topic={topic} onTopicChange={onTopicChange}
                  strategy={strategy}
                  onStrategyChange={onStrategyChange}
                  maxRounds={maxRounds} onMaxRoundsChange={onMaxRoundsChange}
                  debateTemperature={debateTemperature} onTemperatureChange={onTemperatureChange}
                  agentArchetypes={agentArchetypes} onArchetypeChange={onArchetypeChange}
                  selectedAgents={selectedAgents} onToggleAgent={toggleAgent}
                  onSelectAll={onSelectAll} onDeselectAll={onDeselectAll}
                  availableAgents={availableAgents}
                  agentConstraints={agentConstraints}
                  onConstraintChange={onConstraintChange}
                  probeResults={probeResults} probeLoading={combinedProbeLoading}
                  onProbe={async () => {
                    setExpandedProbe(null);
                    setInternalProbeLoading(true);
                    setProbeResults(null);
                    try {
                      const targets = selectedAgents.length >= 2 ? selectedAgents : availableAgents.map(a => a.id);
                      const participants = targets.map((id) => {
                        const node = availableAgents.find(a => a.id === id);
                        return { id, provider: (node?.config?.provider as string) || undefined, modelId: ((node?.config?.model as string) !== 'auto' ? node?.config?.model as string : undefined) };
                      });
                      const results = await probeService.probeForDebate(participants);
                      setProbeResults(results);
                    } catch { /* silently fail */ }
                    finally { setInternalProbeLoading(false); }
                  }}
                  expandedProbe={expandedProbe} onToggleProbe={setExpandedProbe}
                  actionLoading={actionLoading} onStart={onStart} showAuto={showAuto} onToggleAuto={() => setShowAuto(!showAuto)}
                  autoResults={autoResults ?? []} autoWinRates={autoWinRates}
                  onAutoDebate={async (opts: unknown) => { const r = await autoDebate.runAutoDebate(opts as Parameters<typeof autoDebate.runAutoDebate>[0]); refreshAuto(); return r; }}
                  onStressTest={async (c: unknown) => { const r = await autoDebate.stressTest(c as Parameters<typeof autoDebate.stressTest>[0]); refreshAuto(); return r; }}
                  onBatchTest={async (topic: string, runs?: number) => { const r = await autoDebate.batchTest(topic, runs ?? 1); refreshAuto(); return r; }}
                  onClearAuto={() => { autoDebate.clearResults(); refreshAuto(); }}
                  t={t} selectedHistoricalCount={selectedHistoricalIds.length}
                  onOpenHistoricalFigures={() => setShowHistoricalPicker(true)}
                />
              ) : (
                <>
                  {/* Active thesis */}
                  <div className="debate-active-thesis">
                    <div className="debate-header-label">{t('debate.active_thesis')}</div>
                    <div className="debate-topic-text">{session.topic}</div>
                  </div>

                  <div role="log" aria-live="polite" aria-label="Debate arguments" style={debateLogArea}>
                    <ErrorBoundary name="DebateChat" variant="panel">
                      <DebateChat
                        arguments={session.arguments ?? []}
                        isActive={session.status === 'active'}
                        t={t}
                        agentLabel={getAgentLabel}
                        streamingArgIds={streamingArgIds}
                      />
                    </ErrorBoundary>
                  </div>

                  {/* Voting Panel */}
                  {showVotePanel !== null && session.status === 'active' && (
                    <div style={debateVotePanel}>
                      <div style={debateVoteHeader}>
                        <ThumbsUp size={18} color="#a855f7" />
                        <span style={debateVoteStatusText}>Round {showVotePanel} — Who made the best argument?</span>
                      </div>
                      <div style={debateVoteChoices}>
                        {getRoundParticipants(showVotePanel).map(agentId => {
                          const isBest = humanVotes.some(v => v.round === showVotePanel && v.votedAgentId === agentId && v.score === 5);
                          return (
                            <button key={agentId}
                              onClick={() => {
                                const wasBest = humanVotes.some(v => v.round === showVotePanel && v.votedAgentId === agentId && v.score === 5);
                                // CRIT-7 fix: use typed debateService instead of globalThis bypass
                                debateService.recordHumanVote({ round: showVotePanel, voter: 'human', votedAgentId: agentId, score: wasBest ? 0 : 5, timestamp: Date.now() });
                                setHumanVotes(debateService.getHumanVotes());
                              }}
                              style={{ padding: '0.5rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                                background: isBest ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.03)', color: isBest ? '#facc15' : '#cbd5e1' }}>
                              {isBest ? '★' : '☆'} {getAgentLabel(agentId)}
                            </button>
                          );
                        })}
                      </div>
                      {humanVotes.filter(v => v.round === showVotePanel).length > 0 && (
                        <div style={debateVoteStatusRow}>
                          <BarChart3 size={14} color="#10b981" />
                          <span style={debateVoteStatusText}>Vote recorded — {humanVotes.filter(v => v.round === showVotePanel).length} agent(s) marked as best</span>
                          <button onClick={() => setShowVotePanel(null)} style={debateVoteDismissBtn}>Dismiss</button>
                        </div>
                      )}
                    </div>
                  )}

                  {session.status !== 'completed' && (
                    <ErrorBoundary name="CollabDebatePanel" variant="panel">
                      <CollabDebatePanel session={session} getAgentLabel={getAgentLabel} />
                    </ErrorBoundary>
                  )}

                  {session.status !== 'completed' && (
                    <div className="debate-inject-bar">
                      <input type="text" placeholder={t('debate.inject_placeholder')} aria-label="Human argument input"
                        value={userInjection} onChange={e => setUserInjection(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !actionLoading && handleInject()}
                        className="debate-inject-input" disabled={actionLoading === 'inject'} />
                      <button onClick={handleInject} className="btn-primary" aria-label={t('debate.inject')} style={debateInjectButton} disabled={actionLoading === 'inject'}>
                        {actionLoading === 'inject' ? <Loader2 size={20} className="spinning" /> : <Send size={20} aria-hidden="true" />} {t('debate.inject')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            {session && (
              <ErrorBoundary name="DebateAnalytics" variant="panel">
                <DebateAnalytics session={session} getAgentLabel={getAgentLabel} t={t} />
              </ErrorBoundary>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
