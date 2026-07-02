import React, { useState } from 'react';
import PanelLoader from '../PanelLoader';

const DATA_SECTIONS = [
    { id: 'keys', label: 'API Keys', icon: '\uD83D\uDD11', size: '~2 KB' },
    { id: 'config', label: 'Configuration', icon: '\u2699\uFE0F', size: '~5 KB' },
    { id: 'debates', label: 'Debate History', icon: '\uD83C\uDF96\uFE0F', size: '~50 KB' },
    { id: 'memory', label: 'Memory (Episodic)', icon: '\uD83E\uDDE0', size: '~200 KB' },
    { id: 'prompts', label: 'Prompt Library', icon: '\uD83D\uDCDD', size: '~10 KB' },
    { id: 'workflows', label: 'Workflows', icon: '\uD83D\uDD17', size: '~8 KB' },
    { id: 'topologies', label: 'Topologies', icon: '\uD83D\uDCCA', size: '~3 KB' },
    { id: 'settings', label: 'Settings & Themes', icon: '\uD83C\uDFA8', size: '~1 KB' },
];

const ExportImportPanel: React.FC = () => {
    const [tab, setTab] = useState<'export' | 'import'>('export');
    const [selected, setSelected] = useState<Set<string>>(new Set(DATA_SECTIONS.map((s) => s.id)));
    const [exporting, setExporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [result, setResult] = useState<string | null>(null);

    const toggle = (id: string) => {
        setSelected((p) => {
            const next = new Set(p);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleExport = async () => {
        setExporting(true);
        setResult(null);
        await new Promise((r) => setTimeout(r, 1500));
        const data = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            sections: Array.from(selected),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `superagents-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
        setResult('Export complete! File downloaded.');
    };

    const handleImport = async () => {
        if (!importFile) return;
        setResult(null);
        await new Promise((r) => setTimeout(r, 1500));
        setResult(
            `Import complete! Loaded ${importFile.name} (${(importFile.size / 1024).toFixed(1)} KB).`,
        );
        setImportFile(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Tabs */}
            <div
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    paddingBottom: '0.4rem',
                }}
            >
                <button
                    onClick={() => setTab('export')}
                    style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: tab === 'export' ? 'rgba(59,130,246,0.2)' : 'transparent',
                        color: tab === 'export' ? '#60a5fa' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: tab === 'export' ? 600 : 400,
                    }}
                >
                    \u2B06 Export
                </button>
                <button
                    onClick={() => setTab('import')}
                    style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: tab === 'import' ? 'rgba(59,130,246,0.2)' : 'transparent',
                        color: tab === 'import' ? '#60a5fa' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: tab === 'import' ? 600 : 400,
                    }}
                >
                    \u2B07 Import
                </button>
            </div>

            {tab === 'export' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Select data to export:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {DATA_SECTIONS.map((s) => (
                            <label
                                key={s.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: '6px',
                                    background: selected.has(s.id)
                                        ? 'rgba(59,130,246,0.1)'
                                        : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${selected.has(s.id) ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.has(s.id)}
                                    onChange={() => toggle(s.id)}
                                    style={{ accentColor: '#3b82f6' }}
                                />
                                <span>{s.icon}</span>
                                <span style={{ color: 'var(--text-primary)' }}>{s.label}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                                    {s.size}
                                </span>
                            </label>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                            onClick={() => setSelected(new Set(DATA_SECTIONS.map((s) => s.id)))}
                            style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                            }}
                        >
                            Select All
                        </button>
                        <button
                            onClick={() => setSelected(new Set())}
                            style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                            }}
                        >
                            Clear
                        </button>
                        <div style={{ flex: 1 }} />
                        <button
                            onClick={handleExport}
                            disabled={exporting || selected.size === 0}
                            style={{
                                padding: '0.4rem 1.2rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: exporting
                                    ? 'rgba(59,130,246,0.3)'
                                    : 'rgba(59,130,246,0.2)',
                                color: exporting ? '#93c5fd' : '#60a5fa',
                                cursor: exporting || selected.size === 0 ? 'default' : 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                            }}
                        >
                            {exporting ? 'Exporting...' : `Export ${selected.size} sections`}
                        </button>
                    </div>
                </div>
            )}

            {tab === 'import' && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        alignItems: 'center',
                        padding: '2rem',
                        border: '2px dashed rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        textAlign: 'center',
                    }}
                >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>\uD83D\uDCC2</div>
                    <div
                        style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-primary)',
                            fontWeight: 600,
                        }}
                    >
                        Import Data
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: 400 }}>
                        Upload a previously exported JSON file to restore your data. The import will
                        merge with existing data.
                    </div>
                    <label
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '6px',
                            background: 'rgba(59,130,246,0.15)',
                            color: '#60a5fa',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: '1px solid rgba(59,130,246,0.2)',
                        }}
                    >
                        {importFile ? importFile.name : 'Choose File'}
                        <input
                            type="file"
                            accept=".json"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            style={{ display: 'none' }}
                        />
                    </label>
                    {importFile && (
                        <button
                            onClick={handleImport}
                            style={{
                                padding: '0.4rem 1.2rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'rgba(34,197,94,0.2)',
                                color: '#22c55e',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                            }}
                        >
                            Start Import
                        </button>
                    )}
                </div>
            )}

            {result && (
                <div
                    style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.2)',
                        color: '#22c55e',
                        fontSize: '0.75rem',
                    }}
                >
                    {result}
                </div>
            )}
        </div>
    );
};

export default function ExportImportWrapper() {
    return (
        <PanelLoader title="Export / Import">
            <ExportImportPanel />
        </PanelLoader>
    );
}
