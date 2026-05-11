import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Target, 
  Brain, Send, Play, Users, Pause, Square,
  CheckCircle2, Activity, BarChart3, Bot,
  AlertTriangle, X, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { debateService } from '../../services/DebateService';
import type { DebateSession, DebateParticipant } from '../../services/DebateService';
import { orchestrator } from '../../services/OrchestrationService';
import { eventBus } from '../../core/events';

const DebatePanel: React.FC = () => {
  const [session, setSession] = useState<DebateSession | null>(debateService.getSession());
  const [topic, setTopic] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<'round_robin' | 'moderated' | 'free_for_all'>('round_robin');
  const [maxRounds, setMaxRounds] = useState(10);
  const [userInjection, setUserInjection] = useState('');
  const [isLoading, setIsLoading] = useState(!debateService.getSession());
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'start' | 'inject' | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedAgentsRef = useRef(selectedAgents);
  selectedAgentsRef.current = selectedAgents;

  useEffect(() => {
    const sub = eventBus.on('debate:updated', (data: any) => {
      try {
        setSession({ ...data });
        setIsLoading(false);
        setError(null);
        setActionLoading(null);
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      } catch (e) {
        setError('Failed to process debate update');
      }
    });
    const timer = setTimeout(() => setIsLoading(false), 3000);

    const top = orchestrator.getActiveTopology();
    if (top && selectedAgentsRef.current.length === 0) {
      const agents = top.nodes.filter(n => n.type === 'agent').map(n => n.id);
      setSelectedAgents(agents.slice(0, 3));
    }

    return () => { eventBus.off('debate:updated', sub); clearTimeout(timer); };
  }, []);

  const availableAgents = orchestrator.getActiveTopology()?.nodes.filter(n => n.type === 'agent') || [];

  const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    eventBus.emit('system:notification', { message, type });
  };

  const handleStart = () => {
    if (!topic || selectedAgents.length < 2) {
      notify('Please enter a topic and select at least 2 agents to debate.', 'warning');
      return;
    }
    setActionLoading('start');
    setError(null);
    try {
      const participants: DebateParticipant[] = selectedAgents.map((id, i) => {
        const node = availableAgents.find(a => a.id === id);
        return {
          id,
          name: node?.label || id,
          role: i % 2 === 0 ? 'pro' : 'con',
          systemPrompt: ''
        };
      });
      debateService.startDebate(topic, participants, strategy, maxRounds);
    } catch (e) {
      setActionLoading(null);
      setError('Failed to start debate');
    }
  };

  const handleInject = () => {
    if (!userInjection.trim()) return;
    setActionLoading('inject');
    setError(null);
    try {
      debateService.addArgument('User (Human-in-loop)', userInjection, 1.0);
      setUserInjection('');
    } catch (e) {
      setActionLoading(null);
      setError('Failed to inject argument');
    }
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const getAgentLabel = (id: string) => {
    if (id === 'User (Human-in-loop)') return 'Human Observer';
    const agent = availableAgents.find(a => a.id === id);
    return agent ? agent.label : id;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 0.25rem', color: '#f8fafc' }}>
            <MessageSquare size={28} color="#a855f7" /> Multi-Agent Dialectic Arena
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Orchestrate complex consensus building through structured LLM argumentation.</p>
        </div>
        
        {session && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ padding: '0.6rem 1.25rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', gap: '1.25rem', fontSize: '0.85rem', fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc' }}><Activity size={16} color="#a855f7"/> Round {session.currentRound}/{session.maxRounds}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: session.status === 'active' ? '#10b981' : session.status === 'paused' ? '#f59e0b' : '#64748b' }}>
                {session.status === 'active' ? <div className="pulsing" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}/> : <Pause size={14} />}
                {session.status.toUpperCase()}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {session.status === 'active' ? (
                <button onClick={() => { try { debateService.pauseDebate(); setError(null); } catch (e) { setError('Failed to pause debate'); } }} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' }} title="Pause Debate"><Pause size={18} /></button>
              ) : session.status === 'paused' ? (
                <button onClick={() => { try { debateService.resumeDebate(); setError(null); } catch (e) { setError('Failed to resume debate'); } }} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, color: '#10b981', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }} title="Resume Debate"><Play size={18} fill="currentColor" /></button>
              ) : null}
              {session.status !== 'completed' && (
                <button onClick={() => { try { debateService.stopDebate(); setError(null); } catch (e) { setError('Failed to stop debate'); } }} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }} title="Force Stop"><Square size={18} fill="currentColor" /></button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {error}
          <X size={14} onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto' }} />
        </div>
      )}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: session ? '1fr 380px' : '1fr', gap: '1.5rem', minHeight: 0 }}>
        
        {/* Loading State */}
        {isLoading && !session && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '1.5rem', padding: '6rem' }}>
            <Loader2 size={48} className="spinning" opacity={0.3} />
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>Loading debate session...</span>
          </div>
        )}

        {/* Main Arena Area */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
          
          {!session ? (
            /* Setup Screen */
            <div style={{ flex: 1, display: 'flex', padding: '3rem', overflowY: 'auto' }}>
              <div style={{ width: '100%', maxWidth: 750, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', padding: '1.25rem', background: 'rgba(168,85,247,0.1)', borderRadius: '50%', marginBottom: '1.5rem', border: '1px solid rgba(168,85,247,0.2)', boxShadow: '0 0 30px rgba(168,85,247,0.15)' }}>
                    <Users size={56} color="#a855f7" />
                  </div>
                  <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>Configure Dialectic Session</h3>
                  <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>Select participating cognitive nodes and define the central thesis for autonomous debate.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '2.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Central Thesis / Topic</label>
                    <textarea 
                      rows={3}
                      placeholder="e.g. Should the autonomous system prioritize low latency over extensive guardrail checks?"
                      style={{ width: '100%', padding: '1.25rem', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', outline: 'none', resize: 'vertical', fontSize: '1.05rem', lineHeight: 1.6, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)', transition: 'border-color 0.2s' }}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onFocus={e => e.target.style.borderColor = '#a855f7'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Debate Strategy</label>
                      <select 
                        value={strategy}
                        onChange={(e: any) => setStrategy(e.target.value)}
                        style={{ width: '100%', padding: '1rem', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', outline: 'none', cursor: 'pointer', fontSize: '0.95rem', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}
                      >
                        <option value="round_robin">Round Robin (Sequential)</option>
                        <option value="moderated">Moderated (LLM chosen speaker)</option>
                        <option value="free_for_all">Free-for-all (Asynchronous)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Maximum Rounds</label>
                      <input 
                        type="number" min={2} max={50}
                        value={maxRounds}
                        onChange={(e) => setMaxRounds(parseInt(e.target.value) || 10)}
                        style={{ width: '100%', padding: '1rem', background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', outline: 'none', fontSize: '0.95rem', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Participating Agents
                      <span style={{ fontSize: '0.75rem', color: '#a855f7', background: 'rgba(168,85,247,0.1)', padding: '0.2rem 0.6rem', borderRadius: 8, border: '1px solid rgba(168,85,247,0.2)' }}>{selectedAgents.length} Selected</span>
                    </label>
                    <motion.div layout style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                      <AnimatePresence>
                        {availableAgents.map((agent, i) => (
                          <motion.div 
                            key={agent.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', delay: i * 0.05 }}
                            onClick={() => toggleAgent(agent.id)}
                            style={{ 
                              padding: '1rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer',
                              background: selectedAgents.includes(agent.id) ? 'linear-gradient(145deg, rgba(168,85,247,0.2) 0%, rgba(168,85,247,0.05) 100%)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${selectedAgents.includes(agent.id) ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.05)'}`,
                              transition: 'all 0.2s',
                              boxShadow: selectedAgents.includes(agent.id) ? '0 4px 15px rgba(168,85,247,0.15)' : 'none'
                            }}
                          >
                            {selectedAgents.includes(agent.id) ? <CheckCircle2 size={18} color="#a855f7" /> : <Bot size={18} color="#64748b" />}
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: selectedAgents.includes(agent.id) ? 'white' : '#94a3b8' }}>{agent.label}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {availableAgents.length === 0 && <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '0.9rem', color: '#ef4444', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)' }}>No agents found in the active topology. Please add agents via Visual Builder.</motion.div>}
                    </motion.div>
                  </div>

                  <button 
                    onClick={handleStart} 
                    className="btn-primary" 
                    style={{ padding: '1.25rem', fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: '1rem', background: 'linear-gradient(90deg, #9333ea, #a855f7)', boxShadow: '0 4px 20px rgba(168,85,247,0.4)', borderRadius: 14 }}
                    disabled={selectedAgents.length < 2 || !topic || actionLoading === 'start'}
                  >
                    {actionLoading === 'start' ? <Loader2 size={22} className="spinning" /> : <Play size={22} fill="currentColor" />} Initialize Debate Runtime
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Active Debate UI */
            <>
              <div style={{ padding: '1.5rem 2rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 800, marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Active Thesis</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.5 }}>{session.topic}</div>
              </div>

              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <AnimatePresence>
                  {session.arguments.map((arg, i) => {
                    const isUser = arg.agentId === 'User (Human-in-loop)';
                    const color = isUser ? '#10b981' : ['#3b82f6', '#a855f7', '#f59e0b', '#ec4899'][i % 4];
                    const bg = isUser ? 'linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)' : `linear-gradient(145deg, rgba(${color === '#3b82f6' ? '59,130,246' : color === '#a855f7' ? '168,85,247' : color === '#f59e0b' ? '245,158,11' : '236,72,153'}, 0.15) 0%, rgba(0,0,0,0.2) 100%)`;
                    
                    return (
                      <motion.div
                        key={arg.id}
                        layout
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300, layout: { type: "spring", damping: 25, stiffness: 300 } }}
                        style={{ 
                          alignSelf: isUser ? 'flex-end' : 'flex-start',
                          maxWidth: '85%',
                          display: 'flex',
                          flexDirection: isUser ? 'row-reverse' : 'row',
                          gap: '1.25rem'
                        }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 15px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)` }}>
                          {isUser ? <Target size={22} color="white" /> : <Bot size={22} color="white" />}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>{getAgentLabel(arg.agentId)}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.6rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>Round {arg.round} • {new Date(arg.timestamp).toLocaleTimeString()}</span>
                          </div>
                          
                          <div style={{ 
                            background: bg,
                            border: `1px solid ${color}40`,
                            padding: '1.25rem 1.5rem',
                            borderRadius: '20px',
                            borderTopLeftRadius: isUser ? '20px' : '4px',
                            borderTopRightRadius: isUser ? '4px' : '20px',
                            fontSize: '1rem',
                            lineHeight: 1.6,
                            color: '#e2e8f0',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(10px)'
                          }}>
                            {arg.content}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.75rem', color: color, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, background: `${color}15`, padding: '4px 10px', borderRadius: 10, border: `1px solid ${color}30` }}>
                              <Brain size={12} /> Confidence: {Math.round(arg.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {session.status === 'active' && session.arguments.length > 0 && (
                     <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring' }} style={{ padding: '1rem', display: 'flex', gap: 12, alignItems: 'center', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>
                       <div className="pulsing" style={{ width: 10, height: 10, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 10px #a855f7' }} />
                       Agent logic synthesizing...
                     </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Injection Input */}
              {session.status !== 'completed' && (
                <div style={{ padding: '1.5rem 2rem', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    placeholder="Inject human argument into the dialectic..."
                    value={userInjection}
                    onChange={(e) => setUserInjection(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !actionLoading && handleInject()}
                    style={{ flex: 1, padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: 'white', outline: 'none', transition: 'border-color 0.2s', fontSize: '1rem' }}
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    disabled={actionLoading === 'inject'}
                  />
                  <button onClick={handleInject} className="btn-primary" style={{ padding: '0 1.5rem', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', fontWeight: 800 }} disabled={actionLoading === 'inject'}>
                    {actionLoading === 'inject' ? <Loader2 size={20} className="spinning" /> : <Send size={20} />} Inject
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Analytics & Rosters Panel */}
        {session && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
            
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <BarChart3 size={18} color="#10b981" /> Convergence Analytics
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 700 }}>
                    <span style={{ color: '#94a3b8' }}>Cognitive Convergence Score</span>
                    <span style={{ color: session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444' }}>
                      {Math.round(session.convergenceScore)}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${session.convergenceScore}%` }}
                      transition={{ duration: 0.5 }}
                      style={{ height: '100%', background: session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444', borderRadius: 4, boxShadow: `0 0 10px ${session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444'}` }} 
                    />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                    {session.convergenceScore > 80 ? "Consensus approaching." : "Divergent arguments present."}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                     <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Arguments</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{session.arguments.length}</div>
                   </div>
                   <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                     <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Strategy</div>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', textTransform: 'capitalize' }}>{session.strategy.replace('_', ' ')}</div>
                   </div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Users size={18} color="#3b82f6" /> Active Participants
              </h3>
              
              <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <AnimatePresence>
                  {session.participants.map((p, idx) => {
                    const agentCount = session.arguments.filter(a => a.agentId === p.id).length;
                    return (
                      <motion.div 
                        key={p.id} 
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: 'spring', delay: idx * 0.1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.3)' }}>
                          <Bot size={22} color="#3b82f6" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.2rem', color: '#f8fafc' }}>{getAgentLabel(p.id)}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{agentCount} arguments formulated</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default DebatePanel;
