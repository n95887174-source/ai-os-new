import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    FileText,
    ChevronRight,
    ChevronDown,
    Plus,
    Trash2,
    Play,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    Zap,
    ExternalLink,
    Layers,
    Lightbulb,
    Quote,
    Copy,
} from 'lucide-react';
import { t as translate } from '../../i18n/translations';
import type {
    IResearchEngine,
    ResearchSession,
    EpistemicLoopResult,
    SourceType,
} from '../../kernel/contracts/research-engine';
import { researchEngine } from '../../kernel/instances';
import { sourceAdapterRegistry } from '../../kernel/services/research-adapters/source-adapter-registry';

const SOURCE_COLORS: Record<string, string> = {
    duckduckgo: '#de5833',
    google_custom_search: '#4285F4',
    wikipedia: '#636363',
    arxiv: '#b31b1b',
    pubmed: '#4b8bbe',
    pubmed_central: '#4b8bbe',
    semantic_scholar: '#1857b6',
    openalex: '#8c1515',
    crossref: '#1a7c3a',
    dblp: '#004b6e',
    core: '#e67e22',
    base: '#2ecc71',
    hal: '#9b59b6',
    openaire: '#e74c3c',
    biorxiv: '#3498db',
    medrxiv: '#2980b9',
    chemrxiv: '#1abc9c',
    news_api: '#f39c12',
    github: '#333333',
    stack_overflow: '#f48024',
    reddit: '#ff4500',
    google_patents: '#4285F4',
    wolfram_alpha: '#d95e27',
    ieee_xplore: '#00629B',
    acm_dl: '#008080',
    jstor: '#0080c3',
    scopus: '#e9711a',
    web_of_science: '#003399',
};

const SOURCE_LABELS: Record<string, string> = {
    duckduckgo: 'DuckDuckGo',
    google_custom_search: 'Google',
    wikipedia: 'Wikipedia',
    arxiv: 'ArXiv',
    pubmed: 'PubMed',
    pubmed_central: 'PMC',
    semantic_scholar: 'Semantic Sch.',
    openalex: 'OpenAlex',
    crossref: 'Crossref',
    dblp: 'DBLP',
    core: 'CORE',
    base: 'BASE',
    hal: 'HAL',
    openaire: 'OpenAIRE',
    biorxiv: 'BioRxiv',
    medrxiv: 'MedRxiv',
    chemrxiv: 'ChemRxiv',
    news_api: 'News API',
    github: 'GitHub',
    stack_overflow: 'Stack Overflow',
    reddit: 'Reddit',
    google_patents: 'Google Patents',
    wolfram_alpha: 'Wolfram Alpha',
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    idle: { color: '#64748b', icon: <Clock size={14} />, label: 'Idle' },
    formulating: { color: '#f59e0b', icon: <Loader2 size={14} />, label: 'Formulating' },
    searching: { color: '#3b82f6', icon: <Search size={14} />, label: 'Searching' },
    extracting: { color: '#8b5cf6', icon: <FileText size={14} />, label: 'Extracting' },
    synthesizing: { color: '#f59e0b', icon: <Zap size={14} />, label: 'Synthesizing' },
    complete: { color: '#22c55e', icon: <CheckCircle2 size={14} />, label: 'Complete' },
    error: { color: '#ef4444', icon: <AlertCircle size={14} />, label: 'Error' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: '0.7rem',
                fontWeight: 600,
                background: `${cfg.color}20`,
                color: cfg.color,
            }}
        >
            {cfg.icon} {cfg.label}
        </span>
    );
};

type CitationFormat = 'bibtex' | 'apa' | 'mla' | 'chicago';

const CITATION_FORMATS: { value: CitationFormat; label: string }[] = [
    { value: 'bibtex', label: 'BibTeX' },
    { value: 'apa', label: 'APA' },
    { value: 'mla', label: 'MLA' },
    { value: 'chicago', label: 'Chicago' },
];

