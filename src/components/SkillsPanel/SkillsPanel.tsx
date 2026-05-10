import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings,
  Layers, Activity,
  BrainCircuit, DownloadCloud, Box, AlertCircle, Loader2
} from 'lucide-react';
import { skillService } from '../../services/SkillService';
import type { CognitiveSkill } from '../../types/domain';
import { eventBus, EVENTS } from '../../core/events';

const SkillsPanel: React.FC = () => {
  const [skills, setSkills] = useState<CognitiveSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSkills(skillService.getSkills());
    setLoading(false);
    const unsub = eventBus.on('skills:updated', (data: any) => {
      setSkills([...data]);
    });
    return () => unsub();
  }, []);

  const toggleSkillState = (id: string) => {
    try {
      const s = skills.find(x => x.id === id);
      if (!s || s.status === 'not_installed') return;
      const nextStatus = s.status === 'active' ? 'installed' : 'active';
      skillService.toggleActive(id);
      eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Cognitive Skill '${s.name}' is now ${nextStatus.toUpperCase()}`,
        type: nextStatus === 'active' ? 'success' : 'info'
      });
      setError(null);
    } catch {
      setError('Failed to toggle skill state');
    }
  };

  const installSkill = (id: string) => {
    try {
      const s = skills.find(x => x.id === id);
      if (!s) return;
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Installing ${s.name} dependencies...`, type: 'info' });
      skillService.installSkill(id);
      eventBus.emit(EVENTS.NOTIFICATION, { message: `${s.name} installed successfully.`, type: 'success' });
      setError(null);
    } catch {
      setError('Failed to install skill');
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'analysis': return '#3b82f6';
      case 'generation': return '#a855f7';
      case 'orchestration': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const displayedSkills = activeTab === 'installed'
    ? skills.filter(s => s.status !== 'not_installed')
    : skills.filter(s => s.status === 'not_installed');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={20} className="spin" /> Loading cognitive skills...
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <BrainCircuit size={28} color="#f59e0b" /> Cognitive Skills
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Deploy and manage high-level composite behaviors for your autonomous agents.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={() => setActiveTab('installed')}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: activeTab === 'installed' ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: activeTab === 'installed' ? '#60a5fa' : '#64748b'
            }}
          >
            Installed ({skills.filter(s => s.status !== 'not_installed').length})
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
              background: activeTab === 'marketplace' ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: activeTab === 'marketplace' ? '#f59e0b' : '#64748b'
            }}
          >
            <DownloadCloud size={16} /> Extension Hub
          </button>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: '0.9rem' }}
          >
            <AlertCircle size={18} /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>X</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem', alignContent: 'start', paddingRight: '0.5rem' }}>
        {displayedSkills.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', padding: '4rem 0' }}>
            <Layers size={56} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>
              {activeTab === 'installed' ? 'No cognitive skills installed' : 'No skills available in the extension hub'}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              {activeTab === 'installed' ? 'Install skills from the Extension Hub to get started' : 'All skills are currently installed'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayedSkills.map((skill, i) => {
              const catColor = getCategoryColor(skill.category);
              return (
                <motion.div
                  key={skill.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel"
                  style={{ 
                    padding: '1.5rem', 
                    borderRadius: 16,
                    border: `1px solid ${skill.status === 'active' ? `${catColor}40` : 'rgba(255,255,255,0.05)'}`,
                    background: skill.status === 'active' ? `linear-gradient(145deg, ${catColor}10 0%, rgba(255,255,255,0.01) 100%)` : 'rgba(0,0,0,0.2)',
                    display: 'flex', flexDirection: 'column', gap: '1.25rem'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ padding: '0.75rem', background: `${catColor}20`, borderRadius: 12, border: `1px solid ${catColor}40` }}>
                        <Box size={24} color={catColor} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.3rem', color: '#f8fafc' }}>{skill.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: catColor }}>{skill.category}</span>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#64748b' }} />
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace' }}>v{skill.version}</span>
                        </div>
                      </div>
                    </div>
                    
                    {activeTab === 'installed' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: skill.status === 'active' ? '#10b981' : '#64748b', letterSpacing: '0.05em' }}>
                          {skill.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                        <div 
                          onClick={() => toggleSkillState(skill.id)}
                          style={{ 
                            width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                            background: skill.status === 'active' ? '#10b981' : 'rgba(255,255,255,0.1)',
                            position: 'relative', transition: 'all 0.2s',
                            boxShadow: skill.status === 'active' ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none'
                          }}
                        >
                          <motion.div 
                            animate={{ x: skill.status === 'active' ? 22 : 2 }}
                            style={{ width: 20, height: 20, background: 'white', borderRadius: '50%', position: 'absolute', top: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => installSkill(skill.id)}
                        className="btn-primary"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                      >
                        <DownloadCloud size={16} /> Install
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                    {skill.description}
                  </p>

                  {/* Tools Used */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Required Toolchains</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {skill.toolsUsed.map((tool, idx) => (
                        <span key={idx} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.75rem', borderRadius: 8, color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>

                  {activeTab === 'installed' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <button onClick={() => eventBus.emit(EVENTS.NOTIFICATION, { message: `Opening advanced configuration for ${skill.name}...`, type: 'info' })} style={{ background: 'none', border: 'none', color: catColor, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Settings size={16} /> Fine-tune Pipeline
                      </button>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        <Activity size={14} color="#10b981" /> {skill.executionCount} Executions
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(245,158,11,0.1)', borderRadius: 10 }}><AlertCircle color="#f59e0b" size={24} style={{ flexShrink: 0 }} /></div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          <strong>Performance Notice:</strong> Cognitive Skills consume significantly more context window tokens than basic tools. Enable them selectively based on the agent's assigned role in the topology to prevent context starvation.
        </p>
      </div>
    </div>
  );
};

export default SkillsPanel;
