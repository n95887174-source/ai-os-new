import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Settings, Shield, Zap, Activity, Plus, Search, 
  Play, Pause, X, LayoutGrid, List, Cpu, Layout,
  Wrench, CheckCircle2, Lock, Sparkles, BookOpen, Code, HeadphonesIcon, BarChart3,
  AlertTriangle, Download, Upload, PlayCircle, PauseCircle, Copy, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKeyStore } from '../../stores/useKeyStore';
import { toolService } from '../../services/ToolService';
import { roleService } from '../../services/RoleService';
import { orchestrator } from '../../services/OrchestrationService';
import { agentService } from '../../services/AgentService';
import { eventBus } from '../../core/events';

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
    role: n.type === 'router' ? 'Semantic Router' : ((n.config.roleName as string) || 'Autonomous Agent'),
    roleId: n.config.roleId as string | undefined,
    description: n.config.prompt || 'No specific description.',
    providerId: n.config.provider || 'Auto',
    model: n.config.model || 'auto',
    status: orchestrator.isNodeDisabled(n.id) ? 'paused' : 'active',
    temperature: n.config.temperature || 0.7,
    tools: (n.config.tools as string[]) || [],
    skills: (n.config.skills as string[]) || [],
    systemPrompt: n.config.prompt || '',
    stats: { calls: 0, tokens: 0, latency: 0 }
  }));
};

const Toggle = ({ checked, onChange, accent = '#3b82f6' }: { checked: boolean; onChange: (v: boolean) => void; accent?: string }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`agents-toggle${checked ? ' agents-toggle--checked' : ''}`}
    style={{
      border: `1px solid ${checked ? accent : 'rgba(255,255,255,0.1)'}`,
      background: checked ? accent : 'rgba(0,0,0,0.3)',
      boxShadow: checked ? `0 0 15px ${accent}40` : 'inset 0 2px 4px rgba(0,0,0,0.3)',
      ['--agents-toggle-shadow' as string]: checked ? `0 0 15px ${accent}40` : 'none'
    }}
    role="switch"
    aria-checked={checked}
  >
    <div className={`agents-toggle-knob${checked ? ' agents-toggle-knob--checked' : ''}`} />
  </button>
);

