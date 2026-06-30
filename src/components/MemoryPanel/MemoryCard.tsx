import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Tag, Target, Code, Trash2 } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import type { MemoryEntry } from '../../types/memory';

interface MemoryCardProps {
    memory: MemoryEntry;
    index: number;
    searchQuery: string;
    isSearching: boolean;
    onDelete: (id: string) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({
    memory,
    index,
    searchQuery,
    isSearching,
    onDelete,
}) => {
    const { t } = useTranslation();
    const isCode = (memory.metadata as Record<string, unknown>).type === 'code';

    return (
        <motion.div
            key={memory.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: Math.min(index * 0.05, 0.5) }}
            className="glass-panel"
            style={{
                padding: '1.5rem',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
            }}
            whileHover={{
                y: -2,
                borderColor: 'rgba(16,185,129,0.3)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            }}
            role="listitem"
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div
                        style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: '#10b981',
                            background: 'rgba(16,185,129,0.15)',
                            padding: '0.3rem 0.6rem',
                            borderRadius: 6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            border: '1px solid rgba(16,185,129,0.2)',
                        }}
                    >
                        {memory.metadata.type || t('memory.context_fallback')}
                    </div>
                    <span
                        style={{ width: 4, height: 4, borderRadius: '50%', background: '#64748b' }}
                        aria-hidden="true"
                    />
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        ID: {memory.id.split('-')[0]}...
                    </span>
                </div>
                {searchQuery && !isSearching && memory.score !== undefined && (
                    <div
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'rgba(16,185,129,0.1)',
                            padding: '0.3rem 0.6rem',
                            borderRadius: 8,
                            border: '1px solid rgba(16,185,129,0.2)',
                        }}
                    >
                        <Target size={12} aria-hidden="true" />{' '}
                        {Math.min(100, Math.round((memory.score || 0) * 100))}
                        {t('memory.match_label')}
                    </div>
                )}
            </div>

            <div
                style={{
                    fontSize: '0.95rem',
                    color: '#e2e8f0',
                    lineHeight: 1.6,
                    fontFamily: isCode ? '"JetBrains Mono", monospace' : 'inherit',
                }}
            >
                {memory.content}
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    paddingTop: '1rem',
                    marginTop: '0.25rem',
                }}
            >
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span
                        style={{
                            fontSize: '0.7rem',
                            color: '#94a3b8',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '0.3rem 0.6rem',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <Clock size={12} aria-hidden="true" />{' '}
                        {new Date(memory.metadata.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                        style={{
                            fontSize: '0.7rem',
                            color: '#94a3b8',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '0.3rem 0.6rem',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <Tag size={12} aria-hidden="true" /> {memory.metadata.source || 'system'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="btn-secondary"
                        style={{ padding: '0.4rem', borderRadius: 8 }}
                        title={t('memory.view_embeddings')}
                        aria-label="View embedding details"
                    >
                        <Code size={16} color="#64748b" aria-hidden="true" />
                    </button>
                    <button
                        className="btn-secondary"
                        style={{ padding: '0.4rem', borderRadius: 8, color: '#ef4444' }}
                        title={t('memory.delete_vector')}
                        aria-label="Delete memory entry"
                        onClick={() => onDelete(memory.id)}
                    >
                        <Trash2 size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default MemoryCard;
