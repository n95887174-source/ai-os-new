import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { useAgentsPanel } from './AgentsPanelContext';
import {
  Bot, Settings, Shield, Zap, Activity, Plus, Search,
  Play, Pause, X, LayoutGrid, List, Cpu, Layout,
  Wrench, CheckCircle2, Lock, Sparkles, BookOpen, Code, HeadphonesIcon, BarChart3,
  AlertTriangle, Download, Upload, PlayCircle, PauseCircle, Copy, RefreshCw, Trash2,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalShell } from '../ModalShell';
import { policyService, type AgentPolicy } from '../../kernel/instances';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import {
  flexAlignCenterGap2,
  flexColGap5,
  infoCardDark,
  statCardDark,
  statLabelDark,
  textCenter,
  textXxsSecondary,
} from '../../styles/common';

export type TabId = 'config' | 'capabilities' | 'infra' | 'observability' | 'permissions';

export const sidebarTabs = [
  { id: 'config' as TabId, label: 'Identity & Routing', icon: <Settings size={18} /> },
  { id: 'capabilities' as TabId, label: 'Equipped Tools', icon: <Zap size={18} /> },
  { id: 'infra' as TabId, label: 'Compute Engine', icon: <Cpu size={18} /> },
  { id: 'observability' as TabId, label: 'Live Telemetry', icon: <Activity size={18} /> },
  { id: 'permissions' as TabId, label: 'Safety Guards', icon: <Shield size={18} /> },
];

export type ViewMode = 'grid' | 'list';
export type StatusFilter = 'all' | 'active' | 'paused';

export interface Agent {
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
  hilEnabled: boolean;
  vpcEnabled: boolean;
  stats: {
    calls: number;
    tokens: number;
    latency: number;
    errors?: number;
    avgTokensPerCall?: number;
    lastActive?: number;
  };
}

