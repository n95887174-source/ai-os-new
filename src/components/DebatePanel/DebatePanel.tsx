import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Shield, Zap, Target, 
  Brain, Send, Play, Users, 
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { debateService } from '../../services/DebateService';
import type { DebateSession, DebateArgument } from '../../services/DebateService';
import { orchestrator } from '../../services/OrchestrationService';
import { eventBus } from '../../core/events';

const DebatePanel: React.FC = () => {
  const [session, setSession] = useState<DebateSession | null>(debateService.getSession());
  const [topic, setTopic] = useState('');

  useEffect(() => {
    const sub = eventBus.on('debate:updated', (data: any) => {
      setSession({ ...data });
    });
    return () => { eventBus.off('debate:updated', sub); };
  }, []);

  const handleStart = () => {
    if (!topic) return;
    debateService.startDebate(topic, []);
  };

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', overflow: 'hidden' }}>
      
      {/* Arena View */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <MessageSquare size={24} color="#3b82f6" /> Dialectic Arena
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Multi-agent consensus building through structured argumentation.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} className="pulsing" />
              LIVE BATTLE
            </div>
          </div>
        </div>

        {!session ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: 450, padding: '2rem', textAlign: 'center' }}>
              <Brain size={48} color="#3b82f6" style={{ marginBottom: '1.5rem' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Initialize New Dialectic</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Enter a complex topic for the collective intelligence to debate.</p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input 
                  type="text" 
                  className="glass-panel" 
                  placeholder="e.g. Optimize data egress for node-7..."
                  style={{ flex: 1, padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <button onClick={handleStart} className="btn-primary" style={{ padding: '0.75rem' }}>
                  <Play size={18} fill="currentColor" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 800, marginBottom: '0.25rem' }}>CURRENT TOPIC</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{session.topic}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <AnimatePresence>
                {session.arguments.map((arg, i) => (
                  <motion.div
                    key={arg.id}
                    initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-panel"
                    style={{ 
                      padding: '1.25rem', width: '85%', alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
                      background: i % 2 === 0 ? 'rgba(59,130,246,0.03)' : 'rgba(168,85,247,0.03)',
                      borderLeft: i % 2 === 0 ? '4px solid #3b82f6' : '1px solid var(--border)',
                      borderRight: i % 2 !== 0 ? '4px solid #a855f7' : '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: i % 2 === 0 ? '#3b82f6' : '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                          {arg.agentName[0]}
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{arg.agentName}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ROUND {arg.round}</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'white', opacity: 0.9 }}>
                      {arg.content}
                    </div>
                    <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Target size={12} /> Confidence: {Math.round(arg.confidence * 100)}%
                      </div>
                      <button className="action-btn" style={{ padding: '0.2rem', color: 'var(--text-muted)' }}><Zap size={14} /></button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Arena Stats & Participants */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="#a855f7" /> Collective Participants
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(() => {
              const top = orchestrator.getActiveTopology();
              const participants = top ? top.nodes.filter((n: any) => n.type === 'agent' || n.type === 'router') : [];
              
              if (participants.length === 0) {
                return <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No active agents in topology to participate.</div>;
              }
              
              return participants.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Brain size={16} color={session ? '#3b82f6' : 'var(--text-muted)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{p.label}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{p.type === 'router' ? 'Router' : 'Agent'}</div>
                  </div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: session ? '#3b82f6' : 'var(--text-muted)' }}>{session ? 'ACTIVE' : 'IDLE'}</div>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={18} color="#10b981" /> Consensus Analytics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Convergence Rate</span>
                <span style={{ color: '#10b981' }}>84%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                <div style={{ width: '84%', height: '100%', background: '#10b981', borderRadius: 3 }} />
              </div>
            </div>
            
            <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.05)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#f59e0b', fontWeight: 800, marginBottom: '0.5rem' }}>
                <AlertCircle size={14} /> DIVERGENCE DETECTED
              </div>
              <div style={{ fontSize: '0.75rem', color: 'white', opacity: 0.8, lineHeight: 1.4 }}>
                Agents are debating the trade-off between **Local Latency** and **Audit Precision**.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebatePanel;
