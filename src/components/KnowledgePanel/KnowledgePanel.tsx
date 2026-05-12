import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Link, Brain, Network, GitCommit, FileText, Search, X, Trash2, Save
} from 'lucide-react';
import { memoryService } from '../../services/MemoryService';
import { eventBus } from '../../core/events';

const KnowledgePanel: React.FC = () => {
  const [memories, setMemories] = useState(() => memoryService.getMemories());
  const [selectedNode, setSelectedNode] = useState<Record<string, unknown> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(memories.length === 0);
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    const unsub = eventBus.on('memory:updated', () => {
      setMemories([...memoryService.getMemories()]);
      setIsLoading(false);
      setError(null);
    });
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => { unsub(); clearTimeout(timer); };
  }, []);

  const [prevSelectedNodeSnapshot, setPrevSelectedNodeSnapshot] = useState(selectedNode);
  if (selectedNode && selectedNode !== prevSelectedNodeSnapshot) {
    setPrevSelectedNodeSnapshot(selectedNode);
    setEditContent(selectedNode.fullContent as string);
  }

  const filteredMemories = useMemo(() => {
    return memories.filter(m => {
      if (searchQuery && !m.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (typeFilter && m.metadata.type !== typeFilter) return false;
      return true;
    });
  }, [memories, searchQuery, typeFilter]);

  const nodes = useMemo(() => {
    return filteredMemories.slice(0, 50).map((m, i) => {
      const theta = i * 2.39996;
      const radius = 60 + i * 15;
      return {
        id: m.id,
        label: m.content.substring(0, 30) + (m.content.length > 30 ? '...' : ''),
        fullContent: m.content,
        x: 350 + Math.cos(theta) * radius,
        y: 350 + Math.sin(theta) * radius * 0.7,
        type: m.metadata.type || 'context',
        importance: m.metadata.importance || 0.5,
        source: m.metadata.source || 'system',
        timestamp: m.metadata.timestamp,
        memory: m
      };
    });
  }, [filteredMemories]);

  const edges = useMemo(() => {
    const e = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < Math.min(i + 4, nodes.length); j++) {
        e.push({
          id: `${nodes[i].id}-${nodes[j].id}`,
          source: nodes[i],
          target: nodes[j],
          strength: 1 - ((j - i) * 0.2)
        });
      }
    }
    return e;
  }, [nodes]);

  const entityCount = filteredMemories.length;
  const density = nodes.length > 1 ? Math.min(100, Math.round((edges.length / (nodes.length * 1.5)) * 100)) : 0;

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    memories.forEach(m => {
      const t = m.metadata.type || 'context';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [memories]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'decision': return '#3b82f6';
      case 'code': return '#a855f7';
      case 'chat_response': return '#f59e0b';
      case 'chat_query': return '#ec4899';
      default: return '#10b981';
    }
  };

  const handleDelete = async () => {
    if (!selectedNode) return;
    try {
      await memoryService.deleteMemory(selectedNode.id as string);
      setSelectedNode(null);
      setMemories([...memoryService.getMemories()]);
      setError(null);
    } catch {
      setError('Failed to delete memory node');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedNode || !editContent.trim()) return;
    setIsSaving(true);
    try {
      await memoryService.updateMemory(selectedNode.id as string, editContent.trim());
      setSelectedNode(null);
      setMemories([...memoryService.getMemories()]);
      setError(null);
    } catch {
      setError('Failed to update memory node');
    } finally {
      setIsSaving(false);
    }
  };

  const uniqueTypes = [...new Set(memories.map(m => m.metadata.type || 'context'))];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Network size={28} color="#a855f7" /> Semantic Knowledge Graph
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Visualizing the evolving structure of collective understanding and conceptual relationships.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.6rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <X size={14} onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto' }} />
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input type="text" placeholder="Search nodes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, color: 'white', fontSize: '0.8rem', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button onClick={() => setTypeFilter(null)} style={{ padding: '0.35rem 0.7rem', borderRadius: 8, border: 'none', background: typeFilter === null ? 'rgba(168,85,247,0.15)' : 'rgba(0,0,0,0.3)', color: typeFilter === null ? '#a855f7' : '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
            All ({memories.length})
          </button>
          {uniqueTypes.map(t => (
            <button key={t} onClick={() => setTypeFilter(typeFilter === t ? null : t)} style={{ padding: '0.35rem 0.7rem', borderRadius: 8, border: 'none', background: typeFilter === t ? `${getNodeColor(t)}20` : 'rgba(0,0,0,0.3)', color: typeFilter === t ? getNodeColor(t) : '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
              {t} ({typeCounts[t] || 0})
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 350px' : '1fr', gap: '1.5rem', flex: 1, minHeight: 0, transition: 'all 0.3s ease' }}>
        
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', background: 'radial-gradient(circle at center, rgba(168,85,247,0.05) 0%, rgba(0,0,0,0.4) 100%)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', minHeight: 400 }}>
          
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, color: '#64748b', fontSize: '0.85rem' }}>
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                Loading knowledge graph...
              </motion.div>
            </div>
          ) : nodes.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, color: '#64748b', gap: '0.75rem' }}>
              <Network size={40} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{searchQuery || typeFilter ? 'No nodes match your filter' : 'No memory nodes yet'}</p>
              <p style={{ fontSize: '0.8rem', color: '#475569', textAlign: 'center', maxWidth: 300 }}>
                {searchQuery || typeFilter ? 'Try adjusting your search or filters.' : 'Memories will appear here as the system learns and processes information.'}
              </p>
            </div>
          ) : (
          <>
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              {['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899'].map(c => (
                <radialGradient key={c} id={`glow-${c.replace('#', '')}`}>
                  <stop offset="0%" stopColor={c} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={c} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>

            {edges.map((edge, i) => (
              <motion.line key={edge.id}
                x1={edge.source.x} y1={edge.source.y}
                x2={edge.target.x} y2={edge.target.y}
                stroke={selectedNode ? (selectedNode.id === edge.source.id || selectedNode.id === edge.target.id ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.02)') : 'rgba(168,85,247,0.15)'}
                strokeWidth={edge.strength * 2}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: i * 0.02 }}
              />
            ))}
          </svg>

          {nodes.map((node, i) => {
            const isSelected = selectedNode?.id === node.id;
            const isDimmed = selectedNode && !isSelected;
            const color = getNodeColor(node.type);

            return (
              <motion.div key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: isSelected ? 1.2 : 1, opacity: isDimmed ? 0.3 : 1 }}
                transition={{ type: 'spring', damping: 20, delay: i * 0.05 }}
                onClick={() => setSelectedNode(isSelected ? null : node)}
                style={{ position: 'absolute', left: node.x - 30, top: node.y - 30, width: 60, height: 60, borderRadius: '50%', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: `2px solid ${isSelected ? 'white' : color}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.25rem', textAlign: 'center', cursor: 'pointer', boxShadow: isSelected ? `0 0 30px ${color}` : `0 0 15px ${color}40`, zIndex: isSelected ? 10 : 1 }}
              >
                {node.importance > 0.8 && !isSelected && (
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: 'absolute', inset: -4, border: `1px solid ${color}`, borderRadius: '50%' }} />
                )}
                <Brain size={18} color={isSelected ? 'white' : color} style={{ marginBottom: 2 }} />
                <div style={{ fontSize: '0.5rem', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', padding: '0 4px' }}>
                  {node.type.toUpperCase()}
                </div>
              </motion.div>
            );
          })}

          <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.4)', padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
            {[
              { label: 'Context', color: '#10b981' },
              { label: 'Decision', color: '#3b82f6' },
              { label: 'Code', color: '#a855f7' },
              { label: 'Response', color: '#f59e0b' },
              { label: 'Query', color: '#ec4899' }
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, boxShadow: `0 0 5px ${t.color}` }} /> {t.label}
              </div>
            ))}
          </div>

          <div style={{ position: 'absolute', bottom: 20, right: 20, width: 240, background: 'rgba(0,0,0,0.5)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>GRAPH TOPOLOGY</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem', color: '#e2e8f0' }}>
              <span>Connection Density</span>
              <span style={{ color: '#a855f7', fontWeight: 700 }}>{density}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginBottom: '1rem' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${density}%` }} style={{ height: '100%', background: '#a855f7', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Mapped <strong style={{ color: 'white' }}>{entityCount}</strong> cognitive entities with <strong style={{ color: 'white' }}>{edges.length}</strong> semantic relationships
              {filteredMemories.length < memories.length && ` (${memories.length - filteredMemories.length} filtered out)`}.
            </div>
          </div>
          </>
          )}
        </div>

        <AnimatePresence>
          {selectedNode && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', damping: 25 }}
              className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.8)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ padding: '0.5rem', background: `${getNodeColor(selectedNode.type as string)}20`, borderRadius: 10, border: `1px solid ${getNodeColor(selectedNode.type as string)}40` }}>
                    <GitCommit size={20} color={getNodeColor(selectedNode.type as string)} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: getNodeColor(selectedNode.type as string), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{(selectedNode.type as string)} NODE</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>{selectedNode.id as string}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleDelete} style={{ padding: '0.4rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer' }} title="Delete node"><Trash2 size={14} /></button>
                  <button onClick={() => setSelectedNode(null)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8 }}>X</button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Semantic Content</div>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                        style={{ width: '100%', minHeight: 100, padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 10, color: '#f8fafc', fontSize: '0.85rem', lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: selectedNode.type === 'code' ? 'monospace' : 'inherit' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleSaveEdit} disabled={isSaving} style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: 'none', background: '#a855f7', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => { setIsEditing(false); setEditContent(selectedNode.fullContent as string); }} style={{ padding: '0.4rem 0.8rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.85rem', color: '#f8fafc', lineHeight: 1.6, fontFamily: selectedNode.type === 'code' ? 'monospace' : 'inherit', cursor: 'pointer' }} onClick={() => setIsEditing(true)}>
                      {selectedNode.fullContent as React.ReactNode}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>Source</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {selectedNode.source as string}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>Importance</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={14} color="#f59e0b" /> {Math.round((selectedNode.importance as number) * 100)}%</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Connected Edges</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {edges.filter(e => e.source.id === selectedNode.id || e.target.id === selectedNode.id).slice(0, 4).map((e, idx) => {
                      const other = e.source.id === selectedNode.id ? e.target : e.source;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}><Link size={12} /> {other.label.substring(0, 15)}...</span>
                          <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 700 }}>STR {Math.round(e.strength * 100)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default KnowledgePanel;
