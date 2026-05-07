import React, { useState, useEffect, useRef } from 'react';
import { Send, Zap, ChevronDown, Loader2, AlertCircle, CheckCircle2, X, Globe, ArrowDown, Activity, ChevronRight, Package } from 'lucide-react';
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

// Default models to use when broadcasting
const DEFAULT_MODELS: Record<string, string> = {
  OpenRouter: 'openai/gpt-4o',
  Gemini:     'gemini-2.0-flash',
  Groq:       'llama-3.3-70b-versatile',
  NVIDIA:     'meta/llama-3.3-70b-instruct',
};

type Mode = 'broadcast' | 'single' | 'smart';

const ResponseCard: React.FC<{ res: ChatResponse }> = ({ res }) => {
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
        padding: '1rem 1.2rem',
        marginTop: '0.5rem',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ProviderIcon provider={res.provider} size={16} />
          {res.status === 'loading' && <Loader2 size={12} color={color} style={{ animation: 'spin 1s linear infinite', marginLeft: 4 }} />}
          {res.status === 'error'   && <AlertCircle size={12} color="#ef4444" style={{ marginLeft: 4 }} />}
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color }}>{res.provider}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>{res.model}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {res.latency > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{res.latency}ms</span>
          )}
          {res.status === 'done' && (
            <button
              onClick={handleCopy}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
              title="Copy response"
            >
              {copied ? <CheckCircle2 size={13} color="#10b981" /> : <Package size={13} />}
            </button>
          )}
        </div>
      </div>
      {res.status === 'loading' && (
        <div style={{ display: 'flex', gap: 4, padding: '0.25rem 0' }}>
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          ))}
        </div>
      )}
      {res.status === 'done' && (
        <>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{res.content}</p>
          <div style={{ marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px dashed rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={10} color={color} /> {res.latency}ms TTFT</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Activity size={10} color="#a855f7" /> ~{Math.round((res.content?.length || 0) / 4)} tokens</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ChevronRight size={10} /> 45 t/s</span>
          </div>
        </>
      )}
      {res.status === 'error' && (
        <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>{res.error}</p>
      )}
    </motion.div>
  );
};

