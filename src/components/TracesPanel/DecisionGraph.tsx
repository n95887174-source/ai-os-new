import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, Target, Activity, ShieldCheck, 
  Terminal, Database, Globe, Search
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
      default: return <Activity size={14} />;
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
                stroke={edge.type === 'causal' ? 'rgba(59,130,246,0.3)' : 'rgba(168,85,247,0.2)'}
                strokeWidth={2}
                strokeDasharray={edge.type === 'data' ? '4 4' : 'none'}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
              />
              <motion.circle
                r={3}
                fill={edge.type === 'causal' ? '#3b82f6' : '#a855f7'}
                initial={{ cx: fromNode.x, cy: fromNode.y }}
                animate={{ cx: [fromNode.x, toNode.x], cy: [fromNode.y, toNode.y] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodesWithPos.map((node) => (
          <g key={node.id} onClick={() => onSelectNode?.(node.id)} style={{ cursor: 'pointer' }}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={28}
              fill={selectedId === node.id ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.5)'}
              stroke={selectedId === node.id ? '#3b82f6' : 'rgba(255,255,255,0.1)'}
              strokeWidth={selectedId === node.id ? 3 : 1}
              whileHover={{ scale: 1.1, stroke: '#3b82f6' }}
            />
            {selectedId === node.id && (
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={34}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            )}
            <foreignObject x={node.x - 10} y={node.y - 10} width={20} height={20}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getIcon(node.type)}
              </div>
            </foreignObject>
            <text
              x={node.x}
              y={node.y + 45}
              textAnchor="middle"
              fill={selectedId === node.id ? 'white' : 'var(--text-muted)'}
              style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 15, right: 15, display: 'flex', gap: 15, fontSize: '0.6rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 2, background: 'rgba(59,130,246,0.5)' }} /> Causal
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 2, background: 'rgba(168,85,247,0.5)', borderStyle: 'dashed' }} /> Data Flow
        </div>
      </div>
    </div>
  );
};

export default DecisionGraph;
