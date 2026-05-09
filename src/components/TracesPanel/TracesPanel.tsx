import React, { useState, useEffect } from 'react';
import { 
  Activity, Layout, Zap, Share2, ZoomIn, Brain, Target,
  Play, Pause, ChevronLeft, ChevronRight, RefreshCcw, Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../../core/events';
import type { CognitiveTrace } from '../../services/CognitiveService';
import { cognitiveService } from '../../services/CognitiveService';
import CognitiveMicroscope from './CognitiveMicroscope';
import DecisionGraph from './DecisionGraph';

const TracesPanel: React.FC = () => {
  const [traces, setTraces] = useState<CognitiveTrace[]>(cognitiveService.getTraces());
  const [selectedTrace, setSelectedTrace] = useState<CognitiveTrace | null>(null);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'audit' | 'graph'>('audit');
  
  // Replay State
  const [replayIdx, setReplayIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const sub = eventBus.on('trace:updated', (data: any) => {
      setTraces(data);
    });
    return () => { sub(); };
  }, []);

  // Simple Auto-Replay Logic
  useEffect(() => {
    let timer: any;
    if (isPlaying && selectedTrace && replayIdx < selectedTrace.steps.length - 1) {
      timer = setTimeout(() => {
        setReplayIdx(prev => prev + 1);
      }, 1000);
    } else if (replayIdx >= (selectedTrace?.steps.length || 0) - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, replayIdx, selectedTrace]);

  const handleSelectTrace = (trace: CognitiveTrace) => {
    setSelectedTrace(trace);
    setReplayIdx(trace.steps.length - 1);
    setIsPlaying(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'running': return '#3b82f6';
      case 'failed': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      
      <AnimatePresence>
        {selectedTrace && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ 
              position: 'absolute', inset: 0, zIndex: 100, 
              background: 'var(--bg-main)', padding: '0.5rem',
              display: 'flex', flexDirection: 'column', gap: '0.5rem'
            }}
          >
            {/* Debugger Header with Replay Controls */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button onClick={() => setSelectedTrace(null)} className="action-btn">
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800 }}>TRACE DEBUGGER</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{selectedTrace.traceId}</div>
                </div>
                
                <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setViewMode('audit')} className={`btn-secondary ${viewMode === 'audit' ? 'active' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                    <ZoomIn size={14} /> Audit
                  </button>
                  <button onClick={() => setViewMode('graph')} className={`btn-secondary ${viewMode === 'graph' ? 'active' : ''}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                    <Network size={14} /> Graph
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => setReplayIdx(Math.max(0, replayIdx - 1))} className="action-btn"><ChevronLeft size={18} /></button>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="action-btn" style={{ color: '#3b82f6' }}>
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button onClick={() => setReplayIdx(Math.min(selectedTrace.steps.length - 1, replayIdx + 1))} className="action-btn"><ChevronRight size={18} /></button>
                  <button onClick={() => { setReplayIdx(0); setIsPlaying(true); }} className="action-btn"><RefreshCcw size={16} /></button>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: '#3b82f6', width: 60, textAlign: 'center' }}>
                  STEP {replayIdx + 1}/{selectedTrace.steps.length}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Brain size={28} color="#a855f7" /> Cognitive Debugger
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Step-by-step interpretation of distributed reasoning flows.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="glass-panel" style={{ padding: '0.4rem', display: 'flex', gap: '0.25rem' }}>
            {['all', 'running', 'completed', 'failed'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                style={{ 
                  padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                  background: filter === f ? 'rgba(59,130,246,0.1)' : 'transparent',
                  color: filter === f ? '#3b82f6' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '120px 1fr 120px 120px 120px 80px', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>Trace ID</span>
          <span>Causal Context</span>
          <span>Status</span>
          <span>Decisions</span>
          <span>Interpretability</span>
          <span>Audit</span>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {traces.filter(t => filter === 'all' || t.status === filter).map(trace => (
            <div 
              key={trace.id} 
              className="hover-bright"
              style={{ 
                padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'grid', 
                gridTemplateColumns: '120px 1fr 120px 120px 120px 80px', gap: '1.5rem', 
                alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer'
              }}
              onClick={() => handleSelectTrace(trace)}
            >
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#a855f7', fontWeight: 600 }}>{trace.traceId}</div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem' }}>{trace.input}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(trace.status) }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: getStatusColor(trace.status) }}>{trace.status}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 600 }}>
                  <Layout size={14} color="var(--text-muted)" /> {trace.steps.length}
                </div>
                <Brain size={14} color="#a855f7" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.65rem', fontWeight: 700 }}>
                  <span>AUDIT</span>
                  <span style={{ color: '#10b981' }}>{Math.round(trace.semanticConfidence * 100)}%</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <div style={{ width: `${trace.semanticConfidence * 100}%`, height: '100%', background: '#10b981', borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <button className="btn-icon" style={{ padding: '0.4rem' }}>
                  <ZoomIn size={18} color="var(--text-muted)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TracesPanel;
