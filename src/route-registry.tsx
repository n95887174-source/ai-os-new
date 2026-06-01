import React from 'react';
import type { TranslationKey } from './i18n/translations';
import type { FeatureFlag } from './kernel/contracts/feature-flags';
import { FEATURE_FLAGS } from './kernel/contracts/feature-flags';
import {
  LayoutDashboard, MessageSquare, CheckSquare, Bot,
  Key, Layers, Share2, Server, GitMerge, Wrench,
  Shield, Users, Search, History,
  BarChart3, GitBranch, DollarSign, Activity,
  Terminal, Brain, Database, Heart, Thermometer, GitCompare,
  Shuffle, Network, Crosshair, FileText,
  BookOpen, Zap, Radio, FolderOpen,
  Waves, Hexagon, MessageCircle, Box, Link,
  BookText, Settings, FolderTree, HardDrive, Webhook, RefreshCw,
  FlaskConical, Star,
} from 'lucide-react';

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

// Legacy routes NOT in sidebar (keep for deep-link compat):
// /events     → EventsPanel (replaced by /logs)
// /timeline   → EventsTimeline (merged into events surface)
// /chat-admin → ChatAdminPanel (admin-only, no nav entry)

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'section-control',
    labelKey: 'nav.control_plane',
    items: [
      { id: 'dashboard', labelKey: 'nav.overview', icon: <LayoutDashboard size={18} />, color: '#3b82f6' },
      { id: 'chat', labelKey: 'nav.chat', icon: <MessageSquare size={18} />, color: '#10b981' },
      { id: 'tasks', labelKey: 'nav.tasks', icon: <CheckSquare size={18} />, color: '#f59e0b' },
      { id: 'sre', labelKey: 'nav.sre_agent', icon: <Bot size={18} />, color: '#8b5cf6', lazy: true },
    ],
  },
  {
    id: 'section-infra',
    labelKey: 'nav.infrastructure',
    items: [
      { id: 'keys', labelKey: 'nav.providers', icon: <Key size={18} />, color: '#3b82f6' },
      { id: 'pools', labelKey: 'nav.key_pools', icon: <Layers size={18} />, color: '#3b82f6' },
      { id: 'connectors', labelKey: 'nav.connectors', icon: <Share2 size={18} />, color: '#3b82f6' },
      { id: 'mcp', labelKey: 'nav.mcp_servers', icon: <Server size={18} />, color: '#a855f7' },
      { id: 'skills', labelKey: 'nav.skills', icon: <GitMerge size={18} />, color: '#f59e0b' },
      { id: 'tools', labelKey: 'nav.tools', icon: <Wrench size={18} />, color: '#f59e0b' },
      { id: 'cache', labelKey: 'nav.cache', icon: <HardDrive size={18} />, color: '#10b981', lazy: true },
      { id: 'webhooks', labelKey: 'nav.webhooks', icon: <Webhook size={18} />, color: '#a855f7', lazy: true },
      { id: 'rotations', labelKey: 'nav.rotations', icon: <RefreshCw size={18} />, color: '#3b82f6', lazy: true },
      { id: 'groups', labelKey: 'nav.groups', icon: <FolderTree size={18} />, color: '#3b82f6' },
    ],
  },
  {
    id: 'section-gov',
    labelKey: 'nav.governance',
    items: [
      { id: 'policies', labelKey: 'nav.policies', icon: <Shield size={18} />, color: '#10b981' },
      { id: 'roles', labelKey: 'nav.roles', icon: <Users size={18} />, color: '#3b82f6' },
      { id: 'audit', labelKey: 'nav.audit_log', icon: <Search size={18} />, color: '#94a3b8' },
      { id: 'history', labelKey: 'nav.config_history', icon: <History size={18} />, color: '#f59e0b' },
      { id: 'service-registry', labelKey: 'nav.service_registry', icon: <Box size={18} />, color: '#8b5cf6', lazy: true },
    ],
  },
  {
    id: 'section-econ',
    labelKey: 'nav.economic_plane',
    items: [
      { id: 'analytics', labelKey: 'nav.analytics', icon: <BarChart3 size={18} />, color: '#8b5cf6' },
      { id: 'routing', labelKey: 'nav.routing_ai', icon: <GitBranch size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'pricing', labelKey: 'nav.economics', icon: <DollarSign size={18} />, color: '#10b981', lazy: true },
      { id: 'budget', labelKey: 'nav.budget', icon: <DollarSign size={18} />, color: '#10b981', lazy: true },
      { id: 'cost-analytics', labelKey: 'nav.cost_analytics', icon: <BarChart3 size={18} />, color: '#10b981', lazy: true },
      { id: 'provider-marketplace', labelKey: 'nav.provider_marketplace', icon: <Star size={18} />, color: '#10b981', lazy: true },
    ],
  },
  {
    id: 'section-obs',
    labelKey: 'nav.observability',
    items: [
      { id: 'logs', labelKey: 'nav.log_browser', icon: <Terminal size={18} />, color: '#94a3b8', lazy: true },
      { id: 'debugger', labelKey: 'nav.traces', icon: <Brain size={18} />, color: '#a855f7', lazy: true },
      { id: 'router-trace', labelKey: 'nav.router_trace', icon: <GitBranch size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'memory', labelKey: 'nav.memory', icon: <Database size={18} />, color: '#a855f7', lazy: true },
      { id: 'health', labelKey: 'nav.health', icon: <Heart size={18} />, color: '#ef4444', lazy: true },
      { id: 'system-health', labelKey: 'nav.system_health', icon: <Heart size={18} />, color: '#22c55e', lazy: true },
      { id: 'docs-health', labelKey: 'nav.docs_health', icon: <FileText size={18} />, color: '#22c55e', lazy: true },
      { id: 'pressure', labelKey: 'nav.pressure_map', icon: <Thermometer size={18} />, color: '#f97316', lazy: true },
      { id: 'what-if', labelKey: 'nav.what_if', icon: <Shuffle size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'runtime-pressure', labelKey: 'nav.runtime_pressure_map', icon: <Thermometer size={18} />, color: '#f97316', lazy: true },
      { id: 'provider-dashboard', labelKey: 'nav.provider_dashboard', icon: <Activity size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'dependency-map', labelKey: 'nav.dependency_graph', icon: <Network size={18} />, color: '#3b82f6', lazy: true },
      { id: 'diagnostics', labelKey: 'nav.diagnostics', icon: <Crosshair size={18} />, color: '#10b981', lazy: true },
      { id: 'shadow', labelKey: 'nav.shadow', icon: <GitCompare size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'causal-debugger', labelKey: 'nav.causal_debugger', icon: <GitBranch size={18} />, color: '#a78bfa', lazy: true },
      { id: 'counterfactual', labelKey: 'nav.counterfactual', icon: <Zap size={18} />, color: '#f59e0b', lazy: true },
      { id: 'session-bindings', labelKey: 'nav.session_bindings', icon: <Link size={18} />, color: '#8b5cf6', lazy: true },
    ],
  },
  {
    id: 'section-lab',
    labelKey: 'nav.section_lab',
    items: [
      { id: 'builder', labelKey: 'nav.builder', icon: <Box size={18} />, color: '#f59e0b', lazy: true },
      { id: 'debate', labelKey: 'nav.debate_arena', icon: <><MessageCircle size={18} /><span style={{ width: 0 }} /><GitBranch size={14} /></>, color: '#a855f7', lazy: true },
      { id: 'debate-workspace', labelKey: 'nav.debate_workspace', icon: <MessageCircle size={18} />, color: '#a855f7', lazy: true },
      { id: 'debate-replay', labelKey: 'nav.debate_replay', icon: <History size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'debate-tournament', labelKey: 'nav.debate_tournament', icon: <Zap size={18} />, color: '#f59e0b', lazy: true },
      { id: 'argument-graph', labelKey: 'nav.argument_graph', icon: <Network size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'hive', labelKey: 'nav.hive', icon: <Hexagon size={18} />, color: '#eab308', lazy: true, featureFlag: FEATURE_FLAGS.EXPERIMENTAL_VISUALS },
      { id: 'aquarium', labelKey: 'nav.aquarium', icon: <Waves size={18} />, color: '#06b6d4', lazy: true, featureFlag: FEATURE_FLAGS.EXPERIMENTAL_VISUALS },
      { id: 'live', labelKey: 'nav.live_workspace', icon: <Radio size={18} />, color: '#3b82f6', lazy: true },
      { id: 'mission', labelKey: 'nav.mission_control', icon: <Zap size={18} />, color: '#f59e0b', lazy: true },
      { id: 'agents', labelKey: 'nav.agents', icon: <Bot size={18} />, color: '#8b5cf6' },
      { id: 'agent-marketplace', labelKey: 'nav.agent_marketplace', icon: <Star size={18} />, color: '#a855f7', lazy: true },
    ],
  },
  {
    id: 'section-research',
    labelKey: 'nav.section_research',
    items: [
      { id: 'debate-system-research', labelKey: 'nav.debate_system_research', icon: <FlaskConical size={18} />, color: '#a855f7' },
      { id: 'project-os', labelKey: 'nav.project_os_explorer', icon: <Search size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'hypothesis-gen', labelKey: 'nav.hypothesis_generator', icon: <GitBranch size={18} />, color: '#3b82f6', lazy: true },
      { id: 'arch-review', labelKey: 'nav.architecture_review', icon: <BookText size={18} />, color: '#10b981', lazy: true },
      { id: 'prompt-audit', labelKey: 'nav.prompt_strategy_audit', icon: <Terminal size={18} />, color: '#f59e0b', lazy: true },
      { id: 'routing-experiments', labelKey: 'nav.model_routing_experiments', icon: <BarChart3 size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'gov-stress-test', labelKey: 'nav.governance_stress_test', icon: <Shield size={18} />, color: '#ef4444', lazy: true },
      { id: 'obs-gaps', labelKey: 'nav.observability_gaps_scanner', icon: <Crosshair size={18} />, color: '#f97316', lazy: true },
    ],
  },
  {
    id: 'section-knowledge',
    labelKey: 'nav.section_knowledge',
    items: [
      { id: 'patterns', labelKey: 'nav.patterns', icon: <BookOpen size={18} />, color: '#10b981' },
      { id: 'knowledge', labelKey: 'nav.knowledge', icon: <Brain size={18} />, color: '#a855f7' },
      { id: 'files', labelKey: 'nav.files', icon: <FolderOpen size={18} />, color: '#a855f7', lazy: true },
      { id: 'docs', labelKey: 'nav.docs', icon: <BookText size={18} />, color: '#8b5cf6' },
      { id: 'settings', labelKey: 'nav.settings', icon: <Settings size={18} />, color: '#3b82f6' },
    ],
  },
];