const SessionCard: React.FC<{
    session: ResearchSession;
    expanded: boolean;
    onToggle: () => void;
    onRun: () => void;
    onDelete: () => void;
}> = ({ session, expanded, onToggle, onRun, onDelete }) => {
    const [citations, setCitations] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<CitationFormat>('bibtex');
    const [generating, setGenerating] = useState(false);

    const handleGenerateCitations = useCallback(async () => {
        setGenerating(true);
        try {
            const result = await researchEngine.generateCitations(session.id, selectedFormat);
            setCitations(result.content);
        } catch {
            setCitations('Failed to generate citations.');
        }
        setGenerating(false);
    }, [session.id, selectedFormat]);

    const handleCopyCitations = useCallback(() => {
        if (citations) navigator.clipboard.writeText(citations);
    }, [citations]);

    return (
        <motion.div
            layout
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                overflow: 'hidden',
            }}
        >
            <div
                onClick={onToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    userSelect: 'none',
                }}
            >
                {expanded ? (
                    <ChevronDown size={16} color="#64748b" />
                ) : (
                    <ChevronRight size={16} color="#64748b" />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#e2e8f0',
                            marginBottom: 2,
                        }}
                    >
                        {session.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        {session.loops.length} loop{session.loops.length !== 1 ? 's' : ''} ·{' '}
                        {new Date(session.createdAt).toLocaleString()}
                    </div>
                </div>
                <StatusBadge status={session.status} />
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRun();
                    }}
                    disabled={
                        session.status === 'searching' ||
                        session.status === 'extracting' ||
                        session.status === 'synthesizing'
                    }
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(34,197,94,0.3)',
                        background: 'rgba(34,197,94,0.1)',
                        color: '#22c55e',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        opacity:
                            session.status === 'searching' ||
                            session.status === 'extracting' ||
                            session.status === 'synthesizing'
                                ? 0.5
                                : 1,
                    }}
                >
                    <Play size={12} /> Run
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        opacity: 0.6,
                    }}
                >
                    <Trash2 size={14} />
                </button>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        <div
                            style={{
                                padding: '8px 16px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                            }}
                        >
                            {session.loops.length === 0 && (
                                <div
                                    style={{
                                        padding: '1rem',
                                        textAlign: 'center',
                                        color: '#64748b',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    No loops yet. Click{' '}
                                    <strong style={{ color: '#22c55e' }}>Run</strong> to start.
                                </div>
                            )}
                            {session.loops.map((loop, idx) => (
                                <LoopCard key={loop.question.id} loop={loop} index={idx} />
                            ))}
                            {session.loops.length > 0 && (
                                <>
                                    <div
                                        style={{
                                            height: 1,
                                            background: 'rgba(255,255,255,0.06)',
                                            margin: '4px 0',
                                        }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Quote size={14} color="#a855f7" />
                                        <span
                                            style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: '#e2e8f0',
                                            }}
                                        >
                                            Citations
                                        </span>
                                        <select
                                            value={selectedFormat}
                                            onChange={(e) =>
                                                setSelectedFormat(e.target.value as CitationFormat)
                                            }
                                            style={{
                                                fontSize: '0.7rem',
                                                padding: '3px 6px',
                                                borderRadius: 4,
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#94a3b8',
                                                outline: 'none',
                                            }}
                                        >
                                            {CITATION_FORMATS.map((f) => (
                                                <option key={f.value} value={f.value}>
                                                    {f.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleGenerateCitations}
                                            disabled={generating}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                padding: '4px 10px',
                                                borderRadius: 6,
                                                border: '1px solid rgba(168,85,247,0.3)',
                                                background: 'rgba(168,85,247,0.1)',
                                                color: '#a855f7',
                                                cursor: 'pointer',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {generating ? 'Generating...' : 'Generate'}
                                        </button>
                                        {citations && (
                                            <button
                                                onClick={handleCopyCitations}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    padding: '4px 10px',
                                                    borderRadius: 6,
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    background: 'transparent',
                                                    color: '#94a3b8',
                                                    cursor: 'pointer',
                                                    fontSize: '0.7rem',
                                                }}
                                            >
                                                <Copy size={12} /> Copy All
                                            </button>
                                        )}
                                    </div>
                                    {citations && (
                                        <pre
                                            style={{
                                                fontSize: '0.65rem',
                                                lineHeight: 1.5,
                                                color: '#94a3b8',
                                                background: 'rgba(0,0,0,0.2)',
                                                padding: 12,
                                                borderRadius: 8,
                                                overflow: 'auto',
                                                maxHeight: 300,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-all',
                                            }}
                                        >
                                            {citations}
                                        </pre>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const LoopCard: React.FC<{ loop: EpistemicLoopResult; index: number }> = ({ loop, index }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <motion.div
            layout
            style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                overflow: 'hidden',
            }}
        >
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                }}
            >
                <div
                    style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background:
                            loop.status === 'complete'
                                ? 'rgba(34,197,94,0.2)'
                                : loop.status === 'error'
                                  ? 'rgba(239,68,68,0.2)'
                                  : 'rgba(100,116,139,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color:
                            loop.status === 'complete'
                                ? '#22c55e'
                                : loop.status === 'error'
                                  ? '#ef4444'
                                  : '#64748b',
                    }}
                >
                    {index + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {loop.question.text.slice(0, 100)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 1 }}>
                        {loop.sources.length} sources · {loop.claims.length} claims
                        {loop.completedAt &&
                            ` · ${((loop.completedAt - loop.startedAt) / 1000).toFixed(1)}s`}
                    </div>
                </div>
                <StatusBadge status={loop.status} />
                {expanded ? (
                    <ChevronDown size={12} color="#64748b" />
                ) : (
                    <ChevronRight size={12} color="#64748b" />
                )}
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    >
                        <div
                            style={{
                                padding: '8px 12px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                fontSize: '0.75rem',
                            }}
                        >
                            {loop.synthesis && (
                                <>
                                    <div>
                                        <div
                                            style={{
                                                color: '#94a3b8',
                                                fontWeight: 600,
                                                marginBottom: 4,
                                            }}
                                        >
                                            Summary
                                        </div>
                                        <div style={{ color: '#cbd5e1', lineHeight: 1.5 }}>
                                            {loop.synthesis.summary}
                                        </div>
                                    </div>
                                    {loop.synthesis.keyFindings.length > 0 && (
                                        <div>
                                            <div
                                                style={{
                                                    color: '#94a3b8',
                                                    fontWeight: 600,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                Key Findings
                                            </div>
                                            {loop.synthesis.keyFindings.map((f, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: 'flex',
                                                        gap: 6,
                                                        marginBottom: 3,
                                                        color: '#cbd5e1',
                                                    }}
                                                >
                                                    <span style={{ color: '#22c55e' }}>•</span> {f}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {loop.synthesis.gaps.length > 0 && (
                                        <div>
                                            <div
                                                style={{
                                                    color: '#94a3b8',
                                                    fontWeight: 600,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                Gaps
                                            </div>
                                            {loop.synthesis.gaps.map((g, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: 'flex',
                                                        gap: 6,
                                                        marginBottom: 3,
                                                        color: '#f59e0b',
                                                    }}
                                                >
                                                    <AlertCircle size={12} /> {g}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {loop.synthesis.newQuestions.length > 0 && (
                                        <div>
                                            <div
                                                style={{
                                                    color: '#94a3b8',
                                                    fontWeight: 600,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                New Questions
                                            </div>
                                            {loop.synthesis.newQuestions.map((q, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: 'flex',
                                                        gap: 6,
                                                        marginBottom: 3,
                                                        color: '#a78bfa',
                                                    }}
                                                >
                                                    <Lightbulb size={12} /> {q}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                            {loop.sources.length > 0 && (
                                <div>
                                    <div
                                        style={{
                                            color: '#94a3b8',
                                            fontWeight: 600,
                                            marginBottom: 4,
                                        }}
                                    >
                                        Sources ({loop.sources.length})
                                    </div>
                                    {loop.sources.slice(0, 5).map((src) => (
                                        <div
                                            key={src.id}
                                            style={{
                                                display: 'flex',
                                                gap: 6,
                                                marginBottom: 2,
                                                color: '#64748b',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <ExternalLink size={10} />
                                            <span
                                                style={{
                                                    flex: 1,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {src.title}
                                            </span>
                                            {src.sourceType && (
                                                <span
                                                    style={{
                                                        fontSize: '0.6rem',
                                                        padding: '1px 5px',
                                                        borderRadius: 3,
                                                        background: `${SOURCE_COLORS[src.sourceType] || '#64748b'}22`,
                                                        color:
                                                            SOURCE_COLORS[src.sourceType] ||
                                                            '#64748b',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {SOURCE_LABELS[src.sourceType] ||
                                                        src.sourceType}
                                                </span>
                                            )}
                                            {src.authors && src.authors.length > 0 && (
                                                <span
                                                    style={{
                                                        fontSize: '0.6rem',
                                                        color: '#475569',
                                                        maxWidth: 100,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {src.authors[0]}
                                                    {src.authors.length > 1 ? ' et al.' : ''}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.65rem', color: '#475569' }}>
                                                {(src.relevanceScore * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {loop.error && (
                                <div style={{ color: '#ef4444', fontSize: '0.72rem' }}>
                                    Error: {loop.error}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export const ResearchEnginePanel: React.FC = () => {
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newQuestion, setNewQuestion] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showSourceConfig, setShowSourceConfig] = useState(false);
    const [enabledSources, setEnabledSources] = useState<SourceType[]>(
        sourceAdapterRegistry.getConfig().enabledSources,
    );
    const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const engineRef = useRef<IResearchEngine>(researchEngine);

    const sourceStats = sourceAdapterRegistry.getAllAdapters().reduce(
        (acc, a) => {
            acc.total++;
            acc.byCategory[a.category] = (acc.byCategory[a.category] || 0) + 1;
            if (enabledSources.includes(a.name)) acc.enabled++;
            return acc;
        },
        { total: 0, enabled: 0, byCategory: {} as Record<string, number> },
    );

    const toggleSource = useCallback((type: SourceType) => {
        setEnabledSources((prev) => {
            const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type];
            sourceAdapterRegistry.updateConfig({ enabledSources: next });
            return next;
        });
    }, []);

    const refresh = useCallback(() => {
        setSessions(engineRef.current.getAllSessions());
    }, []);

    useEffect(() => {
        refresh();
        refreshRef.current = setInterval(refresh, 2000);
        return () => {
            if (refreshRef.current) clearInterval(refreshRef.current);
        };
    }, [refresh]);

    const handleCreate = async () => {
        if (!newTitle.trim() || !newQuestion.trim()) return;
        try {
            await engineRef.current.startSession(newTitle.trim(), newQuestion.trim());
            setNewTitle('');
            setNewQuestion('');
            setShowForm(false);
            refresh();
        } catch {
            /**/
        }
    };

    const handleRun = async (id: string) => {
        try {
            await engineRef.current.runLoop(id);
        } catch {
            /**/
        } finally {
            refresh();
        }
    };

    const handleDelete = (id: string) => {
        engineRef.current.deleteSession(id);
        if (expandedId === id) setExpandedId(null);
        refresh();
    };

    return (
        <div style={{ padding: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem',
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
                        <Layers size={22} color="#8b5cf6" /> {translate('research_engine.title')}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                        {translate('research_engine.subtitle')}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => setShowSourceConfig(!showSourceConfig)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 12px',
                            borderRadius: 8,
                            background: 'rgba(100,116,139,0.15)',
                            border: '1px solid rgba(100,116,139,0.3)',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                        }}
                        title={`${sourceStats.enabled}/${sourceStats.total} sources enabled`}
                    >
                        <Search size={14} /> {sourceStats.enabled}/{sourceStats.total}{' '}
                        {translate('research_engine.sources')}
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            borderRadius: 8,
                            background: 'rgba(139,92,246,0.15)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            color: '#a78bfa',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                        }}
                    >
                        <Plus size={16} /> {translate('research_engine.new_session')}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {showSourceConfig && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', marginBottom: '1rem' }}
                    >
                        <div
                            style={{
                                background: 'rgba(100,116,139,0.05)',
                                border: '1px solid rgba(100,116,139,0.15)',
                                borderRadius: 12,
                                padding: '0.75rem 1rem',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginBottom: 8,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#94a3b8',
                                }}
                            >
                                <Search size={14} />{' '}
                                {translate('research_engine.available_sources')} (
                                {sourceStats.total})
                                <span
                                    style={{
                                        marginLeft: 'auto',
                                        fontSize: '0.65rem',
                                        fontWeight: 400,
                                        color: '#64748b',
                                    }}
                                >
                                    {sourceStats.enabled} active
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {sourceAdapterRegistry.getAllAdapters().map((adapter) => {
                                    const isEnabled = enabledSources.includes(adapter.name);
                                    return (
                                        <label
                                            key={adapter.name}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '3px 6px',
                                                borderRadius: 4,
                                                cursor: 'pointer',
                                                fontSize: '0.72rem',
                                                color: isEnabled ? '#e2e8f0' : '#475569',
                                                opacity: adapter.isRestricted ? 0.5 : 1,
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={() => toggleSource(adapter.name)}
                                                style={{ accentColor: '#8b5cf6' }}
                                            />
                                            <span
                                                style={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    background:
                                                        SOURCE_COLORS[adapter.name] || '#64748b',
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <span style={{ fontWeight: isEnabled ? 600 : 400 }}>
                                                {adapter.displayName}
                                            </span>
                                            {adapter.needsKey && (
                                                <span
                                                    style={{ fontSize: '0.6rem', color: '#f59e0b' }}
                                                >
                                                    🔑
                                                </span>
                                            )}
                                            {adapter.isRestricted && (
                                                <span
                                                    style={{ fontSize: '0.6rem', color: '#ef4444' }}
                                                >
                                                    🔒
                                                </span>
                                            )}
                                            <span
                                                style={{
                                                    fontSize: '0.6rem',
                                                    color: '#64748b',
                                                    marginLeft: 'auto',
                                                }}
                                            >
                                                {adapter.category}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', marginBottom: '1rem' }}
                    >
                        <div
                            style={{
                                background: 'rgba(139,92,246,0.05)',
                                border: '1px solid rgba(139,92,246,0.2)',
                                borderRadius: 12,
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                            }}
                        >
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder={translate('research_engine.title_placeholder')}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.2)',
                                    color: '#e2e8f0',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                }}
                            />
                            <textarea
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                placeholder={translate('research_engine.question_placeholder')}
                                rows={3}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.2)',
                                    color: '#e2e8f0',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                }}
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowForm(false)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 6,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'transparent',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                    }}
                                >
                                    {translate('common.cancel')}
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newTitle.trim() || !newQuestion.trim()}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: 'rgba(139,92,246,0.3)',
                                        color: '#c4b5fd',
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        opacity: !newTitle.trim() || !newQuestion.trim() ? 0.5 : 1,
                                    }}
                                >
                                    {translate('research_engine.start')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {sessions.length === 0 && !showForm && (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '3rem 1rem',
                        color: '#64748b',
                        fontSize: '0.85rem',
                        border: '1px dashed rgba(255,255,255,0.06)',
                        borderRadius: 12,
                    }}
                >
                    <Layers size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <div>{translate('research_engine.empty')}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                        {translate('research_engine.empty_desc')}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sessions.map((session) => (
                    <SessionCard
                        key={session.id}
                        session={session}
                        expanded={expandedId === session.id}
                        onToggle={() =>
                            setExpandedId(expandedId === session.id ? null : session.id)
                        }
                        onRun={() => handleRun(session.id)}
                        onDelete={() => handleDelete(session.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ResearchEnginePanel;
