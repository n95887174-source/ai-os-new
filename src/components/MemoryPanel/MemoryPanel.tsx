import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Search, Filter, Clock, 
  Trash2, Download, Shield, Zap,
  Tag, Brain, Calendar, Network,
  BarChart3, Settings2, Cpu, Link, Target, Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { memoryService } from '../../services/MemoryService';
import type { MemoryEntry } from '../../types/memory';
import { eventBus } from '../../core/events';

const MemoryPanel: React.FC = () => {
  const [memories, setMemories] = useState<MemoryEntry[]>(() => memoryService.getMemories());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeCollection, setActiveCollection] = useState<'long_term' | 'ephemeral' | 'rag_sources'>('long_term');
  const [semanticMode, setSemanticMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = eventBus.on('memory:updated', (data: any) => {
      setMemories([...data]);
    });
    return () => unsubscribe();
  }, []);

  // Calculate real activity for the last 42 days
  const activityMap = useMemo(() => {
    const map: Record<string, number> = {};
    const now = currentTime;
    const dayMs = 24 * 60 * 60 * 1000;
    
    memories.forEach(m => {
      const dayIndex = Math.floor((now - m.metadata.timestamp) / dayMs);
      if (dayIndex >= 0 && dayIndex < 42) {
        map[dayIndex] = (map[dayIndex] || 0) + 1;
      }
    });
    return map;
  }, [memories, currentTime]);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setMemories(memoryService.getMemories());
        return;
      }
      setIsSearching(true);
      // Mock search delay for effect
      await new Promise(r => setTimeout(r, 400));
      const results = await memoryService.search(searchQuery);
      setMemories(results);
      setIsSearching(false);
    };

    const timer = setTimeout(performSearch, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClear = async () => {
    if (confirm('CRITICAL WARNING: Are you sure you want to completely wipe the vector cognitive memory? This cannot be undone.')) {
      await memoryService.clear();
      setMemories([]);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <Database size={28} color="#10b981" /> Vector Memory Mesh
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Distributed cognitive fragments, embeddings, and RAG knowledge base.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleClear} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
            <Trash2 size={16} /> Wipe Index
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', fontWeight: 700 }}>
            <Download size={16} /> Export Vectors
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        
        {/* Left: Memory Explorer */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Collection Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.3rem', borderRadius: 12, width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
              {[
                { id: 'long_term', label: 'Long-Term Memory' },
                { id: 'ephemeral', label: 'Ephemeral Context' },
                { id: 'rag_sources', label: 'RAG Knowledge' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCollection(tab.id as any)}
                  style={{
                    padding: '0.6rem 1.25rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: activeCollection === tab.id ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: activeCollection === tab.id ? '#10b981' : '#64748b'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  type="text" 
                  placeholder={semanticMode ? "Semantic search (e.g., 'What did the user ask about routing?')..." : "Exact keyword match..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, color: 'white', outline: 'none', fontSize: '0.9rem', transition: 'border-color 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                />
                <AnimatePresence>
                  {isSearching && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Network size={16} color="#10b981" /></motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button 
                onClick={() => setSemanticMode(!semanticMode)}
                style={{ padding: '0.85rem 1.25rem', background: semanticMode ? 'linear-gradient(145deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)' : 'rgba(0,0,0,0.3)', border: `1px solid ${semanticMode ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 12, color: semanticMode ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <Brain size={18} /> Semantic
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AnimatePresence mode="popLayout">
              {memories.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: '6rem 0', color: '#64748b' }}>
                  <Database size={56} style={{ opacity: 0.2, margin: '0 auto 1.5rem' }} />
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{searchQuery ? 'No vectors matching your semantic query.' : 'Memory collection is currently empty.'}</p>
                </motion.div>
              ) : (
                memories.map((memory, index) => (
                  <motion.div
                    key={memory.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                    className="glass-panel"
                    style={{ 
                      padding: '1.5rem', 
                      background: 'rgba(0,0,0,0.2)', 
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                    whileHover={{ y: -2, borderColor: 'rgba(16,185,129,0.3)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '0.3rem 0.6rem', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(16,185,129,0.2)' }}>
                          {memory.metadata.type || 'CONTEXT'}
                        </div>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#64748b' }} />
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          ID: {memory.id.split('-')[0]}...
                        </span>
                      </div>
                      
                      {searchQuery && !isSearching && memory.score !== undefined && (
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.1)', padding: '0.3rem 0.6rem', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
                          <Target size={12} /> {Math.min(100, Math.round((memory.score || 0) * 100))}% Match
                        </div>
                      )}
                    </div>
                    
                    <div style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.6, fontFamily: memory.metadata.type === 'code' ? '"JetBrains Mono", monospace' : 'inherit' }}>
                      {memory.content}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={12} /> {new Date(memory.metadata.timestamp).toLocaleTimeString()}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Tag size={12} /> {memory.metadata.source || 'system'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8 }} title="View Embeddings"><Code size={16} color="#64748b" /></button>
                        <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8, color: '#ef4444' }} title="Delete Vector"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Knowledge Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Network size={18} color="#10b981" /> Index Parameters
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 800 }}>Total Vectors</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{(memories.length * 142).toLocaleString()}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 800 }}>Dimensions</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>1536</div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <span style={{ color: '#94a3b8' }}>Index Density (HNSW)</span>
                  <span style={{ color: '#10b981' }}>84%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: '84%', height: '100%', background: '#10b981', borderRadius: 3, boxShadow: '0 0 10px #10b981' }} />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  <span style={{ color: '#94a3b8' }}>Semantic Clarity</span>
                  <span style={{ color: '#3b82f6' }}>96%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: '96%', height: '100%', background: '#3b82f6', borderRadius: 3, boxShadow: '0 0 10px #3b82f6' }} />
                </div>
              </div>
              
              <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', padding: '1.25rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.1)', borderRadius: 8 }}><Zap size={18} color="#10b981" /></div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                  Avg. Retrieval Latency: <strong style={{ color: '#10b981', fontSize: '0.9rem' }}>12ms</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Calendar size={18} color="#f59e0b" /> Knowledge Growth
            </h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {Array.from({ length: 42 }).map((_, i) => {
                const dayIndex = 41 - i; // 0 is today, 41 is oldest
                const count = activityMap[dayIndex] || 0;
                const activityLevel = count === 0 ? 0 : count > 5 ? 3 : count > 2 ? 2 : 1;

                return (
                  <div 
                    key={i} 
                    style={{ 
                      width: 14, height: 14, borderRadius: 4, 
                      background: activityLevel === 3 ? '#10b981' : activityLevel === 2 ? 'rgba(16,185,129,0.5)' : activityLevel === 1 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                      transition: 'all 0.2s', cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.02)'
                    }} 
                    title={`${count} fragments added ${dayIndex === 0 ? 'today' : `${dayIndex} days ago`}`}
                  />
                );
              })}
            </div>
            
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
              System has captured <strong style={{ color: 'white' }}>1,240</strong> cognitive fragments in the last 24 hours. The knowledge graph is highly interconnected.
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default MemoryPanel;
