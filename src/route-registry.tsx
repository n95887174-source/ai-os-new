import React from 'react';
import type { TranslationKey } from './i18n/translations';
import type { FeatureFlag } from './kernel/contracts/feature-flags';
import {
  LayoutDashboard, Settings,
  MessageSquare, FolderTree, LayoutDashboard as SessionHubIcon, Bookmark, CheckSquare, FolderOpen,
  Bot, Star, Radio, Zap, Users, BookOpen,
  MessageCircle, GitBranch, History, Zap as TournamentZap, GitMerge, Brain, Box, Sparkles,
  BarChart3, DollarSign, Activity, TrendingUp, GitBranch as RoutingIcon,
  Key, Layers, StickyNote, Gauge, Share2, Server,
  Terminal, Database, Heart, Thermometer, Shuffle, Network, Crosshair,
  Eye, FileCode, Activity as HealthPulse, GitCompare,
  BookText, Search, FlaskConical, Shield, ClipboardList,
  Wrench, HardDrive, Webhook, RefreshCw,
} from 'lucide-react';

// Legacy routes NOT in sidebar (keep for deep-link compat):
// /events     → EventsPanel (replaced by /logs)
// /timeline   → EventsTimeline (merged into events surface)
// /chat-admin → ChatAdminPanel (admin-only, no nav entry)

export interface RouteMeta {
  id: string;
  labelKey: TranslationKey;
  icon: React.ReactNode;
  color: string;
  lazy?: boolean;
  /** Hidden from sidebar when flag is off (routes remain for deep links). */
  featureFlag?: FeatureFlag;
}

export interface NavSection {
  id: string;
  labelKey: TranslationKey;
  items: RouteMeta[];
}

