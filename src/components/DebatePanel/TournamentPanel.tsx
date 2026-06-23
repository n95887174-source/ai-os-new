import React, { useState, useMemo } from 'react';
import {
  Trophy, Swords, ChevronRight, Clock, CheckCircle2,
  Zap, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { glassPanel } from '../../styles/common';

export interface TournamentMatch {
  id: string;
  topic: string;
  participantA: { name: string; role: 'pro' | 'con' | 'neutral' };
  participantB: { name: string; role: 'pro' | 'con' | 'neutral' };
  winner?: 'A' | 'B' | 'draw';
  status: 'pending' | 'active' | 'completed';
  strategy?: string;
  rounds?: number;
  argumentCount?: number;
  convergenceScore?: number;
  summary?: string;
}

export interface TournamentRound {
  name: string;
  matches: TournamentMatch[];
}

interface TournamentBracket {
  title: string;
  rounds: TournamentRound[];
}

const statusColors: Record<TournamentMatch['status'], string> = {
  pending: '#64748b',
  active: '#3b82f6',
  completed: '#10b981',
};

const roleColors: Record<string, string> = {
  pro: '#10b981',
  con: '#ef4444',
  neutral: '#64748b',
};

const generateBracket = (topics: string[], participantPool: string[]): TournamentBracket => {
  const count = topics.length;
  const roundsNeeded = Math.ceil(Math.log2(count));
  const totalSlots = Math.pow(2, roundsNeeded);

  const paddedTopics = [...topics];
  while (paddedTopics.length < totalSlots) paddedTopics.push('(bye)');

  const shuffledParticipants = [...participantPool].sort(() => Math.random() - 0.5);

  // First round matches — ensure no participant debates themselves
  const firstRoundMatches: TournamentMatch[] = [];
  const paired = new Set<string>();
  for (let i = 0; i < shuffledParticipants.length && firstRoundMatches.length < totalSlots / 2; i += 2) {
    const a = shuffledParticipants[i];
    const b = shuffledParticipants[i + 1];
    if (a === b) continue;
    if (paired.has(a) || paired.has(b)) continue;
    paired.add(a); paired.add(b);
    const topicIdx = firstRoundMatches.length;
    const isBye = topicIdx >= paddedTopics.length || paddedTopics[topicIdx] === '(bye)';
    firstRoundMatches.push({
      id: `r0-m${firstRoundMatches.length}`,
      topic: paddedTopics[topicIdx % paddedTopics.length],
      participantA: { name: a, role: 'pro' },
      participantB: { name: b, role: 'con' },
      status: isBye ? 'completed' : 'pending',
      winner: isBye ? 'A' : undefined,
    });
  }

  const rounds: TournamentRound[] = [{ name: 'Round 1', matches: firstRoundMatches }];

  // Generate subsequent rounds
  let prevRoundMatchCount = firstRoundMatches.length;
  for (let r = 1; r < roundsNeeded; r++) {
    const matchCount = prevRoundMatchCount / 2;
    const matches: TournamentMatch[] = [];
    for (let m = 0; m < matchCount; m++) {
      matches.push({
        id: `r${r}-m${m}`,
        topic: paddedTopics[0] || 'Final Topic',
        participantA: { name: 'TBD', role: 'pro' },
        participantB: { name: 'TBD', role: 'con' },
        status: 'pending',
      });
    }
    rounds.push({
      name: r === roundsNeeded - 1 ? 'Final' : `Round ${r + 1}`,
      matches,
    });
    prevRoundMatchCount = matchCount;
  }

  return { title: 'Tournament Bracket', rounds };
};

const MatchCard: React.FC<{
  match: TournamentMatch;
  compact?: boolean;
  onClick?: () => void;
}> = ({ match, compact, onClick }) => {
  const borderColor = statusColors[match.status];
  const isWinnerA = match.winner === 'A';
  const isWinnerB = match.winner === 'B';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      style={{
        padding: compact ? '0.5rem 0.6rem' : '0.75rem',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${borderColor}40`,
        borderLeft: `3px solid ${borderColor}`,
        cursor: onClick ? 'pointer' : 'default',
        minWidth: compact ? 140 : 200,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
        {match.status === 'completed' && <CheckCircle2 size={10} color="#10b981" />}
        {match.status === 'active' && <Zap size={10} color="#3b82f6" />}
        {match.status === 'pending' && <Clock size={10} color="#64748b" />}
        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: statusColors[match.status], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {match.status}
        </span>
        {match.strategy && (
          <span style={{ fontSize: '0.5rem', color: '#64748b', marginLeft: 'auto' }}>{match.strategy}</span>
        )}
      </div>

      {/* Participants */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.3rem', borderRadius: 4, background: isWinnerA ? 'rgba(16,185,129,0.1)' : 'transparent' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 700, color: roleColors[match.participantA.role] }}>●</span>
          <span style={{ fontSize: '0.65rem', fontWeight: isWinnerA ? 800 : 500, color: isWinnerA ? '#10b981' : '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.participantA.name}
          </span>
          {isWinnerA && <Trophy size={10} color="#f59e0b" />}
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.5rem', color: '#64748b', fontWeight: 700 }}>vs</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.3rem', borderRadius: 4, background: isWinnerB ? 'rgba(16,185,129,0.1)' : 'transparent' }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 700, color: roleColors[match.participantB.role] }}>●</span>
          <span style={{ fontSize: '0.65rem', fontWeight: isWinnerB ? 800 : 500, color: isWinnerB ? '#10b981' : '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.participantB.name}
          </span>
          {isWinnerB && <Trophy size={10} color="#f59e0b" />}
        </div>
      </div>

      {/* Topic (non-compact) */}
      {!compact && match.topic && (
        <div style={{ marginTop: '0.4rem', paddingTop: '0.3rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.6rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.topic}
        </div>
      )}

      {/* Stats (non-compact, completed only) */}
      {!compact && match.status === 'completed' && match.argumentCount != null && (
        <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.75rem', fontSize: '0.5rem', color: '#64748b' }}>
          {match.rounds != null && <span>{match.rounds} rounds</span>}
          {match.argumentCount != null && <span>{match.argumentCount} args</span>}
          {match.convergenceScore != null && <span>{Math.round(match.convergenceScore * 100)}% conv.</span>}
        </div>
      )}
    </motion.div>
  );
};

export const TournamentPanel: React.FC<{
  bracket?: TournamentBracket;
  onStartMatch?: (matchId: string) => void;
}> = ({ bracket: externalBracket, onStartMatch }) => {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const topics = useMemo(() => [
    'AI alignment vs capability',
    'Open source vs proprietary LLMs',
    'RAG vs fine-tuning',
    'Temperature 0 vs higher values',
    'Chain-of-thought vs direct prompting',
    'Multi-agent vs single-agent',
  ], []);

  const participants = useMemo(() => [
    'Architect', 'Critic', 'Researcher', 'Data Scientist',
    'Security Engineer', 'DevOps', 'Creative', 'PM',
  ], []);

  const defaultBracket = useMemo(() => generateBracket(topics, participants), [topics, participants]);
  const bracket = externalBracket || defaultBracket;

  return (
    <div style={{ ...glassPanel, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(239,68,68,0.15)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)' }}>
            <Swords size={20} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Tournament Bracket</h3>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0 }}>
              {bracket.rounds.length} rounds • {bracket.rounds[0]?.matches.length || 0} matchups
            </p>
          </div>
        </div>
      </div>

      {/* Bracket visualization — horizontal scroll */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', gap: 0, alignItems: 'stretch', paddingBottom: '0.5rem' }}>
        {bracket.rounds.map((round, ri) => (
          <React.Fragment key={ri}>
            {/* Round column */}
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180 }}>
              {/* Round header */}
              <div style={{ padding: '0.4rem 0.6rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: ri === bracket.rounds.length - 1 ? '#f59e0b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {round.name}
                </span>
              </div>

              {/* Matches with spacers */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 0 }}>
                {round.matches.map((match, _mi) => (
                  <div key={match.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ flex: 1, padding: '0.25rem 0.25rem 0.25rem 0' }}>
                      <MatchCard
                        match={match}
                        compact
                        onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                      />
                    </div>

                    {/* Connector line to next round */}
                    {ri < bracket.rounds.length - 1 && (
                      <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 12, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                        <ChevronRight size={12} color="#475569" style={{ flexShrink: 0 }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Expanded match detail */}
      <AnimatePresence>
        {expandedMatch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            {(() => {
              const match = bracket.rounds.flatMap(r => r.matches).find(m => m.id === expandedMatch);
              if (!match) return null;
              return (
                <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <MessageSquare size={14} color="#3b82f6" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>{match.topic}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Participant A</div>
                      <div style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 600 }}>{match.participantA.name}</div>
                      <div style={{ fontSize: '0.6rem', color: roleColors[match.participantA.role] }}>{match.participantA.role}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Result</div>
                      <div style={{ fontSize: '0.75rem', color: match.winner ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                        {match.winner === 'A' && '← Winner'}
                        {match.winner === 'B' && 'Winner →'}
                        {match.winner === 'draw' && 'Draw'}
                        {!match.winner && 'TBD'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Participant B</div>
                      <div style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 600 }}>{match.participantB.name}</div>
                      <div style={{ fontSize: '0.6rem', color: roleColors[match.participantB.role] }}>{match.participantB.role}</div>
                    </div>
                  </div>
                  {match.summary && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      {match.summary}
                    </div>
                  )}
                  {match.status === 'pending' && onStartMatch && (
                    <button
                      onClick={() => onStartMatch(match.id)}
                      style={{ marginTop: '0.5rem', padding: '0.4rem 1rem', borderRadius: 6, background: '#3b82f6', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer' }}
                    >
                      Start Match
                    </button>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
