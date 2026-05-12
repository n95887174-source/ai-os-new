import React, { useState, useMemo } from 'react';
import { X, Search, Package, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { eventBus } from '../../core/events';
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

  const allModels = useMemo(() =>
    keys.flatMap(k => (k.availableModels ?? []).map(m => ({ model: m, provider: k.provider }))), [keys]);

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
    keys.reduce<Record<string, number>>((acc, k) => { acc[k.provider] = k.availableModels?.length ?? 0; return acc; }, {}), [keys]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="model-browser-overlay" role="dialog" aria-modal="true" aria-label="Model catalog"
    >
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()} className="model-browser-panel"
      >
        <div className="model-browser-header">
          <Package size={20} color="#a855f7" aria-hidden="true" />
          <div className="model-browser-header-text">
            <h3 className="model-browser-title">Каталог моделей</h3>
            <p className="model-browser-subtitle">{allModels.length} models from {keys.length} providers</p>
          </div>
          <button onClick={onClose} className="action-btn" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="model-browser-toolbar">
          <div className="model-browser-search">
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
            <input type="text" placeholder="Search models..." value={search} onChange={e => setSearch(e.target.value)}
              className="model-browser-search-input" aria-label="Search models" />
          </div>
          <div className="model-browser-filter-group">
            <Filter size={13} color="var(--text-muted)" aria-hidden="true" />
            <button onClick={() => setActiveProvider(null)}
              className={`model-browser-filter-pill${!activeProvider ? ' model-browser-filter-pill--active' : ''}`}
              aria-pressed={!activeProvider}>
              All ({allModels.length})
            </button>
            {keys.filter(k => k.availableModels?.length).map(k => {
              const c = PROVIDER_COLORS[k.provider] ?? { bg: 'rgba(255,255,255,0.05)', text: 'var(--text-muted)' };
              const active = activeProvider === k.provider;
              return (
                <button key={k.provider} onClick={() => setActiveProvider(active ? null : k.provider)}
                  style={{ background: active ? c.bg : 'transparent', borderColor: active ? c.text : 'rgba(255,255,255,0.08)', color: active ? c.text : 'var(--text-muted)' }}
                  className="model-browser-filter-pill" aria-pressed={active}>
                  {k.provider} ({providerCounts[k.provider]})
                </button>
              );
            })}
          </div>
        </div>

        <div className="model-browser-list">
          {filtered.length === 0 ? (
            <div className="model-browser-empty">No models found.</div>
          ) : (
            <div className="model-browser-grid">
              {filtered.map((entry, i) => {
                const c = PROVIDER_COLORS[entry.provider] ?? { bg: 'rgba(255,255,255,0.04)', text: 'var(--text-muted)' };
                return (
                  <div key={i} className="model-browser-item" tabIndex={0} role="button"
                    onClick={() => { eventBus.emit('system:notification', { message: `Selected model: ${entry.model}`, type: 'info' }); onClose(); }}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); eventBus.emit('system:notification', { message: `Selected model: ${entry.model}`, type: 'info' }); onClose(); } }}
                    aria-label={`${entry.provider}: ${entry.model}`}
                  >
                    <span className="model-browser-item-badge" style={{ background: c.bg, color: c.text }}>
                      {entry.provider.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="model-browser-item-info">
                      <span className="model-browser-item-name" title={entry.model}>{entry.model.split('/').pop()}</span>
                      <div className="model-browser-item-caps">
                        {getCapabilities(entry.model).map(cap => (
                          <span key={cap.label} className="model-browser-cap" style={{ background: `${cap.color}15`, color: cap.color, border: `1px solid ${cap.color}30` }}>
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

        <div className="model-browser-footer">Showing {filtered.length} of {allModels.length} models</div>
      </motion.div>
    </motion.div>
  );
};

export default ModelBrowser;
