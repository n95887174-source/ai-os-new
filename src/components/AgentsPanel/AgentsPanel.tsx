import React, { useState } from 'react';
import { 
  Bot, Settings, Shield, Zap, Activity, Plus, Search, 
  MoreVertical, Play, Pause,
  LayoutGrid, List, Cpu, Wrench, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKeyStore } from '../../stores/useKeyStore';
import { toolService } from '../../services/ToolService';
import { roleService } from '../../services/RoleService';

import { orchestrator } from '../../services/OrchestrationService';

interface Agent {
  id: string;
  name: string;
  role: string;
  roleId?: string;
  description: string;
  providerId: string;
  model: string;
  status: 'active' | 'paused' | 'error';
  temperature: number;
  tools: string[];
  skills: string[];
  systemPrompt: string;
  stats: {
    calls: number;
    tokens: number;
    latency: number;
  };
}

const getAgentsFromTopology = (): Agent[] => {
  const top = orchestrator.getActiveTopology();
  if (!top) return [];
  return top.nodes.filter(n => n.type === 'agent' || n.type === 'router').map(n => ({
    id: n.id,
    name: n.label,
    role: n.type === 'router' ? 'Semantic Router' : (n.config.roleName || 'Autonomous Agent'),
    roleId: n.config.roleId,
    description: n.config.prompt || 'No specific description.',
    providerId: n.config.provider || 'Auto',
    model: n.config.model || 'auto',
    status: 'active',
    temperature: n.config.temperature || 0.2,
    tools: n.config.tools || [],
    skills: [],
    systemPrompt: n.config.prompt || '',
    stats: { calls: 0, tokens: 0, latency: 0 }
  }));
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

import { eventBus } from '../../core/events';

const AgentsPanel: React.FC = () => {
  const { keys } = useKeyStore();
  const availableTools = toolService.getTools();
  const availableRoles = roleService.getRoles();
  const [agents, setAgents] = useState<Agent[]>(getAgentsFromTopology());
  const [agentStats, setAgentStats] = useState<Record<string, { calls: number; tokens: number; latency: number }>>({});

  const applyRoleToAgent = (agentId: string, roleId: string) => {
    const role = roleService.getRole(roleId);
    if (role) {
      updateAgentInTopology(agentId, {
        roleId: role.id,
        roleName: role.name,
        prompt: role.systemPrompt,
        tools: role.capabilities,
        temperature: role.baseTemperature
      });
    }
  };

  const updateAgentInTopology = (agentId: string, updates: any) => {
    const topology = orchestrator.getActiveTopology();
    if (topology) {
      const node = topology.nodes.find(n => n.id === agentId);
      if (node) {
        node.config = { ...node.config, ...updates };
        if (updates.label) node.label = updates.label;
        orchestrator.mount({ ...topology });
        setAgents(getAgentsFromTopology());
      }
    }
  };

  React.useEffect(() => {
    const unsub = eventBus.on('system:topology:mounted', () => {
      setAgents(getAgentsFromTopology());
    });
    const unsubStats = eventBus.on('cognitive:step:completed', (data: any) => {
      if (!data?.nodeId) return;
      setAgentStats(prev => {
        const cur = prev[data.nodeId] || { calls: 0, tokens: 0, latency: 0 };
        const tokens = data.output ? Math.ceil(data.output.length / 4) : 0;
        return {
          ...prev,
          [data.nodeId]: {
            calls: cur.calls + 1,
            tokens: cur.tokens + tokens,
            latency: data.duration ? Math.round((cur.latency * cur.calls + data.duration) / (cur.calls + 1)) : cur.latency,
          },
        };
      });
    });
    return () => { unsub(); unsubStats(); };
  }, []);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleStatus = (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;
    const next = agent.status === 'active' ? 'paused' : 'active';
    orchestrator.setNodeDisabled(id, next === 'paused');
    setAgents(prev => prev.map(a => 
      a.id === id ? { ...a, status: next } : a
    ));
  };

  return (
    <div style={{ color: 'var(--text-main)' }}>
      {/* Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search agents by name or role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.65rem 0.65rem 2.5rem', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, color: 'white', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-panel)', borderRadius: 8, padding: '0.2rem', border: '1px solid var(--border)' }}>
            <button onClick={() => setViewMode('grid')} style={{ padding: '0.4rem', borderRadius: 6, border: 'none', background: viewMode === 'grid' ? 'rgba(59,130,246,0.1)' : 'transparent', color: viewMode === 'grid' ? '#3b82f6' : 'var(--text-muted)', cursor: 'pointer' }}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} style={{ padding: '0.4rem', borderRadius: 6, border: 'none', background: viewMode === 'list' ? 'rgba(59,130,246,0.1)' : 'transparent', color: viewMode === 'list' ? '#3b82f6' : 'var(--text-muted)', cursor: 'pointer' }}>
              <List size={16} />
            </button>
          </div>
        </div>
        <button className="btn-primary" style={{ padding: '0.65rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Deploy New Agent
        </button>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ 
          display: viewMode === 'grid' ? 'grid' : 'flex',
          flexDirection: 'column',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.25rem' 
        }}
      >
        {filteredAgents.map(agent => (
          <motion.div 
            key={agent.id}
            variants={itemVariants}
            className="glass-panel"
            style={{ 
              padding: '1.5rem', 
              position: 'relative',
              borderLeft: `4px solid ${agent.status === 'active' ? '#10b981' : agent.status === 'paused' ? '#f59e0b' : '#ef4444'}`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer'
            }}
            whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.3)' }}
            onClick={() => setSelectedAgentId(agent.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                  <Bot size={24} color={agent.status === 'active' ? '#3b82f6' : 'var(--text-muted)'} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{agent.name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{agent.role}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleStatus(agent.id); }}
                  style={{ background: 'none', border: 'none', color: agent.status === 'active' ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                >
                  {agent.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.2rem', height: '3em', overflow: 'hidden' }}>
              {agent.description}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
              {agent.tools.slice(0, 2).map(tool => (
                <span key={tool} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Wrench size={10} /> {tool}
                </span>
              ))}
              {agent.tools.length > 2 && <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>+{agent.tools.length - 2} more</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Invocations</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{(agentStats[agent.id]?.calls || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Latency</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: (agentStats[agent.id]?.latency || 0) < 500 ? '#10b981' : '#f59e0b' }}>{agentStats[agent.id]?.latency || 0}ms</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>MODEL</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{agent.model.split(':').pop() || agent.model.split('/').pop()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Agent Detail Modal (The "Control Surface") */}
      <AnimatePresence>
        {selectedAgent && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAgentId(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              style={{ position: 'relative', width: '100%', maxWidth: 900, height: '80vh', background: 'var(--bg-main)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <Bot size={32} color="#3b82f6" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{selectedAgent.name}</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>{selectedAgent.role} · <span style={{ color: selectedAgent.status === 'active' ? '#10b981' : '#f59e0b' }}>{selectedAgent.status.toUpperCase()}</span></p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => toggleStatus(selectedAgent.id)} className="btn-secondary" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {selectedAgent.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
                    {selectedAgent.status === 'active' ? 'Pause Agent' : 'Resume Agent'}
                  </button>
                  <button onClick={() => setSelectedAgentId(null)} className="btn-secondary" style={{ padding: '0.6rem' }}><X size={20} /></button>
                </div>
              </div>

              {/* Tabs / Content */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '250px 1fr', overflow: 'hidden' }}>
                {/* Sidebar Menu */}
                <div style={{ borderRight: '1px solid var(--border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.1)' }}>
                  {[
                    { id: 'config', label: 'Configuration', icon: <Settings size={18} /> },
                    { id: 'capabilities', label: 'Capabilities', icon: <Zap size={18} /> },
                    { id: 'infra', label: 'Infrastructure', icon: <Cpu size={18} /> },
                    { id: 'observability', label: 'Observability', icon: <Activity size={18} /> },
                    { id: 'permissions', label: 'Permissions', icon: <Shield size={18} /> }
                  ].map(tab => (
                    <button key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', background: tab.id === 'config' ? 'rgba(59,130,246,0.1)' : 'transparent', color: tab.id === 'config' ? '#3b82f6' : 'var(--text-muted)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.2s', textAlign: 'left' }}>
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div style={{ padding: '2rem', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Role Blueprint Selection */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Role Blueprint (Identity)</label>
                      <select 
                        value={selectedAgent.roleId || ''}
                        onChange={(e) => applyRoleToAgent(selectedAgent.id, e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(59,130,246,0.1)', border: '1px solid #3b82f6', borderRadius: 10, color: 'white', outline: 'none' }}
                      >
                        <option value="">Custom (No Blueprint)</option>
                        {availableRoles.map(role => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Model Selection */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>AI Core Model</label>
                      <select 
                        value={selectedAgent.model}
                        onChange={(e) => updateAgentInTopology(selectedAgent.id, { model: e.target.value })}
                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 10, color: 'white', outline: 'none' }}
                      >
                        <option value="auto">Auto (Router Choice)</option>
                        {keys.filter(k => k.status === 'active').flatMap(k => (k.availableModels || []).map(m => (
                          <option key={`${k.provider}-${m}`} value={`${k.provider}:${m}`}>{k.provider}: {m}</option>
                        )))}
                      </select>
                    </div>

                    {/* System Prompt */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>System Prompt (Cognitive Core)</label>
                      <textarea 
                        rows={6}
                        value={selectedAgent.systemPrompt}
                        onChange={(e) => updateAgentInTopology(selectedAgent.id, { prompt: e.target.value })}
                        style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 10, color: 'white', outline: 'none', resize: 'none', fontSize: '0.9rem', lineHeight: 1.6 }}
                      />
                    </div>

                    {/* Tools Selection */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>Equipped Capabilities (Tools)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {availableTools.map(tool => {
                          const isEquipped = selectedAgent.tools.includes(tool.id);
                          return (
                            <div 
                              key={tool.id}
                              onClick={() => {
                                const newTools = isEquipped 
                                  ? selectedAgent.tools.filter(id => id !== tool.id)
                                  : [...selectedAgent.tools, tool.id];
                                updateAgentInTopology(selectedAgent.id, { tools: newTools });
                              }}
                              style={{ 
                                padding: '1rem', borderRadius: 12, background: isEquipped ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)', 
                                border: `1px solid ${isEquipped ? '#3b82f6' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem' 
                              }}
                            >
                              <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                {isEquipped ? <CheckCircle2 size={18} color="#3b82f6" /> : <Wrench size={18} color="var(--text-muted)" />}
                              </div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{tool.name}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--bg-panel)' }}>
                <button onClick={() => setSelectedAgentId(null)} className="btn-secondary" style={{ padding: '0.65rem 1.5rem' }}>Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default AgentsPanel;
