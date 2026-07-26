import React, { useState, useCallback } from 'react';
import { Layers, BarChart3 } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';

const TECHNIQUE_ID = 'frame';

const FRAMES = [
    { id: 'crisis' as const, label: 'Crisis', labelRu: 'Кризис', color: '#ef4444' },
    { id: 'opportunity' as const, label: 'Opportunity', labelRu: 'Возможность', color: '#22c55e' },
    { id: 'moral' as const, label: 'Moral', labelRu: 'Мораль', color: '#8b5cf6' },
    { id: 'economic' as const, label: 'Economic', labelRu: 'Экономика', color: '#f59e0b' },
    { id: 'scientific' as const, label: 'Scientific', labelRu: 'Наука', color: '#06b6d4' },
    { id: 'security' as const, label: 'Security', labelRu: 'Безопасность', color: '#f97316' },
    { id: 'fairness' as const, label: 'Fairness', labelRu: 'Справедливость', color: '#ec4899' },
    { id: 'risk' as const, label: 'Risk', labelRu: 'Риск', color: '#a855f7' },
];

const SAMPLE_ARGUMENTS = [
    {
        agentName: 'Афина',
        text: "This AI arms race is an existential crisis — we must act before it's too late.",
        frame: 'crisis' as const,
    },
    {
        agentName: 'Гермес',
        text: 'AI presents an unprecedented economic opportunity worth trillions.',
        frame: 'opportunity' as const,
    },
    {
        agentName: 'Афина',
        text: "There's a moral imperative to ensure AI benefits all of humanity equally.",
        frame: 'moral' as const,
    },
    {
        agentName: 'Гермес',
        text: 'The security risks of unregulated AI development are too dangerous.',
        frame: 'security' as const,
    },
    {
        agentName: 'Афина',
        text: 'Strong regulations would cripple economic growth and innovation.',
        frame: 'economic' as const,
    },
];

const FRAME_KEYWORDS: Record<string, string[]> = {
    crisis: [
        'crisis',
        'urgent',
        'catastrophe',
        'irreversible',
        'existential',
        'tipping point',
        'breakdown',
    ],
    opportunity: [
        'opportunity',
        'potential',
        'breakthrough',
        'revolution',
        'transform',
        'unprecedented',
    ],
    moral: [
        'moral',
        'ethical',
        'right',
        'wrong',
        'justice',
        'fair',
        'responsibility',
        'duty',
        'virtue',
    ],
    economic: [
        'economic',
        'growth',
        'trillions',
        'market',
        'gdp',
        'productivity',
        'profit',
        'cost',
        'efficiency',
    ],
    scientific: [
        'scientific',
        'research',
        'evidence',
        'data',
        'study',
        'discovery',
        'peer-reviewed',
    ],
    security: [
        'security',
        'danger',
        'threat',
        'risk',
        'safety',
        'protect',
        'vulnerability',
        'attack',
    ],
    fairness: ['fairness', 'equality', 'bias', 'discrimination', 'inclusive', 'access', 'divide'],
    risk: ['risk', 'uncertain', 'unknown', 'precautionary', 'downside', 'exposure'],
};

const detectFrames = (text: string): Array<{ frame: string; count: number }> => {
    const lower = text.toLowerCase();
    return FRAMES.map((f) => ({
        frame: f.id,
        count: (FRAME_KEYWORDS[f.id] || []).filter((kw) => lower.includes(kw)).length,
    }))
        .filter((f) => f.count > 0)
        .sort((a, b) => b.count - a.count);
};

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            background: checked ? '#10b981' : '#374151',
            transition: 'background 0.2s',
            flexShrink: 0,
        }}
    >
        <span
            style={{
                position: 'absolute',
                top: 2,
                left: checked ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
            }}
        />
    </button>
);

