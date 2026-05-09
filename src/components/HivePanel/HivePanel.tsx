import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Zap, Sparkles, MousePointer2, Thermometer, ShieldCheck, 
  Hexagon, Star, Cloud
} from 'lucide-react';
import { useKeyStore } from '../../stores/useKeyStore';
import { eventBus, EVENTS } from '../../core/events';

interface BeeState {
  id: string;
  provider: string;
  x: number;
  y: number;
  scale: number;
  speed: number;
  directionX: number;
  directionY: number;
  color: string;
  isPulsing?: boolean;
  nectar: number; // 0 to 100
  status: string;
  lastWords?: string;
  personality: 'worker' | 'scout' | 'queen' | 'drone';
  state: 'wandering' | 'gathering' | 'returning';
  targetFlowerId?: string;
}

interface Flower {
  id: string;
  x: number;
  y: number;
  size: number;
  nectarAmount: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type?: 'pollen' | 'data' | 'honey';
}

const HivePanel: React.FC = () => {
  const { keys } = useKeyStore();
  const [bees, setBees] = useState<BeeState[]>([]);
  const [selectedBee, setSelectedBee] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [mousePos, setMousePointer] = useState({ x: 50, y: 50 });
  const [honeycombLevel, setHoneycombLevel] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
      type: 'pollen' as const
    }));
    setParticles(newParticles);
  }, []);

  const providerColors: Record<string, string> = {
    openrouter: '#a855f7',
    gemini: '#eab308',
    groq: '#f97316',
    nvidia: '#84cc16',
    openai: '#10a37f',
    anthropic: '#da7756',
    default: '#fcd34d'
  };

  useEffect(() => {
    const initialBees = keys.map(k => {
      const existing = bees.find(b => b.id === k.id);
      if (existing) return existing;

      return {
        id: k.id,
        provider: k.provider,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        scale: 0.7 + Math.random() * 0.4,
        speed: 2 + Math.random() * 2,
        directionX: Math.random() > 0.5 ? 1 : -1,
        directionY: Math.random() > 0.5 ? 1 : -1,
        color: providerColors[k.provider.toLowerCase()] || providerColors.default,
        nectar: 0,
        status: k.status,
        personality: (['worker', 'scout', 'queen', 'drone'] as const)[Math.floor(Math.random() * 4)],
        state: 'wandering' as const
      };
    });
    setBees(initialBees);
  }, [keys]);

  useEffect(() => {
    const unsubResponse = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res: any) => {
      setBees(prev => prev.map(b => {
        if (b.provider.toLowerCase() === res.provider.toLowerCase() || b.id === res.keyId) {
          const content = res.content || '';
          const lastWords = content.length > 30 ? content.substring(0, 27) + '...' : content;
          
          const dataParticles = Array.from({ length: 4 }).map((_, i) => ({
            id: Date.now() + i,
            x: b.x + (Math.random() - 0.5) * 5,
            y: b.y + (Math.random() - 0.5) * 5,
            size: 3 + Math.random() * 4,
            duration: 1 + Math.random() * 2,
            delay: 0,
            type: 'data' as const
          }));
          setParticles(prevP => [...prevP, ...dataParticles]);
          setTimeout(() => {
             setParticles(prevP => prevP.filter(p => p.type !== 'data'));
          }, 4000);

          return { ...b, isPulsing: true, lastWords, nectar: Math.min(100, b.nectar + 30) };
        }
        return b;
      }));

      setTimeout(() => {
        setBees(prev => prev.map(b => b.isPulsing ? { ...b, isPulsing: false, lastWords: undefined } : b));
      }, 3000);
    });

    return () => unsubResponse();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const hiveCenter = { x: 50, y: 50 };

      setBees(prev => prev.map(b => {
        const keyData = keys.find(k => k.id === b.id);
        const currentStatus = keyData?.status || 'inactive';
        const isDead = currentStatus !== 'active';
        
        if (isDead) {
          let newY = b.y + 1;
          if (newY > 90) newY = 90;
          return { ...b, y: newY, status: currentStatus };
        }

        let speedMultiplier = 0.15;
        if (b.personality === 'scout') speedMultiplier = 0.25;
        if (b.personality === 'queen') speedMultiplier = 0.08;
        
        const baseSpeed = b.speed * speedMultiplier;
        let newX = b.x;
        let newY = b.y;
        let newDirX = b.directionX;
        let newDirY = b.directionY;
        let newState = b.state;
        let targetFlowerId = b.targetFlowerId;

        if (b.nectar >= 90) {
          newState = 'returning';
        } else if (newState === 'returning' && b.nectar < 10) {
          newState = 'wandering';
        } else if (newState === 'wandering' && flowers.length > 0 && b.personality !== 'queen') {
          const availableFlower = flowers.find(f => f.nectarAmount > 0);
          if (availableFlower) {
            newState = 'gathering';
            targetFlowerId = availableFlower.id;
          }
        }

        if (newState === 'returning') {
          const dx = hiveCenter.x - b.x;
          const dy = hiveCenter.y - b.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 5) {
            setHoneycombLevel(prev => Math.min(100, prev + 2));
            return { ...b, nectar: 0, state: 'wandering' };
          } else {
            newX += (dx / dist) * baseSpeed * 1.5;
            newY += (dy / dist) * baseSpeed * 1.5;
            newDirX = dx > 0 ? 1 : -1;
          }
        } else if (newState === 'gathering' && targetFlowerId) {
          const target = flowers.find(f => f.id === targetFlowerId);
          if (!target || target.nectarAmount <= 0) {
            newState = 'wandering';
            targetFlowerId = undefined;
          } else {
            const dx = target.x - b.x;
            const dy = target.y - b.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 3) {
              setFlowers(prev => prev.map(f => f.id === target.id ? { ...f, nectarAmount: f.nectarAmount - 10 } : f).filter(f => f.nectarAmount > 0));
              return { ...b, nectar: Math.min(100, b.nectar + 20), isPulsing: true };
            } else {
              newX += (dx / dist) * baseSpeed * 1.5;
              newY += (dy / dist) * baseSpeed * 1.5;
              newDirX = dx > 0 ? 1 : -1;
            }
          }
        } else {
          newX += baseSpeed * b.directionX;
          newY += baseSpeed * b.directionY;
          
          if (Math.random() < 0.05) newDirX = Math.random() > 0.5 ? 1 : -1;
          if (Math.random() < 0.05) newDirY = Math.random() > 0.5 ? 1 : -1;

          const mdx = (b.x - mousePos.x);
          const mdy = (b.y - mousePos.y);
          const mdist = Math.sqrt(mdx*mdx + mdy*mdy);

          if (mdist < 15 && b.personality !== 'queen') {
            newDirX = mdx > 0 ? 1 : -1;
            newDirY = mdy > 0 ? 1 : -1;
            newX += newDirX * 1;
            newY += newDirY * 1;
          }
        }

        if (newX > 95) { newX = 95; newDirX = -1; }
        if (newX < 5) { newX = 5; newDirX = 1; }
        if (newY > 90) { newY = 90; newDirY = -1; }
        if (newY < 10) { newY = 10; newDirY = 1; }

        return { 
          ...b, x: newX, y: newY, 
          directionX: newDirX, directionY: newDirY,
          state: newState, targetFlowerId,
          status: currentStatus
        };
      }));

      if (Math.random() < 0.02) {
        setParticles(prev => {
          const p = {
            id: Date.now(),
            x: Math.random() * 100,
            y: 110,
            size: 2 + Math.random() * 3,
            duration: 15 + Math.random() * 10,
            delay: 0,
            type: 'pollen' as const
          };
          return [...prev.filter(p => p.type !== 'pollen' || Math.random() > 0.05), p];
        });
      }

      setHoneycombLevel(prev => Math.max(0, prev - 0.05));

    }, 50);
    return () => clearInterval(interval);
  }, [mousePos, keys, flowers]);

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
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newFlower: Flower = {
      id: crypto.randomUUID(),
      x,
      y,
      size: 15 + Math.random() * 10,
      nectarAmount: 100
    };
    setFlowers(prev => [...prev, newFlower]);

    const ripple = document.createElement('div');
    ripple.className = 'flower-ripple';
    ripple.style.position = 'absolute';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    ripple.style.width = '10px';
    ripple.style.height = '10px';
    ripple.style.borderRadius = '50%';
    ripple.style.border = '2px solid #eab308';
    ripple.style.transform = 'translate(-50%, -50%)';
    ripple.style.animation = 'ripple-bloom 1s ease-out forwards';
    containerRef.current.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1000);
  };

  const selectedKeyData = keys.find(k => k.id === selectedBee);
  const activeBeesCount = bees.filter(b => b.status === 'active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', minHeight: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Hexagon size={32} color="#eab308" className="pulsing" /> Улей Интеллекта
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1rem' }}>
            Нейросетевой рой. Пчёлы-агенты собирают данные и синтезируют новые смыслы в центральном ядре.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ padding: '0.5rem 1rem', background: 'rgba(234,179,8,0.1)', borderRadius: 10, border: '1px solid rgba(234,179,8,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={14} color="#eab308" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#eab308' }}>ЭНЕРГИЯ УЛЬЯ: {Math.round(honeycombLevel)}%</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ripple-bloom {
          0% { width: 10px; height: 10px; opacity: 1; }
          100% { width: 100px; height: 100px; opacity: 0; }
        }
        @keyframes fly-wings {
          0% { transform: rotateY(0deg) rotateZ(-10deg); }
          50% { transform: rotateY(40deg) rotateZ(10deg); }
          100% { transform: rotateY(0deg) rotateZ(-10deg); }
        }
      `}</style>

      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onClick={handleContainerClick}
        style={{ 
          flex: 1, position: 'relative', 
          background: `radial-gradient(circle at 50% 50%, #2e1065 0%, #0f172a 100%)`, 
          borderRadius: 32, overflow: 'hidden', border: '4px solid rgba(234,179,8,0.15)',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8), 0 20px 40px rgba(0,0,0,0.4)',
          cursor: 'crosshair',
        }}
      >
        <div style={{ 
          position: 'absolute', inset: 0, opacity: 0.05, 
          backgroundSize: '40px 69.28px',
          backgroundImage: `
            linear-gradient(30deg, #eab308 12%, transparent 12.5%, transparent 87%, #eab308 87.5%, #eab308),
            linear-gradient(150deg, #eab308 12%, transparent 12.5%, transparent 87%, #eab308 87.5%, #eab308),
            linear-gradient(30deg, #eab308 12%, transparent 12.5%, transparent 87%, #eab308 87.5%, #eab308),
            linear-gradient(150deg, #eab308 12%, transparent 12.5%, transparent 87%, #eab308 87.5%, #eab308),
            linear-gradient(60deg, transparent 25%, transparent 25%, transparent 75%, transparent 75%, transparent),
            linear-gradient(60deg, transparent 25%, transparent 25%, transparent 75%, transparent 75%, transparent)
          `,
          backgroundPosition: '0 0, 0 0, 20px 34.64px, 20px 34.64px, 0 0, 20px 34.64px',
          pointerEvents: 'none', zIndex: 1
        }} />

        <motion.div 
          style={{
            position: 'absolute', top: '50%', left: '50%', x: '-50%', y: '-50%',
            width: 150, height: 150, 
            background: `radial-gradient(circle, rgba(234,179,8,0.2) 0%, transparent 70%)`,
            zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Hexagon size={80} color="#eab308" fill={`rgba(234,179,8,${honeycombLevel / 200})`} />
             <div style={{ position: 'absolute', color: '#fff', fontSize: '1rem', fontWeight: 900 }}>
               {Math.round(honeycombLevel)}%
             </div>
          </div>
        </motion.div>

        {flowers.map(f => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, scale: 0, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0 }}
            style={{ 
              position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, 
              transform: 'translate(-50%, -50%)',
              zIndex: 5, pointerEvents: 'none'
            }}
          >
            <Star size={f.size} color="#f472b6" fill="#f472b6" style={{ filter: 'drop-shadow(0 0 10px #f472b6)' }} />
            <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
              <div style={{ width: `${f.nectarAmount}%`, height: '100%', background: '#f472b6', borderRadius: 2 }} />
            </div>
          </motion.div>
        ))}

        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ y: p.type === 'pollen' ? `${p.y}%` : `${p.y}%`, left: `${p.x}%`, opacity: 0 }}
            animate={{ 
              y: p.type === 'pollen' ? '-10%' : `${p.y - 10}%`, 
              opacity: p.type === 'data' ? [0, 1, 0] : [0, 0.6, 0],
              scale: p.type === 'data' ? [0.5, 1.5, 0.8] : 1,
              x: p.type === 'pollen' ? ['-20px', '20px', '-10px'] : 0
            }}
            transition={{ 
              duration: p.duration, 
              repeat: p.type === 'pollen' ? Infinity : 0, 
              ease: 'linear', 
              delay: p.delay 
            }}
            style={{ 
              position: 'absolute', width: p.size, height: p.size, 
              borderRadius: p.type === 'data' ? '0' : '50%', 
              background: p.type === 'data' ? '#eab308' : 'rgba(234,179,8,0.4)', 
              filter: p.type === 'data' ? 'blur(1px) drop-shadow(0 0 5px #eab308)' : 'blur(0.5px)',
              transform: p.type === 'data' ? 'rotate(45deg)' : 'none',
              zIndex: 3
            }}
          />
        ))}

        {bees.map((b) => {
          const isSelected = selectedBee === b.id;
          const isDead = b.status !== 'active';
          
          return (
            <motion.div
              key={b.id}
              animate={{ 
                left: `${b.x}%`, 
                top: `${b.y}%`,
                scale: isSelected ? 1.4 : 1,
                rotateZ: isDead ? 180 : (b.directionX === 1 ? 15 : -15)
              }}
              transition={{ type: 'spring', stiffness: 60, damping: 20 }}
              onClick={() => setSelectedBee(isSelected ? null : b.id)}
              style={{ 
                position: 'absolute', cursor: 'pointer', zIndex: isSelected ? 100 : 10,
                transformOrigin: 'center',
                opacity: isDead ? 0.6 : 1,
                filter: isDead ? 'grayscale(0.8)' : 'none'
              }}
            >
              <motion.div 
                animate={b.isPulsing ? { scale: [1, 1.3, 1], filter: [`drop-shadow(0 0 10px ${b.color})`, `drop-shadow(0 0 30px ${b.color})`, `drop-shadow(0 0 10px ${b.color})`] } : {}}
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div style={{ position: 'relative' }}>
                  <motion.div style={{ animation: isDead ? 'none' : 'fly-wings 0.1s infinite alternate' }}>
                    <Hexagon 
                      size={32 * b.scale} 
                      color={b.color} 
                      fill={b.color + (b.nectar > 50 ? '88' : '33')} 
                      style={{ transition: 'all 0.3s' }}
                    />
                  </motion.div>
                  {b.nectar > 0 && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 8 * b.scale, height: 8 * b.scale, background: '#f472b6', borderRadius: '50%', boxShadow: '0 0 10px #f472b6' }} />
                  )}
                </div>

                <div style={{ 
                  position: 'absolute', bottom: -20,
                  fontSize: '0.55rem', fontWeight: 900, color: 'white', textTransform: 'uppercase',
                  background: isSelected ? b.color : 'rgba(0,0,0,0.6)', 
                  padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap',
                  border: `1px solid ${b.color}44`,
                  boxShadow: isSelected ? `0 0 15px ${b.color}66` : 'none',
                  letterSpacing: '0.05em'
                }}>
                  {b.provider}
                </div>

                <AnimatePresence>
                  {b.lastWords && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: -40 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      style={{ 
                        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(255,255,255,0.95)', color: '#0f172a', 
                        padding: '4px 10px', borderRadius: '12px 12px 12px 0',
                        fontSize: '0.6rem', fontWeight: 700, whiteSpace: 'nowrap',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 150,
                        pointerEvents: 'none', border: `2px solid ${b.color}`
                      }}
                    >
                      {b.lastWords}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}

        <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', flexWrap: 'wrap', gap: '1rem', maxWidth: '60%', background: 'rgba(0,0,0,0.6)', padding: '1rem 1.5rem', borderRadius: 20, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
          <div style={{ width: '100%', marginBottom: '0.25rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Популяция Роя</div>
          {Object.entries(providerColors).map(([p, c]) => {
            if (p === 'default') return null;
            const hasBee = bees.some(b => b.provider.toLowerCase() === p);
            return (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem', color: hasBee ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase' }}>
                <div style={{ width: 8, height: 8, borderRadius: '2px', background: c, boxShadow: hasBee ? `0 0 10px ${c}` : 'none' }} />
                {p}
              </div>
            );
          })}
        </div>

        <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(0,0,0,0.5)', padding: '8px 12px', borderRadius: 12 }}>
           <MousePointer2 size={14} color="#eab308" /> КЛИКАЙТЕ ДЛЯ СОЗДАНИЯ ЗАДАЧ (ЦВЕТОВ)
        </div>

        <AnimatePresence>
          {selectedKeyData && (
            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.9 }}
              style={{ 
                position: 'absolute', top: 24, right: 24, width: 300, 
                background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(16px)',
                borderRadius: 24, border: '1px solid rgba(234,179,8,0.2)', padding: '1.5rem',
                zIndex: 200, boxShadow: '0 30px 60px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                   <div style={{ width: 40, height: 40, borderRadius: 12, background: `${providerColors[selectedKeyData.provider.toLowerCase()] || '#fff'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${providerColors[selectedKeyData.provider.toLowerCase()] || '#fff'}55` }}>
                      <Hexagon size={24} color={selectedKeyData.status === 'active' ? providerColors[selectedKeyData.provider.toLowerCase()] : '#64748b'} />
                   </div>
                   <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{selectedKeyData.label}</h3>
                      <div style={{ fontSize: '0.65rem', color: selectedKeyData.status === 'active' ? providerColors[selectedKeyData.provider.toLowerCase()] : '#ef4444', fontWeight: 800, textTransform: 'uppercase' }}>
                        {selectedKeyData.provider} {selectedKeyData.status !== 'active' && '— OFFLINE'}
                      </div>
                   </div>
                </div>
                <button onClick={() => setSelectedBee(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                   <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>СКОРОСТЬ (MS)</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{Math.round(selectedKeyData.stats?.avgLatency || 0)}ms</div>
                   </div>
                   <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>УСПЕШНОСТЬ</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#eab308' }}>
                        {((selectedKeyData.stats?.successCount || 0) / (Math.max(1, (selectedKeyData.stats?.successCount || 0) + (selectedKeyData.stats?.errorCount || 0))) * 100).toFixed(0)}%
                      </div>
                   </div>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>РОЛЬ В УЛЬЕ</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.6rem', background: 'rgba(234,179,8,0.1)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(234,179,8,0.2)', color: '#fde047', fontWeight: 700, textTransform: 'uppercase' }}>
                      {bees.find(b => b.id === selectedBee)?.personality || 'РАБОЧАЯ'}
                    </span>
                    <span style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase' }}>
                      СОСТОЯНИЕ: {bees.find(b => b.id === selectedBee)?.state || 'В ПОИСКЕ'}
                    </span>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    eventBus.emit(EVENTS.NAVIGATE, 'providers');
                    eventBus.emit(EVENTS.SELECT_MODEL, { provider: selectedKeyData.provider, model: selectedKeyData.availableModels?.[0] || 'auto' });
                  }}
                  className="btn-primary" 
                  style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', gap: 8, background: '#eab308', color: '#422006' }}
                >
                  <Activity size={14} /> Настроить Пчелу
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', border: '1px solid rgba(234,179,8,0.2)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck color="#eab308" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Защита Улья</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#eab308' }}>АКТИВНА</div>
          </div>
        </div>
        <div className="glass-panel" style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', border: '1px solid rgba(244,114,182,0.2)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(244,114,182,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles color="#f472b6" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Активность Роя</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f472b6' }}>{activeBeesCount} особей в работе</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HivePanel;
