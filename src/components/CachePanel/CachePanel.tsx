import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Trash2, RefreshCw, AlertTriangle,
  BarChart3, HardDrive, Zap, Clock
} from 'lucide-react';
import { cacheService } from '../../services/CacheService';
import { eventBus, EVENTS } from '../../core/events';

const CachePanel: React.FC = () => {
  const [stats, setStats] = useState(cacheService.getStats());
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current); };
  }, []);

  const refresh = () => setStats(cacheService.getStats());

  const handleClear = (model?: string) => {
    try {
      cacheService.invalidate(model);
      refresh();
      eventBus.emit(EVENTS.NOTIFICATION as never, { message: model ? `Cache cleared for ${model}` : 'Cache cleared', type: 'success' });
    } catch (err) {
      setError('Failed to clear cache');
      clearErrorAfterDelay();
    }
  };

  return (
    <div style={{ color: 'var(--text-main)', height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <Zap size={28} color="#f59e0b" /> LLM Response Cache
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>In-memory cache for LLM responses with TTL-based expiration and persistence.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={refresh} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.25rem', borderRadius: 12, fontWeight: 700, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer' }}>
            <RefreshCw size={18} /> Refresh
          </button>
          <button onClick={() => handleClear()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Trash2 size={18} /> Clear All
          </button>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: '0.9rem' }} role="alert">
            <AlertTriangle size={18} /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Cache Size', value: `${stats.size} entries`, color: '#3b82f6', icon: <HardDrive size={20} /> },
          { label: 'Cache Hits', value: stats.hits, color: '#10b981', icon: <Zap size={20} /> },
          { label: 'Cache Misses', value: stats.misses, color: '#f59e0b', icon: <BarChart3 size={20} /> },
          { label: 'Hit Rate', value: `${(stats.hitRate * 100).toFixed(1)}%`, color: '#a855f7', icon: <Database size={20} /> },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.5rem', color: stat.color }}>{stat.icon}<span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }}>{stat.label}</span></div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', color: '#64748b' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', width: 200, textAlign: 'center' }}>
            <Clock size={24} style={{ marginBottom: '0.5rem', color: '#3b82f6' }} />
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Default TTL</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>5 min</div>
          </div>
          <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', width: 200, textAlign: 'center' }}>
            <HardDrive size={24} style={{ marginBottom: '0.5rem', color: '#a855f7' }} />
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Max Entries</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>500</div>
          </div>
          <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', width: 200, textAlign: 'center' }}>
            <Zap size={24} style={{ marginBottom: '0.5rem', color: '#10b981' }} />
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Persistence</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>IndexedDB</div>
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: 500, textAlign: 'center', lineHeight: 1.6 }}>
          The LLM response cache stores completions keyed by model + system prompt + user message.
          Entries expire after their TTL and are persisted to IndexedDB across sessions.
        </div>
      </div>
    </div>
  );
};

export default CachePanel;
