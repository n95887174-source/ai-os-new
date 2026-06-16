import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bookmark, Search, Trash2, Tag, X, Copy, Check, ExternalLink, BookmarkPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, type EventMap } from '../kernel/events/event-bus';
import { useTranslation } from '../i18n/useTranslation';
import { storageAdapter } from '../kernel/instances';
import { ChatBookmarksService } from '../kernel/services/chat-bookmarks-service';
import type { ChatBookmark } from '../kernel/services/chat-bookmarks-service';
import { errorContainer, dismissBtnRed, textMutedXs, textSecondaryXs, flexBetween } from '../styles/common'
import { useAutoClearError } from '../hooks/useAutoClearError';
import { PanelLoading } from './PanelStates';

const bookmarksService = new ChatBookmarksService({
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => eventBus.on(event as keyof EventMap, cb as (...args: unknown[]) => void),
    emit: (event: string, data?: unknown) => eventBus.emit(event as keyof EventMap, data as EventMap[keyof EventMap]),
  },
  storage: {
    list: async () => {
      const raw = storageAdapter.getItem('chat_bookmarks_v1');
      if (!raw) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as ChatBookmark[]) : [];
      } catch {
        return [];
      }
    },
    save: async (b) => {
      const all = storageAdapter.getItem('chat_bookmarks_v1');
      const list: ChatBookmark[] = (() => {
        try { return Array.isArray(JSON.parse(all ?? '[]')) ? JSON.parse(all ?? '[]') : []; }
        catch { return []; }
      })() as ChatBookmark[];
      const filtered = list.filter(x => x.id !== b.id);
      filtered.unshift(b);
      storageAdapter.setItem('chat_bookmarks_v1', JSON.stringify(filtered.slice(0, 500)));
    },
    delete: async (id) => {
      const all = storageAdapter.getItem('chat_bookmarks_v1');
      let list: ChatBookmark[] = [];
      try { list = JSON.parse(all ?? '[]') as ChatBookmark[]; } catch { list = []; }
      storageAdapter.setItem('chat_bookmarks_v1', JSON.stringify(list.filter(x => x.id !== id)));
    },
    clear: async () => storageAdapter.removeItem('chat_bookmarks_v1'),
  },
});

void bookmarksService.init();

const BookmarksPanel: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<ChatBookmark[]>([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const isMountedRef = useRef(true);
  const clearError = useAutoClearError(setError);

  const refresh = useCallback(() => {
    const list = search.trim() ? bookmarksService.search(search) : bookmarksService.listAll();
    const filtered = activeTag ? list.filter(b => b.tags.includes(activeTag)) : list;
    setBookmarks(filtered);
  }, [search, activeTag]);

  useEffect(() => {
    isMountedRef.current = true;
    bookmarksService.init().then(() => {
      if (isMountedRef.current) {
        refresh();
        setLoading(false);
      }
    }).catch(err => {
      if (isMountedRef.current) {
        setError(String(err));
        clearError();
        setLoading(false);
      }
    });
    const unsubAdd = eventBus.on('chat:bookmark:added', () => { if (isMountedRef.current) refresh(); });
    const unsubRem = eventBus.on('chat:bookmark:removed', () => { if (isMountedRef.current) refresh(); });
    const unsubClr = eventBus.on('chat:bookmark:cleared', () => { if (isMountedRef.current) refresh(); });
    return () => {
      isMountedRef.current = false;
      unsubAdd();
      unsubRem();
      unsubClr();
    };
  }, [refresh, clearError]);

  useEffect(() => { refresh(); }, [search, activeTag, refresh]);

  const handleRemove = useCallback(async (id: string) => {
    await bookmarksService.removeBookmark(id);
  }, []);

  const handleCopy = useCallback((b: ChatBookmark) => {
    navigator.clipboard?.writeText(b.content).then(() => {
      setCopiedId(b.id);
      setTimeout(() => setCopiedId(prev => (prev === b.id ? null : prev)), 1500);
    }).catch(() => {
      setError(t('bookmarks.copy_failed'));
      clearError();
    });
  }, [t, clearError]);

  const handleClearAll = useCallback(async () => {
    if (!window.confirm(t('bookmarks.confirm_clear'))) return;
    await bookmarksService.clearAll();
  }, [t]);

  const allTags = bookmarksService.getAllTags();
  const total = bookmarksService.count();
  const filteredTags = activeTag ? allTags.filter(t => t !== activeTag) : allTags;

  if (loading) {
    return <PanelLoading />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <Bookmark size={26} color="#f59e0b" /> {t('bookmarks.title')}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('bookmarks.subtitle', { count: total })}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
            <Search size={14} style={{ marginLeft: 6, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={t('bookmarks.search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#e2e8f0', padding: '0.4rem 0.5rem', fontSize: '0.8rem', outline: 'none', width: 200 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={handleClearAll}
            disabled={total === 0}
            style={{ padding: '0.5rem 0.9rem', borderRadius: 8, border: 'none', background: total > 0 ? '#ef4444' : 'rgba(239,68,68,0.2)', color: '#fff', cursor: total > 0 ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Trash2 size={16} /> {t('bookmarks.clear_all')}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={errorContainer}>
            {error}
            <button onClick={() => setError(null)} style={dismissBtnRed}>
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <Tag size={14} color="#94a3b8" />
          <span style={{ ...textSecondaryXs, marginRight: 4 }}>{t('bookmarks.tags_label')}</span>
          {activeTag && (
            <button onClick={() => setActiveTag(null)} style={{ padding: '0.2rem 0.6rem', borderRadius: 12, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✕ {activeTag}
            </button>
          )}
          {filteredTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              style={{ padding: '0.2rem 0.6rem', borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', color: '#fbbf24', cursor: 'pointer', fontSize: '0.7rem' }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {bookmarks.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#94a3b8', textAlign: 'center' }}>
          <BookmarkPlus size={48} color="#475569" />
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>{t('bookmarks.empty')}</p>
          <p style={textMutedXs}>{t('bookmarks.empty_hint')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
          {bookmarks.map(b => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ padding: '1rem 1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}
            >
              <div style={flexBetween}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', background: b.role === 'user' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)', color: b.role === 'user' ? '#60a5fa' : '#34d399' }}>
                    {b.role}
                  </span>
                  <span style={textMutedXs}>{new Date(b.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => handleCopy(b)} style={{ background: 'transparent', border: 'none', color: copiedId === b.id ? '#10b981' : '#94a3b8', cursor: 'pointer', padding: 4 }} title={t('bookmarks.copy')}>
                    {copiedId === b.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button onClick={() => handleRemove(b.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title={t('bookmarks.remove')}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              {b.note && (
                <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', fontSize: '0.8rem', color: '#fbbf24' }}>
                  📝 {b.note}
                </div>
              )}
              <div style={{ marginTop: '0.5rem', color: '#e2e8f0', fontSize: '0.85rem', lineHeight: 1.5, maxHeight: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {b.content}
              </div>
              <div style={{ ...flexBetween, marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {b.tags.map(tag => (
                    <span key={tag} style={{ padding: '0.1rem 0.4rem', borderRadius: 8, background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '0.65rem' }}>#{tag}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: '0.7rem' }}>
                  <ExternalLink size={10} /> {b.sessionId?.slice(0, 8) ?? ''}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div style={textMutedXs}>
        {t('bookmarks.shown', { shown: bookmarks.length, total })}
      </div>
    </div>
  );
};

export default BookmarksPanel;
