import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BookOpen,
    GitBranch,
    Shield,
    AlertTriangle,
    FileText,
    Quote,
    Users,
    Compass,
    Layers,
    ChevronRight,
    Play,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Info,
    Copy,
    Check,
    Network,
} from 'lucide-react';
import { researchEngine } from '../../kernel/instances';
import type {
    IResearchEngine,
    ResearchSession,
    CitationGraph,
    KnowledgeGraph,
    SystematicReview,
    SystematicReviewConfig,
    FactCheckReport,
    AnomalyReport,
    SummarizationResult,
    SummaryStyle,
    SummaryLength,
    CitationExport,
    CitationFormat,
    PeerReview,
    DiscoveryResult,
    ResearchReport,
} from '../../kernel/contracts/research-engine';

const TAB_ICONS: Record<string, React.ReactNode> = {
    citation: <GitBranch size={16} />,
    knowledge: <Network size={16} />,
    review: <BookOpen size={16} />,
    factcheck: <Shield size={16} />,
    anomalies: <AlertTriangle size={16} />,
    summary: <FileText size={16} />,
    citations: <Quote size={16} />,
    peer: <Users size={16} />,
    discovery: <Compass size={16} />,
    report: <Layers size={16} />,
};

const TABS = [
    { id: 'citation', label: 'Citation Graph', color: '#3b82f6' },
    { id: 'knowledge', label: 'Knowledge Graph', color: '#8b5cf6' },
    { id: 'review', label: 'Systematic Review', color: '#10b981' },
    { id: 'factcheck', label: 'Fact-Check', color: '#f59e0b' },
    { id: 'anomalies', label: 'Anomalies', color: '#ef4444' },
    { id: 'summary', label: 'Summarize', color: '#06b6d4' },
    { id: 'citations', label: 'Cite', color: '#a855f7' },
    { id: 'peer', label: 'Peer Review', color: '#ec4899' },
    { id: 'discovery', label: 'Auto-Discovery', color: '#22c55e' },
    { id: 'report', label: 'Report', color: '#f97316' },
];

const StatusBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
    <span
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 6,
            fontSize: '0.7rem',
            fontWeight: 600,
            background: `${color}20`,
            color,
        }}
    >
        {label}
    </span>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({
    icon,
    title,
    desc,
}) => (
    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
        <div style={{ opacity: 0.3, marginBottom: 8 }}>{icon}</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: '0.75rem', marginTop: 4 }}>{desc}</div>
    </div>
);

const SectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({
    title,
    action,
}) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
        }}
    >
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>{title}</div>
        {action}
    </div>
);

const ActionButton: React.FC<{
    onClick: () => void;
    label: string;
    loading?: boolean;
    color?: string;
    disabled?: boolean;
}> = ({ onClick, label, loading, color = '#3b82f6', disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled || loading}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 8,
            border: `1px solid ${color}40`,
            background: `${color}15`,
            color,
            cursor: disabled || loading ? 'default' : 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600,
            opacity: disabled || loading ? 0.5 : 1,
        }}
    >
        {loading ? <Loader2 size={14} /> : <Play size={14} />} {label}
    </button>
);

const PrismaFlowVisual: React.FC<{ flow: SystematicReview['prismaFlow'] }> = ({ flow }) => {
    const steps = [
        { label: 'Identified', count: flow.identification, color: '#3b82f6' },
        { label: 'After Dedup', count: flow.afterDedup, color: '#6366f1' },
        { label: 'Screened', count: flow.screened, color: '#8b5cf6' },
        { label: 'Full Text', count: flow.fullTextAssessed, color: '#a855f7' },
        { label: 'Included', count: flow.included, color: '#22c55e' },
    ];
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {steps.map((s, i) => (
                <React.Fragment key={s.label}>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: `${s.color}15`,
                            minWidth: 60,
                        }}
                    >
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>
                            {s.count}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: 2 }}>
                            {s.label}
                        </div>
                    </div>
                    {i < steps.length - 1 && <ChevronRight size={14} color="#475569" />}
                </React.Fragment>
            ))}
        </div>
    );
};

export const ResearchEngineAdvancedPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState('citation');
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState<string | null>(null);

    // Data state per tab
    const [citationGraph, setCitationGraph] = useState<CitationGraph | undefined>();
    const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | undefined>();
    const [systematicReview, setSystematicReview] = useState<SystematicReview | undefined>();
    const [factCheckReport, setFactCheckReport] = useState<FactCheckReport | undefined>();
    const [anomalyReport, setAnomalyReport] = useState<AnomalyReport | undefined>();
    const [summaries, setSummaries] = useState<SummarizationResult[]>([]);
    const [summaryStyle, setSummaryStyle] = useState<SummaryStyle>('hybrid');
    const [summaryLength, setSummaryLength] = useState<SummaryLength>('normal');
    const [citationExport, setCitationExport] = useState<CitationExport | undefined>();
    const [citeFormat, setCiteFormat] = useState<CitationFormat>('bibtex');
    const [copied, setCopied] = useState(false);
    const [peerReview, setPeerReview] = useState<PeerReview | undefined>();
    const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | undefined>();
    const [researchReport, setResearchReport] = useState<ResearchReport | undefined>();
    const [reportFormat, setReportFormat] = useState<'markdown' | 'html' | 'json'>('markdown');

    // Review config
    const [reviewConfig, _setReviewConfig] = useState<SystematicReviewConfig>({
        inclusionCriteria: [],
        exclusionCriteria: [{ id: 'exc1', field: 'title', operator: 'contains', value: 'spam' }],
        maxSources: 50,
    });

    const engineRef = useRef<IResearchEngine>(researchEngine);
    const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refresh = useCallback(() => {
        setSessions(engineRef.current.getAllSessions());
    }, []);

    useEffect(() => {
        refresh();
        refreshRef.current = setInterval(refresh, 3000);
        return () => {
            if (refreshRef.current) clearInterval(refreshRef.current);
        };
    }, [refresh]);

    const selectedSession = sessions.find((s) => s.id === selectedSessionId);
    const allSourcesCount = selectedSession
        ? selectedSession.loops.reduce((s, l) => s + l.sources.length, 0)
        : 0;
    const allClaimsCount = selectedSession
        ? selectedSession.loops.reduce((s, l) => s + l.claims.length, 0)
        : 0;

    const withLoading = async (key: string, fn: () => Promise<void>) => {
        setLoading(key);
        try {
            await fn();
        } catch {
            /* ignore */
        } finally {
            setLoading(null);
        }
    };

    const handleCitation = () => {
        if (!selectedSessionId) return;
        withLoading('citation', async () => {
            const g = await engineRef.current.buildCitationGraph(selectedSessionId);
            setCitationGraph(g);
        });
    };

    const handleKnowledge = () => {
        if (!selectedSessionId) return;
        withLoading('knowledge', async () => {
            const g = await engineRef.current.buildKnowledgeGraph(selectedSessionId);
            setKnowledgeGraph(g);
        });
    };

    const handleReview = () => {
        if (!selectedSessionId) return;
        withLoading('review', async () => {
            const r = await engineRef.current.runSystematicReview(selectedSessionId, reviewConfig);
            setSystematicReview(r);
        });
    };

    const handleFactCheck = () => {
        if (!selectedSessionId) return;
        withLoading('factcheck', async () => {
            const r = await engineRef.current.runFactCheck(selectedSessionId);
            setFactCheckReport(r);
        });
    };

    const handleAnomalies = () => {
        if (!selectedSessionId) return;
        withLoading('anomalies', async () => {
            const r = await engineRef.current.detectAnomalies(selectedSessionId);
            setAnomalyReport(r);
        });
    };

    const handleSummary = () => {
        if (!selectedSessionId) return;
        withLoading('summary', async () => {
            await engineRef.current.generateSummary(selectedSessionId, summaryStyle, summaryLength);
            setSummaries(engineRef.current.getSummaries(selectedSessionId));
        });
    };

    const handleCitations = () => {
        if (!selectedSessionId) return;
        withLoading('citations', async () => {
            const r = await engineRef.current.generateCitations(selectedSessionId, citeFormat);
            setCitationExport(r);
        });
    };

    const handlePeerReview = () => {
        if (!selectedSessionId) return;
        withLoading('peer', async () => {
            const r = await engineRef.current.runPeerReview(selectedSessionId);
            setPeerReview(r);
        });
    };

    const handleDiscovery = () => {
        withLoading('discovery', async () => {
            const r = await engineRef.current.runDiscovery();
            setDiscoveryResult(r);
        });
    };

    const handleReport = () => {
        if (!selectedSessionId) return;
        withLoading('report', async () => {
            const r = await engineRef.current.generateResearchReport(
                selectedSessionId,
                reportFormat,
            );
            setResearchReport(r);
        });
    };

    const renderTabContent = () => {
        if (!selectedSession) {
            return (
                <EmptyState
                    icon={<Layers size={40} />}
                    title="Select a Session"
                    desc="Pick a research session from the sidebar to analyze"
                />
            );
        }

        switch (activeTab) {
            case 'citation':
                return (
                    <div>
                        <SectionHeader
                            title="Citation Graph"
                            action={
                                <ActionButton
                                    onClick={handleCitation}
                                    label="Build Graph"
                                    loading={loading === 'citation'}
                                />
                            }
                        />
                        {citationGraph ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(59,130,246,0.1)',
                                            border: '1px solid rgba(59,130,246,0.2)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Papers
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#60a5fa',
                                            }}
                                        >
                                            {citationGraph.totalPapers}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(139,92,246,0.1)',
                                            border: '1px solid rgba(139,92,246,0.2)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Citations
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#a78bfa',
                                            }}
                                        >
                                            {citationGraph.totalCitations}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(16,185,129,0.1)',
                                            border: '1px solid rgba(16,185,129,0.2)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Avg Influence
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#34d399',
                                            }}
                                        >
                                            {(citationGraph.avgInfluence * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(245,158,11,0.1)',
                                            border: '1px solid rgba(245,158,11,0.2)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            H-Index
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#fbbf24',
                                            }}
                                        >
                                            {citationGraph.hIndex}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    {citationGraph.links.length} citation links between{' '}
                                    {citationGraph.nodes.length} papers
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                icon={<GitBranch size={32} />}
                                title="No Citation Graph"
                                desc="Run analysis to build citation graph from sources"
                            />
                        )}
                    </div>
                );

            case 'knowledge':
                return (
                    <div>
                        <SectionHeader
                            title="Knowledge Graph"
                            action={
                                <ActionButton
                                    onClick={handleKnowledge}
                                    label="Extract Entities"
                                    loading={loading === 'knowledge'}
                                />
                            }
                        />
                        {knowledgeGraph ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(139,92,246,0.1)',
                                            border: '1px solid rgba(139,92,246,0.2)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Entities
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#a78bfa',
                                            }}
                                        >
                                            {knowledgeGraph.entities.length}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(59,130,246,0.1)',
                                            border: '1px solid rgba(59,130,246,0.2)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Relations
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#60a5fa',
                                            }}
                                        >
                                            {knowledgeGraph.relations.length}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(16,185,129,0.1)',
                                            border: '1px solid rgba(16,185,129,0.2)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Density
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#34d399',
                                            }}
                                        >
                                            {(knowledgeGraph.density * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#cbd5e1',
                                        marginTop: 8,
                                    }}
                                >
                                    Entities
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {knowledgeGraph.entities.slice(0, 15).map((e) => (
                                        <span
                                            key={e.id}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: 6,
                                                fontSize: '0.72rem',
                                                background: 'rgba(139,92,246,0.1)',
                                                color: '#c4b5fd',
                                                border: '1px solid rgba(139,92,246,0.2)',
                                            }}
                                        >
                                            {e.name}
                                            <span style={{ color: '#64748b', marginLeft: 4 }}>
                                                ({e.mentions})
                                            </span>
                                        </span>
                                    ))}
                                </div>
                                {knowledgeGraph.clusters.length > 0 && (
                                    <>
                                        <div
                                            style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                color: '#cbd5e1',
                                                marginTop: 8,
                                            }}
                                        >
                                            Clusters
                                        </div>
                                        {knowledgeGraph.clusters.map((c) => (
                                            <div
                                                key={c.id}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderRadius: 8,
                                                    background: 'rgba(16,185,129,0.05)',
                                                    border: '1px solid rgba(16,185,129,0.1)',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        color: '#34d399',
                                                    }}
                                                >
                                                    {c.label}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        color: '#64748b',
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Central: {c.centralConcept} · Cohesion:{' '}
                                                    {(c.cohesion * 100).toFixed(0)}% ·{' '}
                                                    {c.entityIds.length} entities
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        ) : (
                            <EmptyState
                                icon={<Network size={32} />}
                                title="No Knowledge Graph"
                                desc="Extract entities and relations from research data"
                            />
                        )}
                    </div>
                );

            case 'review':
                return (
                    <div>
                        <SectionHeader
                            title="Systematic Review (PRISMA)"
                            action={
                                <ActionButton
                                    onClick={handleReview}
                                    label="Run Review"
                                    loading={loading === 'review'}
                                />
                            }
                        />
                        {systematicReview ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <PrismaFlowVisual flow={systematicReview.prismaFlow} />
                                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: 8,
                                            background: 'rgba(16,185,129,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Included
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.2rem',
                                                fontWeight: 700,
                                                color: '#34d399',
                                            }}
                                        >
                                            {systematicReview.includedSources.length}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: 8,
                                            background: 'rgba(239,68,68,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Excluded
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.2rem',
                                                fontWeight: 700,
                                                color: '#f87171',
                                            }}
                                        >
                                            {systematicReview.excludedSources.length}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#cbd5e1',
                                    }}
                                >
                                    Bias Assessment
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {(
                                        [
                                            'selectionBias',
                                            'informationBias',
                                            'publicationBias',
                                            'overall',
                                        ] as const
                                    ).map((key) => (
                                        <div
                                            key={key}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                borderRadius: 6,
                                                textAlign: 'center',
                                                background:
                                                    systematicReview.biasAssessment[key] === 'low'
                                                        ? 'rgba(16,185,129,0.1)'
                                                        : systematicReview.biasAssessment[key] ===
                                                            'high'
                                                          ? 'rgba(239,68,68,0.1)'
                                                          : 'rgba(245,158,11,0.1)',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: '0.55rem',
                                                    color: '#64748b',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {key.replace(/([A-Z])/g, ' $1')}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.85rem',
                                                    fontWeight: 700,
                                                    marginTop: 2,
                                                    color:
                                                        systematicReview.biasAssessment[key] ===
                                                        'low'
                                                            ? '#34d399'
                                                            : systematicReview.biasAssessment[
                                                                    key
                                                                ] === 'high'
                                                              ? '#f87171'
                                                              : '#fbbf24',
                                                }}
                                            >
                                                {systematicReview.biasAssessment[key]}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                icon={<BookOpen size={32} />}
                                title="No Systematic Review"
                                desc="Run PRISMA systematic review with inclusion/exclusion criteria"
                            />
                        )}
                    </div>
                );

            case 'factcheck':
                return (
                    <div>
                        <SectionHeader
                            title="Fact-Checking"
                            action={
                                <ActionButton
                                    onClick={handleFactCheck}
                                    label="Verify Claims"
                                    loading={loading === 'factcheck'}
                                />
                            }
                        />
                        {factCheckReport ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(34,197,94,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Accuracy
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#22c55e',
                                            }}
                                        >
                                            {(factCheckReport.overallAccuracy * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(34,197,94,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Verified
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#22c55e',
                                            }}
                                        >
                                            {factCheckReport.verifiedCount}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(239,68,68,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Contradicted
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#ef4444',
                                            }}
                                        >
                                            {factCheckReport.contradictedCount}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(100,116,139,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Unverifiable
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#94a3b8',
                                            }}
                                        >
                                            {factCheckReport.unverifiableCount}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        maxHeight: 300,
                                        overflowY: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                    }}
                                >
                                    {factCheckReport.checks.slice(0, 20).map((c) => (
                                        <div
                                            key={c.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 8,
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                            }}
                                        >
                                            {c.status === 'supported' ? (
                                                <CheckCircle2
                                                    size={14}
                                                    color="#22c55e"
                                                    style={{ marginTop: 2 }}
                                                />
                                            ) : c.status === 'contradicted' ? (
                                                <AlertCircle
                                                    size={14}
                                                    color="#ef4444"
                                                    style={{ marginTop: 2 }}
                                                />
                                            ) : c.status === 'partially_supported' ? (
                                                <AlertCircle
                                                    size={14}
                                                    color="#f59e0b"
                                                    style={{ marginTop: 2 }}
                                                />
                                            ) : (
                                                <Info
                                                    size={14}
                                                    color="#64748b"
                                                    style={{ marginTop: 2 }}
                                                />
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        color: '#cbd5e1',
                                                    }}
                                                >
                                                    {c.claim}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.6rem',
                                                        color: '#64748b',
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {c.explanation}
                                                </div>
                                            </div>
                                            <StatusBadge
                                                label={c.status.replace(/_/g, ' ')}
                                                color={
                                                    c.status === 'supported'
                                                        ? '#22c55e'
                                                        : c.status === 'contradicted'
                                                          ? '#ef4444'
                                                          : c.status === 'partially_supported'
                                                            ? '#f59e0b'
                                                            : '#64748b'
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                icon={<Shield size={32} />}
                                title="No Fact-Check Results"
                                desc="Run verification on claims extracted during research"
                            />
                        )}
                    </div>
                );

            case 'anomalies':
                return (
                    <div>
                        <SectionHeader
                            title="Anomaly Detection"
                            action={
                                <ActionButton
                                    onClick={handleAnomalies}
                                    label="Scan for Anomalies"
                                    loading={loading === 'anomalies'}
                                />
                            }
                        />
                        {anomalyReport ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(239,68,68,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Critical
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#ef4444',
                                            }}
                                        >
                                            {anomalyReport.criticalCount}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(245,158,11,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Warnings
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#f59e0b',
                                            }}
                                        >
                                            {anomalyReport.warningCount}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(59,130,246,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Info
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#60a5fa',
                                            }}
                                        >
                                            {anomalyReport.infoCount}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        maxHeight: 350,
                                        overflowY: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                    }}
                                >
                                    {anomalyReport.anomalies.map((a) => {
                                        const sevColor =
                                            a.severity === 'critical'
                                                ? '#ef4444'
                                                : a.severity === 'warning'
                                                  ? '#f59e0b'
                                                  : '#3b82f6';
                                        return (
                                            <div
                                                key={a.id}
                                                style={{
                                                    padding: '10px 12px',
                                                    borderRadius: 8,
                                                    background: `${sevColor}08`,
                                                    border: `1px solid ${sevColor}20`,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    {a.severity === 'critical' ? (
                                                        <AlertCircle size={14} color={sevColor} />
                                                    ) : a.severity === 'warning' ? (
                                                        <AlertTriangle size={14} color={sevColor} />
                                                    ) : (
                                                        <Info size={14} color={sevColor} />
                                                    )}
                                                    <div
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            fontWeight: 600,
                                                            color: '#cbd5e1',
                                                        }}
                                                    >
                                                        {a.type.replace(/_/g, ' ')}
                                                    </div>
                                                    <StatusBadge
                                                        label={a.severity}
                                                        color={sevColor}
                                                    />
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        color: '#94a3b8',
                                                        marginTop: 4,
                                                        lineHeight: 1.4,
                                                    }}
                                                >
                                                    {a.description}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        color: '#60a5fa',
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Recommendation: {a.recommendation}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                icon={<AlertTriangle size={32} />}
                                title="No Anomalies Detected"
                                desc="Scan session data for contradictions, gaps, and inconsistencies"
                            />
                        )}
                    </div>
                );

            case 'summary':
                return (
                    <div>
                        <SectionHeader
                            title="Multi-Document Summarization"
                            action={
                                <ActionButton
                                    onClick={handleSummary}
                                    label="Generate Summary"
                                    loading={loading === 'summary'}
                                />
                            }
                        />
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <select
                                value={summaryStyle}
                                onChange={(e) => setSummaryStyle(e.target.value as SummaryStyle)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: '#0f172a',
                                    color: '#e2e8f0',
                                    fontSize: '0.72rem',
                                    outline: 'none',
                                }}
                            >
                                <option value="abstractive">Abstractive</option>
                                <option value="extractive">Extractive</option>
                                <option value="hybrid">Hybrid</option>
                            </select>
                            <select
                                value={summaryLength}
                                onChange={(e) => setSummaryLength(e.target.value as SummaryLength)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: '#0f172a',
                                    color: '#e2e8f0',
                                    fontSize: '0.72rem',
                                    outline: 'none',
                                }}
                            >
                                <option value="brief">Brief</option>
                                <option value="normal">Normal</option>
                                <option value="detailed">Detailed</option>
                            </select>
                        </div>
                        {summaries.length > 0 ? (
                            <div
                                style={{
                                    maxHeight: 400,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                }}
                            >
                                {summaries.map((s) => (
                                    <div
                                        key={s.id}
                                        style={{
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(6,182,212,0.05)',
                                            border: '1px solid rgba(6,182,212,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.72rem',
                                                color: '#cbd5e1',
                                                lineHeight: 1.6,
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {s.summary}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 12,
                                                marginTop: 8,
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                            }}
                                        >
                                            <span>
                                                {s.style} · {s.length}
                                            </span>
                                            <span>
                                                {(s.compressionRatio * 100).toFixed(0)}% compression
                                            </span>
                                            <span>{s.sourceCount} sources</span>
                                        </div>
                                        {s.keyPoints.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                <div
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 600,
                                                        color: '#22d3ee',
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    Key Points
                                                </div>
                                                {s.keyPoints.map((kp, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            fontSize: '0.68rem',
                                                            color: '#94a3b8',
                                                            marginBottom: 2,
                                                        }}
                                                    >
                                                        • {kp}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={<FileText size={32} />}
                                title="No Summaries"
                                desc="Generate extractive or abstractive summaries from research data"
                            />
                        )}
                    </div>
                );

            case 'citations':
                return (
                    <div>
                        <SectionHeader
                            title="Citation Generator"
                            action={
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <select
                                        value={citeFormat}
                                        onChange={(e) =>
                                            setCiteFormat(e.target.value as CitationFormat)
                                        }
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: 6,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: '#0f172a',
                                            color: '#e2e8f0',
                                            fontSize: '0.72rem',
                                            outline: 'none',
                                        }}
                                    >
                                        <option value="bibtex">BibTeX</option>
                                        <option value="apa">APA</option>
                                        <option value="mla">MLA</option>
                                        <option value="chicago">Chicago</option>
                                    </select>
                                    <ActionButton
                                        onClick={handleCitations}
                                        label="Generate"
                                        loading={loading === 'citations'}
                                    />
                                </div>
                            }
                        />
                        {citationExport ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {citationExport.entries.length} entries
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(citationExport.content);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'transparent',
                                            color: copied ? '#22c55e' : '#94a3b8',
                                            cursor: 'pointer',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        {copied ? <Check size={12} /> : <Copy size={12} />}{' '}
                                        {copied ? 'Copied' : 'Copy All'}
                                    </button>
                                </div>
                                <pre
                                    style={{
                                        padding: '12px',
                                        borderRadius: 8,
                                        background: '#0f172a',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        fontSize: '0.65rem',
                                        color: '#94a3b8',
                                        maxHeight: 400,
                                        overflow: 'auto',
                                        fontFamily: "'JetBrains Mono', monospace",
                                        lineHeight: 1.5,
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {citationExport.content}
                                </pre>
                            </div>
                        ) : (
                            <EmptyState
                                icon={<Quote size={32} />}
                                title="No Citations Generated"
                                desc="Generate BibTeX, APA, MLA, or Chicago citations from sources"
                            />
                        )}
                    </div>
                );

            case 'peer':
                return (
                    <div>
                        <SectionHeader
                            title="Peer Review Simulation"
                            action={
                                <ActionButton
                                    onClick={handlePeerReview}
                                    label="Run Review"
                                    loading={loading === 'peer'}
                                />
                            }
                        />
                        {peerReview ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(236,72,153,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Reviewers
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#f472b6',
                                            }}
                                        >
                                            {peerReview.reviewers.length}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(139,92,246,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Scores
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#a78bfa',
                                            }}
                                        >
                                            {peerReview.scores.overall}
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                /100
                                            </span>
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(34,197,94,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Decision
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                color: '#22c55e',
                                            }}
                                        >
                                            {peerReview.recommendation.replace(/_/g, ' ')}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {(
                                        [
                                            'originality',
                                            'methodology',
                                            'clarity',
                                            'significance',
                                        ] as const
                                    ).map((key) => (
                                        <div
                                            key={key}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                borderRadius: 6,
                                                textAlign: 'center',
                                                background: 'rgba(255,255,255,0.02)',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontSize: '0.55rem',
                                                    color: '#64748b',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {key}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '1rem',
                                                    fontWeight: 700,
                                                    color: '#cbd5e1',
                                                }}
                                            >
                                                {peerReview.scores[key]}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#cbd5e1',
                                        marginTop: 4,
                                    }}
                                >
                                    Comments
                                </div>
                                <div
                                    style={{
                                        maxHeight: 250,
                                        overflowY: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                    }}
                                >
                                    {peerReview.comments.map((c) => (
                                        <div
                                            key={c.id}
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: 6,
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: 600,
                                                        color: '#f472b6',
                                                    }}
                                                >
                                                    {peerReview.reviewers.find(
                                                        (r) => r.id === c.reviewerId,
                                                    )?.name || 'Reviewer'}
                                                </span>
                                                <StatusBadge
                                                    label={c.type.replace(/_/g, ' ')}
                                                    color={
                                                        c.type === 'major_issue'
                                                            ? '#ef4444'
                                                            : c.type === 'minor_issue'
                                                              ? '#f59e0b'
                                                              : c.type === 'question'
                                                                ? '#3b82f6'
                                                                : c.type === 'suggestion'
                                                                  ? '#06b6d4'
                                                                  : '#22c55e'
                                                    }
                                                />
                                                <span
                                                    style={{ fontSize: '0.6rem', color: '#64748b' }}
                                                >
                                                    {c.section}
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.7rem',
                                                    color: '#94a3b8',
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                {c.comment}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                icon={<Users size={32} />}
                                title="No Peer Reviews"
                                desc="Simulate multi-reviewer peer review on research output"
                            />
                        )}
                    </div>
                );

            case 'discovery':
                return (
                    <div>
                        <SectionHeader
                            title="Auto-Discovery"
                            action={
                                <ActionButton
                                    onClick={handleDiscovery}
                                    label="Discover Topics"
                                    loading={loading === 'discovery'}
                                />
                            }
                        />
                        {discoveryResult ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#cbd5e1',
                                    }}
                                >
                                    Topics
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {discoveryResult.topics.map((t) => (
                                        <div
                                            key={t.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '10px 12px',
                                                borderRadius: 8,
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '0.78rem',
                                                            fontWeight: 600,
                                                            color: '#e2e8f0',
                                                        }}
                                                    >
                                                        {t.name}
                                                    </span>
                                                    <StatusBadge
                                                        label={t.trend}
                                                        color={
                                                            t.trend === 'rising'
                                                                ? '#22c55e'
                                                                : t.trend === 'falling'
                                                                  ? '#ef4444'
                                                                  : t.trend === 'emerging'
                                                                    ? '#a855f7'
                                                                    : '#64748b'
                                                        }
                                                    />
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        color: '#64748b',
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {t.description}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                        color: '#cbd5e1',
                                                    }}
                                                >
                                                    {t.frequency}
                                                </div>
                                                <div
                                                    style={{ fontSize: '0.6rem', color: '#64748b' }}
                                                >
                                                    mentions
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {discoveryResult.emergingTopics.length > 0 && (
                                    <>
                                        <div
                                            style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                color: '#cbd5e1',
                                                marginTop: 8,
                                            }}
                                        >
                                            Emerging Topics
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {discoveryResult.emergingTopics.map((t) => (
                                                <span
                                                    key={t.id}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: 6,
                                                        fontSize: '0.72rem',
                                                        background: 'rgba(168,85,247,0.1)',
                                                        color: '#c4b5fd',
                                                        border: '1px solid rgba(168,85,247,0.2)',
                                                    }}
                                                >
                                                    {t.name}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}
                                <div
                                    style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        color: '#cbd5e1',
                                        marginTop: 4,
                                    }}
                                >
                                    Recommendations
                                </div>
                                {discoveryResult.recommendations.map((r) => (
                                    <div
                                        key={r.topicId}
                                        style={{
                                            padding: '8px 10px',
                                            borderRadius: 6,
                                            background: 'rgba(59,130,246,0.05)',
                                            border: '1px solid rgba(59,130,246,0.1)',
                                            fontSize: '0.72rem',
                                            color: '#94a3b8',
                                        }}
                                    >
                                        <span style={{ color: '#60a5fa' }}>⟫</span> {r.reason}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={<Compass size={32} />}
                                title="No Discovery Results"
                                desc="Scan all sessions to find trending and emerging research topics"
                            />
                        )}
                    </div>
                );

            case 'report':
                return (
                    <div>
                        <SectionHeader
                            title="Research Report Generator"
                            action={
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <select
                                        value={reportFormat}
                                        onChange={(e) =>
                                            setReportFormat(
                                                e.target.value as 'markdown' | 'html' | 'json',
                                            )
                                        }
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: 6,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: '#0f172a',
                                            color: '#e2e8f0',
                                            fontSize: '0.72rem',
                                            outline: 'none',
                                        }}
                                    >
                                        <option value="markdown">Markdown</option>
                                        <option value="html">HTML</option>
                                        <option value="json">JSON</option>
                                    </select>
                                    <ActionButton
                                        onClick={handleReport}
                                        label="Generate Report"
                                        loading={loading === 'report'}
                                    />
                                </div>
                            }
                        />
                        {researchReport ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(249,115,22,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Sections
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#fb923c',
                                            }}
                                        >
                                            {researchReport.sections.length}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(59,130,246,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Sources
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#60a5fa',
                                            }}
                                        >
                                            {researchReport.sources}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: 8,
                                            background: 'rgba(139,92,246,0.1)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: '#64748b',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            Citations
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '1.5rem',
                                                fontWeight: 700,
                                                color: '#a78bfa',
                                            }}
                                        >
                                            {researchReport.citations.length}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        maxHeight: 350,
                                        overflowY: 'auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                    }}
                                >
                                    {researchReport.sections.map((sec) => (
                                        <div
                                            key={sec.id}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: 8,
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginBottom: 4,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        color: '#e2e8f0',
                                                    }}
                                                >
                                                    {sec.title}
                                                </span>
                                                <span
                                                    style={{ fontSize: '0.6rem', color: '#64748b' }}
                                                >
                                                    {sec.wordCount} words
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: '0.68rem',
                                                    color: '#94a3b8',
                                                    lineHeight: 1.5,
                                                    whiteSpace: 'pre-wrap',
                                                }}
                                            >
                                                {sec.content.slice(0, 300)}
                                                {sec.content.length > 300 ? '...' : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {researchReport.peerReview && (
                                    <div
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: 8,
                                            background: 'rgba(236,72,153,0.05)',
                                            border: '1px solid rgba(236,72,153,0.15)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 600,
                                                color: '#f472b6',
                                                marginBottom: 4,
                                            }}
                                        >
                                            Peer Review Summary
                                        </div>
                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                            {researchReport.peerReview.summary}
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        const content = researchReport.sections
                                            .map((s) => `# ${s.title}\n\n${s.content}`)
                                            .join('\n\n---\n\n');
                                        navigator.clipboard.writeText(content);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        alignSelf: 'flex-end',
                                        padding: '6px 14px',
                                        borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'transparent',
                                        color: copied ? '#22c55e' : '#94a3b8',
                                        cursor: 'pointer',
                                        fontSize: '0.7rem',
                                    }}
                                >
                                    {copied ? <Check size={12} /> : <Copy size={12} />}{' '}
                                    {copied ? 'Copied' : 'Copy Report'}
                                </button>
                            </div>
                        ) : (
                            <EmptyState
                                icon={<Layers size={32} />}
                                title="No Reports Generated"
                                desc="Generate a comprehensive research report combining all analyses"
                            />
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div
            style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                }}
            >
                <div>
                    <div
                        style={{
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <Layers size={22} color="#8b5cf6" /> Research Engine — Advanced
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                        Citation Graph · Knowledge Graph · PRISMA · Fact-Check · Anomalies ·
                        Summarization · Citations · Peer Review · Auto-Discovery · Reports
                    </div>
                </div>
            </div>

            {/* Session Selector */}
            <div style={{ marginBottom: '1rem' }}>
                <select
                    value={selectedSessionId || ''}
                    onChange={(e) => {
                        setSelectedSessionId(e.target.value || null);
                        setCitationGraph(undefined);
                        setKnowledgeGraph(undefined);
                        setSystematicReview(undefined);
                        setFactCheckReport(undefined);
                        setAnomalyReport(undefined);
                        setSummaries([]);
                        setCitationExport(undefined);
                        setPeerReview(undefined);
                        setResearchReport(undefined);
                    }}
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: '#0f172a',
                        color: '#e2e8f0',
                        fontSize: '0.85rem',
                        outline: 'none',
                    }}
                >
                    <option value="">— Select Research Session —</option>
                    {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.title} ({s.loops.length} loops,{' '}
                            {s.loops.reduce((sum, l) => sum + l.sources.length, 0)} sources)
                        </option>
                    ))}
                </select>
            </div>

            {/* Session Info */}
            {selectedSession && (
                <div
                    style={{
                        display: 'flex',
                        gap: 12,
                        marginBottom: '1rem',
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(139,92,246,0.05)',
                        border: '1px solid rgba(139,92,246,0.1)',
                        fontSize: '0.72rem',
                        color: '#94a3b8',
                    }}
                >
                    <span>{selectedSession.loops.length} epistemic loops</span>
                    <span>{allSourcesCount} sources</span>
                    <span>{allClaimsCount} claims</span>
                    <span>{new Date(selectedSession.createdAt).toLocaleDateString()}</span>
                    <StatusBadge
                        label={selectedSession.status}
                        color={
                            selectedSession.status === 'complete'
                                ? '#22c55e'
                                : selectedSession.status === 'error'
                                  ? '#ef4444'
                                  : '#64748b'
                        }
                    />
                </div>
            )}

            {/* Tabs */}
            <div
                style={{
                    display: 'flex',
                    gap: 4,
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    padding: '4px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                }}
            >
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: 'none',
                            background: activeTab === tab.id ? `${tab.color}20` : 'transparent',
                            color: activeTab === tab.id ? tab.color : '#64748b',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontWeight: activeTab === tab.id ? 600 : 400,
                            transition: 'all 0.15s',
                        }}
                    >
                        {TAB_ICONS[tab.id]}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>{renderTabContent()}</div>
        </div>
    );
};

export default ResearchEngineAdvancedPanel;
