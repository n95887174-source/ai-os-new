import React, { useState, useEffect, useCallback } from 'react';
import { qualityImpactCollector, experimentEngine } from '../../kernel/instances';
import type {
    TechniqueImpactMetrics,
    QualityExperiment,
} from '../../kernel/contracts/quality-impact';
import { getTechniques } from '../../kernel/instances';

import { useTranslation } from '../../i18n/useTranslation';

type Tab = 'impact' | 'experiments' | 'export';

type SortKey = 'avgJudgeScoreDelta' | 'totalActivations' | 'confidence' | 'techniqueId';
type SortDir = 'asc' | 'desc';

const CONFIDENCE_ORDER: Record<string, number> = {
    very_high: 5,
    high: 4,
    medium: 3,
    low: 2,
    none: 1,
};

const CONFIDENCE_COLOR: Record<string, string> = {
    very_high: '#22c55e',
    high: '#86efac',
    medium: '#facc15',
    low: '#f97316',
    none: '#6b7280',
};

const PRETTY_CONFIDENCE: Record<string, string> = {
    very_high: 'Very High',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    none: 'None',
};

const STATUS_COLOR: Record<string, string> = {
    draft: '#6b7280',
    running: '#22c55e',
    completed: '#3b82f6',
    cancelled: '#f97316',
};

const containerStyle: React.CSSProperties = {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
};
const headerStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#f1f5f9',
};
const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '24px',
};

const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
    color: active ? '#60a5fa' : '#94a3b8',
    borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
    transition: 'all 0.15s',
    borderRadius: '8px 8px 0 0',
});

const statsRowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
};

const statCardStyle: React.CSSProperties = {
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
};

const statValueStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 700,
    color: '#f1f5f9',
    marginBottom: '4px',
};
const statLabelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const tableContainerStyle: React.CSSProperties = {
    background: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    overflow: 'hidden',
};

const tableHeaderStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 60px',
    padding: '12px 20px',
    background: 'rgba(15, 23, 42, 0.5)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    userSelect: 'none',
};

const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 60px',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s',
};

const expandedRowStyle: React.CSSProperties = {
    padding: '16px 20px 16px 40px',
    background: 'rgba(15, 23, 42, 0.3)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: 1.6,
};

const emptyStyle: React.CSSProperties = {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#64748b',
};

const badgeStyle = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    background: `${color}20`,
    color,
});

const deltaStyle = (value: number): React.CSSProperties => ({
    fontWeight: 600,
    color: value >= 0 ? '#22c55e' : '#ef4444',
});

const formatPct = (v: number): string => {
    if (v === 0) return '0%';
    const abs = Math.abs(v);
    if (abs < 0.001) return '<0.1%';
    return `${(v * 100).toFixed(1)}%`;
};

