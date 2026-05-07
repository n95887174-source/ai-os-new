import React, { useState, useMemo } from 'react';
import { X, Search, Package, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { eventBus, EVENTS } from '../../core/events';
import type { ApiKey } from '../../types/metrics';

interface Props {
  keys: ApiKey[];
  onClose: () => void;
}

const PROVIDER_COLORS: Record<string, { bg: string; text: string }> = {
  OpenRouter: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa' },
  Gemini:     { bg: 'rgba(168,85,247,0.12)', text: '#c084fc' },
  Groq:       { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  NVIDIA:     { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
};

const getCapabilities = (model: string) => {
  if (!model) return [];
  const m = model.toLowerCase();
  const caps = [];
  if (m.includes('vision') || m.includes('-vl') || m.includes('multimodal')) caps.push({ label: 'Зрение', color: '#8b5cf6' });
  if (m.includes('reason') || m.includes('think') || m.includes('o1') || m.includes('o3') || m.includes('r1')) caps.push({ label: 'Логика', color: '#10b981' });
  if (m.includes('flash') || m.includes('haiku') || m.includes('mini') || m.includes('8b') || m.includes('turbo')) caps.push({ label: 'Быстрый', color: '#3b82f6' });
  if (m.includes('128k') || m.includes('200k') || m.includes('1m') || m.includes('pro')) caps.push({ label: 'Контекст', color: '#f59e0b' });
  if (m.includes('opus') || m.includes('70b') || m.includes('large') || m.includes('72b')) caps.push({ label: 'Тяжелый', color: '#ef4444' });
  return caps;
};

const ModelBrowser: React.FC<Props> = ({ keys, onClose }) => {
  const [search, setSearch] = useState('');
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  // Build flat list: { model, provider }
  const allModels = useMemo(() =>
    keys.flatMap(k =>
      (k.availableModels ?? []).map(m => ({ model: m, provider: k.provider }))
    ), [keys]);

  const filtered = useMemo(() => {
    let list = allModels;
    if (activeProvider) list = list.filter(e => e.provider === activeProvider);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.model.toLowerCase().includes(q));
    }
    return list;
  }, [allModels, search, activeProvider]);

  const providerCounts = useMemo(() =>
    keys.reduce<Record<string, number>>((acc, k) => {
      acc[k.provider] = k.availableModels?.length ?? 0;
      return acc;
    }, {}), [keys]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 780,
          maxHeight: '85vh',
          background: 'rgba(13,13,13,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 32px 100px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <Package size={20} color="#a855f7" />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Каталог моделей</h3>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{allModels.length} моделей от {keys.length} провайдеров</p>
          </div>
          <button onClick={onClose} className="action-btn"><X size={18} /></button>
        </div>

        {/* Search + filter */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Поиск моделей..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.55rem 0.9rem 0.55rem 2.2rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, color: 'var(--text-main)',
                fontSize: '0.85rem', outline: 'none',
              }}
            />
          </div>
          {/* Provider filter pills */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Filter size={13} color="var(--text-muted)" />
            <button
              onClick={() => setActiveProvider(null)}
              style={{
                padding: '0.3rem 0.7rem', borderRadius: 20, border: '1px solid',
                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                background: !activeProvider ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderColor: !activeProvider ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)',
                color: !activeProvider ? 'var(--text-main)' : 'var(--text-muted)',
              }}
            >
              Все ({allModels.length})
            </button>
            {keys.filter(k => k.availableModels?.length).map(k => {
              const c = PROVIDER_COLORS[k.provider] ?? { bg: 'rgba(255,255,255,0.05)', text: 'var(--text-muted)' };
              const active = activeProvider === k.provider;
              return (
                <button
                  key={k.provider}
                  onClick={() => setActiveProvider(active ? null : k.provider)}
                  style={{
                    padding: '0.3rem 0.7rem', borderRadius: 20, border: '1px solid',
                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                    background: active ? c.bg : 'transparent',
                    borderColor: active ? c.text : 'rgba(255,255,255,0.08)',
                    color: active ? c.text : 'var(--text-muted)',
                  }}
                >
                  {k.provider} ({providerCounts[k.provider]})
                </button>
              );
            })}
          </div>
        </div>

        {/* Model list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem 1.25rem' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Модели не найдены.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.4rem' }}>
              {filtered.map((entry, i) => {
                const c = PROVIDER_COLORS[entry.provider] ?? { bg: 'rgba(255,255,255,0.04)', text: 'var(--text-muted)' };
                return (
                  <div
                    key={i}
                    style={{
                      padding: '0.55rem 0.8rem',
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onClick={() => {
                      eventBus.emit(EVENTS.SELECT_MODEL, { provider: entry.provider, model: entry.model });
                      onClose();
                    }}
                  >
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                      borderRadius: 4, background: c.bg, color: c.text,
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {entry.provider.slice(0, 2).toUpperCase()}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.model}>
                        {entry.model.split('/').pop()}
                      </span>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {getCapabilities(entry.model).map(cap => (
                          <span key={cap.label} style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem', borderRadius: 4, background: `${cap.color}15`, color: cap.color, border: `1px solid ${cap.color}30` }}>
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

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          Показано {filtered.length} из {allModels.length} моделей
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModelBrowser;
