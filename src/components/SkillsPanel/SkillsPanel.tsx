import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings,
  Layers, Activity,
  BrainCircuit, DownloadCloud, Box, AlertCircle
} from 'lucide-react';
import { eventBus, EVENTS } from '../../core/events';

interface CognitiveSkill {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'generation' | 'orchestration' | 'utility';
  status: 'installed' | 'active' | 'not_installed';
  toolsUsed: string[];
  version: string;
  executionCount?: number;
}

const mockSkills: CognitiveSkill[] = [
  { id: 'sk-1', name: 'Deep Web Researcher', description: 'Performs multi-step parallel searches, extracts semantic content, and synthesizes comprehensive research briefs.', category: 'analysis', status: 'active', toolsUsed: ['Google Search API', 'Web Scraper', 'Summarizer'], version: '2.1.0', executionCount: 47 },
  { id: 'sk-2', name: 'Code Reviewer Pro', description: 'Analyzes PRs or local codebases for security vulnerabilities, style violations, and algorithmic inefficiencies.', category: 'analysis', status: 'installed', toolsUsed: ['Git CLI', 'AST Parser', 'Linter'], version: '1.4.2', executionCount: 23 },
  { id: 'sk-3', name: 'Social Media Manager', description: 'Monitors trends, generates contextual content schedules, and orchestrates multi-platform posting.', category: 'generation', status: 'not_installed', toolsUsed: ['Twitter API', 'LinkedIn API', 'Image Gen'], version: '3.0.1' },
  { id: 'sk-4', name: 'Data Visualization Agent', description: 'Ingests raw CSV/JSON data and autonomously generates python matplotlib/seaborn code to render charts.', category: 'generation', status: 'active', toolsUsed: ['Python Sandbox', 'Pandas'], version: '1.0.5', executionCount: 12 },
  { id: 'sk-5', name: 'Swarm Orchestrator', description: 'Advanced skill to dynamically spawn sub-agents, distribute tasks, and aggregate results for complex goals.', category: 'orchestration', status: 'installed', toolsUsed: ['Docker CLI', 'Agent Router'], version: '0.9.0-beta', executionCount: 8 },
];

const SkillsPanel: React.FC = () => {
  const [skills, setSkills] = useState<CognitiveSkill[]>(mockSkills);
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');

  const toggleSkillState = (id: string) => {
    setSkills(prev => prev.map(s => {
      if (s.id === id && s.status !== 'not_installed') {
        const nextStatus = s.status === 'active' ? 'installed' : 'active';
        eventBus.emit(EVENTS.NOTIFICATION, { 
          message: `Cognitive Skill '${s.name}' is now ${nextStatus.toUpperCase()}`, 
          type: nextStatus === 'active' ? 'success' : 'info' 
        });
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  const installSkill = (id: string) => {
    setSkills(prev => prev.map(s => {
      if (s.id === id) {
        eventBus.emit(EVENTS.NOTIFICATION, { message: `Installing ${s.name} dependencies...`, type: 'info' });
        setTimeout(() => {
          setSkills(current => current.map(c => c.id === id ? { ...c, status: 'installed' } : c));
          eventBus.emit(EVENTS.NOTIFICATION, { message: `${s.name} installed successfully.`, type: 'success' });
        }, 1500);
      }
      return s;
    }));
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

      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem', alignContent: 'start', paddingRight: '0.5rem' }}>
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
                      <Activity size={14} color="#10b981" /> {skill.executionCount ?? 0} Executions
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
          
          {displayedSkills.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '6rem 0', color: '#64748b' }}>
              <Layers size={56} style={{ opacity: 0.2, margin: '0 auto 1.5rem' }} />
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>No cognitive skills found in this category.</p>
            </div>
          )}
        </AnimatePresence>
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
