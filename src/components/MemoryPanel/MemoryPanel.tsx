import React, { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Database, Search, Clock, 
  Trash2, Download, Zap,
  Tag, Brain, Calendar, Network,
  Target, Code, AlertTriangle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { memoryService } from '../../kernel/instances';
import type { MemoryEntry } from '../../types/memory';
import { eventBus } from '../../kernel/events/event-bus';
import { CONFIG } from '../../kernel/services/config-registry';
import { configService } from '../../kernel/instances';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import {
  flexGap3,
  pageSubtitleMuted,
  pageTitleLarge,
  positionRelativeFlex1,
  progressBarSmall,
  progressLabel,
  searchIconAbsolute,
  searchInputLarge,
  sectionHeaderBottom,
  sectionPanelTitle,
  statBox,
} from '../../styles/common';

const MemoryPanel: React.FC = () => {
  const [memories, setMemories] = useState<MemoryEntry[]>(() => memoryService.getMemories());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeCollection, setActiveCollection] = useState<'long_term' | 'ephemeral' | 'rag_sources'>('long_term');
  const [semanticMode, setSemanticMode] = useState(!!CONFIG?.services?.memory?.semanticEnabled);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(memories.length === 0);
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [avgRetrievalMs, setAvgRetrievalMs] = useState(0);
  const retrievalSamples = useRef<number[]>([]);

  const clearError = useAutoClearError(setError);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = eventBus.onSafe<MemoryEntry[]>('memory:updated', (data) => {
      if (!isMountedRef.current) return;
      setMemories([...data]);
      setIsLoading(false);
      setError(null);
    });

    const loadingTimer = setTimeout(() => {
      if (isMountedRef.current) setIsLoading(false);
    }, 3000);

    if (semanticMode) memoryService.ensureSemantic().catch(e => console.warn('[MemoryPanel] Semantic mode init failed:', e));

    return () => {
      clearTimeout(loadingTimer);
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Calculate real activity for the last 42 days
  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    const now = currentTime;
    const dayMs = 24 * 60 * 60 * 1000;
    
    memories.forEach(m => {
      const dayIndex = Math.floor((now - m.metadata.timestamp) / dayMs);
      if (dayIndex >= 0 && dayIndex < 42) {
        map[dayIndex] = (map[dayIndex] || 0) + 1;
      }
    });
    return map;
  }, [memories, currentTime]);

  useEffect(() => {
    const performSearch = async () => {
      if (!isMountedRef.current) return;

      const query = searchQuery.trim();
      if (!query) {
        setMemories(memoryService.getMemories());
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        await new Promise(r => setTimeout(r, 400));
        if (controller.signal.aborted || !isMountedRef.current) return;

        const t0 = performance.now();
        const results = await memoryService.search(query, 5, semanticMode ? 'semantic' : 'fulltext');
        if (controller.signal.aborted || !isMountedRef.current) return;

        retrievalSamples.current.push(performance.now() - t0);
        if (retrievalSamples.current.length > 10) retrievalSamples.current.shift();
        setAvgRetrievalMs(Math.round(retrievalSamples.current.reduce((a, b) => a + b, 0) / retrievalSamples.current.length));

        setMemories(results.map(r => r.entry));
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isMountedRef.current) {
          setError(t('memory.error_search'));
          clearError();
        }
      } finally {
        if (isMountedRef.current && abortControllerRef.current === controller) {
          setIsSearching(false);
        }
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, semanticMode, clearError]);

  const handleClear = async () => {
    if (!window.confirm(t('memory.wipe_confirm'))) {
      return;
    }
    try {
      await memoryService.clear();
      if (isMountedRef.current) {
        setMemories([]);
        setError(null);
      }
    } catch (err) {
      console.warn('[MemoryPanel] Failed to wipe memory index:', err);
      if (isMountedRef.current) {
        setError(t('memory.error_wipe'));
        clearError();
      }
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await memoryService.deleteMemory(id);
      if (isMountedRef.current) {
        setMemories(prev => prev.filter(m => m.id !== id));
        setError(null);
      }
    } catch (err) {
      console.warn('[MemoryPanel] Failed to delete memory entry:', err);
      if (isMountedRef.current) {
        setError(t('memory.error_delete'));
        clearError();
      }
    }
  };

  const handleExportVectors = async () => {
    try {
      const exportData = JSON.stringify(memories, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memory-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      eventBus.emit('system:notification', { message: 'Memory vectors exported', type: 'success' });
    } catch (err) {
      console.warn('[MemoryPanel] Export failed:', err);
      if (isMountedRef.current) {
        setError(t('memory.error_export'));
        clearError();
      }
    }
  };

  const filteredMemories = useMemo(() => {
    return memories.filter(m => (m.metadata.collection ?? 'long_term') === activeCollection);
  }, [memories, activeCollection]);

  const totalEntries = filteredMemories.length;
  const indexDensity = Math.min((totalEntries / 1000) * 100, 100);
  const semanticClarity = totalEntries > 0
    ? Math.round(filteredMemories.filter(m => m.vector || m.embedding).length / totalEntries * 100)
    : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={sectionHeaderBottom}>
        <div>
          <h2 style={pageTitleLarge}>
            <Database size={28} color="#10b981" /> {t('memory.title')}
          </h2>
          <p style={pageSubtitleMuted}>{t('memory.subtitle')}</p>
        </div>
        <div style={flexGap3}>
          <button onClick={handleClear} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }} aria-label={t('memory.wipe_index')}>
            <Trash2 size={16} aria-hidden="true" /> {t('memory.wipe_index')}
          </button>
          <button onClick={handleExportVectors} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', fontWeight: 700 }} aria-label={t('memory.export_vectors')}>
            <Download size={16} aria-hidden="true" /> {t('memory.export_vectors')}
              </button>
            </div>
          </div>

      {error && (
        <div role="alert" aria-live="assertive" style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit' }} aria-label={t('common.dismiss_error')}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        
        {/* Left: Memory Explorer */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Collection Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: 12, width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }} role="tablist" aria-label={t('memory.title')}>
              {[
                { id: 'long_term', label: t('memory.tab.long_term') },
                { id: 'ephemeral', label: t('memory.tab.ephemeral') },
                { id: 'rag_sources', label: t('memory.tab.rag') }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCollection(tab.id as 'long_term' | 'ephemeral' | 'rag_sources')}
                  role="tab"
                  aria-selected={activeCollection === tab.id}
                  style={{
                    padding: '0.6rem 1.25rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: activeCollection === tab.id ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: activeCollection === tab.id ? '#10b981' : '#64748b'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={positionRelativeFlex1}>
                <Search size={16} style={searchIconAbsolute} aria-hidden="true" />
                <input 
                  type="text" 
                  placeholder={semanticMode ? t('memory.search_semantic') : t('memory.search_exact')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={searchInputLarge}
                  onFocus={(e) => e.target.style.borderColor = '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)' }
                  aria-label={t('memory.title')}
                />
                <AnimatePresence>
                  {isSearching && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Network size={16} color="#10b981" aria-hidden="true" /></motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button 
                onClick={() => {
                  const next = !semanticMode;
                  setSemanticMode(next);
                  configService.updateServices({ memory: { semanticEnabled: next, autoEmbedOnStore: true } }).catch(e => console.warn('[MemoryPanel] Config update failed:', e));
                  if (next) memoryService.ensureSemantic().catch(e => console.warn('[MemoryPanel] Semantic mode init failed:', e));
                }}
                style={{ padding: '0.85rem 1.25rem', background: semanticMode ? 'linear-gradient(145deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)' : 'rgba(0,0,0,0.3)', border: `1px solid ${semanticMode ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 12, color: semanticMode ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                aria-label={t('memory.switch_search_aria').replace('{0}', semanticMode ? 'full-text' : 'semantic')}
              >
                <Brain size={18} aria-hidden="true" /> Semantic
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} role="list" aria-label={t('memory.title')}>
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '6rem 0', color: '#64748b' }} aria-live="polite" aria-busy="true">
                  <Database size={56} style={{ opacity: 0.2, margin: '0 auto 1.5rem' }} className="pulsing" aria-hidden="true" />
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{t('memory.loading')}</p>
                </motion.div>
              ) : filteredMemories.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '6rem 0', color: '#64748b' }}>
                  <Database size={56} style={{ opacity: 0.2, margin: '0 auto 1.5rem' }} />
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{searchQuery ? t('memory.empty_search') : t('memory.empty_collection')}</p>
                </motion.div>
              ) : (
                filteredMemories.map((memory, index) => (
                  <motion.div
                    key={memory.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                    className="glass-panel"
                    style={{ 
                      padding: '1.5rem', 
                      background: 'rgba(0,0,0,0.2)', 
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                    whileHover={{ y: -2, borderColor: 'rgba(16,185,129,0.3)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                    role="listitem"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '0.3rem 0.6rem', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(16,185,129,0.2)' }}>
                          {memory.metadata.type || t('memory.context_fallback')}
                        </div>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#64748b' }} aria-hidden="true" />
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          ID: {memory.id.split('-')[0]}...
                        </span>
                      </div>
                      
                      {searchQuery && !isSearching && memory.score !== undefined && (
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', padding: '0.3rem 0.6rem', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
                          <Target size={12} aria-hidden="true" /> {Math.min(100, Math.round((memory.score || 0) * 100))}{t('memory.match_label')}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6, fontFamily: (memory.metadata as Record<string, unknown>).type === 'code' ? '"JetBrains Mono", monospace' : 'inherit' }}>
                      {memory.content}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} aria-hidden="true" /> {new Date(memory.metadata.timestamp).toLocaleTimeString()}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Tag size={12} aria-hidden="true" /> {memory.metadata.source || 'system'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8 }} title={t('memory.view_embeddings')} aria-label="View embedding details"><Code size={16} color="#64748b" aria-hidden="true" /></button>
                        <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8, color: '#ef4444' }} title={t('memory.delete_vector')} aria-label="Delete memory entry" onClick={() => handleDeleteMemory(memory.id)}><Trash2 size={16} aria-hidden="true" /></button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Knowledge Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={sectionPanelTitle}>
              <Network size={18} color="#10b981" /> {t('memory.index_params')}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={statBox}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 800 }}>{t('memory.entries_label')}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{totalEntries.toLocaleString()}</div>
                </div>
                <div style={statBox}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 800 }}>{t('memory.dimensions_label')}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{memories[0]?.vector?.length || memories[0]?.metadata?.vectorData?.dimensions || 1536}</div>
                </div>
              </div>

              <div>
                <div style={progressLabel}>
                  <span style={{ color: '#94a3b8' }}>{t('memory.density_label')}</span>
                  <span style={{ color: '#10b981' }}>{indexDensity.toFixed(0)}%</span>
                </div>
                <div style={progressBarSmall}>
                  <div style={{ width: `${indexDensity.toFixed(0)}%`, height: '100%', background: '#10b981', borderRadius: 3, boxShadow: '0 0 10px #10b981' }} />
                </div>
              </div>
              
              <div>
                <div style={progressLabel}>
                  <span style={{ color: '#94a3b8' }}>{t('memory.clarity_label')}</span>
                  <span style={{ color: '#3b82f6' }}>{semanticClarity}%</span>
                </div>
                <div style={progressBarSmall}>
                  <div style={{ width: `${semanticClarity}%`, height: '100%', background: '#3b82f6', borderRadius: 3, boxShadow: '0 0 10px #3b82f6' }} />
                </div>
              </div>
              
              <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', padding: '1.25rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: 8 }}><Zap size={18} color="#10b981" aria-hidden="true" /></div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                  {t('memory.retrieval_latency')}<strong style={{ color: '#10b981', fontSize: '0.9rem' }}>{avgRetrievalMs || '—'}ms</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
              <h3 style={sectionPanelTitle}>
              <Calendar size={18} color="#f59e0b" aria-hidden="true" /> {t('memory.knowledge_growth')}
            </h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {Array.from({ length: 42 }).map((_, i) => {
                const dayIndex = 41 - i; // 0 is today, 41 is oldest
                const count = activityMap[dayIndex] || 0;
                const activityLevel = count === 0 ? 0 : count > 5 ? 3 : count > 2 ? 2 : 1;

                return (
                  <div 
                    key={i} 
                    style={{ 
                      width: 14, height: 14, borderRadius: 4, 
                      background: activityLevel === 3 ? '#10b981' : activityLevel === 2 ? 'rgba(16,185,129,0.5)' : activityLevel === 1 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                      transition: 'all 0.2s', cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.02)'
                    }} 
                    title={t('memory.fragments_added').replace('{0}', String(count)).replace('{1}', dayIndex === 0 ? t('memory.today') : `${dayIndex} ${t('memory.days_ago')}`)}
                    aria-label={`${count} memory entries on day ${42 - i}`}
                  />
                );
              })}
            </div>
            
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
              {t('memory.knowledge_desc').replace('{0}', totalEntries.toLocaleString())}
            </div>
          </div>
          
        </div>
      </div>
      <ModuleInfo moduleKey="memory" />
    </div>
  );
};

export default MemoryPanel;
