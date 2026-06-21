import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Lightbulb, Plus, X, Trash2, Zap, BookOpen, Route, Shield, ChevronDown, ChevronRight, MessageCircle, Search, ThumbsUp, ThumbsDown, Play, Edit3, ExternalLink, List, Clock } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hypothesisService } from '../../kernel/instances';
import { useTranslation } from '../../i18n/useTranslation';
import { useConfirm } from '../../hooks/useConfirm';
import type { ResearchHypothesis, HypothesisCategory, HypothesisStatus } from '../../kernel/types/research-types';

const CATEGORY_CONFIG: Record<HypothesisCategory, { icon: React.ReactNode; color: string; labelKey: string }> = {
  arch: { icon: <Zap size={14} />, color: '#a855f7', labelKey: 'hypothesis_generator.category_arch' },
  prompt: { icon: <BookOpen size={14} />, color: '#3b82f6', labelKey: 'hypothesis_generator.category_prompt' },
  routing: { icon: <Route size={14} />, color: '#f59e0b', labelKey: 'hypothesis_generator.category_routing' },
  gov: { icon: <Shield size={14} />, color: '#10b981', labelKey: 'hypothesis_generator.category_gov' },
};

const STATUS_CONFIG: Record<HypothesisStatus, { color: string; labelKey: string; nextStates: HypothesisStatus[] }> = {
  proposed: { color: '#64748b', labelKey: 'hypothesis_generator.status_proposed', nextStates: ['active'] },
  active: { color: '#3b82f6', labelKey: 'hypothesis_generator.status_active', nextStates: ['debating'] },
  debating: { color: '#a855f7', labelKey: 'hypothesis_generator.status_debating', nextStates: ['accepted', 'rejected'] },
  accepted: { color: '#10b981', labelKey: 'hypothesis_generator.status_accepted', nextStates: [] },
  rejected: { color: '#ef4444', labelKey: 'hypothesis_generator.status_rejected', nextStates: [] },
};

type FilterTab = 'all' | HypothesisCategory;