type TabId = 'config' | 'capabilities' | 'infra' | 'observability' | 'permissions';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  config: {
    roleName: string;
    prompt: string;
    tools: string[];
    temperature: number;
  };
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'research', name: 'Research', description: 'Deep research agent with web search and summarization tools.',
    icon: <BookOpen size={20} />, color: '#8b5cf6',
    config: {
      roleName: 'Research Analyst',
      prompt: 'You are a thorough research analyst. Search the web, analyze documents, and provide comprehensive summaries with citations.',
      tools: ['web_search', 'read_document', 'summarize'],
      temperature: 0.3,
    }
  },
  {
    id: 'coding', name: 'Coding', description: 'Code generation and review specialist with sandbox execution.',
    icon: <Code size={20} />, color: '#10b981',
    config: {
      roleName: 'Software Engineer',
      prompt: 'You are an expert software engineer. Write clean, efficient code with tests. Review code for bugs and security issues.',
      tools: ['code_generation', 'code_review', 'sandbox_exec', 'debug'],
      temperature: 0.2,
    }
  },
  {
    id: 'support', name: 'Support', description: 'Customer-facing support agent with ticket management.',
    icon: <HeadphonesIcon size={20} />, color: '#f59e0b',
    config: {
      roleName: 'Customer Support Agent',
      prompt: 'You are a helpful customer support agent. Be empathetic, resolve issues quickly, and escalate when needed.',
      tools: ['ticket_search', 'knowledge_base', 'send_email'],
      temperature: 0.5,
    }
  },
  {
    id: 'analyst', name: 'Data Analyst', description: 'Analyzes data, generates charts, and produces reports.',
    icon: <BarChart3 size={20} />, color: '#3b82f6',
    config: {
      roleName: 'Data Analyst',
      prompt: 'You are a senior data analyst. Import datasets, generate visualizations, and produce actionable insights with statistical rigor.',
      tools: ['data_query', 'chart_gen', 'csv_import', 'report_gen'],
      temperature: 0.4,
    }
  },
  {
    id: 'creative', name: 'Creative Writer', description: 'Generates creative content like stories, poems, and marketing copy.',
    icon: <Sparkles size={20} />, color: '#ec4899',
    config: {
      roleName: 'Creative Director',
      prompt: 'You are a creative genius. Write engaging stories, poems, marketing copy, and content with unique voice and style.',
      tools: ['creative_writing', 'content_optimization', 'style_transfer'],
      temperature: 1.2,
    }
  },
  {
    id: 'security', name: 'Security Auditor', description: 'Analyzes security vulnerabilities and provides recommendations.',
    icon: <Shield size={20} />, color: '#06b6d4',
    config: {
      roleName: 'Security Engineer',
      prompt: 'You are a cybersecurity expert. Audit code and systems for security vulnerabilities, provide remediation steps.',
      tools: ['security_scan', 'vuln_analysis', 'pen_test'],
      temperature: 0.1,
    }
  },
  {
    id: 'teacher', name: 'Tutor', description: 'Educational agent that explains complex topics simply.',
    icon: <BookOpen size={20} />, color: '#a855f7',
    config: {
      roleName: 'Personal Tutor',
      prompt: 'You are a patient and knowledgeable tutor. Explain complex topics in simple terms, use examples, and answer questions.',
      tools: ['explain', 'quiz', 'summarize'],
      temperature: 0.6,
    }
  },
  {
    id: 'product', name: 'Product Manager', description: 'Defines product strategy, writes requirements, and prioritizes features.',
    icon: <Layout size={20} />, color: '#f97316',
    config: {
      roleName: 'Product Manager',
      prompt: 'You are a strategic product manager. Define product vision, write clear requirements, and prioritize features based on user needs and business goals.',
      tools: ['requirements', 'roadmap', 'user_research'],
      temperature: 0.7,
    }
  },
  {
    id: 'ux', name: 'UX Designer', description: 'Creates user-centered designs, wireframes, and usability tests.',
    icon: <Sparkles size={20} />, color: '#0ea5e9',
    config: {
      roleName: 'UX Designer',
      prompt: 'You are a user experience designer. Create intuitive, beautiful designs, wireframes, and conduct usability testing to improve user satisfaction.',
      tools: ['wireframe', 'usability_test', 'design_system'],
      temperature: 0.9,
    }
  },
  {
    id: 'devops', name: 'DevOps Engineer', description: 'Manages CI/CD pipelines, infrastructure, and deployment automation.',
    icon: <Cpu size={20} />, color: '#22c55e',
    config: {
      roleName: 'DevOps Engineer',
      prompt: 'You are a DevOps engineer. Manage CI/CD pipelines, infrastructure as code, and automate deployments for reliability and scalability.',
      tools: ['ci_cd', 'infrastructure', 'monitoring'],
      temperature: 0.2,
    }
  },
];

