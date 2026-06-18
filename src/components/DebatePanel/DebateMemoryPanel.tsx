import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, Link2, Clock, MessageSquare, Brain, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { debateService } from '../../kernel/instances';
import { eventBus } from '../../kernel/events/event-bus';
import type { DebateSession } from '../../kernel/contracts/debate-types';

const CONCLUSION_COLORS: Record<string, string> = {
  consensus: '#10b981',
  dominance: '#f59e0b',
  stalemate: '#ef4444',
  partial_agreement: '#8b5cf6',
  inconclusive: '#6b7280',
};

const CONCLUSION_LABELS: Record<string, string> = {
  consensus: 'Consensus',
  dominance: 'Dominance',
  stalemate: 'Stalemate',
  partial_agreement: 'Partial Agreement',
  inconclusive: 'Inconclusive',
};

interface DebateMemoryPanelProps {
  onSelectSession?: (sessionId: string) => void;
}

function computeStats(sessions: DebateSession[]) {
  let totalArgs = 0;
  let completedWithConclusion = 0;
  let avgConfidence = 0;
  let confidenceCount = 0;
  for (const s of sessions) {
    if (s.arguments) totalArgs += s.arguments.length;
    if (s.status === 'completed') completedWithConclusion++;
    for (const a of s.arguments ?? []) {
      if (a.confidence !== undefined) {
        avgConfidence += a.confidence;
        confidenceCount++;
      }
    }
  }
  return {
    totalSessions: sessions.length,
    totalArguments: totalArgs,
    completedWithConclusion,
    avgConfidence: confidenceCount > 0 ? avgConfidence / confidenceCount : 0,
  };
}

function findRelated(activeIndex: number, allSessions: DebateSession[]) {
  if (allSessions.length === 0) return [];
  const current = allSessions[activeIndex];
  if (!current) return [];
  const currentWords = new Set(
    current.topic.toLowerCase().split(/\s+/).filter(w => w.length > 3),
  );
  return allSessions
    .filter(s => s.id !== current.id)
    .map(s => {
      const topicOverlap = s.topic.toLowerCase().split(/\s+/).filter(w => currentWords.has(w)).length;
      const topicScore = topicOverlap / Math.max(1, currentWords.size);

      const sArgText = (s.arguments ?? []).map(a => a.content.toLowerCase()).join(' ');
      const sWords = new Set(sArgText.split(/\s+/).filter(w => w.length > 4));
      const currentWordsInS = [...currentWords].filter(w => sWords.has(w)).length;
      const contentScore = currentWordsInS / Math.max(1, currentWords.size);

      const relevance = Math.max(topicScore, contentScore * 0.7);
      return { session: s, relevance: Math.round(relevance * 100) / 100 };
    })
    .filter(r => r.relevance > 0.05)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);
}