const HypothesisGenerator: React.FC = () => {
  const { t } = useTranslation();
  const { confirm, ConfirmDialog } = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hypotheses, setHypotheses] = useState<ResearchHypothesis[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [statusFilter, setStatusFilter] = useState<HypothesisStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEvidence, setEditingEvidence] = useState<string | null>(null);
  const [evidenceInput, setEvidenceInput] = useState('');
  const [formData, setFormData] = useState<{ title: string; description: string; category: HypothesisCategory; sourceFile: string }>({
    title: '', description: '', category: 'arch', sourceFile: '',
  });

  useEffect(() => {
    const source = searchParams.get('source');
    if (source) {
      setSourceFile(source);
      const title = searchParams.get('title') || '';
      setFormData(p => ({ ...p, sourceFile: source, title: title }));
      setShowForm(true);
      window.history.replaceState({}, '', '/hypothesis-gen');
    }
  }, [searchParams]);

  const refresh = useCallback(() => {
    setHypotheses(hypothesisService.getAll());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!formData.description.trim()) return;
    await hypothesisService.propose({
      title: formData.title.trim() || undefined,
      description: formData.description.trim(),
      category: formData.category,
      sourceFile: formData.sourceFile.trim() || undefined,
    });
    setFormData({ title: '', description: '', category: 'arch', sourceFile: '' });
    setShowForm(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: 'Delete Hypothesis', message: 'Are you sure you want to delete this hypothesis?', variant: 'danger' })) return;
    await hypothesisService.remove(id);
    refresh();
  };

  const handleStatusChange = async (id: string, newStatus: HypothesisStatus) => {
    await hypothesisService.setStatus(id, newStatus);
    refresh();
  };

  const handleAddEvidence = async (id: string) => {
    if (!evidenceInput.trim()) return;
    const h = hypotheses.find(x => x.id === id);
    if (!h) return;
    await hypothesisService.update(id, {
      evidenceRefs: [...h.evidenceRefs, evidenceInput.trim()],
    });
    setEvidenceInput('');
    setEditingEvidence(null);
    refresh();
  };

  const handleRemoveEvidence = async (id: string, idx: number) => {
    const h = hypotheses.find(x => x.id === id);
    if (!h) return;
    await hypothesisService.update(id, {
      evidenceRefs: h.evidenceRefs.filter((_, i) => i !== idx),
    });
    refresh();
  };

  const startDebate = (hypothesis: ResearchHypothesis) => {
    const thesis = encodeURIComponent(`${hypothesis.title}: ${hypothesis.description.slice(0, 200)}`);
    navigate(`/debate?thesis=${thesis}&hypothesisId=${encodeURIComponent(hypothesis.id)}`);
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = hypotheses;
    if (filterTab !== 'all') list = list.filter(h => h.category === filterTab);
    if (statusFilter !== 'all') list = list.filter(h => h.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(h => h.title.toLowerCase().includes(q) || h.description.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [hypotheses, filterTab, statusFilter, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: hypotheses.length };
    for (const cat of Object.keys(CATEGORY_CONFIG)) {
      counts[cat] = hypotheses.filter(h => h.category === cat).length;
    }
    return counts;
  }, [hypotheses]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: hypotheses.length };
    for (const st of Object.keys(STATUS_CONFIG)) {
      counts[st] = hypotheses.filter(h => h.status === st).length;
    }
    return counts;
  }, [hypotheses]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  const tabStyle = (active: boolean, color: string): React.CSSProperties => ({
    padding: '0.35rem 0.7rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 5,
    background: active ? `${color}18` : 'transparent',
    color: active ? color : '#64748b',
    transition: 'all 0.15s',
  });

  const statusBtnStyle = (status: HypothesisStatus): React.CSSProperties => ({
    padding: '0.3rem 0.6rem', borderRadius: 5, border: `1px solid ${STATUS_CONFIG[status].color}40`,
    background: `${STATUS_CONFIG[status].color}12`, color: STATUS_CONFIG[status].color,
    cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem 0.6rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lightbulb size={18} color="#f59e0b" />
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>{t('hypothesis_generator.title')}</span>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{hypotheses.length} total</span>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: '0.45rem 0.9rem', borderRadius: 7, border: 'none', background: '#f59e0b', color: '#1e293b', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={13} /> {t('hypothesis_generator.new')}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setFilterTab('all')} style={tabStyle(filterTab === 'all', '#8b5cf6')}>
          <List size={13} /> All <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({categoryCounts.all})</span>
        </button>
        {(Object.entries(CATEGORY_CONFIG) as [HypothesisCategory, typeof CATEGORY_CONFIG['arch']][]).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterTab(key)} style={tabStyle(filterTab === key, cfg.color)}>
            {cfg.icon} {t(cfg.labelKey)} <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>({categoryCounts[key]})</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 3 }}>
          {(Object.keys(STATUS_CONFIG) as HypothesisStatus[]).map(st => (
            <button key={st} onClick={() => setStatusFilter(statusFilter === st ? 'all' : st)}
              style={{
                ...tabStyle(statusFilter === st, STATUS_CONFIG[st].color), fontSize: '0.68rem', padding: '0.2rem 0.5rem',
              }}
            >{statusCounts[st]}</button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0.4rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '4px 8px' }}>
          <Search size={12} color="#64748b" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search hypotheses..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.78rem' }} />
          {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={11} /></button>}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <Lightbulb size={40} opacity={0.25} style={{ marginBottom: '0.75rem' }} />
            <div style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>{t('hypothesis_generator.empty')}</div>
          </div>
        ) : (
          filtered.map(h => {
            const isExpanded = expanded.has(h.id);
            const cfg = CATEGORY_CONFIG[h.category];
            const stCfg = STATUS_CONFIG[h.status];
            return (
              <div key={h.id} style={{ marginBottom: '0.6rem', borderRadius: 10, border: `1px solid ${isExpanded ? `${stCfg.color}25` : 'rgba(255,255,255,0.04)'}`, background: isExpanded ? `rgba(0,0,0,0.15)` : 'rgba(255,255,255,0.015)', overflow: 'hidden', transition: 'all 0.15s' }}>
                {/* Header row */}
                <div style={{ padding: '0.6rem 0.85rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                  onClick={() => toggleExpand(h.id)} onKeyDown={(e) => { if (e.key === 'Enter') toggleExpand(h.id); }} role="button" tabIndex={0}>
                  {isExpanded ? <ChevronDown size={12} color="#64748b" /> : <ChevronRight size={12} color="#64748b" />}
                  <span style={{ color: cfg.color, display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: 4, background: `${cfg.color}15` }}>
                    {cfg.icon}{t(cfg.labelKey)}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.title}</span>
                  <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: 999, fontWeight: 600, background: `${stCfg.color}18`, color: stCfg.color, whiteSpace: 'nowrap' }}>
                    {t(stCfg.labelKey)}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#475569', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={10} />{formatDate(h.createdAt)}
                  </span>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '0 0.85rem 0.75rem 2.1rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.6rem' }}>
                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>{h.description}</p>

                    {/* Source + evidence */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: '0.6rem', fontSize: '0.72rem', color: '#64748b' }}>
                      {h.sourceFile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <ExternalLink size={11} />
                          <span onClick={() => navigate(`/project-os?file=${encodeURIComponent(h.sourceFile!)}`)}
                            style={{ color: '#60a5fa', fontFamily: 'monospace', cursor: 'pointer', textDecoration: 'none', borderBottom: '1px dashed rgba(96,165,250,0.3)' }}>{h.sourceFile}</span>
                        </div>
                      )}
                      {h.linkedDebateId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <MessageCircle size={11} color="#a855f7" />
                          <span style={{ color: '#a855f7' }}>Debate: {h.linkedDebateId}</span>
                        </div>
                      )}

                      {/* Evidence refs */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.7rem' }}>Evidence:</span>
                          <button onClick={() => setEditingEvidence(editingEvidence === h.id ? null : h.id)}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.68rem', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Edit3 size={10} /> {editingEvidence === h.id ? 'Done' : 'Edit'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {h.evidenceRefs.map((ref, i) => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '0.1rem 0.35rem', borderRadius: 3, background: 'rgba(59,130,246,0.08)', color: '#60a5fa', fontSize: '0.68rem', fontFamily: 'monospace' }}>
                              {ref}
                              {editingEvidence === h.id && (
                                <button onClick={() => handleRemoveEvidence(h.id, i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: '0.65rem' }}><X size={9} /></button>
                              )}
                            </span>
                          ))}
                          {editingEvidence === h.id && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <input type="text" value={evidenceInput} onChange={e => setEvidenceInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddEvidence(h.id); }} placeholder="Add ref..." style={{ width: 120, padding: '0.1rem 0.35rem', borderRadius: 3, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '0.68rem', outline: 'none' }} />
                              <button onClick={() => handleAddEvidence(h.id)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: 1 }}><Plus size={10} /></button>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Status transition buttons */}
                      {stCfg.nextStates.map(next => (
                        <button key={next} onClick={(e) => { e.stopPropagation(); handleStatusChange(h.id, next); }} style={statusBtnStyle(next)}>
                          {next === 'active' ? <Play size={11} /> : next === 'debating' ? <MessageCircle size={11} /> : next === 'accepted' ? <ThumbsUp size={11} /> : <ThumbsDown size={11} />}
                          {t(STATUS_CONFIG[next].labelKey)}
                        </button>
                      ))}

                      {/* Start debate button */}
                      {h.status === 'active' && (
                        <button onClick={(e) => { e.stopPropagation(); startDebate(h); }} style={{ ...statusBtnStyle('debating'), marginLeft: 4 }}>
                          <MessageCircle size={11} /> {t('hypothesis_generator.start_debate')}
                        </button>
                      )}

                      {/* Delete */}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(h.id); }}
                        style={{ marginLeft: 'auto', padding: '0.3rem 0.6rem', borderRadius: 5, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Trash2 size={11} /> {t('hypothesis_generator.delete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Hypothesis Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowForm(false)} onKeyDown={(e) => { if (e.key === 'Escape') setShowForm(false); }}>
          <div style={{ width: 500, maxWidth: '92vw', background: '#1e293b', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lightbulb size={16} color="#f59e0b" /> {t('hypothesis_generator.new')}
              </span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 3 }}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>{t('hypothesis_generator.form_title')} *</label>
                <input type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Split debate-service.ts into modules"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 7, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>{t('hypothesis_generator.form_description')} *</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the hypothesis, its expected impact, and the evidence that supports it..."
                  style={{ width: '100%', height: 90, padding: '0.55rem 0.75rem', borderRadius: 7, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '0.82rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>{t('hypothesis_generator.form_category')}</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(Object.entries(CATEGORY_CONFIG) as [HypothesisCategory, typeof CATEGORY_CONFIG['arch']][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => setFormData(p => ({ ...p, category: key }))}
                      style={{
                        flex: 1, padding: '0.5rem', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        background: formData.category === key ? `${cfg.color}20` : 'rgba(0,0,0,0.2)',
                        border: formData.category === key ? `1px solid ${cfg.color}40` : '1px solid rgba(255,255,255,0.06)',
                        color: formData.category === key ? cfg.color : '#64748b',
                      }}>
                      {cfg.icon} {t(cfg.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Source File</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="text" value={formData.sourceFile} onChange={e => setFormData(p => ({ ...p, sourceFile: e.target.value }))}
                    placeholder="src/kernel/services/..."
                    style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: 7, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
                  {formData.sourceFile && (
                    <button onClick={() => navigate(`/project-os?file=${encodeURIComponent(formData.sourceFile)}`)}
                      style={{ padding: '0.55rem 0.7rem', borderRadius: 7, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#a855f7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
                      Open <ExternalLink size={12} />
                    </button>
                  )}
                </div>
                {sourceFile && (
                  <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.5rem', borderRadius: 5, background: 'rgba(168,85,247,0.08)', fontSize: '0.68rem', color: '#a855f7' }}>
                    <ExternalLink size={10} /> Pre-filled from Project OS Explorer
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: '0.55rem 1.1rem', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>{t('hypothesis_generator.cancel')}</button>
              <button onClick={() => void handleCreate()} disabled={!formData.description.trim()}
                style={{ padding: '0.55rem 1.1rem', borderRadius: 7, border: 'none', background: formData.description.trim() ? '#f59e0b' : '#475569', color: formData.description.trim() ? '#1e293b' : '#94a3b8', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={13} /> {t('hypothesis_generator.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
};

export default HypothesisGenerator;
