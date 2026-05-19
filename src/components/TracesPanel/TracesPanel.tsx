import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Activity, ZoomIn, Search, Cpu,
  Play, Pause, ChevronLeft, ChevronRight, RefreshCcw, Network,
  Clock, Code, X, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../../core/events';
import type { CognitiveTrace } from '../../kernel/instances';
import { cognitiveService } from '../../kernel/instances';
import CognitiveMicroscope from './CognitiveMicroscope';
import DecisionGraph from './DecisionGraph';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { getStatusColor } from '../Common/status-vocabulary';

const TracesPanel: React.FC = () => {
  const { t } = useTranslation();
  const [traces, setTraces] = useState<CognitiveTrace[]>(cognitiveService.getTraces());
  const [selectedTrace, setSelectedTrace] = useState<CognitiveTrace | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'audit' | 'graph'>('audit');
  const [isLoading, setIsLoading] = useState(traces.length === 0);
  const [error, setError] = useState<string | null>(null);
  
  // Replay State
  const [replayIdx, setReplayIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const isMountedRef = useRef(true);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const sub = eventBus.on('trace:updated', (data) => {
      if (!isMountedRef.current) return;
      setTraces(data as CognitiveTrace[]);
      setIsLoading(false);
      setError(null);
    });
    loadingTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setIsLoading(false);
    }, 3000);
    return () => {
      isMountedRef.current = false;
      sub();
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    };
  }, []);

  // Автоматическое воспроизведение
  useEffect(() => {
    if (!selectedTrace || replayIdx >= (selectedTrace.steps.length - 1)) {
      if (replayIdx >= (selectedTrace?.steps.length || 0) - 1 && replayIdx >= 0 && isPlaying && isMountedRef.current) {
        setIsPlaying(false);
      }
      return;
    }
    if (!isPlaying || !selectedTrace) return;
    if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    replayTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setReplayIdx(prev => prev + 1);
      }
    }, 1000);
    return () => {
      if (replayTimerRef.current) clearTimeout(replayTimerRef.current);
    };
  }, [isPlaying, replayIdx, selectedTrace]);

  const stats = useMemo(() => {
    const total = traces.length;
    const completed = traces.filter(t => t.status === 'completed').length;
    const failed = traces.filter(t => t.status === 'failed').length;
    const running = traces.filter(t => t.status === 'running').length;
    const avgConfidence = total > 0 ? traces.reduce((s, t) => s + t.semanticConfidence, 0) / total : 0;
    return { total, completed, failed, running, avgConfidence };
  }, [traces]);

  const deleteTrace = useCallback((id: string) => {
    try {
      const updated = traces.filter(t => t.id !== id);
      if (isMountedRef.current) {
        setTraces(updated);
        setError(null);
      }
    } catch (err) {
      console.warn('[TracesPanel] Failed to delete trace:', err);
      if (isMountedRef.current) {
        setError('Failed to delete trace');
        clearErrorAfterDelay();
      }
    }
  }, [traces, clearErrorAfterDelay]);

  const handleSelectTrace = useCallback((trace: CognitiveTrace) => {
    if (!isMountedRef.current) return;
    setSelectedTrace(trace);
    setReplayIdx(trace.steps.length - 1);
    setIsPlaying(false);
  }, []);

  const filteredTraces = traces.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (searchQuery && !t.input.toLowerCase().includes(searchQuery.toLowerCase()) && !t.traceId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative' }}>
      
      <AnimatePresence>
        {selectedTrace && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ 
              position: 'absolute', inset: 0, zIndex: 100, 
              background: 'var(--bg-main)',
              display: 'flex', flexDirection: 'column', gap: '1.5rem',
              borderRadius: 24
            }}
          >
            {/* Debugger Header with Replay Controls */}
            <div style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <button onClick={() => setSelectedTrace(null)} style={{ padding: '0.75rem', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer' }} aria-label="Close debugger">
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.3rem', textTransform: 'uppercase' }}>{t('traces.debugger_title')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: '#f8fafc' }}>{selectedTrace.traceId}</div>
                </div>
                
                <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} aria-hidden="true" />
                
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }} role="tablist" aria-label="Trace debugger views">
                  <button onClick={() => setViewMode('audit')} role="tab" aria-selected={viewMode === 'audit'} style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 10, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6, background: viewMode === 'audit' ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === 'audit' ? 'white' : '#64748b' }}>
                    <Code size={16} aria-hidden="true" /> {t('traces.tab.audit')}
                  </button>
                  <button onClick={() => setViewMode('graph')} role="tab" aria-selected={viewMode === 'graph'} style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 10, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6, background: viewMode === 'graph' ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === 'graph' ? 'white' : '#64748b' }}>
                    <Network size={16} aria-hidden="true" /> {t('traces.tab.neural')}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <button onClick={() => setReplayIdx(Math.max(0, replayIdx - 1))} style={{ padding: '0.6rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer' }} aria-label="Previous step"><ChevronLeft size={18} aria-hidden="true" /></button>
                  <button onClick={() => setIsPlaying(!isPlaying)} style={{ padding: '0.6rem 1.5rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, background: isPlaying ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: isPlaying ? '#ef4444' : '#60a5fa', border: `1px solid ${isPlaying ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'}`, fontWeight: 800, cursor: 'pointer' }} aria-label={isPlaying ? "Pause replay" : "Play replay"}>
                    {isPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />} {isPlaying ? 'PAUSE' : 'PLAY'}
                  </button>
                  <button onClick={() => setReplayIdx(Math.min(selectedTrace.steps.length - 1, replayIdx + 1))} style={{ padding: '0.6rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer' }} aria-label="Next step"><ChevronRight size={18} aria-hidden="true" /></button>
                  <button onClick={() => { setReplayIdx(0); setIsPlaying(true); }} style={{ padding: '0.6rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', marginLeft: '0.5rem' }} title="Restart Replay" aria-label="Restart replay"><RefreshCcw size={18} aria-hidden="true" /></button>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: '#a855f7', width: 100, textAlign: 'center', background: 'rgba(168,85,247,0.1)', padding: '0.6rem 1rem', borderRadius: 10, border: '1px solid rgba(168,85,247,0.2)' }}>
                  STEP {replayIdx + 1}/{selectedTrace.steps.length}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
              {viewMode === 'audit' ? (
                <CognitiveMicroscope 
                  trace={{ ...selectedTrace, steps: selectedTrace.steps.slice(0, replayIdx + 1) }} 
                />
              ) : (
                <DecisionGraph 
                  steps={selectedTrace.steps.slice(0, replayIdx + 1)} 
                  edges={selectedTrace.decisionGraph.edges}
                  selectedId={selectedTrace.steps[replayIdx]?.id}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <Activity size={28} color="#a855f7" aria-hidden="true" /> {t('traces.title')}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('traces.subtitle')}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} aria-hidden="true" />
            <input 
              type="text" 
              placeholder={t('traces.search_placeholder')} 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: 'white', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#a855f7'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
              aria-label="Search traces"
            />
          </div>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }} role="tablist" aria-label="Filter traces by status">
            {['all', 'running', 'completed', 'failed'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                role="tab"
                aria-selected={filter === f}
                style={{ 
                  padding: '0.6rem 1.25rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 800,
                  background: filter === f ? (f === 'completed' ? 'rgba(16,185,129,0.15)' : f === 'failed' ? 'rgba(239,68,68,0.15)' : f === 'running' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.1)') : 'transparent',
                  color: filter === f ? (f === 'completed' ? '#10b981' : f === 'failed' ? '#ef4444' : f === 'running' ? '#60a5fa' : 'white') : '#64748b',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: t('traces.total'), value: stats.total, color: '#a855f7' },
          { label: t('traces.completed'), value: stats.completed, color: '#10b981' },
          { label: t('traces.failed'), value: stats.failed, color: '#ef4444' },
          { label: t('traces.avg_confidence'), value: `${Math.round(stats.avgConfidence * 100)}%`, color: '#3b82f6' }
        ].map(stat => (
          <div key={stat.label} style={{ padding: '1rem 1.25rem', borderRadius: 12, border: `1px solid ${stat.color}22`, background: `linear-gradient(135deg, ${stat.color}0A 0%, rgba(0,0,0,0) 100%)`, backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '0.05em' }}>{stat.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}
            role="alert"
            aria-live="polite"
          >
            <AlertTriangle size={14} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit' }} aria-label={t('common.dismiss_error')}>
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
        {/* Table Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', display: 'grid', gridTemplateColumns: '150px 1fr 140px 120px 180px 100px', gap: '1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>{t('traces.table.trace_id')}</span>
          <span>{t('traces.header_input')}</span>
          <span>{t('traces.table.status')}</span>
          <span>{t('traces.table.steps')}</span>
          <span>{t('traces.header_confidence')}</span>
          <span style={{ textAlign: 'right' }}>{t('traces.table.actions')}</span>
        </div>
        
        {/* Traces List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <AnimatePresence>
            {filteredTraces.map(trace => (
              <motion.div 
                key={trace.id} 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ 
                  padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'grid', 
                  gridTemplateColumns: '150px 1fr 140px 120px 180px 100px', gap: '1.5rem', 
                  alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer'
                }}
                onClick={() => handleSelectTrace(trace)}
                whileHover={{ background: 'rgba(255,255,255,0.03)', boxShadow: 'inset 4px 0 0 #a855f7' }}
                role="row"
                aria-label={`Trace ${trace.traceId}, status ${trace.status}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Activity size={16} color="#a855f7" aria-hidden="true" />
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9rem', color: '#a855f7', fontWeight: 700 }}>{trace.traceId}</span>
                </div>
                
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trace.input}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                    <Clock size={14} aria-hidden="true" /> {new Date(trace.startTime).toLocaleTimeString()} • {trace.totalLatency}ms
                    {trace.dataQuality?.tokenCount?.source === 'estimated' && (
                      <span
                        title={`Token count estimated by content length / ${trace.dataQuality.tokenCount.divisor ?? 4}; in-memory retention keeps newest ${trace.dataQuality.retention?.inMemoryLimit ?? 200} traces.`}
                        style={{ padding: '0.1rem 0.35rem', borderRadius: 4, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase' }}
                      >
                        estimate
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${getStatusColor(trace.status)}15`, padding: '0.5rem 0.85rem', borderRadius: 20, width: 'fit-content', border: `1px solid ${getStatusColor(trace.status)}30` }}>
                  <motion.div 
                    animate={trace.status === 'running' ? { opacity: [0.4, 1, 0.4] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(trace.status), boxShadow: `0 0 10px ${getStatusColor(trace.status)}` }} 
                    aria-hidden="true"
                  />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: getStatusColor(trace.status), letterSpacing: '0.05em' }}>{trace.status}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1' }}>
                    <Cpu size={16} color="#64748b" aria-hidden="true" /> {trace.steps.length}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 800 }}>
                    <span style={{ color: '#64748b' }}>{t('traces.certainty_label')}</span>
                    <span style={{ color: trace.semanticConfidence > 0.8 ? '#10b981' : trace.semanticConfidence > 0.4 ? '#f59e0b' : '#ef4444' }}>{Math.round(trace.semanticConfidence * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${trace.semanticConfidence * 100}%`, height: '100%', background: trace.semanticConfidence > 0.8 ? '#10b981' : trace.semanticConfidence > 0.4 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button 
                    style={{ padding: '0.6rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    aria-label={t('traces.inspect_aria')}
                  >
                    <ZoomIn size={18} aria-hidden="true" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteTrace(trace.id); }}
                    style={{ padding: '0.6rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ef4444', cursor: 'pointer' }}
                    aria-label={t('traces.delete_aria')}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 250, color: '#64748b', gap: '1.5rem' }}>
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
                <Activity size={40} opacity={0.3} aria-hidden="true" />
              </motion.div>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>{t('traces.loading')}</span>
            </div>
          )}
          {!isLoading && filteredTraces.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 250, color: '#64748b', gap: '1.5rem' }}>
              <Search size={40} opacity={0.3} aria-hidden="true" />
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>{t('traces.empty')}</span>
            </div>
          )}
        </div>
      </div>
      <ModuleInfo moduleKey="traces" />
    </div>
  );
};

export default TracesPanel;
