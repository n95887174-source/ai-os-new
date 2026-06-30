import React, { useState, useRef, useCallback } from 'react';
import { FileDown, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/useTranslation';
import {
    exportAndDownload,
    exportChatToMarkdown,
    exportChatToJSON,
    exportChatToHtml,
} from '../utils/chat-export';
import { errorContainer, dismissBtnRed } from '../styles/common';
import { useChatStore } from '../stores/chat/store';
import { safeJsonParse } from '../kernel/utils/safe-json';
import { SourcePanel } from './ChatExportPanel/SourcePanel';
import { FormatPanel } from './ChatExportPanel/FormatPanel';
import { ExportActions } from './ChatExportPanel/ExportActions';
import { PreviewPane } from './ChatExportPanel/PreviewPane';
import type { ChatPreview } from './ChatExportPanel/chat-export-types';

const ChatExportPanel: React.FC = () => {
    const { t } = useTranslation();
    const [chat, setChat] = useState<ChatPreview | null>(null);
    const [sourceMode, setSourceMode] = useState<'paste' | 'file' | 'session'>('paste');
    const [pasted, setPasted] = useState('');
    const [format, setFormat] = useState<'md' | 'json' | 'html'>('md');
    const [includeMeta, setIncludeMeta] = useState(true);
    const [includeStats, setIncludeStats] = useState(true);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const isMountedRef = useRef(true);

    const loadFromSession = useCallback(() => {
        try {
            const { sessions } = useChatStore.getState();
            if (!sessions || sessions.length === 0) {
                setError(t('chat_export.no_sessions'));
                return;
            }
            const last = sessions[sessions.length - 1];
            if (!last?.history || !Array.isArray(last.history)) {
                setError(t('chat_export.invalid_session'));
                return;
            }
            setChat({
                id: last.id,
                title: last.title ?? 'Chat',
                model: last.currentModel,
                provider: last.currentProvider,
                createdAt: last.createdAt,
                updatedAt: last.updatedAt,
                messages: last.history.map((m: { role?: string; text: string }) => ({
                    role:
                        m.role === 'user' ||
                        m.role === 'assistant' ||
                        m.role === 'system' ||
                        m.role === 'tool'
                            ? m.role
                            : 'user',
                    content: typeof m.text === 'string' ? m.text : '',
                })),
            });
            setSourceMode('session');
        } catch (err) {
            setError(String(err));
        }
    }, [t]);

    const loadFromFile = useCallback(
        (file: File) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const raw = String(reader.result ?? '');
                    const data: unknown = safeJsonParse(raw);
                    if (typeof data !== 'object' || data === null) throw new Error('not object');
                    const obj = data as {
                        id?: string;
                        title?: string;
                        messages?: unknown[];
                        model?: string;
                        provider?: string;
                    };
                    if (!Array.isArray(obj.messages)) throw new Error('no messages');
                    setChat({
                        id: obj.id ?? `imp_${Date.now()}`,
                        title: obj.title ?? file.name.replace(/\.json$/i, ''),
                        model: obj.model,
                        provider: obj.provider,
                        messages: obj.messages.map((m: unknown) => {
                            const msg = m as { role?: string; content?: string };
                            return {
                                role:
                                    msg.role === 'user' ||
                                    msg.role === 'assistant' ||
                                    msg.role === 'system' ||
                                    msg.role === 'tool'
                                        ? msg.role
                                        : 'user',
                                content: typeof msg.content === 'string' ? msg.content : '',
                            };
                        }),
                    });
                    setSourceMode('file');
                } catch (err) {
                    if (isMountedRef.current)
                        setError(
                            `${t('chat_export.parse_error')}: ${err instanceof Error ? err.message : String(err)}`,
                        );
                }
            };
            reader.readAsText(file);
        },
        [t],
    );

    const loadFromPaste = useCallback(() => {
        if (!pasted.trim()) {
            setError(t('chat_export.empty_paste'));
            return;
        }
        try {
            const data: unknown = safeJsonParse(pasted);
            if (typeof data !== 'object' || data === null) throw new Error('not object');
            const obj = data as { id?: string; title?: string; messages?: unknown[] };
            if (!Array.isArray(obj.messages)) throw new Error('no messages');
            setChat({
                id: obj.id ?? `pas_${Date.now()}`,
                title: obj.title ?? 'Pasted Chat',
                messages: obj.messages.map((m: unknown) => {
                    const msg = m as { role?: string; content?: string };
                    return {
                        role:
                            msg.role === 'user' ||
                            msg.role === 'assistant' ||
                            msg.role === 'system' ||
                            msg.role === 'tool'
                                ? msg.role
                                : 'user',
                        content: typeof msg.content === 'string' ? msg.content : '',
                    };
                }),
            });
        } catch (err) {
            if (isMountedRef.current)
                setError(
                    `${t('chat_export.parse_error')}: ${err instanceof Error ? err.message : String(err)}`,
                );
        }
    }, [pasted, t]);

    React.useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleDownload = useCallback(() => {
        if (!chat) return;
        setBusy(true);
        try {
            exportAndDownload(chat, format);
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setBusy(false);
            }, 300);
        }
    }, [chat, format]);

    const handleCopyPreview = useCallback(() => {
        if (!chat) return;
        const opts = {
            includeTimestamps: includeMeta,
            includeModel: includeMeta,
            includeProvider: includeMeta,
            includeStats,
        };
        const text =
            format === 'md'
                ? exportChatToMarkdown(chat, opts)
                : format === 'json'
                  ? exportChatToJSON(chat)
                  : exportChatToHtml(chat, opts);
        navigator.clipboard
            ?.writeText(text)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            })
            .catch(() => setError(t('chat_export.copy_failed')));
    }, [chat, format, includeMeta, includeStats, t]);

    const preview = React.useMemo(() => {
        if (!chat) return '';
        const opts = {
            includeTimestamps: includeMeta,
            includeModel: includeMeta,
            includeProvider: includeMeta,
            includeStats,
        };
        if (format === 'md') return exportChatToMarkdown(chat, opts);
        if (format === 'json') return exportChatToJSON(chat);
        return exportChatToHtml(chat, opts);
    }, [chat, format, includeMeta, includeStats]);

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
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
                    <FileDown size={26} color="#10b981" /> {t('chat_export.title')}
                </h2>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>
                    {t('chat_export.subtitle')}
                </p>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={errorContainer}
                >
                    {error}
                    <button onClick={() => setError(null)} style={dismissBtnRed}>
                        <X size={18} />
                    </button>
                </motion.div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <SourcePanel
                    sourceMode={sourceMode}
                    pasted={pasted}
                    onSourceModeChange={setSourceMode}
                    onPasteChange={setPasted}
                    onLoadPaste={loadFromPaste}
                    onFileSelected={loadFromFile}
                    onLoadSession={loadFromSession}
                />
                <FormatPanel
                    format={format}
                    includeMeta={includeMeta}
                    includeStats={includeStats}
                    onFormatChange={setFormat}
                    onIncludeMetaChange={setIncludeMeta}
                    onIncludeStatsChange={setIncludeStats}
                />
            </div>

            {chat && (
                <ExportActions
                    title={chat.title}
                    messageCount={chat.messages.length}
                    model={chat.model}
                    copied={copied}
                    busy={busy}
                    onCopy={handleCopyPreview}
                    onDownload={handleDownload}
                />
            )}

            <PreviewPane preview={preview} hasChat={!!chat} sourceMode={sourceMode} />
        </div>
    );
};

export default ChatExportPanel;
