import React from 'react';
import type { TranslationKey } from './i18n/translations';
import {
  LayoutDashboard, MessageSquare, CheckSquare, Bot,
  Key, Layers, Share2, Server, GitMerge, Wrench,
  Shield, Users, Search, History,
  BarChart3, GitBranch, DollarSign,
  Terminal, Brain, Database, Heart, Thermometer,
  Shuffle, Network, Crosshair,
  BookOpen, Zap, Radio, FolderOpen,
  Waves, Hexagon, MessageCircle, Box,
  BookText, Settings,
} from 'lucide-react';

export interface RouteMeta {
  id: string;
  labelKey: TranslationKey;
  icon: React.ReactNode;
  color: string;
  lazy?: boolean;
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
    ],
  },
  {
    id: 'section-econ',
    labelKey: 'nav.economic_plane',
    items: [
      { id: 'analytics', labelKey: 'nav.analytics', icon: <BarChart3 size={18} />, color: '#8b5cf6' },
      { id: 'routing', labelKey: 'nav.routing_ai', icon: <GitBranch size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'pricing', labelKey: 'nav.economics', icon: <DollarSign size={18} />, color: '#10b981', lazy: true },
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
      { id: 'pressure', labelKey: 'nav.pressure_map', icon: <Thermometer size={18} />, color: '#f97316', lazy: true },
      { id: 'what-if', labelKey: 'nav.what_if', icon: <Shuffle size={18} />, color: '#8b5cf6', lazy: true },
      { id: 'runtime-pressure', labelKey: 'nav.runtime_pressure_map', icon: <Thermometer size={18} />, color: '#f97316', lazy: true },
      { id: 'dependency-map', labelKey: 'nav.dependency_graph', icon: <Network size={18} />, color: '#3b82f6', lazy: true },
      { id: 'diagnostics', labelKey: 'nav.diagnostics', icon: <Crosshair size={18} />, color: '#10b981', lazy: true },
    ],
  },
  {
    id: 'section-lab',
    labelKey: 'nav.section_lab',
    items: [
      { id: 'builder', labelKey: 'nav.builder', icon: <Box size={18} />, color: '#f59e0b', lazy: true },
      { id: 'debate', labelKey: 'nav.debate_arena', icon: <MessageCircle size={18} />, color: '#a855f7', lazy: true },
      { id: 'debate-runtime', labelKey: 'nav.debate_runtime_arena', icon: <GitBranch size={18} />, color: '#a855f7', lazy: true },
      { id: 'hive', labelKey: 'nav.hive', icon: <Hexagon size={18} />, color: '#eab308', lazy: true },
      { id: 'aquarium', labelKey: 'nav.aquarium', icon: <Waves size={18} />, color: '#06b6d4', lazy: true },
      { id: 'live', labelKey: 'nav.live_workspace', icon: <Radio size={18} />, color: '#3b82f6', lazy: true },
      { id: 'mission', labelKey: 'nav.mission_control', icon: <Zap size={18} />, color: '#f59e0b', lazy: true },
      { id: 'agents', labelKey: 'nav.agents', icon: <Bot size={18} />, color: '#8b5cf6' },
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
