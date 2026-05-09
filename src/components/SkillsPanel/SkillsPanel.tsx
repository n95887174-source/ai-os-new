import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Code, Globe, Calculator, Search, 
  Terminal, Shield, Settings, CheckCircle2, 
  XCircle, AlertCircle, Plus, ExternalLink,
  Cpu, Layers, MousePointer2, Activity
} from 'lucide-react';
import { eventBus, EVENTS } from '../../core/events';

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'beta' | 'disabled';
  usageCount: number;
  config: Record<string, any>;
}

import { toolService } from '../../services/ToolService';

const SkillsPanel: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>(() => {
    return toolService.getTools().map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.type === 'script' ? <Code size={20} /> : t.type === 'api' ? <Globe size={20} /> : <Terminal size={20} />,
      status: 'active',
      usageCount: 0,
      config: t.config || {}
    }));
  });

  const [activeTab, setActiveTab] = useState<'all' | 'configured' | 'marketplace'>('all');

  React.useEffect(() => {
    const unsub = eventBus.on('tool:execution:success', (data: any) => {
      if (data?.toolId) {
        setSkills(prev => prev.map(s =>
          s.id === data.toolId ? { ...s, usageCount: s.usageCount + 1 } : s
        ));
      }
    });
    const unsubTools = eventBus.on('tools:updated', (data: any) => {
      setSkills(data.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.type === 'script' ? <Code size={20} /> : t.type === 'api' ? <Globe size={20} /> : <Terminal size={20} />,
        status: 'active',
        usageCount: 0,
        config: t.config || {},
      })));
    });
    return () => { unsub(); unsubTools(); };
  }, []);

  const toggleSkill = (id: string) => {
    setSkills(prev => prev.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'disabled' ? 'active' : 'disabled';
        eventBus.emit(EVENTS.NOTIFICATION, { 
          message: `Skill ${s.name} ${nextStatus === 'active' ? 'enabled' : 'disabled'}`, 
          type: nextStatus === 'active' ? 'success' : 'info' 
        });
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Zap size={32} color="#f59e0b" /> Skills & Tools
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1rem' }}>
            Extend agent capabilities through external APIs and system functions.
          </p>
        </div>
        
        <button className="btn-primary" onClick={() => eventBus.emit(EVENTS.NOTIFICATION, { message: 'Skill marketplace coming soon.', type: 'info' })} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Add Skill
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'all', label: 'Installed', count: skills.length },
          { id: 'configured', label: 'Active', count: skills.filter(s => s.status !== 'disabled').length },
          { id: 'marketplace', label: 'Marketplace', count: 12 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 0.5rem', background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? '#f59e0b' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === tab.id ? '#f59e0b' : 'transparent'}`,
              fontSize: '0.95rem', fontWeight: 600, transition: 'all 0.2s', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {tab.label} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
        <AnimatePresence mode="popLayout">
          {activeTab !== 'marketplace' ? (
            skills.map((skill, i) => (
              <motion.div
                key={skill.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel"
                style={{ 
                  padding: '1.5rem', 
                  border: `1px solid ${skill.status === 'disabled' ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.1)'}`,
                  background: skill.status === 'disabled' ? 'rgba(255,255,255,0.01)' : 'rgba(245,158,11,0.02)',
                  opacity: skill.status === 'disabled' ? 0.7 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ background: skill.status === 'disabled' ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.1)', padding: '0.75rem', borderRadius: 12, color: skill.status === 'disabled' ? 'var(--text-muted)' : '#f59e0b' }}>
                    {skill.icon}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {skill.status === 'beta' && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a855f7', background: 'rgba(168,85,247,0.1)', padding: '2px 8px', borderRadius: 20 }}>BETA</span>
                    )}
                    <button 
                      onClick={() => toggleSkill(skill.id)}
                      style={{ 
                        width: 38, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: skill.status !== 'disabled' ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                        position: 'relative', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: skill.status !== 'disabled' ? 21 : 3, transition: 'all 0.2s' }} />
                    </button>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>{skill.name}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem', height: '3rem', overflow: 'hidden' }}>
                  {skill.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: 10, marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Usage</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Activity size={14} color="#10b981" /> {skill.usageCount}x
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Status</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: skill.status === 'disabled' ? '#ef4444' : '#10b981' }}>
                      {skill.status === 'disabled' ? <XCircle size={14} /> : <CheckCircle2 size={14} />} 
                      {skill.status === 'disabled' ? 'Disabled' : 'Ready'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => eventBus.emit(EVENTS.NOTIFICATION, { message: `${skill.name} configuration opened.`, type: 'info' })} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Settings size={14} /> Configure
                  </button>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>v1.2.4</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem 0' }}>
              <Layers size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
              <h2 style={{ marginBottom: '0.5rem' }}>Skill Marketplace</h2>
              <p style={{ color: 'var(--text-muted)' }}>A library of official and community plugins will appear here soon.</p>
              <button className="btn-secondary" style={{ marginTop: '1.5rem' }}>Explore Repository</button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Warning Card */}
      <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 14, padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        <AlertCircle color="#f59e0b" size={24} style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ margin: '0 0 0.5rem', color: '#f59e0b' }}>Execution Safety</h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            All skills run in isolated containers. Granting access to <strong>System Shell</strong> or <strong>Autonomous Browser</strong> may put your system at risk if using untrusted models.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SkillsPanel;
