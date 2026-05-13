import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  HeartPulse, ShieldCheck, Activity, Cpu, 
  Clock, Globe,
  Server, RefreshCw, Layers, MemoryStick,
  Network, AlertTriangle, X
} from 'lucide-react';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { motion } from 'framer-motion';
import { useKeyStore } from '../../stores/useKeyStore';
import { adminService } from '../../services/AdminService';
import { eventBus } from '../../core/events';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

interface Bee {
  id: string;
  providerId: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  hoverOffset: number;
}

const HealthPanel: React.FC = () => {
  const { keys } = useKeyStore();
  const [health, setHealth] = useState(adminService.getSystemHealth());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kernelId] = useState(generateId().slice(0, 8));

  const [bees, setBees] = useState<Bee[]>([]);
  const providerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const animationRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const beePositionsRef = useRef<Bee[]>([]);
  const beeAnimationFrame = useRef<number>(0);

  const isMountedRef = useRef(true);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const unsub = eventBus.on('kernel:updated', () => {
      if (!isMountedRef.current) return;
      try {
        setHealth(adminService.getSystemHealth());
        setError(null);
      } catch (e) {
        console.warn('[HealthPanel] Failed to refresh system health:', e);
        if (isMountedRef.current) {
          setError('Failed to refresh system health');
          clearErrorAfterDelay();
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      unsub();
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [clearErrorAfterDelay]);

  useEffect(() => {
    const activeKeys = keys.filter(k => k.status === 'active');
    const newBees: Bee[] = activeKeys.map(key => ({
      id: generateId(),
      providerId: key.id,
      x: 0, y: 0,
      angle: Math.random() * 2 * Math.PI,
      speed: 0.5 + Math.random() * 2,
      hoverOffset: Math.random() * 2 * Math.PI
    }));
    setBees(newBees);
  }, [keys]);

  useEffect(() => {
    if (beePositionsRef.current.length === 0 && bees.length > 0) {
      beePositionsRef.current = bees.map(b => ({ ...b }));
    }
    if (beePositionsRef.current.length === 0) return;

    const animate = () => {
      if (!isMountedRef.current) return;

      const positions = beePositionsRef.current;
      let changed = false;

      for (let i = 0; i < positions.length; i++) {
        const bee = positions[i];
        const targetDiv = providerRefs.current.get(bee.providerId);
        if (!targetDiv) continue;

        const rect = targetDiv.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) continue;

        const targetX = rect.left + rect.width / 2 - containerRect.left;
        const targetY = rect.top + rect.height / 2 - containerRect.top;

        const dx = targetX - bee.x;
        const dy = targetY - bee.y;
        const distance = Math.hypot(dx, dy);
        const move = Math.min(distance, bee.speed);
        const angle = Math.atan2(dy, dx);
        const newX = bee.x + Math.cos(angle) * move;
        const newY = bee.y + Math.sin(angle) * move;

        const orbitX = Math.sin(Date.now() / 1000 * bee.speed + bee.angle) * 8;
        const orbitY = Math.cos(Date.now() / 1000 * bee.speed + bee.hoverOffset) * 8;

        positions[i] = {
          ...bee,
          x: newX + orbitX,
          y: newY + orbitY,
        };
        changed = true;
      }

      // Only trigger React re-render at ~10fps instead of 60fps
      if (changed && Date.now() % 6 < 1) {
        setBees([...positions]);
      }

      beeAnimationFrame.current = requestAnimationFrame(animate);
    };

    beeAnimationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (beeAnimationFrame.current) cancelAnimationFrame(beeAnimationFrame.current);
    };
  }, [bees.length, bees]);

  const handleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    setIsRefreshing(true);
    setError(null);
    try {
      adminService.reloadRuntime();
    } catch (e) {
      console.warn('[HealthPanel] Failed to reload runtime:', e);
      if (isMountedRef.current) {
        setError('Failed to reload runtime');
        clearErrorAfterDelay();
      }
      setIsRefreshing(false);
      return;
    }
    refreshTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setIsRefreshing(false);
    }, 1000);
  }, [clearErrorAfterDelay]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready': case 'active': case 'online': return '#10b981';
      case 'warning': case 'degraded': return '#f59e0b';
      case 'offline': case 'error': return '#ef4444';
      default: return '#64748b';
    }
  };

  const setProviderRef = (id: string, el: HTMLDivElement | null) => {
    if (el) providerRefs.current.set(id, el);
    else providerRefs.current.delete(id);
  };

  const activeKeys = keys.filter(k => k.status === 'active');
  const totalActive = activeKeys.length;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem', background: 'radial-gradient(circle at 20% 30%, #0a0f1e, #03060c)' }}>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.1, backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 15 L60 45 L30 60 L0 45 L0 15 Z' fill='none' stroke='%23f59e0b' stroke-width='1' /%3E%3C/svg%3E")`, backgroundSize: '60px 60px' }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <HeartPulse size={28} color="#10b981" aria-hidden="true" /> System Health Matrix
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Live monitoring of kernel vitals, node infrastructure, and service states.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ALL SYSTEMS OPERATIONAL</span>
          </div>
          <button
            onClick={handleRefresh}
            style={{ padding: '0.6rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Refresh system health"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <RefreshCw size={16} aria-hidden="true" />
              </motion.div>
            ) : (
              <RefreshCw size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ position: 'relative', zIndex: 2, padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }} role="alert">
          <AlertTriangle size={14} aria-hidden="true" /> {error}
          <button onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit' }} aria-label="Dismiss error">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        {[
          { title: 'CPU LOAD', value: `${health.vitals.cpu.toFixed(1)}%`, icon: <Cpu size={24} />, color: '#3b82f6', subtitle: 'Global Threads', fill: health.vitals.cpu },
          { title: 'MEMORY ALLOCATION', value: `${health.vitals.memory} MB`, icon: <MemoryStick size={24} />, color: '#a855f7', subtitle: 'Active JS Heap', fill: Math.min(100, (health.vitals.memory / 1024) * 100) },
          { title: 'SYSTEM UPTIME', value: `${health.uptime}s`, icon: <Clock size={24} />, color: '#10b981', subtitle: 'Continuous Operation', fill: 100 },
          { title: 'THROUGHPUT', value: `${health.vitals.throughput}`, icon: <Activity size={24} />, color: '#f59e0b', subtitle: 'Requests / Minute', fill: Math.min(100, (health.vitals.throughput / 500) * 100) }
        ].map((vital, idx) => (
          <div key={idx} style={{ padding: '1.5rem', borderRadius: 16, borderTop: `4px solid ${vital.color}`, background: `linear-gradient(180deg, ${vital.color}0A 0%, rgba(0,0,0,0) 100%)`, backgroundColor: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ color: vital.color, padding: '0.5rem', background: `${vital.color}15`, borderRadius: 10 }} aria-hidden="true">
                {vital.icon}
              </div>
              <span style={{ fontSize: '0.65rem', color: vital.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{vital.title}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.25rem' }}>{vital.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '1rem' }}>{vital.subtitle}</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div animate={{ width: `${vital.fill}%` }} transition={{ type: 'spring' }} style={{ height: '100%', background: vital.color, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ padding: '2rem', borderRadius: 16, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
            <Layers size={22} color="#3b82f6" aria-hidden="true" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>Kernel Services</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {health.services.map(svc => {
              const statusColor = getStatusColor(svc.status);
              return (
                <div key={svc.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Server size={18} color="#64748b" aria-hidden="true" />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>{svc.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>Core Microservice</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.4rem 0.8rem', background: `${statusColor}15`, borderRadius: 8, border: `1px solid ${statusColor}30` }} aria-label={`Status: ${svc.status}`}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} aria-hidden="true" />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{svc.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ position: 'relative', padding: '2rem', borderRadius: 16, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
            <Network size={22} color="#10b981" aria-hidden="true" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>Distributed Nodes</h3>
            <div style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'rgba(245,158,11,0.2)', padding: '0.2rem 0.6rem', borderRadius: 20, color: '#f59e0b' }}>
              🐝 {totalActive} active worker{totalActive !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
            {bees.map(bee => {
              const keyObj = keys.find(k => k.id === bee.providerId);
              const latency = keyObj?.latency ?? 0;
              return (
                <motion.div
                  key={bee.id}
                  style={{
                    position: 'absolute',
                    left: bee.x,
                    top: bee.y,
                    width: 24,
                    height: 24,
                    transform: 'translate(-50%, -50%)',
                    filter: 'drop-shadow(0 0 4px gold)',
                    cursor: 'default',
                    pointerEvents: 'auto'
                  }}
                  animate={{ rotateZ: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  title={`${keyObj?.provider || 'Unknown'} - ${latency ? latency + 'ms' : 'active'}`}
                >
                  🐝
                </motion.div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', zIndex: 2 }}>
            {keys.map(key => {
              const isOnline = key.status === 'active';
              return (
                <div
                  key={key.id}
                  ref={(el) => setProviderRef(key.id, el)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s' }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <ProviderIcon provider={key.provider} size={20} />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase' }}>{key.provider}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>{key.model || 'Auto-routing enabled'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: isOnline ? '#10b981' : '#ef4444' }}>
                      {key.latency ? `${key.latency}ms` : isOnline ? '< 10ms' : 'OFFLINE'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>PING LATENCY</div>
                  </div>
                </div>
              );
            })}

            {keys.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', color: '#64748b', gap: '1rem' }}>
                <Globe size={32} opacity={0.3} aria-hidden="true" />
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>No external nodes connected to cluster.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
          <ShieldCheck size={16} aria-hidden="true" /> Data is secured with AES-256 local encryption.
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
          BUILD_VER: 2.4.0-rc1 | KERNEL_ID: {kernelId}
        </div>
      </div>
    </div>
  );
};

export default HealthPanel;
