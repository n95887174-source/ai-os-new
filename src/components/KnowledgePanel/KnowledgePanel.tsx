import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Link,
  Filter, Brain,
  Network, GitCommit, FileText
} from 'lucide-react';
import { memoryService } from '../../services/MemoryService';

const KnowledgePanel: React.FC = () => {
  const memories = memoryService.getMemories();
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const nodes = useMemo(() => {
    return memories.slice(0, 30).map((m, i) => {
      // Golden ratio spiral for organic node distribution
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
        timestamp: m.metadata.timestamp
      };
    });
  }, [memories]);

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

  const entityCount = memories.length;
  const density = nodes.length > 1 ? Math.min(100, Math.round((edges.length / (nodes.length * 1.5)) * 100)) : 0;

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'decision': return '#3b82f6';
      case 'code': return '#a855f7';
      case 'system': return '#f59e0b';
      default: return '#10b981';
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Network size={28} color="#a855f7" /> Semantic Knowledge Graph
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Visualizing the evolving structure of collective understanding and conceptual relationships.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: 12, border: '1px solid var(--border)' }}>
          <button className="action-btn" style={{ padding: '0.6rem 1rem', display: 'flex', gap: 8, fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', borderRadius: 8, background: 'rgba(255,255,255,0.05)' }}>
            <Filter size={14} /> Filter Nodes
          </button>
          <button className="action-btn" style={{ padding: '0.6rem 1rem', display: 'flex', gap: 8, fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', borderRadius: 8 }}>
            <Zap size={14} /> Cluster
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 350px' : '1fr', gap: '1.5rem', flex: 1, minHeight: 0, transition: 'all 0.3s ease' }}>
        
        {/* Interactive Graph Canvas */}
        <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'radial-gradient(circle at center, rgba(168,85,247,0.05) 0%, rgba(0,0,0,0.4) 100%)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              {['#3b82f6', '#a855f7', '#10b981', '#f59e0b'].map(c => (
                <radialGradient key={c} id={`glow-${c.replace('#', '')}`}>
                  <stop offset="0%" stopColor={c} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={c} stopOpacity="0" />
                </radialGradient>
              ))}
            </defs>

            {/* Render Edges */}
            {edges.map((edge, i) => (
              <motion.line
                key={edge.id}
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

          {/* Render Nodes */}
          {nodes.map((node, i) => {
            const isSelected = selectedNode?.id === node.id;
            const isDimmed = selectedNode && !isSelected;
            const color = getNodeColor(node.type);

            return (
              <motion.div
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: isSelected ? 1.2 : 1, opacity: isDimmed ? 0.3 : 1 }}
                transition={{ type: 'spring', damping: 20, delay: i * 0.05 }}
                onClick={() => setSelectedNode(isSelected ? null : node)}
                style={{ 
                  position: 'absolute', left: node.x - 30, top: node.y - 30,
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)',
                  border: `2px solid ${isSelected ? 'white' : color}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '0.25rem', textAlign: 'center', cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 30px ${color}` : `0 0 15px ${color}40`,
                  zIndex: isSelected ? 10 : 1
                }}
              >
                {/* Outer pulsing ring for important nodes */}
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

          {/* Top Left Legend */}
          <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.4)', padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
             {[
               { label: 'Context', color: '#10b981' },
               { label: 'Decision', color: '#3b82f6' },
               { label: 'Code', color: '#a855f7' },
               { label: 'System', color: '#f59e0b' }
             ].map(t => (
               <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' }}>
                 <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, boxShadow: `0 0 5px ${t.color}` }} /> {t.label}
               </div>
             ))}
          </div>

          {/* Bottom Right Stats Overlay */}
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
              Mapped <strong style={{ color: 'white' }}>{entityCount}</strong> cognitive entities with <strong style={{ color: 'white' }}>{edges.length}</strong> semantic relationships.
            </div>
          </div>
        </div>

        {/* Node Inspector Sidebar */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', damping: 25 }}
              className="glass-panel" 
              style={{ padding: '1.5rem', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.8)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ padding: '0.5rem', background: `${getNodeColor(selectedNode.type)}20`, borderRadius: 10, border: `1px solid ${getNodeColor(selectedNode.type)}40` }}>
                    <GitCommit size={20} color={getNodeColor(selectedNode.type)} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: getNodeColor(selectedNode.type), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selectedNode.type} NODE</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>{selectedNode.id}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)} className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8 }}>X</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Semantic Content</div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.85rem', color: '#f8fafc', lineHeight: 1.6, fontFamily: selectedNode.type === 'code' ? 'monospace' : 'inherit' }}>
                    {selectedNode.fullContent}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>Source</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {selectedNode.source}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>Importance</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><Zap size={14} color="#f59e0b" /> {Math.round(selectedNode.importance * 100)}%</div>
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
