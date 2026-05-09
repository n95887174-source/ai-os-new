import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, Database, Zap, Share2, 
  Search, Filter, Activity, Brain
} from 'lucide-react';
import { memoryService } from '../../services/MemoryService';
import type { MemoryEntry } from '../../types/memory';

const KnowledgePanel: React.FC = () => {
  const memories = memoryService.getMemories();

  const nodes = useMemo(() => {
    return memories.slice(0, 20).map((m, i) => ({
      id: m.id,
      label: m.content.substring(0, 20) + (m.content.length > 20 ? '...' : ''),
      x: 380 + Math.cos(i * 1.5) * Math.min(220, 100 + i * 15),
      y: 280 + Math.sin(i * 1.5) * Math.min(200, 80 + i * 12),
      type: m.metadata.type
    }));
  }, [memories]);

  const entityCount = memories.length;
  const relationshipCount = Math.max(0, nodes.length * (nodes.length - 1) / 4);
  const density = nodes.length > 1 ? Math.round((relationshipCount / (nodes.length * (nodes.length - 1) / 2)) * 100) : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={24} color="#3b82f6" /> Semantic Knowledge Graph
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Visualizing the evolving structure of collective understanding.</p>
        </div>
        <div className="glass-panel" style={{ padding: '0.4rem', display: 'flex', gap: '0.5rem' }}>
          <button className="action-btn active"><Share2 size={16} /></button>
          <button className="action-btn"><Database size={16} /></button>
          <button className="action-btn"><Activity size={16} /></button>
        </div>
      </div>

      <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          {/* Mock Edges */}
          {nodes.map((node, i) => (
            i > 0 && (
              <motion.line
                key={`edge-${i}`}
                x1={nodes[0].x} y1={nodes[0].y}
                x2={node.x} y2={node.y}
                stroke="rgba(59,130,246,0.1)"
                strokeWidth={1}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
              />
            )
          ))}
        </svg>

        {nodes.map(node => (
          <motion.div
            key={node.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            style={{ 
              position: 'absolute', left: node.x - 40, top: node.y - 40,
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(10px)',
              border: `1px solid ${node.type === 'decision' ? '#3b82f6' : '#a855f7'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '0.5rem', textAlign: 'center', cursor: 'pointer'
            }}
          >
            <Brain size={16} color={node.type === 'decision' ? '#3b82f6' : '#a855f7'} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'white', overflow: 'hidden', height: 24 }}>{node.label}</div>
          </motion.div>
        ))}

        {/* Graph Overlay UI */}
        <div style={{ position: 'absolute', bottom: 20, right: 20, width: 200 }} className="glass-panel">
          <div style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '0.5rem' }}>GRAPH DENSITY</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
              <div style={{ width: `${density}%`, height: '100%', background: '#3b82f6', borderRadius: 2 }} />
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              <strong>{entityCount}</strong> entities identified with <strong>{Math.round(relationshipCount)}</strong> active relationships.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgePanel;
