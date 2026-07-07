import React from 'react';
import { Clock, Loader2, Search, FileText, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export const SOURCE_COLORS: Record<string, string> = {
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
};

export const SOURCE_LABELS: Record<string, string> = {
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

export const STATUS_CONFIG: Record<
    string,
    { color: string; icon: React.ReactNode; label: string }
> = {
    idle: { color: '#64748b', icon: <Clock size={14} />, label: 'Idle' },
    formulating: { color: '#f59e0b', icon: <Loader2 size={14} />, label: 'Formulating' },
    searching: { color: '#3b82f6', icon: <Search size={14} />, label: 'Searching' },
    extracting: { color: '#8b5cf6', icon: <FileText size={14} />, label: 'Extracting' },
    synthesizing: { color: '#f59e0b', icon: <Zap size={14} />, label: 'Synthesizing' },
    complete: { color: '#22c55e', icon: <CheckCircle2 size={14} />, label: 'Complete' },
    error: { color: '#ef4444', icon: <AlertCircle size={14} />, label: 'Error' },
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
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

export type CitationFormat = 'bibtex' | 'apa' | 'mla' | 'chicago';

export const CITATION_FORMATS: { value: CitationFormat; label: string }[] = [
    { value: 'bibtex', label: 'BibTeX' },
    { value: 'apa', label: 'APA' },
    { value: 'mla', label: 'MLA' },
    { value: 'chicago', label: 'Chicago' },
];
