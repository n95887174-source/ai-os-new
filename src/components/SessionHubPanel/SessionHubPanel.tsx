import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/chat/store';
import { useDebateSessionStore } from '../../stores/debate-session-store';
import { t } from '../../i18n/translations';

const container: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', color: '#e2e8f0', overflow: 'hidden',
};

const header: React.CSSProperties = {
  padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};

const searchInput: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 13, outline: 'none', width: 240,
};

const filterBtn: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer',
};

const filterBtnActive: React.CSSProperties = {
  ...filterBtn, background: 'rgba(59,130,246,0.2)', borderColor: '#3b82f6', color: '#60a5fa',
};

const card: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6,
};

const badge: React.CSSProperties = {
  fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 600, textTransform: 'uppercase',
};

const emptyState: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  height: '100%', color: '#64748b', gap: 16,
};

type SessionItem = {
  id: string; type: 'chat' | 'debate'; title: string; status: string;
  updatedAt: number; tags: string[]; folder?: string;
  preview?: string; linkedCount: number; linkedId?: string;
};

export const SessionHubPanel: React.FC = () => {
  const navigate = useNavigate();
  const chatSessions = useChatStore(s => s.sessions);
  const debateMeta = useDebateSessionStore(s => s.sessions);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'chat' | 'debate'>('all');

  const items = useMemo((): SessionItem[] => {
    const result: SessionItem[] = [];
    for (const s of chatSessions) {
      const last = s.history[s.history.length - 1];
      const preview = last ? (last.role === 'user' ? last.text : last.responses?.[0]?.content || last.text) : '';
      result.push({
        id: s.id, type: 'chat', title: s.title, status: s.isArchived ? 'archived' : 'active',
        updatedAt: s.updatedAt ?? s.createdAt, tags: s.tags ?? [], folder: s.folder,
        preview: preview.slice(0, 100), linkedCount: s.linkedDebateId ? 1 : 0,
        linkedId: s.linkedDebateId,
      });
    }
    for (const s of debateMeta) {
      result.push({
        id: s.id, type: 'debate', title: s.topic, status: s.isArchived ? 'archived' : s.phase,
        updatedAt: s.updatedAt, tags: s.tags, folder: s.folder,
        preview: `R${s.round} · ${s.participants.length} agents · ${s.strategy}`,
        linkedCount: s.linkedSessionIds.length,
        linkedId: s.linkedSessionIds[0],
      });
    }
    result.sort((a, b) => b.updatedAt - a.updatedAt);
    return result;
  }, [chatSessions, debateMeta]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== 'all') list = list.filter(i => i.type === filter);
    if (search) { const q = search.toLowerCase(); list = list.filter(i => i.title.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q))); }
    return list;
  }, [items, filter, search]);

  const handleOpen = useCallback((item: SessionItem) => {
    if (item.type === 'chat') navigate(`/chat?session=${item.id}`);
    else navigate(`/debate-runtime?sessionId=${item.id}`);
  }, [navigate]);

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Session Hub</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={searchInput} placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: 'flex', gap: 4 }}>{(['all', 'chat', 'debate'] as const).map(f => (
            <button key={f} style={filter === f ? filterBtnActive : filterBtn} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'chat' ? '💬 Chats' : '🗣️ Debates'}
            </button>
          ))}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {filtered.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>📋</div>
            <div style={{ fontSize: 16 }}>No sessions found</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {filtered.map(item => (
              <div key={`${item.type}-${item.id}`} style={card} onClick={() => handleOpen(item)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                  <span style={{
                    ...badge,
                    background: item.type === 'chat' ? 'rgba(16,185,129,0.2)' : 'rgba(139,92,246,0.2)',
                    color: item.type === 'chat' ? '#34d399' : '#a78bfa',
                  }}>{item.type}</span>
                </div>
                {item.preview && <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.preview}</div>}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, color: '#64748b' }}>
                  <span style={{
                    ...badge, background: item.status === 'active' ? 'rgba(34,197,94,0.2)' :
                      item.status === 'archived' ? 'rgba(100,116,139,0.2)' : 'rgba(245,158,11,0.2)',
                    color: item.status === 'active' ? '#22c55e' : item.status === 'archived' ? '#94a3b8' : '#f59e0b',
                  }}>{item.status}</span>
                  <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                  {item.folder && <span>📁 {item.folder}</span>}
                  {item.linkedCount > 0 && item.linkedId && (
                    <span
                      style={{ color: '#8b5cf6', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(item.type === 'chat' ? `/debate-runtime?sessionId=${item.linkedId}` : `/chat?session=${item.linkedId}`);
                      }}
                      title={item.type === 'chat' ? 'Open linked debate' : 'Open linked chat'}
                    >🔗 {item.linkedCount}</span>
                  )}
                </div>
                {item.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {item.tags.map(t => <span key={t} style={{ padding: '1px 6px', borderRadius: 6, fontSize: 10, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '8px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#64748b' }}>
        {items.length} total sessions · {items.filter(i => i.type === 'chat').length} chats · {items.filter(i => i.type === 'debate').length} debates
      </div>
    </div>
  );
};

export default SessionHubPanel;
