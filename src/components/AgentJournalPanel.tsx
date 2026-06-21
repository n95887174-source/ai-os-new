import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Trash2, X, Search, Tag, Clock, Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n/useTranslation';
import { eventBus, type EventMap } from '../kernel/events/event-bus';
import { storageAdapter } from '../kernel/instances';
import { AgentJournalService } from '../kernel/services/agent-journal-service';
import type { JournalEntry } from '../kernel/services/agent-journal-service';
import { errorContainer, dismissBtnRed, textMutedXs, textSecondaryXs, textWhiteXs } from '../styles/common';
import { useConfirm } from '../hooks/useConfirm';

const service = new AgentJournalService({
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => eventBus.on(event as keyof EventMap, cb as (...args: unknown[]) => void),
    emit: (event: string, data?: unknown) => eventBus.emit(event as keyof EventMap, data as EventMap[keyof EventMap]),
  },
  storage: {
    list: async () => {
      const raw = storageAdapter.getItem('agent_journal_v1');
      if (!raw) return [];
      try { return JSON.parse(raw) as JournalEntry[]; } catch { return []; }
    },
    save: async (e) => {
      const raw = storageAdapter.getItem('agent_journal_v1');
      let list: JournalEntry[];
      try { list = JSON.parse(raw ?? '[]') as JournalEntry[]; } catch { list = []; }
      list = [e, ...list.filter(x => x.id !== e.id)].slice(0, 1000);
      storageAdapter.setItem('agent_journal_v1', JSON.stringify(list));
    },
    delete: async (id) => {
      const raw = storageAdapter.getItem('agent_journal_v1');
      let list: JournalEntry[];
      try { list = JSON.parse(raw ?? '[]') as JournalEntry[]; } catch { list = []; }
      storageAdapter.setItem('agent_journal_v1', JSON.stringify(list.filter(x => x.id !== id)));
    },
    clear: async () => storageAdapter.removeItem('agent_journal_v1'),
  },
});
void service.init();

const OUTCOME_COLORS: Record<JournalEntry['outcome'], string> = {
  success: '#10b981',
  failure: '#ef4444',
  partial: '#f59e0b',
  in_progress: '#3b82f6',
};

