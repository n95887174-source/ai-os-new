import React, { Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { t as translate } from './i18n/translations';
import {
    LayoutDashboard,
    Settings,
    MessageSquare as MessageSquareIcon,
    FolderTree,
    LayoutDashboard as SessionHubIcon,
    Bookmark,
    CheckSquare,
    FolderOpen,
    Bot,
    Star,
    Radio,
    Zap,
    Users,
    BookOpen,
    MessageCircle,
    GitBranch,
    History,
    Zap as TournamentZap,
    GitMerge,
    Brain,
    Box,
    Sparkles,
    BarChart3,
    DollarSign,
    Activity,
    TrendingUp,
    GitBranch as RoutingIcon,
    Key,
    Layers,
    StickyNote,
    Gauge,
    Share2,
    Server,
    Terminal,
    Database,
    Heart,
    Thermometer,
    Shuffle,
    Network,
    Crosshair,
    Eye,
    FileCode,
    Activity as HealthPulse,
    GitCompare,
    BookText,
    Search as SearchIcon,
    FlaskConical,
    Shield,
    ClipboardList,
    Wrench,
    HardDrive,
    Webhook,
    Fish,
    RefreshCw,
    Home,
    Search,
    MessageSquare,
    FileText,
    ListOrdered,
    GitPullRequest,
    Rocket,
    Bell,
    Grid3X3,
    SlidersHorizontal,
    Trophy,
    Mic,
    Puzzle,
    Store,
    Upload,
    Clock as ClockIcon,
    GitCommit as GitCommitIcon,
    Atom,
    Route as RouteIcon,
    Container as ContainerIcon,
} from 'lucide-react';
import type { TranslationKey } from './i18n/translations';
import type { FeatureFlag } from './kernel/contracts/feature-flags';

// Legacy routes NOT in sidebar (keep for deep-link compat):
// /events     → EventsPanel (replaced by /logs)
// /timeline   → EventsTimeline (merged into events surface)
// /chat-admin → ChatAdminPanel (admin-only, no nav entry)

export type UserLevel = 'L0' | 'L1' | 'L2';

export interface RouteMeta {
    id: string;
    /** URL path — defaults to `/${id}` if omitted */
    path?: string;
    labelKey: TranslationKey;
    icon: React.ReactNode;
    color: string;
    lazy?: boolean;
    /** Minimum user level required to see this item in sidebar. L2 = admin (default). */
    level?: UserLevel;
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
            {
                id: 'dashboard',
                labelKey: 'nav.overview',
                icon: <LayoutDashboard size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L0',
            },
            {
                id: 'analytics',
                labelKey: 'nav.analytics',
                icon: <BarChart3 size={18} />,
                color: '#8b5cf6',
                level: 'L1',
            },
            {
                id: 'pricing',
                labelKey: 'nav.economics',
                icon: <DollarSign size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'budget',
                labelKey: 'nav.budget',
                icon: <TrendingUp size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'cost-analytics',
                labelKey: 'nav.cost_analytics',
                icon: <BarChart3 size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'cost-optimization',
                labelKey: 'nav.cost_optimization',
                icon: <DollarSign size={18} />,
                color: '#f59e0b',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'custom-metrics',
                labelKey: 'nav.custom_metrics',
                icon: <BarChart3 size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'budget-alerts',
                labelKey: 'nav.budget_alerts',
                icon: <Bell size={18} />,
                color: '#f97316',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'key-usage-analytics',
                labelKey: 'nav.key_usage_analytics',
                icon: <BarChart3 size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'routing',
                labelKey: 'nav.routing_ai',
                icon: <RoutingIcon size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'contribution-graph',
                labelKey: 'nav.contribution_graph',
                icon: <GitCommitIcon size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 2. CHAT — conversations, sessions, bookmarks
    // ═══════════════════════════════════════════════════════════
    {
        id: 'section-chat',
        labelKey: 'nav.section_chat',
        items: [
            {
                id: 'chat',
                labelKey: 'nav.chat',
                icon: <MessageSquareIcon size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L0',
            },
            {
                id: 'chat-sessions',
                labelKey: 'nav.chat_sessions',
                icon: <FolderTree size={18} />,
                color: '#06b6d4',
                lazy: true,
                level: 'L0',
            },
            {
                id: 'session-hub',
                labelKey: 'nav.session_hub',
                icon: <SessionHubIcon size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'bookmarks',
                labelKey: 'nav.bookmarks',
                icon: <Bookmark size={18} />,
                color: '#f59e0b',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'tasks',
                labelKey: 'nav.tasks',
                icon: <CheckSquare size={18} />,
                color: '#f59e0b',
                level: 'L1',
            },
            {
                id: 'files',
                labelKey: 'nav.files',
                icon: <FolderOpen size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 3. DEBATES — all debate-related panels (13 → 1 section)
    // ═══════════════════════════════════════════════════════════
    {
        id: 'section-debates',
        labelKey: 'nav.section_debates',
        items: [
            {
                id: 'debate',
                labelKey: 'nav.debate_arena',
                icon: <MessageCircle size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'builder',
                labelKey: 'nav.builder',
                icon: <Box size={18} />,
                color: '#f59e0b',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'debate-live',
                labelKey: 'nav.debate_live',
                icon: <Radio size={18} />,
                color: '#ef4444',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'debate-workspace',
                labelKey: 'nav.debate_rooms',
                icon: <GitBranch size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'debate-replay',
                labelKey: 'nav.debate_replay',
                icon: <History size={18} />,
                color: '#6b7280',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'debate-tournament',
                labelKey: 'nav.tournament',
                icon: <TournamentZap size={18} />,
                color: '#f97316',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'audience',
                labelKey: 'nav.audience',
                icon: <Users size={18} />,
                color: '#ec4899',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'argument-graph',
                labelKey: 'nav.argument_graph',
                icon: <GitBranch size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'strategy-builder',
                labelKey: 'nav.strategy_builder',
                icon: <GitMerge size={18} />,
                color: '#06b6d4',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'debate-analysis',
                labelKey: 'nav.debate_analysis',
                icon: <Brain size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'debate-history',
                labelKey: 'nav.debate_history',
                icon: <History size={18} />,
                color: '#6b7280',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'debates-manager',
                labelKey: 'nav.debates_manager',
                icon: <FolderTree size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'topics',
                labelKey: 'nav.topics',
                icon: <Sparkles size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'debate-templates',
                labelKey: 'nav.debate_templates',
                icon: <FileText size={18} />,
                color: '#06b6d4',
                lazy: true,
                level: 'L1',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 4. AGENTS — workforce, roles, marketplace
    // ═══════════════════════════════════════════════════════════
    {
        id: 'section-agents',
        labelKey: 'nav.section_agents',
        items: [
            {
                id: 'agents',
                labelKey: 'nav.agents',
                icon: <Bot size={18} />,
                color: '#8b5cf6',
                level: 'L1',
            },
            {
                id: 'roles',
                labelKey: 'nav.roles',
                icon: <Users size={18} />,
                color: '#3b82f6',
                level: 'L1',
            },
            {
                id: 'roles-consortia',
                labelKey: 'nav.roles_consortia',
                icon: <Users size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'sre',
                labelKey: 'nav.sre_agent',
                icon: <Zap size={18} />,
                color: '#ef4444',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'agent-journal',
                labelKey: 'nav.agent_journal',
                icon: <BookOpen size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'mission',
                labelKey: 'nav.mission_control',
                icon: <Zap size={18} />,
                color: '#f59e0b',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'live',
                labelKey: 'nav.live_workspace',
                icon: <Radio size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'agent-marketplace',
                labelKey: 'nav.agent_marketplace',
                icon: <Star size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'agent-comparison',
                labelKey: 'nav.agent_comparison',
                icon: <GitCompare size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'agent-protocol',
                labelKey: 'nav.agent_protocol',
                icon: <Network size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'persona-marketplace',
                labelKey: 'nav.persona_marketplace',
                icon: <Store size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'persona-picker',
                labelKey: 'nav.persona_picker',
                icon: <Sparkles size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 5. CONNECTIONS — providers, keys, integrations
    // ═══════════════════════════════════════════════════════════
    {
        id: 'section-connections',
        labelKey: 'nav.section_connections',
        items: [
            {
                id: 'keys',
                labelKey: 'nav.providers',
                icon: <Key size={18} />,
                color: '#3b82f6',
                level: 'L0',
            },
            {
                id: 'pools',
                labelKey: 'nav.key_pools',
                icon: <Layers size={18} />,
                color: '#3b82f6',
                level: 'L2',
            },
            {
                id: 'groups',
                labelKey: 'nav.groups',
                icon: <FolderTree size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'key-notes',
                labelKey: 'nav.key_notes',
                icon: <StickyNote size={18} />,
                color: '#f59e0b',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'provider-dashboard',
                labelKey: 'nav.provider_dashboard',
                icon: <Gauge size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'groq-speed',
                labelKey: 'nav.groq_speed',
                icon: <Zap size={18} />,
                color: '#22c55e',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'smart-routing',
                labelKey: 'nav.smart_routing',
                icon: <RouteIcon size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'provider-marketplace',
                labelKey: 'nav.provider_marketplace',
                icon: <Star size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'connectors',
                labelKey: 'nav.connectors',
                icon: <Share2 size={18} />,
                color: '#3b82f6',
                level: 'L1',
            },
            {
                id: 'mcp',
                labelKey: 'nav.mcp_servers',
                icon: <Server size={18} />,
                color: '#a855f7',
                level: 'L1',
            },
            {
                id: 'session-bindings',
                labelKey: 'nav.session_bindings',
                icon: <Share2 size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'guardians',
                labelKey: 'nav.guardians',
                icon: <Shield size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'nvidia-enterprise',
                labelKey: 'nav.nvidia_enterprise',
                icon: <HardDrive size={18} />,
                color: '#76b900',
                lazy: true,
                level: 'L2',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 6. DIAGNOSTICS — logs, traces, health, debug tools
    // ═══════════════════════════════════════════════════════════
    {
        id: 'section-diagnostics',
        labelKey: 'nav.section_diagnostics',
        items: [
            {
                id: 'logs',
                labelKey: 'nav.log_browser',
                icon: <Terminal size={18} />,
                color: '#94a3b8',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'debugger',
                labelKey: 'nav.traces',
                icon: <GitBranch size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'router-trace',
                labelKey: 'nav.router_trace',
                icon: <Network size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'memory',
                labelKey: 'nav.memory',
                icon: <Database size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'memory-palace',
                labelKey: 'nav.memory_palace',
                icon: <Database size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'health',
                labelKey: 'nav.health',
                icon: <Heart size={18} />,
                color: '#ef4444',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'system-health',
                labelKey: 'nav.system_health',
                icon: <HealthPulse size={18} />,
                color: '#22c55e',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'docs-health',
                labelKey: 'nav.docs_health',
                icon: <FileCode size={18} />,
                color: '#22c55e',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'pressure',
                labelKey: 'nav.pressure_map',
                icon: <Thermometer size={18} />,
                color: '#f97316',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'runtime-pressure',
                labelKey: 'nav.runtime_pressure_map',
                icon: <Activity size={18} />,
                color: '#f97316',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'what-if',
                labelKey: 'nav.what_if',
                icon: <Shuffle size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'dependency-map',
                labelKey: 'nav.dependency_graph',
                icon: <GitCompare size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'diagnostics',
                labelKey: 'nav.diagnostics',
                icon: <Crosshair size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'state-inspector',
                labelKey: 'nav.state_inspector',
                icon: <Eye size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'performance-profiler',
                labelKey: 'nav.performance_profiler',
                icon: <TrendingUp size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'shadow',
                labelKey: 'nav.shadow',
                icon: <GitBranch size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'causal-debugger',
                labelKey: 'nav.causal_debugger',
                icon: <Shuffle size={18} />,
                color: '#a78bfa',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'counterfactual',
                labelKey: 'nav.counterfactual',
                icon: <MessageCircle size={18} />,
                color: '#f59e0b',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'aquarium',
                labelKey: 'nav.aquarium',
                icon: <Eye size={18} />,
                color: '#06b6d4',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'ecosystem',
                labelKey: 'nav.ecosystem',
                icon: <Fish size={18} />,
                color: '#22c55e',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'health-sla',
                labelKey: 'nav.health_sla',
                icon: <SlidersHorizontal size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'leaderboard',
                labelKey: 'nav.leaderboard',
                icon: <Trophy size={18} />,
                color: '#f59e0b',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'federated-memory',
                labelKey: 'nav.federated_memory',
                icon: <Server size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'memory-export-import',
                labelKey: 'nav.memory_export_import',
                icon: <Upload size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'aquarium-trading',
                labelKey: 'nav.aquarium_trading',
                icon: <Fish size={18} />,
                color: '#06b6d4',
                lazy: true,
                level: 'L2',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 7. KNOWLEDGE — docs, patterns, research tools
    // ═══════════════════════════════════════════════════════════
    {
        id: 'section-knowledge',
        labelKey: 'nav.section_knowledge',
        items: [
            {
                id: 'patterns',
                labelKey: 'nav.patterns',
                icon: <BookOpen size={18} />,
                color: '#10b981',
                level: 'L1',
            },
            {
                id: 'knowledge',
                labelKey: 'nav.knowledge',
                icon: <Brain size={18} />,
                color: '#a855f7',
                level: 'L0',
            },
            {
                id: 'docs',
                labelKey: 'nav.docs',
                icon: <BookText size={18} />,
                color: '#8b5cf6',
                level: 'L0',
            },
            {
                id: 'decision-log',
                labelKey: 'nav.decision_log',
                icon: <ClipboardList size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'eval-datasets',
                labelKey: 'nav.eval_datasets',
                icon: <BarChart3 size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'project-os',
                labelKey: 'nav.project_os_explorer',
                icon: <SearchIcon size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'hypothesis-gen',
                labelKey: 'nav.hypothesis_generator',
                icon: <FlaskConical size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'research-engine',
                labelKey: 'nav.research_engine',
                icon: <Layers size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'tutorials',
                labelKey: 'nav.tutorials',
                icon: <Sparkles size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L0',
            },
            {
                id: 'arch-review',
                labelKey: 'nav.architecture_review',
                icon: <BookText size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'prompt-audit',
                labelKey: 'nav.prompt_strategy_audit',
                icon: <Terminal size={18} />,
                color: '#f59e0b',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'routing-experiments',
                labelKey: 'nav.model_routing_experiments',
                icon: <BarChart3 size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'gov-stress-test',
                labelKey: 'nav.governance_stress_test',
                icon: <Shield size={18} />,
                color: '#ef4444',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'obs-gaps',
                labelKey: 'nav.observability_gaps_scanner',
                icon: <Crosshair size={18} />,
                color: '#f97316',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'debate-system-research',
                labelKey: 'nav.debate_system_research',
                icon: <FlaskConical size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'research-reports',
                labelKey: 'nav.research_reports',
                icon: <BookOpen size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'research-advanced',
                labelKey: 'nav.research_advanced',
                icon: <Layers size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'research-gemini',
                labelKey: 'nav.research_gemini',
                icon: <Sparkles size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'template-sharing',
                labelKey: 'nav.template_sharing',
                icon: <Share2 size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 8. INTEGRATIONS — tools, cache, webhooks, rotations
    // ═══════════════════════════════════════════════════════════
    {
        id: 'section-integrations',
        labelKey: 'nav.section_integrations',
        items: [
            {
                id: 'skills',
                labelKey: 'nav.skills',
                icon: <GitMerge size={18} />,
                color: '#f59e0b',
                level: 'L1',
            },
            {
                id: 'tools',
                labelKey: 'nav.tools',
                icon: <Wrench size={18} />,
                color: '#f59e0b',
                level: 'L1',
            },
            {
                id: 'editors',
                labelKey: 'nav.editors',
                icon: <FileCode size={18} />,
                color: '#06b6d4',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'cache',
                labelKey: 'nav.cache',
                icon: <HardDrive size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'webhooks',
                labelKey: 'nav.webhooks',
                icon: <Webhook size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'rotations',
                labelKey: 'nav.rotations',
                icon: <RefreshCw size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'service-registry',
                labelKey: 'nav.service_registry',
                icon: <Box size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'topology-templates',
                labelKey: 'nav.topology_templates',
                icon: <Grid3X3 size={18} />,
                color: '#06b6d4',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'playground',
                labelKey: 'nav.playground',
                icon: <FlaskConical size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'prompts',
                labelKey: 'nav.prompts',
                icon: <FileText size={18} />,
                color: '#06b6d4',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'prompt-versions',
                labelKey: 'nav.prompt_version_history',
                icon: <History size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'batch',
                labelKey: 'nav.batch_processing',
                icon: <ListOrdered size={18} />,
                color: '#10b981',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'workflows',
                labelKey: 'nav.workflows',
                icon: <GitPullRequest size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'security',
                labelKey: 'nav.security_scan',
                icon: <Shield size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'ab-testing',
                labelKey: 'nav.ab_testing',
                icon: <GitCompare size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'fine-tuning',
                labelKey: 'nav.fine_tuning',
                icon: <Brain size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'team-collaboration',
                labelKey: 'nav.team_collaboration',
                icon: <Users size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'community-hub',
                labelKey: 'nav.community_hub',
                icon: <Share2 size={18} />,
                color: '#f59e0b',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'google-studio',
                labelKey: 'nav.google_studio',
                icon: <Shield size={18} />,
                color: '#4285F4',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'google-cache',
                labelKey: 'nav.google_cache',
                icon: <ContainerIcon size={18} />,
                color: '#4285F4',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'gemini-live',
                labelKey: 'nav.gemini_live',
                icon: <Mic size={18} />,
                color: '#4285F4',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'meta-learning',
                labelKey: 'nav.meta_learning',
                icon: <Brain size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'quantum-inspiration',
                labelKey: 'nav.quantum_inspiration',
                icon: <Atom size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'model-distillation',
                labelKey: 'nav.model_distillation',
                icon: <Brain size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'deploy',
                labelKey: 'nav.deploy',
                icon: <Rocket size={18} />,
                color: '#22c55e',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'voice-input',
                labelKey: 'nav.voice_input',
                icon: <Mic size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'plugin-sdk',
                labelKey: 'nav.plugin_sdk',
                icon: <Puzzle size={18} />,
                color: '#a855f7',
                lazy: true,
                level: 'L2',
            },
        ],
    },

    // ═══════════════════════════════════════════════════════════
    // 9. SETTINGS — settings, policies, audit
    // ═══════════════════════════════════════════════════════════
    {
        id: 'section-settings',
        labelKey: 'nav.section_settings',
        items: [
            {
                id: 'settings',
                labelKey: 'nav.settings',
                icon: <Settings size={18} />,
                color: '#64748b',
                level: 'L0',
            },
            {
                id: 'policies',
                labelKey: 'nav.policies',
                icon: <Shield size={18} />,
                color: '#10b981',
                level: 'L1',
            },
            {
                id: 'policy-editor',
                labelKey: 'nav.policy_editor',
                icon: <Zap size={18} />,
                color: '#06b6d4',
                lazy: true,
                level: 'L2',
            },
            {
                id: 'audit',
                labelKey: 'nav.audit_log',
                icon: <SearchIcon size={18} />,
                color: '#94a3b8',
                level: 'L1',
            },
            {
                id: 'history',
                labelKey: 'nav.config_history',
                icon: <History size={18} />,
                color: '#f59e0b',
                level: 'L1',
            },
            {
                id: 'export-import',
                labelKey: 'nav.export_import',
                icon: <Database size={18} />,
                color: '#3b82f6',
                lazy: true,
                level: 'L1',
            },
            {
                id: 'time-machine',
                labelKey: 'nav.time_machine',
                icon: <ClockIcon size={18} />,
                color: '#8b5cf6',
                lazy: true,
                level: 'L2',
            },
        ],
    },
] as const;

// Lazy panels
const MissionControl = React.lazy(() => import('./components/LiveCognition/MissionControl'));
const LiveWorkspace = React.lazy(() => import('./components/LiveCognition/LiveWorkspace'));
const ChatPanel = React.lazy(() => import('./components/ChatPanel/ChatPanel'));
const CognitiveBuilder = React.lazy(() => import('./components/BuilderPanel/CognitiveBuilder'));
const DashboardPanel = React.lazy(() => import('./components/DashboardPanel/DashboardPanel'));
const TracesPanel = React.lazy(() => import('./components/TracesPanel/TracesPanel'));
const LogsPanel = React.lazy(() => import('./components/LogsPanel/LogsPanel'));
const MemoryPanel = React.lazy(() => import('./components/MemoryPanel/MemoryPanel'));
const HealthPanel = React.lazy(() => import('./components/HealthPanel/HealthPanel'));
const SystemHealthPanel = React.lazy(
    () => import('./components/SystemHealthPanel/SystemHealthPanel'),
);
const AquariumPanel = React.lazy(() => import('./components/AquariumPanel/AquariumPanel'));
const DebateArena = React.lazy(() => import('./components/DebateArena/DebateArena'));
const ArgumentGraphPanel = React.lazy(
    () => import('./components/ArgumentGraphPanel/ArgumentGraphPanel'),
);
const DebateReplayPanel = React.lazy(() => import('./components/DebateReplayPanel'));
const TournamentPanel = React.lazy(() => import('./components/TournamentPanel'));
const SREAgentPanel = React.lazy(() => import('./components/SREAgentPanel/SREAgentPanel'));
const WhatIfPanel = React.lazy(() => import('./components/WhatIfPanel/WhatIfPanel'));
const DocsHealthPanel = React.lazy(() => import('./components/DocsHealthPanel'));
const WebhooksPanel = React.lazy(() => import('./components/WebhooksPanel'));
const RotationsPanel = React.lazy(() => import('./components/RotationsPanel'));
const BudgetPanel = React.lazy(() => import('./components/BudgetPanel'));
const CostAnalyticsPanel = React.lazy(
    () => import('./components/CostAnalyticsPanel/CostAnalyticsPanel'),
);
const ProviderMarketplace = React.lazy(
    () => import('./components/ProviderMarketplace/ProviderMarketplace'),
);
const AgentMarketplacePanel = React.lazy(
    () => import('./components/AgentMarketplacePanel/AgentMarketplacePanel'),
);
const PressureMapPanelLazy = React.lazy(
    () => import('./components/PressureMapPanel/PressureMapPanel'),
);
const DiagnosticPanel = React.lazy(() => import('./components/DiagnosticPanel/DiagnosticPanel'));
const ShadowPanel = React.lazy(() => import('./components/ShadowPanel/ShadowPanel'));
const CausalDebugger = React.lazy(() => import('./components/CausalDebugger/CausalDebugger'));
const CounterfactualPanel = React.lazy(
    () => import('./components/CounterfactualPanel/CounterfactualPanel'),
);
const SessionBindingsPanel = React.lazy(
    () => import('./components/SessionBindingsPanel/SessionBindingsPanel'),
);
const CachePanel = React.lazy(() => import('./components/CachePanel'));
const BookmarksPanel = React.lazy(() => import('./components/BookmarksPanel/BookmarksPanel'));
const DebateAnalysisPanel = React.lazy(() => import('./components/DebateAnalysisPanel'));
const TopicSuggesterPanel = React.lazy(() => import('./components/TopicSuggesterPanel'));
const DebatesManagerPanel = React.lazy(
    () => import('./components/DebatesManager/DebatesManagerPanel'),
);
const ChatSessionsManagerPanel = React.lazy(
    () => import('./components/ChatSessionsManager/ChatSessionsManagerPanel'),
);
const SessionHubPanel = React.lazy(() => import('./components/SessionHubPanel/SessionHubPanel'));
const KeyNotesPanel = React.lazy(() => import('./components/KeyNotesPanel'));
const AgentJournalPanel = React.lazy(() => import('./components/AgentJournalPanel'));
const DecisionLogPanel = React.lazy(() => import('./components/DecisionLogPanel'));
const StateInspectorPanel = React.lazy(
    () => import('./components/StateInspectorPanel/StateInspectorPanel'),
);
const PerformanceProfilerPanel = React.lazy(() => import('./components/PerformanceProfilerPanel'));
const ProviderDashboard = React.lazy(
    () => import('./components/ProviderDashboard/ProviderDashboard'),
);
const GroqSpeedDashboard = React.lazy(
    () => import('./components/ProviderManager/GroqSpeedDashboard'),
);
const DebateSystemResearch = React.lazy(
    () => import('./components/DebateResearch/DebateSystemResearch'),
);
const ProjectOsExplorer = React.lazy(() => import('./components/DebateResearch/ProjectOsExplorer'));
const HypothesisGenerator = React.lazy(
    () => import('./components/DebateResearch/HypothesisGenerator'),
);
const ArchitectureReview = React.lazy(
    () => import('./components/DebateResearch/ArchitectureReview'),
);
const PromptAudit = React.lazy(() => import('./components/DebateResearch/PromptAudit'));
const RoutingExperiments = React.lazy(
    () => import('./components/DebateResearch/RoutingExperiments'),
);
const GovStressTest = React.lazy(() => import('./components/DebateResearch/GovStressTest'));
const ObsGaps = React.lazy(() => import('./components/DebateResearch/ObsGaps'));
const RoutingIntelligence = React.lazy(
    () => import('./components/RoutingIntelligence/RoutingIntelligence'),
);
const RouterTraceView = React.lazy(() => import('./components/RouterTraceView/RouterTraceView'));
const DependencyMapPanel = React.lazy(
    () => import('./components/DependencyMapPanel/DependencyMapPanel'),
);
const ServiceRegistryPanel = React.lazy(
    () => import('./components/ServiceRegistryPanel/ServiceRegistryPanel'),
);
const GuardiansPanel = React.lazy(() => import('./components/GuardiansPanel/GuardiansPanel'));
const ModelComparePanel = React.lazy(
    () => import('./components/ModelComparePanel/ModelComparePanel'),
);
const PromptLibraryPanel = React.lazy(
    () => import('./components/PromptLibrary/PromptLibraryPanel'),
);
const BatchProcessingPanel = React.lazy(
    () => import('./components/BatchProcessor/BatchProcessingPanel'),
);
const WorkflowPanel = React.lazy(() => import('./components/Workflows/WorkflowPanel'));
const PromptSecurityPanel = React.lazy(
    () => import('./components/SecurityScan/PromptSecurityPanel'),
);
const MemoryPalacePanel = React.lazy(() => import('./components/MemoryPanel/MemoryPalacePanel'));
const EvalDatasetPanel = React.lazy(() => import('./components/EvalDatasets/EvalDatasetPanel'));
const CustomMetricsPanel = React.lazy(
    () => import('./components/CustomMetrics/CustomMetricsPanel'),
);
const CostOptimizationPanel = React.lazy(
    () => import('./components/CostOptimization/CostOptimizationPanel'),
);
const ABTestPanel = React.lazy(() => import('./components/ABTest/ABTestPanel'));
const PricingPanel = React.lazy(() => import('./components/AnalyticsPanel/PricingPanel'));
const PressureMap = React.lazy(() => import('./components/PressureMap/PressureMap'));
const GroupsPanel = React.lazy(() => import('./components/GroupsPanel/GroupsPanel'));
const WorkspacePanel = React.lazy(() => import('./components/WorkspacePanel/WorkspacePanel'));
const DebateWorkspacePanel = React.lazy(
    () => import('./components/DebatePanel/DebateWorkspacePanel'),
);
const DebateStrategyBuilderPanel = React.lazy(
    () => import('./components/DebatePanel/DebateStrategyBuilder'),
);
const DebateHistoryPage = React.lazy(() => import('./components/DebatePanel/DebateHistoryPage'));
const DebateLivePanel = React.lazy(() => import('./components/DebateLive/DebateLivePanel'));
const PolicyEditorPanelLazy = React.lazy(() => import('./components/PolicyEditorPanel'));
const RolesConsortiaPanel = React.lazy(() => import('./components/RolesPanel/RolesConsortiaPanel'));
const ResearchEnginePanelLazy = React.lazy(
    () => import('./components/ResearchPanel/ResearchEnginePanel'),
);
const ResearchEngineAdvancedPanelLazy = React.lazy(
    () => import('./components/ResearchPanel/ResearchEngineAdvancedPanel'),
);
const EcosystemDashboardLazy = React.lazy(
    () => import('./components/AquariumPanel/EcosystemDashboard'),
);
const GoogleStudioPanelLazy = React.lazy(
    () => import('./components/GoogleStudio/GoogleStudioPanel'),
);
const GeminiLivePanelLazy = React.lazy(() => import('./components/GeminiLive/GeminiLivePanel'));
const GoogleCachePanelLazy = React.lazy(() => import('./components/GoogleCache/GoogleCachePanel'));
const MetaLearningPanelLazy = React.lazy(
    () => import('./components/MetaLearning/MetaLearningPanel'),
);
const GeminiResearchLazy = React.lazy(
    () => import('./components/GeminiResearch/GeminiResearchPanel'),
);
const QuantumInspirationPanelLazy = React.lazy(
    () => import('./components/QuantumInspiration/QuantumInspirationPanel'),
);
const AudiencePanelLazy = React.lazy(() => import('./components/AudiencePanel/AudiencePanel'));
const EditorsPanelLazy = React.lazy(() => import('./components/Editors/EditorsPanel'));
const TutorialPanelLazy = React.lazy(() => import('./components/TutorialPanel/TutorialPanel'));
const CommunityHubPanelLazy = React.lazy(
    () => import('./components/CommunityHub/CommunityHubPanel'),
);
const ExportImportPanelLazy = React.lazy(
    () => import('./components/ExportImport/ExportImportPanel'),
);
const CollaborationPanelLazy = React.lazy(
    () => import('./components/TeamCollaboration/CollaborationPanel'),
);
const FineTuningPanelLazy = React.lazy(() => import('./components/FineTuning/FineTuningPanel'));
const AgentComparisonPanelLazy = React.lazy(
    () => import('./components/AgentComparison/AgentComparisonPanel'),
);
const DebateTemplatesPanelLazy = React.lazy(
    () => import('./components/DebateTemplates/DebateTemplatesPanel'),
);
const SmartRoutingPanelLazy = React.lazy(
    () => import('./components/SmartRouting/SmartRoutingPanel'),
);
const NvidiaEnterprisePanelLazy = React.lazy(
    () => import('./components/NvidiaEnterprise/NvidiaEnterprisePanel'),
);
const HealthSlaPanelLazy = React.lazy(() => import('./components/HealthSla/HealthSlaPanel'));
const SocialLeaderboardPanelLazy = React.lazy(
    () => import('./components/SocialLeaderboard/SocialLeaderboardPanel'),
);
const ResearchReportPanelLazy = React.lazy(
    () => import('./components/ResearchReport/ResearchReportPanel'),
);
const VoiceInputPanelLazy = React.lazy(() => import('./components/VoiceInput/VoiceInputPanel'));
const AgentProtocolPanelLazy = React.lazy(
    () => import('./components/AgentProtocol/AgentProtocolPanel'),
);
const DistillationPanelLazy = React.lazy(
    () => import('./components/ModelDistillation/DistillationPanel'),
);
const DeployPanelLazy = React.lazy(() => import('./components/DeployToProduction/DeployPanel'));
const BudgetAlertsPanelLazy = React.lazy(
    () => import('./components/BudgetAlerts/BudgetAlertsPanel'),
);
const TopologyGalleryPanelLazy = React.lazy(
    () => import('./components/TopologyGallery/TopologyGalleryPanel'),
);
const KeyUsageAnalyticsPanelLazy = React.lazy(
    () => import('./components/KeyUsageAnalytics/KeyUsageAnalyticsPanel'),
);
const PromptVersionPanelLazy = React.lazy(
    () => import('./components/PromptVersionHistory/PromptVersionPanel'),
);

// ── Section 11 P2+P3 Lazy Imports ──────────────────
const FederatedMemoryPanelLazy = React.lazy(
    () => import('./components/FederatedMemory/FederatedMemoryPanel'),
);
const PluginSdkPanelLazy = React.lazy(() => import('./components/PluginSdk/PluginSdkPanel'));
const PersonaMarketplacePanelLazy = React.lazy(
    () => import('./components/PersonaMarketplace/PersonaMarketplacePanel'),
);
const PersonaPickerPanelLazy = React.lazy(
    () => import('./components/PersonaPicker/PersonaPickerPanel'),
);
const TemplateSharingPanelLazy = React.lazy(
    () => import('./components/TemplateSharing/TemplateSharingPanel'),
);
const MemoryTransferPanelLazy = React.lazy(
    () => import('./components/MemoryTransfer/MemoryTransferPanel'),
);
const AquariumTradingPanelLazy = React.lazy(
    () => import('./components/AquariumTrading/AquariumTradingPanel'),
);
const TimeMachinePanelLazy = React.lazy(() => import('./components/TimeMachine/TimeMachinePanel'));
const ContributionGraphPanelLazy = React.lazy(
    () => import('./components/ContributionGraph/ContributionGraphPanel'),
);

// Direct imports (non-lazy)
import ProviderManager from './components/ProviderManager/ProviderManager';
import AgentsPanel from './components/AgentsPanel/AgentsPanel';
import ToolsPanel from './components/ToolsPanel/ToolsPanel';
import ConnectorsPanel from './components/ConnectorsPanel/ConnectorsPanel';
import KnowledgePanel from './components/KnowledgePanel/KnowledgePanel';
import SettingsPanel from './components/SettingsPanel/SettingsPanel';
import DocumentationPanel from './components/DocumentationPanel/DocumentationPanel';
import AnalyticsPanel from './components/AnalyticsPanel/AnalyticsPanel';
import SkillsPanel from './components/SkillsPanel/SkillsPanel';
import TasksPanel from './components/TasksPanel/TasksPanel';
import RolesPanel from './components/RolesPanel/RolesPanel';
import ChatAdminPanel from './components/ChatAdminPanel/ChatAdminPanel';
import EventsTimeline from './components/EventsTimeline/EventsTimeline';
import AuditLogView from './components/AuditLogView/AuditLogView';
import ConfigHistoryView from './components/ConfigHistoryView/ConfigHistoryView';
import PoolStatusPanel from './components/PoolStatusPanel/PoolStatusPanel';
import PolicyPanel from './components/PolicyPanel/PolicyPanel';
import MCPPanel from './components/MCPPanel/MCPPanel';
import PatternsPanel from './components/PatternsPanel/PatternsPanel';

// Component map: nav id → React component (dashboard handled manually for onNavigate)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PANEL_COMPONENTS: Record<string, React.ComponentType<any>> = {
    analytics: AnalyticsPanel,
    pricing: PricingPanel,
    budget: BudgetPanel,
    'cost-analytics': CostAnalyticsPanel,
    routing: RoutingIntelligence,
    chat: ChatPanel,
    'chat-sessions': ChatSessionsManagerPanel,
    'session-hub': SessionHubPanel,
    bookmarks: BookmarksPanel,
    tasks: TasksPanel,
    files: WorkspacePanel,
    debate: DebateArena,
    builder: CognitiveBuilder,
    'debate-live': DebateLivePanel,
    'debate-workspace': DebateWorkspacePanel,
    'debate-replay': DebateReplayPanel,
    'debate-tournament': TournamentPanel,
    audience: AudiencePanelLazy,
    editors: EditorsPanelLazy,
    'argument-graph': ArgumentGraphPanel,
    'strategy-builder': DebateStrategyBuilderPanel,
    'debate-analysis': DebateAnalysisPanel,
    'debate-history': DebateHistoryPage,
    'debates-manager': DebatesManagerPanel,
    topics: TopicSuggesterPanel,
    agents: AgentsPanel,
    roles: RolesPanel,
    'roles-consortia': RolesConsortiaPanel,
    sre: SREAgentPanel,
    'agent-journal': AgentJournalPanel,
    mission: MissionControl,
    live: LiveWorkspace,
    'agent-marketplace': AgentMarketplacePanel,
    keys: ProviderManager,
    pools: PoolStatusPanel,
    groups: GroupsPanel,
    'key-notes': KeyNotesPanel,
    'provider-dashboard': ProviderDashboard,
    'groq-speed': GroqSpeedDashboard,
    'smart-routing': SmartRoutingPanelLazy,
    'nvidia-enterprise': NvidiaEnterprisePanelLazy,
    'provider-marketplace': ProviderMarketplace,
    connectors: ConnectorsPanel,
    mcp: MCPPanel,
    'session-bindings': SessionBindingsPanel,
    guardians: GuardiansPanel,
    playground: ModelComparePanel,
    prompts: PromptLibraryPanel,
    batch: BatchProcessingPanel,
    workflows: WorkflowPanel,
    security: PromptSecurityPanel,
    'cost-optimization': CostOptimizationPanel,
    'ab-testing': ABTestPanel,
    'custom-metrics': CustomMetricsPanel,
    logs: LogsPanel,
    debugger: TracesPanel,
    'router-trace': RouterTraceView,
    memory: MemoryPanel,
    'memory-palace': MemoryPalacePanel,
    health: HealthPanel,
    'system-health': SystemHealthPanel,
    'docs-health': DocsHealthPanel,
    pressure: PressureMap,
    'runtime-pressure': PressureMapPanelLazy,
    'what-if': WhatIfPanel,
    'dependency-map': DependencyMapPanel,
    diagnostics: DiagnosticPanel,
    'state-inspector': StateInspectorPanel,
    'performance-profiler': PerformanceProfilerPanel,
    shadow: ShadowPanel,
    'causal-debugger': CausalDebugger,
    counterfactual: CounterfactualPanel,
    aquarium: AquariumPanel,
    patterns: PatternsPanel,
    knowledge: KnowledgePanel,
    docs: DocumentationPanel,
    'decision-log': DecisionLogPanel,
    'project-os': ProjectOsExplorer,
    'hypothesis-gen': HypothesisGenerator,
    'research-advanced': ResearchEngineAdvancedPanelLazy,
    'research-gemini': GeminiResearchLazy,
    'eval-datasets': EvalDatasetPanel,
    'arch-review': ArchitectureReview,
    'prompt-audit': PromptAudit,
    'routing-experiments': RoutingExperiments,
    'gov-stress-test': GovStressTest,
    'obs-gaps': ObsGaps,
    'debate-system-research': DebateSystemResearch,
    'research-engine': ResearchEnginePanelLazy,
    ecosystem: EcosystemDashboardLazy,
    skills: SkillsPanel,
    tools: ToolsPanel,
    cache: CachePanel,
    webhooks: WebhooksPanel,
    rotations: RotationsPanel,
    'service-registry': ServiceRegistryPanel,
    'google-studio': GoogleStudioPanelLazy,
    'google-cache': GoogleCachePanelLazy,
    'gemini-live': GeminiLivePanelLazy,
    'meta-learning': MetaLearningPanelLazy,
    'quantum-inspiration': QuantumInspirationPanelLazy,
    tutorials: TutorialPanelLazy,
    'team-collaboration': CollaborationPanelLazy,
    'fine-tuning': FineTuningPanelLazy,
    'model-distillation': DistillationPanelLazy,
    deploy: DeployPanelLazy,
    'budget-alerts': BudgetAlertsPanelLazy,
    'topology-templates': TopologyGalleryPanelLazy,
    'key-usage-analytics': KeyUsageAnalyticsPanelLazy,
    'prompt-versions': PromptVersionPanelLazy,
    'community-hub': CommunityHubPanelLazy,
    'export-import': ExportImportPanelLazy,
    'agent-comparison': AgentComparisonPanelLazy,
    'debate-templates': DebateTemplatesPanelLazy,
    'health-sla': HealthSlaPanelLazy,
    leaderboard: SocialLeaderboardPanelLazy,
    'research-reports': ResearchReportPanelLazy,
    'voice-input': VoiceInputPanelLazy,
    'agent-protocol': AgentProtocolPanelLazy,
    settings: SettingsPanel,
    policies: PolicyPanel,
    'policy-editor': PolicyEditorPanelLazy,
    audit: AuditLogView,
    history: ConfigHistoryView,
    'federated-memory': FederatedMemoryPanelLazy,
    'plugin-sdk': PluginSdkPanelLazy,
    'persona-marketplace': PersonaMarketplacePanelLazy,
    'persona-picker': PersonaPickerPanelLazy,
    'template-sharing': TemplateSharingPanelLazy,
    'memory-export-import': MemoryTransferPanelLazy,
    'aquarium-trading': AquariumTradingPanelLazy,
    'time-machine': TimeMachinePanelLazy,
    'contribution-graph': ContributionGraphPanelLazy,
};

const NotFound: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchVal, setSearchVal] = useState('');
    const suggestions = React.useMemo(() => {
        const allItems = NAV_SECTIONS.flatMap((s) => s.items);
        const pathPart = location.pathname.split('/').filter(Boolean).pop()?.toLowerCase() || '';
        if (pathPart) {
            return allItems
                .filter((item) => {
                    const label = translate(item.labelKey).toLowerCase();
                    return label.includes(pathPart) || item.id.includes(pathPart);
                })
                .slice(0, 6);
        }
        return allItems.slice(0, 8);
    }, [location.pathname]);
    const filtered = React.useMemo(() => {
        if (!searchVal) return suggestions;
        const q = searchVal.toLowerCase();
        return NAV_SECTIONS.flatMap((s) => s.items)
            .filter((item) => {
                return translate(item.labelKey).toLowerCase().includes(q) || item.id.includes(q);
            })
            .slice(0, 8);
    }, [searchVal, suggestions]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60vh',
                gap: '1.5rem',
                padding: '2rem',
            }}
        >
            <div
                style={{
                    fontSize: '5rem',
                    fontWeight: 900,
                    color: '#64748b',
                    opacity: 0.15,
                    lineHeight: 1,
                    letterSpacing: '-0.05em',
                }}
            >
                404
            </div>
            <div style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: 600 }}>
                Page not found
            </div>
            <div
                style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    maxWidth: 400,
                    textAlign: 'center',
                }}
            >
                The page{' '}
                <code
                    style={{
                        color: '#ef4444',
                        background: 'rgba(239,68,68,0.1)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                    }}
                >
                    {location.pathname}
                </code>{' '}
                doesn't exist.
            </div>
            <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
                <Search
                    size={16}
                    style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#64748b',
                        pointerEvents: 'none',
                    }}
                />
                <input
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    placeholder="Search pages..."
                    autoFocus
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        color: '#e2e8f0',
                        fontSize: '0.9rem',
                        outline: 'none',
                    }}
                />
            </div>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    justifyContent: 'center',
                    maxWidth: 500,
                }}
            >
                {filtered.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => navigate(`/${item.id}`)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '0.5rem 1rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10,
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            transition: 'all 0.15s',
                        }}
                    >
                        {item.icon}
                        <span>{translate(item.labelKey)}</span>
                    </button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '0.6rem 1.2rem',
                        borderRadius: 8,
                        background: 'rgba(59,130,246,0.15)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        color: '#60a5fa',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    <Home size={16} /> Dashboard
                </button>
                <button
                    onClick={() => navigate('/chat')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '0.6rem 1.2rem',
                        borderRadius: 8,
                        background: 'rgba(16,185,129,0.15)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        color: '#34d399',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    <MessageSquare size={16} /> Chat
                </button>
            </div>
        </div>
    );
};

const PanelLoader: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
    <ErrorBoundary name={name} variant="panel">
        <Suspense
            fallback={
                <div style={{ padding: '2rem', color: '#64748b', textAlign: 'center' }}>
                    {translate('common.loading')}
                </div>
            }
        >
            {children}
        </Suspense>
    </ErrorBoundary>
);

export const AppRoutes: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <Routes location={location}>
            {/* ── Landing & dashboard (manual — special onNavigate prop) ── */}
            <Route
                path="/"
                element={
                    <PanelLoader name="Dashboard">
                        <DashboardPanel onNavigate={(p) => navigate(`/${p}`)} />
                    </PanelLoader>
                }
            />
            <Route
                path="/dashboard"
                element={
                    <PanelLoader name="Dashboard">
                        <DashboardPanel onNavigate={(p) => navigate(`/${p}`)} />
                    </PanelLoader>
                }
            />

            {/* ── Primary routes from registry ── */}
            {NAV_SECTIONS.flatMap((s) => s.items)
                .filter((i) => i.id !== 'dashboard')
                .map((item) => {
                    const Component = PANEL_COMPONENTS[item.id];
                    if (!Component) return null;
                    const routePath = item.path ?? `/${item.id}`;
                    return (
                        <Route
                            key={item.id}
                            path={routePath}
                            element={
                                item.lazy ? (
                                    <PanelLoader name={item.id}>
                                        <Component />
                                    </PanelLoader>
                                ) : (
                                    <ErrorBoundary name={item.id} variant="panel">
                                        <Component />
                                    </ErrorBoundary>
                                )
                            }
                        />
                    );
                })}

            {/* ── Redirects ── */}
            <Route path="/events" element={<Navigate to="/timeline" replace />} />
            <Route path="/message-search" element={<Navigate to="/chat" replace />} />
            <Route path="/chat-export" element={<Navigate to="/chat" replace />} />
            <Route
                path="/debate-runtime"
                element={<Navigate to="/debate?mode=runtime" replace />}
            />
            <Route path="/topic-suggester" element={<Navigate to="/topics" replace />} />

            {/* ── Nested URL aliases (debates/*) ── */}
            <Route
                path="/debates/arena"
                element={
                    <PanelLoader name="DebateArena">
                        <DebateArena />
                    </PanelLoader>
                }
            />
            <Route
                path="/debates/live"
                element={
                    <PanelLoader name="DebateLive">
                        <DebateLivePanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/debates/replay"
                element={
                    <PanelLoader name="DebateReplay">
                        <DebateReplayPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/debates/tournament"
                element={
                    <PanelLoader name="Tournament">
                        <TournamentPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/audience"
                element={
                    <PanelLoader name="Audience">
                        <AudiencePanelLazy />
                    </PanelLoader>
                }
            />
            <Route
                path="/editors"
                element={
                    <PanelLoader name="Editors">
                        <EditorsPanelLazy />
                    </PanelLoader>
                }
            />
            <Route
                path="/debates/history"
                element={
                    <PanelLoader name="DebateHistory">
                        <DebateHistoryPage />
                    </PanelLoader>
                }
            />
            <Route
                path="/debates/analysis"
                element={
                    <PanelLoader name="DebateAnalysis">
                        <DebateAnalysisPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/debates/graph"
                element={
                    <PanelLoader name="ArgumentGraph">
                        <ArgumentGraphPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/debates/topics"
                element={
                    <PanelLoader name="Topics">
                        <TopicSuggesterPanel />
                    </PanelLoader>
                }
            />

            {/* ── Nested URL aliases (diagnostics/*) ── */}
            <Route
                path="/diagnostics/logs"
                element={
                    <PanelLoader name="Logs">
                        <LogsPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/diagnostics/health"
                element={
                    <PanelLoader name="Health">
                        <HealthPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/diagnostics/system"
                element={
                    <PanelLoader name="SystemHealth">
                        <SystemHealthPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/diagnostics/traces"
                element={
                    <PanelLoader name="Traces">
                        <TracesPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/diagnostics/memory"
                element={
                    <PanelLoader name="Memory">
                        <MemoryPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/diagnostics/aquarium"
                element={
                    <PanelLoader name="Aquarium">
                        <AquariumPanel />
                    </PanelLoader>
                }
            />

            {/* ── Nested URL aliases (services/*) ── */}
            <Route
                path="/services/keys"
                element={
                    <ErrorBoundary name="Providers" variant="panel">
                        <ProviderManager />
                    </ErrorBoundary>
                }
            />
            <Route
                path="/services/groups"
                element={
                    <PanelLoader name="Groups">
                        <GroupsPanel />
                    </PanelLoader>
                }
            />
            <Route
                path="/services/connectors"
                element={
                    <ErrorBoundary name="Connectors" variant="panel">
                        <ConnectorsPanel />
                    </ErrorBoundary>
                }
            />
            <Route
                path="/services/mcp"
                element={
                    <ErrorBoundary name="MCP" variant="panel">
                        <MCPPanel />
                    </ErrorBoundary>
                }
            />

            {/* ── Legacy admin route (no nav entry) ── */}
            <Route
                path="/chat-admin"
                element={
                    <ErrorBoundary name="ChatAdmin" variant="panel">
                        <ChatAdminPanel />
                    </ErrorBoundary>
                }
            />

            {/* ── Legacy route for timeline/events ── */}
            <Route
                path="/timeline"
                element={
                    <PanelLoader name="Timeline">
                        <EventsTimeline />
                    </PanelLoader>
                }
            />

            {/* ── 404 catch-all ── */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};
