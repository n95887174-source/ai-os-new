import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Package, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, EVENTS } from '../../core/events';
import type { ApiKey } from '../../types/metrics';

interface Props {
  keys: ApiKey[];
  onClose: () => void;
}

const PROVIDER_COLORS: Record<string, { bg: string; text: string }> = {
  OpenRouter:  { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
  Gemini:      { bg: 'rgba(168,85,247,0.12)', text: '#c084fc' },
  Groq:        { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  NVIDIA:      { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
  OpenAI:      { bg: 'rgba(0,200,117,0.12)',  text: '#00c875' },
  Anthropic:   { bg: 'rgba(200,130,80,0.12)',  text: '#c88250' },
  Mistral:     { bg: 'rgba(0,150,255,0.12)',   text: '#0096ff' },
  Cohere:      { bg: 'rgba(100,180,255,0.12)', text: '#64b4ff' },
  Perplexity:  { bg: 'rgba(255,180,50,0.12)',  text: '#ffb432' },
  Together:    { bg: 'rgba(130,100,220,0.12)', text: '#8264dc' },
  Fireworks:   { bg: 'rgba(255,100,50,0.12)',  text: '#ff6432' },
  DeepSeek:    { bg: 'rgba(0,180,200,0.12)',   text: '#00b4c8' },
  Azure:       { bg: 'rgba(0,120,212,0.12)',   text: '#0078d4' },
  HuggingFace: { bg: 'rgba(255,200,0,0.12)',   text: '#ffc800' },
};

const getCapabilities = (model: string) => {
  if (!model) return [];
  const m = model.toLowerCase();
  const caps = [];
  if (m.includes('vision') || m.includes('-vl') || m.includes('multimodal')) caps.push({ label: 'Vision', color: '#8b5cf6' });
  if (m.includes('reason') || m.includes('think') || m.includes('o1') || m.includes('o3') || m.includes('r1')) caps.push({ label: 'Reasoning', color: '#10b981' });
  if (m.includes('flash') || m.includes('haiku') || m.includes('mini') || m.includes('8b') || m.includes('turbo')) caps.push({ label: 'Fast', color: '#3b82f6' });
  if (m.includes('128k') || m.includes('200k') || m.includes('1m') || m.includes('pro')) caps.push({ label: 'Context', color: '#f59e0b' });
  if (m.includes('opus') || m.includes('70b') || m.includes('large') || m.includes('72b')) caps.push({ label: 'Heavy', color: '#ef4444' });
  return caps;
};

const ModelBrowser: React.FC<Props> = ({ keys, onClose }) => {
  const [search, setSearch] = useState('');
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    const hasFreeKeys = keys.some(k =>
      (k.tags?.includes('tier:free') || k.label.toLowerCase().includes('free')) &&
      k.provider.toLowerCase() === 'openrouter'
    );
    if (hasFreeKeys) setFreeOnly(true);
  }, [keys]);

  useEffect(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    searchInputRef.current?.focus();
    return () => {
      lastFocusedRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const allModels = useMemo(() => {
    if (!Array.isArray(keys)) return [];
    return keys.flatMap(k => {
      const models = (k.availableModels ?? []);
      if (!Array.isArray(models)) return [];
      return models.map(m => ({ model: m, provider: k.provider }));
    });
  }, [keys]);

  const filtered = useMemo(() => {
    let list = allModels;
    if (activeProvider) list = list.filter(e => e.provider === activeProvider);
    if (freeOnly) list = list.filter(e => e.model.includes(':free') || e.model.includes(':ext'));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.model.toLowerCase().includes(q));
    }
    return list;
  }, [allModels, search, activeProvider, freeOnly]);

  const providerCounts = useMemo(() => {
    if (!Array.isArray(keys)) return {};
    return keys.reduce<Record<string, number>>((acc, k) => {
      const count = Array.isArray(k.availableModels) ? k.availableModels.length : 0;
      acc[k.provider] = count;
      return acc;
    }, {});
  }, [keys]);

  const handleSelectModel = (model: string, provider: string) => {
    try {
      eventBus.emit(EVENTS.SELECT_MODEL, { provider, model });
      onClose();
    } catch (err) {
      console.warn('[ModelBrowser] Failed to emit selection event:', err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          padding: '1rem'
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Model catalog"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 800,
            maxHeight: '80vh',
            background: 'rgba(15,23,42,0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Package size={20} color="#a855f7" aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Model Browser</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                {allModels.length} models from {keys.length} providers
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
                aria-label="Search models"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => setFreeOnly(!freeOnly)}
                style={{
                  padding: '0.3rem 0.8rem',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid',
                  background: freeOnly ? 'rgba(16,185,129,0.15)' : 'transparent',
                  borderColor: freeOnly ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
                  color: freeOnly ? '#34d399' : '#94a3b8',
                  cursor: 'pointer'
                }}
                aria-pressed={freeOnly}
                title="Show only free models"
              >
                Free only
              </button>
              <Filter size={13} color="#64748b" aria-hidden="true" />
              <button
                onClick={() => setActiveProvider(null)}
                style={{
                  padding: '0.3rem 0.8rem',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid',
                  background: !activeProvider ? 'rgba(168,85,247,0.15)' : 'transparent',
                  borderColor: !activeProvider ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)',
                  color: !activeProvider ? '#a855f7' : '#94a3b8',
                  cursor: 'pointer'
                }}
                aria-pressed={!activeProvider}
              >
                All ({allModels.length})
              </button>
              {keys.filter(k => Array.isArray(k.availableModels) && k.availableModels.length).map(k => {
                const c = PROVIDER_COLORS[k.provider] ?? { bg: 'rgba(255,255,255,0.05)', text: '#94a3b8' };
                const active = activeProvider === k.provider;
                return (
                  <button
                    key={k.provider}
                    onClick={() => setActiveProvider(active ? null : k.provider)}
                    style={{
                      padding: '0.3rem 0.8rem',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      border: '1px solid',
                      background: active ? c.bg : 'transparent',
                      borderColor: active ? c.text : 'rgba(255,255,255,0.1)',
                      color: active ? c.text : '#94a3b8',
                      cursor: 'pointer'
                    }}
                    aria-pressed={active}
                  >
                    {k.provider} ({providerCounts[k.provider] || 0})
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
            {filtered.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#64748b',
                fontSize: '0.9rem'
              }}>
                No models found.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '0.75rem'
              }}>
                {filtered.map((entry, i) => {
                  const c = PROVIDER_COLORS[entry.provider] ?? { bg: 'rgba(255,255,255,0.04)', text: '#94a3b8' };
                  return (
                    <div
                      key={`${entry.provider}-${entry.model}-${i}`}
                      tabIndex={0}
                      role="button"
                      onClick={() => handleSelectModel(entry.model, entry.provider)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectModel(entry.model, entry.provider); } }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      aria-label={`${entry.provider}: ${entry.model}`}
                    >
                      <span style={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8,
                        background: c.bg,
                        color: c.text,
                        fontWeight: 700,
                        fontSize: '0.7rem'
                      }}>
                        {entry.provider.slice(0, 2).toUpperCase()}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#f8fafc',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }} title={entry.model}>
                          {entry.model.split('/').pop()}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                          {getCapabilities(entry.model).map(cap => (
                            <span
                              key={cap.label}
                              style={{
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                padding: '0.15rem 0.4rem',
                                borderRadius: 4,
                                background: `${cap.color}15`,
                                color: cap.color,
                                border: `1px solid ${cap.color}30`
                              }}
                            >
                              {cap.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            fontSize: '0.7rem',
            color: '#64748b',
            textAlign: 'right'
          }}>
            Showing {filtered.length} of {allModels.length} models
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModelBrowser;
