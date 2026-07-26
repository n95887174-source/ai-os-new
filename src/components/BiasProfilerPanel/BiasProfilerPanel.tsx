import React, { useState, useCallback } from 'react';
import { AlertTriangle, Info, Search, Eye, Brain, Target } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { BiasProfile } from '../../kernel/contracts/debate-bias';

const TECHNIQUE_ID = 'bias-exploit';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'BiasProfiler',
    nameRu: 'Профилировщик предубеждений',
    description:
        'Detect cognitive biases in arguments — exploit opponent biases and mitigate your own',
    descriptionRu:
        'Обнаруживает когнитивные искажения в аргументах — позволяет эксплуатировать предубеждения оппонента и защищать свои',
    category: 'P1',
    defaultEnabled: true,
};

const BIAS_LABELS: Record<string, string> = {
    confirmation_bias: 'Подтверждение',
    anchoring: 'Якорение',
    dunning_kruger: 'Даннинг-Крюгер',
    availability_heuristic: 'Эвристика доступности',
    false_dilemma: 'Ложная дилемма',
    slippery_slope: 'Скользкий склон',
    strawman: 'Соломенное чучело',
    ad_hominem: 'Ad Hominem',
    appeal_to_authority: 'Апелляция к авторитету',
    survivorship_bias: 'Ошибка выжившего',
    status_quo_bias: 'Статус-кво',
    bandwagon: 'Стадное чувство',
};

const SAMPLE_ARGUMENTS = [
    {
        agentId: 'a1',
        text: 'Все эксперты согласны, что ИИ опасен — так сказал Илон Маск и Стивен Хокинг.',
        bias: 'appeal_to_authority',
    },
    {
        agentId: 'a2',
        text: 'Если мы разрешим ИИ в медицине, то потом придётся разрешить и в военных целях, а затем он захватит мир.',
        bias: 'slippery_slope',
    },
    {
        agentId: 'a1',
        text: 'Раньше все технологии внедрялись без ограничений, и мир не рухнул. Зачем нам регулировать ИИ?',
        bias: 'status_quo_bias',
    },
    {
        agentId: 'a2',
        text: 'Либо мы полностью запрещаем ИИ, либо получаем антиутопию. Третьего не дано.',
        bias: 'false_dilemma',
    },
];

const simulateProfile = (_text: string): BiasProfile => ({
    agentId: 'a1',
    round: 2,
    biases: [
        {
            type: 'appeal_to_authority',
            score: 0.82,
            evidence: 'так сказал Илон Маск и Стивен Хокинг',
            isExploitable: true,
        },
        {
            type: 'confirmation_bias',
            score: 0.65,
            evidence: 'использует только факты, подтверждающие позицию',
            isExploitable: true,
        },
    ],
    dominantBias: 'appeal_to_authority',
    overallScore: 0.74,
});

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

export const BiasProfilerPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedArgIdx, setSelectedArgIdx] = useState(0);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const arg = SAMPLE_ARGUMENTS[selectedArgIdx];
    const profile = simulateProfile(arg.text);

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
                    <AlertTriangle size={22} color="#ef4444" />
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

            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(239,68,68,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#f87171" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Search size={20} />,
                            title: 'Детекция',
                            desc: '15 типов когнитивных искажений обнаруживаются через regex-паттерны (RU+EN). Каждое искажение имеет вес и флаг эксплуатируемости.',
                        },
                        {
                            icon: <Brain size={20} />,
                            title: 'Профилирование',
                            desc: 'Для каждого аргумента строится BiasProfile: список искажений, доминантное искажение и aggregate score 0-1.',
                        },
                        {
                            icon: <Target size={20} />,
                            title: 'Эксплойт и защита',
                            desc: 'Генерируются промпты: getExploitPrompt() — как оппоненту использовать искажение, getMitigationPrompt() — как агенту защититься.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(239,68,68,0.1)',
                            }}
                        >
                            <div style={{ color: '#f87171', marginBottom: 8 }}>{card.icon}</div>
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
                    border: '1px solid rgba(239,68,68,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Eye size={18} color="#f87171" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: анализ искажений
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Аргумент:</span>
                    <select
                        value={selectedArgIdx}
                        onChange={(e) => setSelectedArgIdx(Number(e.target.value))}
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
                        {SAMPLE_ARGUMENTS.map((a, i) => (
                            <option key={i} value={i}>
                                #{i + 1} — {BIAS_LABELS[a.bias] || a.bias}
                            </option>
                        ))}
                    </select>
                </div>

                <div
                    style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(59,130,246,0.08)',
                        border: '1px solid rgba(59,130,246,0.15)',
                        fontSize: 12,
                        color: '#cbd5e1',
                        marginBottom: 16,
                    }}
                >
                    {arg.text}
                </div>

                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    Обнаруженные искажения:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {profile.biases.map((b, i) => (
                        <div
                            key={i}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 8,
                                background: 'rgba(239,68,68,0.06)',
                                border: '1px solid rgba(239,68,68,0.2)',
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
                                <span
                                    style={{
                                        fontSize: 10,
                                        padding: '1px 5px',
                                        borderRadius: 3,
                                        background: 'rgba(239,68,68,0.15)',
                                        color: '#f87171',
                                        fontWeight: 600,
                                    }}
                                >
                                    {BIAS_LABELS[b.type] || b.type}
                                </span>
                                <span
                                    style={{
                                        marginLeft: 'auto',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: b.score > 0.7 ? '#ef4444' : '#facc15',
                                    }}
                                >
                                    {b.score.toFixed(2)}
                                </span>
                                {b.isExploitable && (
                                    <span
                                        style={{
                                            fontSize: 10,
                                            padding: '1px 5px',
                                            borderRadius: 3,
                                            background: 'rgba(245,158,11,0.15)',
                                            color: '#f59e0b',
                                            fontWeight: 500,
                                        }}
                                    >
                                        ЭКСПЛУАТИРУЕМО
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                Доказательство: {b.evidence}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
                            Эксплойт-промпт
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                            «Оппонент полагается на авторитеты — потребуйте от него прямых
                            доказательств вместо цитирования мнений.»
                        </div>
                    </div>
                    <div
                        style={{
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(16,185,129,0.06)',
                            border: '1px solid rgba(16,185,129,0.2)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#34d399',
                                marginBottom: 4,
                            }}
                        >
                            Митигация
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                            «Проверьте свои аргументы на апелляцию к авторитету — используйте факты
                            и данные вместо мнений.»
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Bias Profiler — P1.18 протокол. Не требует LLM-вызовов. 15 типов искажений,
                двуязычные паттерны (RU/EN).
            </div>
        </div>
    );
};

export default BiasProfilerPanel;
