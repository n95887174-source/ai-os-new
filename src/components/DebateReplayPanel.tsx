import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { debateEngine } from '../kernel/instances';
import { ReplayEngine } from '../kernel/services/event-sourcing/replay-engine';
import type { RecordedEvent } from '../kernel/services/event-sourcing/event-recorder';
import type { DebateSessionSnapshot, TimelineEntry } from '../kernel/contracts/debate-runtime';
import PanelLoader from './PanelLoader';

function toRecordedEvent(entry: TimelineEntry, index: number): RecordedEvent {
  return { sequence: index, event: entry.type, data: entry.payload, timestamp: entry.timestamp ?? Date.now(), checksum: `${entry.id}-${index}` };
}

const statusColor: Record<string, string> = {
  completed: '#22c55e', failed: '#ef4444', cancelled: '#f59e0b',
  active: '#3b82f6', deliberating: '#8b5cf6', paused: '#a855f7',
};

const replayStatusLabel: Record<string, string> = {
  idle: 'Idle', playing: 'Playing', paused: 'Paused', completed: 'Done',
};

const replayStatusColor: Record<string, string> = {
  idle: '#6b7280', playing: '#22c55e', paused: '#a855f7', completed: '#3b82f6',
};

const btn = (bg: string, color: string, disabled = false): React.CSSProperties => ({
  padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)',
  background: disabled ? 'rgba(255,255,255,0.03)' : bg, color: disabled ? '#555' : color,
  cursor: disabled ? 'default' : 'pointer', fontSize: '0.7rem', fontWeight: 600,
  opacity: disabled ? 0.4 : 1, transition: 'all 0.15s',
});

