import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { debateEngine } from '../kernel/instances';
import PanelLoader from './PanelLoader';
import type { DebateSessionSnapshot, TimelineEntry } from '../kernel/contracts/debate-runtime';

const statusColor: Record<string, string> = {
  completed: '#22c55e', failed: '#ef4444', cancelled: '#f59e0b',
  active: '#3b82f6', deliberating: '#8b5cf6', paused: '#a855f7',
};

const DebateReplayPanel: React.FC = () => {
  const [sessions, setSessions] = useState<DebateSessionSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRound, setMaxRound] = useState(1);

  useEffect(() => {
    const refresh = () => setSessions(debateEngine.getAllSessions() ?? []);
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectSession = (id: string) => {
    setSelectedId(id);
    const entries = debateEngine.getTimeline(id) ?? [];
    setTimeline(entries);
    const rounds = new Set<number>();
    for (const e of entries) {
      if (e.type === 'round:start' && e.payload && typeof e.payload === 'object' && 'round' in e.payload) {
        rounds.add((e.payload as { round: number }).round);
      }
    }
    const mr = rounds.size > 0 ? Math.max(...rounds) : 1;
    setMaxRound(mr);
    setCurrentRound(1);
  };

  const roundEntries = useMemo(() => {
    if (!selectedId) return [];
    const roundEvents: { round: number; agentId: string; content: string; type: string }[] = [];
    for (const e of timeline) {
      if (e.type === 'round:start' && e.payload) {
        const p = e.payload as { round: number };
        roundEvents.push({ round: p.round, agentId: '', content: `Round ${p.round} started`, type: 'marker' });
      }
      if (e.type === 'agent:responded' && e.payload) {
        const p = e.payload as { agentId: string; content: string; round?: number };
        roundEvents.push({ round: p.round ?? 0, agentId: p.agentId, content: p.content, type: 'response' });
      }
    }
    return roundEvents.filter(e => e.round === currentRound || (e.round === 0 && currentRound === 1));
  }, [timeline, currentRound, selectedId]);

  const selectedSession = sessions.find(s => s.id === selectedId);

  return (
    <PanelLoader title="Debate Replay">
      <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 200px)' }}>
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'auto', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Debates ({sessions.length})</div>
          {sessions.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>No debates yet</div>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => selectSession(s.id)}
              style={{
                padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem',
                background: selectedId === s.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                border: selectedId === s.id ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#60a5fa' }}>{s.id.slice(-12)}</span>
                <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '3px', background: `${statusColor[s.phase] || '#666'}20`, color: statusColor[s.phase] || '#666' }}>{s.phase}</span>
              </div>
              <div style={{ color: 'var(--text-primary)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.topic.slice(0, 40)}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{s.round} rounds | {s.totalTokens} tokens</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
          {!selectedSession ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Select a debate to replay
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedSession.topic}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{selectedSession.id}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: `${statusColor[selectedSession.phase]}20`, color: statusColor[selectedSession.phase] }}>{selectedSession.phase}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedSession.round} rounds</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <button
                  onClick={() => setCurrentRound(p => Math.max(1, p - 1))}
                  disabled={currentRound <= 1}
                  style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: currentRound <= 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentRound <= 1 ? 'default' : 'pointer', fontSize: '0.75rem' }}
                >{'<'} Prev</button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="range"
                    min={1}
                    max={maxRound}
                    value={currentRound}
                    onChange={e => setCurrentRound(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#3b82f6' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', minWidth: '3rem', textAlign: 'center' }}>{currentRound} / {maxRound}</span>
                </div>
                <button
                  onClick={() => setCurrentRound(p => Math.min(maxRound, p + 1))}
                  disabled={currentRound >= maxRound}
                  style={{ padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: currentRound >= maxRound ? 'var(--text-muted)' : 'var(--text-primary)', cursor: currentRound >= maxRound ? 'default' : 'pointer', fontSize: '0.75rem' }}
                >Next {'>'}</button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {roundEntries.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>No events for this round</div>
                ) : (
                  roundEntries.map((e, i) => (
                    e.type === 'marker' ? (
                      <div key={i} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0.25rem 0' }}>{e.content}</div>
                    ) : (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#60a5fa', marginBottom: '0.3rem' }}>{e.agentId}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{e.content}</div>
                      </motion.div>
                    )
                  ))
                )}
              </div>

              {(selectedSession.phase === 'active' || selectedSession.phase === 'paused' || selectedSession.phase === 'deliberating') && (
                <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0' }}>
                  <button
                    onClick={() => { try { debateEngine.pauseSession(selectedId!); } catch (e) { console.warn('[DebateReplay] pause failed:', e); } }}
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(168,85,247,0.1)', color: '#a855f7', cursor: 'pointer', fontSize: '0.75rem' }}
                  >Pause</button>
                  <button
                    onClick={() => { try { debateEngine.resumeSession(selectedId!); } catch (e) { console.warn('[DebateReplay] resume failed:', e); } }}
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', fontSize: '0.75rem' }}
                  >Resume</button>
                  <button
                    onClick={() => { try { debateEngine.cancelSession(selectedId!); } catch (e) { console.warn('[DebateReplay] cancel failed:', e); } }}
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}
                  >Cancel</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PanelLoader>
  );
};

export default DebateReplayPanel;