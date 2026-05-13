import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Waves, FishIcon, Zap, 
  Sparkles, MousePointer2, Thermometer, ShieldCheck,
  Sun, AlertCircle
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
  energy: number;
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

interface Ripple {
  id: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface Jellyfish {
  id: number;
  x: number;
  size: number;
  speed: number;
  delay: number;
  tentacles: Array<{ minHeight: number; maxHeight: number; duration: number }>;
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

const providerColors: Record<string, string> = {
  openrouter: '#a855f7', gemini: '#3b82f6', groq: '#10b981',
  nvidia: '#76b900', openai: '#10a37f', anthropic: '#da7756',
  default: '#94a3b8'
};

// Совместимая генерация ID
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const AquariumPanel: React.FC = () => {
  const { keys } = useKeyStore();
  const [fishes, setFishes] = useState<FishState[]>([]);
  // Синхронизация рыб с ключами (сохраняем позиции, обновляем статус и энергию)
  useEffect(() => {
    setFishes(prev => keys.map(k => {
      const existing = prev.find(f => f.id === k.id);
      if (existing) {
        const newStatus = k.status;
        let newEnergy = existing.energy;
        if (newStatus === 'active' && existing.status !== 'active' && existing.energy < 80) {
          newEnergy = 100;
        }
        return {
          ...existing,
          status: newStatus,
          energy: newEnergy,
          color: providerColors[k.provider.toLowerCase()] || providerColors.default,
        };
      }
      return {
        id: k.id, provider: k.provider,
        x: Math.random() * 80 + 10, y: Math.random() * 60 + 20,
        scale: 0.8 + Math.random() * 0.5, speed: 2 + Math.random() * 3,
        direction: Math.random() > 0.5 ? 1 : -1,
        color: providerColors[k.provider.toLowerCase()] || providerColors.default,
        energy: 100, status: k.status,
        personality: (['brave', 'shy', 'lazy', 'hyper'] as const)[Math.floor(Math.random() * 4)],
        wagDuration: 0.5 + Math.random() * 0.5
      };
    }));
  }, [keys]);

  const [selectedFish, setSelectedFish] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>(() =>
    Array.from({ length: 25 }).map((_, i) => ({
      id: i, x: Math.random() * 100, y: 110, size: 4 + Math.random() * 8,
      duration: 5 + Math.random() * 10, delay: Math.random() * 5, type: 'oxygen' as const
    }))
  );
  const [food, setFood] = useState<Food[]>([]);
  const [mousePos, setMousePointer] = useState({ x: 0, y: 0 });
  const [jellyfishes] = useState<Jellyfish[]>(() =>
    Array.from({ length: 4 }).map((_, i) => ({
      id: i, x: 15 + Math.random() * 70, size: 30 + Math.random() * 40,
      speed: 20 + Math.random() * 15, delay: Math.random() * 10,
      tentacles: Array.from({ length: 4 }).map(() => ({
        minHeight: 15 + Math.random() * 10, maxHeight: 25 + Math.random() * 15, duration: 1.5 + Math.random()
      }))
    }))
  );
  const [seaweeds] = useState<Seaweed[]>(() =>
    Array.from({ length: 15 }).map((_, i) => ({
      id: i, left: i * 7, width: 10 + Math.random() * 20, height: 40 + Math.random() * 80,
      minRotate: -5 + Math.random() * -10, maxRotate: 5 + Math.random() * 10,
      duration: 3 + Math.random() * 3, delay: Math.random() * 2
    }))
  );
  const [bot, setBot] = useState({ x: 10, y: 92, direction: 1 });
  const [error, setError] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const foodRef = useRef(food);

  // Синхронизируем foodRef с актуальным состоянием
  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  // Автоочистка ошибки
  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  // Подписка на ответы моделей
  useEffect(() => {
    const handleResponse = (res: import('../../types/chat').ChatResponse) => {
      if (!isMountedRef.current) return;
      try {
        setFishes(prev => prev.map(f => {
          if (f.provider.toLowerCase() === (res.provider as string)?.toLowerCase() || f.id === (res as unknown as Record<string, unknown>).keyId) {
            const content = res.content || '';
            const lastWords = content.length > 30 ? content.substring(0, 27) + '...' : content;
            const dataBubbles = Array.from({ length: 5 }).map((_, i) => ({
              id: Date.now() + i, x: f.x + (Math.random() - 0.5) * 5, y: f.y,
              size: 3 + Math.random() * 5, duration: 2 + Math.random() * 3, delay: 0, type: 'data' as const
            }));
            setBubbles(prevB => [...prevB, ...dataBubbles]);

            // Очищаем старый таймер, чтобы не накапливались
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                setBubbles(prevB => prevB.filter(b => b.type !== 'data'));
              }
            }, 5000);

            return { ...f, isPulsing: true, energy: Math.min(100, f.energy + 20), lastWords };
          }
          return f;
        }));

        setTimeout(() => {
          if (isMountedRef.current) {
            setFishes(prev => prev.map(f => f.isPulsing ? { ...f, isPulsing: false, lastWords: undefined } : f));
          }
        }, 3000);
      } catch (e) {
        console.warn('[AquariumPanel] Error processing message event:', e);
        if (isMountedRef.current) {
          setError('Ошибка при обработке сообщения');
          clearErrorAfterDelay();
        }
      }
    };

    const unsub = eventBus.on(EVENTS.MESSAGE_RESPONSE, handleResponse);
    return () => {
      unsub();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [clearErrorAfterDelay]);

  // Основной цикл движения (пересоздаётся только при изменении mousePos или keys)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMountedRef.current) return;

      // Обновляем еду (опадание)
      setFood(prev => prev.map(p => ({ ...p, y: p.y + 0.5 })).filter(p => p.y < 100));

      // Обновляем рыб
      setFishes(prev => prev.map(f => {
        const keyData = keys.find(k => k.id === f.id);
        const reputation = keyData?.stats?.extended?.reputationScore || 100;
        const currentStatus = keyData?.status || 'inactive';
        const isDead = currentStatus !== 'active';
        
        if (isDead) {
          let newY = f.y - 0.5;
          if (newY < 12) newY = 12 + Math.sin(Date.now() / 1000) * 2;
          return { ...f, y: newY, x: f.x + Math.sin(Date.now() / 2000) * 0.05, status: currentStatus, energy: 0 };
        }

        let speedMultiplier = 0.1;
        if (f.personality === 'hyper') speedMultiplier = 0.2;
        if (f.personality === 'lazy') speedMultiplier = 0.05;
        const baseSpeed = (f.speed * speedMultiplier) * (reputation / 100);
        let newX = f.x, newY = f.y, newDirection = f.direction;
        
        const hungerThreshold = f.personality === 'brave' ? 90 : f.personality === 'lazy' ? 40 : 80;
        const currentFood = foodRef.current;
        const closestFood = currentFood.length > 0 ? currentFood.reduce((prev, curr) => {
          const dPrev = Math.hypot(prev.x - f.x, prev.y - f.y);
          const dCurr = Math.hypot(curr.x - f.x, curr.y - f.y);
          return dCurr < dPrev ? curr : prev;
        }) : null;
        if (closestFood && f.energy < hungerThreshold) {
          const dx = closestFood.x - f.x, dy = closestFood.y - f.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 3) {
            setFood(prev => prev.filter(p => p.id !== closestFood.id));
            return { ...f, energy: Math.min(100, f.energy + 15), isPulsing: true };
          } else {
            const chaseSpeed = f.personality === 'hyper' ? 2.5 : 1.5;
            newX += (dx / dist) * baseSpeed * chaseSpeed;
            newY += (dy / dist) * baseSpeed * chaseSpeed;
            newDirection = dx > 0 ? 1 : -1;
          }
        } else {
          newX += baseSpeed * f.direction;
          const mdx = (f.x - mousePos.x), mdy = (f.y - mousePos.y);
          const mdist = Math.sqrt(mdx*mdx + mdy*mdy);
          const fearDistance = f.personality === 'shy' ? 25 : f.personality === 'brave' ? 8 : 15;
          if (mdist < fearDistance) {
            newDirection = mdx > 0 ? 1 : -1;
            newX += newDirection * (f.personality === 'hyper' ? 0.8 : 0.5);
          }
          newY += Math.sin(Date.now() / 1000 + f.x) * 0.4;
          newY += (Math.random() - 0.5) * 0.5;
          let repulseX = 0, repulseY = 0;
          prev.forEach(otherFish => {
            if (otherFish.id !== f.id && otherFish.status === 'active') {
              const dx = newX - otherFish.x, dy = newY - otherFish.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist > 0 && dist < 8) {
                repulseX += (dx / dist) * 0.3;
                repulseY += (dy / dist) * 0.3;
              }
            }
          });
          newX += repulseX;
          newY += repulseY;
          if (reputation < 50) newY += 0.2;
        }
        if (newX > 92) { newX = 92; newDirection = -1; }
        if (newX < 8) { newX = 8; newDirection = 1; }
        return { ...f, x: newX, y: Math.max(15, Math.min(85, newY)), direction: newDirection, energy: Math.max(20, f.energy - 0.05), status: currentStatus };
      }));
      setBot(prev => {
        let newX = prev.x + 0.2 * prev.direction, newDir = prev.direction;
        if (newX > 90) { newX = 90; newDir = -1; }
        if (newX < 10) { newX = 10; newDir = 1; }
        return { ...prev, x: newX, direction: newDir };
      });
    }, 50);
    return () => clearInterval(interval);
  }, [mousePos, keys]); // убрали food из зависимостей

  // Монтирование/размонтирование
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePointer({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    });
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = Date.now();
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1000);

    const newFood: Food = { id: generateId(), x, y, size: 4 + Math.random() * 4 };
    setFood(prev => [...prev, newFood]);
  }, []);

  const feedAllFishes = useCallback(() => {
    const newFoods = Array.from({ length: fishes.length * 3 }).map((_, i) => ({
      id: `food-${Date.now()}-${i}`,
      x: 10 + Math.random() * 80,
      y: -10 - Math.random() * 30,
      size: 3 + Math.random() * 5
    }));
    setFood(prev => [...prev, ...newFoods]);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const id = Date.now() + 1;
      setRipples(prev => [...prev, { id, x: rect.width / 2, y: 0, width: 200, height: 20 }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1000);
    }
  }, [fishes.length]);

  const selectedKeyData = keys.find(k => k.id === selectedFish);
  const activeFishesCount = fishes.filter(f => f.status === 'active').length;
  const avgReputation = keys.length > 0 
    ? keys.reduce((acc, k) => acc + (k.stats?.extended?.reputationScore || 0), 0) / keys.length 
    : 0;

  const getTankBg = () => {
    if (avgReputation > 70) return 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)';
    if (avgReputation > 40) return 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)';
    return 'linear-gradient(180deg, #312e81 0%, #1e1b4b 100%)';
  };

  return (
    <div className="aquarium-wrapper">
      <div className="aquarium-header">
        <div>
          <h2 className="aquarium-heading">
            <Waves size={32} color="#3b82f6" className="pulsing" aria-hidden="true" /> Аквариум Интеллекта
          </h2>
          <p className="aquarium-subtitle">Живая экосистема ваших нейросетей. Состояние рыб отражает здоровье и активность провайдеров.</p>
        </div>
        <div className="aquarium-header-actions">
          <button onClick={feedAllFishes} className="aquarium-feed-btn" aria-label="Покормить всех рыб">
            <Sun size={14} aria-hidden="true" /> ПОКОРМИТЬ РЫБ
          </button>
          <div className="aquarium-temp-badge" aria-label={`Температура среды: ${Math.round(avgReputation)}%`}>
            <Thermometer size={14} color="#3b82f6" aria-hidden="true" />
            <span className="aquarium-temp-text">{Math.round(avgReputation)}% ТЕМП. СРЕДЫ</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="aquarium-error-banner" role="alert"
          >
            <AlertCircle size={18} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} className="aquarium-error-close" aria-label="Закрыть уведомление">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onClick={handleContainerClick}
        className="aquarium-tank"
        style={{ background: getTankBg(), boxShadow: 'inset 0 0 120px rgba(0,0,0,0.6), 0 20px 40px rgba(0,0,0,0.3)' }}
        role="img"
        aria-label="Аквариум с рыбами-провайдерами"
      >
        {/* God Rays */}
        <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)', pointerEvents: 'none', zIndex: 1 }}
          animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Surface Wave */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, overflow: 'hidden', zIndex: 6, pointerEvents: 'none' }}>
          <motion.div animate={{ x: ['0%', '-50%'] }} transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} style={{ width: '200%', height: '100%', display: 'flex' }}>
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%', transform: 'scaleY(-1)' }}>
              <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="rgba(255,255,255,0.08)" />
            </svg>
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%', transform: 'scaleY(-1)' }}>
              <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" fill="rgba(255,255,255,0.08)" />
            </svg>
          </motion.div>
        </div>

        {/* Jellyfishes */}
        {jellyfishes.map(j => (
          <motion.div key={`jelly-${j.id}`} initial={{ y: '120%', left: `${j.x}%`, opacity: 0 }}
            animate={{ y: '-30%', opacity: [0, 0.4, 0.4, 0] }}
            transition={{ y: { duration: j.speed, repeat: Infinity, ease: 'linear', delay: j.delay }, opacity: { duration: j.speed, repeat: Infinity, ease: 'linear', delay: j.delay } }}
            style={{ position: 'absolute', width: j.size, height: j.size, zIndex: 2, filter: 'blur(1.5px)', pointerEvents: 'none' }}
          >
            <motion.div animate={{ scaleY: [0.9, 1.1, 0.9] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '100%', height: '40%', background: 'rgba(255,255,255,0.15)', borderRadius: '50% 50% 20% 20%', borderTop: '2px solid rgba(255,255,255,0.3)', boxShadow: '0 -5px 15px rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-around', width: '70%', margin: '0 auto' }}>
              {j.tentacles.map((t, i) => (
                <motion.div key={i} animate={{ height: [t.minHeight, t.maxHeight, t.minHeight] }} transition={{ duration: t.duration, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
              ))}
            </div>
          </motion.div>
        ))}

        {/* Seaweed */}
        {seaweeds.map(s => (
          <motion.div key={`seaweed-${s.id}`}
            style={{ position: 'absolute', bottom: 0, left: `${s.left}%`, width: s.width, height: s.height,
              background: 'linear-gradient(to top, rgba(16,185,129,0.4), rgba(16,185,129,0.1))',
              borderRadius: '50% 50% 0 0', transformOrigin: 'bottom center', zIndex: 3, filter: 'blur(2px)', pointerEvents: 'none' }}
            animate={{ rotateZ: [s.minRotate, s.maxRotate, s.minRotate] }}
            transition={{ duration: s.duration, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
          />
        ))}

        {/* Cleaner Bot */}
        <motion.div animate={{ left: `${bot.x}%`, top: `${bot.y}%`, rotateY: bot.direction === 1 ? 0 : 180 }}
          transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
          style={{ position: 'absolute', zIndex: 12, display: 'flex', alignItems: 'center', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))', pointerEvents: 'none' }}
        >
          <div style={{ background: '#334155', borderRadius: '20px 20px 5px 5px', width: 40, height: 25, position: 'relative', border: '2px solid #475569' }}>
            <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ position: 'absolute', top: 5, left: 25, width: 6, height: 6, background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }} />
            <div style={{ position: 'absolute', top: -12, left: 10, width: 4, height: 12, background: '#475569', borderRadius: '2px 2px 0 0' }} />
            <div style={{ position: 'absolute', top: 10, left: 15, width: 8, height: 8, borderRadius: '50%', background: '#0f172a', border: '2px solid #64748b' }} />
            <motion.div animate={{ rotateZ: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', top: 12, right: -4, width: 4, height: 12, background: '#94a3b8', borderRadius: 2, transformOrigin: 'center' }} />
          </div>
        </motion.div>

        {/* Food */}
        {food.map(f => (
          <motion.div key={f.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1, y: `${f.y}%` }}
            style={{ position: 'absolute', left: `${f.x}%`, top: 0, width: f.size, height: f.size, background: '#f59e0b', borderRadius: '50%', boxShadow: '0 0 10px #f59e0b', zIndex: 5 }} />
        ))}

        {/* Bubbles */}
        {bubbles.map((b) => (
          <motion.div key={b.id} initial={{ y: b.type === 'data' ? `${b.y}%` : '110%', left: `${b.x}%`, opacity: 0 }}
            animate={{ y: '-10%', opacity: b.type === 'data' ? [0, 0.8, 0] : [0, 0.4, 0.4, 0], scale: b.type === 'data' ? [0.5, 1.5, 0.8] : 1 }}
            transition={{ duration: b.duration, repeat: b.type === 'data' ? 0 : Infinity, ease: 'linear', delay: b.delay }}
            style={{ position: 'absolute', width: b.size, height: b.size, borderRadius: '50%',
              background: b.type === 'data' ? '#3b82f6' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${b.type === 'data' ? '#60a5fa' : 'rgba(255,255,255,0.2)'}`,
              filter: b.type === 'data' ? 'blur(1px) drop-shadow(0 0 5px #3b82f6)' : 'blur(0.5px)', zIndex: 2 }}
          />
        ))}

        {/* Fishes */}
        {fishes.map((f) => {
          const isSelected = selectedFish === f.id;
          const isDead = f.status !== 'active';
          return (
            <motion.div key={f.id}
              animate={{ left: `${f.x}%`, top: `${f.y}%`, scale: isSelected ? 1.4 : 1, rotateY: f.direction === 1 ? 0 : 180, rotateZ: isDead ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 40, damping: 15 }}
              onClick={() => setSelectedFish(isSelected ? null : f.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedFish(isSelected ? null : f.id); } }}
              style={{ position: 'absolute', cursor: 'pointer', zIndex: isSelected ? 100 : 10, transformOrigin: 'center', opacity: isDead ? 0.6 : 1, filter: isDead ? 'grayscale(0.8)' : 'none' }}
              role="button" tabIndex={0} aria-label={`${f.provider}: ${f.status === 'active' ? 'Активен' : 'Неактивен'}, энергия ${Math.round(f.energy)}%`}
            >
              <motion.div animate={f.isPulsing ? { scale: [1, 1.3, 1], filter: [`drop-shadow(0 0 10px ${f.color})`, `drop-shadow(0 0 30px ${f.color})`, `drop-shadow(0 0 10px ${f.color})`] } : {}} style={{ position: 'relative' }}>
                <motion.div animate={isDead ? {} : { rotateZ: [-5, 5, -5] }} transition={{ duration: f.wagDuration, repeat: Infinity, ease: 'easeInOut' }}>
                  <FishIcon size={42 * f.scale} color={f.color} fill={f.color + (f.energy > 50 ? '44' : '11')} />
                </motion.div>
                {f.isPulsing && (
                  <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 3, opacity: 0 }}
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${f.color}`, pointerEvents: 'none' }} />
                )}
                <div className="aquarium-fish-label" style={{ background: isSelected ? f.color : 'rgba(0,0,0,0.6)', border: `1px solid ${f.color}44`, boxShadow: isSelected ? `0 0 15px ${f.color}66` : 'none' }}>
                  {f.provider}
                </div>
                <div className="aquarium-energy-bar-bg">
                  <div className="aquarium-energy-bar-fill" style={{ width: `${f.energy}%`, background: f.color }} />
                </div>
                <AnimatePresence>
                  {f.lastWords && (
                    <motion.div initial={{ opacity: 0, scale: 0.5, y: 10 }} animate={{ opacity: 1, scale: 1, y: -40 }} exit={{ opacity: 0, scale: 0.5 }}
                      className="aquarium-speech-bubble" style={{ border: `1px solid ${f.color}` }}>
                      {f.lastWords}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          );
        })}

        {/* Ripples */}
        {ripples.map(r => (
          <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.width || 80, height: r.height || 80, borderRadius: '50%', border: `2px solid rgba(255,255,255,0.3)`, transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 15, animation: 'water-ripple 1s ease-out forwards' }} />
        ))}

        {/* Legend */}
        <div className="aquarium-legend">
          <div className="aquarium-legend-title">Популяция провайдеров</div>
          {Object.entries(providerColors).map(([p, c]) => {
            if (p === 'default') return null;
            const hasFish = fishes.some(f => f.provider.toLowerCase() === p);
            return (
              <div key={p} className="aquarium-legend-item" style={{ color: hasFish ? 'white' : 'rgba(255,255,255,0.3)' }}>
                <div className="aquarium-legend-dot" style={{ background: c, boxShadow: hasFish ? `0 0 10px ${c}` : 'none' }} />
                {p}
              </div>
            );
          })}
        </div>

        {/* Hint */}
        <div className="aquarium-hint">
          <MousePointer2 size={12} aria-hidden="true" /> ДВИГАЙТЕ КУРСОРОМ, ЧТОБЫ РАЗОГНАТЬ РЫБ
        </div>

        {/* Selected Info Panel */}
        <AnimatePresence>
          {selectedKeyData && (
            <motion.div initial={{ opacity: 0, x: 30, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 30, scale: 0.9 }}
              className="aquarium-info-panel" role="dialog" aria-label={`Информация о ${selectedKeyData.label}`}
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
                <button onClick={() => setSelectedFish(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Закрыть">✕</button>
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

                <div>
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
                
                <button onClick={() => { eventBus.emit(EVENTS.NAVIGATE, 'providers'); eventBus.emit(EVENTS.SELECT_MODEL, { provider: selectedKeyData.provider, model: selectedKeyData.availableModels?.[0] || 'auto' }); }}
                  className="btn-primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', gap: 8 }}>
                  <Zap size={14} aria-hidden="true" /> Управлять ключом
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="aquarium-footer">
        <div className="glass-panel aquarium-footer-card" style={{ border: '1px solid rgba(16,185,129,0.1)' }}>
          <div className="aquarium-footer-icon-box" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <ShieldCheck color="#10b981" size={24} />
          </div>
          <div>
            <div className="aquarium-footer-label">Здоровье экосистемы</div>
            <div className="aquarium-footer-value" style={{ color: '#10b981' }}>{Math.round(avgReputation)}% — СТАБИЛЬНО</div>
          </div>
        </div>
        <div className="glass-panel aquarium-footer-card" style={{ border: '1px solid rgba(245,158,11,0.1)' }}>
          <div className="aquarium-footer-icon-box" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <Sparkles color="#f59e0b" size={24} />
          </div>
          <div>
            <div className="aquarium-footer-label">Популяция агентов</div>
            <div className="aquarium-footer-value" style={{ color: '#f59e0b' }}>{activeFishesCount} активных сущностей</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AquariumPanel;
