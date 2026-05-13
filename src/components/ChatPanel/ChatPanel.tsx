import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  Send, Square, Zap, Loader2, AlertCircle, CheckCircle2, 
  Activity, Package, ChevronRight,
  LayoutGrid, Swords, ShieldAlert, 
  BrainCircuit, Sparkles,
  Plus, MessageSquare, Trash2, GitFork,
  Bookmark, Split, Layout, Settings,
  AlertTriangle, X, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, EVENTS } from '../../core/events';
import type { ChatResponse } from '../../types/chat';
import { useKeyStore } from '../../stores/useKeyStore';
import { useChatStore } from '../../stores/useChatStore';
import { routerService } from '../../services/RouterService';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { MarkdownRenderer } from './MarkdownRenderer';

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

const ResponseCard = memo<{ 
  res: ChatResponse; 
  onFork?: () => void; 
  onRegenerate?: () => void;
}>(({ res, onFork, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const color = PROVIDER_COLORS[res?.provider] || '#94a3b8';

  const handleCopy = useCallback(() => {
    if (!res) return;
    navigator.clipboard.writeText(res.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [res]);

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
               <button onClick={onFork} title="Fork from here" aria-label="Fork conversation from this response" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <GitFork size={14} aria-hidden="true" />
              </button>
              <button onClick={handleCopy} title="Copy response" aria-label="Copy response to clipboard" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                {copied ? <CheckCircle2 size={14} color="#10b981" /> : <Package size={14} />}
              </button>
              {onRegenerate && (
                <button onClick={onRegenerate} title="Regenerate response" aria-label="Regenerate response" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                  <RefreshCw size={14} aria-hidden="true" />
                </button>
              )}
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
          <MarkdownRenderer content={res.content} />
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
});

const ChatPanel: React.FC = () => {
  const { keys, activeKeys } = useKeyStore();
  const { 
    history, isSending, sendMessage, clearHistory, cancelSending,
    sessions, activeSessionId, setActiveSessionId, createSession, deleteSession, forkSession
  } = useChatStore();
  
  const [mode, setMode] = useState<ExecutionMode>('single');
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    activeKeys.length > 0 ? [activeKeys[0].id] : []
  );
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    activeKeys[0]?.availableModels?.[0] || DEFAULT_MODELS[activeKeys[0]?.provider || ''] || ''
  );
  const [selectedModelPerKey, setSelectedModelPerKey] = useState<Record<string, string>>(() =>
    activeKeys[0] ? { [activeKeys[0].id]: activeKeys[0]?.availableModels?.[0] || DEFAULT_MODELS[activeKeys[0].provider] || '' } : {}
  );
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSplitView, setIsSplitView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const selectedKey = keys.find(k => k.id === selectedKeys[0]);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Автоочистка ошибки
  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  // Подписка на событие старта чата извне
  useEffect(() => {
    const handler = ({ provider, model, keyId }: { provider: string; model: string; keyId: string }) => {
      if (!isMountedRef.current) return;
      try {
        setMode('single');
        setSelectedKeys([keyId]);
        setSelectedModel(model);
        setIsSplitView(false);
        createSession(`Chat with ${provider} (${model.split('/').pop()})`);
        setError(null);
      } catch (e) {
        console.warn('[ChatPanel] Failed to create chat session:', e);
        if (isMountedRef.current) {
          setError('Failed to create chat session');
          clearErrorAfterDelay();
        }
      }
    };
    const unsub = eventBus.on(EVENTS.START_CHAT_WITH_TARGET, handler);
    return () => unsub();
  }, [createSession, clearErrorAfterDelay]);

  // Подписка на событие выбора модели из ModelBrowser
  useEffect(() => {
    const handler = ({ provider, model }: { provider: string; model: string }) => {
      if (!isMountedRef.current) return;
      try {
        const key = keys.find(k => k.provider === provider);
        if (!key) {
          setError(`No key found for provider: ${provider}`);
          clearErrorAfterDelay();
          return;
        }
        setMode('single');
        setSelectedKeys([key.id]);
        setSelectedModel(model);
        setIsSplitView(false);
        createSession(`Chat with ${provider} (${model.split('/').pop()})`);
        setError(null);
      } catch (e) {
        console.warn('[ChatPanel] Failed to apply model selection:', e);
        if (isMountedRef.current) {
          setError('Failed to apply model selection');
          clearErrorAfterDelay();
        }
      }
    };
    const unsub = eventBus.on(EVENTS.SELECT_MODEL, handler);
    return () => unsub();
  }, [keys, createSession, clearErrorAfterDelay]);

  // Синхронизация выбранных ключей и моделей при изменении activeKeys
  useEffect(() => {
    if (!isMountedRef.current) return;
    setSelectedModelPerKey(prev => {
      const newMap = { ...prev };
      activeKeys.forEach(k => {
        if (!newMap[k.id]) {
          newMap[k.id] = k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '';
        }
      });
      Object.keys(newMap).forEach(id => {
        if (!activeKeys.some(k => k.id === id)) {
          delete newMap[id];
        }
      });
      return newMap;
    });

    setSelectedKeys(prev => {
      if (prev.length === 0) {
        return activeKeys.length > 0 ? [activeKeys[0].id] : [];
      }
      const valid = prev.filter(id => activeKeys.some(k => k.id === id));
      return valid.length > 0 ? valid : (activeKeys.length > 0 ? [activeKeys[0].id] : []);
    });
  }, [activeKeys]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;
    if (!isMountedRef.current) return;

    setError(null);
    try {
      let targets: { provider: string; model: string }[] = [];
      
      if (isSplitView && selectedKeys.length >= 2) {
        targets = selectedKeys.slice(0, 2).map(id => {
          const k = keys.find(key => key.id === id);
          return { 
            provider: k?.provider || '', 
            model: selectedModelPerKey[id] || k?.availableModels?.[0] || DEFAULT_MODELS[k?.provider || ''] || '' 
          };
        });
      } else if (mode === 'single') {
        const k = keys.find(key => key.id === selectedKeys[0]) || activeKeys[0];
        if (!k) return;
        targets = [{ provider: k.provider, model: selectedModelPerKey[k.id] || selectedModel || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '' }];
      } else if (mode === 'parallel') {
        targets = activeKeys.map(k => ({
          provider: k.provider,
          model: selectedModelPerKey[k.id] || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '',
        }));
      } else { // auto
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

      await sendMessage(targets, text);
      if (isMountedRef.current) setInput('');
    } catch (e) {
      console.warn('[ChatPanel] Failed to send message:', e);
      if (isMountedRef.current) {
        setError('Failed to send message');
        clearErrorAfterDelay();
      }
    }
  }, [input, isSending, isSplitView, selectedKeys, keys, activeKeys, mode, selectedModelPerKey, selectedModel, sendMessage, clearErrorAfterDelay]);

  const handleRegenerate = useCallback(async (entryId: string) => {
    const entry = history.find(h => h.id === entryId);
    if (!entry || !entry.text) return;
    if (!isMountedRef.current) return;

    setError(null);
    try {
      let targets: { provider: string; model: string }[] = [];
      
      if (isSplitView && selectedKeys.length >= 2) {
        targets = selectedKeys.slice(0, 2).map(id => {
          const k = keys.find(key => key.id === id);
          return { 
            provider: k?.provider || '', 
            model: selectedModelPerKey[id] || k?.availableModels?.[0] || DEFAULT_MODELS[k?.provider || ''] || '' 
          };
        });
      } else if (mode === 'single') {
        const k = keys.find(key => key.id === selectedKeys[0]) || activeKeys[0];
        if (!k) return;
        targets = [{ provider: k.provider, model: selectedModelPerKey[k.id] || selectedModel || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '' }];
      } else if (mode === 'parallel') {
        targets = activeKeys.map(k => ({
          provider: k.provider,
          model: selectedModelPerKey[k.id] || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '',
        }));
      } else {
        const ranked = routerService.getRankedProviders('latency', entry.text);
        const best = ranked[0];
        if (best) {
          targets = [{
            provider: best.provider,
            model: best.stats?.lastModel || best.availableModels?.[0] || DEFAULT_MODELS[best.provider] || '',
          }];
        }
      }

      if (targets.length === 0) return;

      await sendMessage(targets, entry.text);
    } catch (e) {
      console.warn('[ChatPanel] Failed to regenerate response:', e);
      if (isMountedRef.current) {
        setError('Failed to regenerate response');
        clearErrorAfterDelay();
      }
    }
  }, [history, isSplitView, selectedKeys, keys, activeKeys, mode, selectedModelPerKey, selectedModel, sendMessage, clearErrorAfterDelay]);

  const handleCreateSession = useCallback(() => {
    try {
      createSession();
      setError(null);
    } catch (e) {
      console.warn('[ChatPanel] Failed to create session:', e);
      setError('Failed to create session');
      clearErrorAfterDelay();
    }
  }, [createSession, clearErrorAfterDelay]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    try {
      deleteSession(sessionId);
      setError(null);
    } catch (e) {
      console.warn('[ChatPanel] Failed to delete session:', e);
      setError('Failed to delete session');
      clearErrorAfterDelay();
    }
  }, [deleteSession, clearErrorAfterDelay]);

  const handleClearHistory = useCallback(() => {
    try {
      clearHistory();
      setError(null);
    } catch (e) {
      console.warn('[ChatPanel] Failed to clear history:', e);
      setError('Failed to clear history');
      clearErrorAfterDelay();
    }
  }, [clearHistory, clearErrorAfterDelay]);

  const handleForkSession = useCallback((entryId: string) => {
    try {
      forkSession(entryId);
      setError(null);
    } catch (e) {
      console.warn('[ChatPanel] Failed to fork session:', e);
      setError('Failed to fork session');
      clearErrorAfterDelay();
    }
  }, [forkSession, clearErrorAfterDelay]);

  const toggleSplitView = useCallback(() => {
    if (activeKeys.length < 2) {
      setError('Comparison mode requires at least two active providers');
      clearErrorAfterDelay();
      return;
    }
    setError(null);
    setIsSplitView(prev => !prev);
    if (!isSplitView && selectedKeys.length < 2 && activeKeys.length >= 2) {
      const secondId = activeKeys.find(k => k.id !== selectedKeys[0])?.id;
      if (secondId) {
        setSelectedKeys([selectedKeys[0], secondId]);
      }
    }
  }, [activeKeys, isSplitView, selectedKeys, clearErrorAfterDelay]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const toggleKeySelection = useCallback((id: string) => {
    if (!isMountedRef.current) return;
    const key = keys.find(k => k.id === id);
    if (!key || key.status !== 'active') {
      setError(`Provider ${key?.label || id} is not active`);
      clearErrorAfterDelay();
      return;
    }

    setSelectedKeys(prev => {
      let newKeys;
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        newKeys = prev.filter(k => k !== id);
      } else {
        if (isSplitView && prev.length >= 2) {
          newKeys = [prev[0], id];
        } else if (isSplitView && prev.length === 1) {
          newKeys = [prev[0], id];
        } else {
          newKeys = [id];
        }
      }
      return newKeys;
    });
    
    const selectedKeyObj = keys.find(k => k.id === id);
    if (selectedKeyObj) {
      const model = selectedModelPerKey[selectedKeyObj.id] || selectedKeyObj.availableModels?.[0] || DEFAULT_MODELS[selectedKeyObj.provider] || '';
      setSelectedModel(model);
    }
  }, [keys, isSplitView, selectedModelPerKey, clearErrorAfterDelay]);

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
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 200, padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, backdropFilter: 'blur(8px)' }}
            role="alert" aria-live="polite"
          >
            <AlertTriangle size={14} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit' }} aria-label="Dismiss error">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
            <button onClick={handleCreateSession} className="btn-primary" style={{ width: '100%', justifyContent: 'center', borderRadius: 12, padding: '0.75rem' }} aria-label="Create new conversation">
              <Plus size={16} aria-hidden="true" /> New Conversation
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
                  role="button"
                  tabIndex={0}
                  aria-label={`Switch to session: ${s.title}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveSessionId(s.id); }}
                >
                  <MessageSquare size={16} color={activeSessionId === s.id ? '#3b82f6' : 'var(--text-muted)'} aria-hidden="true" />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: activeSessionId === s.id ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{new Date(s.updatedAt).toLocaleDateString()}</div>
                  </div>
                    {activeSessionId === s.id && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, opacity: 0.6 }} aria-label={`Delete session ${s.title}`}>
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)' }} aria-hidden="true" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Operator</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pro Account</div>
                </div>
                <button onClick={() => eventBus.emit(EVENTS.NAVIGATE, 'settings')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label="Settings">
                  <Settings size={14} aria-hidden="true" />
                </button>
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
            <button onClick={() => setShowSidebar(!showSidebar)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, color: 'var(--text-muted)', cursor: 'pointer' }} aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}>
              <Layout size={18} aria-hidden="true" />
            </button>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {sessions.find(s => s.id === activeSessionId)?.title || 'New Conversation'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} aria-hidden="true" />
                Cognitive Engine Active • {activeKeys.length} Nodes Online
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             {/* Comparison Mode Toggle */}
              <button 
               onClick={toggleSplitView}
               style={{ 
                 display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.8rem', 
                 borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 700,
                 background: isSplitView ? 'rgba(59,130,246,0.1)' : 'var(--bg-panel)',
                 color: isSplitView ? '#3b82f6' : 'var(--text-muted)',
                 cursor: 'pointer', transition: 'all 0.2s'
               }}
               aria-label={isSplitView ? "Disable comparison mode" : "Enable comparison mode"}
             >
               <Split size={16} aria-hidden="true" />
               Comparison Mode
             </button>

            <div style={{ width: 1, height: 20, background: 'var(--border)' }} aria-hidden="true" />

            <button onClick={handleClearHistory} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label="Clear conversation history">
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Dynamic Model Selector Bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)', display: 'flex', gap: '1rem', alignItems: 'center', overflowX: 'auto', flexWrap: 'wrap' }}>
           <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>SELECT PROVIDER & MODEL:</span>
           {activeKeys.map(k => (
             <div 
              key={k.id}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', 
                borderRadius: 16, fontSize: '0.9rem', fontWeight: 700,
                background: selectedKeys.includes(k.id) ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${selectedKeys.includes(k.id) ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: selectedKeys.includes(k.id) ? '#3b82f6' : 'var(--text-muted)',
                transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
             >
                <button 
                 onClick={() => toggleKeySelection(k.id)} 
                 style={{ 
                   display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                   padding: '0.75rem 1rem', borderRadius: 12,
                   background: selectedKeys.includes(k.id) ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)',
                   border: selectedKeys.includes(k.id) ? '2px solid rgba(59,130,246,0.5)' : '2px solid rgba(255,255,255,0.15)',
                   color: selectedKeys.includes(k.id) ? '#3b82f6' : 'white',
                   fontWeight: 800,
                   fontSize: '0.9rem'
                 }}
                 aria-pressed={selectedKeys.includes(k.id)}
                 aria-label={`Select provider ${k.label}`}
                >
                  <ProviderIcon provider={k.provider} size={22} aria-hidden="true" />
                 {k.label}
               </button>
               <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} aria-hidden="true" />
               <select
                value={selectedModelPerKey[k.id] || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || ''}
                onChange={(e) => {
                  setSelectedModelPerKey(prev => ({ ...prev, [k.id]: e.target.value }));
                  if (selectedKeys[0] === k.id) {
                    setSelectedModel(e.target.value);
                  }
                }}
                aria-label={`Model for ${k.label}`}
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: '0.85rem',
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: 180
                }}
               >
                 {(k.availableModels || []).map(model => (
                   <option key={model} value={model}>{model}</option>
                 ))}
               </select>
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
                <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} aria-hidden="true" />
                <BrainCircuit size={80} color="#3b82f6" style={{ filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.3))' }} aria-hidden="true" />
              </motion.div>
              <div style={{ textAlign: 'center', maxWidth: 500 }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.03em' }}>How can I help you today?</h2>
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Select one or multiple models to start a conversation. Use Comparison Mode to see different perspectives side-by-side.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: 500, marginBottom: '1.5rem' }}>
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
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', maxWidth: 600 }}>
                {[
                  'Explain quantum computing simply',
                  'Write a Python function for Fibonacci',
                  'Help me plan a weekend trip',
                  'Summarize the latest AI news'
                ].map((quickReply, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(quickReply);
                      setTimeout(() => handleSend(), 100);
                    }}
                    aria-label={`Quick reply: ${quickReply}`}
                    style={{
                      padding: '0.75rem 1.25rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 100,
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {quickReply}
                  </button>
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
                    <MarkdownRenderer content={entry.text} />
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
                          <Bookmark size={10} aria-hidden="true" />
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
                  <ResponseCard key={res.id || j} res={res} onFork={() => handleForkSession(entry.id)} onRegenerate={() => handleRegenerate(entry.id)} />
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
                      <Split size={10} aria-hidden="true" /> SPLIT VIEW
                    </div>
                   </>
                 ) : (
                    <select 
                     value={mode}
                     onChange={(e) => setMode(e.target.value as ExecutionMode)}
                     style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                     aria-label="Execution mode"
                    >
                     {Object.entries(MODE_CONFIG).map(([k, cfg]) => (
                       <option key={k} value={k} style={{ background: 'var(--bg-panel)' }}>{cfg.label.toUpperCase()} MODE</option>
                     ))}
                   </select>
                 )}
               </div>
               <div style={{ width: 1, height: 12, background: 'var(--border)' }} aria-hidden="true" />
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
                aria-label="Type your message"
              />
              <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: 4 }}>
                {isSending ? (
                  <button
                    onClick={cancelSending}
                    style={{
                      width: 44, height: 44, borderRadius: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#ef4444', border: 'none', cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 15px rgba(239,68,68,0.4)'
                    }}
                    aria-label="Stop streaming"
                  >
                    <Square size={18} color="white" aria-hidden="true" />
                  </button>
                ) : (
                  <button 
                    className="btn-primary" 
                    onClick={handleSend} 
                    disabled={!input.trim()}
                    style={{ 
                      width: 44, height: 44, borderRadius: 14, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 15px rgba(59,130,246,0.4)',
                      border: 'none', cursor: !input.trim() ? 'default' : 'pointer',
                      opacity: !input.trim() ? 0.5 : 1
                    }}
                    aria-label="Send message"
                  >
                    <Send size={20} aria-hidden="true" />
                  </button>
                )}
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