export const FrameTrackerPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? true;
    const [selectedArg, setSelectedArg] = useState<number | null>(null);
    const handleToggle = useCallback(() => {
        setSetting(TECHNIQUE_ID, !enabled);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const frameCounts: Record<string, number> = {};
    for (const arg of SAMPLE_ARGUMENTS) {
        frameCounts[arg.frame] = (frameCounts[arg.frame] || 0) + 1;
    }
    const dominant = Object.entries(frameCounts).sort((a, b) => b[1] - a[1]);

    return (
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.7)',
                    border: '1px solid rgba(148,163,184,0.1)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Layers size={22} color="#8b5cf6" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        Отслеживание фреймов
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(245,158,11,0.15)',
                            color: '#f59e0b',
                            fontWeight: 600,
                        }}
                    >
                        P1
                    </span>
                    <div style={{ flex: 1 }} />
                    <Toggle checked={enabled} onChange={handleToggle} />
                    <span
                        style={{
                            fontSize: 13,
                            color: enabled ? '#10b981' : '#64748b',
                            fontWeight: 500,
                        }}
                    >
                        {enabled ? 'Активно' : 'Отключено'}
                    </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                    Отслеживай, как каждая сторона фреймирует проблему, и меняй фрейминг
                    стратегически. 15 типов фреймов: crisis, opportunity, moral, economic,
                    scientific, legal, security и др.
                </p>
            </div>

            {/* Dominant frame */}
            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(139,92,246,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <BarChart3 size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: анализ фреймов
                    </h3>
                </div>

                {dominant.length > 0 && (
                    <div
                        style={{
                            marginBottom: 16,
                            padding: 14,
                            borderRadius: 10,
                            background: 'rgba(139,92,246,0.08)',
                            border: '1px solid rgba(139,92,246,0.2)',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                            Доминирующий фрейм
                        </div>
                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 700,
                                color:
                                    FRAMES.find((f) => f.id === dominant[0][0])?.color || '#a78bfa',
                            }}
                        >
                            {FRAMES.find((f) => f.id === dominant[0][0])?.labelRu || dominant[0][0]}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                            {dominant[0][1]} из {SAMPLE_ARGUMENTS.length} аргументов (
                            {((dominant[0][1] / SAMPLE_ARGUMENTS.length) * 100).toFixed(0)}%)
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SAMPLE_ARGUMENTS.map((arg, i) => {
                        const detected = detectFrames(arg.text);
                        const isSelected = selectedArg === i;
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    background: isSelected
                                        ? 'rgba(139,92,246,0.08)'
                                        : 'rgba(15,23,42,0.4)',
                                    border: isSelected
                                        ? '1px solid rgba(139,92,246,0.25)'
                                        : '1px solid rgba(148,163,184,0.08)',
                                }}
                                onClick={() => setSelectedArg(isSelected ? null : i)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setSelectedArg(isSelected ? null : i);
                                }}
                                tabIndex={0}
                                role="button"
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 2,
                                    }}
                                >
                                    <span
                                        style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa' }}
                                    >
                                        {arg.agentName}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            background: `${FRAMES.find((f) => f.id === arg.frame)?.color || 'rgba(148,163,184,0.1)'}20`,
                                            color:
                                                FRAMES.find((f) => f.id === arg.frame)?.color ||
                                                '#94a3b8',
                                        }}
                                    >
                                        {FRAMES.find((f) => f.id === arg.frame)?.labelRu ||
                                            arg.frame}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: '#cbd5e1' }}>{arg.text}</div>
                                {isSelected && detected.length > 0 && (
                                    <div
                                        style={{
                                            marginTop: 6,
                                            padding: 8,
                                            borderRadius: 6,
                                            background: 'rgba(15,23,42,0.5)',
                                            fontSize: 10,
                                            color: '#64748b',
                                        }}
                                    >
                                        {detected.map((d) => (
                                            <span key={d.frame} style={{ marginRight: 12 }}>
                                                {d.frame}: {d.count} keywords
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(139,92,246,0.06)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    justifyContent: 'center',
                }}
            >
                {FRAMES.map((f) => (
                    <span
                        key={f.id}
                        style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: `${f.color}15`,
                            color: f.color,
                            fontSize: 10,
                        }}
                    >
                        {f.labelRu}
                    </span>
                ))}
            </div>
        </div>
    );
};
export default FrameTrackerPanel;
