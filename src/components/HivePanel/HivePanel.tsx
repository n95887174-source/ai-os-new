import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Zap, ShieldCheck, 
  Hexagon, Network, Cpu, Database, Cloud, Wifi
} from 'lucide-react';
import { useKeyStore } from '../../stores/useKeyStore';
import { eventBus, EVENTS } from '../../core/events';

interface NodeState {
  id: string;
  provider: string;
  x: number;
  y: number;
  scale: number;
  speed: number;
  directionX: number;
  directionY: number;
  color: string;
  isProcessing?: boolean;
  load: number; // 0 to 100
  status: string;
  lastTask?: string;
  role: 'orchestrator' | 'worker' | 'analyst' | 'storage';
  state: 'idle' | 'processing' | 'syncing';
  targetNodeId?: string;
}

interface DataPacket {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type: 'telemetry' | 'payload';
}

const HivePanel: React.FC = () => {
  const { keys } = useKeyStore();
  const [nodes, setNodes] = useState<NodeState[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [packets, setPackets] = useState<DataPacket[]>([]);
  const [mousePos, setMousePointer] = useState({ x: 50, y: 50 });
  const [coreUtilization, setCoreUtilization] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const providerColors: Record<string, string> = {
    openrouter: '#a855f7',
    gemini: '#3b82f6',
    groq: '#f97316',
    nvidia: '#84cc16',
    openai: '#10b981',
    anthropic: '#da7756',
    default: '#f472b6'
  };

  useEffect(() => {
    // Background telemetry particles
    const initialPackets = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 2,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
      type: 'telemetry' as const
    }));
    setPackets(initialPackets);
  }, []);

  useEffect(() => {
    const initialNodes = keys.map(k => {
      const existing = nodes.find(n => n.id === k.id);
      if (existing) return existing;

      return {
        id: k.id,
        provider: k.provider,
        x: Math.random() * 70 + 15,
        y: Math.random() * 70 + 15,
        scale: 0.8 + Math.random() * 0.4,
        speed: 1 + Math.random(),
        directionX: Math.random() > 0.5 ? 1 : -1,
        directionY: Math.random() > 0.5 ? 1 : -1,
        color: providerColors[k.provider.toLowerCase()] || providerColors.default,
        load: 0,
        status: k.status,
        role: (['worker', 'analyst', 'orchestrator', 'storage'] as const)[Math.floor(Math.random() * 4)],
        state: 'idle' as const
      };
    });
    setNodes(initialNodes);
  }, [keys]);

  useEffect(() => {
    const unsubResponse = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res: any) => {
      setNodes(prev => prev.map(n => {
        if (n.provider.toLowerCase() === res.provider.toLowerCase() || n.id === res.keyId) {
          const content = res.content || '';
          const lastTask = content.length > 25 ? content.substring(0, 22) + '...' : content;
          
          const newPackets = Array.from({ length: 5 }).map((_, i) => ({
            id: Date.now() + i,
            x: n.x + (Math.random() - 0.5) * 5,
            y: n.y + (Math.random() - 0.5) * 5,
            size: 3 + Math.random() * 3,
            duration: 1 + Math.random() * 2,
            delay: 0,
            type: 'payload' as const
          }));
          setPackets(prevP => [...prevP, ...newPackets]);
          setTimeout(() => setPackets(prevP => prevP.filter(p => p.type !== 'payload')), 3000);

          return { ...n, isProcessing: true, lastTask, load: Math.min(100, n.load + 40) };
        }
        return n;
      }));

      setTimeout(() => {
        setNodes(prev => prev.map(n => n.isProcessing ? { ...n, isProcessing: false, lastTask: undefined } : n));
      }, 3000);
    });
    return () => unsubResponse();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const coreNode = { x: 50, y: 50 };

      setNodes(prev => prev.map(n => {
        const keyData = keys.find(k => k.id === n.id);
        const currentStatus = keyData?.status || 'inactive';
        const isOffline = currentStatus !== 'active';
        
        if (isOffline) {
          let newY = n.y + 0.5;
          if (newY > 90) newY = 90;
          return { ...n, y: newY, status: currentStatus };
        }

        let speedMultiplier = 0.1;
        if (n.role === 'analyst') speedMultiplier = 0.2;
        if (n.role === 'orchestrator') speedMultiplier = 0.05;
        
        const baseSpeed = n.speed * speedMultiplier;
        let newX = n.x;
        let newY = n.y;
        let newDirX = n.directionX;
        let newDirY = n.directionY;
        let newState = n.state;

        if (n.load >= 90) {
          newState = 'syncing';
        } else if (newState === 'syncing' && n.load < 10) {
          newState = 'idle';
        }

        if (newState === 'syncing') {
          const dx = coreNode.x - n.x;
          const dy = coreNode.y - n.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 8) {
            setCoreUtilization(prev => Math.min(100, prev + 5));
            return { ...n, load: 0, state: 'idle' };
          } else {
            newX += (dx / dist) * baseSpeed * 2;
            newY += (dy / dist) * baseSpeed * 2;
            newDirX = dx > 0 ? 1 : -1;
          }
        } else {
          newX += baseSpeed * n.directionX;
          newY += baseSpeed * n.directionY;
          
          if (Math.random() < 0.05) newDirX = Math.random() > 0.5 ? 1 : -1;
          if (Math.random() < 0.05) newDirY = Math.random() > 0.5 ? 1 : -1;

          // Gentle avoidance of mouse cursor
          const mdx = (n.x - mousePos.x);
          const mdy = (n.y - mousePos.y);
          const mdist = Math.sqrt(mdx*mdx + mdy*mdy);

          if (mdist < 15 && n.role !== 'orchestrator') {
            newDirX = mdx > 0 ? 1 : -1;
            newDirY = mdy > 0 ? 1 : -1;
            newX += newDirX * 0.5;
            newY += newDirY * 0.5;
          }
        }

        if (newX > 90) { newX = 90; newDirX = -1; }
        if (newX < 10) { newX = 10; newDirX = 1; }
        if (newY > 90) { newY = 90; newDirY = -1; }
        if (newY < 10) { newY = 10; newDirY = 1; }

        return { 
          ...n, x: newX, y: newY, 
          directionX: newDirX, directionY: newDirY,
          state: newState,
          status: currentStatus
        };
      }));

      // Background telemetry generation
      if (Math.random() < 0.05) {
        setPackets(prev => {
          const p = {
            id: Date.now(),
            x: Math.random() * 100,
            y: 110,
            size: 2 + Math.random() * 2,
            duration: 15 + Math.random() * 10,
            delay: 0,
            type: 'telemetry' as const
          };
          return [...prev.filter(p => p.type !== 'telemetry' || Math.random() > 0.02), p];
        });
      }

      setCoreUtilization(prev => Math.max(0, prev - 0.1));

    }, 50);
    return () => clearInterval(interval);
  }, [mousePos, keys]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePointer({ x, y });
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.className = 'network-ping';
    ripple.style.position = 'absolute';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    ripple.style.width = '20px';
    ripple.style.height = '20px';
    ripple.style.borderRadius = '50%';
    ripple.style.border = '2px solid #3b82f6';
    ripple.style.transform = 'translate(-50%, -50%)';
    ripple.style.animation = 'ping-expand 1.5s ease-out forwards';
    containerRef.current.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1500);
  };

  const selectedKeyData = keys.find(k => k.id === selectedNode);
  const activeNodesCount = nodes.filter(n => n.status === 'active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', minHeight: 700 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Network size={28} color="#3b82f6" /> Swarm Intelligence Topology
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
            Live visualization of multi-agent routing, cognitive load, and cluster synchronization.
          </p>
        </div>
        <div style={{ padding: '0.6rem 1rem', background: 'rgba(59,130,246,0.1)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} color="#3b82f6" />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.05em' }}>CORE LOAD: {Math.round(coreUtilization)}%</span>
        </div>
      </div>

      <style>{`
        @keyframes ping-expand {
          0% { width: 20px; height: 20px; opacity: 1; border-width: 4px; }
          100% { width: 150px; height: 150px; opacity: 0; border-width: 1px; }
        }
      `}</style>

      {/* Main Canvas */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onClick={handleContainerClick}
        style={{ 
          flex: 1, position: 'relative', 
          background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)', 
          borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)',
          cursor: 'crosshair',
        }}
      >
        {/* Grid Background */}
        <div style={{ 
          position: 'absolute', inset: 0, opacity: 0.1, 
          backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)',
          pointerEvents: 'none', zIndex: 1
        }} />

        {/* Central Core Node */}
        <motion.div 
          style={{
            position: 'absolute', top: '50%', left: '50%', x: '-50%', y: '-50%',
            width: 200, height: 200, 
            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)',
            zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Cpu size={64} color="#3b82f6" style={{ opacity: 0.8 }} />
             <div style={{ position: 'absolute', top: '100%', marginTop: 8, color: '#3b82f6', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em' }}>
               SYSTEM KERNEL
             </div>
          </div>
        </motion.div>

        {/* Data Packets */}
        {packets.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: p.type === 'telemetry' ? `${p.y}%` : `${p.y}%`, left: `${p.x}%`, opacity: 0 }}
            animate={{ 
              y: p.type === 'telemetry' ? '-10%' : `${p.y - 10}%`, 
              opacity: p.type === 'payload' ? [0, 1, 0] : [0, 0.4, 0],
              scale: p.type === 'payload' ? [0.5, 1.5, 0.8] : 1
            }}
            transition={{ 
              duration: p.duration, 
              repeat: p.type === 'telemetry' ? Infinity : 0, 
              ease: 'linear', 
              delay: p.delay 
            }}
            style={{ 
              position: 'absolute', width: p.size, height: p.size, 
              borderRadius: p.type === 'payload' ? '2px' : '50%', 
              background: p.type === 'payload' ? '#10b981' : '#3b82f6', 
              filter: p.type === 'payload' ? 'blur(1px) drop-shadow(0 0 5px #10b981)' : 'none',
              transform: p.type === 'payload' ? 'rotate(45deg)' : 'none',
              zIndex: 3
            }}
          />
        ))}

        {/* Edge Lines connecting Nodes to Core when Syncing */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
          {nodes.filter(n => n.state === 'syncing' && n.status === 'active').map(n => (
            <motion.line
              key={`edge-${n.id}`}
              x1={`${n.x}%`} y1={`${n.y}%`}
              x2="50%" y2="50%"
              stroke={n.color}
              strokeWidth={1.5}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              style={{ filter: `drop-shadow(0 0 5px ${n.color})` }}
            />
          ))}
        </svg>

        {/* Inference Nodes */}
        {nodes.map((n) => {
          const isSelected = selectedNode === n.id;
          const isOffline = n.status !== 'active';
          
          return (
            <motion.div
              key={n.id}
              animate={{ 
                left: `${n.x}%`, 
                top: `${n.y}%`,
                scale: isSelected ? 1.3 : 1
              }}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              onClick={() => setSelectedNode(isSelected ? null : n.id)}
              style={{ 
                position: 'absolute', cursor: 'pointer', zIndex: isSelected ? 100 : 10,
                transformOrigin: 'center',
                opacity: isOffline ? 0.4 : 1,
                filter: isOffline ? 'grayscale(1)' : 'none'
              }}
            >
              <motion.div 
                animate={n.isProcessing ? { scale: [1, 1.2, 1], filter: [`drop-shadow(0 0 10px ${n.color})`, `drop-shadow(0 0 20px ${n.color})`, `drop-shadow(0 0 10px ${n.color})`] } : {}}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div style={{ 
                  width: 32 * n.scale, height: 32 * n.scale, 
                  background: isOffline ? '#334155' : 'rgba(15,23,42,0.8)',
                  border: `2px solid ${isOffline ? '#475569' : n.color}`,
                  borderRadius: n.role === 'storage' ? '8px' : '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isOffline ? 'none' : `inset 0 0 10px ${n.color}40`,
                  backdropFilter: 'blur(4px)'
                }}>
                  {n.role === 'worker' ? <Activity size={16 * n.scale} color={n.color} /> :
                   n.role === 'analyst' ? <Wifi size={16 * n.scale} color={n.color} /> :
                   n.role === 'storage' ? <Database size={16 * n.scale} color={n.color} /> :
                   <Cloud size={16 * n.scale} color={n.color} />}
                </div>

                {/* Status Indicator */}
                <div style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: isOffline ? '#ef4444' : n.isProcessing ? '#10b981' : n.color, boxShadow: `0 0 5px ${isOffline ? '#ef4444' : n.color}` }} />

                <div style={{ 
                  position: 'absolute', bottom: -24,
                  fontSize: '0.5rem', fontWeight: 800, color: 'white', textTransform: 'uppercase',
                  background: isSelected ? n.color : 'rgba(15,23,42,0.8)', 
                  padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap',
                  border: `1px solid ${n.color}40`,
                  letterSpacing: '0.05em'
                }}>
                  {n.provider}
                </div>

                <AnimatePresence>
                  {n.lastTask && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: -40 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      style={{ 
                        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(255,255,255,0.95)', color: '#0f172a', 
                        padding: '4px 10px', borderRadius: '8px 8px 8px 0',
                        fontSize: '0.6rem', fontWeight: 700, whiteSpace: 'nowrap',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 150,
                        pointerEvents: 'none', border: `1px solid ${n.color}`
                      }}
                    >
                      {n.lastTask}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}

        {/* Top Left Status */}
        <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(15,23,42,0.6)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
           <Wifi size={14} color="#3b82f6" /> {activeNodesCount} SECURE NODES CONNECTED
        </div>
      </div>

      {/* Selected Node Inspector */}
      <AnimatePresence>
        {selectedKeyData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="glass-panel"
            style={{ 
              position: 'absolute', bottom: 30, left: '50%', x: '-50%', width: 450, 
              background: 'rgba(15, 23, 42, 0.95)', border: `1px solid ${providerColors[selectedKeyData.provider.toLowerCase()] || '#3b82f6'}`,
              padding: '1.25rem', zIndex: 200, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.25rem', alignItems: 'center'
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${providerColors[selectedKeyData.provider.toLowerCase()] || '#fff'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={24} color={providerColors[selectedKeyData.provider.toLowerCase()] || '#fff'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>{selectedKeyData.label}</h3>
                <span style={{ fontSize: '0.6rem', background: selectedKeyData.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: selectedKeyData.status === 'active' ? '#10b981' : '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>{selectedKeyData.status.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                <span>Latency: <strong style={{ color: '#e2e8f0' }}>{Math.round(selectedKeyData.stats?.avgLatency || 0)}ms</strong></span>
                <span>Success: <strong style={{ color: '#10b981' }}>{((selectedKeyData.stats?.successCount || 0) / (Math.max(1, (selectedKeyData.stats?.successCount || 0) + (selectedKeyData.stats?.errorCount || 0))) * 100).toFixed(0)}%</strong></span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedNode(null)} 
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem', borderRadius: 8 }}
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default HivePanel;
