import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Zap, Loader2, AlertCircle, CheckCircle2, 
  X, Activity, Package, Search, ChevronRight,
  Cpu, LayoutGrid, Swords, Users, ShieldAlert, 
  ZapOff, BrainCircuit, Sparkles, Terminal,
  Plus, MessageSquare, Trash2, GitFork, Download, Edit2,
  Bookmark, Columns, Split, Layout, Maximize2, Minimize2,
  Copy, CornerDownRight, Command, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, EVENTS } from '../../core/events';
import type { ChatResponse } from '../../types/chat';
import { useKeyStore } from '../../stores/useKeyStore';
import { useChatStore } from '../../stores/useChatStore';
import { routerService } from '../../services/RouterService';
import type { RoutingStrategy } from '../../services/RouterService';
import ProviderIcon from '../ProviderIcon/ProviderIcon';

const PROVIDER_COLORS: Record<string, string> = {
  OpenRouter: '#60a5fa',
  Gemini:     '#c084fc',
  Groq:       '#34d399',
  NVIDIA:     '#fbbf24',
};

const DEFAULT_MODELS: Record<string, string> = {
  OpenRouter: 'openai/gpt-4o',
  Gemini:     'gemini-2.0-flash',
  Groq:       'llama-3.3-70b-versatile',
  NVIDIA:     'meta/llama-3.3-70b-instruct',
};

type ExecutionMode = 'auto' | 'parallel' | 'single';

const MODE_CONFIG: Record<ExecutionMode, { label: string, icon: React.ReactNode, desc: string, color: string }> = {
  auto: { label: 'Auto', icon: <Sparkles size={14} />, desc: 'System automatically chooses the best AI for the task', color: '#10b981' },
  parallel: { label: 'Parallel', icon: <LayoutGrid size={14} />, desc: 'Broadcast message to all active providers simultaneously', color: '#f59e0b' },
  single: { label: 'Single', icon: <Package size={14} />, desc: 'Manually select a specific provider and model', color: '#94a3b8' },
};

const ResponseCard: React.FC<{ res: ChatResponse, onFork?: () => void }> = ({ res, onFork }) => {
  const [copied, setCopied] = useState(false);
  if (!res) return null;
  const color = PROVIDER_COLORS[res.provider] || '#94a3b8';

  const handleCopy = () => {
    navigator.clipboard.writeText(res.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid rgba(255,255,255,0.07)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 12,
        padding: '1.2rem',
        marginTop: '0.75rem',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
            <ProviderIcon provider={res.provider} size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color }}>{res.provider}</span>
              {res.status === 'loading' && <Loader2 size={12} color={color} style={{ animation: 'spin 1s linear infinite' }} />}
              {res.status === 'error' && <AlertCircle size={12} color="#ef4444" />}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{res.model}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {res.latency > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>{res.latency}ms</span>
          )}
          {res.status === 'done' && (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
               <button onClick={onFork} title="Fork from here" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <GitFork size={14} />
              </button>
              <button onClick={handleCopy} title="Copy response" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                {copied ? <CheckCircle2 size={14} color="#10b981" /> : <Package size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {res.status === 'loading' && (
        <div style={{ display: 'flex', gap: 4, padding: '0.5rem 0' }}>
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          ))}
        </div>
      )}

      {res.status === 'done' && (
        <>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{res.content}</p>
          <div style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={12} color={color} /> {res.ttft || res.latency}ms TTFT</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={12} color="#a855f7" /> ~{Math.round((res.content?.length || 0) / 4)} tokens</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ChevronRight size={12} /> {res.tps?.toFixed(1) || '—'} t/s</span>
          </div>
        </>
      )}

      {res.status === 'error' && (
        <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.85rem' }}>
          {res.error}
        </div>
      )}
    </motion.div>
  );
};

