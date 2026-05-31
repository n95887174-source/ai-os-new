/** Experimental visual panel — same provider health data as HealthPanel. Sidebar: feature flag ui.experimentalVisuals. */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Waves, Zap, 
  Sparkles, MousePointer2, Thermometer, ShieldCheck,
  Sun, AlertCircle, Pause, Play
} from 'lucide-react';
import { useKeyStore } from '../../stores/useKeyStore';
import { eventBus, EVENTS } from '../../core/events';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import { infoCardMini, flexBetweenMb05, providerColors } from '../../styles/common';

import { useAquariumEngine } from './hooks/useAquariumEngine';
import { useAquariumScene } from './hooks/useAquariumScene';
import Fish from './components/Fish';
import Jellyfish from './components/Jellyfish';
import Seaweed from './components/Seaweed';
import FoodParticle from './components/FoodParticle';
import Bubble from './components/Bubble';
import CleanerBot from './components/CleanerBot';
import ProviderAquariumShape from './components/ProviderAquariumShape';
import { useLatest } from './hooks/useLatest';

const AquariumPanel: React.FC = () => {
  const { keys } = useKeyStore();
  const { t } = useTranslation();
  const [selectedFish, setSelectedFish] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPaused, setIsPaused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const mousePosRef = useLatest(mousePos);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const clearError = useAutoClearError(setError);

  const { fishes, bubbles, food, bot, setFood } = useAquariumEngine(
    keys, t, setError, clearError, mousePosRef, isMountedRef, isPaused
  );

  const { jellyfishes, seaweeds, ripples, handleMouseMove, handleContainerClick, feedAllFishes } = useAquariumScene(
    containerRef, setMousePos, setFood, fishes.length
  );

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
            <Waves size={32} color="#3b82f6" className="pulsing" aria-hidden="true" /> {t('aquarium.title')}
          </h2>
          <p className="aquarium-subtitle">{t('aquarium.subtitle')}</p>
        </div>
        <div className="aquarium-header-actions">
          <button onClick={() => setIsPaused(prev => !prev)} className="aquarium-feed-btn" aria-label={isPaused ? t('debate.resume') : t('debate.pause')}>
            {isPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
            {isPaused ? t('debate.resume') : t('debate.pause')}
          </button>
          <button onClick={feedAllFishes} className="aquarium-feed-btn" aria-label={t('aquarium.feed_fish')}>
            <Sun size={14} aria-hidden="true" /> {t('aquarium.feed_fish')}
          </button>
          <div className="aquarium-temp-badge" aria-label="Temperature Badge">
            <Thermometer size={14} color="#3b82f6" aria-hidden="true" />
            <span className="aquarium-temp-text">{Math.round(avgReputation)}% {t('aquarium.temp_env')}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="aquarium-error-banner" role="alert"
          >
            <AlertCircle size={18} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} className="aquarium-error-close" aria-label="Dismiss">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {fishes.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 24, border: '2px dashed rgba(255,255,255,0.1)' }}>
          <Waves size={64} color="#475569" />
          <h3 style={{ margin: 0, color: '#94a3b8', fontWeight: 700, fontSize: '1.1rem' }}>{t('aquarium.empty_title')}</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', textAlign: 'center', maxWidth: 300 }}>{t('aquarium.empty_desc')}</p>
          <button onClick={() => { eventBus.emit(EVENTS.NAVIGATE, 'providers'); }} className="btn-primary" style={{ padding: '0.7rem 1.5rem', borderRadius: 12 }}>
            {t('sidepanel.add_provider') || 'Add Provider'}
          </button>
        </motion.div>
      ) : (
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onClick={handleContainerClick}
        className="aquarium-tank"
        style={{ background: getTankBg(), boxShadow: 'inset 0 0 120px rgba(0,0,0,0.6), 0 20px 40px rgba(0,0,0,0.3)' }}
        role="img"
        aria-label={t('aquarium.title')}
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
          <Jellyfish key={`jelly-${j.id}`} jellyfish={j} />
        ))}

        {/* Seaweed */}
        {seaweeds.map(s => (
          <Seaweed key={`seaweed-${s.id}`} seaweed={s} />
        ))}

        {/* Cleaner Bot */}
        <CleanerBot x={bot.x} y={bot.y} direction={bot.direction} />

        {/* Food */}
        {food.map(f => (
          <FoodParticle key={f.id} food={f} />
        ))}

        {/* Bubbles */}
        {bubbles.map(b => (
          <Bubble key={b.id} bubble={b} />
        ))}

        {/* Fishes */}
        {fishes.map(f => (
          <Fish key={f.id} fish={f} isSelected={selectedFish === f.id} onSelect={setSelectedFish} t={t} />
        ))}

        {/* Ripples */}
        {ripples.map(r => (
          <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.width || 80, height: r.height || 80, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 15, animation: 'water-ripple 1s ease-out forwards' }} />
        ))}

        {/* Legend */}
        <div className="aquarium-legend">
          <div className="aquarium-legend-title">{t('aquarium.provider_population')}</div>
          {Object.entries(providerColors).map(([p, c]) => {
            if (p === 'default') return null;
            const hasFish = fishes.some(f => f.provider.toLowerCase() === p);
            const label = p.charAt(0).toUpperCase() + p.slice(1);
            return (
              <div key={p} className="aquarium-legend-item" style={{ color: hasFish ? 'white' : 'rgba(255,255,255,0.3)' }}>
                <div className="aquarium-legend-dot" style={{ background: c, boxShadow: hasFish ? `0 0 10px ${c}` : 'none' }} />
                {label}
              </div>
            );
          })}
        </div>

        {/* Hint */}
        <div className="aquarium-hint">
          <MousePointer2 size={12} aria-hidden="true" /> {t('aquarium.move_cursor_hint')}
        </div>

        {/* Selected Info Panel */}
        <AnimatePresence>
          {selectedKeyData && (
            <motion.div initial={{ opacity: 0, x: 30, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 30, scale: 0.9 }}
              className="aquarium-info-panel" role="dialog" aria-label="Info Panel"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333', filter: selectedKeyData.status !== 'active' ? 'grayscale(1)' : 'none' }}>
                    <ProviderAquariumShape
                      provider={selectedKeyData.provider}
                      size={24}
                      color={selectedKeyData.status === 'active' ? providerColors[selectedKeyData.provider.toLowerCase()] : '#64748b'}
                      energy={selectedKeyData.status === 'active' ? 100 : 0}
                    />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{selectedKeyData.label}</h3>
                    <div style={{ fontSize: '0.65rem', color: selectedKeyData.status === 'active' ? providerColors[selectedKeyData.provider.toLowerCase()] : '#ef4444', fontWeight: 800, textTransform: 'uppercase' }}>
                      {selectedKeyData.provider} {selectedKeyData.status !== 'active' && t('aquarium.offline_suffix')}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedFish(null)} className="aquarium-close-btn" aria-label={t('aquarium.close_info')}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={infoCardMini}>
                  <div style={flexBetweenMb05}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{t('aquarium.reputation_index')}</span>
                    <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}>{Math.round(selectedKeyData.stats?.extended?.reputationScore || 0)}%</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.round(selectedKeyData.stats?.extended?.reputationScore || 0)}%` }} style={{ height: '100%', background: '#10b981' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={infoCardMini}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('aquarium.latency_label')}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{Math.round(selectedKeyData.stats?.avgLatency || 0)}ms</div>
                  </div>
                  <div style={infoCardMini}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('aquarium.success_label')}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>
                      {((selectedKeyData.stats?.successCount || 0) / (Math.max(1, (selectedKeyData.stats?.successCount || 0) + (selectedKeyData.stats?.errorCount || 0))) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>{t('aquarium.personality_status')}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.6rem', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                      {selectedKeyData.status === 'active' ? t('common.active').toUpperCase() : t('common.not_available')}
                    </span>
                    <span style={{ fontSize: '0.6rem', background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                      {t('aquarium.personality_status')}: {fishes.find(f => f.id === selectedFish)?.personality || t('aquarium.personality_normal')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 700 }}>{t('aquarium.active_models')}</div>
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
                  <Zap size={14} aria-hidden="true" /> {t('aquarium.manage_key')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      <div className="aquarium-footer">
        <div className="glass-panel aquarium-footer-card" style={{ border: '1px solid rgba(16,185,129,0.1)' }}>
          <div className="aquarium-footer-icon-box" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <ShieldCheck color="#10b981" size={24} />
          </div>
          <div>
            <div className="aquarium-footer-label">{t('aquarium.ecosystem_health')}</div>
            <div className="aquarium-footer-value" style={{ color: '#10b981' }}>{Math.round(avgReputation)}% {t('aquarium.stable_suffix')}</div>
          </div>
        </div>
        <div className="glass-panel aquarium-footer-card" style={{ border: '1px solid rgba(245,158,11,0.1)' }}>
          <div className="aquarium-footer-icon-box" style={{ background: 'rgba(245,158,11,0.1)' }}>
            <Sparkles color="#f59e0b" size={24} />
          </div>
          <div>
            <div className="aquarium-footer-label">{t('aquarium.agent_population')}</div>
            <div className="aquarium-footer-value" style={{ color: '#f59e0b' }}>{activeFishesCount} {t('aquarium.active_entities')}</div>
          </div>
        </div>
      </div>
      <ModuleInfo moduleKey="aquarium" />
    </div>
  );
};

export default AquariumPanel;