const DebateReplayPanel: React.FC = () => {
  const [sessions, setSessions] = useState<DebateSessionSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [replayStatus, setReplayStatus] = useState<'idle' | 'playing' | 'paused' | 'completed'>('idle');
  const [playSpeed, setPlaySpeed] = useState(1);
  const [stepMode, setStepMode] = useState<'auto' | 'manual'>('manual');

  const engineRef = useRef<ReplayEngine | null>(null);

  useEffect(() => {
    const refresh = () => setSessions(debateEngine.getAllSessions() ?? []);
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => { clearInterval(interval); engineRef.current?.destroy(); };
  }, []);

  const selectSession = useCallback((id: string) => {
    setSelectedId(id);
    const entries = debateEngine.getTimeline(id) ?? [];
    setTimeline(entries);
    engineRef.current?.destroy();
    const engine = new ReplayEngine({ stepMode: 'manual' });
    engine.onEvent((_event, idx) => { setCurrentIndex(idx); });
    engine.onStatusChange((status) => { setReplayStatus(status); });
    engine.onRewind((_oldIdx, newIdx) => { setCurrentIndex(newIdx); });
    engine.load(entries.map(toRecordedEvent));
    engineRef.current = engine;
    setCurrentIndex(-1);
    setReplayStatus('idle');
  }, []);

  useEffect(() => { engineRef.current?.setSpeed(playSpeed); }, [playSpeed]);
  useEffect(() => { engineRef.current?.setStepMode(stepMode); }, [stepMode]);

  const canStepBack = currentIndex > 0;
  const canStepFwd = currentIndex < timeline.length - 1;

  const handlePlay = useCallback(() => {
    if (stepMode === 'manual') setStepMode('auto');
    const e = engineRef.current;
    if (!e) return;
    if (replayStatus === 'completed') { e.stop(); setCurrentIndex(-1); }
    setTimeout(() => engineRef.current?.play(), 50);
  }, [stepMode, replayStatus]);

  const handlePause = useCallback(() => { engineRef.current?.pause(); }, []);
  const handleStop = useCallback(() => { engineRef.current?.stop(); setCurrentIndex(-1); }, []);
  const handleStepForward = useCallback(() => { engineRef.current?.stepForward(); }, []);
  const handleStepBackward = useCallback(() => { engineRef.current?.stepBackward(); }, []);
  const handleJumpToStart = useCallback(() => { engineRef.current?.jumpTo(0); }, []);
  const handleJumpToEnd = useCallback(() => { engineRef.current?.jumpTo(timeline.length - 1); }, [timeline.length]);

  const totalEvents = timeline.length;
  const progress = totalEvents > 0 ? ((currentIndex + 1) / totalEvents) * 100 : 0;

  const currentEvent = currentIndex >= 0 && currentIndex < timeline.length ? timeline[currentIndex] : null;

  const visibleEvents = useMemo(() => {
    if (!selectedId || currentIndex < 0) return [];
    const result: Array<{ round: number; agentId: string; content: string; type: string; index: number; ts: string }> = [];
    for (let i = 0; i <= Math.min(currentIndex, timeline.length - 1); i++) {
      const e = timeline[i];
      const ts = new Date(e.timestamp).toLocaleTimeString();
      if (e.type === 'round:start' && e.payload) {
        const p = e.payload as { round: number };
        result.push({ round: p.round, index: i, agentId: '', content: `Round ${p.round} started`, type: 'marker', ts });
      } else if (e.type === 'agent:responded' && e.payload) {
        const p = e.payload as { agentId: string; content: string; round?: number };
        result.push({ round: p.round ?? 0, index: i, agentId: p.agentId, content: p.content, type: 'response', ts });
      } else if (e.type === 'round:end' && e.payload) {
        const p = e.payload as { round: number };
        result.push({ round: p.round, index: i, agentId: '', content: `Round ${p.round} ended`, type: 'marker', ts });
      } else if (e.type === 'session:completed' || e.type === 'session:failed' || e.type === 'session:cancelled') {
        result.push({ round: 0, index: i, agentId: '', content: `Session ${e.type.split(':')[1]}`, type: 'marker', ts });
      } else if (e.type === 'agent:error' && e.payload) {
        const p = e.payload as { agentId: string; error: string };
        result.push({ round: 0, index: i, agentId: p.agentId, content: `Error: ${p.error.slice(0, 120)}`, type: 'error', ts });
      } else if (e.type === 'consensus:reached') {
        result.push({ round: 0, index: i, agentId: '', content: 'Consensus reached', type: 'marker', ts });
      }
    }
    return result;
  }, [timeline, currentIndex, selectedId]);

  const eventsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [visibleEvents.length]);

  const selectedSession = sessions.find(s => s.id === selectedId);

  const currentRoundLabel = useMemo(() => {
    if (currentIndex < 0 || !currentEvent) return '—';
    for (let i = Math.min(currentIndex, timeline.length - 1); i >= 0; i--) {
      if (timeline[i].type === 'round:start') {
        const r = (timeline[i].payload as { round: number }).round ?? 1;
        return `Round ${r}`;
      }
    }
    return 'Round 1';
  }, [currentIndex, timeline, currentEvent]);

  const isLive = selectedSession && (selectedSession.phase === 'active' || selectedSession.phase === 'paused' || selectedSession.phase === 'deliberating');

  return (
    <PanelLoader title="Debate Replay">
      <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 200px)' }}>
        {/* Sidebar */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflow: 'auto', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Debates ({sessions.length})</span>
            <span style={{ fontSize: '0.6rem', color: '#6b7280', fontFamily: 'monospace' }}>auto-refresh 5s</span>
          </div>
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

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
          {!selectedSession ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Select a debate to replay
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSession.topic}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{selectedSession.id} · {selectedSession.totalTokens} tokens · {selectedSession.round} rounds</div>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: `${statusColor[selectedSession.phase]}20`, color: statusColor[selectedSession.phase], flexShrink: 0 }}>
                  {selectedSession.phase}
                </span>
              </div>

              {/* Replay Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button onClick={handleJumpToStart} disabled={!canStepBack} style={btn('rgba(255,255,255,0.05)', '#9ca3af', !canStepBack)} title="Jump to Start">{'|◀'}</button>
                  <button onClick={handleStepBackward} disabled={!canStepBack} style={btn('rgba(255,255,255,0.05)', '#9ca3af', !canStepBack)} title="Step Backward">{'◀'}</button>
                  {(replayStatus === 'playing' || replayStatus === 'paused') && (
                    <button onClick={handlePause} style={btn('rgba(168,85,247,0.15)', '#a855f7')} title="Pause">⏸</button>
                  )}
                  {replayStatus !== 'playing' && (
                    <button onClick={handlePlay} style={btn('rgba(34,197,94,0.15)', '#22c55e')} title="Play">▶</button>
                  )}
                  <button onClick={handleStop} style={btn('rgba(239,68,68,0.1)', '#ef4444')} title="Stop">⏹</button>
                  <button onClick={handleStepForward} disabled={!canStepFwd} style={btn('rgba(255,255,255,0.05)', '#9ca3af', !canStepFwd)} title="Step Forward">{'▶'}</button>
                  <button onClick={handleJumpToEnd} disabled={!canStepFwd} style={btn('rgba(255,255,255,0.05)', '#9ca3af', !canStepFwd)} title="Jump to End">{'▶|'}</button>

                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 0.3rem' }} />

                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Speed:</span>
                  <input
                    type="range" min={0.25} max={4} step={0.25} value={playSpeed}
                    onChange={e => setPlaySpeed(Number(e.target.value))}
                    style={{ width: 80, accentColor: '#3b82f6' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, minWidth: '2.2rem' }}>{playSpeed}x</span>

                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 0.3rem' }} />

                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Mode:</span>
                  <button
                    onClick={() => setStepMode(m => m === 'auto' ? 'manual' : 'auto')}
                    style={{
                      ...btn(stepMode === 'auto' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                        stepMode === 'auto' ? '#60a5fa' : '#9ca3af'),
                      fontSize: '0.65rem',
                    }}
                  >{stepMode === 'auto' ? 'Auto' : 'Manual'}</button>
                </div>

                {/* Progress Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: replayStatus === 'playing' ? '#22c55e' : replayStatus === 'paused' ? '#a855f7' : '#3b82f6', borderRadius: 2, transition: 'width 0.2s' }} />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {currentIndex + 1}/{totalEvents}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600, color: replayStatusColor[replayStatus], whiteSpace: 'nowrap' }}>
                    {replayStatusLabel[replayStatus]}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#60a5fa', whiteSpace: 'nowrap' }}>
                    {currentRoundLabel}
                  </span>
                </div>
              </div>

              {/* Current Event Detail */}
              <AnimatePresence>
                {currentEvent && replayStatus !== 'playing' && currentEvent.type !== 'round:start' && currentEvent.type !== 'round:end' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ padding: '0.5rem 0.75rem', background: 'rgba(96,165,250,0.05)', borderRadius: '8px', border: '1px solid rgba(96,165,250,0.15)', overflow: 'hidden' }}
                  >
                    <div style={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 600, marginBottom: '0.3rem' }}>
                      Current: {currentEvent.type}
                      {currentEvent.type === 'agent:responded' && (currentEvent.payload as { agentId?: string })?.agentId && ` — ${(currentEvent.payload as { agentId: string }).agentId}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                      {(currentEvent.payload as { content?: string })?.content?.slice(0, 500) ?? JSON.stringify(currentEvent.payload).slice(0, 300)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Event Timeline */}
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {visibleEvents.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>No events yet. Press Play or Step Forward to begin.</div>
                ) : (
                  visibleEvents.map((e, i) => (
                    <motion.div
                      key={`${e.index}-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.015, 0.5) }}
                    >
                      {e.type === 'marker' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
                          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '0.1rem 0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>{e.content}</span>
                          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                        </div>
                      ) : e.type === 'error' ? (
                        <div style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#ef4444', marginBottom: '0.2rem' }}>{e.agentId}</div>
                          <div style={{ fontSize: '0.7rem', color: '#fca5a5', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{e.content}</div>
                        </div>
                      ) : (
                        <div style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', background: e.index === currentIndex ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.015)', border: e.index === currentIndex ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#60a5fa' }}>{e.agentId}</span>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>#{e.index + 1} · {e.ts}</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{e.content.slice(0, 600)}</div>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
                <div ref={eventsEndRef} />
              </div>

              {/* Live controls (for active sessions) */}
              {isLive && (
                <div style={{ display: 'flex', gap: '0.5rem', padding: '0.3rem 0' }}>
                  <button onClick={() => { try { debateEngine.pauseSession(selectedId!); } catch (e) { console.warn('[DebateReplay] pause failed:', e); } }}
                    style={btn('rgba(168,85,247,0.1)', '#a855f7')}>Pause</button>
                  <button onClick={() => { try { debateEngine.resumeSession(selectedId!); } catch (e) { console.warn('[DebateReplay] resume failed:', e); } }}
                    style={btn('rgba(34,197,94,0.1)', '#22c55e')}>Resume</button>
                  <button onClick={() => { try { debateEngine.cancelSession(selectedId!); } catch (e) { console.warn('[DebateReplay] cancel failed:', e); } }}
                    style={btn('rgba(239,68,68,0.1)', '#ef4444')}>Cancel</button>
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
