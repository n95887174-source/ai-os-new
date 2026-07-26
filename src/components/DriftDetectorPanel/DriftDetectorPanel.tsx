import React, { useState, useCallback } from 'react';
import { Navigation, Info, UserCheck, AlertTriangle, TrendingUp, Eye } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';

const TECHNIQUE_ID = 'stance-drift';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'DriftDetector',
    nameRu: 'Детектор дрейфа',
    description:
        'Monitor persona consistency — detect when agents drift out of character and trigger correction',
    descriptionRu:
        'Отслеживает целостность персоны: обнаруживает, когда агент отклоняется от своего характера, и запускает коррекцию',
    category: 'P1',
    defaultEnabled: true,
};

const ROUNDS = [
    {
        round: 1,
        content:
            'ИИ должен быть открытым, прозрачность — единственный способ обеспечить безопасность и доверие общества.',
        driftScore: 0.05,
    },
    {
        round: 2,
        content: 'История показывает, что открытые стандарты (интернет, Linux) побеждают закрытые.',
        driftScore: 0.08,
    },
    {
        round: 3,
        content:
            'Ну хорошо, возможно в некоторых случаях закрытость может быть оправдана коммерческими интересами.',
        driftScore: 0.25,
    },
    {
        round: 4,
        content:
            'В конце концов, главное — чтобы софт работал, а открыт он или закрыт — не так важно.',
        driftScore: 0.52,
    },
    {
        round: 5,
        content:
            'Закрытые системы действительно безопаснее, и бизнес должен защищать свои инвестиции.',
        driftScore: 0.78,
    },
];

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

export const DriftDetectorPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedRound, setSelectedRound] = useState(5);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const visibleRounds = ROUNDS.filter((r) => r.round <= selectedRound);
    const last = visibleRounds[visibleRounds.length - 1];

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
                    <Navigation size={22} color="#ec4899" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(236,72,153,0.15)',
                            color: '#ec4899',
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
                    border: '1px solid rgba(236,72,153,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#f472b6" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <UserCheck size={20} />,
                            title: 'Регистрация персоны',
                            desc: 'Перед дебатами регистрируется persona: role (pro/con), system prompt, ключевые слова.',
                        },
                        {
                            icon: <Eye size={20} />,
                            title: 'Сравнение аргументов',
                            desc: 'Каждый аргумент сравнивается с persona profile: keywords, accumulated vocabulary, role-соответствие.',
                        },
                        {
                            icon: <AlertTriangle size={20} />,
                            title: 'Коррекция',
                            desc:
                                'При driftScore {' >
                                '} 0.3 агент получает correction prompt: «Вернитесь к вашей роли — вы отклоняетесь от персонажа».',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(236,72,153,0.1)',
                            }}
                        >
                            <div style={{ color: '#f472b6', marginBottom: 8 }}>{card.icon}</div>
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
                    border: '1px solid rgba(236,72,153,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <TrendingUp size={18} color="#f472b6" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: дрейф персоны
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Показать до раунда:</span>
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
                        {[1, 2, 3, 4, 5].map((r) => (
                            <option key={r} value={r}>
                                Раунд {r}
                            </option>
                        ))}
                    </select>
                </div>

                <div
                    style={{
                        background: 'rgba(139,92,246,0.06)',
                        border: '1px solid rgba(139,92,246,0.15)',
                        borderRadius: 8,
                        padding: 10,
                        fontSize: 11,
                        color: '#94a3b8',
                        marginBottom: 16,
                    }}
                >
                    Персона: <span style={{ color: '#c4b5fd', fontWeight: 600 }}>Афина</span> —
                    Сторонник открытого ИИ | Ключевые слова: прозрачность, открытость, доверие,
                    инновации, сообщество
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {visibleRounds.map((r, i) => {
                        const isDrifting = r.driftScore > 0.3;
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: isDrifting
                                        ? 'rgba(239,68,68,0.06)'
                                        : 'rgba(59,130,246,0.06)',
                                    border: `1px solid ${isDrifting ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.15)'}`,
                                    fontSize: 11,
                                    color: '#cbd5e1',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 2,
                                    }}
                                >
                                    <span
                                        style={{ fontWeight: 600, color: '#93c5fd', fontSize: 11 }}
                                    >
                                        Раунд {r.round}
                                    </span>
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color:
                                                r.driftScore > 0.3
                                                    ? '#ef4444'
                                                    : r.driftScore > 0.15
                                                      ? '#facc15'
                                                      : '#22c55e',
                                        }}
                                    >
                                        drift: {r.driftScore.toFixed(2)}
                                    </span>
                                    {isDrifting && (
                                        <span
                                            style={{
                                                fontSize: 10,
                                                padding: '1px 5px',
                                                borderRadius: 3,
                                                background: 'rgba(239,68,68,0.15)',
                                                color: '#ef4444',
                                                fontWeight: 600,
                                            }}
                                        >
                                            ДРЕЙФ
                                        </span>
                                    )}
                                </div>
                                <div style={{ color: '#94a3b8' }}>{r.content}</div>
                            </div>
                        );
                    })}
                </div>

                {last.driftScore > 0.3 && (
                    <div
                        style={{
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(245,158,11,0.06)',
                            border: '1px solid rgba(245,158,11,0.2)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#f59e0b',
                                marginBottom: 4,
                            }}
                        >
                            Correction Prompt
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                            «Вы отклоняетесь от вашей роли сторонника открытого ИИ. Вернитесь к
                            вашим ключевым принципам: прозрачность, открытость, доверие общества.»
                        </div>
                    </div>
                )}
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(236,72,153,0.06)',
                    border: '1px solid rgba(236,72,153,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Persona Drift Detector — P1.16 протокол. Не требует LLM-вызовов. Сравнение через
                keyword overlap и vocabulary drift.
            </div>
        </div>
    );
};

export default DriftDetectorPanel;
