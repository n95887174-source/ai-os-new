import React, { useState, useEffect, useCallback } from 'react';
import { Plus, MessageCircle, Trash2, Play, Bot, Activity, Clock, Loader2 } from 'lucide-react';
import { debateWorkspace, runtime } from '../../kernel/instances';
import { useTranslation } from '../../i18n/useTranslation';
import type { WorkspaceRoomEntry } from '../../kernel/services/debate-runtime/debate-workspace';
import { useNavigate } from 'react-router-dom';

const PHASE_COLORS: Record<string, string> = {
  created: '#64748b', queued: '#94a3b8', initializing: '#3b82f6',
  active: '#22c55e', paused: '#f59e0b', deliberating: '#a855f7',
  consensus: '#f59e0b', summarizing: '#06b6d4', completed: '#22c55e',
  failed: '#ef4444', cancelled: '#64748b',
};

const DebateWorkspacePanel: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<WorkspaceRoomEntry[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const tryRefresh = useCallback(() => {
    try {
      const index = debateWorkspace.getIndex();
      const exists = index && Array.isArray(index.rooms);
      if (!exists) return;
      try {
        debateWorkspace.syncFromEngine();
      } catch (e) {
        setError('Sync failed: ' + String(e));
      }
      setRooms(debateWorkspace.listRooms());
      setReady(true);
    } catch {
      // runtime not ready yet
    }
  }, []);

  useEffect(() => {
    const check = () => {
      if (runtime.isReady()) {
        tryRefresh();
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  }, [tryRefresh]);

  const createRoom = useCallback(async () => {
    if (!newTopic.trim()) return;
    try {
      await debateWorkspace.createRoom(newTopic.trim());
      setNewTopic('');
      tryRefresh();
    } catch (e) {
      setError(String(e));
    }
  }, [newTopic, tryRefresh]);

  const openRoom = useCallback((roomId: string) => {
    debateWorkspace.setActiveRoom(roomId);
    navigate('/debate');
  }, [navigate]);

  const deleteRoom = useCallback(async (roomId: string) => {
    await debateWorkspace.closeRoom(roomId);
    tryRefresh();
  }, [tryRefresh]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (!ready) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748b' }}>
        <Loader2 size={20} className="spinning" />
        Initializing workspace...
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <MessageCircle size={24} color="#a855f7" />
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Debate Rooms</h2>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={newTopic}
          onChange={e => setNewTopic(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') createRoom(); }}
          placeholder="New debate topic..."
          style={{
            flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(100,116,139,0.3)',
            background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none',
          }}
        />
        <button onClick={createRoom} disabled={!newTopic.trim()} style={{
          padding: '0.5rem 1rem', borderRadius: 8, border: 'none', background: newTopic.trim() ? '#a855f7' : '#334155',
          color: '#fff', cursor: newTopic.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600,
        }}>
          <Plus size={16} /> Create Room
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rooms.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem', flexDirection: 'column', gap: 8 }}>
            <Bot size={48} opacity={0.3} />
            <span>No debate rooms yet. Create one above.</span>
          </div>
        ) : rooms.map(room => (
          <div key={room.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem',
            borderRadius: 10, background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(100,116,139,0.15)',
            transition: 'all 0.2s',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: PHASE_COLORS[room.status] || '#64748b', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{room.topic}</div>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Activity size={12} /> {room.status}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {formatDate(room.createdAt)}
                </span>
              </div>
            </div>
            <button onClick={() => openRoom(room.id)} style={{
              padding: '0.35rem 0.75rem', borderRadius: 6, border: '1px solid rgba(168,85,247,0.3)',
              background: 'rgba(168,85,247,0.1)', color: '#a855f7', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600,
            }}>
              <Play size={14} /> Open
            </button>
            <button onClick={() => deleteRoom(room.id)} style={{
              padding: '0.35rem', borderRadius: 6, border: 'none',
              background: 'transparent', color: '#64748b', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebateWorkspacePanel;
