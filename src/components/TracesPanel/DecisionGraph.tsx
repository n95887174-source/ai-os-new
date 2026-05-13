import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Target, Activity, ShieldCheck, 
  Search
} from 'lucide-react';
import type { CognitiveStep } from '../../services/CognitiveService';

interface DecisionGraphProps {
  steps: CognitiveStep[];
  edges: { from: string; to: string; type: string }[];
  selectedId?: string | null;
  onSelectNode?: (id: string) => void;
}

const DecisionGraph: React.FC<DecisionGraphProps> = ({ steps, edges, selectedId, onSelectNode }) => {
  // Simple layout engine for horizontal DAG
  const nodesWithPos = useMemo(() => {
    return steps.map((s, i) => ({
      ...s,
      x: 100 + (i * 220),
      y: 150 + (i % 2 === 0 ? -40 : 40)
    }));
  }, [steps]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'routing': return <Search size={14} color="#3b82f6" />;
      case 'reasoning': return <Brain size={14} color="#a855f7" />;
      case 'action': return <Target size={14} color="#f59e0b" />;
      case 'verification': return <ShieldCheck size={14} color="#10b981" />;
      default: return <Activity size={14} color="#64748b" />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, nodeId: string) => {
    if ((e.key === 'Enter' || e.key === ' ') && onSelectNode) {
      e.preventDefault();
      onSelectNode(nodeId);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
      <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
        {/* Connection Edges */}
        {edges.map((edge, idx) => {
          const fromNode = nodesWithPos.find(n => n.id === edge.from);
          const toNode = nodesWithPos.find(n => n.id === edge.to);
          if (!fromNode || !toNode || fromNode.x === undefined || toNode.x === undefined) return null;

          return (
            <g key={`edge-${idx}`}>
              <motion.path
                d={`M ${fromNode.x} ${fromNode.y} C ${(fromNode.x + toNode.x) / 2} ${fromNode.y}, ${(fromNode.x + toNode.x) / 2} ${toNode.y}, ${toNode.x} ${toNode.y}`}
                fill="none"
                stroke={edge.type === 'causal' ? 'rgba(59,130,246,0.2)' : 'rgba(168,85,247,0.15)'}
                strokeWidth={3}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: idx * 0.1 + 0.3, ease: 'easeInOut' }}
              />
              <motion.path
                d={`M ${fromNode.x} ${fromNode.y} C ${(fromNode.x + toNode.x) / 2} ${fromNode.y}, ${(fromNode.x + toNode.x) / 2} ${toNode.y}, ${toNode.x} ${toNode.y}`}
                fill="none"
                stroke={edge.type === 'causal' ? 'rgba(59,130,246,0.8)' : 'rgba(168,85,247,0.8)'}
                strokeWidth={2}
                strokeDasharray="4 12"
                initial={{ pathLength: 1, strokeDashoffset: 0, opacity: 0 }}
                animate={{ strokeDashoffset: -16, opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear', opacity: { delay: idx * 0.1 + 0.8, duration: 0.5 } }}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodesWithPos.map((node, idx) => {
          const isSelected = selectedId === node.id;
          const strokeColor = node.type === 'reasoning' ? '#a855f7' : node.type === 'action' ? '#f59e0b' : node.type === 'verification' ? '#10b981' : '#3b82f6';
          const nodeLabel = node.label || node.type;
          
          return (
            <g 
              key={node.id}
              onClick={() => onSelectNode?.(node.id)}
              onKeyDown={(e) => handleKeyDown(e, node.id)}
              role="button"
              tabIndex={0}
              aria-label={`Decision node: ${nodeLabel}, type ${node.type}`}
              style={{ cursor: 'pointer' }}
            >
              <motion.g
                initial={{ opacity: 0, scale: 0, x: node.x - 50 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ type: 'spring', delay: idx * 0.1, stiffness: 200, damping: 20 }}
                whileHover={{ scale: 1.1 }}
              >
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={28}
                  fill={isSelected ? `${strokeColor}33` : 'rgba(15,23,42,0.8)'}
                  stroke={isSelected ? strokeColor : 'rgba(255,255,255,0.1)'}
                  strokeWidth={isSelected ? 3 : 1}
                  style={{ filter: isSelected ? `drop-shadow(0 0 10px ${strokeColor}80)` : 'none' }}
                />
                {isSelected && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={34}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                )}
                <foreignObject x={node.x - 12} y={node.y - 12} width={24} height={24}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    {getIcon(node.type)}
                  </div>
                </foreignObject>
                <motion.text
                  x={node.x}
                  y={node.y + 45}
                  textAnchor="middle"
                  fill={isSelected ? 'white' : '#64748b'}
                  style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.1 + 0.3 }}
                >
                  {nodeLabel}
                </motion.text>
              </motion.g>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div 
        style={{ position: 'absolute', bottom: 15, right: 15, display: 'flex', gap: 15, fontSize: '0.6rem', color: '#94a3b8' }}
        aria-label="Graph legend"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 2, background: 'rgba(59,130,246,0.5)' }} aria-hidden="true" /> Causal
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 2, background: 'rgba(168,85,247,0.5)', borderStyle: 'dashed' }} aria-hidden="true" /> Data Flow
        </div>
      </div>
    </div>
  );
};

export default DecisionGraph;