const ChatPanel: React.FC = () => {
  const { keys, activeKeys } = useKeyStore();
  const { history, isSending, sendMessage, cancelMessage, clearHistory } = useChatStore();
  
  const [mode, setMode] = useState<Mode>('broadcast');
  const [strategy, setStrategy] = useState<RoutingStrategy>('latency');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setIsScrolledUp(scrollHeight - scrollTop - clientHeight > 100);
  };

  const selectedKey  = keys.find(k => k.provider === selectedProvider);
  const modelOptions = selectedKey?.availableModels ?? [];

  // Auto-select first active provider for single mode
   
  useEffect(() => {
    if (mode === 'single' && !selectedProvider && activeKeys.length > 0) {
      const first = activeKeys[0];
      setSelectedProvider(first.provider);
      setSelectedModel(first.availableModels?.[0] ?? DEFAULT_MODELS[first.provider] ?? '');
    }
  }, [mode, activeKeys]);

  // Update model when provider changes
   
  useEffect(() => {
    if (selectedKey) {
      setSelectedModel(selectedKey.availableModels?.[0] ?? DEFAULT_MODELS[selectedProvider] ?? '');
    }
  }, [selectedProvider]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Listen for model selection from external components
  useEffect(() => {
    const unsub = eventBus.on(EVENTS.SELECT_MODEL, (data) => {
      setMode('single');
      setSelectedProvider(data.provider);
      setSelectedModel(data.model);
    });
    return () => unsub();
  }, []);

  const handleStop = () => {
    const lastEntry = history[history.length - 1];
    if (lastEntry && lastEntry.responses.length > 0) {
      const requestId = lastEntry.responses[0].requestId;
      if (requestId) cancelMessage(requestId);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isSending) return;

    let targets: { provider: string; model: string }[] = [];

    if (mode === 'broadcast') {
      targets = activeKeys.map(k => ({
        provider: k.provider,
        model: DEFAULT_MODELS[k.provider] ?? k.availableModels?.[0] ?? '',
      })).filter(t => t.model);
    } else if (mode === 'smart') {
      const ranked = routerService.getRankedProviders(strategy, text);
      const best = ranked[0];
      if (best) {
        targets = [{
          provider: best.provider,
          model: best.stats?.lastModel || best.availableModels?.[0] || DEFAULT_MODELS[best.provider] || '',
        }];
      }
    } else {
      if (!selectedProvider || !selectedModel) return;
      targets = [{ provider: selectedProvider, model: selectedModel }];
    }

    if (targets.length === 0) return;
    sendMessage(targets, text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={20} color="#f59e0b" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Чат</h2>
          {activeKeys.length === 0 && (
            <span style={{ fontSize: '0.8rem', color: '#ef4444', marginLeft: '0.5rem', background: 'rgba(239,68,68,0.1)', padding: '0.3rem 0.7rem', borderRadius: 6 }}>Подключите провайдера</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Friendly Mode Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-panel)', borderRadius: 10, padding: '0.25rem', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setMode('broadcast')}
              style={{
                padding: '0.45rem 1rem', borderRadius: 8, border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                background: mode === 'broadcast' ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: mode === 'broadcast' ? '#fbbf24' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
              title="Отправить сообщение всем провайдерам сразу для сравнения ответов"
            >
              <Globe size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', marginBottom: 2 }} />
              Все сразу
            </button>
            <button
              onClick={() => setMode('single')}
              style={{
                padding: '0.45rem 1rem', borderRadius: 8, border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                background: mode === 'single' ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: mode === 'single' ? '#60a5fa' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
              title="Выбрать конкретного провайдера и модель"
            >
              Один
            </button>
            <button
              onClick={() => setMode('smart')}
              style={{
                padding: '0.45rem 1rem', borderRadius: 8, border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                background: mode === 'smart' ? 'rgba(16,185,129,0.15)' : 'transparent',
                color: mode === 'smart' ? '#34d399' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
              title="Система автоматически выберет лучший ИИ на основе скорости и надежности"
            >
              ✨ Авто
            </button>
          </div>
          {history.length > 0 && (
            <button className="action-btn" onClick={() => clearHistory()} title="Очистить историю" style={{ padding: '0.45rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Auto mode: priority selector */}
      {mode === 'smart' && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', background: 'var(--bg-panel)', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Приоритет:</span>
          <select
            value={strategy}
            onChange={e => setStrategy(e.target.value as RoutingStrategy)}
            style={{ padding: '0.45rem 0.8rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, color: '#34d399', fontSize: '0.85rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            <option value="latency" style={{ background: '#111' }}>⚡ Самый быстрый</option>
            <option value="reliability" style={{ background: '#111' }}>🛡️ Самый надежный</option>
            <option value="performance" style={{ background: '#111' }}>🚀 Лучшее качество</option>
          </select>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            подключено {activeKeys.length} ИИ
          </span>
        </div>
      )}

      {/* Single mode: provider + model selectors */}
      {mode === 'single' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedProvider}
            onChange={e => setSelectedProvider(e.target.value)}
            style={{ padding: '0.4rem 0.7rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
          >
            <option value="" style={{ background: '#111' }}>Провайдер...</option>
            {activeKeys.map(k => (
              <option key={k.provider} value={k.provider} style={{ background: '#111' }}>{k.provider}</option>
            ))}
          </select>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              style={{ width: '100%', padding: '0.4rem 2rem 0.4rem 0.7rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer', appearance: 'none' }}
            >
              {modelOptions.length ? (
                modelOptions.map(m => <option key={m} value={m} style={{ background: '#111' }}>{m}</option>)
              ) : (
                <option value={DEFAULT_MODELS[selectedProvider] ?? ''} style={{ background: '#111' }}>
                  {DEFAULT_MODELS[selectedProvider] ?? 'Сначала выберите провайдера'}
                </option>
              )}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>
        </div>
      )}

      {/* Broadcast info */}
      {mode === 'broadcast' && activeKeys.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {activeKeys.map(k => (
            <span key={k.provider} style={{
              padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
              background: `${PROVIDER_COLORS[k.provider]}18`, border: `1px solid ${PROVIDER_COLORS[k.provider]}40`,
              color: PROVIDER_COLORS[k.provider] ?? 'var(--text-muted)',
            }}>
              {k.provider} · {DEFAULT_MODELS[k.provider]?.split('/').pop() ?? k.availableModels?.[0] ?? '—'}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1rem', position: 'relative' }}
      >
        <AnimatePresence>
          {isScrolledUp && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              style={{ position: 'sticky', top: '85%', zIndex: 10, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}
            >
              <button 
                onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
                style={{ pointerEvents: 'auto', background: 'rgba(59,130,246,0.9)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
              >
                <ArrowDown size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {history.length === 0 && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
            <div style={{ background: 'rgba(245,158,11,0.08)', padding: '1.5rem', borderRadius: '50%' }}>
              <Zap size={36} color="rgba(245,158,11,0.5)" />
            </div>
            <p style={{ fontSize: '1rem', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
              {mode === 'broadcast'
                ? `Спросите что угодно — ваше сообщение будет отправлено всем ${activeKeys.length} подключенным ИИ для сравнения`
                : mode === 'smart'
                  ? 'Спросите что угодно — система автоматически выберет лучший ИИ для ответа'
                  : 'Выберите ИИ провайдера выше, чтобы начать диалог'}
            </p>
          </div>
        )}

        <AnimatePresence>
          {history.map((entry, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              {/* User message */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                <div style={{
                  maxWidth: '70%', padding: '0.65rem 1rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                  borderRadius: '14px 14px 4px 14px',
                  fontSize: '0.875rem', lineHeight: 1.6, color: 'white',
                }}>
                  {entry.text}
                </div>
              </div>
              {/* Responses */}
              {entry.responses?.map((res, j) => (
                <ResponseCard key={j} res={res} />
              ))}
            </div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'broadcast' ? 'Спросить все ИИ сразу…' 
              : mode === 'smart' ? 'Спросите что угодно — лучший ИИ ответит…'
              : 'Введите ваше сообщение…'
          }
          rows={1}
          style={{
            flex: 1, padding: '0.85rem 1.1rem',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 12, color: 'var(--text-main)',
            fontSize: '0.95rem', outline: 'none', resize: 'none',
            lineHeight: 1.5, maxHeight: 140, overflowY: 'auto',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#3b82f6'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          disabled={isSending || activeKeys.length === 0}
        />
        {isSending ? (
          <button
            className="btn-primary"
            onClick={handleStop}
            style={{ padding: '0.75rem 1.1rem', borderRadius: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444' }}
          >
            <X size={18} />
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={handleSend}
            disabled={!input.trim() || activeKeys.length === 0}
            style={{ padding: '0.75rem 1.1rem', borderRadius: 12 }}
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
