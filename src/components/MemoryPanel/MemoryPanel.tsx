import React, { useState, useEffect } from 'react';
import { 
  Database, Search, Filter, Clock, 
  Trash2, Download, Shield, Zap,
  Tag, Brain, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { memoryService } from '../../services/MemoryService';
import type { MemoryEntry } from '../../types/memory';
import { eventBus } from '../../core/events';

const MemoryPanel: React.FC = () => {
  const [memories, setMemories] = useState<MemoryEntry[]>(memoryService.getMemories());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const unsubscribe = eventBus.on('memory:updated', (data: any) => {
      setMemories([...data]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setMemories(memoryService.getMemories());
        return;
      }
      setIsSearching(true);
      const results = await memoryService.search(searchQuery);
      setMemories(results);
      setIsSearching(false);
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClear = async () => {
    if (confirm('Are you sure you want to wipe the collective memory?')) {
      await memoryService.clear();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Database size={28} color="#a855f7" /> Vector Memory Mesh
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Persistent cognitive fragments and cross-session knowledge.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleClear} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444' }}>
            <Trash2 size={16} /> Wipe Memory
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={16} /> Export KB
          </button>
        </div>
      </div>

      <div style={{ gridTemplateColumns: '1fr 300px', display: 'grid', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
        {/* Memory Stream */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="search-bar" style={{ flex: 1, position: 'relative' }}>
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search across collective memory..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && <Loader2 size={14} className="spinning" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />}
            </div>
            <button className="action-btn"><Filter size={18} /></button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence mode="popLayout">
              {memories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                  <Brain size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>No memory fragments found.</p>
                </div>
              ) : (
                memories.map((memory) => (
                  <motion.div
                    key={memory.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="glass-panel"
                    style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}
                  >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a855f7', background: 'rgba(168,85,247,0.1)', padding: '0.2rem 0.5rem', borderRadius: 4, textTransform: 'uppercase' }}>
                        {memory.metadata.type}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {new Date(memory.metadata.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="action-btn" style={{ padding: '0.2rem' }}><Tag size={14} /></button>
                      <button className="action-btn delete" style={{ padding: '0.2rem' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'white', lineHeight: 1.6, marginBottom: '1rem' }}>
                    {memory.content}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.6rem', borderRadius: 10 }}>source:{memory.metadata.source}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.6rem', borderRadius: 10 }}>importance:{(memory.metadata.importance * 100).toFixed(0)}%</span>
                    </div>
                    <button style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Locate in Trace <Zap size={10} />
                    </button>
                  </div>
                </motion.div>
              )))}
            </AnimatePresence>
          </div>
        </div>

        {/* Knowledge Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brain size={16} color="#3b82f6" /> Cognitive Metrics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Index Density</span>
                  <span>78%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <div style={{ width: '78%', height: '100%', background: '#3b82f6', borderRadius: 2 }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Semantic Clarity</span>
                  <span>92%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <div style={{ width: '92%', height: '100%', background: '#10b981', borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} color="#f59e0b" /> Knowledge Growth
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {Array.from({ length: 48 }).map((_, i) => (
                <div 
                  key={i} 
                  style={{ 
                    width: 10, height: 10, borderRadius: 2, 
                    background: i % 5 === 0 || i % 11 === 0 ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                    opacity: 0.35 + ((i * 17) % 60) / 100
                  }} 
                />
              ))}
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              System has captured **1,240** cognitive fragments in the last 24 hours.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryPanel;
