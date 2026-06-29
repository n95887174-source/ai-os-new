import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    MessageSquare,
    Trash2,
    ChevronDown,
    ChevronRight,
    ChevronsDown,
    Check,
    X,
    Search,
    RotateCcw,
    Archive,
    Filter,
    BarChart3,
    Swords,
    Shield,
    Scale,
} from 'lucide-react';
import type { DebateSession } from '../../kernel/instances';
import { sessionManager } from '../../kernel/instances';
import { flex1Min0, textWeight600 } from '../../styles/common';
import { ConfirmDialog } from '../ConfirmDialog';

const PAGE_SIZE = 10;

const ROLE_ICONS: Record<string, React.ReactNode> = {
    pro: <Swords size={12} />,
    con: <Shield size={12} />,
    neutral: <Scale size={12} />,
};

interface DebateHistoryPanelProps {
    history: DebateSession[];
    expandedHistory: Set<string>;
    onToggleExpand: (id: string) => void;
    onRefresh: () => void;
    t: (key: string) => string;
}

const DebateHistoryPanel: React.FC<DebateHistoryPanelProps> = ({
    history,
    expandedHistory,
    onToggleExpand,
    onRefresh,
    t,
}) => {
    const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
    const [argDisplayCounts, setArgDisplayCounts] = useState<Record<string, number>>({});
    const [agentFilters, setAgentFilters] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [strategyFilter, setStrategyFilter] = useState<string>('all');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const getArgCount = (id: string) => argDisplayCounts[id] || 6;
    const loadMoreArgs = (id: string, total: number) =>
        setArgDisplayCounts((prev) => ({ ...prev, [id]: Math.min(getArgCount(id) + 10, total) }));
    const resetArgs = (id: string) => setArgDisplayCounts((prev) => ({ ...prev, [id]: 6 }));
    const getAgentFilter = (id: string) => agentFilters[id] || 'all';
    const setAgentFilter = (id: string, agentId: string) => {
        setAgentFilters((prev) => ({ ...prev, [id]: agentId }));
        resetArgs(id);
    };

    const strategies = useMemo(() => [...new Set(history.map((h) => h.strategy))], [history]);

    const filtered = useMemo(() => {
        let f = history;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            f = f.filter((h) => h.topic.toLowerCase().includes(q));
        }
        if (strategyFilter !== 'all') {
            f = f.filter((h) => h.strategy === strategyFilter);
        }
        return f;
    }, [history, searchQuery, strategyFilter]);

    const stats = useMemo(() => {
        if (filtered.length === 0) return null;
        const totalArgs = filtered.reduce((s, h) => s + (h.arguments?.length ?? 0), 0);
        const allRounds = filtered.map((h) => h.currentRound);
        return {
            total: filtered.length,
            avgArgs: Math.round(totalArgs / filtered.length),
            avgRounds: Math.round(allRounds.reduce((s, r) => s + r, 0) / filtered.length),
            longestArgs: Math.max(...filtered.map((h) => h.arguments?.length ?? 0)),
            longestRounds: Math.max(...allRounds),
        };
    }, [filtered]);

    const getPositionIcon = (position?: string) => {
        if (position === 'pro') return <Check size={12} color="#3b82f6" />;
        if (position === 'con') return <X size={12} color="#ef4444" />;
        return null;
    };

    const handleRestore = (id: string) => {
        const session = sessionManager.restoreDebateSession(id);
        if (session) onRefresh();
    };

    const handleDelete = (id: string) => {
        setDeleteConfirm(id);
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            sessionManager.deleteDebateHistory(deleteConfirm);
            onRefresh();
            setDeleteConfirm(null);
        }
    };

    const visible = filtered.slice(0, displayCount);
    const hasMore = visible.length < filtered.length;

    if (history.length === 0) {
        return (
            <div
                className="glass-panel"
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: 24,
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '2rem',
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        marginBottom: '1.5rem',
                        fontSize: '1.2rem',
                        fontWeight: 800,
                        color: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <Clock size={20} color="#3b82f6" /> {t('debate_runtime.title')}
                </h3>
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        gap: '1rem',
                        padding: '4rem',
                    }}
                >
                    <Clock size={48} opacity={0.3} />
                    <span style={textWeight600}>{t('debate.empty_history')}</span>
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                        {t('debate.empty_history_desc')}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="glass-panel"
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 24,
                border: '1px solid rgba(255,255,255,0.05)',
            }}
        >
            {/* Header + Stats */}
            <div
                style={{
                    flexShrink: 0,
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem',
                    }}
                >
                    <h3
                        style={{
                            margin: 0,
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <Clock size={20} color="#3b82f6" /> {t('debate_runtime.title')}{' '}
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                            ({filtered.length})
                        </span>
                    </h3>
                    <button
                        onClick={onRefresh}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: 6,
                            borderRadius: 6,
                        }}
                        title={t('common.refresh')}
                        aria-label={t('common.refresh')}
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>

                {/* Search + Filter */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '0.35rem 0.75rem',
                            borderRadius: 10,
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border)',
                        }}
                    >
                        <Search size={14} color="#64748b" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('debate.search_history') + '...'}
                            style={{
                                flex: 1,
                                background: 'none',
                                border: 'none',
                                color: '#e2e8f0',
                                fontSize: '0.8rem',
                                outline: 'none',
                            }}
                            aria-label={t('debate.search_history')}
                        />
                    </div>
                    <select
                        value={strategyFilter}
                        onChange={(e) => setStrategyFilter(e.target.value)}
                        style={{
                            padding: '0.35rem 0.6rem',
                            borderRadius: 10,
                            border: '1px solid var(--border)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#e2e8f0',
                            fontSize: '0.75rem',
                            outline: 'none',
                        }}
                        aria-label={t('debate.filter_strategy')}
                    >
                        <option value="all">{t('debate.all_strategies')}</option>
                        {strategies.map((s) => (
                            <option key={s} value={s}>
                                {s.replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Stats Counters */}
                {stats && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div
                            style={{
                                padding: '0.4rem 0.7rem',
                                borderRadius: 8,
                                background: 'rgba(59,130,246,0.1)',
                                border: '1px solid rgba(59,130,246,0.15)',
                                fontSize: '0.7rem',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <BarChart3 size={12} color="#3b82f6" /> {stats.total}{' '}
                            {t('debate.debates')}
                        </div>
                        <div
                            style={{
                                padding: '0.4rem 0.7rem',
                                borderRadius: 8,
                                background: 'rgba(16,185,129,0.1)',
                                border: '1px solid rgba(16,185,129,0.15)',
                                fontSize: '0.7rem',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <MessageSquare size={12} color="#10b981" /> Ø {stats.avgArgs}{' '}
                            {t('debate.arg_short')}
                        </div>
                        <div
                            style={{
                                padding: '0.4rem 0.7rem',
                                borderRadius: 8,
                                background: 'rgba(245,158,11,0.1)',
                                border: '1px solid rgba(245,158,11,0.15)',
                                fontSize: '0.7rem',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <ChevronsDown size={12} color="#f59e0b" /> Ø {stats.avgRounds}{' '}
                            {t('debate.rounds')}
                        </div>
                        <div
                            style={{
                                padding: '0.4rem 0.7rem',
                                borderRadius: 8,
                                background: 'rgba(168,85,247,0.1)',
                                border: '1px solid rgba(168,85,247,0.15)',
                                fontSize: '0.7rem',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <Filter size={12} color="#a855f7" /> {t('debate.longest')}:{' '}
                            {stats.longestRounds} {t('debate.rounds')} / {stats.longestArgs}{' '}
                            {t('debate.arg_short')}
                        </div>
                    </div>
                )}

                {searchQuery && filtered.length === 0 && (
                    <div
                        style={{
                            padding: '0.75rem',
                            fontSize: '0.8rem',
                            color: '#ef4444',
                            textAlign: 'center',
                        }}
                    >
                        {t('debate.no_results')}
                    </div>
                )}
            </div>

            {/* History List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <AnimatePresence>
                    {visible.map((h) => {
                        const isExpanded = expandedHistory.has(h.id);
                        const date = new Date(h.createdAt || 0);
                        return (
                            <motion.div
                                key={h.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                            >
                                <div
                                    onClick={() => onToggleExpand(h.id)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onToggleExpand(h.id);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={isExpanded}
                                    style={{
                                        padding: '1rem 1.25rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 12,
                                            background: 'rgba(59,130,246,0.15)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <MessageSquare size={20} color="#3b82f6" />
                                    </div>
                                    <div style={flex1Min0}>
                                        <div
                                            style={{
                                                fontSize: '0.95rem',
                                                fontWeight: 700,
                                                color: '#f8fafc',
                                                marginBottom: '0.25rem',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {h.topic}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '1rem',
                                                fontSize: '0.8rem',
                                                color: '#64748b',
                                            }}
                                        >
                                            <span>
                                                {(h.participants ?? []).length}{' '}
                                                {t('debate.participants')}
                                            </span>
                                            <span>
                                                {h.currentRound}/{h.maxRounds} {t('debate.rounds')}
                                            </span>
                                            <span>
                                                {(h.arguments ?? []).length} {t('debate.arguments')}
                                            </span>
                                            {date.getTime() > 0 && (
                                                <span>
                                                    {date.toLocaleDateString()}{' '}
                                                    {date.toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {/* Restore button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRestore(h.id);
                                            }}
                                            style={{
                                                background: 'rgba(16,185,129,0.1)',
                                                border: '1px solid rgba(16,185,129,0.2)',
                                                borderRadius: 8,
                                                padding: 6,
                                                color: '#10b981',
                                                cursor: 'pointer',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                            }}
                                            title={t('debate.restore')}
                                            aria-label={t('debate.restore')}
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                        {/* Archive button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                sessionManager.archiveDebateSession(h.id);
                                                onRefresh();
                                            }}
                                            style={{
                                                background: 'rgba(245,158,11,0.1)',
                                                border: '1px solid rgba(245,158,11,0.2)',
                                                borderRadius: 8,
                                                padding: 6,
                                                color: '#f59e0b',
                                                cursor: 'pointer',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                            }}
                                            title={t('debate.archive')}
                                            aria-label={t('debate.archive')}
                                        >
                                            <Archive size={14} />
                                        </button>
                                        {/* Delete button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(h.id);
                                            }}
                                            style={{
                                                background: 'rgba(239,68,68,0.1)',
                                                border: '1px solid rgba(239,68,68,0.2)',
                                                borderRadius: 8,
                                                padding: 6,
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                            }}
                                            title={t('debate.delete')}
                                            aria-label={t('debate.delete')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <div
                                            style={{
                                                padding: '2px 10px',
                                                borderRadius: 8,
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                background:
                                                    h.convergenceScore > 75
                                                        ? 'rgba(16,185,129,0.15)'
                                                        : h.convergenceScore > 40
                                                          ? 'rgba(245,158,11,0.15)'
                                                          : 'rgba(239,68,68,0.15)',
                                                color:
                                                    h.convergenceScore > 75
                                                        ? '#10b981'
                                                        : h.convergenceScore > 40
                                                          ? '#f59e0b'
                                                          : '#ef4444',
                                            }}
                                        >
                                            {Math.round(h.convergenceScore)}%
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown size={18} color="#64748b" />
                                        ) : (
                                            <ChevronRight size={18} color="#64748b" />
                                        )}
                                    </div>
                                </div>

                                {isExpanded &&
                                    (() => {
                                        const selectedAgent = getAgentFilter(h.id);
                                        const agentOptions = Array.from(
                                            (h.arguments ?? []).reduce(
                                                (acc, arg) =>
                                                    acc.set(
                                                        arg.agentId,
                                                        arg.agentName || arg.agentId,
                                                    ),
                                                new Map<string, string>(),
                                            ),
                                        );
                                        const filteredArguments =
                                            selectedAgent === 'all'
                                                ? (h.arguments ?? [])
                                                : (h.arguments ?? []).filter(
                                                      (arg) => arg.agentId === selectedAgent,
                                                  );
                                        const visibleArguments = filteredArguments.slice(
                                            -getArgCount(h.id),
                                        );
                                        return (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                style={{
                                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                                    padding: '1rem 1.25rem',
                                                    maxHeight: 400,
                                                    overflowY: 'auto',
                                                }}
                                            >
                                                {h.consensus && (
                                                    <div
                                                        style={{
                                                            marginBottom: '1rem',
                                                            padding: '0.75rem 1rem',
                                                            background: 'rgba(16,185,129,0.08)',
                                                            borderRadius: 12,
                                                            border: '1px solid rgba(16,185,129,0.15)',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize: '0.8rem',
                                                                fontWeight: 700,
                                                                color: '#10b981',
                                                                marginBottom: '0.5rem',
                                                            }}
                                                        >
                                                            {t('debate.consensus')}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: '0.9rem',
                                                                color: '#e2e8f0',
                                                                lineHeight: 1.5,
                                                            }}
                                                        >
                                                            {h.consensus}
                                                        </div>
                                                    </div>
                                                )}

                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '0.5rem',
                                                        marginBottom: '1rem',
                                                    }}
                                                >
                                                    {(h.participants ?? []).map((p) => (
                                                        <span
                                                            key={p.id}
                                                            style={{
                                                                padding: '4px 12px',
                                                                borderRadius: 20,
                                                                fontSize: '0.75rem',
                                                                fontWeight: 700,
                                                                background:
                                                                    p.role === 'pro'
                                                                        ? 'rgba(59,130,246,0.15)'
                                                                        : p.role === 'con'
                                                                          ? 'rgba(239,68,68,0.15)'
                                                                          : 'rgba(148,163,184,0.15)',
                                                                color:
                                                                    p.role === 'pro'
                                                                        ? '#3b82f6'
                                                                        : p.role === 'con'
                                                                          ? '#ef4444'
                                                                          : '#94a3b8',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 6,
                                                            }}
                                                        >
                                                            {ROLE_ICONS[p.role] || null}{' '}
                                                            {p.name || p.id}
                                                        </span>
                                                    ))}
                                                </div>

                                                {agentOptions.length > 1 && (
                                                    <div
                                                        style={{
                                                            marginBottom: '0.75rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                        }}
                                                    >
                                                        <Filter size={12} color="#64748b" />
                                                        <select
                                                            value={selectedAgent}
                                                            onChange={(e) =>
                                                                setAgentFilter(h.id, e.target.value)
                                                            }
                                                            style={{
                                                                padding: '0.25rem 0.5rem',
                                                                borderRadius: 6,
                                                                border: '1px solid var(--border)',
                                                                background: 'rgba(0,0,0,0.3)',
                                                                color: '#e2e8f0',
                                                                fontSize: '0.7rem',
                                                                outline: 'none',
                                                            }}
                                                            aria-label={t('debate.filter_agent')}
                                                        >
                                                            <option value="all">
                                                                {t('debate.all_agents')}
                                                            </option>
                                                            {agentOptions.map(
                                                                ([agentId, agentName]) => (
                                                                    <option
                                                                        key={agentId}
                                                                        value={agentId}
                                                                    >
                                                                        {agentName}
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                        <span
                                                            style={{
                                                                fontSize: '0.7rem',
                                                                color: '#64748b',
                                                            }}
                                                        >
                                                            {filteredArguments.length}/
                                                            {h.arguments?.length ?? 0}{' '}
                                                            {t('debate.arguments')}
                                                        </span>
                                                    </div>
                                                )}

                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.5rem',
                                                    }}
                                                >
                                                    {visibleArguments.map((arg) => (
                                                        <div
                                                            key={arg.id}
                                                            style={{
                                                                display: 'flex',
                                                                gap: '0.75rem',
                                                                padding: '0.5rem 0.75rem',
                                                                borderRadius: 12,
                                                                background:
                                                                    'rgba(255,255,255,0.03)',
                                                                alignItems: 'flex-start',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    width: 24,
                                                                    height: 24,
                                                                    borderRadius: 8,
                                                                    background:
                                                                        arg.position === 'pro'
                                                                            ? 'rgba(59,130,246,0.15)'
                                                                            : arg.position === 'con'
                                                                              ? 'rgba(239,68,68,0.15)'
                                                                              : 'rgba(148,163,184,0.15)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0,
                                                                    fontSize: '0.65rem',
                                                                    color:
                                                                        arg.position === 'pro'
                                                                            ? '#3b82f6'
                                                                            : arg.position === 'con'
                                                                              ? '#ef4444'
                                                                              : '#94a3b8',
                                                                }}
                                                            >
                                                                {getPositionIcon(arg.position)}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.5rem',
                                                                        marginBottom: '0.2rem',
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            fontSize: '0.78rem',
                                                                            fontWeight: 800,
                                                                            color: '#e2e8f0',
                                                                        }}
                                                                    >
                                                                        {arg.agentName ||
                                                                            arg.agentId}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            fontSize: '0.65rem',
                                                                            color: '#64748b',
                                                                        }}
                                                                    >
                                                                        Round {arg.round}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            fontSize: '0.62rem',
                                                                            color: '#64748b',
                                                                        }}
                                                                    >
                                                                        {Math.round(
                                                                            arg.confidence * 100,
                                                                        )}
                                                                        %
                                                                    </span>
                                                                    {arg.provider && (
                                                                        <span
                                                                            style={{
                                                                                fontSize: '0.62rem',
                                                                                color: '#475569',
                                                                            }}
                                                                        >
                                                                            {arg.provider}/
                                                                            {arg.model}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        fontSize: '0.85rem',
                                                                        color: '#cbd5e1',
                                                                        lineHeight: 1.5,
                                                                    }}
                                                                >
                                                                    {arg.content.length > 200
                                                                        ? arg.content.slice(
                                                                              0,
                                                                              200,
                                                                          ) + '...'
                                                                        : arg.content}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {filteredArguments.length > getArgCount(h.id) ? (
                                                    <button
                                                        onClick={() =>
                                                            loadMoreArgs(
                                                                h.id,
                                                                filteredArguments.length,
                                                            )
                                                        }
                                                        style={{
                                                            marginTop: '0.75rem',
                                                            background: 'none',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: 8,
                                                            padding: '0.35rem 1rem',
                                                            color: '#64748b',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        +
                                                        {filteredArguments.length -
                                                            getArgCount(h.id)}{' '}
                                                        {t('debate.more_arguments') ||
                                                            'more arguments'}
                                                    </button>
                                                ) : filteredArguments.length > 6 ? (
                                                    <button
                                                        onClick={() => resetArgs(h.id)}
                                                        style={{
                                                            marginTop: '0.75rem',
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#64748b',
                                                            fontSize: '0.7rem',
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                        }}
                                                    >
                                                        {t('debate.show_less') || 'Show less'}
                                                    </button>
                                                ) : null}
                                            </motion.div>
                                        );
                                    })()}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {hasMore && (
                    <button
                        onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        <ChevronsDown size={16} />
                        {t('debate.load_more').replace(
                            '{0}',
                            String(filtered.length - visible.length),
                        )}
                    </button>
                )}
            </div>

            <ConfirmDialog
                open={!!deleteConfirm}
                title={t('debate.delete')}
                message={t('debate.delete_confirm')}
                variant="danger"
                confirmLabel={t('debate.delete')}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm(null)}
            />
        </div>
    );
};

export default DebateHistoryPanel;
