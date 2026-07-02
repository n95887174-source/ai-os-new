import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Sparkles,
    Shield,
    AlertTriangle,
    FileText,
    Users,
    Loader2,
    ExternalLink,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowRight,
    Star,
    Copy,
    Check,
} from 'lucide-react';
import type { ResearchSession } from '../../kernel/contracts/research-engine';
import {
    researchEngine,
    geminiResearchService as _geminiResearchService,
} from '../../kernel/instances';
const geminiResearch = _geminiResearchService;
import type {
    GeminiEnhancedSearchResult,
    GeminiClaimAnalysis,
    GeminiEnhancedSummary,
    GeminiAnomalyResult,
    GeminiPeerReviewOutput,
} from '../../kernel/contracts/gemini-research';

type TabId = 'search' | 'analysis' | 'summary' | 'anomalies' | 'peer-review';

const TABS: { id: TabId; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'search', label: 'Search', icon: <Search size={16} />, color: '#3b82f6' },
    { id: 'analysis', label: 'Fact-Check', icon: <Shield size={16} />, color: '#f59e0b' },
    { id: 'summary', label: 'Summary', icon: <FileText size={16} />, color: '#06b6d4' },
    { id: 'anomalies', label: 'Anomalies', icon: <AlertTriangle size={16} />, color: '#ef4444' },
    { id: 'peer-review', label: 'Peer Review', icon: <Users size={16} />, color: '#ec4899' },
];

const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 12,
};

const GeminiResearchPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('search');
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<GeminiEnhancedSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<GeminiClaimAnalysis[] | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [summaryResult, setSummaryResult] = useState<GeminiEnhancedSummary | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [anomalyResult, setAnomalyResult] = useState<GeminiAnomalyResult | null>(null);
    const [isDetectingAnomalies, setIsDetectingAnomalies] = useState(false);
    const [peerReviewResult, setPeerReviewResult] = useState<GeminiPeerReviewOutput | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (researchEngine) {
            setSessions(researchEngine.getAllSessions());
        }
    }, []);

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim() || !geminiResearch) return;
        setIsSearching(true);
        setError(null);
        try {
            const result = await geminiResearch.enhancedSearch(searchQuery);
            setSearchResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery]);

    const handleAnalyze = useCallback(async () => {
        if (!selectedSessionId || !geminiResearch) return;
        setIsAnalyzing(true);
        setError(null);
        try {
            const result = await geminiResearch.analyzeClaims(selectedSessionId);
            setAnalysisResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsAnalyzing(false);
        }
    }, [selectedSessionId]);

    const handleGenerateSummary = useCallback(async () => {
        if (!selectedSessionId || !geminiResearch) return;
        setIsGeneratingSummary(true);
        setError(null);
        try {
            const result = await geminiResearch.generateEnhancedSummary(selectedSessionId);
            setSummaryResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsGeneratingSummary(false);
        }
    }, [selectedSessionId]);

    const handleDetectAnomalies = useCallback(async () => {
        if (!selectedSessionId || !geminiResearch) return;
        setIsDetectingAnomalies(true);
        setError(null);
        try {
            const result = await geminiResearch.detectAnomalies(selectedSessionId);
            setAnomalyResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsDetectingAnomalies(false);
        }
    }, [selectedSessionId]);

    const handlePeerReview = useCallback(async () => {
        if (!selectedSessionId || !geminiResearch) return;
        setIsReviewing(true);
        setError(null);
        try {
            const result = await geminiResearch.runEnhancedPeerReview(selectedSessionId);
            setPeerReviewResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setIsReviewing(false);
        }
    }, [selectedSessionId]);

    const copyText = useCallback(async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            /* ignore */
        }
    }, []);

    const assessmentIcon = (status: string) => {
        switch (status) {
            case 'supported':
                return <CheckCircle2 size={14} style={{ color: '#22c55e' }} />;
            case 'contradicted':
                return <XCircle size={14} style={{ color: '#ef4444' }} />;
            case 'partially_supported':
                return <AlertCircle size={14} style={{ color: '#f59e0b' }} />;
            default:
                return <AlertCircle size={14} style={{ color: '#64748b' }} />;
        }
    };

    const recommendationColor = (rec: string) => {
        switch (rec) {
            case 'accept':
                return '#22c55e';
            case 'minor_revision':
                return '#3b82f6';
            case 'major_revision':
                return '#f59e0b';
            case 'reject':
                return '#ef4444';
            default:
                return '#64748b';
        }
    };

    return (
        <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Sparkles size={24} style={{ color: '#8b5cf6' }} />
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#e2e8f0' }}>
                    Gemini Research
                </h2>
                <span
                    style={{
                        fontSize: '0.65rem',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: '#8b5cf620',
                        color: '#8b5cf6',
                        fontWeight: 600,
                    }}
                >
                    LLM-POWERED
                </span>
                {geminiResearch && !geminiResearch.isAvailable && (
                    <span style={{ fontSize: '0.7rem', color: '#f59e0b', marginLeft: 8 }}>
                        ⚠ No Gemini key configured
                    </span>
                )}
            </div>

            {!geminiResearch && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: '#64748b' }}>
                    <Sparkles size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <div>Gemini Research service not available</div>
                    <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                        Ensure Gemini API key is configured
                    </div>
                </div>
            )}

            {error && (
                <div
                    style={{
                        ...cardStyle,
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.08)',
                        color: '#ef4444',
                        fontSize: '0.85rem',
                    }}
                >
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: '1px solid',
                            borderColor:
                                activeTab === tab.id ? tab.color : 'rgba(255,255,255,0.08)',
                            background: activeTab === tab.id ? `${tab.color}20` : 'transparent',
                            color: activeTab === tab.id ? tab.color : '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            transition: 'all 0.15s',
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Session selector for analysis tabs */}
            {activeTab !== 'search' && (
                <div style={{ marginBottom: 16 }}>
                    <label
                        style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            display: 'block',
                            marginBottom: 6,
                        }}
                    >
                        Research Session
                    </label>
                    <select
                        value={selectedSessionId}
                        onChange={(e) => {
                            setSelectedSessionId(e.target.value);
                            setAnalysisResult(null);
                            setSummaryResult(null);
                            setAnomalyResult(null);
                            setPeerReviewResult(null);
                        }}
                        style={{
                            width: '100%',
                            maxWidth: 400,
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(0,0,0,0.3)',
                            color: '#e2e8f0',
                            fontSize: '0.85rem',
                        }}
                    >
                        <option value="">Select a session...</option>
                        {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.title} ({s.loops.length} loops)
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* ═══════════════════ SEARCH TAB ═══════════════════ */}
                        {activeTab === 'search' && (
                            <div>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Ask a research question..."
                                        style={{
                                            flex: 1,
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'rgba(0,0,0,0.3)',
                                            color: '#e2e8f0',
                                            fontSize: '0.9rem',
                                        }}
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={
                                            isSearching || !searchQuery.trim() || !geminiResearch
                                        }
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '10px 18px',
                                            borderRadius: 8,
                                            border: 'none',
                                            background: isSearching ? '#3b82f640' : '#3b82f6',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                            opacity: !geminiResearch ? 0.4 : 1,
                                        }}
                                    >
                                        {isSearching ? (
                                            <Loader2 size={16} className="spin" />
                                        ) : (
                                            <Search size={16} />
                                        )}
                                        {isSearching ? 'Searching...' : 'Search with Gemini'}
                                    </button>
                                </div>

                                {searchResult && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={cardStyle}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: 12,
                                            }}
                                        >
                                            <h3
                                                style={{
                                                    margin: 0,
                                                    fontSize: '1rem',
                                                    color: '#e2e8f0',
                                                }}
                                            >
                                                Results
                                            </h3>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    gap: 12,
                                                    fontSize: '0.75rem',
                                                    color: '#64748b',
                                                }}
                                            >
                                                <span>
                                                    Confidence:{' '}
                                                    {(searchResult.confidence * 100).toFixed(0)}%
                                                </span>
                                                <span>Latency: {searchResult.latency}ms</span>
                                                <span>{searchResult.sources.length} sources</span>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.9rem',
                                                color: '#cbd5e1',
                                                lineHeight: 1.7,
                                                marginBottom: 12,
                                                whiteSpace: 'pre-wrap',
                                            }}
                                        >
                                            {searchResult.answer}
                                        </div>
                                        {searchResult.sources.length > 0 && (
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: '#64748b',
                                                        fontWeight: 600,
                                                        marginBottom: 8,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                    }}
                                                >
                                                    Sources
                                                </div>
                                                {searchResult.sources.map((s, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: 8,
                                                            padding: '6px 0',
                                                            borderBottom:
                                                                '1px solid rgba(255,255,255,0.05)',
                                                            fontSize: '0.8rem',
                                                            color: '#94a3b8',
                                                        }}
                                                    >
                                                        <ExternalLink
                                                            size={12}
                                                            style={{
                                                                marginTop: 3,
                                                                flexShrink: 0,
                                                                color: '#3b82f6',
                                                            }}
                                                        />
                                                        <div>
                                                            <div
                                                                style={{
                                                                    color: '#60a5fa',
                                                                    fontWeight: 500,
                                                                }}
                                                            >
                                                                {s.title}
                                                            </div>
                                                            <div
                                                                style={{
                                                                    fontSize: '0.75rem',
                                                                    color: '#64748b',
                                                                    marginTop: 2,
                                                                }}
                                                            >
                                                                {s.snippet}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* ═══════════════════ FACT-CHECK TAB ═══════════════════ */}
                        {activeTab === 'analysis' && (
                            <div>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!selectedSessionId || isAnalyzing || !geminiResearch}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 16px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: isAnalyzing ? '#f59e0b40' : '#f59e0b',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        marginBottom: 16,
                                        opacity: !selectedSessionId || !geminiResearch ? 0.4 : 1,
                                    }}
                                >
                                    {isAnalyzing ? (
                                        <Loader2 size={16} className="spin" />
                                    ) : (
                                        <Shield size={16} />
                                    )}
                                    {isAnalyzing ? 'Analyzing...' : 'Analyze Claims with Gemini'}
                                </button>

                                {analysisResult && analysisResult.length === 0 && (
                                    <div
                                        style={{
                                            ...cardStyle,
                                            color: '#64748b',
                                            textAlign: 'center',
                                            padding: 30,
                                        }}
                                    >
                                        No claims found in this session
                                    </div>
                                )}

                                {analysisResult && analysisResult.length > 0 && (
                                    <div>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                            {[
                                                'supported',
                                                'contradicted',
                                                'partially_supported',
                                                'unverifiable',
                                            ].map((s) => {
                                                const count = analysisResult.filter(
                                                    (a) => a.assessment === s,
                                                ).length;
                                                const colors: Record<string, string> = {
                                                    supported: '#22c55e',
                                                    contradicted: '#ef4444',
                                                    partially_supported: '#f59e0b',
                                                    unverifiable: '#64748b',
                                                };
                                                return (
                                                    <div
                                                        key={s}
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: 6,
                                                            background: `${colors[s]}15`,
                                                            color: colors[s],
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {s.replace('_', ' ')}: {count}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {analysisResult.map((a) => (
                                            <div key={a.claimId} style={cardStyle}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    {assessmentIcon(a.assessment)}
                                                    <span
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            padding: '1px 6px',
                                                            borderRadius: 4,
                                                            background: `${a.confidence > 0.6 ? '#22c55e20' : '#64748b20'}`,
                                                            color:
                                                                a.confidence > 0.6
                                                                    ? '#22c55e'
                                                                    : '#64748b',
                                                        }}
                                                    >
                                                        {(a.confidence * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        color: '#cbd5e1',
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    {a.claim}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: '#64748b',
                                                    }}
                                                >
                                                    {a.reasoning}
                                                </div>
                                                {a.suggestedCorrection && (
                                                    <div
                                                        style={{
                                                            marginTop: 6,
                                                            fontSize: '0.8rem',
                                                            color: '#f59e0b',
                                                            padding: '6px 10px',
                                                            borderRadius: 6,
                                                            background: 'rgba(245,158,11,0.08)',
                                                        }}
                                                    >
                                                        Suggested correction:{' '}
                                                        {a.suggestedCorrection}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══════════════════ SUMMARY TAB ═══════════════════ */}
                        {activeTab === 'summary' && (
                            <div>
                                <button
                                    onClick={handleGenerateSummary}
                                    disabled={
                                        !selectedSessionId || isGeneratingSummary || !geminiResearch
                                    }
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 16px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: isGeneratingSummary ? '#06b6d440' : '#06b6d4',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        marginBottom: 16,
                                        opacity: !selectedSessionId || !geminiResearch ? 0.4 : 1,
                                    }}
                                >
                                    {isGeneratingSummary ? (
                                        <Loader2 size={16} className="spin" />
                                    ) : (
                                        <FileText size={16} />
                                    )}
                                    {isGeneratingSummary
                                        ? 'Generating...'
                                        : 'Generate Summary with Gemini'}
                                </button>

                                {summaryResult && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <div style={cardStyle}>
                                            <h3
                                                style={{
                                                    margin: '0 0 8px',
                                                    fontSize: '1.1rem',
                                                    color: '#e2e8f0',
                                                }}
                                            >
                                                {summaryResult.title}
                                            </h3>
                                            <button
                                                onClick={() =>
                                                    copyText(
                                                        `${summaryResult.abstract}\n\nKey Findings:\n${summaryResult.keyFindings.join('\n')}`,
                                                        'summary',
                                                    )
                                                }
                                                style={{
                                                    float: 'right',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#64748b',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {copiedId === 'summary' ? (
                                                    <Check size={14} style={{ color: '#22c55e' }} />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>
                                        </div>

                                        <div style={cardStyle}>
                                            <h4
                                                style={{
                                                    margin: '0 0 8px',
                                                    fontSize: '0.85rem',
                                                    color: '#06b6d4',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Abstract
                                            </h4>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: '0.85rem',
                                                    color: '#cbd5e1',
                                                    lineHeight: 1.6,
                                                }}
                                            >
                                                {summaryResult.abstract}
                                            </p>
                                        </div>

                                        {summaryResult.keyFindings.length > 0 && (
                                            <div style={cardStyle}>
                                                <h4
                                                    style={{
                                                        margin: '0 0 8px',
                                                        fontSize: '0.85rem',
                                                        color: '#22c55e',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Key Findings
                                                </h4>
                                                {summaryResult.keyFindings.map((f, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            display: 'flex',
                                                            gap: 8,
                                                            fontSize: '0.85rem',
                                                            color: '#cbd5e1',
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        <ArrowRight
                                                            size={14}
                                                            style={{
                                                                marginTop: 2,
                                                                flexShrink: 0,
                                                                color: '#22c55e',
                                                            }}
                                                        />
                                                        {f}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {summaryResult.methodology && (
                                            <div style={cardStyle}>
                                                <h4
                                                    style={{
                                                        margin: '0 0 8px',
                                                        fontSize: '0.85rem',
                                                        color: '#a855f7',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Methodology
                                                </h4>
                                                <p
                                                    style={{
                                                        margin: 0,
                                                        fontSize: '0.85rem',
                                                        color: '#cbd5e1',
                                                    }}
                                                >
                                                    {summaryResult.methodology}
                                                </p>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: 12 }}>
                                            {summaryResult.limitations.length > 0 && (
                                                <div style={{ ...cardStyle, flex: 1 }}>
                                                    <h4
                                                        style={{
                                                            margin: '0 0 8px',
                                                            fontSize: '0.85rem',
                                                            color: '#f59e0b',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        Limitations
                                                    </h4>
                                                    {summaryResult.limitations.map((l, i) => (
                                                        <div
                                                            key={i}
                                                            style={{
                                                                fontSize: '0.8rem',
                                                                color: '#94a3b8',
                                                                marginBottom: 4,
                                                            }}
                                                        >
                                                            • {l}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {summaryResult.futureWork.length > 0 && (
                                                <div style={{ ...cardStyle, flex: 1 }}>
                                                    <h4
                                                        style={{
                                                            margin: '0 0 8px',
                                                            fontSize: '0.85rem',
                                                            color: '#3b82f6',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        Future Work
                                                    </h4>
                                                    {summaryResult.futureWork.map((f, i) => (
                                                        <div
                                                            key={i}
                                                            style={{
                                                                fontSize: '0.8rem',
                                                                color: '#94a3b8',
                                                                marginBottom: 4,
                                                            }}
                                                        >
                                                            • {f}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* ═══════════════════ ANOMALIES TAB ═══════════════════ */}
                        {activeTab === 'anomalies' && (
                            <div>
                                <button
                                    onClick={handleDetectAnomalies}
                                    disabled={
                                        !selectedSessionId ||
                                        isDetectingAnomalies ||
                                        !geminiResearch
                                    }
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 16px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: isDetectingAnomalies ? '#ef444440' : '#ef4444',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        marginBottom: 16,
                                        opacity: !selectedSessionId || !geminiResearch ? 0.4 : 1,
                                    }}
                                >
                                    {isDetectingAnomalies ? (
                                        <Loader2 size={16} className="spin" />
                                    ) : (
                                        <AlertTriangle size={16} />
                                    )}
                                    {isDetectingAnomalies
                                        ? 'Scanning...'
                                        : 'Detect Anomalies with Gemini'}
                                </button>

                                {anomalyResult && anomalyResult.anomalies.length === 0 && (
                                    <div
                                        style={{
                                            ...cardStyle,
                                            textAlign: 'center',
                                            padding: 30,
                                            color: '#22c55e',
                                        }}
                                    >
                                        <CheckCircle2
                                            size={32}
                                            style={{ marginBottom: 8, opacity: 0.5 }}
                                        />
                                        <div>No anomalies detected</div>
                                    </div>
                                )}

                                {anomalyResult && anomalyResult.anomalies.length > 0 && (
                                    <div>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                            {['critical', 'warning', 'info'].map((sev) => {
                                                const count = anomalyResult.anomalies.filter(
                                                    (a) => a.severity === sev,
                                                ).length;
                                                const colors: Record<string, string> = {
                                                    critical: '#ef4444',
                                                    warning: '#f59e0b',
                                                    info: '#3b82f6',
                                                };
                                                return (
                                                    <div
                                                        key={sev}
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: 6,
                                                            background: `${colors[sev]}15`,
                                                            color: colors[sev],
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {sev}: {count}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 8,
                                                marginBottom: 12,
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            {[
                                                'contradiction',
                                                'data_gap',
                                                'methodology_flaw',
                                                'source_bias',
                                            ].map((t) => {
                                                const count = anomalyResult.anomalies.filter(
                                                    (a) => a.type === t,
                                                ).length;
                                                return count > 0 ? (
                                                    <div
                                                        key={t}
                                                        style={{
                                                            padding: '3px 8px',
                                                            borderRadius: 4,
                                                            fontSize: '0.7rem',
                                                            background: 'rgba(255,255,255,0.06)',
                                                            color: '#94a3b8',
                                                        }}
                                                    >
                                                        {t.replace(/_/g, ' ')}: {count}
                                                    </div>
                                                ) : null;
                                            })}
                                        </div>
                                        {anomalyResult.anomalies.map((a, i) => {
                                            const sevColor =
                                                a.severity === 'critical'
                                                    ? '#ef4444'
                                                    : a.severity === 'warning'
                                                      ? '#f59e0b'
                                                      : '#3b82f6';
                                            return (
                                                <div
                                                    key={i}
                                                    style={{
                                                        ...cardStyle,
                                                        borderLeft: `3px solid ${sevColor}`,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize: '0.65rem',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                padding: '2px 6px',
                                                                borderRadius: 4,
                                                                background: `${sevColor}20`,
                                                                color: sevColor,
                                                            }}
                                                        >
                                                            {a.severity}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize: '0.7rem',
                                                                color: '#64748b',
                                                            }}
                                                        >
                                                            {a.type.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.85rem',
                                                            color: '#cbd5e1',
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        {a.description}
                                                    </div>
                                                    {a.recommendation && (
                                                        <div
                                                            style={{
                                                                fontSize: '0.8rem',
                                                                color: '#3b82f6',
                                                            }}
                                                        >
                                                            → {a.recommendation}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ═══════════════════ PEER REVIEW TAB ═══════════════════ */}
                        {activeTab === 'peer-review' && (
                            <div>
                                <button
                                    onClick={handlePeerReview}
                                    disabled={!selectedSessionId || isReviewing || !geminiResearch}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 16px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: isReviewing ? '#ec489940' : '#ec4899',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        marginBottom: 16,
                                        opacity: !selectedSessionId || !geminiResearch ? 0.4 : 1,
                                    }}
                                >
                                    {isReviewing ? (
                                        <Loader2 size={16} className="spin" />
                                    ) : (
                                        <Users size={16} />
                                    )}
                                    {isReviewing ? 'Reviewing...' : 'Run Peer Review with Gemini'}
                                </button>

                                {peerReviewResult && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        {/* Scores */}
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(5, 1fr)',
                                                gap: 8,
                                                marginBottom: 16,
                                            }}
                                        >
                                            {[
                                                {
                                                    label: 'Originality',
                                                    value: peerReviewResult.originality,
                                                    color: '#8b5cf6',
                                                },
                                                {
                                                    label: 'Methodology',
                                                    value: peerReviewResult.methodology,
                                                    color: '#3b82f6',
                                                },
                                                {
                                                    label: 'Clarity',
                                                    value: peerReviewResult.clarity,
                                                    color: '#06b6d4',
                                                },
                                                {
                                                    label: 'Significance',
                                                    value: peerReviewResult.significance,
                                                    color: '#22c55e',
                                                },
                                                {
                                                    label: 'Overall',
                                                    value: peerReviewResult.overall,
                                                    color: '#f97316',
                                                },
                                            ].map((s) => (
                                                <div
                                                    key={s.label}
                                                    style={{
                                                        ...cardStyle,
                                                        textAlign: 'center',
                                                        marginBottom: 0,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: '0.65rem',
                                                            color: '#64748b',
                                                            textTransform: 'uppercase',
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        {s.label}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '1.5rem',
                                                            fontWeight: 700,
                                                            color: s.color,
                                                        }}
                                                    >
                                                        {s.value}
                                                    </div>
                                                    <div
                                                        style={{
                                                            marginTop: 6,
                                                            height: 4,
                                                            borderRadius: 2,
                                                            background: 'rgba(255,255,255,0.06)',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                height: '100%',
                                                                borderRadius: 2,
                                                                width: `${s.value}%`,
                                                                background: s.color,
                                                                transition: 'width 0.5s',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Recommendation */}
                                        <div
                                            style={{
                                                ...cardStyle,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                borderLeft: `3px solid ${recommendationColor(peerReviewResult.recommendation)}`,
                                            }}
                                        >
                                            <Star
                                                size={20}
                                                style={{
                                                    color: recommendationColor(
                                                        peerReviewResult.recommendation,
                                                    ),
                                                }}
                                            />
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: '#64748b',
                                                    }}
                                                >
                                                    Recommendation
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: '1rem',
                                                        fontWeight: 600,
                                                        color: recommendationColor(
                                                            peerReviewResult.recommendation,
                                                        ),
                                                    }}
                                                >
                                                    {peerReviewResult.recommendation.replace(
                                                        /_/g,
                                                        ' ',
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    copyText(
                                                        peerReviewResult.summary,
                                                        'review-summary',
                                                    )
                                                }
                                                style={{
                                                    marginLeft: 'auto',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#64748b',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {copiedId === 'review-summary' ? (
                                                    <Check size={14} style={{ color: '#22c55e' }} />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>
                                        </div>

                                        {/* Summary */}
                                        <div style={cardStyle}>
                                            <h4
                                                style={{
                                                    margin: '0 0 8px',
                                                    fontSize: '0.85rem',
                                                    color: '#ec4899',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Review Summary
                                            </h4>
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontSize: '0.85rem',
                                                    color: '#cbd5e1',
                                                    lineHeight: 1.6,
                                                }}
                                            >
                                                {peerReviewResult.summary}
                                            </p>
                                        </div>

                                        {/* Comments */}
                                        {peerReviewResult.comments.length > 0 && (
                                            <div>
                                                <h4
                                                    style={{
                                                        margin: '0 0 12px',
                                                        fontSize: '0.85rem',
                                                        color: '#94a3b8',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Comments ({peerReviewResult.comments.length})
                                                </h4>
                                                {peerReviewResult.comments.map((c, i) => {
                                                    const typeColors: Record<string, string> = {
                                                        major_issue: '#ef4444',
                                                        minor_issue: '#f59e0b',
                                                        question: '#3b82f6',
                                                        suggestion: '#8b5cf6',
                                                        praise: '#22c55e',
                                                    };
                                                    const sevColors: Record<string, string> = {
                                                        critical: '#ef4444',
                                                        major: '#f59e0b',
                                                        minor: '#3b82f6',
                                                        cosmetic: '#64748b',
                                                    };
                                                    return (
                                                        <div key={i} style={cardStyle}>
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    gap: 6,
                                                                    marginBottom: 6,
                                                                    flexWrap: 'wrap',
                                                                }}
                                                            >
                                                                {c.section && (
                                                                    <span
                                                                        style={{
                                                                            fontSize: '0.7rem',
                                                                            padding: '1px 6px',
                                                                            borderRadius: 4,
                                                                            background:
                                                                                'rgba(255,255,255,0.06)',
                                                                            color: '#94a3b8',
                                                                        }}
                                                                    >
                                                                        {c.section}
                                                                    </span>
                                                                )}
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.65rem',
                                                                        padding: '1px 6px',
                                                                        borderRadius: 4,
                                                                        fontWeight: 600,
                                                                        background: `${typeColors[c.type] || '#64748b'}20`,
                                                                        color:
                                                                            typeColors[c.type] ||
                                                                            '#64748b',
                                                                    }}
                                                                >
                                                                    {c.type.replace(/_/g, ' ')}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize: '0.65rem',
                                                                        padding: '1px 6px',
                                                                        borderRadius: 4,
                                                                        background: `${sevColors[c.severity] || '#64748b'}20`,
                                                                        color:
                                                                            sevColors[c.severity] ||
                                                                            '#64748b',
                                                                    }}
                                                                >
                                                                    {c.severity}
                                                                </span>
                                                            </div>
                                                            <div
                                                                style={{
                                                                    fontSize: '0.85rem',
                                                                    color: '#cbd5e1',
                                                                }}
                                                            >
                                                                {c.comment}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default GeminiResearchPanel;
