import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, Search, ChevronRight, Clock, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react'
import { causalTimelineService, causalScopeManager, temporalReplayService, truthConsistencyMonitor, kernel, keyStateProjection } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import { textXxsMuted, flexCenterGap8, detailGrid2, preBlockMono, sectionHeaderDebug } from '../../styles/common';
import type { CausalTraceEntry, CausalTrace, CausalScope } from '../../kernel/contracts/causal-debugger';
import type { TemporalTrace } from '../../kernel/contracts/temporal-replay'
import type { ConsistencyReport } from '../../kernel/contracts/truth-consistency';

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 12,
  padding: 16,
};

const PILL: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.15rem 0.4rem',
  borderRadius: 4,
  fontSize: '0.6rem',
  fontWeight: 600,
};

const CausalDebugger: React.FC = () => {
  const [traces, setTraces] = useState<CausalTraceEntry[]>([]);
  const [selectedCausalId, setSelectedCausalId] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<CausalTrace | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scopes, setScopes] = useState<CausalScope[]>([]);
  const [replayTrace, setReplayTrace] = useState<TemporalTrace | null>(null);
  const [replayFrame, setReplayFrame] = useState(0);
  const [replayLoading, setReplayLoading] = useState(false);
  const [consistencyReport, setConsistencyReport] = useState<ConsistencyReport | null>(null);

  const refresh = useCallback(() => {
    try {
      setTraces(causalTimelineService?.listTraces(100) ?? []);
      setScopes(causalScopeManager?.getAllScopes() ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = eventBus.on(EVENTS.DECISION, refresh);
    return () => { unsub(); };
  }, [refresh]);

  const handleSelect = useCallback((causalId: string) => {
    setSelectedCausalId(causalId);
    setReplayTrace(null);
    setReplayFrame(0);
    try {
      const trace = causalTimelineService?.getTrace(causalId);
      setSelectedTrace(trace ?? null);
    } catch {
      setSelectedTrace(null);
    }
  }, []);

  const runReplay = useCallback(() => {
    if (!selectedTrace) return;
    setReplayLoading(true);
    try {
      const result = temporalReplayService?.replay(selectedTrace.entry);
      setReplayTrace(result ?? null);
      setReplayFrame(0);
    } catch {
      setReplayTrace(null);
    }
    setReplayLoading(false);
  }, [selectedTrace]);

  const checkConsistency = useCallback(() => {
    try {
      const kState = kernel?.getState();
      const proj = keyStateProjection?.getSnapshot();
      if (!kState || !proj) { setConsistencyReport(null); return; }
      const keyMap: Record<string, unknown> = {};
      for (const k of proj) { keyMap[k.id] = k; }
      const report = truthConsistencyMonitor?.check(kState.providers, keyMap);
      setConsistencyReport(report ?? null);
      // OBS-79: emit drift events to monitoring
      if (report && (report.status === 'DRIFT' || report.status === 'CRITICAL')) {
        eventBus.emit(EVENTS.CONSISTENCY_DRIFT_DETECTED, {
          status: report.status,
          driftScore: report.driftScore,
          mismatchCount: report.mismatches.length,
          criticalCount: report.mismatches.filter(m => m.severity === 'critical').length,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      setConsistencyReport(null);
      console.warn('[CausalDebugger] Consistency check failed:', e);
    }
  }, []);

  const filtered = traces.filter(t =>
    !searchTerm || t.causalId.includes(searchTerm) || t.requestIds.some(r => r.includes(searchTerm))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', padding: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <GitBranch size={20} color="#a78bfa" />
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>Causal Debugger</span>
        <span style={textXxsMuted}>{traces.length} traces · {scopes.length} scopes</span>
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by causalId or requestId..."
          style={{
            width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Consistency check */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <button onClick={checkConsistency}
          style={{
            fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 4, border: '1px solid rgba(99,102,241,0.3)',
            background: 'rgba(99,102,241,0.08)', color: '#818cf8', cursor: 'pointer',
          }}>
          Check Consistency
        </button>
        {consistencyReport && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.65rem' }}>
            <span style={{
              padding: '0.1rem 0.35rem', borderRadius: 4,
              background: consistencyReport.status === 'OK' ? 'rgba(34,197,94,0.1)' :
                          consistencyReport.status === 'DRIFT' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              color: consistencyReport.status === 'OK' ? '#22c55e' :
                     consistencyReport.status === 'DRIFT' ? '#f59e0b' : '#ef4444',
              fontWeight: 600,
            }}>
              {consistencyReport.status}
            </span>
            <span style={{ color: '#64748b' }}>
              drift {consistencyReport.driftScore > 0.01 ? (consistencyReport.driftScore * 100).toFixed(0) + '%' : '0%'}
            </span>
            <span style={{ color: '#64748b' }}>{consistencyReport.mismatches.length} mismatch{consistencyReport.mismatches.length !== 1 ? 'es' : ''}</span>
            {consistencyReport.mismatches.length > 0 && (
              <span style={{ color: '#94a3b8' }}>
                ({consistencyReport.mismatches.filter(m => m.severity === 'critical').length} critical,
                {' '}{consistencyReport.mismatches.filter(m => m.severity === 'major').length} major)
              </span>
            )}
          </div>
        )}
        {consistencyReport && consistencyReport.mismatches.length > 0 && (
          <div style={{ fontSize: '0.6rem', display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
            {consistencyReport.mismatches.slice(0, 5).map((m, i) => (
              <div key={i} style={{ color: m.severity === 'critical' ? '#ef4444' : m.severity === 'major' ? '#f59e0b' : '#94a3b8' }}>
                {m.provider}.{m.field}: kernel={String(m.kernelValue).slice(0, 30)} proj={String(m.projectionValue).slice(0, 30)} [{m.severity}]
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedTrace ? '1fr 2fr' : '1fr', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* Trace list */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.length === 0 && (
            <div style={{ ...CARD, textAlign: 'center', padding: 24, color: '#64748b', fontSize: '0.8rem' }}>
              No traces yet — make a request and a causal trace will appear here
            </div>
          )}
          {filtered.map(t => {
            const isSelected = t.causalId === selectedCausalId;
            const scope = scopes.find(s => s.causalId === t.causalId);
            return (
              <button key={t.causalId} onClick={() => handleSelect(t.causalId)}
                style={{
                  ...CARD, padding: '0.5rem 0.75rem', cursor: 'pointer', textAlign: 'left', border: 'none',
                  background: isSelected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)',
                  borderLeft: `3px solid ${isSelected ? '#a78bfa' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <ChevronRight size={12} color="#64748b" style={{ transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0' }}>{t.causalId}</span>
                  <span style={textXxsMuted}>{t.requestIds.length} req</span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  {scope?.providerIds.slice(0, 3).map(p => (
                    <span key={p} style={{ ...PILL, background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>{p}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {selectedTrace && (
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Decision summary */}
            <div style={CARD}>
              <div style={sectionHeaderDebug}>
                Decision
              </div>
              <pre style={{ fontSize: '0.7rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace' }}>
                {JSON.stringify(selectedTrace.entry.decision, null, 2)}
              </pre>
            </div>

            {/* Before snapshots */}
              <div style={detailGrid2}>
                <div style={CARD}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    KeyState Before
                  </div>
                  <pre style={preBlockMono}>
                    {JSON.stringify(selectedTrace.entry.before.keyState.data, null, 2).slice(0, 2000)}
                  </pre>
                </div>
                <div style={CARD}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    RouterState Before
                  </div>
                  <pre style={preBlockMono}>
                    {JSON.stringify(selectedTrace.entry.before.routerState.data, null, 2).slice(0, 2000)}
                  </pre>
                </div>
              </div>

              {/* After snapshots */}
              <div style={detailGrid2}>
                <div style={CARD}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22c55e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    KeyState After
                  </div>
                  <pre style={preBlockMono}>
                    {JSON.stringify(selectedTrace.entry.after.keyState.data, null, 2).slice(0, 2000)}
                  </pre>
                </div>
                <div style={CARD}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    RouterState After
                  </div>
                  <pre style={preBlockMono}>
                    {JSON.stringify(selectedTrace.entry.after.routerState.data, null, 2).slice(0, 2000)}
                  </pre>
                </div>
              </div>

            {/* Scope */}
            {selectedTrace.scope && (
              <div style={CARD}>
                <div style={sectionHeaderDebug}>
                  Scope
                </div>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                  <div><strong>causalId:</strong> {selectedTrace.scope.causalId}</div>
                  <div><strong>requestIds:</strong> {selectedTrace.scope.requestIds.join(', ')}</div>
                  <div><strong>providers:</strong> {selectedTrace.scope.providerIds.join(', ') || '(none)'}</div>
                  <div><strong>keys:</strong> {selectedTrace.scope.keyIds.join(', ') || '(none)'}</div>
                  <div><strong>started:</strong> {new Date(selectedTrace.scope.startedAt).toISOString()}</div>
                </div>
              </div>
            )}

            {/* Temporal Replay */}
            <div style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Clock size={14} color="#22d3ee" />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Temporal Replay
                </span>
                <div style={{ marginLeft: 'auto' }}>
                  {!replayTrace && (
                    <button onClick={runReplay} disabled={replayLoading}
                      style={{
                        fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 4, border: '1px solid rgba(34,211,238,0.3)',
                        background: replayLoading ? 'rgba(34,211,238,0.05)' : 'rgba(34,211,238,0.1)',
                        color: replayLoading ? '#64748b' : '#22d3ee', cursor: replayLoading ? 'not-allowed' : 'pointer',
                      }}>
                      {replayLoading ? 'Building...' : 'Run Replay'}
                    </button>
                  )}
                  {replayTrace && (
                    <button onClick={() => { setReplayTrace(null); }}
                      style={{
                        fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: 4, border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer',
                      }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {replayTrace && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Timeline scrubber */}
                  <div style={flexCenterGap8}>
                    <Rewind size={12} color="#64748b" style={{ cursor: 'pointer' }} onClick={() => setReplayFrame(0)} />
                    <SkipBack size={12} color="#64748b" style={{ cursor: 'pointer' }} onClick={() => setReplayFrame(Math.max(0, replayFrame - 1))} />
                    <div style={{ flex: 1, position: 'relative', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, cursor: 'pointer' }}
                      onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        setReplayFrame(Math.min(replayTrace.frames.length - 1, Math.floor(pct * replayTrace.frames.length)));
                      }}>
                      {replayTrace.frames.map((f, i) => (
                        <div key={i} style={{
                          position: 'absolute', left: `${replayTrace.frames.length > 1 ? (i / (replayTrace.frames.length - 1)) * 100 : 50}%`,
                          top: 0, width: 6, height: 8, borderRadius: 3,
                          background: f.rescored ? '#22d3ee' : 'rgba(255,255,255,0.15)',
                          transform: 'translateX(-50%)',
                          ...(replayTrace.flipFrame === f.index ? { background: '#f59e0b', width: 8, height: 10, top: -1 } : {}),
                        }} />
                      ))}
                      <div style={{
                        position: 'absolute', left: `${replayTrace.frames.length > 1 ? (replayFrame / (replayTrace.frames.length - 1)) * 100 : 50}%`,
                        top: -3, width: 12, height: 14, borderRadius: 2, background: '#22d3ee',
                        transform: 'translateX(-50%)', transition: 'left 0.15s',
                      }} />
                    </div>
                    <SkipForward size={12} color="#64748b" style={{ cursor: 'pointer' }} onClick={() => setReplayFrame(Math.min(replayTrace.frames.length - 1, replayFrame + 1))} />
                    <FastForward size={12} color="#64748b" style={{ cursor: 'pointer' }} onClick={() => setReplayFrame(replayTrace.frames.length - 1)} />
                  </div>

                  {/* Frame info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={textXxsMuted}>
                      Frame {replayFrame + 1}/{replayTrace.frames.length}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                      {replayTrace.frames[replayFrame]?.event.eventName ?? '—'}
                    </span>
                    {replayTrace.flipFrame !== null && (
                      <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                        Flip: Frame {replayTrace.flipFrame + 1}
                      </span>
                    )}
                  </div>

                  {/* Score evolution at current frame */}
                  {replayTrace.frames.some(f => f.scoreState) && (() => {
                    const cf = replayTrace.frames[replayFrame];
                    if (!cf?.scoreState) return <div style={textXxsMuted}>No score data at this frame</div>;
                    const maxScore = Math.max(...Object.values(cf.scoreState.scores), 1);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8' }}>Score Evolution</div>
                        {Object.entries(cf.scoreState.scores).map(([provider, score]) => {
                          const isLeader = cf.scoreState!.ranking[0] === provider;
                          return (
                            <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem' }}>
                              <span style={{ fontWeight: 600, color: '#e2e8f0', minWidth: 70 }}>{provider}</span>
                              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                <div style={{ width: `${(score / maxScore) * 100}%`, height: '100%', borderRadius: 3,
                                  background: isLeader ? '#22d3ee' : '#3b82f6', opacity: isLeader ? 1 : 0.5 }} />
                              </div>
                              <span style={{ color: '#cbd5e1', minWidth: 50, textAlign: 'right', fontFamily: 'monospace' }}>
                                {score.toFixed(3)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Flip point info */}
                  {replayTrace.flipFrame !== null && replayFrame >= replayTrace.flipFrame && (
                    <div style={{ fontSize: '0.65rem', padding: '0.3rem 0.5rem', borderRadius: 4, background: 'rgba(245,158,11,0.08)', color: '#fbbf24' }}>
                      Flip point reached at Frame {replayTrace.flipFrame + 1} — {replayTrace.winner} took the lead
                    </div>
                  )}

                  {/* Initial leader vs winner */}
                  <div style={{ ...textXxsMuted, display: 'flex', gap: 12 }}>
                    <span>Initial leader: <strong style={{ color: '#e2e8f0' }}>{replayTrace.initialLeader || '(none)'}</strong></span>
                    <span>Final winner: <strong style={{ color: '#22d3ee' }}>{replayTrace.winner || '(none)'}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CausalDebugger;