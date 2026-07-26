import React, { useState, useCallback } from 'react';
import { Shield, Info, BarChart3, Target, AlertTriangle } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';

const TECHNIQUE_ID = 'steelman';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'Steelman',
    nameRu: 'Стальной аргумент',
    description: 'Strengthen opponent position before refuting — steelman fallacies',
    descriptionRu:
        'Усиль позицию оппонента перед опровержением, чтобы избежать атаки на соломенное чучело',
    category: 'P0',
    defaultEnabled: true,
};

const SAMPLE_ARGUMENTS = [
    {
        id: 'a1',
        agentId: 'agent-1',
        agentName: 'Афина',
        content:
            'Искусственный интеллект должен быть открытым, потому что прозрачность — единственный способ обеспечить безопасность и доверие общества.',
        round: 1,
    },
    {
        id: 'a2',
        agentId: 'agent-2',
        agentName: 'Гермес',
        content:
            'Закрытые системы безопаснее, так как ограничивают доступ злоумышленников к модели.',
        round: 1,
    },
    {
        id: 'a3',
        agentId: 'agent-1',
        agentName: 'Афина',
        content: 'История показывает, что открытые стандарты (интернет, Linux) побеждают закрытые.',
        round: 2,
    },
    {
        id: 'a4',
        agentId: 'agent-2',
        agentName: 'Гермес',
        content:
            'Открытый исходный код не гарантирует безопасности — Heartbleed был в открытом OpenSSL.',
        round: 2,
    },
    {
        id: 'a5',
        agentId: 'agent-1',
        agentName: 'Афина',
        content: 'Регуляция должна быть, но не ценой полной секретности. Нужен баланс.',
        round: 3,
    },
];

const substanceScore = (length: number): number => Math.min(1, Math.max(0, (length - 50) / 500));

const computeScores = (args: typeof SAMPLE_ARGUMENTS, agentId: string) => {
    const opponentArgs = args.filter((a) => a.agentId !== agentId);
    if (opponentArgs.length === 0) return [];
    const maxRound = Math.max(...opponentArgs.map((a) => a.round));
    return opponentArgs.map((a) => {
        const recency = a.round / Math.max(1, maxRound);
        const substance = substanceScore(a.content.length);
        const score = recency * 0.5 + substance * 0.5;
        return { arg: a, recency, substance, score };
    });
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

export const SteelmanPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const [demoAgent, setDemoAgent] = useState('agent-2');

    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const scored = computeScores(SAMPLE_ARGUMENTS, demoAgent);

    return (
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
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
                    <Shield size={22} color="#8b5cf6" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(239,68,68,0.15)',
                            color: '#ef4444',
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

            {/* How it works */}
            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(99,102,241,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#818cf8" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Target size={20} />,
                            title: 'Выбор цели',
                            desc: 'Алгоритм выбирает самое сильное утверждение оппонента на основе свежести (рецентности) и содержательности.',
                        },
                        {
                            icon: <BarChart3 size={20} />,
                            title: 'Оценка',
                            desc: 'Каждое утверждение получает score = recency × 0.5 + substance × 0.5, где substance зависит от длины текста.',
                        },
                        {
                            icon: <AlertTriangle size={20} />,
                            title: 'Стальной аргумент',
                            desc: 'Агент переформулирует позицию оппонента в её сильнейшей форме перед опровержением — предотвращает соломенное чучело.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(99,102,241,0.1)',
                            }}
                        >
                            <div style={{ color: '#818cf8', marginBottom: 8 }}>{card.icon}</div>
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

            {/* Scoring demo */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <BarChart3 size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: алгоритм выбора цели
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Оценка для:</span>
                    <select
                        value={demoAgent}
                        onChange={(e) => setDemoAgent(e.target.value)}
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
                        <option value="agent-2">Гермес</option>
                        <option value="agent-1">Афина</option>
                    </select>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginBottom: 16,
                    }}
                >
                    {SAMPLE_ARGUMENTS.filter((a) => a.agentId === demoAgent).map((a) => (
                        <div
                            key={a.id}
                            style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                background: 'rgba(59,130,246,0.08)',
                                border: '1px solid rgba(59,130,246,0.15)',
                                fontSize: 12,
                                color: '#cbd5e1',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginBottom: 4,
                                }}
                            >
                                <span style={{ fontWeight: 600, color: '#93c5fd', fontSize: 11 }}>
                                    {a.agentName}
                                </span>
                                <span style={{ fontSize: 10, color: '#64748b' }}>
                                    раунд {a.round}
                                </span>
                            </div>
                            {a.content}
                        </div>
                    ))}
                </div>

                {scored.length > 0 && (
                    <div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                            Результаты оценки утверждений оппонента:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {scored
                                .sort((a, b) => b.score - a.score)
                                .map((s, i) => (
                                    <div
                                        key={s.arg.id}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: 10,
                                            background:
                                                i === 0
                                                    ? 'rgba(139,92,246,0.1)'
                                                    : 'rgba(15,23,42,0.4)',
                                            border:
                                                i === 0
                                                    ? '1px solid rgba(139,92,246,0.3)'
                                                    : '1px solid rgba(148,163,184,0.08)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                marginBottom: 6,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontWeight: 600,
                                                    fontSize: 12,
                                                    color: '#a78bfa',
                                                }}
                                            >
                                                {s.arg.agentName}
                                            </span>
                                            <span style={{ fontSize: 10, color: '#64748b' }}>
                                                раунд {s.arg.round}
                                            </span>
                                            {i === 0 && (
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        padding: '1px 6px',
                                                        borderRadius: 4,
                                                        background: 'rgba(139,92,246,0.2)',
                                                        color: '#a78bfa',
                                                        fontWeight: 600,
                                                        marginLeft: 'auto',
                                                    }}
                                                >
                                                    ВЫБРАН
                                                </span>
                                            )}
                                            <span
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color:
                                                        s.score > 0.7
                                                            ? '#22c55e'
                                                            : s.score > 0.4
                                                              ? '#facc15'
                                                              : '#f97316',
                                                    marginLeft: i !== 0 ? 'auto' : undefined,
                                                }}
                                            >
                                                {s.score.toFixed(3)}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: '#94a3b8',
                                                marginBottom: 6,
                                            }}
                                        >
                                            {s.arg.content}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 16,
                                                fontSize: 10,
                                                color: '#64748b',
                                            }}
                                        >
                                            <span>
                                                Рецентность ({s.arg.round}/
                                                {Math.max(...scored.map((x) => x.arg.round))}):{' '}
                                                <span style={{ color: '#818cf8' }}>
                                                    {s.recency.toFixed(2)}
                                                </span>
                                            </span>
                                            <span>
                                                Длина ({s.arg.content.length} символов):{' '}
                                                <span style={{ color: '#818cf8' }}>
                                                    {s.substance.toFixed(2)}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Info footer */}
            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(139,92,246,0.06)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Steelmanning — P0.9 протокол. Не требует LLM-вызовов, работает на эвристиках.
                Настройка применяется к новым дебатам. Статус техники сохраняется в localStorage.
            </div>
        </div>
    );
};

export default SteelmanPanel;