export const NAV_SECTIONS: NavSection[] = [

  // ═══════════════════════════════════════════════════════════
  // 1. DASHBOARD — overview, analytics, routing
  // ═══════════════════════════════════════════════════════════
  {
    id: 'section-dashboard',
    labelKey: 'nav.section_dashboard',
    items: [
      { id: 'dashboard',      labelKey: 'nav.overview',       icon: <LayoutDashboard size={18} />, color: '#3b82f6' },
      { id: 'analytics',      labelKey: 'nav.analytics',      icon: <BarChart3 size={18} />,       color: '#8b5cf6' },
      { id: 'pricing',        labelKey: 'nav.economics',      icon: <DollarSign size={18} />,      color: '#10b981', lazy: true },
      { id: 'budget',         labelKey: 'nav.budget',          icon: <TrendingUp size={18} />,      color: '#10b981', lazy: true },
      { id: 'cost-analytics', labelKey: 'nav.cost_analytics',  icon: <BarChart3 size={18} />,       color: '#10b981', lazy: true },
      { id: 'routing',        labelKey: 'nav.routing_ai',      icon: <RoutingIcon size={18} />,     color: '#8b5cf6', lazy: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 2. CHAT — conversations, sessions, bookmarks
  // ═══════════════════════════════════════════════════════════
  {
    id: 'section-chat',
    labelKey: 'nav.section_chat',
    items: [
      { id: 'chat',           labelKey: 'nav.chat',            icon: <MessageSquare size={18} />,   color: '#10b981' },
      { id: 'chat-sessions',  labelKey: 'nav.chat_sessions',  icon: <FolderTree size={18} />,      color: '#06b6d4', lazy: true },
      { id: 'session-hub',    labelKey: 'nav.session_hub',     icon: <SessionHubIcon size={18} />,  color: '#8b5cf6', lazy: true },
      { id: 'bookmarks',      labelKey: 'nav.bookmarks',       icon: <Bookmark size={18} />,        color: '#f59e0b', lazy: true },
      { id: 'tasks',          labelKey: 'nav.tasks',           icon: <CheckSquare size={18} />,     color: '#f59e0b' },
      { id: 'files',          labelKey: 'nav.files',           icon: <FolderOpen size={18} />,      color: '#a855f7', lazy: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 3. DEBATES — all debate-related panels (13 → 1 section)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'section-debates',
    labelKey: 'nav.section_debates',
    items: [
      { id: 'debate',           labelKey: 'nav.debate_arena',      icon: <MessageCircle size={18} />, color: '#a855f7', lazy: true },
      { id: 'builder',          labelKey: 'nav.builder',           icon: <Box size={18} />,           color: '#f59e0b', lazy: true },
      { id: 'debate-live',      labelKey: 'nav.debate_live',       icon: <Radio size={18} />,         color: '#ef4444', lazy: true },
      { id: 'debate-workspace', labelKey: 'nav.debate_rooms',      icon: <GitBranch size={18} />,     color: '#8b5cf6', lazy: true },
      { id: 'debate-replay',    labelKey: 'nav.debate_replay',     icon: <History size={18} />,       color: '#6b7280', lazy: true },
      { id: 'debate-tournament', labelKey: 'nav.tournament',       icon: <TournamentZap size={18} />, color: '#f97316', lazy: true },
      { id: 'debate-runtime',   labelKey: 'nav.debate_runtime',    icon: <Zap size={18} />,           color: '#22c55e', lazy: true },
      { id: 'argument-graph',   labelKey: 'nav.argument_graph',    icon: <GitBranch size={18} />,     color: '#8b5cf6', lazy: true },
      { id: 'strategy-builder',  labelKey: 'nav.strategy_builder', icon: <GitMerge size={18} />,      color: '#06b6d4', lazy: true },
      { id: 'debate-analysis',  labelKey: 'nav.debate_analysis',   icon: <Brain size={18} />,         color: '#a855f7', lazy: true },
      { id: 'debate-history',   labelKey: 'nav.debate_history',    icon: <History size={18} />,       color: '#6b7280', lazy: true },
      { id: 'debates-manager',  labelKey: 'nav.debates_manager',   icon: <FolderTree size={18} />,    color: '#8b5cf6', lazy: true },
      { id: 'topics',           labelKey: 'nav.topics',            icon: <Sparkles size={18} />,      color: '#a855f7', lazy: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 4. AGENTS — workforce, roles, marketplace
  // ═══════════════════════════════════════════════════════════
  {
    id: 'section-agents',
    labelKey: 'nav.section_agents',
    items: [
      { id: 'agents',            labelKey: 'nav.agents',             icon: <Bot size={18} />,          color: '#8b5cf6' },
      { id: 'roles',             labelKey: 'nav.roles',              icon: <Users size={18} />,        color: '#3b82f6' },
      { id: 'sre',               labelKey: 'nav.sre_agent',          icon: <Zap size={18} />,          color: '#ef4444', lazy: true },
      { id: 'agent-journal',     labelKey: 'nav.agent_journal',      icon: <BookOpen size={18} />,     color: '#8b5cf6', lazy: true },
      { id: 'mission',           labelKey: 'nav.mission_control',    icon: <Zap size={18} />,          color: '#f59e0b', lazy: true },
      { id: 'live',              labelKey: 'nav.live_workspace',     icon: <Radio size={18} />,        color: '#3b82f6', lazy: true },
      { id: 'agent-marketplace', labelKey: 'nav.agent_marketplace',  icon: <Star size={18} />,         color: '#a855f7', lazy: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 5. CONNECTIONS — providers, keys, integrations
  // ═══════════════════════════════════════════════════════════
  {
    id: 'section-connections',
    labelKey: 'nav.section_connections',
    items: [
      { id: 'keys',               labelKey: 'nav.providers',          icon: <Key size={18} />,          color: '#3b82f6' },
      { id: 'pools',              labelKey: 'nav.key_pools',          icon: <Layers size={18} />,       color: '#3b82f6' },
      { id: 'groups',             labelKey: 'nav.groups',             icon: <FolderTree size={18} />,   color: '#3b82f6' },
      { id: 'key-notes',          labelKey: 'nav.key_notes',          icon: <StickyNote size={18} />,   color: '#f59e0b', lazy: true },
      { id: 'provider-dashboard',  labelKey: 'nav.provider_dashboard', icon: <Gauge size={18} />,        color: '#8b5cf6', lazy: true },
      { id: 'provider-marketplace', labelKey: 'nav.provider_marketplace', icon: <Star size={18} />,      color: '#10b981', lazy: true },
      { id: 'connectors',          labelKey: 'nav.connectors',         icon: <Share2 size={18} />,       color: '#3b82f6' },
      { id: 'mcp',                labelKey: 'nav.mcp_servers',        icon: <Server size={18} />,       color: '#a855f7' },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 6. DIAGNOSTICS — logs, traces, health, debug tools
  // ═══════════════════════════════════════════════════════════
  {
    id: 'section-diagnostics',
    labelKey: 'nav.section_diagnostics',
    items: [
      { id: 'logs',               labelKey: 'nav.log_browser',        icon: <Terminal size={18} />,     color: '#94a3b8', lazy: true },
      { id: 'debugger',           labelKey: 'nav.traces',             icon: <GitBranch size={18} />,    color: '#a855f7', lazy: true },
      { id: 'router-trace',       labelKey: 'nav.router_trace',       icon: <Network size={18} />,      color: '#8b5cf6', lazy: true },
      { id: 'memory',             labelKey: 'nav.memory',             icon: <Database size={18} />,     color: '#a855f7', lazy: true },
      { id: 'health',             labelKey: 'nav.health',             icon: <Heart size={18} />,        color: '#ef4444', lazy: true },
      { id: 'system-health',      labelKey: 'nav.system_health',      icon: <HealthPulse size={18} />,  color: '#22c55e', lazy: true },
      { id: 'docs-health',        labelKey: 'nav.docs_health',        icon: <FileCode size={18} />,     color: '#22c55e', lazy: true },
      { id: 'pressure',           labelKey: 'nav.pressure_map',       icon: <Thermometer size={18} />,  color: '#f97316', lazy: true },
      { id: 'runtime-pressure',   labelKey: 'nav.runtime_pressure_map', icon: <Activity size={18} />,  color: '#f97316', lazy: true },
      { id: 'what-if',            labelKey: 'nav.what_if',            icon: <Shuffle size={18} />,      color: '#8b5cf6', lazy: true },
      { id: 'dependency-map',     labelKey: 'nav.dependency_graph',    icon: <GitCompare size={18} />,   color: '#3b82f6', lazy: true },
      { id: 'diagnostics',        labelKey: 'nav.diagnostics',        icon: <Crosshair size={18} />,    color: '#10b981', lazy: true },
      { id: 'state-inspector',    labelKey: 'nav.state_inspector',     icon: <Eye size={18} />,          color: '#3b82f6', lazy: true },
      { id: 'performance-profiler', labelKey: 'nav.performance_profiler', icon: <TrendingUp size={18} />, color: '#a855f7', lazy: true },
      { id: 'shadow',             labelKey: 'nav.shadow',             icon: <GitBranch size={18} />,    color: '#8b5cf6', lazy: true },
      { id: 'causal-debugger',    labelKey: 'nav.causal_debugger',    icon: <Shuffle size={18} />,      color: '#a78bfa', lazy: true },
      { id: 'counterfactual',     labelKey: 'nav.counterfactual',     icon: <MessageCircle size={18} />, color: '#f59e0b', lazy: true },
      { id: 'session-bindings',   labelKey: 'nav.session_bindings',   icon: <Share2 size={18} />,       color: '#8b5cf6', lazy: true },
      { id: 'aquarium',           labelKey: 'nav.aquarium',           icon: <Eye size={18} />,          color: '#06b6d4', lazy: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 7. KNOWLEDGE — docs, patterns, research tools
  // ═══════════════════════════════════════════════════════════
  {
    id: 'section-knowledge',
    labelKey: 'nav.section_knowledge',
    items: [
      { id: 'patterns',           labelKey: 'nav.patterns',              icon: <BookOpen size={18} />,    color: '#10b981' },
      { id: 'knowledge',          labelKey: 'nav.knowledge',             icon: <Brain size={18} />,       color: '#a855f7' },
      { id: 'docs',               labelKey: 'nav.docs',                  icon: <BookText size={18} />,    color: '#8b5cf6' },
      { id: 'decision-log',       labelKey: 'nav.decision_log',          icon: <ClipboardList size={18} />, color: '#10b981', lazy: true },
      { id: 'project-os',         labelKey: 'nav.project_os_explorer',   icon: <Search size={18} />,      color: '#8b5cf6', lazy: true },
      { id: 'hypothesis-gen',     labelKey: 'nav.hypothesis_generator',  icon: <FlaskConical size={18} />, color: '#3b82f6', lazy: true },
      { id: 'arch-review',        labelKey: 'nav.architecture_review',   icon: <BookText size={18} />,    color: '#10b981', lazy: true },
      { id: 'prompt-audit',       labelKey: 'nav.prompt_strategy_audit', icon: <Terminal size={18} />,    color: '#f59e0b', lazy: true },
      { id: 'routing-experiments', labelKey: 'nav.model_routing_experiments', icon: <BarChart3 size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'gov-stress-test',    labelKey: 'nav.governance_stress_test', icon: <Shield size={18} />,     color: '#ef4444', lazy: true },
      { id: 'obs-gaps',           labelKey: 'nav.observability_gaps_scanner', icon: <Crosshair size={18} />, color: '#f97316', lazy: true },
      { id: 'debate-system-research', labelKey: 'nav.debate_system_research', icon: <FlaskConical size={18} />, color: '#a855f7', lazy: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 8. INTEGRATIONS — tools, cache, webhooks, rotations
  // ═══════════════════════════════════════════════════════════
  {
    id: 'section-integrations',
    labelKey: 'nav.section_integrations',
    items: [
      { id: 'skills',      labelKey: 'nav.skills',       icon: <GitMerge size={18} />,   color: '#f59e0b' },
      { id: 'tools',       labelKey: 'nav.tools',        icon: <Wrench size={18} />,     color: '#f59e0b' },
      { id: 'cache',       labelKey: 'nav.cache',        icon: <HardDrive size={18} />,  color: '#10b981', lazy: true },
      { id: 'webhooks',    labelKey: 'nav.webhooks',     icon: <Webhook size={18} />,    color: '#a855f7', lazy: true },
      { id: 'rotations',   labelKey: 'nav.rotations',    icon: <RefreshCw size={18} />,  color: '#3b82f6', lazy: true },
      { id: 'service-registry', labelKey: 'nav.service_registry', icon: <Box size={18} />, color: '#8b5cf6', lazy: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // 9. SETTINGS — settings, policies, audit
  // ═══════════════════════════════════════════════════════════
  {
    id: 'section-settings',
    labelKey: 'nav.section_settings',
    items: [
      { id: 'settings',      labelKey: 'nav.settings',     icon: <Settings size={18} />,       color: '#64748b' },
      { id: 'policies',      labelKey: 'nav.policies',     icon: <Shield size={18} />,         color: '#10b981' },
      { id: 'policy-editor', labelKey: 'nav.policy_editor', icon: <Zap size={18} />,            color: '#06b6d4', lazy: true },
      { id: 'audit',         labelKey: 'nav.audit_log',    icon: <Search size={18} />,         color: '#94a3b8' },
      { id: 'history',       labelKey: 'nav.config_history', icon: <History size={18} />,      color: '#f59e0b' },
    ],
  },

];
