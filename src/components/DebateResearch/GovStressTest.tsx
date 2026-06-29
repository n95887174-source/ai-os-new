import React, { useState, useMemo, useCallback } from 'react';
import {
    Shield,
    Play,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Loader2,
    Download,
    Search,
    X,
    Filter,
    Lightbulb,
    BarChart3,
    FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { govStressTestService } from '../../kernel/instances';
import type { GovScenarioResult, GovScenarioOutcome } from '../../kernel/contracts/gov-stress-test';

const CATEGORY_COLORS: Record<string, string> = {
    SLA: '#06b6d4',
    Cost: '#f59e0b',
    Privacy: '#a855f7',
    'Rate Limit': '#3b82f6',
    Safety: '#ef4444',
    Content: '#f97316',
    Security: '#10b981',
};

const SCENARIO_COUNT = govStressTestService.getScenarios().length;

const GovStressTest: React.FC = () => {
    const navigate = useNavigate();
    const [results, setResults] = useState<GovScenarioResult[]>([]);
    const [running, setRunning] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const liveSnapshot = useMemo(() => govStressTestService.buildReport([]), []);

    const runAll = useCallback(() => {
        setRunning(true);
        setTimeout(() => {
            setResults(govStressTestService.runAllScenarios());
            setRunning(false);
        }, 800);
    }, []);

    const filtered = useMemo(() => {
        let list = results;
        if (categoryFilter !== 'all')
            list = list.filter((r) => r.scenario.category === categoryFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (r) =>
                    r.scenario.name.toLowerCase().includes(q) ||
                    r.scenario.description.toLowerCase().includes(q),
            );
        }
        return list;
    }, [results, categoryFilter, searchQuery]);

    const summary = useMemo(() => govStressTestService.summarize(results), [results]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const r of results)
            counts[r.scenario.category] = (counts[r.scenario.category] || 0) + 1;
        return counts;
    }, [results]);

    const exportReport = () => {
        const report = govStressTestService.buildReport(results);
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gov-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const iconForResult = (r: GovScenarioOutcome) => {
        switch (r) {
            case 'pass':
                return <CheckCircle size={14} color="#10b981" />;
            case 'warn':
                return <AlertTriangle size={14} color="#f59e0b" />;
            case 'block':
                return <XCircle size={14} color="#ef4444" />;
        }
    };

    return (
        <div
            style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            <div
                style={{
                    padding: '1.5rem 1.5rem 0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={20} color="#10b981" />
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                        Governance Stress Test
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button
                        onClick={() =>
                            navigate(
                                `/hypothesis-gen?source=${encodeURIComponent('src/kernel/services/policy-service.ts')}&title=${encodeURIComponent('Governance stress test results')}`,
                            )
                        }
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: 6,
                            border: '1px solid rgba(139,92,246,0.2)',
                            background: 'rgba(139,92,246,0.08)',
                            color: '#a855f7',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                        }}
                    >
                        <Lightbulb size={11} /> Hypothesis
                    </button>
                </div>
            </div>

            <div
                style={{
                    padding: '0.6rem 1.25rem',
                    display: 'flex',
                    gap: 8,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
            >
                <div
                    style={{
                        flex: 1,
                        padding: '0.5rem 0.7rem',
                        borderRadius: 8,
                        background: 'rgba(59,130,246,0.08)',
                        border: '1px solid rgba(59,130,246,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <Shield size={14} color="#60a5fa" />
                    <div>
                        <div
                            style={{
                                fontSize: '0.6rem',
                                color: '#64748b',
                                textTransform: 'uppercase',
                            }}
                        >
                            Policies
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa' }}>
                            {liveSnapshot.livePolicyCount}
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        flex: 1,
                        padding: '0.5rem 0.7rem',
                        borderRadius: 8,
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <FileText size={14} color="#f59e0b" />
                    <div>
                        <div
                            style={{
                                fontSize: '0.6rem',
                                color: '#64748b',
                                textTransform: 'uppercase',
                            }}
                        >
                            Violations
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f59e0b' }}>
                            {liveSnapshot.liveViolationCount}
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        flex: 1,
                        padding: '0.5rem 0.7rem',
                        borderRadius: 8,
                        background: 'rgba(168,85,247,0.08)',
                        border: '1px solid rgba(168,85,247,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <Shield size={14} color="#a855f7" />
                    <div>
                        <div
                            style={{
                                fontSize: '0.6rem',
                                color: '#64748b',
                                textTransform: 'uppercase',
                            }}
                        >
                            Roles
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#a855f7' }}>
                            {liveSnapshot.roleCount}
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        flex: 1,
                        padding: '0.5rem 0.7rem',
                        borderRadius: 8,
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <BarChart3 size={14} color="#10b981" />
                    <div>
                        <div
                            style={{
                                fontSize: '0.6rem',
                                color: '#64748b',
                                textTransform: 'uppercase',
                            }}
                        >
                            Scenarios
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>
                            {SCENARIO_COUNT}
                        </div>
                    </div>
                </div>
            </div>

            {results.length > 0 && (
                <div
                    style={{
                        padding: '0.6rem 1.25rem',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}
                >
                    <div style={{ display: 'flex', gap: 4, height: 24 }}>
                        {summary.passed > 0 && (
                            <div
                                style={{
                                    flex: summary.passed,
                                    background: '#10b98125',
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #10b98130',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.6rem',
                                        color: '#34d399',
                                        fontWeight: 700,
                                    }}
                                >
                                    {Math.round((summary.passed / summary.total) * 100)}% Pass
                                </span>
                            </div>
                        )}
                        {summary.warned > 0 && (
                            <div
                                style={{
                                    flex: summary.warned,
                                    background: '#f59e0b25',
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #f59e0b30',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.6rem',
                                        color: '#fbbf24',
                                        fontWeight: 700,
                                    }}
                                >
                                    {Math.round((summary.warned / summary.total) * 100)}% Warn
                                </span>
                            </div>
                        )}
                        {summary.blocked > 0 && (
                            <div
                                style={{
                                    flex: summary.blocked,
                                    background: '#ef444425',
                                    borderRadius: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #ef444430',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.6rem',
                                        color: '#f87171',
                                        fontWeight: 700,
                                    }}
                                >
                                    {Math.round((summary.blocked / summary.total) * 100)}% Block
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div
                style={{
                    padding: '0.5rem 1.25rem',
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
            >
                <button
                    onClick={() => setCategoryFilter('all')}
                    style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: 5,
                        border:
                            categoryFilter === 'all'
                                ? '1px solid rgba(255,255,255,0.15)'
                                : '1px solid transparent',
                        background:
                            categoryFilter === 'all' ? 'rgba(255,255,255,0.04)' : 'transparent',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    <Filter size={10} /> All{' '}
                    {results.length > 0 && (
                        <span style={{ color: '#64748b', fontSize: '0.6rem' }}>
                            ({results.length})
                        </span>
                    )}
                </button>
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
                    const count = categoryCounts[cat] || 0;
                    return (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
                            style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: 5,
                                border:
                                    categoryFilter === cat
                                        ? `1px solid ${color}40`
                                        : '1px solid transparent',
                                background: categoryFilter === cat ? `${color}12` : 'transparent',
                                color: categoryFilter === cat ? color : '#64748b',
                                cursor: 'pointer',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            {cat}{' '}
                            {count > 0 && (
                                <span style={{ color, fontSize: '0.6rem' }}>({count})</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div
                style={{
                    padding: '0.5rem 1.25rem',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
            >
                <button
                    onClick={runAll}
                    disabled={running}
                    style={{
                        padding: '0.45rem 1rem',
                        borderRadius: 7,
                        border: 'none',
                        background: '#10b981',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                    }}
                >
                    {running ? <Loader2 size={14} /> : <Play size={14} />}
                    {running ? 'Running...' : 'Run Test Suite'}
                </button>
                {results.length > 0 && (
                    <button
                        onClick={exportReport}
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: 6,
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <Download size={12} /> Export
                    </button>
                )}
                <div style={{ flex: 1 }} />
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: 5,
                        padding: '3px 7px',
                    }}
                >
                    <Search size={11} color="#64748b" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        style={{
                            width: 130,
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            color: '#e2e8f0',
                            fontSize: '0.72rem',
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            <X size={10} />
                        </button>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 1.25rem' }}>
                {filtered.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '3rem',
                            color: '#475569',
                            fontSize: '0.85rem',
                        }}
                    >
                        {running ? (
                            <>
                                <Loader2
                                    size={16}
                                    style={{ display: 'block', margin: '0 auto 8px' }}
                                />{' '}
                                Running scenarios...
                            </>
                        ) : (
                            'Run the test suite to see results.'
                        )}
                    </div>
                ) : (
                    filtered.map((r, i) => (
                        <div
                            key={`result-${i}`}
                            style={{
                                marginBottom: '0.4rem',
                                padding: '0.55rem 0.75rem',
                                borderRadius: 8,
                                background: 'rgba(0,0,0,0.2)',
                                border: `1px solid ${r.result === 'block' ? 'rgba(239,68,68,0.12)' : r.result === 'warn' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.08)'}`,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginBottom: 3,
                                }}
                            >
                                {iconForResult(r.result)}
                                <span
                                    style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        color: '#e2e8f0',
                                    }}
                                >
                                    {r.scenario.name}
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.62rem',
                                        color: CATEGORY_COLORS[r.scenario.category] || '#64748b',
                                        padding: '0.1rem 0.35rem',
                                        borderRadius: 3,
                                        background: `${CATEGORY_COLORS[r.scenario.category] || '#64748b'}15`,
                                    }}
                                >
                                    {r.scenario.category}
                                </span>
                            </div>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '0.7rem',
                                    color: '#94a3b8',
                                    lineHeight: 1.4,
                                }}
                            >
                                {r.scenario.description}
                            </p>
                            {r.violatedRules.length > 0 && (
                                <div
                                    style={{
                                        marginTop: 4,
                                        display: 'flex',
                                        gap: 3,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {r.violatedRules.map((rule, j) => (
                                        <span
                                            key={j}
                                            style={{
                                                fontSize: '0.62rem',
                                                padding: '0.1rem 0.35rem',
                                                borderRadius: 3,
                                                background: 'rgba(239,68,68,0.06)',
                                                color: '#ef4444',
                                            }}
                                        >
                                            {rule}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div
                                style={{
                                    marginTop: 4,
                                    fontSize: '0.65rem',
                                    color: '#64748b',
                                    fontStyle: 'italic',
                                }}
                            >
                                → {r.suggestedMitigation}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GovStressTest;
