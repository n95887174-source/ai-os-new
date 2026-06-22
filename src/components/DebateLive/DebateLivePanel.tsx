import React, { useMemo } from 'react';
import { useDebateLiveStore } from '../../stores/debateLiveStore';
import { CircularLayout } from './CircularLayout';
import { JudgeCenter } from './JudgeCenter';
import { debateEngine } from '../../kernel/instances';

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
};

export const DebateLivePanel: React.FC = () => {
  const agentEvents = useDebateLiveStore(s => s.agentEvents);
  const streamingContent = useDebateLiveStore(s => s.streamingContent);
  const currentThinking = useDebateLiveStore(s => s.currentThinking);
  void agentEvents; // keep subscription alive

  // CRIT-8 fix: useMemo prevents creating a new array on every render,
  // which previously triggered the useEffect and could cause an infinite loop.
  const sessions = React.useMemo(() => debateEngine.getAllSessions(), []);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(
    () => sessions.length > 0 ? sessions[sessions.length - 1].id : null,
  );

  React.useEffect(() => {
    if (activeSessionId === null && sessions.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSessionId(sessions[sessions.length - 1].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, sessions.length]);

  const sessionIndex = useMemo(
    () => sessions.findIndex(s => s.id === activeSessionId),
    [sessions, activeSessionId],
  );
  const session = sessionIndex >= 0 ? sessions[sessionIndex] : null;
  const participants = session?.topology.nodes.filter(n => n.role !== 'judge') ?? [];
  const judge = session?.topology.nodes.find(n => n.role === 'judge') ?? null;

  let activeSpeakerId: string | null = null;
  if (session) {
    for (const p of participants) {
      if (streamingContent.get(`${session.id}:${p.id}`)) {
        activeSpeakerId = p.id;
        break;
      }
    }
    if (!activeSpeakerId) {
      for (const p of participants) {
        if (currentThinking.get(`${session.id}:${p.id}`)) {
          activeSpeakerId = p.id;
          break;
        }
      }
    }
  }

  return (
    <div style={containerStyle}>
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={activeSessionId ?? ''}
          onChange={e => setActiveSessionId(e.target.value || null)}
          style={{
            padding: '6px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '0.85rem',
          }}
        >
          {sessions.length === 0 && <option value="">No active debates</option>}
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.topic} (R{s.round})</option>
          ))}
        </select>
        {session && (
          <span style={{ fontSize: '0.75rem', color: '#64748b', padding: '4px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.3)' }}>
            {session.phase} · Round {session.round}
          </span>
        )}
      </div>
      {session ? (
        <>
          <CircularLayout participants={participants} activeSpeakerId={activeSpeakerId} sessionId={session.id} />
          {judge && <JudgeCenter judge={judge} sessionId={session.id} phase={session.phase} />}
        </>
      ) : (
        <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>
          No active debate sessions.<br />Start a debate to see the live view.
        </div>
      )}
    </div>
  );
};

export default DebateLivePanel;