const ChatPanel: React.FC = () => {
  const { keys, activeKeys } = useKeyStore();
  const { 
    history, isSending, sendMessage, cancelMessage, clearHistory,
    sessions, activeSessionId, setActiveSessionId, createSession, deleteSession, forkSession, renameSession
  } = useChatStore();
  
  const [mode, setMode] = useState<ExecutionMode>('single');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSplitView, setIsSplitView] = useState(false);
  
  const selectedKey = keys.find(k => k.id === selectedKeys[0]);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = eventBus.on(EVENTS.START_CHAT_WITH_TARGET, ({ provider, model, keyId }) => {
      setMode('single');
      setSelectedKeys([keyId]);
      setSelectedModel(model);
      setIsSplitView(false);
      createSession(`Chat with ${provider} (${model.split('/').pop()})`);
    });
    return () => unsub();
  }, [createSession]);

  useEffect(() => {
    if (activeKeys.length > 0 && selectedKeys.length === 0) {
      setSelectedKeys([activeKeys[0].id]);
      setSelectedModel(activeKeys[0].availableModels?.[0] || DEFAULT_MODELS[activeKeys[0].provider] || '');
    }
  }, [activeKeys]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    let targets: { provider: string; model: string }[] = [];
    
    if (isSplitView && selectedKeys.length >= 2) {
      targets = selectedKeys.slice(0, 2).map(id => {
        const k = keys.find(key => key.id === id);
        return { 
          provider: k?.provider || '', 
          model: k?.availableModels?.[0] || DEFAULT_MODELS[k?.provider || ''] || '' 
        };
      });
    } else if (mode === 'single') {
      const k = keys.find(key => key.id === selectedKeys[0]) || activeKeys[0];
      if (!k) return;
      targets = [{ provider: k.provider, model: selectedModel || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '' }];
    } else if (mode === 'parallel') {
      targets = activeKeys.map(k => ({
        provider: k.provider,
        model: k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '',
      }));
    } else {
      const ranked = routerService.getRankedProviders('latency', text);
      const best = ranked[0];
      if (best) {
        targets = [{
          provider: best.provider,
          model: best.stats?.lastModel || best.availableModels?.[0] || DEFAULT_MODELS[best.provider] || '',
        }];
      }
    }

    if (targets.length === 0) return;

    sendMessage(targets, text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleKeySelection = (id: string) => {
    setSelectedKeys(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(k => k !== id);
      }
      if (isSplitView) return [prev[0], id];
      return [id];
    });
  };

  if (activeKeys.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', opacity: 0.8 }}>
         <div style={{ background: 'rgba(239,68,68,0.1)', padding: '2.5rem', borderRadius: '50%', border: '1px solid rgba(239,68,68,0.2)' }}>
          <ShieldAlert size={64} color="#ef4444" />
         </div>
         <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>No Providers Configured</h3>
            <p style={{ fontSize: '1rem', maxWidth: 400, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Add at least one API key to activate the cognitive core.
            </p>
            <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => eventBus.emit(EVENTS.NAVIGATE, 'keys')}>
              Configure Providers
            </button>
         </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', gap: '0.5rem', position: 'relative', background: 'var(--bg-app)', color: 'var(--text-main)' }}>
      {/* Sidebar - Modern OS Style */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{ 
              display: 'flex', flexDirection: 'column', 
              background: 'rgba(255,255,255,0.02)', 
              borderRight: '1px solid var(--border)',
              height: '100%'
            }}
          >
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => createSession()} className="btn-primary" style={{ width: '100%', justifyContent: 'center', borderRadius: 12, padding: '0.75rem' }}>
                <Plus size={16} /> New Conversation
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0 0.5rem 0.75rem', letterSpacing: '0.05em' }}>RECENT SESSIONS</div>
              {sessions.map(s => (
                <div 
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  style={{ 
                    padding: '0.8rem 1rem', borderRadius: 12, cursor: 'pointer', marginBottom: '0.4rem',
                    background: activeSessionId === s.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                    border: activeSessionId === s.id ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
                    display: 'flex', alignItems: 'center', gap: '0.8rem', transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden'
                  }}
                >
                  <MessageSquare size={16} color={activeSessionId === s.id ? '#3b82f6' : 'var(--text-muted)'} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: activeSessionId === s.id ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(s.updatedAt).toLocaleDateString()}</div>
                  </div>
                  {activeSessionId === s.id && (
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, opacity: 0.6 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Operator</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pro Account</div>
                </div>
                <Settings size={14} color="var(--text-muted)" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'transparent' }}>
        {/* Modern Header */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.01)', backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setShowSidebar(!showSidebar)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Layout size={18} />
            </button>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {sessions.find(s => s.id === activeSessionId)?.title || 'New Conversation'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                Cognitive Engine Active • {activeKeys.length} Nodes Online
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             {/* Comparison Mode Toggle */}
             <button 
              onClick={() => {
                setIsSplitView(!isSplitView);
                if (!isSplitView && selectedKeys.length < 2 && activeKeys.length >= 2) {
                  setSelectedKeys([selectedKeys[0], activeKeys.find(k => k.id !== selectedKeys[0])?.id || '']);
                }
              }}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.8rem', 
                borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 700,
                background: isSplitView ? 'rgba(59,130,246,0.1)' : 'var(--bg-panel)',
                color: isSplitView ? '#3b82f6' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <Split size={16} />
              Comparison Mode
            </button>

            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

            <button onClick={() => clearHistory()} className="action-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Dynamic Model Selector Bar */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)', display: 'flex', gap: '0.75rem', alignItems: 'center', overflowX: 'auto' }}>
           <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>ACTIVE NODES:</span>
           {activeKeys.map(k => (
             <div 
              key={k.id}
              onClick={() => toggleKeySelection(k.id)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0.8rem', 
                borderRadius: 100, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                background: selectedKeys.includes(k.id) ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedKeys.includes(k.id) ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                color: selectedKeys.includes(k.id) ? '#3b82f6' : 'var(--text-muted)',
                transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
             >
               <ProviderIcon provider={k.provider} size={14} />
               {k.label}
             </div>
           ))}
        </div>

        {/* Messages Container */}
        <div 
          ref={scrollContainerRef}
          style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', scrollBehavior: 'smooth' }}
        >
          {history.length === 0 && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2rem' }}>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ position: 'relative' }}
              >
                <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
                <BrainCircuit size={80} color="#3b82f6" style={{ filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.3))' }} />
              </motion.div>
              <div style={{ textAlign: 'center', maxWidth: 500 }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.03em' }}>How can I help you today?</h2>
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Select one or multiple models to start a conversation. Use Comparison Mode to see different perspectives side-by-side.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: 500 }}>
                {[
                  { icon: <Zap size={16} />, label: 'Fast Execution', desc: 'Optimized for speed and efficiency' },
                  { icon: <Swords size={16} />, label: 'Deep Reasoning', desc: 'Complex problem solving models' },
                ].map((tip, i) => (
                  <div key={i} className="glass-panel" style={{ padding: '1.25rem', borderRadius: 16, cursor: 'pointer', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontWeight: 700, fontSize: '0.9rem' }}>
                      {tip.icon} {tip.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tip.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {history.map((entry) => (
            <div key={entry.id} style={{ marginBottom: '3rem' }}>
              {/* User Message - Modern Right Aligned */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', maxWidth: '75%' }}>
                  <div style={{
                    padding: '1rem 1.5rem',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px 24px 4px 24px',
                    fontSize: '1rem', lineHeight: 1.6, color: 'var(--text-main)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                  }}>
                    {entry.text}
                  </div>
                  
                  {entry.recalledMemories && entry.recalledMemories.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {entry.recalledMemories.map((m, idx) => (
                        <div key={idx} style={{ 
                          display: 'flex', alignItems: 'center', gap: '0.4rem', 
                          padding: '0.3rem 0.75rem', background: 'rgba(168,85,247,0.08)', 
                          border: '1px solid rgba(168,85,247,0.15)', borderRadius: 100,
                          fontSize: '0.7rem', color: '#a855f7', fontWeight: 600
                        }}>
                          <Bookmark size={10} />
                          <span>Knowledge Recall: {m.content.substring(0, 30)}...</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI Responses */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isSplitView ? '1fr 1fr' : '1fr', 
                gap: '1.5rem',
                alignItems: 'start'
              }}>
                {entry.responses.map((res, j) => (
                  <ResponseCard key={res.id || j} res={res} onFork={() => forkSession(entry.id)} />
                ))}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Modern Floating Input Area */}
        <div style={{ padding: '0 2rem 2rem', position: 'relative' }}>
          <div style={{ 
            background: 'var(--bg-panel)', 
            border: '1px solid var(--border)', 
            borderRadius: 24, 
            padding: '0.75rem 1rem', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
               <div style={{ display: 'flex', gap: 4 }}>
                 {isSplitView ? (
                   <>
                    <div style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Split size={10} /> SPLIT VIEW
                    </div>
                   </>
                 ) : (
                   <select 
                    value={mode}
                    onChange={(e) => setMode(e.target.value as ExecutionMode)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                   >
                     {Object.entries(MODE_CONFIG).map(([k, cfg]) => (
                       <option key={k} value={k} style={{ background: 'var(--bg-panel)' }}>{cfg.label.toUpperCase()} MODE</option>
                     ))}
                   </select>
                 )}
               </div>
               <div style={{ width: 1, height: 12, background: 'var(--border)' }} />
               <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                 {isSplitView ? `Comparing ${selectedKeys.length} models` : `Executing via ${selectedKey?.label || 'Auto'}`}
               </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Shift + Enter for new line)"
                rows={1}
                style={{
                  flex: 1, padding: '0.5rem 0.5rem',
                  background: 'transparent', border: 'none',
                  color: 'var(--text-main)', fontSize: '1.05rem', outline: 'none',
                  resize: 'none', lineHeight: 1.6, maxHeight: 200,
                  fontFamily: 'inherit'
                }}
                disabled={isSending}
              />
              <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: 4 }}>
                <button 
                  className="btn-primary" 
                  onClick={handleSend} 
                  disabled={!input.trim() || isSending}
                  style={{ 
                    width: 44, height: 44, borderRadius: 14, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSending ? 'var(--border)' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                    transition: 'all 0.2s',
                    boxShadow: isSending ? 'none' : '0 4px 15px rgba(59,130,246,0.4)'
                  }}
                >
                  {isSending ? <Loader2 size={20} className="spinning" /> : <Send size={20} />}
                </button>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.6 }}>
            SUPER-AGENTS OS v0.8 • AI results may vary • Secure Cognitive Runtime
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