const ImpactTab: React.FC = () => {
    const { t } = useTranslation();
    const [metrics, setMetrics] = useState<TechniqueImpactMetrics[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('avgJudgeScoreDelta');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const refresh = useCallback(() => {
        try {
            const all = qualityImpactCollector.getAllMetrics();
            setMetrics(all ?? []);
        } catch {
            /* not initialized */
        }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 10000);
        return () => clearInterval(id);
    }, [refresh]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
        else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sorted = [...metrics].sort((a, b) => {
        let cmp: number;
        if (sortKey === 'techniqueId') cmp = a.techniqueId.localeCompare(b.techniqueId);
        else if (sortKey === 'confidence')
            cmp = (CONFIDENCE_ORDER[a.confidence] ?? 0) - (CONFIDENCE_ORDER[b.confidence] ?? 0);
        else if (sortKey === 'totalActivations') cmp = a.totalActivations - b.totalActivations;
        else cmp = a.avgJudgeScoreDelta - b.avgJudgeScoreDelta;
        return sortDir === 'desc' ? -cmp : cmp;
    });

    const totalSessions = metrics.reduce((s, m) => Math.max(s, m.totalSessions), 0);
    const totalActivations = metrics.reduce((s, m) => s + m.totalActivations, 0);
    const sortArrow = (key: SortKey): string =>
        sortKey === key ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '';

    return (
        <>
            <div style={statsRowStyle}>
                <div style={statCardStyle}>
                    <div style={statValueStyle}>{totalSessions}</div>
                    <div style={statLabelStyle}>{t('quality_impact.sessions') ?? 'Sessions'}</div>
                </div>
                <div style={statCardStyle}>
                    <div style={statValueStyle}>{metrics.length}/70</div>
                    <div style={statLabelStyle}>
                        {t('quality_impact.techniques') ?? 'Techniques'}
                    </div>
                </div>
                <div style={statCardStyle}>
                    <div style={statValueStyle}>{totalActivations}</div>
                    <div style={statLabelStyle}>
                        {t('quality_impact.activations') ?? 'Activations'}
                    </div>
                </div>
                <div style={statCardStyle}>
                    <div style={statValueStyle}>
                        {metrics.filter((m) => m.avgJudgeScoreDelta > 0).length}
                    </div>
                    <div style={statLabelStyle}>
                        {t('quality_impact.positive') ?? 'Positive Impact'}
                    </div>
                </div>
            </div>
            <div style={tableContainerStyle}>
                <div style={tableHeaderStyle} onClick={() => toggleSort('techniqueId')}>
                    <span>
                        {t('quality_impact.technique') ?? 'Technique'}
                        {sortArrow('techniqueId')}
                    </span>
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSort('avgJudgeScoreDelta');
                        }}
                    >
                        {t('quality_impact.delta') ?? 'ΔScore'}
                        {sortArrow('avgJudgeScoreDelta')}
                    </span>
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSort('totalActivations');
                        }}
                    >
                        {t('quality_impact.uses') ?? 'Uses'}
                        {sortArrow('totalActivations')}
                    </span>
                    <span
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSort('confidence');
                        }}
                    >
                        {t('quality_impact.confidence') ?? 'Confidence'}
                        {sortArrow('confidence')}
                    </span>
                    <span>{t('quality_impact.sessions_short') ?? 'Sess'}</span>
                    <span></span>
                </div>
                {sorted.length === 0 && (
                    <div style={emptyStyle}>{t('quality_impact.empty') ?? 'No data yet.'}</div>
                )}
                {sorted.map((m) => (
                    <React.Fragment key={m.techniqueId}>
                        <div
                            style={rowStyle}
                            onClick={() =>
                                setExpandedId(expandedId === m.techniqueId ? null : m.techniqueId)
                            }
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background =
                                    'rgba(148, 163, 184, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = 'transparent';
                            }}
                        >
                            <span style={{ fontWeight: 500, color: '#e2e8f0' }}>
                                {m.techniqueId}
                            </span>
                            <span style={deltaStyle(m.avgJudgeScoreDelta)}>
                                {m.avgJudgeScoreDelta >= 0 ? '+' : ''}
                                {formatPct(m.avgJudgeScoreDelta)}
                            </span>
                            <span style={{ color: '#94a3b8' }}>{m.totalActivations}</span>
                            <span>
                                <span
                                    style={badgeStyle(CONFIDENCE_COLOR[m.confidence] ?? '#6b7280')}
                                >
                                    {PRETTY_CONFIDENCE[m.confidence] ?? m.confidence}
                                </span>
                            </span>
                            <span style={{ color: '#94a3b8' }}>{m.totalSessions}</span>
                            <span style={{ color: '#64748b', fontSize: '16px' }}>
                                {expandedId === m.techniqueId ? '−' : '+'}
                            </span>
                        </div>
                        {expandedId === m.techniqueId && (
                            <div style={expandedRowStyle}>
                                <div style={{ marginBottom: '8px' }}>
                                    <strong>
                                        {t('quality_impact.detail_sessions') ?? 'Sessions'}:
                                    </strong>{' '}
                                    {m.sampleSizeOn} ON / {m.sampleSizeOff} OFF
                                </div>
                                {m.avgConfidenceDelta !== 0 && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <strong>
                                            {t('quality_impact.detail_confidence') ?? 'Conf Δ'}:
                                        </strong>{' '}
                                        <span style={deltaStyle(m.avgConfidenceDelta)}>
                                            {m.avgConfidenceDelta >= 0 ? '+' : ''}
                                            {formatPct(m.avgConfidenceDelta)}
                                        </span>
                                    </div>
                                )}
                                {m.avgRoundCountDelta !== 0 && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <strong>
                                            {t('quality_impact.detail_rounds') ?? 'Rounds Δ'}:
                                        </strong>{' '}
                                        <span style={deltaStyle(m.avgRoundCountDelta)}>
                                            {m.avgRoundCountDelta >= 0 ? '+' : ''}
                                            {formatPct(m.avgRoundCountDelta)}
                                        </span>
                                    </div>
                                )}
                                {m.avgTokenCostDelta !== 0 && (
                                    <div>
                                        <strong>
                                            {t('quality_impact.detail_tokens') ?? 'Tokens Δ'}:
                                        </strong>{' '}
                                        <span style={deltaStyle(-m.avgTokenCostDelta)}>
                                            {m.avgTokenCostDelta >= 0 ? '+' : ''}
                                            {formatPct(m.avgTokenCostDelta)}
                                        </span>
                                    </div>
                                )}
                                {m.pValue !== undefined && (
                                    <div style={{ marginTop: '8px', color: '#64748b' }}>
                                        p-value: {m.pValue.toFixed(4)}
                                    </div>
                                )}
                                <div
                                    style={{
                                        marginTop: '10px',
                                        paddingTop: '10px',
                                        borderTop: '1px solid rgba(148,163,184,0.15)',
                                    }}
                                >
                                    <div style={{ marginBottom: '6px' }}>
                                        <strong>
                                            {t('quality_impact.attribution_title') ?? 'Attribution'}
                                            :
                                        </strong>
                                    </div>
                                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                                        <div>
                                            <span style={{ color: '#94a3b8' }}>
                                                {t('quality_impact.last_touch') ?? 'Last-touch'}:
                                            </span>{' '}
                                            <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                                                {m.lastTouchCount ?? 0}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ color: '#94a3b8' }}>
                                                {t('quality_impact.frequency_title') ?? 'Frequency'}
                                                :
                                            </span>{' '}
                                            <span style={{ color: '#a78bfa', fontWeight: 600 }}>
                                                {((m.frequencyInBestRounds ?? 0) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ color: '#94a3b8' }}>Composite:</span>{' '}
                                            <span style={{ color: '#f472b6', fontWeight: 600 }}>
                                                {(
                                                    (m.lastTouchCount ?? 0) * 2 +
                                                    (m.frequencyInBestRounds ?? 0) * 100
                                                ).toFixed(0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </>
    );
};

