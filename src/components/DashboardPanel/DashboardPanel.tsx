import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Plug, Zap, TrendingUp, Cpu, ShieldCheck } from 'lucide-react';
import { useKeyStore } from '../../stores/useKeyStore';
import { kernel } from '../../core/Kernel';
import { eventBus } from '../../core/events';
import LiveEventFeed from './LiveEventFeed';
import { keyService } from '../../services/KeyService';
import RacingWinners from './RacingWinners';
import PredictiveQuota from './PredictiveQuota';

interface DashboardProps {
  onNavigate: (page: 'chat' | 'providers') => void;
}

const DashboardPanel: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { keys } = useKeyStore();
  const [stats, setStats] = useState(() => kernel.getState());

  useEffect(() => {
    const unsub = eventBus.on('kernel:updated', (state) => {
      setStats(state);
    });
    return () => unsub();
  }, []);

  const activeKeys = keys.filter(k => k.status === 'active');

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', minHeight: 'calc(100vh - 120px)' }}>
      <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Hero Welcome & SLA Toggle */}
        <motion.div variants={itemVariants} style={{ background: 'linear-gradient(145deg, rgba(59,130,246,0.1) 0%, rgba(168,85,247,0.05) 100%)', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(59,130,246,0.15)', position: 'relative', overflow: 'hidden' }}>
          {/* Kernel Pulse Effect */}
          <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }}>
            <motion.div 
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }} 
              transition={{ repeat: Infinity, duration: 4 }}
              style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid rgba(59,130,246,0.1)' }} 
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                Ядро Системы v3.1 <span style={{ fontSize: '0.9rem', color: '#10b981', marginLeft: '0.5rem', verticalAlign: 'middle', fontWeight: 500 }}>● ОНЛАЙН</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '500px' }}>
                Оркестрация {activeKeys.length} провайдеров с балансировкой TTFT в реальном времени и контролем SLA.
              </p>
            </div>
            
            {/* Global SLA Toggle */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.4rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.25rem' }}>
              {[
                { id: 'LOW_LATENCY', label: 'НИЗКАЯ ЗАДЕРЖКА' },
                { id: 'HIGH_QUALITY', label: 'ВЫСОКОЕ КАЧЕСТВО' },
                { id: 'BALANCED', label: 'БАЛАНС' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => keyService.setGlobalSLA?.(mode.id)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: stats.weights.effective.ttft > 0.5 && mode.id === 'LOW_LATENCY' ? '#3b82f6' : 'transparent',
                    color: stats.weights.effective.ttft > 0.5 && mode.id === 'LOW_LATENCY' ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button onClick={() => onNavigate('chat')} className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
              <MessageSquare size={16} /> Новая сессия
            </button>
            <button onClick={() => onNavigate('providers')} className="btn-secondary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
              <Plug size={16} /> Узлы системы
            </button>
          </div>
        </motion.div>

        {/* Intelligence Grid Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <motion.div variants={itemVariants}>
            <RacingWinners providers={Object.values(stats.providers).map(p => ({
              id: p.id,
              winRate: p.selectionRate,
              avgTTFT: p.avgTTFT
            }))} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <PredictiveQuota 
              usedTokens={stats.totalTokens} 
              maxTokens={1000000}
              requestsCount={stats.totalRequests}
            />
          </motion.div>
        </div>

        {/* Infrastructure Health Map */}
        <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} color="#10b981" /> Карта здоровья инфраструктуры
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
            {keys.map(k => (
              <div key={k.id} style={{ 
                padding: '0.75rem', 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '12px', 
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{k.provider}</span>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: k.status === 'active' ? '#10b981' : '#ef4444', boxShadow: `0 0 10px ${k.status === 'active' ? '#10b981' : '#ef4444'}` }} 
                  />
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{k.model?.split('/').pop() || 'Авто-выбор'}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.25rem' }}>
                   <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{Math.round(stats.providers[k.provider.toLowerCase()]?.avgTTFT || 0)}мс</div>
                   <div style={{ fontSize: '0.6rem', color: '#10b981' }}>{Math.round(stats.providers[k.provider.toLowerCase()]?.reliability * 100 || 0)}%</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {[
            { label: 'Эффективность системы', value: `${Math.round((stats.totalRequests - (stats.violations?.length || 0)) / (stats.totalRequests || 1) * 100)}%`, icon: <TrendingUp size={18} color="#f59e0b" />, color: 'rgba(245,158,11,0.1)' },
            { label: 'Активные потоки', value: activeKeys.length, icon: <Zap size={18} color="#3b82f6" />, color: 'rgba(59,130,246,0.1)' },
            { label: 'Аптайм ядра', value: '99.9%', icon: <ShieldCheck size={18} color="#10b981" />, color: 'rgba(16,185,129,0.1)' },
          ].map((s, i) => (
            <div key={i} className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ background: s.color, padding: '0.4rem', borderRadius: '8px' }}>{s.icon}</div>
                <h3 style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{s.label}</h3>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)' }}>{s.value}</div>
            </div>
          ))}
        </motion.div>

        {/* Dynamic Insight Card */}
        <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(168,85,247,0.03)', border: '1px solid rgba(168,85,247,0.1)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Cpu size={24} color="#a855f7" />
            <div>
              <strong style={{ color: '#a855f7', display: 'block', marginBottom: '0.2rem' }}>Советник ядра: {Object.values(stats.providers).sort((a, b) => b.reliability - a.reliability)[0]?.id || 'Норма'}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {Object.values(stats.providers).length > 0 
                  ? `${Object.values(stats.providers).sort((a, b) => b.reliability - a.reliability)[0]?.id} показывает самый высокий индекс надежности. Рекомендуется направлять задачи по коду на этот узел.`
                  : 'Ожидание телеметрии для формирования рекомендаций по маршрутизации.'}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Right Sidebar: Event Feed */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ delay: 0.3 }}
      >
        <LiveEventFeed />
      </motion.div>
    </div>
  );
};

export default DashboardPanel;