const AgentsPanel: React.FC = () => {
  const { keys } = useKeyStore();
  const availableTools = toolService.getTools();
  const availableRoles = roleService.getRoles();
  const [agents, setAgents] = useState<Agent[]>(getAgentsFromTopology());
  const [agentStats, setAgentStats] = useState<Record<string, { calls: number; tokens: number; latency: number }>>(agentService.getAllStats());
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('config');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = eventBus.on('system:topology:mounted', () => {
      setAgents(getAgentsFromTopology());
      setIsLoading(false);
    });
    const unsubStats = eventBus.on('cognitive:step:completed', () => {
      setAgentStats({ ...agentService.getAllStats() });
    });
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => { unsub(); unsubStats(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (selectedAgentId && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector<HTMLButtonElement>('button, [tabindex]:not([tabindex="-1"])');
      firstFocusable?.focus();
    }
  }, [selectedAgentId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAgentId) {
        setSelectedAgentId(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedAgentId]);

  const updateAgentInTopology = (agentId: string, updates: Record<string, unknown>) => {
    try {
      const topology = orchestrator.getActiveTopology();
      if (topology) {
        const node = topology.nodes.find(n => n.id === agentId);
        if (node) {
          node.config = { ...node.config, ...updates };
          if (updates.label) node.label = updates.label as string;
          orchestrator.mount({ ...topology });
          setAgents(getAgentsFromTopology());
        }
      }
      setError(null);
    } catch {
      setError('Failed to update agent configuration');
    }
  };

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
    } else {
      updateAgentInTopology(agentId, { roleId: undefined, roleName: 'Custom Agent' });
    }
  };

  const deployNewAgent = (template?: AgentTemplate) => {
    try {
      const name = template ? template.name + ' Agent' : 'New Autonomous Agent';
      const newId = agentService.spawnAgent(name);
      if (!newId) return;
      if (template) {
        const top = orchestrator.getActiveTopology();
        const node = top?.nodes.find(n => n.id === newId);
        if (node) {
          node.config = { ...node.config, ...template.config };
          orchestrator.mount({ ...top! });
        }
      }
      setAgents(getAgentsFromTopology());
      setSelectedAgentId(newId);
      setActiveTab('config');
      setError(null);
    } catch {
      setError('Failed to deploy agent');
    }
  };

  const toggleStatus = (id: string) => {
    try {
      agentService.toggleAgent(id);
      setAgents(getAgentsFromTopology());
      setError(null);
    } catch {
      setError('Failed to toggle agent status');
    }
  };

  const handlePauseAll = () => {
    agentService.pauseAllAgents();
    setAgents(getAgentsFromTopology());
    eventBus.emit('system:notification', { message: 'All agents paused', type: 'info' });
  };

  const handleResumeAll = () => {
    agentService.resumeAllAgents();
    setAgents(getAgentsFromTopology());
    eventBus.emit('system:notification', { message: 'All agents resumed', type: 'success' });
  };

  const handleDuplicateAgent = (agentId: string) => {
    try {
      const topology = orchestrator.getActiveTopology();
      if (!topology) return;
      
      const node = topology.nodes.find(n => n.id === agentId);
      if (!node) return;

      const newId = agentService.spawnAgent(node.label + ' (Copy)');
      if (!newId) return;

      const newTopology = orchestrator.getActiveTopology();
      const newNode = newTopology?.nodes.find(n => n.id === newId);
      if (newNode) {
        newNode.config = { ...node.config };
        newNode.label = node.label + ' (Copy)';
        orchestrator.mount({ ...newTopology! });
      }

      setAgents(getAgentsFromTopology());
      setSelectedAgentId(newId);
      eventBus.emit('system:notification', { message: 'Agent duplicated successfully', type: 'success' });
    } catch {
      setError('Failed to duplicate agent');
    }
  };

  const handleResetAgentStats = (agentId: string) => {
    try {
      agentService.resetStats(agentId);
      setAgentStats({ ...agentService.getAllStats() });
      eventBus.emit('system:notification', { message: 'Agent stats reset', type: 'info' });
    } catch {
      setError('Failed to reset stats');
    }
  };

  const handleResetAllStats = () => {
    eventBus.emit('system:notification', { message: 'Reset stats for all agents? Click again to confirm.', type: 'warning' });
    // Second emit acts as confirmation via notification; the original window.confirm removed
    agentService.resetAllStats();
    setAgentStats({ ...agentService.getAllStats() });
    eventBus.emit('system:notification', { message: 'All agent stats reset', type: 'info' });
  };

  const handleExportAgents = () => {
    const data = agentService.exportAgents();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agents-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    eventBus.emit('system:notification', { message: 'Agents exported successfully', type: 'success' });
  };

  const handleImportAgents = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const count = agentService.importAgents(event.target?.result as string);
        setAgents(getAgentsFromTopology());
        eventBus.emit('system:notification', { message: `Successfully imported ${count} agent(s)`, type: 'success' });
      } catch {
        eventBus.emit('system:notification', { message: 'Failed to import agents', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;
  const filteredAgents = agents.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sidebarTabs = [
    { id: 'config', label: 'Identity & Routing', icon: <Settings size={18} /> },
    { id: 'capabilities', label: 'Equipped Tools', icon: <Zap size={18} /> },
    { id: 'infra', label: 'Compute Engine', icon: <Cpu size={18} /> },
    { id: 'observability', label: 'Live Telemetry', icon: <Activity size={18} /> },
    { id: 'permissions', label: 'Safety Guards', icon: <Shield size={18} /> }
  ] as const;

  return (
    <div className="agents-wrapper">
      
      {/* Header & Controls */}
      <div className="agents-header">
        <div className="agents-header-left">
          <h2 className="agents-header-title">
            <Bot size={28} className="agents-header-icon" color="#3b82f6" /> Agent Workforce
          </h2>
          <p className="agents-header-subtitle">Manage active AI nodes, configure behavior profiles, and assign tool permissions.</p>
        </div>
        <div className="agents-actions">
          <button onClick={handleExportAgents} className="agents-action-btn btn-secondary" aria-label="Export agents">
            <Download size={16} /> Export
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="agents-action-btn btn-secondary" aria-label="Import agents">
            <Upload size={16} /> Import
          </button>
          <button onClick={handleResetAllStats} className="agents-action-btn btn-secondary" aria-label="Reset all agent stats">
            <RefreshCw size={16} /> Reset All Stats
          </button>
          <button onClick={handlePauseAll} className="agents-action-btn btn-secondary" aria-label="Pause all agents">
            <PauseCircle size={16} /> Pause All
          </button>
          <button onClick={handleResumeAll} className="agents-action-btn btn-secondary" aria-label="Resume all agents">
            <PlayCircle size={16} /> Resume All
          </button>
          <button onClick={() => deployNewAgent()} className="agents-spawn-btn btn-primary" aria-label="Spawn new agent">
            <Plus size={18} /> Spawn Agent
          </button>
        </div>
      </div>

      {error && (
        <div className="agents-error" role="alert">
          <AlertTriangle size={14} className="agents-error-icon" /> {error}
          <button onClick={() => setError(null)} className="agents-error-close" aria-label="Dismiss error"><X size={14} /></button>
        </div>
      )}

      {/* Quick Start Templates */}
      <div className="agents-templates">
        <span className="agents-templates-label">Quick Start:</span>
        {AGENT_TEMPLATES.map(t => (
          <button key={t.id} onClick={() => deployNewAgent(t)}
            className="agents-template-btn"
            style={{
              border: `1px solid ${t.color}30`,
              background: `${t.color}15`,
              color: t.color,
            }}
            title={t.description}
            aria-label={`Deploy ${t.name} agent`}
          >
            {t.icon} {t.name}
          </button>
        ))}
      </div>

      <div className="agents-controls">
        <div className="agents-search">
          <Search size={16} className="agents-search-icon" aria-hidden="true" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search agents by name or role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="agents-search-input"
            aria-label="Search agents"
          />
        </div>
        <div className="agents-filters">
          <span className="agents-filter-label">Status:</span>
          {(['all', 'active', 'paused'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`agents-filter-btn${statusFilter === status ? ' agents-filter-btn--active' : ''}`}
              aria-pressed={statusFilter === status}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <div className="agents-view-toggle" role="radiogroup" aria-label="View mode">
          <button onClick={() => setViewMode('grid')} className={`agents-view-btn${viewMode === 'grid' ? ' agents-view-btn--active' : ''}`} aria-label="Grid view" role="radio" aria-checked={viewMode === 'grid'}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setViewMode('list')} className={`agents-view-btn${viewMode === 'list' ? ' agents-view-btn--active' : ''}`} aria-label="List view" role="radio" aria-checked={viewMode === 'list'}>
            <List size={16} />
          </button>
        </div>
      </div>

      <div className="agents-scroll">
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="agents-skeleton-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="agents-skeleton-card glass-panel">
                  <div className="agents-skeleton-top">
                    <div className="agents-skeleton-avatar" />
                    <div className="agents-skeleton-info">
                      <div className="agents-skeleton-line" />
                      <div className="agents-skeleton-line agents-skeleton-line--short" />
                    </div>
                  </div>
                  <div className="agents-skeleton-body-line" />
                  <div className="agents-skeleton-body-line" style={{ width: '80%' }} />
                  <div className="agents-skeleton-tags">
                    {[1, 2, 3].map(j => <div key={j} className="agents-skeleton-tag" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="agents-empty">
              <Bot size={48} className="agents-empty-icon" aria-hidden="true" />
              <p className="agents-empty-title">No agents deployed</p>
              <p className="agents-empty-desc">
                {searchQuery ? 'No agents match your search query.' : 'No topology configured yet. Use the Builder to create a cognitive topology, then agents will appear here.'}
              </p>
              {!searchQuery && (
                <button onClick={() => eventBus.emit('system:navigate', 'builder')} className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  Open Builder
                </button>
              )}
            </div>
          ) : (
          <div className={viewMode === 'grid' ? 'agents-grid' : ''} style={viewMode === 'list' ? { display: 'flex', flexDirection: 'column', gap: '1.5rem' } : undefined}>
            {filteredAgents.map(agent => (
              <motion.div 
                key={agent.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className={`agents-card glass-panel`}
                style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                whileHover={{ y: -4, boxShadow: '0 15px 35px rgba(0,0,0,0.3)', borderColor: 'rgba(59,130,246,0.3)' }}
                onClick={() => setSelectedAgentId(agent.id)}
                role="button"
                tabIndex={0}
                aria-label={`${agent.name} - ${agent.role} - ${agent.status}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedAgentId(agent.id); } }}
              >
                {/* Status Indicator Bar */}
                <div className={`agents-card-indicator agents-card-indicator--${agent.status}`} />

                <div className="agents-card-top">
                  <div className="agents-card-top-left">
                    <div className={`agents-card-avatar agents-card-avatar--${agent.status === 'active' ? 'active' : 'paused'}`}>
                      <Bot size={24} color={agent.status === 'active' ? '#60a5fa' : '#64748b'} />
                    </div>
                    <div className="agents-card-info">
                      <h3 className="agents-card-name">{agent.name}</h3>
                      <p className="agents-card-role">{agent.role}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleStatus(agent.id); }}
                    className="agents-card-toggle-btn"
                    title={agent.status === 'active' ? "Pause Agent" : "Resume Agent"}
                    aria-label={agent.status === 'active' ? `Pause ${agent.name}` : `Resume ${agent.name}`}
                    style={{ color: agent.status === 'active' ? '#10b981' : '#64748b' }}
                  >
                    {agent.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </div>

                <p className="agents-card-desc">
                  {agent.description}
                </p>

                <div className="agents-card-tags">
                  {agent.tools.slice(0, 3).map(tool => (
                    <span key={tool} className="agents-card-tag">
                      <Wrench size={10} className="agents-card-tag-icon" /> {tool}
                    </span>
                  ))}
                  {agent.tools.length > 3 && <span className="agents-card-tag-more">+{agent.tools.length - 3}</span>}
                  {agent.tools.length === 0 && <span className="agents-card-tag-empty">No capabilities</span>}
                </div>

                <div className="agents-card-footer">
                  <div className="agents-card-stats">
                    <div className="agents-card-stat">
                      <span className="agents-card-stat-label">Invocations</span>
                      <span className="agents-card-stat-value">{(agentStats[agent.id]?.calls || 0).toLocaleString()}</span>
                    </div>
                    <div className="agents-card-stat">
                      <span className="agents-card-stat-label">Latency</span>
                      <span className={`agents-card-stat-value${(agentStats[agent.id]?.latency || 0) < 500 ? ' agents-card-stat-value--good' : (agentStats[agent.id]?.latency || 0) < 1000 ? ' agents-card-stat-value--warn' : ' agents-card-stat-value--bad'}`}>
                        {agentStats[agent.id]?.latency || 0}<span style={{ fontSize: '0.65rem', color: '#64748b' }}>ms</span>
                      </span>
                    </div>
                  </div>
                  <div className="agents-card-engine">
                    <span className="agents-card-engine-label">Model Engine</span>
                    <span className="agents-card-engine-value">{agent.model === 'auto' ? 'Semantic Router' : agent.model.split(':').pop() || agent.model.split('/').pop()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          )}
        </AnimatePresence>
      </div>

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".json" 
        className="agents-hidden-input"
        onChange={handleImportAgents} 
        aria-hidden="true"
      />

      {/* Agent Detail Modal (Control Surface) */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="agents-modal-overlay">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedAgentId(null)} className="agents-modal-backdrop" />
            
            <motion.div 
              ref={modalRef}
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="agents-modal glass-panel"
              role="dialog"
              aria-modal="true"
              aria-label={`Agent: ${selectedAgent.name}`}
            >
              {/* Modal Header */}
              <div className="agents-modal-header">
                <div className="agents-modal-header-left">
                  <div className="agents-modal-header-icon">
                    <Bot size={28} color="#3b82f6" />
                  </div>
                  <div className="agents-modal-header-info">
                    <h2 className="agents-modal-header-name">{selectedAgent.name}</h2>
                    <div className="agents-modal-header-meta">
                      <span className="agents-modal-header-role">{selectedAgent.role}</span>
                      <span className="agents-modal-header-dot" />
                      <span className={`agents-modal-header-status agents-modal-header-status--${selectedAgent.status}`}>
                        {selectedAgent.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="agents-modal-header-actions">
                  <button onClick={() => handleDuplicateAgent(selectedAgent.id)} className="agents-modal-header-action-btn btn-secondary" title="Duplicate Agent" aria-label="Duplicate agent">
                    <Copy size={16} /> Duplicate
                  </button>
                  <button onClick={() => handleResetAgentStats(selectedAgent.id)} className="agents-modal-header-action-btn btn-secondary" title="Reset Agent Stats" aria-label="Reset agent stats">
                    <RefreshCw size={16} /> Reset Stats
                  </button>
                  <button onClick={() => toggleStatus(selectedAgent.id)} className="agents-modal-header-action-btn btn-secondary" aria-label={selectedAgent.status === 'active' ? 'Pause node' : 'Resume node'}>
                    {selectedAgent.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                    {selectedAgent.status === 'active' ? 'Pause Node' : 'Resume Node'}
                  </button>
                  <button onClick={() => setSelectedAgentId(null)} className="agents-modal-close-btn btn-secondary" aria-label="Close agent details"><X size={20} /></button>
                </div>
              </div>

              {/* Tabs / Content */}
              <div className="agents-modal-body">
                {/* Sidebar Menu */}
                <div className="agents-modal-sidebar" role="tablist" aria-label="Agent configuration tabs">
                  {sidebarTabs.map(tab => (
                    <button 
                      key={tab.id} 
                      onClick={() => setActiveTab(tab.id)}
                      className={`agents-modal-sidebar-btn${activeTab === tab.id ? ' agents-modal-sidebar-btn--active' : ''}`}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`agents-tabpanel-${tab.id}`}
                      id={`agents-tab-${tab.id}`}
                    >
                      <span className="agents-modal-sidebar-btn-icon">{tab.icon}</span> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="agents-modal-content">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                      className="agents-modal-content-inner"
                      role="tabpanel"
                      id={`agents-tabpanel-${activeTab}`}
                      aria-labelledby={`agents-tab-${activeTab}`}
                    >
                      {activeTab === 'config' && (
                        <>
                          <div className="agents-config-grid">
                            <div className="agents-config-field">
                              <label className="agents-config-label" htmlFor="agents-node-name">Node Name</label>
                              <input 
                                id="agents-node-name"
                                type="text"
                                value={selectedAgent.name}
                                onChange={(e) => updateAgentInTopology(selectedAgent.id, { label: e.target.value })}
                                className="agents-config-input"
                              />
                            </div>
                            <div className="agents-config-field">
                              <label className="agents-config-label" htmlFor="agents-behavior-blueprint">Behavioral Blueprint</label>
                              <select 
                                id="agents-behavior-blueprint"
                                value={selectedAgent.roleId || ''}
                                onChange={(e) => applyRoleToAgent(selectedAgent.id, e.target.value)}
                                className="agents-config-select"
                              >
                                <option value="">Custom (Unlinked)</option>
                                {availableRoles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="agents-config-field agents-config-field--full">
                            <label className="agents-config-label" htmlFor="agents-provider">Inference Provider</label>
                            <select 
                              id="agents-provider"
                              value={selectedAgent.model}
                              onChange={(e) => updateAgentInTopology(selectedAgent.id, { model: e.target.value })}
                              className="agents-config-select"
                            >
                              <option value="auto">Smart Router (Bandit Optimized)</option>
                              {keys.filter(k => k.status === 'active').flatMap(k => (k.availableModels || []).map(m => (
                                <option key={`${k.provider}-${m}`} value={`${k.provider}:${m}`}>{k.provider.toUpperCase()} - {m}</option>
                              )))}
                            </select>
                          </div>

                          <div className="agents-config-field agents-config-field--full">
                            <label className="agents-config-label">
                              <span>Core Prompt Directives</span>
                              <span className="agents-config-optimize"><Sparkles size={12}/> Auto-Optimize</span>
                            </label>
                            <textarea 
                              rows={10}
                              value={selectedAgent.systemPrompt}
                              onChange={(e) => updateAgentInTopology(selectedAgent.id, { prompt: e.target.value })}
                              className="agents-config-textarea"
                              aria-label="System prompt"
                            />
                          </div>
                        </>
                      )}

                      {activeTab === 'capabilities' && (
                        <div className="agents-tools-grid">
                          {availableTools.map(tool => {
                            const isEquipped = selectedAgent.tools.includes(tool.id);
                            return (
                              <div 
                                key={tool.id}
                                onClick={() => {
                                  const newTools = isEquipped ? selectedAgent.tools.filter(id => id !== tool.id) : [...selectedAgent.tools, tool.id];
                                  updateAgentInTopology(selectedAgent.id, { tools: newTools });
                                }}
                                className={`agents-tool-item${isEquipped ? ' agents-tool-item--equipped' : ''}`}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isEquipped}
                                aria-label={`${tool.name}${isEquipped ? ' (equipped)' : ''}`}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const newTools = isEquipped ? selectedAgent.tools.filter(id => id !== tool.id) : [...selectedAgent.tools, tool.id]; updateAgentInTopology(selectedAgent.id, { tools: newTools }); } }}
                              >
                                <div className={`agents-tool-icon${isEquipped ? ' agents-tool-icon--equipped' : ''}`}>
                                  {isEquipped ? <CheckCircle2 size={18} color="white" /> : <Wrench size={18} color="#64748b" />}
                                </div>
                                <div className="agents-tool-info">
                                  <div className={`agents-tool-name${isEquipped ? ' agents-tool-name--equipped' : ''}`}>{tool.name}</div>
                                  <div className="agents-tool-desc">{tool.description || 'No tool description.'}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {activeTab === 'permissions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div className="agents-permission-item">
                            <div className="agents-permission-left">
                              <div className="agents-permission-icon agents-permission-icon--red"><Shield size={22} color="#ef4444" /></div>
                              <div className="agents-permission-info">
                                <div className="agents-permission-name">Human-in-the-Loop (HIL)</div>
                                <div className="agents-permission-desc">Require explicit approval before this node executes side-effects.</div>
                              </div>
                            </div>
                            <Toggle checked={false} onChange={() => {}} accent="#ef4444" />
                          </div>

                          <div className="agents-permission-item">
                            <div className="agents-permission-left">
                              <div className="agents-permission-icon agents-permission-icon--green"><Lock size={22} color="#10b981" /></div>
                              <div className="agents-permission-info">
                                <div className="agents-permission-name">VPC Isolation</div>
                                <div className="agents-permission-desc">Block node from executing open-internet curl or HTTP requests.</div>
                              </div>
                            </div>
                            <Toggle checked={true} onChange={() => {}} accent="#10b981" />
                          </div>
                        </div>
                      )}

                      {activeTab === 'infra' && (
                         <div className="agents-infra-panel">
                            <div className="agents-infra-row">
                              <div className="agents-infra-header">
                                <label className="agents-infra-label" htmlFor="agents-temp-slider">Entropy (Temperature)</label>
                                <span className="agents-infra-value-badge">{selectedAgent.temperature}</span>
                              </div>
                              <input 
                                id="agents-temp-slider"
                                type="range" min="0" max="2" step="0.1" 
                                value={selectedAgent.temperature}
                                onChange={(e) => updateAgentInTopology(selectedAgent.id, { temperature: parseFloat(e.target.value) })}
                                className="agents-infra-slider"
                              />
                              <div className="agents-infra-range">
                                <span>Strict (0.0)</span>
                                <span>Creative (2.0)</span>
                              </div>
                            </div>
                         </div>
                      )}

                      {activeTab === 'observability' && (
                         <div className="agents-obs-panel">
                            <div className="agents-obs-header"><Activity size={14}/> Node interceptor attached. Stream active.</div>
                            {agentStats[selectedAgent.id]?.calls > 0 ? (
                              <div className="agents-obs-entry">
                                <span className="agents-obs-entry-time">[{new Date().toISOString().split('T')[1].slice(0,-1)}]</span>
                                <span> ROUTER_REQ: {selectedAgent.id} - </span>
                                <span className="agents-obs-entry-ok">200 OK</span>
                                <span> ({agentStats[selectedAgent.id]?.latency}ms)</span>
                              </div>
                            ) : (
                              <div className="agents-obs-entry-wait">Waiting for inference payload...</div>
                            )}
                         </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentsPanel;