const ExperimentsTab: React.FC = () => {
    const { t } = useTranslation();
    const [experiments, setExperiments] = useState<QualityExperiment[]>([]);
    const [expandedExp, setExpandedExp] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [expName, setExpName] = useState('');
    const [expSessions, setExpSessions] = useState('10');
    const [selectedTechs, setSelectedTechs] = useState<Record<string, boolean>>({});

    const allTechniques = getTechniques();

    const refresh = useCallback(() => {
        try {
            setExperiments(experimentEngine.getAllExperiments() ?? []);
        } catch {
            setExperiments([]);
        }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 10000);
        return () => clearInterval(id);
    }, [refresh]);

    const handleCreate = async () => {
        const techIds = Object.entries(selectedTechs)
            .filter(([, v]) => v)
            .map(([k]) => k);
        if (techIds.length === 0 || !expName.trim()) return;
        await experimentEngine.startExperiment({
            techniqueIds: techIds,
            name: expName.trim(),
            enabledOnInit: true,
        });
        setShowCreate(false);
        setExpName('');
        setExpSessions('10');
        setSelectedTechs({});
        refresh();
    };

    const handleStop = async (id: string) => {
        await experimentEngine.stopExperiment(id);
        refresh();
    };
    const handleDelete = async (id: string) => {
        await experimentEngine.deleteExperiment(id);
        refresh();
    };

    const toggleTech = (techId: string) =>
        setSelectedTechs((s) => ({ ...s, [techId]: !s[techId] }));

    const expRowStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1.5fr 100px',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'background 0.15s',
    };

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                }}
            >
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0' }}>
                    {t('quality_impact.experiments_title') ?? 'Experiments'}
                    <span
                        style={{
                            fontSize: '13px',
                            color: '#64748b',
                            fontWeight: 400,
                            marginLeft: '8px',
                        }}
                    >
                        {experiments.length}{' '}
                        {t('quality_impact.experiments_count') ?? 'experiments'}
                    </span>
                </div>
                <button
                    onClick={() => {
                        setShowCreate(!showCreate);
                        setExpName('');
                        setExpSessions('10');
                        setSelectedTechs({});
                    }}
                    style={{
                        padding: '8px 16px',
                        background: showCreate
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                        border: `1px solid ${showCreate ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                        borderRadius: '8px',
                        color: showCreate ? '#ef4444' : '#60a5fa',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                    }}
                >
                    {showCreate
                        ? (t('quality_impact.cancel') ?? 'Cancel')
                        : `+ ${t('quality_impact.create_experiment') ?? 'Create Experiment'}`}
                </button>
            </div>

            {showCreate && (
                <div
                    style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderRadius: '12px',
                        border: '1px solid rgba(148, 163, 184, 0.15)',
                        padding: '20px',
                        marginBottom: '20px',
                    }}
                >
                    <div
                        style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#e2e8f0',
                            marginBottom: '16px',
                        }}
                    >
                        {t('quality_impact.new_experiment') ?? 'New Experiment'}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                        <input
                            placeholder={
                                t('quality_impact.experiment_name_placeholder') ?? 'Experiment name'
                            }
                            value={expName}
                            onChange={(e) => setExpName(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: 'rgba(15, 23, 42, 0.5)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: '8px',
                                color: '#e2e8f0',
                                fontSize: '13px',
                            }}
                        />
                        <input
                            placeholder={t('quality_impact.sessions_placeholder') ?? 'Sessions'}
                            value={expSessions}
                            onChange={(e) => setExpSessions(e.target.value)}
                            type="number"
                            min="1"
                            max="100"
                            style={{
                                width: '100px',
                                padding: '8px 12px',
                                background: 'rgba(15, 23, 42, 0.5)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: '8px',
                                color: '#e2e8f0',
                                fontSize: '13px',
                            }}
                        />
                    </div>
                    <div style={{ maxHeight: '240px', overflow: 'auto', marginBottom: '16px' }}>
                        {(['P0', 'P1', 'P2'] as const).map((cat) => {
                            const techs = allTechniques.filter((t) => t.category === cat);
                            if (techs.length === 0) return null;
                            const catColor =
                                cat === 'P0' ? '#ef4444' : cat === 'P1' ? '#f59e0b' : '#3b82f6';
                            return (
                                <div key={cat} style={{ marginBottom: '8px' }}>
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: catColor,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            marginBottom: '6px',
                                        }}
                                    >
                                        {cat} — {techs.length}{' '}
                                        {t('quality_impact.techniques').toLowerCase()}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {techs.map((tech) => (
                                            <label
                                                key={tech.id}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    background: selectedTechs[tech.id]
                                                        ? `${catColor}20`
                                                        : 'rgba(15, 23, 42, 0.3)',
                                                    border: `1px solid ${selectedTechs[tech.id] ? catColor : 'transparent'}`,
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    color: selectedTechs[tech.id]
                                                        ? '#e2e8f0'
                                                        : '#94a3b8',
                                                    transition: 'all 0.1s',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedTechs[tech.id]}
                                                    onChange={() => toggleTech(tech.id)}
                                                    style={{ accentColor: catColor }}
                                                />
                                                {tech.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={
                            !expName.trim() ||
                            Object.values(selectedTechs).filter(Boolean).length === 0
                        }
                        style={{
                            padding: '8px 20px',
                            background: '#3b82f6',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '13px',
                            opacity:
                                !expName.trim() ||
                                Object.values(selectedTechs).filter(Boolean).length === 0
                                    ? 0.5
                                    : 1,
                        }}
                    >
                        {t('quality_impact.start_experiment') ?? 'Start Experiment'}
                    </button>
                </div>
            )}

            <div style={tableContainerStyle}>
                {experiments.length === 0 && !showCreate && (
                    <div style={emptyStyle}>
                        {t('quality_impact.no_experiments') ??
                            'No experiments yet. Create one to A/B test technique impact.'}
                    </div>
                )}
                {experiments.length > 0 && (
                    <>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 1.5fr 100px',
                                padding: '12px 20px',
                                background: 'rgba(15, 23, 42, 0.5)',
                                borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            <span>{t('quality_impact.experiment_name') ?? 'Name'}</span>
                            <span>{t('quality_impact.experiment_techniques') ?? 'Techniques'}</span>
                            <span>{t('quality_impact.experiment_progress') ?? 'Progress'}</span>
                            <span>{t('quality_impact.experiment_status') ?? 'Status'}</span>
                            <span></span>
                        </div>
                        {experiments.map((exp) => (
                            <React.Fragment key={exp.id}>
                                <div
                                    style={expRowStyle}
                                    onClick={() =>
                                        setExpandedExp(expandedExp === exp.id ? null : exp.id)
                                    }
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background =
                                            'rgba(148, 163, 184, 0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background =
                                            'transparent';
                                    }}
                                >
                                    <span style={{ fontWeight: 500, color: '#e2e8f0' }}>
                                        {exp.name}
                                    </span>
                                    <span style={{ color: '#94a3b8' }}>
                                        {exp.techniqueIds.length} techniques
                                    </span>
                                    <span style={{ color: '#94a3b8' }}>
                                        {exp.sessionsCompleted}/{exp.sessionsPlanned}
                                    </span>
                                    <span>
                                        <span
                                            style={badgeStyle(
                                                STATUS_COLOR[exp.status] ?? '#6b7280',
                                            )}
                                        >
                                            {exp.status}
                                        </span>
                                    </span>
                                    <span
                                        style={{
                                            display: 'flex',
                                            gap: '6px',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {exp.status === 'running' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStop(exp.id);
                                                }}
                                                style={{
                                                    padding: '4px 10px',
                                                    background: 'rgba(245, 158, 11, 0.15)',
                                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                                    borderRadius: '6px',
                                                    color: '#f59e0b',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {t('quality_impact.stop') ?? 'Stop'}
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(exp.id);
                                            }}
                                            style={{
                                                padding: '4px 10px',
                                                background: 'rgba(239, 68, 68, 0.15)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                borderRadius: '6px',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {t('quality_impact.delete') ?? 'Delete'}
                                        </button>
                                        <span
                                            style={{
                                                color: '#64748b',
                                                fontSize: '16px',
                                                marginLeft: '4px',
                                            }}
                                        >
                                            {expandedExp === exp.id ? '−' : '+'}
                                        </span>
                                    </span>
                                </div>
                                {expandedExp === exp.id && (
                                    <div
                                        style={{
                                            padding: '16px 20px 16px 40px',
                                            background: 'rgba(15, 23, 42, 0.3)',
                                            borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
                                            fontSize: '13px',
                                            color: '#cbd5e1',
                                        }}
                                    >
                                        <div style={{ marginBottom: '8px' }}>
                                            <strong>Created:</strong>{' '}
                                            {new Date(exp.createdAt).toLocaleString()}
                                        </div>
                                        <div style={{ marginBottom: '8px' }}>
                                            <strong>Techniques:</strong>{' '}
                                            {exp.techniqueIds.join(', ')}
                                        </div>
                                        {exp.result && (
                                            <div style={{ marginTop: '12px' }}>
                                                <div
                                                    style={{
                                                        fontWeight: 600,
                                                        color: '#e2e8f0',
                                                        marginBottom: '8px',
                                                    }}
                                                >
                                                    {t('quality_impact.results') ?? 'Results'}
                                                </div>
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                                                        gap: '8px',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: '#64748b',
                                                        }}
                                                    >
                                                        Technique
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: '#64748b',
                                                        }}
                                                    >
                                                        Avg ON
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: '#64748b',
                                                        }}
                                                    >
                                                        Avg OFF
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: '#64748b',
                                                        }}
                                                    >
                                                        Sessions
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontWeight: 600,
                                                            color: '#64748b',
                                                        }}
                                                    >
                                                        Confidence
                                                    </div>
                                                    {exp.result.techniqueResults.map((r) => (
                                                        <React.Fragment key={r.techniqueId}>
                                                            <div style={{ color: '#e2e8f0' }}>
                                                                {r.techniqueId}
                                                            </div>
                                                            <div style={deltaStyle(r.avgScoreOn)}>
                                                                {(r.avgScoreOn * 100).toFixed(1)}%
                                                            </div>
                                                            <div style={deltaStyle(r.avgScoreOff)}>
                                                                {(r.avgScoreOff * 100).toFixed(1)}%
                                                            </div>
                                                            <div style={{ color: '#94a3b8' }}>
                                                                {r.sessionsOn + r.sessionsOff}
                                                            </div>
                                                            <div>
                                                                <span
                                                                    style={badgeStyle(
                                                                        CONFIDENCE_COLOR[
                                                                            r.confidence
                                                                        ] ?? '#6b7280',
                                                                    )}
                                                                >
                                                                    {PRETTY_CONFIDENCE[
                                                                        r.confidence
                                                                    ] ?? r.confidence}
                                                                </span>
                                                            </div>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </>
                )}
            </div>
        </>
    );
};

const ExportTab: React.FC = () => {
    const { t } = useTranslation();
    const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
    const [copied, setCopied] = useState(false);

    const handleExportJSON = useCallback(() => {
        setExporting('json');
        try {
            const metrics = qualityImpactCollector.getAllMetrics();
            const history = qualityImpactCollector.getSessionHistory();
            const baselines = qualityImpactCollector.getBaselineSessions();
            const blob = new Blob(
                [JSON.stringify({ metrics, sessionHistory: history, baselines }, null, 2)],
                { type: 'application/json' },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quality-impact-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.warn('Export JSON failed', e);
        }
        setExporting(null);
    }, []);

    const handleExportCSV = useCallback(() => {
        setExporting('csv');
        try {
            const metrics = qualityImpactCollector.getAllMetrics();
            const header =
                'techniqueId,totalSessions,totalActivations,avgJudgeScoreDelta,confidence,pValue,sampleSizeOn,sampleSizeOff\n';
            const rows = metrics
                .map(
                    (m) =>
                        `"${m.techniqueId}",${m.totalSessions},${m.totalActivations},${m.avgJudgeScoreDelta},${m.confidence},${m.pValue ?? ''},${m.sampleSizeOn},${m.sampleSizeOff}`,
                )
                .join('\n');
            const blob = new Blob([header + rows], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quality-impact-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.warn('Export CSV failed', e);
        }
        setExporting('csv');
    }, []);

    const handleCopyJSON = useCallback(() => {
        try {
            const metrics = qualityImpactCollector.getAllMetrics();
            const history = qualityImpactCollector.getSessionHistory();
            const text = JSON.stringify({ metrics, sessionHistory: history }, null, 2);
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } catch {
            /* clipboard not available */
        }
    }, []);

    return (
        <div style={tableContainerStyle}>
            <div style={{ padding: '24px' }}>
                <div
                    style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#e2e8f0',
                        marginBottom: '20px',
                    }}
                >
                    {t('quality_impact.export_title') ?? 'Export Quality Impact Data'}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <button
                        onClick={handleExportJSON}
                        disabled={exporting !== null}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px',
                            color: '#60a5fa',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            opacity: exporting !== null ? 0.5 : 1,
                        }}
                    >
                        {exporting === 'json'
                            ? (t('quality_impact.exporting') ?? 'Exporting...')
                            : (t('quality_impact.export_json') ?? 'Export JSON')}
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={exporting !== null}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '8px',
                            color: '#22c55e',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            opacity: exporting !== null ? 0.5 : 1,
                        }}
                    >
                        {exporting === 'csv'
                            ? (t('quality_impact.exporting') ?? 'Exporting...')
                            : (t('quality_impact.export_csv') ?? 'Export CSV')}
                    </button>
                    <button
                        onClick={handleCopyJSON}
                        style={{
                            padding: '10px 20px',
                            background: 'rgba(148, 163, 184, 0.15)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: '8px',
                            color: copied ? '#22c55e' : '#94a3b8',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                        }}
                    >
                        {copied
                            ? (t('quality_impact.copied') ?? 'Copied!')
                            : (t('quality_impact.copy_json') ?? 'Copy JSON')}
                    </button>
                </div>

                <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                    {t('quality_impact.export_desc') ??
                        'Export metrics and session history for external analysis.'}
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                        marginTop: '16px',
                    }}
                >
                    {[
                        {
                            label: t('quality_impact.export_metrics') ?? 'Technique Metrics',
                            desc:
                                t('quality_impact.export_metrics_desc') ??
                                'Impact metrics per technique',
                        },
                        {
                            label: t('quality_impact.export_sessions') ?? 'Session History',
                            desc:
                                t('quality_impact.export_sessions_desc') ??
                                'All debate sessions with quality data',
                        },
                        {
                            label: t('quality_impact.export_baselines') ?? 'Baselines',
                            desc:
                                t('quality_impact.export_baselines_desc') ??
                                'Baseline sessions without techniques',
                        },
                    ].map((item) => (
                        <div
                            key={item.label}
                            style={{
                                background: 'rgba(15, 23, 42, 0.3)',
                                borderRadius: '8px',
                                padding: '16px',
                                border: '1px solid rgba(148, 163, 184, 0.08)',
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 600,
                                    color: '#e2e8f0',
                                    marginBottom: '4px',
                                    fontSize: '13px',
                                }}
                            >
                                {item.label}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{item.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const QualityImpactDashboardPanel: React.FC = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<Tab>('impact');

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>{t('quality_impact.title') ?? 'Quality Impact Dashboard'}</div>
            <div style={subtitleStyle}>
                {t('quality_impact.subtitle') ??
                    'Technique-level impact metrics from debate sessions'}
            </div>

            <div style={tabBarStyle}>
                {(['impact', 'experiments', 'export'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        style={tabStyle(activeTab === tab)}
                        onClick={() => setActiveTab(tab)}
                    >
                        {t(`quality_impact.tab_${tab}`) ??
                            tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {activeTab === 'impact' && <ImpactTab />}
            {activeTab === 'experiments' && <ExperimentsTab />}
            {activeTab === 'export' && <ExportTab />}
        </div>
    );
};

export default QualityImpactDashboardPanel;
