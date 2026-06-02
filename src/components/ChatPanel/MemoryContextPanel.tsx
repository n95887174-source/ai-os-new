import React, { useState, useEffect, useCallback } from 'react';
import { Search, Database, Clock, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MemorySearchService, type SearchResult } from '../../kernel/services/memory-search-service';

interface MemoryContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId?: string;
}

export const MemoryContextPanel: React.FC<MemoryContextPanelProps> = ({ isOpen, onClose, currentSessionId }) => {
  const [service] = useState(() => new MemorySearchService({ database: {} }));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentEntries, setRecentEntries] = useState<ReturnType<typeof service.getRecent>>([]);
  const [isIndexed, setIsIndexed] = useState(false);

  useEffect(() => {
    service.init().then(() => {
      setIsIndexed(true);
      setRecentEntries(service.getRecent(10));
    });
  }, [service]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const searchResults = currentSessionId
      ? service.searchWithSessionFilter(query, currentSessionId, 8)
      : service.search(query, 8);
    setResults(searchResults);
  }, [query, service, currentSessionId]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{ width: 520, maxHeight: '80vh', overflow: 'auto', background: 'linear-gradient(145deg, rgba(20,20,40,0.98), rgba(15,15,30,0.98))', borderRadius: 16, border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(100,116,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={18} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>Memory Search</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                  {isIndexed ? `${service.getSize()} entries indexed` : 'Loading...'}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {/* Search */}
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search past conversations..."
                style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid rgba(100,116,139,0.25)', background: 'rgba(30,30,50,0.6)', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Search Results */}
            {results.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                  <MessageSquare size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Search Results ({results.length})
                </div>
                {results.map((r, i) => (
                  <motion.div
                    key={r.entry.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                      background: 'rgba(30,30,50,0.5)', border: '1px solid rgba(59,130,246,0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: r.entry.role === 'user' ? '#60a5fa' : '#34d399' }}>
                        {r.entry.role === 'user' ? 'You' : 'Assistant'}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        {Math.round(r.score * 100)}% match
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4, maxHeight: 60, overflow: 'hidden' }}>
                      {r.entry.content.slice(0, 200)}{r.entry.content.length > 200 ? '...' : ''}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: 4 }}>
                      {r.matchReason} · {new Date(r.entry.timestamp).toLocaleDateString()}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Recent */}
            {!query && recentEntries.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                  <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Recent Messages
                </div>
                {recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '8px 10px', borderRadius: 6, marginBottom: 4,
                      background: 'rgba(30,30,50,0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: entry.role === 'user' ? '#60a5fa' : '#34d399' }}>
                        {entry.role === 'user' ? 'You' : 'Assistant'}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: '#475569' }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxHeight: 40, overflow: 'hidden' }}>
                      {entry.content.slice(0, 120)}{entry.content.length > 120 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