export const DebateMemoryPanel: React.FC<DebateMemoryPanelProps> = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState<DebateSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [injecting, setInjecting] = useState(false);

  const loadSessions = useCallback(() => {
    const history = debateService.getHistory();
    const active = debateService.getSession();
    if (active && active.status === 'completed') {
      setSessions([active, ...history.filter(s => s.id !== active.id)]);
    } else {
      setSessions(history);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    const unsub = eventBus.on('debate:updated', () => {
      loadSessions();
    });
    return () => { unsub(); };
  }, [loadSessions]);

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.topic.toLowerCase().includes(q) ||
        (s.consensus ?? '').toLowerCase().includes(q) ||
        (s.arguments ?? []).some(a => a.content.toLowerCase().includes(q))
      );
    }
    if (selectedType !== 'all') {
      result = result.filter(s => s.convergenceScore !== undefined);
    }
    return result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [sessions, searchQuery, selectedType]);

  const stats = useMemo(() => computeStats(sessions), [sessions]);

  const relatedDebates = useMemo(() => {
    const idx = filteredSessions.length > 0 ? sessions.indexOf(filteredSessions[0]) : -1;
    if (idx === -1) return [];
    return findRelated(idx, sessions);
  }, [filteredSessions, sessions]);

  const handleInjectMemory = useCallback(async () => {
    if (!filteredSessions[0] || injecting) return;
    setInjecting(true);
    try {
      const current = debateService.getSession();
      const related = relatedDebates.slice(0, 3);
      if (related.length === 0 || !current) return;
      const memoryText = related.map((r, i) =>
        `[Reference ${i + 1}] Debate "${r.session.topic}": ${(r.session.arguments ?? []).slice(0, 3).map(a => a.content.slice(0, 200)).join(' | ')}`
      ).join('\n\n');
      await debateService.addArgument('Memory System', `### Memory from Past Debates\n\n${memoryText}`, 0.8);
    } catch (e) {
      console.warn('[DebateMemoryPanel] inject memory failed:', e);
    } finally {
      setInjecting(false);
    }
  }, [filteredSessions, relatedDebates, injecting]);

  return (
    <div style={{
      flex: 1, overflow: 'auto', padding: '1rem',
      background: 'rgba(0,0,0,0.15)', borderRadius: 12, border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <Brain size={20} color="#8b5cf6" />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Debate Memory
        </h3>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Stats Row */}
      {sessions.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem',
          marginBottom: '1rem',
        }}>
          <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a855f7' }}>{stats.totalSessions}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Sessions</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6' }}>{stats.totalArguments}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Arguments</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{stats.completedWithConclusion}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Completed</div>
          </div>
          <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>{Math.round(stats.avgConfidence * 100)}%</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Avg Confidence</div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by topic, content..."
            style={{
              width: '100%', padding: '6px 10px 6px 30px', borderRadius: 8, boxSizing: 'border-box',
              border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none',
            }}
          />
        </div>
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          style={{
            padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', fontSize: '0.75rem',
          }}
        >
          <option value="all">All Types</option>
          {Object.entries(CONCLUSION_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Related Debates */}
      {relatedDebates.length > 0 && filteredSessions.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            <Link2 size={12} /> Related to "{filteredSessions[0]?.topic?.slice(0, 40)}"
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {relatedDebates.map(r => (
              <div
                key={r.session.id}
                onClick={() => onSelectSession?.(r.session.id)}
                style={{
                  padding: '0.4rem 0.6rem', borderRadius: 8,
                  background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
                  cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-main)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: CONCLUSION_COLORS[r.session.convergenceScore > 0.7 ? 'consensus' : r.session.convergenceScore > 0.4 ? 'dominance' : 'stalemate'] || '#6b7280',
                }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.session.topic}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {Math.round(r.relevance * 100)}%
                </span>
              </div>
            ))}
          </div>
          {debateService.getSession()?.status === 'active' && (
            <button
              onClick={handleInjectMemory}
              disabled={injecting}
              style={{
                marginTop: 6, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(139,92,246,0.3)',
                background: 'rgba(139,92,246,0.1)', color: '#a855f7', cursor: injecting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 600, opacity: injecting ? 0.6 : 1,
              }}
            >
              {injecting ? <Loader2 size={12} className="spinning" /> : <Brain size={12} />}
              {injecting ? 'Injecting...' : 'Inject Memory into Active Debate'}
            </button>
          )}
        </div>
      )}

      {/* Session List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filteredSessions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {searchQuery ? 'No sessions match your search.' : 'No completed debates yet.'}
          </div>
        )}
        {filteredSessions.map(session => {
          const isExpanded = expandedId === session.id;
          const argCount = (session.arguments ?? []).length;
          const conclusionType = session.convergenceScore > 0.7 ? 'consensus'
            : session.convergenceScore > 0.4 ? 'dominance' : 'inconclusive';
          return (
            <div
              key={session.id}
              style={{
                padding: '0.65rem 0.75rem', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {isExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: CONCLUSION_COLORS[conclusionType] || '#6b7280',
                }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.topic}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MessageSquare size={10} /> {argCount}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} /> {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
              {session.consensus && (
                <p style={{
                  fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0 20px',
                  lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: isExpanded ? undefined : 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {session.consensus}
                </p>
              )}
              {isExpanded && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Key Arguments ({Math.min(5, argCount)} of {argCount})
                  </div>
                  {(session.arguments ?? []).slice(-5).map((arg, i) => (
                    <div key={i} style={{
                      padding: '0.35rem 0.5rem', marginBottom: 4, borderRadius: 6,
                      background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid rgba(139,92,246,0.3)',
                      fontSize: '0.72rem', color: 'var(--text-main)', lineHeight: 1.4,
                    }}>
                      <span style={{ fontWeight: 600, color: '#a855f7' }}>{arg.agentName}</span>
                      : {arg.content.slice(0, 200)}{arg.content.length > 200 ? '...' : ''}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>
                      Rounds: {session.currentRound}/{session.maxRounds}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>
                      Convergence: {Math.round(session.convergenceScore * 100)}%
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>
                      Participants: {session.participants?.length ?? 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
