import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, X, ExternalLink } from 'lucide-react';
import type { ChatBookmark } from '../../kernel/services/chat-bookmarks-service';
import { flexBetween, textMutedXs } from '../../styles/common';
import { useTranslation } from '../../i18n/useTranslation';

interface BookmarkCardProps {
    bookmark: ChatBookmark;
    copiedId: string | null;
    onCopy: (b: ChatBookmark) => void;
    onRemove: (id: string) => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = memo(
    ({ bookmark: b, copiedId, onCopy, onRemove }) => {
        const { t } = useTranslation();
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(0,0,0,0.2)',
                }}
            >
                <div style={flexBetween}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                            style={{
                                padding: '0.15rem 0.5rem',
                                borderRadius: 6,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background:
                                    b.role === 'user'
                                        ? 'rgba(59,130,246,0.15)'
                                        : 'rgba(16,185,129,0.15)',
                                color: b.role === 'user' ? '#60a5fa' : '#34d399',
                            }}
                        >
                            {b.role}
                        </span>
                        <span style={textMutedXs}>{new Date(b.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button
                            onClick={() => onCopy(b)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: copiedId === b.id ? '#10b981' : '#94a3b8',
                                cursor: 'pointer',
                                padding: 4,
                            }}
                            title={t('bookmarks.copy')}
                        >
                            {copiedId === b.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <button
                            onClick={() => onRemove(b.id)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: 4,
                            }}
                            title={t('bookmarks.remove')}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
                {b.note && (
                    <div
                        style={{
                            marginTop: '0.5rem',
                            padding: '0.4rem 0.6rem',
                            borderRadius: 6,
                            background: 'rgba(245,158,11,0.08)',
                            border: '1px solid rgba(245,158,11,0.15)',
                            fontSize: '0.8rem',
                            color: '#fbbf24',
                        }}
                    >
                        {b.note}
                    </div>
                )}
                <div
                    style={{
                        marginTop: '0.5rem',
                        color: '#e2e8f0',
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                        maxHeight: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {b.content}
                </div>
                <div style={{ ...flexBetween, marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {b.tags.map((tag) => (
                            <span
                                key={tag}
                                style={{
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: 8,
                                    background: 'rgba(139,92,246,0.1)',
                                    color: '#a78bfa',
                                    fontSize: '0.65rem',
                                }}
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            color: '#64748b',
                            fontSize: '0.7rem',
                        }}
                    >
                        <ExternalLink size={10} /> {b.sessionId?.slice(0, 8) ?? ''}
                    </div>
                </div>
            </motion.div>
        );
    },
);
