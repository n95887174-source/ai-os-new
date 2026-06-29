import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    StickyNote,
    Plus,
    X,
    Paperclip,
    Image as ImageIcon,
    Trash2,
    FileText,
    Search,
    Tag,
    Loader2,
    AlertTriangle,
    Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n/useTranslation';
import { keyService } from '../kernel/instances';
import {
    errorContainer,
    dismissBtnRed,
    textMutedXs,
    textSecondaryXs,
    textWhiteXs,
    flexBetween,
} from '../styles/common';
import { useConfirm } from '../hooks/useConfirm';
import type { KeyNote } from '../kernel/types/metrics-types';

interface AttachedFile {
    name: string;
    size: number;
    type: string;
    dataUrl: string;
}

interface EnhancedNote extends KeyNote {
    attachments?: AttachedFile[];
    tags?: string[];
}

const MAX_FILE_SIZE = 1024 * 1024;
const MAX_TOTAL_SIZE = 3 * 1024 * 1024;

const KeyNotesPanel: React.FC = () => {
    const { t } = useTranslation();
    const { confirm, ConfirmDialog } = useConfirm();
    const [keys, setKeys] = useState<
        Array<{ id: string; provider: string; label: string; notes: EnhancedNote[] }>
    >([]);
    const [selectedKeyId, setSelectedKeyId] = useState<string>('');
    const [search, setSearch] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [newText, setNewText] = useState('');
    const [newTags, setNewTags] = useState('');
    const [attachments, setAttachments] = useState<AttachedFile[]>([]);
    const [adding, setAdding] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isMountedRef = useRef(true);

    const loadNotes = useCallback(() => {
        try {
            const all = keyService.getKeys();
            const list = all.map((k) => ({
                id: k.id,
                provider: k.provider,
                label: k.label || k.provider,
                notes: ((k as { notes?: EnhancedNote[] }).notes ?? []) as EnhancedNote[],
            }));
            if (isMountedRef.current) {
                setKeys(list);
                if (!selectedKeyId && list.length > 0) setSelectedKeyId(list[0].id);
            }
        } catch (err) {
            if (isMountedRef.current) setError(String(err));
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    }, [selectedKeyId]);

    useEffect(() => {
        isMountedRef.current = true;
        loadNotes();
        return () => {
            isMountedRef.current = false;
        };
    }, [loadNotes]);

    const handleFileSelect = useCallback(
        (files: FileList | null) => {
            if (!files) return;
            const next: AttachedFile[] = [];
            let total = attachments.reduce((s, f) => s + f.size, 0);
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > MAX_FILE_SIZE) {
                    if (isMountedRef.current) {
                        setError(
                            t('key_notes.file_too_large', {
                                name: file.name,
                                size: (file.size / 1024).toFixed(0),
                            }),
                        );
                    }
                    continue;
                }
                if (total + file.size > MAX_TOTAL_SIZE) {
                    if (isMountedRef.current) {
                        setError(t('key_notes.total_too_large'));
                    }
                    break;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = String(reader.result ?? '');
                    setAttachments((prev) => [
                        ...prev,
                        { name: file.name, size: file.size, type: file.type, dataUrl },
                    ]);
                };
                reader.readAsDataURL(file);
                total += file.size;
                next.push({ name: file.name, size: file.size, type: file.type, dataUrl: '' });
            }
        },
        [attachments, t],
    );

    const handleAddNote = useCallback(async () => {
        if (!selectedKeyId || !newText.trim()) return;
        setAdding(true);
        try {
            const tags = newTags
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            await keyService.addNote(selectedKeyId, newText.trim(), 'admin');
            const k = keyService.getKeys().find((x) => x.id === selectedKeyId);
            if (k && attachments.length > 0) {
                const notes = (k as { notes?: EnhancedNote[] }).notes ?? [];
                const last = notes[notes.length - 1];
                if (last) {
                    last.attachments = attachments;
                    if (tags.length > 0) last.tags = tags;
                    await keyService.updateKey(selectedKeyId, { notes: k.notes });
                }
            } else if (k && tags.length > 0) {
                const notes = (k as { notes?: EnhancedNote[] }).notes ?? [];
                const last = notes[notes.length - 1];
                if (last) {
                    last.tags = tags;
                    await keyService.updateKey(selectedKeyId, { notes: k.notes });
                }
            }
            setNewText('');
            setNewTags('');
            setAttachments([]);
            loadNotes();
        } catch (err) {
            if (isMountedRef.current) setError(String(err));
        } finally {
            if (isMountedRef.current) setAdding(false);
        }
    }, [selectedKeyId, newText, newTags, attachments, loadNotes]);

    const handleDeleteNote = useCallback(
        async (noteId: string) => {
            if (!selectedKeyId) return;
            if (
                !(await confirm({
                    title: 'Delete Note',
                    message: 'Delete this note?',
                    variant: 'danger',
                }))
            )
                return;
            try {
                const k = keyService.getKeys().find((x) => x.id === selectedKeyId);
                if (!k) return;
                const notes = ((k as { notes?: EnhancedNote[] }).notes ?? []).filter(
                    (n) => n.id !== noteId,
                );
                await keyService.updateKey(selectedKeyId, { notes });
                loadNotes();
            } catch (err) {
                if (isMountedRef.current) setError(String(err));
            }
        },
        [selectedKeyId, loadNotes, confirm],
    );

    const filteredNotes = (() => {
        if (!selectedKeyId) return [];
        const key = keys.find((k) => k.id === selectedKeyId);
        if (!key) return [];
        let list = key.notes.slice().sort((a, b) => b.timestamp - a.timestamp);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (n) =>
                    n.text.toLowerCase().includes(q) ||
                    n.tags?.some((tg) => tg.toLowerCase().includes(q)),
            );
        }
        if (activeTag) {
            list = list.filter((n) => n.tags?.includes(activeTag));
        }
        return list;
    })();

    const allTags = (() => {
        const set = new Set<string>();
        for (const k of keys) for (const n of k.notes) for (const tg of n.tags ?? []) set.add(tg);
        return Array.from(set).sort();
    })();

    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#94a3b8',
                }}
            >
                <Loader2 size={20} className="animate-spin" />
            </div>
        );
    }

    if (keys.length === 0) {
        return (
            <div style={{ padding: '2rem', height: '100%', overflow: 'auto' }}>
                <h2
                    style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        margin: '0 0 0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        color: '#f8fafc',
                    }}
                >
                    <StickyNote size={26} color="#f59e0b" /> {t('key_notes.title')}
                </h2>
                <p style={{ color: '#94a3b8' }}>{t('key_notes.no_keys')}</p>
            </div>
        );
    }

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                padding: '1rem',
                overflow: 'auto',
            }}
        >
            <div
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}
            >
                <h2
                    style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        margin: '0 0 0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        color: '#f8fafc',
                    }}
                >
                    <StickyNote size={26} color="#f59e0b" /> {t('key_notes.title')}
                </h2>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>
                    {t('key_notes.subtitle')}
                </p>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={errorContainer}
                >
                    <AlertTriangle size={16} /> {error}
                    <button onClick={() => setError(null)} style={dismissBtnRed}>
                        <X size={18} />
                    </button>
                </motion.div>
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '240px 1fr',
                    gap: '1rem',
                    flex: 1,
                    minHeight: 0,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        overflow: 'auto',
                    }}
                >
                    <div style={textSecondaryXs}>{t('key_notes.select_key')}</div>
                    {keys.map((k) => (
                        <button
                            key={k.id}
                            onClick={() => {
                                setSelectedKeyId(k.id);
                                setActiveTag(null);
                            }}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: 8,
                                border: '1px solid',
                                borderColor:
                                    selectedKeyId === k.id ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                                background:
                                    selectedKeyId === k.id
                                        ? 'rgba(245,158,11,0.1)'
                                        : 'rgba(0,0,0,0.2)',
                                color: '#e2e8f0',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.8rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <span>{k.label}</span>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                                {k.notes.length}
                            </span>
                        </button>
                    ))}
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        minWidth: 0,
                    }}
                >
                    <div
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.05)',
                            background: 'rgba(0,0,0,0.2)',
                        }}
                    >
                        <textarea
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            placeholder={t('key_notes.placeholder')}
                            style={{
                                width: '100%',
                                minHeight: 60,
                                padding: '0.5rem',
                                borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.3)',
                                color: '#e2e8f0',
                                fontSize: '0.85rem',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                            }}
                        />
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.5rem',
                                marginTop: '0.5rem',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                            }}
                        >
                            <input
                                value={newTags}
                                onChange={(e) => setNewTags(e.target.value)}
                                placeholder={t('key_notes.tags_placeholder')}
                                style={{
                                    flex: 1,
                                    minWidth: 140,
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: '#e2e8f0',
                                    fontSize: '0.8rem',
                                }}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    padding: '0.4rem 0.6rem',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                <Paperclip size={12} /> {t('key_notes.attach')}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => handleFileSelect(e.target.files)}
                            />
                            <button
                                onClick={handleAddNote}
                                disabled={!newText.trim() || adding}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: 6,
                                    border: 'none',
                                    background:
                                        newText.trim() && !adding
                                            ? '#f59e0b'
                                            : 'rgba(245,158,11,0.3)',
                                    color: '#fff',
                                    cursor: newText.trim() && !adding ? 'pointer' : 'not-allowed',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontWeight: 600,
                                }}
                            >
                                {adding ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Plus size={12} />
                                )}{' '}
                                {t('key_notes.add')}
                            </button>
                        </div>
                        {attachments.length > 0 && (
                            <div
                                style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}
                            >
                                {attachments.map((f, i) => (
                                    <div
                                        key={f.name}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: 6,
                                            background: 'rgba(168,85,247,0.1)',
                                            border: '1px solid rgba(168,85,247,0.3)',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        {f.type.startsWith('image/') ? (
                                            <ImageIcon size={10} />
                                        ) : (
                                            <FileText size={10} />
                                        )}
                                        <span>{f.name}</span>
                                        <button
                                            onClick={() =>
                                                setAttachments((prev) =>
                                                    prev.filter((_, idx) => idx !== i),
                                                )
                                            }
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#fca5a5',
                                                cursor: 'pointer',
                                                padding: 0,
                                            }}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search
                                size={14}
                                style={{ position: 'absolute', left: 8, top: 8, color: '#94a3b8' }}
                            />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('key_notes.search_placeholder')}
                                style={{
                                    width: '100%',
                                    padding: '0.4rem 0.5rem 0.4rem 28px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(0,0,0,0.3)',
                                    color: '#e2e8f0',
                                    fontSize: '0.8rem',
                                }}
                            />
                        </div>
                        {activeTag && (
                            <button
                                onClick={() => setActiveTag(null)}
                                style={{
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: 12,
                                    border: '1px solid #ef4444',
                                    background: 'rgba(239,68,68,0.1)',
                                    color: '#fca5a5',
                                    cursor: 'pointer',
                                    fontSize: '0.7rem',
                                }}
                            >
                                ✕ {activeTag}
                            </button>
                        )}
                    </div>

                    {allTags.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Tag size={12} color="#94a3b8" />
                            {allTags
                                .filter((tg) => tg !== activeTag)
                                .slice(0, 12)
                                .map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => setActiveTag(tag)}
                                        style={{
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: 10,
                                            border: '1px solid rgba(245,158,11,0.3)',
                                            background: 'rgba(245,158,11,0.05)',
                                            color: '#fbbf24',
                                            cursor: 'pointer',
                                            fontSize: '0.65rem',
                                        }}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                        </div>
                    )}

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            overflow: 'auto',
                            flex: 1,
                        }}
                    >
                        <AnimatePresence>
                            {filteredNotes.map((note) => (
                                <motion.div
                                    key={note.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderRadius: 10,
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        background: 'rgba(0,0,0,0.2)',
                                    }}
                                >
                                    <div style={flexBetween}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                fontSize: '0.7rem',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    padding: '0.1rem 0.5rem',
                                                    borderRadius: 6,
                                                    background:
                                                        note.type === 'system'
                                                            ? 'rgba(59,130,246,0.2)'
                                                            : 'rgba(168,85,247,0.2)',
                                                    color:
                                                        note.type === 'system'
                                                            ? '#93c5fd'
                                                            : '#c4b5fd',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {note.type}
                                            </span>
                                            {note.author && (
                                                <span style={{ color: '#94a3b8' }}>
                                                    {note.author}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <span style={textMutedXs}>
                                                {new Date(note.timestamp).toLocaleString()}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteNote(note.id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    padding: 2,
                                                }}
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ ...textWhiteXs, marginTop: 4, lineHeight: 1.5 }}>
                                        {note.text}
                                    </div>
                                    {note.tags && note.tags.length > 0 && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 4,
                                                flexWrap: 'wrap',
                                                marginTop: 6,
                                            }}
                                        >
                                            {note.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    style={{
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: 8,
                                                        background: 'rgba(245,158,11,0.1)',
                                                        color: '#fbbf24',
                                                        fontSize: '0.65rem',
                                                    }}
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {note.attachments && note.attachments.length > 0 && (
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 6,
                                                flexWrap: 'wrap',
                                                marginTop: 6,
                                            }}
                                        >
                                            {note.attachments.map((f, _i) => (
                                                <button
                                                    key={f.name}
                                                    onClick={() => setPreviewFile(f)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: 6,
                                                        background: 'rgba(0,0,0,0.3)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        color: '#cbd5e1',
                                                        fontSize: '0.7rem',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {f.type.startsWith('image/') ? (
                                                        <ImageIcon size={10} />
                                                    ) : (
                                                        <FileText size={10} />
                                                    )}
                                                    <span>{f.name}</span>
                                                    <span style={{ color: '#64748b' }}>
                                                        {(f.size / 1024).toFixed(0)}KB
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {filteredNotes.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                                {t('key_notes.no_notes')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {previewFile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPreviewFile(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.85)',
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: '90vw', maxHeight: '90vh', padding: '1rem' }}
                        >
                            {previewFile.type.startsWith('image/') ? (
                                <img
                                    src={previewFile.dataUrl}
                                    alt={previewFile.name}
                                    style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8 }}
                                />
                            ) : (
                                <div
                                    style={{
                                        padding: '2rem',
                                        background: '#1e293b',
                                        borderRadius: 8,
                                        color: '#e2e8f0',
                                    }}
                                >
                                    <p>{previewFile.name}</p>
                                    <p style={textMutedXs}>
                                        {(previewFile.size / 1024).toFixed(1)} KB
                                    </p>
                                    <a
                                        href={previewFile.dataUrl}
                                        download={previewFile.name}
                                        style={{
                                            marginTop: '1rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            padding: '0.4rem 0.8rem',
                                            borderRadius: 6,
                                            background: '#3b82f6',
                                            color: '#fff',
                                            textDecoration: 'none',
                                        }}
                                    >
                                        <Download size={12} /> {t('key_notes.download')}
                                    </a>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <ConfirmDialog />
        </div>
    );
};

export default KeyNotesPanel;
