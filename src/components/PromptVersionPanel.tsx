import React, { useEffect, useState } from 'react';
import { History, Plus, Trash2, Clock, Hash, FileText, ArrowLeft } from 'lucide-react';
import PanelLoader from './PanelLoader';
import { promptVersionService } from '../kernel/instances';
import type { PromptMeta, PromptVersion } from '../kernel/contracts/prompt-version-history';

const PromptVersionPanelContent: React.FC = () => {
    const [prompts, setPrompts] = useState<PromptMeta[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newComment, setNewComment] = useState('');

    const refresh = () => setPrompts(promptVersionService.getPrompts());

    useEffect(() => {
        refresh();
    }, []);

    useEffect(() => {
        if (selectedPrompt) setVersions(promptVersionService.getVersions(selectedPrompt));
    }, [selectedPrompt]);

    const handleSave = () => {
        if (!newContent.trim()) return;
        const id = selectedPrompt || `p-${Date.now()}`;
        promptVersionService.saveVersion(
            id,
            newName || 'Untitled',
            newContent,
            'admin',
            newComment,
        );
        setNewContent('');
        setNewComment('');
        setShowForm(false);
        setSelectedPrompt(id);
        refresh();
    };

    if (selectedPrompt) {
        const meta = prompts.find((p) => p.id === selectedPrompt);
        return (
            <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
                <button
                    onClick={() => {
                        setSelectedPrompt(null);
                        setVersions([]);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: 12,
                        marginBottom: 12,
                        padding: 0,
                    }}
                >
                    <ArrowLeft size={14} /> Back to prompts
                </button>
                <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>
                    {meta?.name || 'Prompt'}
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
                    {meta?.currentVersion} versions · Updated{' '}
                    {meta ? new Date(meta.updatedAt).toLocaleDateString() : ''}
                </p>

                <button
                    onClick={() => {
                        setNewName(meta?.name || '');
                        setNewContent('');
                        setNewComment('');
                        setShowForm(true);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                        marginBottom: 12,
                    }}
                >
                    <Plus size={16} /> New Version
                </button>

                {showForm && (
                    <div
                        style={{
                            background: '#1e293b',
                            borderRadius: 10,
                            padding: 16,
                            marginBottom: 16,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }}
                    >
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Prompt name"
                            style={inputStyle}
                        />
                        <textarea
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            placeholder="Prompt content..."
                            rows={6}
                            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
                        />
                        <input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="What changed?"
                            style={inputStyle}
                        />
                        <button
                            onClick={handleSave}
                            style={{
                                padding: '8px 20px',
                                background: '#22c55e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 600,
                                alignSelf: 'flex-start',
                            }}
                        >
                            Save Version
                        </button>
                    </div>
                )}

                {versions.map((v) => (
                    <div
                        key={v.id}
                        style={{
                            background: '#1e293b',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 6,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 6,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Hash size={14} style={{ color: '#3b82f6' }} />
                                <span style={{ fontWeight: 600, fontSize: 13 }}>v{v.version}</span>
                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                    by {v.author}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 11,
                                    color: '#64748b',
                                }}
                            >
                                <Clock size={11} /> {new Date(v.createdAt).toLocaleString()}
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 6 }}>
                            {v.comment}
                        </div>
                        <pre
                            style={{
                                margin: 0,
                                padding: 8,
                                background: '#0f172a',
                                borderRadius: 4,
                                fontSize: 11,
                                color: '#94a3b8',
                                whiteSpace: 'pre-wrap',
                                maxHeight: 120,
                                overflowY: 'auto',
                            }}
                        >
                            {v.content}
                        </pre>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                }}
            >
                <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                        Prompt Version History
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
                        Track changes to your system prompts and templates
                    </p>
                </div>
                <button
                    onClick={() => {
                        setSelectedPrompt(`p-${Date.now()}`);
                        setNewName('');
                        setNewContent('');
                        setNewComment('');
                        setShowForm(true);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 500,
                    }}
                >
                    <Plus size={16} /> New Prompt
                </button>
            </div>

            {prompts.map((p) => (
                <div
                    key={p.id}
                    onClick={() => setSelectedPrompt(p.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        background: '#1e293b',
                        borderRadius: 8,
                        marginBottom: 6,
                        cursor: 'pointer',
                    }}
                >
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: '#3b82f620',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3b82f6',
                            flexShrink: 0,
                        }}
                    >
                        <FileText size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div
                            style={{
                                fontSize: 11,
                                color: '#64748b',
                                display: 'flex',
                                gap: 8,
                                marginTop: 2,
                            }}
                        >
                            <span>v{p.currentVersion}</span>
                            <span>·</span>
                            <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            promptVersionService.deletePrompt(p.id);
                            refresh();
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 4,
                        }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
            {prompts.length === 0 && (
                <div style={{ textAlign: 'center', padding: 32, color: '#64748b', fontSize: 13 }}>
                    <History size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p>No prompts tracked yet.</p>
                </div>
            )}
        </div>
    );
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#fff',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
};

const PromptVersionPanel: React.FC = () => (
    <PanelLoader>
        <PromptVersionPanelContent />
    </PanelLoader>
);
export default PromptVersionPanel;