const AgentJournalPanel: React.FC = () => {
  const { t } = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    agentId: '',
    agentName: '',
    taskType: 'general',
    taskDescription: '',
    outcome: 'success' as JournalEntry['outcome'],
    durationMs: 0,
    tokensUsed: 0,
    notes: '',
    tags: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const refresh = useCallback(() => {
    const list = search.trim() ? service.search(search) : service.listAll();
    let filtered = list;
    if (activeTag) filtered = filtered.filter(e => e.tags.includes(activeTag));
    if (activeAgent) filtered = filtered.filter(e => e.agentId === activeAgent);
    setEntries(filtered);
  }, [search, activeTag, activeAgent]);

  useEffect(() => {
    isMountedRef.current = true;
    service.init().then(() => {
      if (isMountedRef.current) {
        refresh();
        setLoading(false);
      }
    }).catch(err => {
      if (isMountedRef.current) {
        setError(String(err));
        setLoading(false);
      }
    });
    const unsub1 = eventBus.on('agent:journal:added', () => { if (isMountedRef.current) refresh(); });
    const unsub2 = eventBus.on('agent:journal:removed', () => { if (isMountedRef.current) refresh(); });
    const unsub3 = eventBus.on('agent:journal:cleared', () => { if (isMountedRef.current) refresh(); });
    return () => {
      isMountedRef.current = false;
      unsub1(); unsub2(); unsub3();
    };
  }, [refresh]);

  useEffect(() => { refresh(); }, [search, activeTag, activeAgent, refresh]);

  const handleAdd = useCallback(async () => {
    if (!newEntry.agentId.trim() || !newEntry.taskDescription.trim()) {
      setError(t('agent_journal.required_fields'));
      return;
    }
    try {
      await service.record({
        agentId: newEntry.agentId.trim(),
        agentName: newEntry.agentName.trim() || newEntry.agentId.trim(),
        taskType: newEntry.taskType,
        taskDescription: newEntry.taskDescription,
        outcome: newEntry.outcome,
        durationMs: newEntry.durationMs,
        tokensUsed: newEntry.tokensUsed,
        notes: newEntry.notes || undefined,
        tags: newEntry.tags.split(',').map(s => s.trim()).filter(Boolean),
      });
      setNewEntry({ agentId: '', agentName: '', taskType: 'general', taskDescription: '', outcome: 'success', durationMs: 0, tokensUsed: 0, notes: '', tags: '' });
      setShowAddForm(false);
    } catch (err) {
      setError(String(err));
    }
  }, [newEntry, t]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Delete this journal entry?')) return;
    await service.remove(id);
  }, []);

  const handleClear = useCallback(async () => {
    if (!await confirm({ title: 'Clear Agent Journal', message: t('agent_journal.confirm_clear'), variant: 'danger' })) return;
    await service.clear();
  }, [t, confirm]);

  const allTags = service.getAllTags();
  const totalEntries = service.count();

  const stats = React.useMemo(() => {
    if (entries.length === 0) return { success: 0, failure: 0, partial: 0, inProgress: 0, totalDuration: 0, totalTokens: 0 };
    return {
      success: entries.filter(e => e.outcome === 'success').length,
      failure: entries.filter(e => e.outcome === 'failure').length,
      partial: entries.filter(e => e.outcome === 'partial').length,
      inProgress: entries.filter(e => e.outcome === 'in_progress').length,
      totalDuration: entries.reduce((s, e) => s + e.durationMs, 0),
      totalTokens: entries.reduce((s, e) => s + e.tokensUsed, 0),
    };
  }, [entries]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', overflow: 'auto' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <BookOpen size={26} color="#8b5cf6" /> {t('agent_journal.title')}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('agent_journal.subtitle', { count: totalEntries })}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowAddForm(s => !s)} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
            <Plus size={14} /> {t('agent_journal.add')}
          </button>
          <button onClick={handleClear} disabled={totalEntries === 0} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: totalEntries > 0 ? '#ef4444' : 'rgba(239,68,68,0.2)', color: '#fff', cursor: totalEntries > 0 ? 'pointer' : 'not-allowed', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={14} /> {t('agent_journal.clear_all')}
          </button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={errorContainer}>
          {error}
          <button onClick={() => setError(null)} style={dismissBtnRed}><X size={18} /></button>
        </motion.div>
      )}

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ padding: '1rem', borderRadius: 12, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.05)' }}
          >
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#c4b5fd', margin: '0 0 0.75rem' }}>{t('agent_journal.add_new')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input
                value={newEntry.agentId}
                onChange={e => setNewEntry(p => ({ ...p, agentId: e.target.value }))}
                placeholder={t('agent_journal.agent_id')}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
              />
              <input
                value={newEntry.agentName}
                onChange={e => setNewEntry(p => ({ ...p, agentName: e.target.value }))}
                placeholder={t('agent_journal.agent_name')}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
              />
              <select
                value={newEntry.taskType}
                onChange={e => setNewEntry(p => ({ ...p, taskType: e.target.value }))}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
              >
                {['general', 'code', 'analysis', 'creative', 'research', 'debug', 'review'].map(t2 => (
                  <option key={t2} value={t2}>{t2}</option>
                ))}
              </select>
              <select
                value={newEntry.outcome}
                onChange={e => setNewEntry(p => ({ ...p, outcome: e.target.value as JournalEntry['outcome'] }))}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
              >
                <option value="success">success</option>
                <option value="failure">failure</option>
                <option value="partial">partial</option>
                <option value="in_progress">in_progress</option>
              </select>
              <input
                value={newEntry.taskDescription}
                onChange={e => setNewEntry(p => ({ ...p, taskDescription: e.target.value }))}
                placeholder={t('agent_journal.task_desc')}
                style={{ gridColumn: '1 / -1', padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
              />
              <input
                type="number"
                value={newEntry.durationMs || ''}
                onChange={e => setNewEntry(p => ({ ...p, durationMs: Number(e.target.value) || 0 }))}
                placeholder={t('agent_journal.duration_ms')}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
              />
              <input
                type="number"
                value={newEntry.tokensUsed || ''}
                onChange={e => setNewEntry(p => ({ ...p, tokensUsed: Number(e.target.value) || 0 }))}
                placeholder={t('agent_journal.tokens')}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
              />
              <input
                value={newEntry.tags}
                onChange={e => setNewEntry(p => ({ ...p, tags: e.target.value }))}
                placeholder={t('agent_journal.tags_csv')}
                style={{ gridColumn: '1 / -1', padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
              />
              <textarea
                value={newEntry.notes}
                onChange={e => setNewEntry(p => ({ ...p, notes: e.target.value }))}
                placeholder={t('agent_journal.notes')}
                style={{ gridColumn: '1 / -1', padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem', minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: '0.75rem' }}>
              <button onClick={handleAdd} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                {t('agent_journal.save')}
              </button>
              <button onClick={() => setShowAddForm(false)} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}>
                {t('agent_journal.cancel')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        <StatMini icon={<CheckCircle2 size={14} color="#10b981" />} label={t('agent_journal.success')} value={stats.success} color="#10b981" />
        <StatMini icon={<AlertCircle size={14} color="#ef4444" />} label={t('agent_journal.failure')} value={stats.failure} color="#ef4444" />
        <StatMini icon={<Clock size={14} color="#3b82f6" />} label={t('agent_journal.total_duration')} value={`${(stats.totalDuration / 1000).toFixed(1)}s`} color="#3b82f6" />
        <StatMini icon={<Zap size={14} color="#f59e0b" />} label={t('agent_journal.total_tokens')} value={stats.totalTokens.toLocaleString()} color="#f59e0b" />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 8, color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('agent_journal.search_placeholder')}
            style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 28px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
          />
        </div>
        {activeAgent && (
          <button onClick={() => setActiveAgent(null)} style={{ padding: '0.2rem 0.6rem', borderRadius: 12, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.7rem' }}>
            ✕ {activeAgent}
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tag size={12} color="#94a3b8" />
          {allTags.slice(0, 20).map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(prev => prev === tag ? null : tag)}
              style={{ padding: '0.1rem 0.5rem', borderRadius: 10, border: `1px solid ${activeTag === tag ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`, background: activeTag === tag ? 'rgba(139,92,246,0.2)' : 'transparent', color: activeTag === tag ? '#c4b5fd' : '#94a3b8', cursor: 'pointer', fontSize: '0.65rem' }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
        {entries.map(e => {
          const stats2 = service.getAgentStats(e.agentId);
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ padding: '0.1rem 0.5rem', borderRadius: 6, background: `${OUTCOME_COLORS[e.outcome]}20`, color: OUTCOME_COLORS[e.outcome], fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>{e.outcome}</span>
                  <span style={{ ...textWhiteXs, fontSize: '0.85rem' }}>{e.agentName}</span>
                  <span style={{ ...textMutedXs, fontSize: '0.7rem' }}>· {e.taskType}</span>
                  <span style={textMutedXs}>· {new Date(e.timestamp).toLocaleString()}</span>
                </div>
                <div style={{ ...textSecondaryXs, marginTop: 4, fontSize: '0.8rem' }}>{e.taskDescription}</div>
                {e.notes && <div style={{ ...textMutedXs, marginTop: 2, fontStyle: 'italic' }}>{e.notes}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {e.tags.map(tag => (
                    <span key={tag} style={{ padding: '0.05rem 0.4rem', borderRadius: 8, background: 'rgba(139,92,246,0.1)', color: '#c4b5fd', fontSize: '0.6rem' }}>#{tag}</span>
                  ))}
                  <span style={{ ...textMutedXs, fontSize: '0.65rem' }}>⏱ {(e.durationMs / 1000).toFixed(1)}s · {e.tokensUsed} tokens</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button onClick={() => setActiveAgent(e.agentId)} style={{ padding: '0.2rem 0.5rem', borderRadius: 6, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)', color: '#93c5fd', cursor: 'pointer', fontSize: '0.7rem' }} title={t('agent_journal.filter_by_agent')}>
                  {stats2.totalTasks} {t('agent_journal.total_tasks')}
                </button>
                <button onClick={() => handleDelete(e.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} aria-label="Delete journal entry">
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
        {entries.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <BookOpen size={48} color="#475569" />
            <p style={{ marginTop: '1rem' }}>{t('agent_journal.empty')}</p>
          </div>
        )}
      </div>
      <ConfirmDialog />
    </div>
  );
};

const StatMini: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: `1px solid ${color}20`, background: `linear-gradient(145deg, ${color}05, rgba(0,0,0,0.2))` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>{icon}<span style={{ ...textMutedXs, fontSize: '0.65rem' }}>{label}</span></div>
    <div style={{ ...textWhiteXs, fontSize: '1.1rem', fontWeight: 700, color }}>{value}</div>
  </div>
);

export default AgentJournalPanel;
