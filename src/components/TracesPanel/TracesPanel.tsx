import React, { useState, useEffect } from 'react';
import { 
  Activity, ZoomIn, Search, Cpu,
  Play, Pause, ChevronLeft, ChevronRight, RefreshCcw, Network,
  Clock, Code
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
  const [searchQuery, setSearchQuery] = useState('');
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
      default: return '#64748b';
    }
  };

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
            <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <button onClick={() => setSelectedTrace(null)} className="btn-secondary" style={{ padding: '0.75rem', borderRadius: 12 }}>
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Trace Debugger (Live Replay)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: '#f8fafc' }}>{selectedTrace.traceId}</div>
                </div>
                
                <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)', margin: '0 0.5rem' }} />
                
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <button onClick={() => setViewMode('audit')} style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 10, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6, background: viewMode === 'audit' ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === 'audit' ? 'white' : '#64748b' }}>
                    <Code size={16} /> Audit Log
                  </button>
                  <button onClick={() => setViewMode('graph')} style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 10, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6, background: viewMode === 'graph' ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewMode === 'graph' ? 'white' : '#64748b' }}>
                    <Network size={16} /> Neural Graph
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <button onClick={() => setReplayIdx(Math.max(0, replayIdx - 1))} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, border: 'none' }}><ChevronLeft size={18} /></button>
                  <button onClick={() => setIsPlaying(!isPlaying)} className="btn-primary" style={{ padding: '0.6rem 1.5rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, background: isPlaying ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)', color: isPlaying ? '#ef4444' : '#60a5fa', border: `1px solid ${isPlaying ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'}`, fontWeight: 800 }}>
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />} {isPlaying ? 'PAUSE' : 'PLAY'}
                  </button>
                  <button onClick={() => setReplayIdx(Math.min(selectedTrace.steps.length - 1, replayIdx + 1))} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, border: 'none' }}><ChevronRight size={18} /></button>
                  <button onClick={() => { setReplayIdx(0); setIsPlaying(true); }} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, border: 'none', marginLeft: '0.5rem' }} title="Restart Replay"><RefreshCcw size={18} /></button>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color: '#a855f7', width: 100, textAlign: 'center', background: 'rgba(168,85,247,0.1)', padding: '0.6rem 1rem', borderRadius: 10, border: '1px solid rgba(168,85,247,0.2)' }}>
                  STEP {replayIdx + 1}/{selectedTrace.steps.length}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
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
            <Activity size={28} color="#a855f7" /> Observability & Traces
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Monitor, debug, and optimize distributed cognitive reasoning flows in real-time.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 320 }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Search traces by ID or input..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: 'white', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#a855f7'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
            />
          </div>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
            {['all', 'running', 'completed', 'failed'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
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

      <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Table Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', display: 'grid', gridTemplateColumns: '150px 1fr 140px 120px 180px 100px', gap: '1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>Trace ID</span>
          <span>Input / Causal Context</span>
          <span>Status</span>
          <span>Steps</span>
          <span>Confidence Score</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
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
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Activity size={16} color="#a855f7" />
                  <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9rem', color: '#a855f7', fontWeight: 700 }}>{trace.traceId}</span>
                </div>
                
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trace.input}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                    <Clock size={14} /> {new Date(trace.startTime).toLocaleTimeString()} • {trace.totalLatency}ms
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${getStatusColor(trace.status)}15`, padding: '0.5rem 0.85rem', borderRadius: 20, width: 'fit-content', border: `1px solid ${getStatusColor(trace.status)}30` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(trace.status), boxShadow: `0 0 10px ${getStatusColor(trace.status)}` }} className={trace.status === 'running' ? 'pulsing' : ''} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: getStatusColor(trace.status), letterSpacing: '0.05em' }}>{trace.status}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1' }}>
                    <Cpu size={16} color="#64748b" /> {trace.steps.length}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 800 }}>
                    <span style={{ color: '#64748b' }}>CERTAINTY</span>
                    <span style={{ color: trace.semanticConfidence > 0.8 ? '#10b981' : trace.semanticConfidence > 0.4 ? '#f59e0b' : '#ef4444' }}>{Math.round(trace.semanticConfidence * 100)}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${trace.semanticConfidence * 100}%`, height: '100%', background: trace.semanticConfidence > 0.8 ? '#10b981' : trace.semanticConfidence > 0.4 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <button className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <ZoomIn size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredTraces.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 250, color: '#64748b', gap: '1.5rem' }}>
              <Search size={40} opacity={0.3} />
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>No traces found matching your criteria.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TracesPanel;