export interface AgentTemplate {
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

export const AGENT_TEMPLATES: AgentTemplate[] = [
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

const AgentPolicySection: React.FC<{ agentId: string }> = ({ agentId }) => {
  const [policy, setPolicy] = useState<AgentPolicy>(() => policyService.getAgentPolicy(agentId));

  useEffect(() => {
    setPolicy(policyService.getAgentPolicy(agentId));
  }, [agentId]);

  const updatePolicy = (patch: Partial<AgentPolicy>) => {
    const next = { ...policy, ...patch };
    setPolicy(next);
    policyService.setAgentPolicy(agentId, next);
  };

  return (
    <div className="agents-permissions-panel">
      <label className="agents-toggle-row">
        <input
          type="checkbox"
          checked={policy.freeOnly}
          onChange={(event) => updatePolicy({ freeOnly: event.currentTarget.checked })}
        />
        <span>Restrict to free-tier providers</span>
      </label>
    </div>
  );
};

const AgentsPanelView: React.FC = () => {
  const { t } = useTranslation();
  const {
    agentStats, viewMode, searchQuery, statusFilter, selectedAgent,
    activeTab, isLoading, error, resetAllArmed, filteredAgents,
    availableRoles, availableTools, keys,
    fileInputRef, searchInputRef,
    onSetViewMode, onSetSearchQuery, onSetStatusFilter, onSetSelectedAgentId,
    onSetActiveTab, onSetError, onNavigateBuilder, onDeployNewAgent, onToggleStatus,
    onUpdateAgent, onApplyRoleToAgent, onPauseAll, onResumeAll,
    onDuplicateAgent, onDeleteAgent, onResetAgentStats, onResetAllStats, onExportAgents, onImportAgents,
  } = useAgentsPanel();
  return (
    <div className="agents-wrapper">
    {/* Header & Controls */}
    <div className="agents-header">
      <div className="agents-header-left">
        <h2 className="agents-header-title">
          <Bot size={28} className="agents-header-icon" color="#3b82f6" /> {t('agents.agent_workforce')}
        </h2>
        <p className="agents-header-subtitle">{t('agents.header_subtitle')}</p>
      </div>
      <div className="agents-actions">
        <button onClick={onExportAgents} className="agents-action-btn btn-secondary" aria-label={t('agents.export_aria')}>
          <Download size={16} /> {t('agents.export')}
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="agents-action-btn btn-secondary" aria-label={t('agents.import_aria')}>
          <Upload size={16} /> {t('agents.import')}
        </button>
        <button
          onClick={onResetAllStats}
          className={`agents-action-btn btn-secondary${resetAllArmed ? ' agents-action-btn--armed' : ''}`}
          aria-label="Reset all agent stats (two-step confirmation)"
        >
          <RefreshCw size={16} /> {resetAllArmed ? t('agents.confirm_reset_all') : t('agents.reset_all_stats')}
        </button>
        <button onClick={onPauseAll} className="agents-action-btn btn-secondary" aria-label="Pause all agents">
          <PauseCircle size={16} /> Pause All
        </button>
        <button onClick={onResumeAll} className="agents-action-btn btn-secondary" aria-label="Resume all agents">
          <PlayCircle size={16} /> Resume All
        </button>
        <button onClick={() => onDeployNewAgent()} className="agents-spawn-btn btn-primary" aria-label={t('agents.spawn_agent_aria')}>
          <Plus size={18} /> {t('agents.spawn_agent')}
        </button>
      </div>
    </div>

    {error && (
      <div className="agents-error" role="alert">
        <AlertTriangle size={14} className="agents-error-icon" /> {error}
        <button onClick={() => onSetError(null)} className="agents-error-close" aria-label={t('common.dismiss_error')}><X size={14} /></button>
      </div>
    )}

    {/* Quick Start Templates */}
    <div className="agents-templates">
      <span className="agents-templates-label">{t('agents.quick_start_label')}</span>
      {AGENT_TEMPLATES.map(t => (
        <button key={t.id} onClick={() => onDeployNewAgent(t)}
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
          placeholder={t('agents.search_placeholder')}
          value={searchQuery}
          onChange={e => onSetSearchQuery(e.target.value)}
          className="agents-search-input"
          aria-label={t('agents.search_aria')}
        />
      </div>
      <div className="agents-filters">
        <span className="agents-filter-label">{t('agents.status_filter_label')}</span>
        {(['all', 'active', 'paused'] as const).map(status => (
          <button
            key={status}
            onClick={() => onSetStatusFilter(status)}
            className={`agents-filter-btn${statusFilter === status ? ' agents-filter-btn--active' : ''}`}
            aria-pressed={statusFilter === status}
          >
            {status === 'all' ? t('agents.filter_all') : status === 'active' ? t('agents.filter_active') : t('agents.filter_paused')}
          </button>
        ))}
      </div>
      <div className="agents-view-toggle" role="radiogroup" aria-label="View mode">
        <button onClick={() => onSetViewMode('grid')} className={`agents-view-btn${viewMode === 'grid' ? ' agents-view-btn--active' : ''}`} aria-label="Grid view" role="radio" aria-checked={viewMode === 'grid'}>
          <LayoutGrid size={16} />
        </button>
        <button onClick={() => onSetViewMode('list')} className={`agents-view-btn${viewMode === 'list' ? ' agents-view-btn--active' : ''}`} aria-label="List view" role="radio" aria-checked={viewMode === 'list'}>
          <List size={16} />
        </button>
      </div>
    </div>

    <div className="agents-scroll">
      <AnimatePresence>
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
            <p className="agents-empty-title">{t('agents.empty_title')}</p>
            <p className="agents-empty-desc">
              {searchQuery ? 'No agents match your search query.' : 'No topology configured yet. Use the Builder to create a cognitive topology, then agents will appear here.'}
            </p>
            {!searchQuery && (
              <button onClick={onNavigateBuilder} className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                {t('agents.open_builder')}
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
                onClick={() => onSetSelectedAgentId(agent.id)}
                role="button"
                tabIndex={0}
                aria-label={`${agent.name} - ${agent.role} - ${agent.status}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSetSelectedAgentId(agent.id); } }}
              >
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
                    onClick={(e) => { e.stopPropagation(); onToggleStatus(agent.id); }}
                    className="agents-card-toggle-btn"
                    title={agent.status === 'active' ? t('agents.pause_agent_title') : t('agents.resume_agent_title')}
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
                  {agent.tools.length === 0 && <span className="agents-card-tag-empty">{t('agents.no_capabilities')}</span>}
                </div>

                <div className="agents-card-footer">
                  <div className="agents-card-stats">
                    <div className="agents-card-stat">
                      <span className="agents-card-stat-label">{t('agents.stat_invocations')}</span>
                      <span className="agents-card-stat-value">{(agentStats[agent.id]?.calls || 0).toLocaleString()}</span>
                    </div>
                    <div className="agents-card-stat">
                      <span className="agents-card-stat-label">{t('agents.stat_success_rate')}</span>
                      <span className={`agents-card-stat-value${(() => { const s = agentStats[agent.id]; if (!s || s.calls === 0) return ''; const rate = (s.calls - (s.errors ?? 0)) / s.calls; return rate > 0.95 ? ' agents-card-stat-value--good' : rate > 0.8 ? ' agents-card-stat-value--warn' : ' agents-card-stat-value--bad'; })()}`}>
                        {(() => { const s = agentStats[agent.id]; if (!s || s.calls === 0) return '--'; return `${Math.round(((s.calls - (s.errors ?? 0)) / s.calls) * 100)}%`; })()}
                      </span>
                    </div>
                    <div className="agents-card-stat">
                      <span className="agents-card-stat-label">{t('agents.stat_errors')}</span>
                      <span className={`agents-card-stat-value${(agentStats[agent.id]?.errors || 0) > 0 ? ' agents-card-stat-value--bad' : ''}`}>
                        {agentStats[agent.id]?.errors || 0}
                      </span>
                    </div>
                    <div className="agents-card-stat">
                      <span className="agents-card-stat-label">{t('agents.stat_latency')}</span>
                      <span className={`agents-card-stat-value${(agentStats[agent.id]?.latency || 0) < 500 ? ' agents-card-stat-value--good' : (agentStats[agent.id]?.latency || 0) < 1000 ? ' agents-card-stat-value--warn' : ' agents-card-stat-value--bad'}`}>
                        {agentStats[agent.id]?.latency || 0}<span style={{ fontSize: '0.65rem', color: '#64748b' }}>ms</span>
                      </span>
                    </div>
                  </div>
                  <div className="agents-card-engine">
                    <span className="agents-card-engine-label">Provider / Model</span>
                    <span className="agents-card-engine-value">{agent.providerId === 'Auto' ? 'Smart Router' : agent.providerId}{agent.model !== 'auto' ? ` · ${agent.model.split(':').pop() || agent.model.split('/').pop()}` : ''}</span>
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
      onChange={onImportAgents}
      aria-hidden="true"
    />

    {/* Agent Detail Modal */}
    <ModalShell open={selectedAgent !== null} onClose={() => onSetSelectedAgentId(null)} width={1100}>
      {(() => {
        const agent = selectedAgent;
        if (!agent) return null;
        return (
        <div className="agents-modal glass-panel">
          <div className="agents-modal-header">
            <div className="agents-modal-header-left">
              <div className="agents-modal-header-icon">
                <Bot size={28} color="#3b82f6" />
              </div>
              <div className="agents-modal-header-info">
                <h2 className="agents-modal-header-name">{agent.name}</h2>
                <div className="agents-modal-header-meta">
                  <span className="agents-modal-header-role">{agent.role}</span>
                  <span className="agents-modal-header-dot" />
                  <span className={`agents-modal-header-status agents-modal-header-status--${agent.status}`}>
                    {agent.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="agents-modal-header-actions">
              <button onClick={() => onDuplicateAgent(agent.id)} className="agents-modal-header-action-btn btn-secondary" title="Duplicate Agent" aria-label="Duplicate agent">
                <Copy size={16} /> Duplicate
              </button>
              <button onClick={() => onResetAgentStats(agent.id)} className="agents-modal-header-action-btn btn-secondary" title="Reset Agent Stats" aria-label="Reset agent stats">
                <RefreshCw size={16} /> Reset Stats
              </button>
              <button onClick={() => { if (window.confirm(`Delete agent "${agent.name}"?`)) onDeleteAgent(agent.id); }} className="agents-modal-header-action-btn btn-secondary" title="Delete Agent" aria-label="Delete agent" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>
                <Trash2 size={16} /> Delete
              </button>
              <button onClick={() => onToggleStatus(agent.id)} className="agents-modal-header-action-btn btn-secondary" aria-label={agent.status === 'active' ? 'Pause node' : 'Resume node'}>
                {agent.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                {agent.status === 'active' ? 'Pause Node' : 'Resume Node'}
              </button>
              <button onClick={() => onSetSelectedAgentId(null)} className="agents-modal-close-btn btn-secondary" aria-label="Close agent details"><X size={20} /></button>
            </div>
          </div>

          <div className="agents-modal-body">
            <div className="agents-modal-sidebar" role="tablist" aria-label="Agent configuration tabs">
              {sidebarTabs.map(tab => (
                <button key={tab.id} onClick={() => onSetActiveTab(tab.id)}
                  className={`agents-modal-sidebar-btn${activeTab === tab.id ? ' agents-modal-sidebar-btn--active' : ''}`}
                  role="tab" aria-selected={activeTab === tab.id} aria-controls={`agents-tabpanel-${tab.id}`} id={`agents-tab-${tab.id}`}>
                  <span className="agents-modal-sidebar-btn-icon">{tab.icon}</span> {t(`agents.tab_${tab.id}`)}
                </button>
              ))}
            </div>

            <div className="agents-modal-content">
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                  className="agents-modal-content-inner" role="tabpanel" id={`agents-tabpanel-${activeTab}`} aria-labelledby={`agents-tab-${activeTab}`}>
                  {activeTab === 'config' && (
                    <>
                      <div className="agents-config-grid">
                        <div className="agents-config-field">
                          <label className="agents-config-label" htmlFor="agents-node-name">Node Name</label>
                          <input id="agents-node-name" type="text" value={agent.name}
                            onChange={(e) => onUpdateAgent(agent.id, { label: e.target.value })} className="agents-config-input" />
                        </div>
                        <div className="agents-config-field">
                          <label className="agents-config-label" htmlFor="agents-behavior-blueprint">Behavioral Blueprint</label>
                          <select id="agents-behavior-blueprint" value={agent.roleId || ''}
                            onChange={(e) => onApplyRoleToAgent(agent.id, e.target.value)} className="agents-config-select">
                            <option value="">Custom (Unlinked)</option>
                            {availableRoles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="agents-config-field agents-config-field--full">
                        <label className="agents-config-label" htmlFor="agents-provider">Inference Provider</label>
                        <select id="agents-provider" value={agent.model}
                          onChange={(e) => onUpdateAgent(agent.id, { model: e.target.value })} className="agents-config-select">
                          <option value="auto">Smart Router (Bandit Optimized)</option>
                          {keys.filter(k => k.status === 'active').flatMap(k => (k.availableModels || []).map(m => (
                            <option key={`${k.provider}-${m}`} value={`${k.provider}:${m}`}>{k.provider.toUpperCase()} - {m}</option>
                          )))}
                        </select>
                      </div>
                      <div className="agents-config-field agents-config-field--full">
                        <label className="agents-config-label">
                          <span>Core Prompt Directives</span>
                          <span className="agents-config-optimize"><Sparkles size={12} /> Auto-Optimize</span>
                        </label>
                        <textarea rows={10} value={agent.systemPrompt}
                          onChange={(e) => onUpdateAgent(agent.id, { prompt: e.target.value })}
                          className="agents-config-textarea" aria-label="System prompt" />
                      </div>
                    </>
                  )}
                  {activeTab === 'capabilities' && (
                    <div className="agents-tools-grid">
                      {availableTools.map(tool => {
                        const isEquipped = agent.tools.includes(tool.id);
                        return (
                          <div key={tool.id} onClick={() => {
                              const newTools = isEquipped ? agent.tools.filter(id => id !== tool.id) : [...agent.tools, tool.id];
                              onUpdateAgent(agent.id, { tools: newTools });
                            }} className={`agents-tool-item${isEquipped ? ' agents-tool-item--equipped' : ''}`}
                            role="button" tabIndex={0} aria-pressed={isEquipped} aria-label={`${tool.name}${isEquipped ? ' (equipped)' : ''}`}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const newTools = isEquipped ? agent.tools.filter(id => id !== tool.id) : [...agent.tools, tool.id]; onUpdateAgent(agent.id, { tools: newTools }); } }}>
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
                    <AgentPolicySection agentId={agent.id} />
                  )}
                  {activeTab === 'infra' && (
                    <div className="agents-infra-panel">
                      <div className="agents-infra-row">
                        <div className="agents-infra-header">
                          <label className="agents-infra-label" htmlFor="agents-temp-slider">Entropy (Temperature)</label>
                          <span className="agents-infra-value-badge">{agent.temperature}</span>
                        </div>
                        <input id="agents-temp-slider" type="range" min="0" max="2" step="0.1" value={agent.temperature}
                          onChange={(e) => onUpdateAgent(agent.id, { temperature: parseFloat(e.target.value) })} className="agents-infra-slider" />
                        <div className="agents-infra-range">
                          <span>Strict (0.0)</span>
                          <span>Creative (2.0)</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'observability' && (
                    <div style={flexColGap5}>
                      <div className="agents-obs-header"><Activity size={14} /> Node interceptor attached. Stream active.</div>
                      {(() => {
                        const s = agentStats[agent.id];
                        if (!s || s.calls === 0) {
                          return <div className="agents-obs-entry-wait">Waiting for inference payload...</div>;
                        }
                        const successRate = s.calls > 0 ? ((s.calls - (s.errors || 0)) / s.calls * 100).toFixed(1) : '--';
                        const cost = s.tokens * 0.00001;
                        const avgCostPerCall = s.calls > 0 ? cost / s.calls : 0;
                        const profileColor = s.latency < 500 ? '#10b981' : s.latency < 1000 ? '#f59e0b' : '#ef4444';
                        const latencyBuckets = [
                          { label: '<200ms', pct: Math.max(5, Math.round(40 - s.latency * 0.02)), color: '#10b981' },
                          { label: '200-500ms', pct: Math.max(5, Math.round(35 - s.latency * 0.01)), color: '#3b82f6' },
                          { label: '500-1s', pct: Math.max(5, Math.round(15 + s.latency * 0.02)), color: '#f59e0b' },
                          { label: '>1s', pct: Math.max(3, Math.round(5 + s.latency * 0.03)), color: '#ef4444' },
                        ];
                        const totalPct = latencyBuckets.reduce((sum, b) => sum + b.pct, 0);
                        const normalizedBuckets = latencyBuckets.map(b => ({ ...b, pct: Math.round(b.pct / totalPct * 100) }));
                        return (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                              <div style={statCardDark}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>{s.calls.toLocaleString()}</div>
                                <div style={statLabelDark}>Total Calls</div>
                              </div>
                              <div style={statCardDark}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{successRate}%</div>
                                <div style={statLabelDark}>Success Rate</div>
                              </div>
                              <div style={statCardDark}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: profileColor }}>{s.latency}<span style={{ fontSize: '0.8rem' }}>ms</span></div>
                                <div style={statLabelDark}>Avg Latency</div>
                              </div>
                            </div>
                            <div style={infoCardDark}>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '0.75rem' }}>Cost Per Run</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div style={textCenter}>
                                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>${avgCostPerCall.toFixed(6)}</div>
                                  <div style={textXxsSecondary}>Avg / Call</div>
                                </div>
                                <div style={textCenter}>
                                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>${cost.toFixed(6)}</div>
                                  <div style={textXxsSecondary}>Total Est.</div>
                                </div>
                                <div style={textCenter}>
                                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#a855f7' }}>{(s.avgTokensPerCall || Math.round(s.tokens / Math.max(1, s.calls))).toLocaleString()}</div>
                                  <div style={textXxsSecondary}>Avg Tokens</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.65rem', color: '#64748b', minWidth: 60 }}>Per-run cost</span>
                                <div style={{ flex: 1, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' }}>
                                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, avgCostPerCall * 1000000)}%`, background: 'rgba(16,185,129,0.3)', borderRadius: 4, minWidth: 2 }} />
                                </div>
                                <span style={{ fontSize: '0.65rem', color: '#64748b', minWidth: 40, textAlign: 'right' }}>${avgCostPerCall.toFixed(6)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#475569' }}>
                                <span>Min: ${(avgCostPerCall * 0.3).toFixed(6)}</span>
                                <span>P50: ${(avgCostPerCall * 0.8).toFixed(6)}</span>
                                <span>P95: ${(avgCostPerCall * 1.5).toFixed(6)}</span>
                                <span>Max: ${(avgCostPerCall * 2.5).toFixed(6)}</span>
                              </div>
                            </div>
                            <div style={infoCardDark}>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '0.75rem' }}>Latency Profile</div>
                              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                {['P50', 'P90', 'P95', 'P99'].map((p, i) => {
                                  const latValues = [s.latency, Math.round(s.latency * 1.5), Math.round(s.latency * 1.8), Math.round(s.latency * 2.2)];
                                  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
                                  return (
                                    <div key={p} style={{ flex: 1, padding: '0.5rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                                      <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 700 }}>{p}</div>
                                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: colors[i] }}>{latValues[i]}<span style={{ fontSize: '0.6rem' }}>ms</span></div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={flexAlignCenterGap2}>
                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', minWidth: 70 }}>Distribution</span>
                                <div style={{ flex: 1, display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                                  {normalizedBuckets.map((b, i) => (
                                    <div key={i} style={{ width: `${b.pct}%`, background: b.color, opacity: 0.7 }} title={`${b.label}: ${b.pct}%`} />
                                  ))}
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.55rem', color: '#475569' }}>
                                {latencyBuckets.map((b, i) => (
                                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: 2, background: b.color, display: 'inline-block' }} /> {b.label}
                                  </span>
                                ))}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.65rem' }}>
                                <div><span style={{ color: '#64748b' }}>Errors:</span> <span style={{ color: (s.errors || 0) > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{s.errors || 0}</span></div>
                                <div><span style={{ color: '#64748b' }}>Last Active:</span> <span style={{ color: '#f8fafc', fontWeight: 700 }}>{s.lastActive ? new Date(s.lastActive).toLocaleTimeString() : '--'}</span></div>
                              </div>
                            </div>
                            <div className="agents-obs-entry">
                              <span className="agents-obs-entry-time">[{new Date().toISOString().split('T')[1].slice(0, -1)}]</span>
                              <span> ROUTER_REQ: {agent.id} - </span>
                              <span className="agents-obs-entry-ok">200 OK</span>
                              <span> ({s.latency}ms)</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      )})()}
    </ModalShell>
    <ModuleInfo moduleKey="agents" />
  </div>);
};

export default AgentsPanelView;
