import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Waves, Fish as FishIcon, Activity, Zap, 
  Sparkles, MousePointer2, Thermometer, ShieldCheck,
  AlertTriangle, CloudRain, Sun, Moon
} from 'lucide-react';
import { useKeyStore } from '../../stores/useKeyStore';
import { eventBus, EVENTS } from '../../core/events';

interface FishState {
  id: string;
  provider: string;
  x: number;
  y: number;
  scale: number;
  speed: number;
  direction: number;
  color: string;
  isPulsing?: boolean;
  energy: number; // 0 to 100
  status: string;
  lastWords?: string;
  personality: 'brave' | 'shy' | 'lazy' | 'hyper';
  wagDuration: number;
}

interface Food {
  id: string;
  x: number;
  y: number;
  size: number;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type?: 'oxygen' | 'data' | 'error';
}

interface Jellyfish {
  id: number;
  x: number;
  size: number;
  speed: number;
  delay: number;
  tentacles: Array<{
    minHeight: number;
    maxHeight: number;
    duration: number;
  }>;
}

interface Seaweed {
  id: number;
  left: number;
  width: number;
  height: number;
  minRotate: number;
  maxRotate: number;
  duration: number;
  delay: number;
}

const AquariumPanel: React.FC = () => {
  const { keys } = useKeyStore();
  const [fishes, setFishes] = useState<FishState[]>([]);
  const [selectedFish, setSelectedFish] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [food, setFood] = useState<Food[]>([]);
  const [mousePos, setMousePointer] = useState({ x: 0, y: 0 });
  const [jellyfishes, setJellyfishes] = useState<Jellyfish[]>([]);
  const [seaweeds, setSeaweeds] = useState<Seaweed[]>([]);
  const [bot, setBot] = useState({ x: 10, y: 92, direction: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize bubbles, jellyfish and seaweed once
  useEffect(() => {
    const newBubbles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 110,
      size: 4 + Math.random() * 8,
      duration: 5 + Math.random() * 10,
      delay: Math.random() * 5,
      type: 'oxygen' as const
    }));
    setBubbles(newBubbles);

    setJellyfishes(Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      x: 15 + Math.random() * 70,
      size: 30 + Math.random() * 40,
      speed: 20 + Math.random() * 15,
      delay: Math.random() * 10,
      tentacles: Array.from({ length: 4 }).map(() => ({
        minHeight: 15 + Math.random() * 10,
        maxHeight: 25 + Math.random() * 15,
        duration: 1.5 + Math.random()
      }))
    })));

    setSeaweeds(Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: i * 7,
      width: 10 + Math.random() * 20,
      height: 40 + Math.random() * 80,
      minRotate: -5 + Math.random() * -10,
      maxRotate: 5 + Math.random() * 10,
      duration: 3 + Math.random() * 3,
      delay: Math.random() * 2
    })));
  }, []);

  // Colors for different providers
  const providerColors: Record<string, string> = {
    openrouter: '#a855f7',
    gemini: '#3b82f6',
    groq: '#10b981',
    nvidia: '#76b900',
    openai: '#10a37f',
    anthropic: '#da7756',
    default: '#94a3b8'
  };

  useEffect(() => {
    const initialFishes = keys.map(k => {
      const existing = fishes.find(f => f.id === k.id);
      if (existing) return existing;

      return {
        id: k.id,
        provider: k.provider,
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
        scale: 0.8 + Math.random() * 0.5,
        speed: 2 + Math.random() * 3,
        direction: Math.random() > 0.5 ? 1 : -1,
        color: providerColors[k.provider.toLowerCase()] || providerColors.default,
        energy: 100,
        status: k.status,
        personality: (['brave', 'shy', 'lazy', 'hyper'] as const)[Math.floor(Math.random() * 4)],
        wagDuration: 0.5 + Math.random() * 0.5
      };
    });
    setFishes(initialFishes);
  }, [keys]);

  // Handle system events to make fishes pulse
  useEffect(() => {
    const unsubResponse = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res: any) => {
      setFishes(prev => prev.map(f => {
        if (f.provider.toLowerCase() === res.provider.toLowerCase() || f.id === res.keyId) {
          const content = res.content || '';
          const lastWords = content.length > 30 ? content.substring(0, 27) + '...' : content;
          
          // Emit "Data Bubbles" when responding
          const dataBubbles = Array.from({ length: 5 }).map((_, i) => ({
            id: Date.now() + i,
            x: f.x + (Math.random() - 0.5) * 5,
            y: f.y,
            size: 3 + Math.random() * 5,
            duration: 2 + Math.random() * 3,
            delay: 0,
            type: 'data' as const
          }));
          setBubbles(prevB => [...prevB, ...dataBubbles]);
          // Auto-cleanup data bubbles
          setTimeout(() => {
             setBubbles(prevB => prevB.filter(b => b.type !== 'data'));
          }, 5000);

          return { ...f, isPulsing: true, energy: Math.min(100, f.energy + 20), lastWords };
        }
        return f;
      }));

      // Reset pulse and words after some time
      setTimeout(() => {
        setFishes(prev => prev.map(f => f.isPulsing ? { ...f, isPulsing: false, lastWords: undefined } : f));
      }, 3000);
    });

    return () => unsubResponse();
  }, []);

  // Animation loop for random movement
  useEffect(() => {
    const interval = setInterval(() => {
      // Update Food
      setFood(prev => prev.map(p => ({ ...p, y: p.y + 0.5 })).filter(p => p.y < 100));

      setFishes(prev => prev.map(f => {
        // Find actual key stats to influence behavior
        const keyData = keys.find(k => k.id === f.id);
        const reputation = keyData?.stats?.extended?.reputationScore || 100;
        const currentStatus = keyData?.status || 'inactive';
        const isDead = currentStatus !== 'active';
        
        if (isDead) {
          // Dead fish floats to the top and stays there, moving very slowly with water
          let newY = f.y - 0.5; // Float up
          if (newY < 12) newY = 12 + Math.sin(Date.now() / 1000) * 2; // Bob at surface
          
          return {
            ...f,
            y: newY,
            x: f.x + Math.sin(Date.now() / 2000) * 0.05, // Slight horizontal drift
            status: currentStatus,
            energy: 0
          };
        }

        // Base speed influenced by reputation, energy and personality
        let speedMultiplier = 0.1;
        if (f.personality === 'hyper') speedMultiplier = 0.2;
        if (f.personality === 'lazy') speedMultiplier = 0.05;
        
        const baseSpeed = (f.speed * speedMultiplier) * (reputation / 100);
        let newX = f.x;
        let newY = f.y;
        let newDirection = f.direction;

        // Hunt for food if hungry (brave and hyper fish are more aggressive)
        const hungerThreshold = f.personality === 'brave' ? 90 : f.personality === 'lazy' ? 40 : 80;
        const closestFood = food.length > 0 ? food.reduce((prev, curr) => {
          const dPrev = Math.sqrt(Math.pow(prev.x - f.x, 2) + Math.pow(prev.y - f.y, 2));
          const dCurr = Math.sqrt(Math.pow(curr.x - f.x, 2) + Math.pow(curr.y - f.y, 2));
          return dCurr < dPrev ? curr : prev;
        }) : null;

        if (closestFood && f.energy < hungerThreshold) {
          const dx = closestFood.x - f.x;
          const dy = closestFood.y - f.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist < 3) {
            // Eat food
            setFood(prev => prev.filter(p => p.id !== closestFood.id));
            return { ...f, energy: Math.min(100, f.energy + 15), isPulsing: true };
          } else {
            const chaseSpeed = f.personality === 'hyper' ? 2.5 : 1.5;
            newX += (dx / dist) * baseSpeed * chaseSpeed;
            newY += (dy / dist) * baseSpeed * chaseSpeed;
            newDirection = dx > 0 ? 1 : -1;
          }
        } else {
          // Normal movement
          newX += baseSpeed * f.direction;
          
          // Interaction with mouse
          const mdx = (f.x - mousePos.x);
          const mdy = (f.y - mousePos.y);
          const mdist = Math.sqrt(mdx*mdx + mdy*mdy);
          
          const fearDistance = f.personality === 'shy' ? 25 : f.personality === 'brave' ? 8 : 15;

          if (mdist < fearDistance) {
            // Swim away from mouse
            newDirection = mdx > 0 ? 1 : -1;
            newX += newDirection * (f.personality === 'hyper' ? 0.8 : 0.5);
          }

          // Natural undulating Y drift
          newY += Math.sin(Date.now() / 1000 + f.x) * 0.4;
          newY += (Math.random() - 0.5) * 0.5;

          // Collision avoidance (Flocking)
          let repulseX = 0;
          let repulseY = 0;
          prev.forEach(otherFish => {
            if (otherFish.id !== f.id && otherFish.status === 'active') {
              const dx = newX - otherFish.x;
              const dy = newY - otherFish.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist > 0 && dist < 8) { // 8% radius
                repulseX += (dx / dist) * 0.3;
                repulseY += (dy / dist) * 0.3;
              }
            }
          });
          newX += repulseX;
          newY += repulseY;
          
          // Reputation-based "health" - unhealthy fish sink a bit
          if (reputation < 50) newY += 0.2;
        }

        // Bounce off walls
        if (newX > 92) { newX = 92; newDirection = -1; }
        if (newX < 8) { newX = 8; newDirection = 1; }

        return { 
          ...f, 
          x: newX, 
          y: Math.max(15, Math.min(85, newY)), 
          direction: newDirection,
          energy: Math.max(20, f.energy - 0.05), // Energy slowly drains
          status: currentStatus
        };
      }));

      // Update Cleaner Bot
      setBot(prev => {
        let newX = prev.x + 0.2 * prev.direction;
        let newDir = prev.direction;
        if (newX > 90) { newX = 90; newDir = -1; }
        if (newX < 10) { newX = 10; newDir = 1; }
        return { ...prev, x: newX, direction: newDir };
      });

    }, 50);
    return () => clearInterval(interval);
  }, [mousePos, keys, food]);

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
    
    // Create ripple effect
    const ripple = document.createElement('div');
    ripple.className = 'water-ripple';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    containerRef.current.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1000);

    const newFood: Food = {
      id: crypto.randomUUID(),
      x,
      y,
      size: 4 + Math.random() * 4
    };
    setFood(prev => [...prev, newFood]);
  };

  const feedAllFishes = () => {
    const newFoods = Array.from({ length: fishes.length * 3 }).map((_, i) => ({
      id: `food-${Date.now()}-${i}`,
      x: 10 + Math.random() * 80,
      y: -10 - Math.random() * 30, // Drop from above
      size: 3 + Math.random() * 5
    }));
    setFood(prev => [...prev, ...newFoods]);
    
    // Add ripple at the top
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const ripple = document.createElement('div');
      ripple.className = 'water-ripple';
      ripple.style.left = `${rect.width / 2}px`;
      ripple.style.top = `0px`;
      ripple.style.width = '200px';
      ripple.style.height = '20px';
      containerRef.current.appendChild(ripple);
      setTimeout(() => ripple.remove(), 1000);
    }
  };

  const selectedKeyData = keys.find(k => k.id === selectedFish);
  const activeFishesCount = fishes.length;
  const avgReputation = keys.length > 0 
    ? keys.reduce((acc, k) => acc + (k.stats?.extended?.reputationScore || 0), 0) / keys.length 
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', minHeight: 700 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Waves size={32} color="#3b82f6" className="pulsing" /> Аквариум Интеллекта
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1rem' }}>
            Живая экосистема ваших нейросетей. Состояние рыб отражает здоровье и активность провайдеров.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={feedAllFishes}
            style={{ padding: '0.5rem 1rem', background: 'rgba(245,158,11,0.1)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(245,158,11,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
          >
            <Sun size={14} /> ПОКОРМИТЬ РЫБ
          </button>
          <div style={{ padding: '0.5rem 1rem', background: 'rgba(59,130,246,0.1)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Thermometer size={14} color="#3b82f6" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>{Math.round(avgReputation)}% ТЕМП. СРЕДЫ</span>
          </div>
        </div>
      </div>

      {/* Aquarium View */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onClick={handleContainerClick}
        style={{ 
          flex: 1, position: 'relative', 
          background: `linear-gradient(180deg, 
            ${avgReputation > 70 ? '#0f172a' : avgReputation > 40 ? '#1e1b4b' : '#312e81'} 0%, 
            ${avgReputation > 70 ? '#1e293b' : avgReputation > 40 ? '#0f172a' : '#1e1b4b'} 100%)`, 
          borderRadius: 32, overflow: 'hidden', border: '4px solid rgba(59,130,246,0.15)',
          boxShadow: 'inset 0 0 120px rgba(0,0,0,0.6), 0 20px 40px rgba(0,0,0,0.3)',
          cursor: 'crosshair',
          transition: 'background 1s ease'
        }}
      >
        {/* God Rays / Light Rays */}
        <motion.div 
          style={{ 
            position: 'absolute', inset: 0, 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)',
            pointerEvents: 'none', zIndex: 1
          }} 
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Surface Wave Overlay */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, overflow: 'hidden', zIndex: 6, pointerEvents: 'none' }}>
           <motion.div
             animate={{ x: ['0%', '-50%'] }}
             transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
             style={{ width: '200%', height: '100%', display: 'flex' }}
           >
             <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%', transform: 'scaleY(-1)' }}>
                <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="rgba(255,255,255,0.08)" />
             </svg>
             <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%', transform: 'scaleY(-1)' }}>
                <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="rgba(255,255,255,0.08)" />
             </svg>
           </motion.div>
        </div>

        {/* Deep Sea Particles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
           <div className="water-overlay" style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'url(https://www.transparenttextures.com/patterns/carbon-fibre.png)' }} />
        </div>

        {/* Jellyfishes */}
        {jellyfishes.map(j => (
          <motion.div
            key={`jelly-${j.id}`}
            initial={{ y: '120%', left: `${j.x}%`, opacity: 0 }}
            animate={{ 
              y: '-30%', 
              opacity: [0, 0.4, 0.4, 0],
            }}
            transition={{
              y: { duration: j.speed, repeat: Infinity, ease: 'linear', delay: j.delay },
              opacity: { duration: j.speed, repeat: Infinity, ease: 'linear', delay: j.delay },
            }}
            style={{
              position: 'absolute', width: j.size, height: j.size, zIndex: 2,
              filter: 'blur(1.5px)', pointerEvents: 'none'
            }}
          >
             <motion.div 
               animate={{ scaleY: [0.9, 1.1, 0.9] }} 
               transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
               style={{ width: '100%', height: '40%', background: 'rgba(255,255,255,0.15)', borderRadius: '50% 50% 20% 20%', borderTop: '2px solid rgba(255,255,255,0.3)', boxShadow: '0 -5px 15px rgba(255,255,255,0.1)' }} 
             />
             <div style={{ display: 'flex', justifyContent: 'space-around', width: '70%', margin: '0 auto' }}>
               {j.tentacles.map((t, i) => (
                 <motion.div 
                   key={i} 
                   animate={{ height: [t.minHeight, t.maxHeight, t.minHeight] }} 
                   transition={{ duration: t.duration, repeat: Infinity, ease: 'easeInOut' }} 
                   style={{ width: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} 
                 />
               ))}
             </div>
          </motion.div>
        ))}

        {/* Seaweed / Plants at the bottom */}
        {seaweeds.map(s => (
          <motion.div
            key={`seaweed-${s.id}`}
            style={{
              position: 'absolute', bottom: 0, left: `${s.left}%`,
              width: s.width,
              height: s.height,
              background: `linear-gradient(to top, rgba(16,185,129,0.4), rgba(16,185,129,0.1))`,
              borderRadius: '50% 50% 0 0',
              transformOrigin: 'bottom center',
              zIndex: 3,
              filter: 'blur(2px)',
              pointerEvents: 'none'
            }}
            animate={{
              rotateZ: [s.minRotate, s.maxRotate, s.minRotate]
            }}
            transition={{
              duration: s.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: s.delay
            }}
          />
        ))}

        {/* Cleaner Bot (Submarine) */}
        <motion.div
          animate={{
            left: `${bot.x}%`,
            top: `${bot.y}%`,
            rotateY: bot.direction === 1 ? 0 : 180
          }}
          transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
          style={{ position: 'absolute', zIndex: 12, display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))', pointerEvents: 'none' }}
        >
          <div style={{ background: '#334155', borderRadius: '20px 20px 5px 5px', width: 40, height: 25, position: 'relative', border: '2px solid #475569' }}>
            {/* Blinking light */}
            <motion.div 
              animate={{ opacity: [1, 0.2, 1] }} 
              transition={{ duration: 1, repeat: Infinity }} 
              style={{ position: 'absolute', top: 5, left: 25, width: 6, height: 6, background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }} 
            />
            {/* Periscope */}
            <div style={{ position: 'absolute', top: -12, left: 10, width: 4, height: 12, background: '#475569', borderRadius: '2px 2px 0 0' }} />
            {/* Eye port */}
            <div style={{ position: 'absolute', top: 10, left: 15, width: 8, height: 8, borderRadius: '50%', background: '#0f172a', border: '2px solid #64748b' }} />
            {/* Propeller */}
            <motion.div
              animate={{ rotateZ: 360 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
              style={{ position: 'absolute', top: 12, right: -4, width: 4, height: 12, background: '#94a3b8', borderRadius: 2, transformOrigin: 'center' }}
            />
          </div>
        </motion.div>

        {/* Food */}
        {food.map(f => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1, y: `${f.y}%` }}
            style={{ 
              position: 'absolute', left: `${f.x}%`, top: 0, 
              width: f.size, height: f.size, background: '#f59e0b', 
              borderRadius: '50%', boxShadow: '0 0 10px #f59e0b',
              zIndex: 5
            }}
          />
        ))}

        {/* Bubbles Decoration */}
        {bubbles.map((b) => (
          <motion.div
            key={b.id}
            initial={{ y: b.type === 'data' ? `${b.y}%` : '110%', left: `${b.x}%`, opacity: 0 }}
            animate={{ 
              y: '-10%', 
              opacity: b.type === 'data' ? [0, 0.8, 0] : [0, 0.4, 0.4, 0],
              scale: b.type === 'data' ? [0.5, 1.5, 0.8] : 1
            }}
            transition={{ 
              duration: b.duration, 
              repeat: b.type === 'data' ? 0 : Infinity, 
              ease: 'linear', 
              delay: b.delay 
            }}
            style={{ 
              position: 'absolute', width: b.size, height: b.size, 
              borderRadius: '50%', 
              background: b.type === 'data' ? '#3b82f6' : 'rgba(255,255,255,0.4)', 
              border: `1px solid ${b.type === 'data' ? '#60a5fa' : 'rgba(255,255,255,0.2)'}`,
              filter: b.type === 'data' ? 'blur(1px) drop-shadow(0 0 5px #3b82f6)' : 'blur(0.5px)',
              zIndex: 2
            }}
          />
        ))}

        {/* Fishes */}
        {fishes.map((f) => {
          const isSelected = selectedFish === f.id;
          const isDead = f.status !== 'active';
          
          return (
            <motion.div
              key={f.id}
              animate={{ 
                left: `${f.x}%`, 
                top: `${f.y}%`,
                scale: isSelected ? 1.4 : 1,
                rotateY: f.direction === 1 ? 0 : 180,
                rotateZ: isDead ? 180 : 0 // Upside down if dead
              }}
              transition={{ type: 'spring', stiffness: 40, damping: 15 }}
              onClick={() => setSelectedFish(isSelected ? null : f.id)}
              style={{ 
                position: 'absolute', cursor: 'pointer', zIndex: isSelected ? 100 : 10,
                transformOrigin: 'center',
                opacity: isDead ? 0.6 : 1,
                filter: isDead ? 'grayscale(0.8)' : 'none'
              }}
            >
              <motion.div 
                animate={f.isPulsing ? { scale: [1, 1.3, 1], filter: [`drop-shadow(0 0 10px ${f.color})`, `drop-shadow(0 0 30px ${f.color})`, `drop-shadow(0 0 10px ${f.color})`] } : {}}
                style={{ position: 'relative' }}
              >
                <motion.div
                  animate={isDead ? {} : { rotateZ: [-5, 5, -5] }}
                  transition={{ duration: f.wagDuration, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <FishIcon 
                    size={42 * f.scale} 
                    color={f.color} 
                    fill={f.color + (f.energy > 50 ? '44' : '11')} 
                    style={{ transition: 'all 0.3s' }}
                  />
                </motion.div>
                
                {/* Status Ring for active fishes */}
                {f.isPulsing && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 3, opacity: 0 }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${f.color}`, pointerEvents: 'none' }}
                  />
                )}

                <div style={{ 
                  position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
                  fontSize: '0.55rem', fontWeight: 900, color: 'white', textTransform: 'uppercase',
                  background: isSelected ? f.color : 'rgba(0,0,0,0.6)', 
                  padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap',
                  border: `1px solid ${f.color}44`,
                  boxShadow: isSelected ? `0 0 15px ${f.color}66` : 'none',
                  letterSpacing: '0.05em'
                }}>
                  {f.provider}
                </div>

                {/* Energy Bar Mini */}
                  <div style={{ position: 'absolute', top: -8, left: '20%', right: '20%', height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                     <div style={{ width: `${f.energy}%`, height: '100%', background: f.color, borderRadius: 1 }} />
                  </div>

                  {/* Speech Bubble / Last Words */}
                  <AnimatePresence>
                    {f.lastWords && (
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
                          pointerEvents: 'none', border: `1px solid ${f.color}`
                        }}
                      >
                        {f.lastWords}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
            </motion.div>
          );
        })}

        {/* Legend Overlay */}
        <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', flexWrap: 'wrap', gap: '1rem', maxWidth: '60%', background: 'rgba(0,0,0,0.4)', padding: '1rem 1.5rem', borderRadius: 20, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 10 }}>
          <div style={{ width: '100%', marginBottom: '0.25rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Популяция провайдеров</div>
          {Object.entries(providerColors).map(([p, c]) => {
            if (p === 'default') return null;
            const hasFish = fishes.some(f => f.provider.toLowerCase() === p);
            return (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem', color: hasFish ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: hasFish ? `0 0 10px ${c}` : 'none' }} />
                {p}
              </div>
            );
          })}
        </div>

        {/* Interaction Prompt */}
        <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: 600 }}>
           <MousePointer2 size={12} /> ДВИГАЙТЕ КУРСОРОМ, ЧТОБЫ РАЗОГНАТЬ РЫБ
        </div>

        {/* Selected Info Overlay */}
        <AnimatePresence>
          {selectedKeyData && (
            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.9 }}
              style={{ 
                position: 'absolute', top: 24, right: 24, width: 300, 
                background: 'rgba(15, 23, 42, 0.92)', backdropFilter: 'blur(16px)',
                borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem',
                zIndex: 200, boxShadow: '0 30px 60px rgba(0,0,0,0.6)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                   <div style={{ width: 40, height: 40, borderRadius: 12, background: `${providerColors[selectedKeyData.provider.toLowerCase()] || '#fff'}11`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${providerColors[selectedKeyData.provider.toLowerCase()] || '#fff'}33`, filter: selectedKeyData.status !== 'active' ? 'grayscale(1)' : 'none' }}>
                      <FishIcon size={24} color={selectedKeyData.status === 'active' ? providerColors[selectedKeyData.provider.toLowerCase()] : '#64748b'} />
                   </div>
                   <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{selectedKeyData.label}</h3>
                      <div style={{ fontSize: '0.65rem', color: selectedKeyData.status === 'active' ? providerColors[selectedKeyData.provider.toLowerCase()] : '#ef4444', fontWeight: 800, textTransform: 'uppercase' }}>
                        {selectedKeyData.provider} {selectedKeyData.status !== 'active' && '— OFFLINE'}
                      </div>
                   </div>
                </div>
                <button onClick={() => setSelectedFish(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ИНДЕКС РЕПУТАЦИИ</span>
                      <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}>{Math.round(selectedKeyData.stats?.extended?.reputationScore || 0)}%</span>
                   </div>
                   <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${selectedKeyData.stats?.extended?.reputationScore || 0}%` }} style={{ height: '100%', background: '#10b981' }} />
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                   <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>LATENCY</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{Math.round(selectedKeyData.stats?.avgLatency || 0)}ms</div>
                   </div>
                   <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>SUCCESS</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>
                        {((selectedKeyData.stats?.successCount || 0) / (Math.max(1, (selectedKeyData.stats?.successCount || 0) + (selectedKeyData.stats?.errorCount || 0))) * 100).toFixed(0)}%
                      </div>
                   </div>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>ЛИЧНОСТЬ И СТАТУС</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.6rem', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                      {selectedKeyData.status === 'active' ? 'АКТИВЕН' : 'OFFLINE'}
                    </span>
                    <span style={{ fontSize: '0.6rem', background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                      ХАРАКТЕР: {fishes.find(f => f.id === selectedFish)?.personality || 'обычный'}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>АКТИВНЫЕ МОДЕЛИ</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {selectedKeyData.availableModels?.slice(0, 4).map(m => (
                      <span key={m} style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontWeight: 600 }}>
                        {m.split('/').pop()}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    eventBus.emit(EVENTS.NAVIGATE, 'providers');
                    eventBus.emit(EVENTS.SELECT_MODEL, { provider: selectedKeyData.provider, model: selectedKeyData.availableModels?.[0] || 'auto' });
                  }}
                  className="btn-primary" 
                  style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', gap: 8 }}
                >
                  <Zap size={14} /> Управлять ключом
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', border: '1px solid rgba(16,185,129,0.1)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck color="#10b981" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Здоровье экосистемы</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#10b981' }}>{Math.round(avgReputation)}% — СТАБИЛЬНО</div>
          </div>
        </div>
        <div className="glass-panel" style={{ flex: 1, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem', border: '1px solid rgba(245,158,11,0.1)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles color="#f59e0b" size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Популяция агентов</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f59e0b' }}>{activeFishesCount} активных сущностей</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AquariumPanel;
