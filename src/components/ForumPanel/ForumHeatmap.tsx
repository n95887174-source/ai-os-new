import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';

interface ForumHeatmapProps {
    categories: Array<{ category: string; count: number }>;
}

/**
 * ForumHeatmap — per-category activity bars (topic/post distribution).
 */
const ForumHeatmap: React.FC<ForumHeatmapProps> = ({ categories }) => {
    const { t } = useTranslation();
    if (categories.length === 0) {
        return (
            <div style={{ fontSize: '0.66rem', color: '#475569' }}>{t('forum.no_activity')}</div>
        );
    }
    const max = Math.max(1, ...categories.map((c) => c.count));
    return (
        <div>
            {categories.map((c) => (
                <div
                    key={c.category}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}
                >
                    <span
                        style={{
                            fontSize: '0.62rem',
                            color: '#64748b',
                            width: 90,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {c.category}
                    </span>
                    <div style={{ flex: 1, height: 7, borderRadius: 4, background: '#0f172a' }}>
                        <div
                            style={{
                                height: '100%',
                                width: `${(c.count / max) * 100}%`,
                                background: '#8b5cf6',
                                borderRadius: 4,
                            }}
                        />
                    </div>
                    <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{c.count}</span>
                </div>
            ))}
        </div>
    );
};

export default ForumHeatmap;
