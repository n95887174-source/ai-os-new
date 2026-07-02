import React, { useState } from 'react';
import PanelLoader from '../PanelLoader';

const SAMPLE_ITEMS = [
    {
        type: 'topology',
        name: 'Debate Flow v2',
        author: 'system',
        downloads: 128,
        rating: 4.5,
        description: 'Multi-agent debate with router, 4 agents, and aggregator',
        tags: ['debate', 'multi-agent'],
    },
    {
        type: 'topology',
        name: 'Research Pipeline',
        author: 'system',
        downloads: 95,
        rating: 4.2,
        description: 'Epistemic loop: question → search → analyze → synthesize',
        tags: ['research', 'pipeline'],
    },
    {
        type: 'prompt',
        name: 'Socratic Questioner',
        author: 'system',
        downloads: 212,
        rating: 4.8,
        description: 'Guides discussion through probing questions',
        tags: ['debate', 'teaching'],
    },
    {
        type: 'prompt',
        name: 'Code Reviewer',
        author: 'system',
        downloads: 167,
        rating: 4.6,
        description: 'Reviews code for bugs, style, and security',
        tags: ['code', 'review'],
    },
    {
        type: 'template',
        name: 'Strategy Showdown',
        author: 'system',
        downloads: 73,
        rating: 4.0,
        description: 'Compare 4 strategies on the same topic',
        tags: ['debate', 'comparison'],
    },
    {
        type: 'prompt',
        name: 'Interview Panel',
        author: 'system',
        downloads: 54,
        rating: 3.9,
        description: 'Multi-agent interview with different personas',
        tags: ['interview', 'roleplay'],
    },
];

const TYPE_ICONS: Record<string, string> = {
    topology: '\uD83D\uDD17',
    prompt: '\uD83D\uDCDD',
    template: '\uD83D\uDCCB',
};
const TYPE_COLORS: Record<string, string> = {
    topology: '#8b5cf6',
    prompt: '#3b82f6',
    template: '#10b981',
};

const CommunityHubPanel: React.FC = () => {
    const [tab, setTab] = useState<'topologies' | 'prompts' | 'templates'>('topologies');
    const [search, setSearch] = useState('');

    const filtered = SAMPLE_ITEMS.filter((i) => {
        if (tab === 'topologies' && i.type !== 'topology') return false;
        if (tab === 'prompts' && i.type !== 'prompt') return false;
        if (tab === 'templates' && i.type !== 'template') return false;
        if (
            search &&
            !i.name.toLowerCase().includes(search.toLowerCase()) &&
            !i.description.toLowerCase().includes(search.toLowerCase())
        )
            return false;
        return true;
    });

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
                {[
                    {
                        id: 'topologies' as const,
                        label: 'Topologies',
                        icon: '\uD83D\uDD17',
                        count: SAMPLE_ITEMS.filter((i) => i.type === 'topology').length,
                    },
                    {
                        id: 'prompts' as const,
                        label: 'Prompts',
                        icon: '\uD83D\uDCDD',
                        count: SAMPLE_ITEMS.filter((i) => i.type === 'prompt').length,
                    },
                    {
                        id: 'templates' as const,
                        label: 'Templates',
                        icon: '\uD83D\uDCCB',
                        count: SAMPLE_ITEMS.filter((i) => i.type === 'template').length,
                    },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: tab === t.id ? 'rgba(59,130,246,0.2)' : 'transparent',
                            color: tab === t.id ? '#60a5fa' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                        }}
                    >
                        <span>{t.icon}</span> {t.label}{' '}
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            ({t.count})
                        </span>
                    </button>
                ))}
                <div style={{ flex: 1 }} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    style={{
                        width: 180,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.2)',
                        color: 'var(--text-primary)',
                        fontSize: '0.7rem',
                    }}
                />
            </div>

            {/* Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '0.75rem',
                }}
            >
                {filtered.map((item, i) => (
                    <div
                        key={i}
                        style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>{TYPE_ICONS[item.type]}</span>
                            <span
                                style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    flex: 1,
                                }}
                            >
                                {item.name}
                            </span>
                            <span
                                style={{
                                    fontSize: '0.6rem',
                                    padding: '0.1rem 0.3rem',
                                    borderRadius: '3px',
                                    background: `${TYPE_COLORS[item.type]}20`,
                                    color: TYPE_COLORS[item.type],
                                }}
                            >
                                {item.type}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {item.description}
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {item.tags.map((t) => (
                                <span
                                    key={t}
                                    style={{
                                        fontSize: '0.6rem',
                                        padding: '0.05rem 0.3rem',
                                        borderRadius: '3px',
                                        background: 'rgba(255,255,255,0.04)',
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.65rem',
                                color: 'var(--text-muted)',
                                marginTop: '0.2rem',
                            }}
                        >
                            <span>by {item.author}</span>
                            <span>\u2B50 {item.rating}</span>
                            <span>\u2B07 {item.downloads}</span>
                            <div style={{ flex: 1 }} />
                            <button
                                style={{
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: 'rgba(59,130,246,0.2)',
                                    color: '#60a5fa',
                                    cursor: 'pointer',
                                    fontSize: '0.65rem',
                                }}
                            >
                                Import
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function CommunityHubWrapper() {
    return (
        <PanelLoader title="Community Hub">
            <CommunityHubPanel />
        </PanelLoader>
    );
}
