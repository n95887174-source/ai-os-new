import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Network, Cpu, Database, Cloud, Wifi, AlertCircle
} from 'lucide-react';
import { useKeyStore } from '../../stores/useKeyStore';
import { eventBus, EVENTS } from '../../core/events';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { useTranslation } from '../../i18n/useTranslation';

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
  load: number;
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

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const providerColors: Record<string, string> = {
  openrouter: '#a855f7', gemini: '#3b82f6', groq: '#f97316',
  nvidia: '#84cc16', openai: '#10b981', anthropic: '#da7756',
  default: '#f472b6'
};

const HivePanel: React.FC = () => {
  const { keys } = useKeyStore();
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<NodeState[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [packets, setPackets] = useState<DataPacket[]>(() =>
    Array.from({ length: 40 }).map((_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: 2 + Math.random() * 2, duration: 10 + Math.random() * 20,
      delay: Math.random() * 5, type: 'telemetry' as const
    }))
  );
  const [mousePos, setMousePointer] = useState({ x: 50, y: 50 });
  const mousePosRef = useRef({ x: 50, y: 50 });
  const [coreUtilization, setCoreUtilization] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevKeyIdsRef = useRef<string[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    mousePosRef.current = mousePos;
  }, [mousePos]);

  useEffect(() => {
    const currentIds = keys.map(k => k.id);
    const prevIds = prevKeyIdsRef.current;
    if (currentIds.length === prevIds.length && currentIds.every((id, i) => id === prevIds[i])) return;
    prevKeyIdsRef.current = currentIds;
    setNodes(prev => keys.map(k => {
      const existing = prev.find(n => n.id === k.id);
      if (existing) return existing;
      return {
        id: k.id, provider: k.provider,
        x: Math.random() * 70 + 15, y: Math.random() * 70 + 15,
        scale: 0.8 + Math.random() * 0.4, speed: 1 + Math.random(),
        directionX: Math.random() > 0.5 ? 1 : -1, directionY: Math.random() > 0.5 ? 1 : -1,
        color: providerColors[k.provider.toLowerCase()] || providerColors.default,
        load: 0, status: k.status,
        role: (['worker', 'analyst', 'orchestrator', 'storage'] as const)[Math.floor(Math.random() * 4)],
        state: 'idle' as const
      };
    }));
  }, [keys]);

  useEffect(() => {
    const unsubResponse = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
      if (!isMountedRef.current) return;
      try {
        setNodes(prev => prev.map(n => {
          if (n.provider.toLowerCase() === (res.provider as string).toLowerCase() || n.id === (res as unknown as Record<string, unknown>).keyId) {
            const content = (res as unknown as Record<string, unknown>).content as string || '';
            const lastTask = content.length > 25 ? content.substring(0, 22) + '...' : content;
            const newPackets = Array.from({ length: 5 }).map((_, i) => ({
              id: Date.now() + i, x: n.x + (Math.random() - 0.5) * 5, y: n.y + (Math.random() - 0.5) * 5,
              size: 3 + Math.random() * 3, duration: 1 + Math.random() * 2, delay: 0, type: 'payload' as const
            }));
            setPackets(prevP => {
              const combined = [...prevP, ...newPackets];
              return combined.length > 100 ? combined.slice(-100) : combined;
            });
            timeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) setPackets(prevP => prevP.filter(p => p.type !== 'payload'));
            }, 3000);
            return { ...n, isProcessing: true, lastTask, load: Math.min(100, n.load + 40) };
          }
          return n;
        }));
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) setNodes(prev => prev.map(n => n.isProcessing ? { ...n, isProcessing: false, lastTask: undefined } : n));
        }, 3000);
      } catch (e) {
        console.warn('[HivePanel] Error processing message event:', e);
        setError(t('hive.error_message'));
      }
    });
    return () => {
      unsubResponse();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const coreNode = { x: 50, y: 50 };
      const mPos = mousePosRef.current;
      setNodes(prev => prev.map(n => {
        const keyData = keys.find(k => k.id === n.id);
        const currentStatus = keyData?.status || 'inactive';
        const isOffline = currentStatus !== 'active';
        if (isOffline) {
          let newY = n.y + 0.5;
          if (newY > 90) newY = 90;
          return { ...n, y: newY, status: 'inactive' };
        }

        if (!isMountedRef.current) return n;
        let speedMultiplier = 0.1;
        if (n.role === 'analyst') speedMultiplier = 0.2;
        if (n.role === 'orchestrator') speedMultiplier = 0.05;
        const baseSpeed = n.speed * speedMultiplier;
        let newX = n.x, newY = n.y, newDirX = n.directionX, newDirY = n.directionY;
        let newState = n.state;
        if (n.load >= 90) newState = 'syncing';
        else if (newState === 'syncing' && n.load < 10) newState = 'idle';
        if (newState === 'syncing') {
          const dx = coreNode.x - n.x, dy = coreNode.y - n.y;
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
          const mdx = (n.x - mPos.x), mdy = (n.y - mPos.y);
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
        return { ...n, x: newX, y: newY, directionX: newDirX, directionY: newDirY, state: newState, status: currentStatus };
      }));
      if (Math.random() < 0.05) {
        setPackets(prev => {
          const p = { id: Date.now(), x: Math.random() * 100, y: 110, size: 2 + Math.random() * 2, duration: 15 + Math.random() * 10, delay: 0, type: 'telemetry' as const };
          const filtered = prev.filter(p => p.type !== 'telemetry' || Math.random() > 0.02);
          const combined = [...filtered, p];
          return combined.length > 100 ? combined.slice(-100) : combined;
        });
      }
      setCoreUtilization(prev => Math.max(0, prev - 0.1));
    }, 50);
    return () => clearInterval(interval);
  }, [keys]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 100;
    const ny = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePointer({ x: nx, y: ny });
    mousePosRef.current = { x: nx, y: ny };
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const id = Date.now();
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1500);
  };

  const selectedKeyData = keys.find(k => k.id === selectedNode);
  const activeNodesCount = nodes.filter(n => n.status === 'active').length;

  return (
    <div className="hive-wrapper">
      <div className="hive-header">
        <div>
          <h2 className="hive-heading"><Network size={28} color="#3b82f6" aria-hidden="true" /> {t('hive.title')}</h2>
          <p className="hive-subtitle">{t('hive.subtitle')}</p>
        </div>
        <div className="hive-core-badge" aria-label={`Core load: ${Math.round(coreUtilization)}%`}>
          <Activity size={16} color="#3b82f6" aria-hidden="true" />
          <span className="hive-core-text">{t('hive.core_load')}: {Math.round(coreUtilization)}%</span>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="hive-error-banner" role="alert"
          >
            <AlertCircle size={18} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} className="hive-error-close" aria-label={t('common.dismiss_error')}>X</button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="hive-tank--loading" style={{ background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)' }}>
          <Network size={48} className="pulsing" opacity={0.3} aria-hidden="true" />
          <span className="hive-loading-text">{t('hive.initializing')}</span>
        </div>
      )}

      {!isLoading && keys.length === 0 && (
        <div className="hive-tank--empty" style={{ borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
          <Cloud size={48} opacity={0.2} aria-hidden="true" />
          <div style={{ textAlign: 'center' }}>
            <span className="hive-empty-title">{t('hive.empty_title')}</span>
            <span className="hive-empty-desc">{t('hive.empty_desc')}</span>
          </div>
        </div>
      )}

      {!isLoading && keys.length > 0 && (
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onClick={handleContainerClick}
        className="hive-tank"
        style={{ background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)' }}
        role="img"
        aria-label="Swarm topology visualization"
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, #3b82f6 1px, transparent 1px), linear-gradient(to bottom, #3b82f6 1px, transparent 1px)',
          pointerEvents: 'none', zIndex: 1 }} />

        <motion.div style={{ position: 'absolute', top: '50%', left: '50%', x: '-50%', y: '-50%',
          width: 200, height: 200, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)',
          zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={64} color="#3b82f6" style={{ opacity: 0.8 }} aria-hidden="true" />
            <div style={{ position: 'absolute', top: '100%', marginTop: 8, color: '#3b82f6', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em' }}>{t('hive.system_kernel_label')}</div>
          </div>
        </motion.div>

        {packets.map((p) => (
          <motion.div key={p.id} initial={{ y: `${p.y}%`, left: `${p.x}%`, opacity: 0 }}
            animate={{ y: p.type === 'telemetry' ? '-10%' : `${p.y - 10}%`, opacity: p.type === 'payload' ? [0, 1, 0] : [0, 0.4, 0], scale: p.type === 'payload' ? [0.5, 1.5, 0.8] : 1 }}
            transition={{ duration: p.duration, repeat: p.type === 'telemetry' ? Infinity : 0, ease: 'linear', delay: p.delay }}
            style={{ position: 'absolute', width: p.size, height: p.size, borderRadius: p.type === 'payload' ? '2px' : '50%',
              background: p.type === 'payload' ? '#10b981' : '#3b82f6',
              filter: p.type === 'payload' ? 'blur(1px) drop-shadow(0 0 5px #10b981)' : 'none',
              transform: p.type === 'payload' ? 'rotate(45deg)' : 'none', zIndex: 3 }}
          />
        ))}

        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
          {nodes.filter(n => n.state === 'syncing' && n.status === 'active').map(n => (
            <motion.line key={`edge-${n.id}`} x1={`${n.x}%`} y1={`${n.y}%`} x2="50%" y2="50%"
              stroke={n.color} strokeWidth={1.5} initial={{ opacity: 0 }} animate={{ opacity: 0.4 }}
              style={{ filter: `drop-shadow(0 0 5px ${n.color})` }} />
          ))}
        </svg>

        {nodes.map((n) => {
          const isSelected = selectedNode === n.id;
          const isOffline = n.status !== 'active';
          return (
            <motion.div key={n.id}
              animate={{ left: `${n.x}%`, top: `${n.y}%`, scale: isSelected ? 1.3 : 1 }}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              onClick={() => setSelectedNode(isSelected ? null : n.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedNode(isSelected ? null : n.id); } }}
              style={{ position: 'absolute', cursor: 'pointer', zIndex: isSelected ? 100 : 10, transformOrigin: 'center', opacity: isOffline ? 0.4 : 1, filter: isOffline ? 'grayscale(1)' : 'none' }}
              role="button" tabIndex={0} aria-label={`${n.provider}: ${n.role}, ${n.status}`}
            >
              <motion.div animate={n.isProcessing ? { scale: [1, 1.2, 1], filter: [`drop-shadow(0 0 10px ${n.color})`, `drop-shadow(0 0 20px ${n.color})`, `drop-shadow(0 0 10px ${n.color})`] } : {}} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 32 * n.scale, height: 32 * n.scale,
                  background: isOffline ? '#334155' : 'rgba(15,23,42,0.8)',
                  border: `2px solid ${isOffline ? '#475569' : n.color}`,
                  borderRadius: n.role === 'storage' ? '8px' : '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isOffline ? 'none' : `inset 0 0 10px ${n.color}40`,
                  backdropFilter: 'blur(4px)' }}>
                  {n.role === 'worker' ? <Activity size={16 * n.scale} color={n.color} aria-hidden="true" /> :
                   n.role === 'analyst' ? <Wifi size={16 * n.scale} color={n.color} aria-hidden="true" /> :
                   n.role === 'storage' ? <Database size={16 * n.scale} color={n.color} aria-hidden="true" /> :
                   <Cloud size={16 * n.scale} color={n.color} aria-hidden="true" />}
                </div>
                <div style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: isOffline ? '#ef4444' : n.isProcessing ? '#10b981' : n.color, boxShadow: `0 0 5px ${isOffline ? '#ef4444' : n.color}` }} />
                <div className="hive-node-label" style={{ background: isSelected ? n.color : 'rgba(15,23,42,0.8)', border: `1px solid ${n.color}40` }}>{n.provider}</div>
                <AnimatePresence>
                  {n.lastTask && (
                    <motion.div initial={{ opacity: 0, scale: 0.5, y: 10 }} animate={{ opacity: 1, scale: 1, y: -40 }} exit={{ opacity: 0, scale: 0.5 }}
                      style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(255,255,255,0.95)', color: '#0f172a', padding: '4px 10px', borderRadius: '8px 8px 8px 0',
                        fontSize: '0.6rem', fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 150, pointerEvents: 'none', border: `1px solid ${n.color}` }}>
                      {n.lastTask}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}

        {ripples.map(r => (
          <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: 20, height: 20, borderRadius: '50%', border: '2px solid #3b82f6', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 5, animation: 'hive-ping-expand 1.5s ease-out forwards' }} />
        ))}

        <div className="hive-status-badge">
          <Wifi size={14} color="#3b82f6" aria-hidden="true" /> {activeNodesCount} {t('nav.secure_nodes')}
        </div>
      </div>
      )}

      <AnimatePresence>
        {selectedKeyData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="glass-panel hive-inspector"
            style={{ border: `1px solid ${providerColors[selectedKeyData.provider.toLowerCase()] || '#3b82f6'}`, left: '50%', x: '-50%' }}
            role="dialog" aria-label={t('hive.inspecting').replace('{0}', selectedKeyData.label)}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${providerColors[selectedKeyData.provider.toLowerCase()] || '#fff'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={24} color={providerColors[selectedKeyData.provider.toLowerCase()] || '#fff'} aria-hidden="true" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>{selectedKeyData.label}</h3>
                <span style={{ fontSize: '0.6rem', background: selectedKeyData.status === 'active' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: selectedKeyData.status === 'active' ? '#10b981' : '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>{selectedKeyData.status.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                <span>{t('hive.latency_label')}<strong style={{ color: '#e2e8f0' }}>{Math.round(selectedKeyData.stats?.avgLatency || 0)}ms</strong></span>
                <span>{t('hive.success_label')}<strong style={{ color: '#10b981' }}>{((selectedKeyData.stats?.successCount || 0) / (Math.max(1, (selectedKeyData.stats?.successCount || 0) + (selectedKeyData.stats?.errorCount || 0))) * 100).toFixed(0)}%</strong></span>
              </div>
            </div>
            <button onClick={() => setSelectedNode(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem', borderRadius: 8 }} aria-label={t('hive.close_inspector')}>
              {t('common.close')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <ModuleInfo moduleKey="hive" />
    </div>
  );
};

export default HivePanel;
