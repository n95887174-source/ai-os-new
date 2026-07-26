import React, { useState, useCallback } from 'react';
import { Copy, Info, Search, AlertTriangle, BarChart4, TrendingUp } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';

const TECHNIQUE_ID = 'redundancy';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'SimilarityMonitor',
    nameRu: 'Монитор повторов',
    description:
        'Track argument similarity across recent turns — force novelty when redundancy exceeds threshold',
    descriptionRu:
        'Отслеживает схожесть аргументов с предыдущими — принуждает к новизне при превышении порога повторяемости',
    category: 'P1',
    defaultEnabled: true,
};

const AGENTS = [
    {
        name: 'Афина',
        content:
            'ИИ должен быть открытым, прозрачность — единственный способ обеспечить безопасность и доверие общества.',
    },
    {
        name: 'Гермес',
        content:
            'Закрытые системы безопаснее, так как ограничивают доступ злоумышленников к модели.',
    },
    {
        name: 'Афина',
        content: 'История показывает, что открытые стандарты (интернет, Linux) побеждают закрытые.',
    },
    {
        name: 'Афина',
        content:
            'Открытость — это фундаментальный принцип, прозрачность кода ведёт к доверию пользователей.',
    },
];

const detectRedundancy = (content: string, prior: string): number => {
    const words1 = new Set(content.toLowerCase().split(/\s+/));
    const words2 = new Set(prior.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({
    checked,
    onChange,
}) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
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

export const SimilarityMonitorPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedRound, setSelectedRound] = useState(3);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const current = AGENTS[selectedRound - 1];
    const prior =
        selectedRound > 1
            ? AGENTS.slice(0, selectedRound - 1).filter((a) => a.name === current.name)
            : [];
    const similarity =
        prior.length > 0
            ? Math.max(...prior.map((p) => detectRedundancy(current.content, p.content)))
            : 0;
    const redundant = similarity > 0.35;

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
                    <Copy size={22} color="#f97316" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(249,115,22,0.15)',
                            color: '#f97316',
                            fontWeight: 600,
                        }}
                    >
                        {TECHNIQUE.category}
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
                    {TECHNIQUE.descriptionRu}
                </p>
                <p
                    style={{
                        margin: '4px 0 0 0',
                        fontSize: 11,
                        color: '#64748b',
                        fontStyle: 'italic',
                    }}
                >
                    {TECHNIQUE.description}
                </p>
            </div>

            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(249,115,22,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#fb923c" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Search size={20} />,
                            title: 'Jaccard similarity',
                            desc: 'Каждый новый аргумент сравнивается с предыдущими того же агента через Jaccard overlap токенов.',
                        },
                        {
                            icon: <AlertTriangle size={20} />,
                            title: 'Порог повторяемости',
                            desc: 'Если similarity превышает threshold (0.35), аргумент считается redundant — в промпт добавляется forced-novelty блок.',
                        },
                        {
                            icon: <BarChart4 size={20} />,
                            title: 'Sliding window',
                            desc: 'Сравнение идёт только по последним N аргументам (default 3) — учитывается только недавний контекст.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(249,115,22,0.1)',
                            }}
                        >
                            <div style={{ color: '#fb923c', marginBottom: 8 }}>{card.icon}</div>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#e2e8f0',
                                    marginBottom: 4,
                                }}
                            >
                                {card.title}
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                                {card.desc}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(249,115,22,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <TrendingUp size={18} color="#fb923c" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: детекция повторов
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Раунд:</span>
                    <select
                        value={selectedRound}
                        onChange={(e) => setSelectedRound(Number(e.target.value))}
                        style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            background: 'rgba(15,23,42,0.6)',
                            color: '#e2e8f0',
                            border: '1px solid rgba(148,163,184,0.2)',
                            cursor: 'pointer',
                        }}
                    >
                        {[2, 3, 4].map((r) => (
                            <option key={r} value={r}>
                                Раунд {r}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {AGENTS.slice(0, selectedRound).map((a, i) => (
                        <div
                            key={i}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                background: 'rgba(59,130,246,0.08)',
                                border: '1px solid rgba(59,130,246,0.15)',
                                fontSize: 11,
                                color: '#cbd5e1',
                            }}
                        >
                            <span style={{ fontWeight: 600, color: '#93c5fd' }}>{a.name}</span> (R
                            {i + 1}): {a.content}
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        padding: 14,
                        borderRadius: 10,
                        background: redundant ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                        border: `1px solid ${redundant ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span
                            style={{
                                fontWeight: 600,
                                fontSize: 12,
                                color: redundant ? '#ef4444' : '#22c55e',
                            }}
                        >
                            {redundant ? 'ПОВТОР ОБНАРУЖЕН' : 'НОРМА'}
                        </span>
                        <span
                            style={{
                                marginLeft: 'auto',
                                fontSize: 13,
                                fontWeight: 700,
                                color:
                                    similarity > 0.35
                                        ? '#ef4444'
                                        : similarity > 0.2
                                          ? '#facc15'
                                          : '#22c55e',
                            }}
                        >
                            {similarity.toFixed(3)}
                        </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        Jaccard similarity с предыдущим аргументом{' '}
                        {prior.length > 0 ? `${current.name}` : '(нет предыстории)'}{' '}
                    </div>
                    {redundant && (
                        <div
                            style={{
                                fontSize: 11,
                                color: '#f97316',
                                marginTop: 4,
                                fontStyle: 'italic',
                            }}
                        >
                            Порог 0.35 превышен — будет добавлен forced-novelty промпт.
                        </div>
                    )}
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(249,115,22,0.06)',
                    border: '1px solid rgba(249,115,22,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Similarity Monitor — P1.26 протокол. Не требует LLM-вызовов. Jaccard overlap
                токенов, sliding window из 3 последних аргументов.
            </div>
        </div>
    );
};

export default SimilarityMonitorPanel;
