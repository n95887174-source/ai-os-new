import React, { useState, useMemo, useCallback } from 'react';
import { Search, BookOpen, Link2, Clock, Filter } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { eventBus } from '../../core/events';

interface MemoryEntry {
  sessionId: string;
  topic: string;
  timestamp: number;
  summary: string;
  conclusionType: string;
  keyArguments: string[];
}

interface DebateMemoryPanelProps {
  sessions: MemoryEntry[];
  onSelectSession?: (sessionId: string) => void;
}

export const DebateMemoryPanel: React.FC<DebateMemoryPanelProps> = ({ sessions, onSelectSession }) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const conclusionColors: Record<string, string> = {
    consensus: '#10b981',
    dominance: '#f59e0b',
    stalemate: '#ef4444',
    partial_agreement: '#8b5cf6',
    inconclusive: '#6b7280',
  };

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.topic.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.keyArguments.some(a => a.toLowerCase().includes(q))
      );
    }
    if (selectedType !== 'all') {
      result = result.filter(s => s.conclusionType === selectedType);
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [sessions, searchQuery, selectedType]);

  const relatedDebates = useMemo(() => {
    if (filteredSessions.length === 0) return [];
    const current = filteredSessions[0];
    const words = new Set(current.topic.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    return sessions
      .filter(s => s.sessionId !== current.sessionId)
      .map(s => {
        const overlap = s.topic.toLowerCase().split(/\s+/).filter(w => words.has(w)).length;
        return { ...s, relevance: overlap / Math.max(1, words.size) };
      })
      .filter(s => s.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }, [filteredSessions, sessions]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid var(--border)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <BookOpen size={18} color="#3b82f6" />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Память дебатов
        </h3>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {filteredSessions.length} сессий
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Поиск по теме, содержанию..."
            style={{
              width: '100%', padding: '6px 10px 6px 30px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-main)', fontSize: '0.8rem',
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
          <option value="all">Все типы</option>
          <option value="consensus">Консенсус</option>
          <option value="dominance">Доминирование</option>
          <option value="stalemate">Тупик</option>
          <option value="partial_agreement">Частичное согласие</option>
          <option value="inconclusive">Неопределённо</option>
        </select>
      </div>

      {relatedDebates.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            <Link2 size={12} /> Связанные дебаты
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {relatedDebates.map(d => (
              <div
                key={d.sessionId}
                onClick={() => onSelectSession?.(d.sessionId)}
                style={{
                  padding: '0.4rem 0.6rem', borderRadius: 8,
                  background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                  cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-main)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: conclusionColors[d.conclusionType] || '#6b7280',
                }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.topic}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{Math.round(d.relevance * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
        {filteredSessions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Нет сохранённых дебатов
          </div>
        )}
        {filteredSessions.map(session => (
          <div
            key={session.sessionId}
            onClick={() => onSelectSession?.(session.sessionId)}
            style={{
              padding: '0.75rem', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: conclusionColors[session.conclusionType] || '#6b7280',
              }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.topic}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={10} /> {new Date(session.timestamp).toLocaleDateString()}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {session.summary}
            </p>
            {session.keyArguments.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {session.keyArguments.slice(0, 3).map((arg, i) => (
                  <span key={i} style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {arg}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
