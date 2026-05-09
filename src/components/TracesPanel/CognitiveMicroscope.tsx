import React, { useState } from 'react';
import { 
  Brain, Target, Activity, 
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CognitiveTrace, CognitiveStep, DecisionAlternative } from '../../services/CognitiveService';

interface MicroscopeProps {
  trace: CognitiveTrace;
  onClose?: () => void;
}

const CognitiveMicroscope: React.FC<MicroscopeProps> = ({ trace, onClose }) => {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(trace.steps[0]?.id || null);

  const selectedStep = trace.steps.find(s => s.id === selectedStepId);

  return (
    <div className="glass-panel" style={{ height: '100%', display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden' }}>
      {/* Sidebar: Cognitive Flow Timeline */}
      <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>TRACE ID</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'monospace' }}>{trace.traceId}</div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {trace.steps.map((step) => (
              <motion.div
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                style={{ 
                  padding: '1rem', borderRadius: 12, cursor: 'pointer',
                  background: selectedStepId === step.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                  border: `1px solid ${selectedStepId === step.id ? '#3b82f6' : 'transparent'}`,
                  transition: 'all 0.2s'
                }}
                whileHover={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: 24, height: 24, borderRadius: '50%', 
                    background: step.status === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {step.status === 'done' ? <CheckCircle2 size={14} color="#10b981" /> : <Clock size={14} color="var(--text-muted)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{step.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{step.duration}ms • {step.type}</div>
                  </div>
                  {step.decision && <Brain size={14} color="#3b82f6" />}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(59,130,246,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Semantic Confidence</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>{Math.round(trace.semanticConfidence * 100)}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${trace.semanticConfidence * 100}%` }}
              style={{ height: '100%', background: '#10b981', borderRadius: 2 }} 
            />
          </div>
        </div>
      </div>

      {/* Main Content: Deep Step Analysis */}
      <div style={{ overflowY: 'auto', padding: '2rem' }}>
        <AnimatePresence mode="wait">
          {selectedStep ? (
            <motion.div
              key={selectedStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{selectedStep.label}</h2>
                    <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(59,130,246,0.1)', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>
                      {selectedStep.type}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>Step analysis and decision logic for cognitive cycle.</p>
                </div>
                {onClose && (
                  <button onClick={onClose} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Close Microscope</button>
                )}
              </div>

              {/* Decision Engine View */}
              {selectedStep.decision && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Target size={18} color="#3b82f6" /> Decision Logic
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>Alternatives Considered</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {selectedStep.decision.alternatives.map(alt => (
                          <div 
                            key={alt.id}
                            style={{ 
                              padding: '1rem', borderRadius: 10, border: '1px solid var(--border)',
                              background: alt.id === selectedStep.decision?.selectedId ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                              position: 'relative', overflow: 'hidden'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{alt.label}</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: alt.id === selectedStep.decision?.selectedId ? '#10b981' : 'var(--text-muted)' }}>
                                {Math.round(alt.score * 100)}%
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{alt.reasoning}</div>
                            {alt.id === selectedStep.decision?.selectedId && (
                              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#10b981' }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Selected Strategy Logic</div>
                        <div style={{ fontSize: '1rem', fontWeight: 500, lineHeight: 1.6, color: 'white' }}>
                          "{selectedStep.decision.logic}"
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CONFIDENCE</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{Math.round(selectedStep.decision.confidence * 100)}%</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>UNCERTAINTY</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{Math.round((1 - selectedStep.decision.confidence) * 100)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Thoughts / Reasoning Flow */}
              {selectedStep.thoughts && selectedStep.thoughts.length > 0 && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Brain size={18} color="#a855f7" /> Thought Process
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedStep.thoughts.map((thought, i) => (
                      <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ marginTop: '0.5rem', width: 6, height: 6, borderRadius: '50%', background: '#a855f7' }} />
                        <div style={{ fontSize: '0.95rem', color: 'white', opacity: 0.9 }}>{thought}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observations / Observations */}
              {selectedStep.observations && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity size={18} color="#10b981" /> Environmental Feedback
                  </h3>
                  <div style={{ 
                    padding: '1.25rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12, 
                    border: '1px solid var(--border)', fontSize: '0.9rem', lineHeight: 1.6,
                    fontFamily: 'monospace', color: '#10b981'
                  }}>
                    {selectedStep.observations}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Select a step to begin cognitive analysis
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CognitiveMicroscope;

const Clock = ({ size, color }: { size: number, color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
