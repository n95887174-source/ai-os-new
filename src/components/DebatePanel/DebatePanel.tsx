import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Target, 
  Brain, Send, Play, Users, Pause, Square,
  CheckCircle2, Activity, BarChart3, Bot,
  AlertTriangle, X, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { debateService } from '../../kernel/instances';
import type { DebateSession, DebateParticipant } from '../../kernel/instances';
import { orchestrator } from '../../kernel/instances';
import { eventBus } from '../../core/events';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { useTranslation } from '../../i18n/useTranslation';

const DebatePanel: React.FC = () => {
  const [session, setSession] = useState<DebateSession | null>(debateService.getSession());
  const [topic, setTopic] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<'round_robin' | 'moderated' | 'free_for_all'>('round_robin');
  const [maxRounds, setMaxRounds] = useState(10);
  const [userInjection, setUserInjection] = useState('');
  const [isLoading, setIsLoading] = useState(!debateService.getSession());
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const [actionLoading, setActionLoading] = useState<'start' | 'inject' | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedAgentsRef = useRef(selectedAgents);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    selectedAgentsRef.current = selectedAgents;
  }, [selectedAgents]);

  useEffect(() => {
    const unsub = eventBus.on('debate:updated', (data) => {
      if (!isMountedRef.current) return;
      try {
        setSession({ ...(data as DebateSession) });
        setIsLoading(false);
        setError(null);
        setActionLoading(null);
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      } catch {
        if (isMountedRef.current) setError('Failed to process debate update');
      }
    });
    const timer = setTimeout(() => {
      if (isMountedRef.current) setIsLoading(false);
    }, 3000);

    const top = orchestrator.getActiveTopology();
    if (top && selectedAgentsRef.current.length === 0) {
      const agents = top.nodes.filter(n => n.type === 'agent').map(n => n.id);
      setSelectedAgents(agents.slice(0, 3));
    }

    return () => { unsub(); clearTimeout(timer); if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current); };
  }, []);

  const availableAgents = orchestrator.getActiveTopology()?.nodes.filter(n => n.type === 'agent') || [];

  const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    eventBus.emit('system:notification', { message, type });
  };

  const clearErrorWithDelay = () => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
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
        const modelStr = (node?.config?.model as string) || 'auto';
        const [provider, model] = modelStr.includes(':') ? modelStr.split(':') : ['', modelStr];
        return {
          id,
          name: node?.label || id,
          role: i % 2 === 0 ? 'pro' : 'con',
          systemPrompt: (node?.config?.prompt as string) || '',
          provider: provider || undefined,
          modelId: model !== 'auto' ? model : undefined,
        };
      });
      debateService.startDebate(topic, participants, strategy, maxRounds);
    } catch {
      if (!isMountedRef.current) return;
      setActionLoading(null);
      setError('Failed to start debate');
      clearErrorWithDelay();
    }
  };

  const handleInject = async () => {
    if (!userInjection.trim()) return;
    setActionLoading('inject');
    setError(null);
    try {
      await debateService.addArgument('User (Human-in-loop)', userInjection, 1.0);
      if (isMountedRef.current) setUserInjection('');
    } catch {
      if (!isMountedRef.current) return;
      setActionLoading(null);
      setError('Failed to inject argument');
      clearErrorWithDelay();
    }
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const getAgentLabel = (id: string) => {
    if (id === 'User (Human-in-loop)') return t('debate.human_observer');
    const agent = availableAgents.find(a => a.id === id);
    return agent ? agent.label : id;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 0.25rem', color: '#f8fafc' }}>
            <MessageSquare size={28} color="#a855f7" aria-hidden="true" /> {t('debate.title')}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>{t('debate.subtitle')}</p>
        </div>
        
        {session && (
            <div className="debate-header-session">
            <div className="debate-status-badge">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc' }}><Activity size={16} color="#a855f7" aria-hidden="true" /> {t('debate.round').replace('{0}', String(session.currentRound)).replace('{1}', String(session.maxRounds))}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: session.status === 'active' ? '#10b981' : session.status === 'paused' ? '#f59e0b' : '#64748b' }}>
                {session.status === 'active' ? <div className="pulsing" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}/> : <Pause size={14} />}
                {session.status.toUpperCase()}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {session.status === 'active' ? (
                <button onClick={() => { try { debateService.pauseDebate(); setError(null); } catch { if (isMountedRef.current) { setError('Failed to pause debate'); clearErrorWithDelay(); } } }} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' }} title={t('debate.pause')} aria-label={t('debate.pause')}><Pause size={18} aria-hidden="true" /></button>
              ) : session.status === 'paused' ? (
                <button onClick={() => { try { debateService.resumeDebate(); setError(null); } catch { if (isMountedRef.current) { setError('Failed to resume debate'); clearErrorWithDelay(); } } }} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, color: '#10b981', borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }} title={t('debate.resume')} aria-label={t('debate.resume')}><Play size={18} fill="currentColor" aria-hidden="true" /></button>
              ) : null}
              {session.status !== 'completed' && (
                <button onClick={() => { try { debateService.stopDebate(); setError(null); } catch { if (isMountedRef.current) { setError('Failed to stop debate'); clearErrorWithDelay(); } } }} className="btn-secondary" style={{ padding: '0.6rem', borderRadius: 10, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }} title={t('debate.stop')} aria-label={t('debate.stop')}><Square size={18} fill="currentColor" aria-hidden="true" /></button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" aria-live="assertive" style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => { setError(null); if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current); }} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', padding: 0 }} aria-label={t('common.dismiss_error')}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: session ? '1fr 380px' : '1fr', gap: '1.5rem', minHeight: 0 }}>
        
        {/* Loading State */}
        {isLoading && !session && (
          <div aria-live="polite" aria-busy="true" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '1.5rem', padding: '6rem' }}>
            <Loader2 size={48} className="spinning" opacity={0.3} />
            <span style={{ fontSize: '1rem', fontWeight: 600 }}>{t('debate.loading')}</span>
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
                  <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>{t('debate.config_title')}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>Select participating cognitive nodes and define the central thesis for autonomous debate.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(0,0,0,0.3)', padding: '2.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                  
                  <div>
                    <label className="debate-label debate-label--block">{t('debate.thesis')}</label>
                    <textarea 
                      rows={3}
                      placeholder="e.g. Should the autonomous system prioritize low latency over extensive guardrail checks?"
                      aria-label="Debate topic"
                      className="debate-input debate-textarea"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                      <label className="debate-label debate-label--block">{t('debate.strategy')}</label>
                      <select 
                        value={strategy}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStrategy(e.target.value as 'round_robin' | 'moderated' | 'free_for_all')}
                        aria-label="Debate strategy"
                        className="debate-input debate-select"
                      >
                        <option value="round_robin">Round Robin (Sequential)</option>
                        <option value="moderated">Moderated (LLM chosen speaker)</option>
                        <option value="free_for_all">Free-for-all (Asynchronous)</option>
                      </select>
                    </div>
                    <div>
                      <label className="debate-label debate-label--block">{t('debate.max_rounds')}</label>
                      <input 
                        type="number" min={2} max={50}
                        value={maxRounds}
                        onChange={(e) => setMaxRounds(parseInt(e.target.value) || 10)}
                        aria-label="Maximum rounds"
                        className="debate-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="debate-label debate-label--flex">
                      {t('debate.participants')}
                      <span className="debate-badge" style={{ color: '#a855f7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>{selectedAgents.length} {t('debate.selected')}</span>
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
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAgent(agent.id); } }}
                            role="button"
                            tabIndex={0}
                            aria-pressed={selectedAgents.includes(agent.id)}
                            aria-label={`${agent.label}${selectedAgents.includes(agent.id) ? ' (selected)' : ''}`}
                            className={`debate-card${selectedAgents.includes(agent.id) ? ' debate-card--selected' : ''}`}
                          >
                            {selectedAgents.includes(agent.id) ? <CheckCircle2 size={18} color="#a855f7" aria-hidden="true" /> : <Bot size={18} color="#64748b" aria-hidden="true" />}
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: selectedAgents.includes(agent.id) ? 'white' : '#94a3b8' }}>{agent.label}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {availableAgents.length === 0 && <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="debate-error-msg">{t('debate.no_agents')}</motion.div>}
                    </motion.div>
                  </div>

                  <button 
                    onClick={handleStart} 
                    className="btn-primary" 
                    aria-label="Initialize debate"
                    style={{ padding: '1.25rem', fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: '1rem', background: 'linear-gradient(90deg, #9333ea, #a855f7)', boxShadow: '0 4px 20px rgba(168,85,247,0.4)', borderRadius: 14 }}
                    disabled={selectedAgents.length < 2 || !topic || actionLoading === 'start'}
                  >
                    {actionLoading === 'start' ? <Loader2 size={22} className="spinning" /> : <Play size={22} fill="currentColor" />} {t('debate.initialize')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Active Debate UI */
            <>
              <div className="debate-active-thesis">
                <div className="debate-header-label">{t('debate.active_thesis')}</div>
                <div className="debate-topic-text">{session.topic}</div>
              </div>

              <div ref={scrollRef} role="log" aria-live="polite" aria-label="Debate arguments" style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
                        
                          <div className="debate-arg-col" style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                          <div className="debate-arg-header">
                            <span className="debate-agent-name">{getAgentLabel(arg.agentId)}</span>
                            <span className="debate-badge">Round {arg.round} • {new Date(arg.timestamp).toLocaleTimeString()}</span>
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
                          
                          <div className="debate-arg-conf-row">
                            <span className="debate-confidence" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
                              <Brain size={12} aria-hidden="true" /> {t('debate.confidence').replace('{0}', String(Math.round(arg.confidence * 100)))}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                   {session.status === 'active' && session.arguments.length > 0 && (
                     <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring' }} aria-live="polite" aria-label="Agent is synthesizing" className="debate-synthesizing">
                       <div className="pulsing debate-pulsing-dot" aria-hidden="true" />
                       {t('debate.synthesizing')}
                     </motion.div>
                   )}
                </AnimatePresence>
              </div>

              {/* Injection Input */}
              {session.status !== 'completed' && (
                <div className="debate-inject-bar">
                  <input 
                    type="text" 
                    placeholder={t('debate.inject_placeholder')}
                    aria-label="Human argument input"
                    value={userInjection}
                    onChange={(e) => setUserInjection(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !actionLoading && handleInject()}
                    className="debate-inject-input"
                    disabled={actionLoading === 'inject'}
                  />
                  <button onClick={handleInject} className="btn-primary" aria-label={t('debate.inject')} style={{ padding: '0 1.5rem', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', fontWeight: 800 }} disabled={actionLoading === 'inject'}>
                    {actionLoading === 'inject' ? <Loader2 size={20} className="spinning" /> : <Send size={20} aria-hidden="true" />} {t('debate.inject')}
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
              <h3 className="debate-panel-header">
                <BarChart3 size={18} color="#10b981" aria-hidden="true" /> {t('debate.analytics')}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 700 }}>
                    <span style={{ color: '#94a3b8' }}>{t('debate.convergence_score')}</span>
                    <span style={{ color: session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444' }}>
                      {Math.round(session.convergenceScore)}%
                    </span>
                  </div>
                  <div className="debate-progress-track" role="progressbar" aria-valuenow={Math.round(session.convergenceScore)} aria-valuemin={0} aria-valuemax={100} aria-label={t('debate.convergence_score')}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${session.convergenceScore}%` }}
                      transition={{ duration: 0.5 }}
                      style={{ height: '100%', background: session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444', borderRadius: 4, boxShadow: `0 0 10px ${session.convergenceScore > 75 ? '#10b981' : session.convergenceScore > 40 ? '#f59e0b' : '#ef4444'}` }} 
                    />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                    {session.convergenceScore > 85 ? t('debate.consensus_strong') : session.convergenceScore > 60 ? t('debate.consensus_moderate') : session.convergenceScore > 30 ? t('debate.consensus_divergent') : t('debate.consensus_early')}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div className="debate-stat">
                     <div className="debate-sub-label">{t('debate.total_arguments')}</div>
                     <div className="debate-stat-value">{session.arguments.length}</div>
                   </div>
                   <div className="debate-stat">
                     <div className="debate-sub-label">{t('debate.strategy_label')}</div>
                     <div className="debate-stat-value debate-stat-value--sm">{session.strategy.replace('_', ' ')}</div>
                   </div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
              <h3 className="debate-panel-header">
                <Users size={18} color="#3b82f6" aria-hidden="true" /> {t('debate.active_participants')}
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
                        className="debate-participant"
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.3)' }}>
                          <Bot size={22} color="#3b82f6" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="debate-agent-name" style={{ fontSize: '0.95rem' }}>{getAgentLabel(p.id)}</div>
                          <div className="debate-secondary-text">{agentCount} {t('debate.total_arguments').toLowerCase()}</div>
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
      <ModuleInfo moduleKey="debate" />
    </div>
  );
};

export default DebatePanel;
