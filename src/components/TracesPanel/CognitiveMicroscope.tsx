import React, { useState, useCallback } from 'react';
import { 
  Brain, Target, Activity, 
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CognitiveTrace } from '../../services/CognitiveService';

interface MicroscopeProps {
  trace: CognitiveTrace;
  onClose?: () => void;
}

const CognitiveMicroscope: React.FC<MicroscopeProps> = ({ trace, onClose }) => {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(trace.steps[0]?.id || null);

  const selectedStep = trace.steps.find(s => s.id === selectedStepId);

  const handleStepKeyDown = useCallback((e: React.KeyboardEvent, stepId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedStepId(stepId);
    }
  }, []);

  return (
    <div style={{ 
      height: '100%', display: 'grid', gridTemplateColumns: '320px 1fr', overflow: 'hidden',
      borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)'
    }}>
      {/* Sidebar: Cognitive Flow Timeline */}
      <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>TRACE ID</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'monospace', color: '#f8fafc' }}>{trace.traceId}</div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {trace.steps.map((step, idx) => (
              <div
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                onKeyDown={(e) => handleStepKeyDown(e, step.id)}
                role="button"
                tabIndex={0}
                aria-label={`Step ${idx + 1}: ${step.label}, type ${step.type}, ${step.status === 'done' ? 'completed' : 'in progress'}`}
                style={{ 
                  padding: '1rem', borderRadius: 12, cursor: 'pointer',
                  background: selectedStepId === step.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                  border: `1px solid ${selectedStepId === step.id ? 'rgba(59,130,246,0.5)' : 'transparent'}`,
                  transition: 'all 0.2s',
                  position: 'relative', overflow: 'hidden'
                }}
              >
                {selectedStepId === step.id && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#3b82f6' }} />
                )}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ 
                    width: 24, height: 24, borderRadius: '50%', 
                    background: step.status === 'done' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {step.status === 'done' ? <CheckCircle2 size={14} color="#10b981" /> : <Clock size={14} color="#64748b" aria-hidden="true" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: selectedStepId === step.id ? '#f8fafc' : '#e2e8f0' }}>{step.label}</div>
                    <div style={{ fontSize: '0.7rem', color: selectedStepId === step.id ? '#93c5fd' : '#94a3b8' }}>{step.duration}ms • {step.type}</div>
                  </div>
                  {step.decision && <Brain size={14} color={selectedStepId === step.id ? "#60a5fa" : "#3b82f6"} aria-hidden="true" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(59,130,246,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Semantic Confidence</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>{Math.round(trace.semanticConfidence * 100)}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${trace.semanticConfidence * 100}%`, background: '#10b981', borderRadius: 2, transition: 'width 0.5s ease-out' }} />
          </div>
        </div>
      </div>

      {/* Main Content: Deep Step Analysis */}
      <div style={{ overflowY: 'auto', padding: '2rem' }}>
        <AnimatePresence mode="wait">
          {selectedStep ? (
            <motion.div
              key={selectedStep.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>{selectedStep.label}</h2>
                    <span style={{ padding: '0.2rem 0.6rem', background: 'rgba(59,130,246,0.1)', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>
                      {selectedStep.type}
                    </span>
                  </div>
                  <p style={{ color: '#94a3b8', margin: 0 }}>Step analysis and decision logic for cognitive cycle.</p>
                </div>
                {onClose && (
                  <button onClick={onClose} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', fontWeight: 600 }} aria-label="Close microscope">
                    Close Microscope
                  </button>
                )}
              </div>

              {/* Decision Engine View */}
              {selectedStep.decision && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc' }}>
                    <Target size={18} color="#3b82f6" aria-hidden="true" /> Decision Logic
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem', textTransform: 'uppercase' }}>Alternatives Considered</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {selectedStep.decision.alternatives.map((alt, altIdx) => (
                          <div 
                            key={alt.id}
                            style={{ 
                              padding: '1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)',
                              background: alt.id === selectedStep.decision?.selectedId ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                              position: 'relative', overflow: 'hidden',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>{alt.label}</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: alt.id === selectedStep.decision?.selectedId ? '#10b981' : '#94a3b8' }}>
                                {Math.round(alt.score * 100)}%
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>{alt.reasoning}</div>
                            {alt.id === selectedStep.decision?.selectedId && (
                              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#10b981' }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div style={{ padding: '1.5rem', borderRadius: 16, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', backdropFilter: 'blur(10px)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Selected Strategy Logic</div>
                        <div style={{ fontSize: '1rem', fontWeight: 500, lineHeight: 1.6, color: '#f8fafc' }}>
                          "{selectedStep.decision.logic}"
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ padding: '1rem', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.25rem' }}>CONFIDENCE</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{Math.round(selectedStep.decision.confidence * 100)}%</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: '0.25rem' }}>UNCERTAINTY</div>
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc' }}>
                    <Brain size={18} color="#a855f7" aria-hidden="true" /> Thought Process
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <AnimatePresence>
                      {selectedStep.thoughts.map((thought, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 + 0.3 }}
                          style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
                        >
                          <div style={{ marginTop: '0.5rem', width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} aria-hidden="true" />
                          <div style={{ fontSize: '0.95rem', color: '#e2e8f0', opacity: 0.9 }}>{thought}</div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Observations / Observations */}
              {selectedStep.observations && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc' }}>
                    <Activity size={18} color="#10b981" aria-hidden="true" /> Environmental Feedback
                  </h3>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    style={{ 
                      padding: '1.25rem', background: 'rgba(16,185,129,0.05)', borderRadius: 12, 
                      border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.9rem', lineHeight: 1.6,
                      fontFamily: 'monospace', color: '#10b981'
                    }}
                  >
                    {selectedStep.observations}
                  </motion.div>
                </div>
              )}
            </motion.div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Select a step to begin cognitive analysis
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CognitiveMicroscope;

const Clock = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
