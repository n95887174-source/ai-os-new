import React, { useState, useCallback } from 'react';
import { Brain, Info, BarChart3, Plus, RotateCcw } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';

const TECHNIQUE_ID = 'bayesian-judges';

const strengthToLikelihood = (strength: number): number => {
    const clamped = Math.max(-1, Math.min(1, strength));
    return 1 / (1 + Math.exp(-clamped * 2.5));
};

const bayesianUpdate = (prior: number, likelihood: number): number => {
    const numerator = likelihood * prior;
    const denominator = numerator + (1 - likelihood) * (1 - prior);
    return denominator > 0 ? numerator / denominator : 0.5;
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

const simulateArguments = [
    { label: 'Слабый', strength: 0.2, desc: 'Поверхностный аргумент, мало доказательств' },
    { label: 'Средний', strength: 0.5, desc: 'Умеренно убедительный аргумент' },
    { label: 'Сильный', strength: 0.8, desc: 'Хорошо обоснованный аргумент с данными' },
    { label: 'Очень сильный', strength: 1.0, desc: 'Неопровержимое доказательство' },
    { label: 'Контраргумент', strength: -0.6, desc: 'Сильный контраргумент оппонента' },
];

export const BayesianJudgePanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? true;
    const [beliefs, setBeliefs] = useState<
        Array<{ agentId: string; posterior: number; updates: number }>
    >([{ agentId: 'agent-alpha', posterior: 0.5, updates: 0 }]);
    const [log, setLog] = useState<
        Array<{ strength: number; likelihood: number; prior: number; posterior: number }>
    >([]);
    const [customStrength, setCustomStrength] = useState(0.5);

    const handleToggle = useCallback(() => {
        setSetting(TECHNIQUE_ID, !enabled);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const handleAddArgument = useCallback((strength: number) => {
        setBeliefs((prev) => {
            const agent = { ...prev[0] };
            const likelihood = strengthToLikelihood(strength);
            const posterior = bayesianUpdate(agent.posterior, likelihood);
            setLog((l) => [
                ...l.slice(-19),
                { strength, likelihood, prior: agent.posterior, posterior },
            ]);
            return [{ agentId: agent.agentId, posterior, updates: agent.updates + 1 }];
        });
    }, []);

    const handleReset = useCallback(() => {
        setBeliefs([{ agentId: 'agent-alpha', posterior: 0.5, updates: 0 }]);
        setLog([]);
    }, []);

    const currentBelief = beliefs[0];

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
                    <Brain size={22} color="#7c3aed" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        Байесовский судья
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
                    Вероятностная оценка: обновляй убеждение в каждой позиции после каждого
                    аргумента. Prior = 0.5 (максимальная неопределённость), posterior обновляется
                    через теорему Байеса.
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
                    border: '1px solid rgba(124,58,237,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Brain size={20} />,
                            title: 'Априорная вероятность',
                            desc: 'Каждый агент начинает с 0.5 — полная неопределённость. Никаких предубеждений перед первым аргументом.',
                        },
                        {
                            icon: <BarChart3 size={20} />,
                            title: 'Обновление убеждений',
                            desc: 'Сила аргумента (-1..1) → likelihood (0..1) через логистическую функцию. Posterior = Bayes theorem.',
                        },
                        {
                            icon: <BarChart3 size={20} />,
                            title: 'Скорректированная оценка',
                            desc: 'Финальная оценка = rawScore × (1-weight) + posterior × weight, где weight растёт до 50% с числом аргументов.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(124,58,237,0.1)',
                            }}
                        >
                            <div style={{ color: '#a78bfa', marginBottom: 8 }}>{card.icon}</div>
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

            {/* Interactive demo */}
            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(124,58,237,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <BarChart3 size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Интерактивная симуляция
                    </h3>
                    <div style={{ flex: 1 }} />
                    <button
                        type="button"
                        onClick={handleReset}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(148,163,184,0.3)',
                            background: 'rgba(148,163,184,0.1)',
                            color: '#94a3b8',
                            fontSize: 12,
                            cursor: 'pointer',
                        }}
                    >
                        <RotateCcw size={14} /> Сброс
                    </button>
                </div>

                {/* Current belief display */}
                <div
                    style={{
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 16,
                        background: 'rgba(124,58,237,0.08)',
                        border: '1px solid rgba(124,58,237,0.2)',
                        textAlign: 'center',
                    }}
                >
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                        Posterior (агент {currentBelief.agentId})
                    </div>
                    <div
                        style={{
                            fontSize: 36,
                            fontWeight: 700,
                            color:
                                currentBelief.posterior > 0.6
                                    ? '#22c55e'
                                    : currentBelief.posterior < 0.4
                                      ? '#ef4444'
                                      : '#facc15',
                        }}
                    >
                        {(currentBelief.posterior * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        Аргументов обработано: {currentBelief.updates} | Prior: 50.0%
                    </div>
                </div>

                {/* Quick add buttons */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {simulateArguments.map((arg) => (
                        <button
                            key={arg.label}
                            type="button"
                            onClick={() => handleAddArgument(arg.strength)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: 8,
                                border: '1px solid rgba(124,58,237,0.2)',
                                background: 'rgba(124,58,237,0.08)',
                                color: '#c4b5fd',
                                fontSize: 11,
                                cursor: 'pointer',
                                textAlign: 'left',
                                flex: 1,
                                minWidth: 120,
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>{arg.label}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{arg.desc}</div>
                        </button>
                    ))}
                </div>

                {/* Custom strength slider */}
                <div
                    style={{
                        padding: 12,
                        borderRadius: 10,
                        marginBottom: 16,
                        background: 'rgba(15,23,42,0.4)',
                        border: '1px solid rgba(148,163,184,0.08)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 60 }}>
                            Сила аргумента:
                        </span>
                        <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.05"
                            value={customStrength}
                            onChange={(e) => setCustomStrength(parseFloat(e.target.value))}
                            style={{ flex: 1, accentColor: '#7c3aed' }}
                        />
                        <span
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                minWidth: 40,
                                textAlign: 'right',
                                color:
                                    customStrength > 0
                                        ? '#22c55e'
                                        : customStrength < 0
                                          ? '#ef4444'
                                          : '#94a3b8',
                            }}
                        >
                            {customStrength > 0 ? '+' : ''}
                            {customStrength.toFixed(2)}
                        </span>
                        <button
                            type="button"
                            onClick={() => handleAddArgument(customStrength)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 14px',
                                borderRadius: 8,
                                border: 'none',
                                background: 'rgba(124,58,237,0.2)',
                                color: '#a78bfa',
                                fontSize: 12,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            <Plus size={14} /> Добавить
                        </button>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                        Likelihood: {strengthToLikelihood(customStrength).toFixed(3)} | Posterior
                        после:{' '}
                        {bayesianUpdate(
                            currentBelief.posterior,
                            strengthToLikelihood(customStrength),
                        ).toFixed(3)}
                    </div>
                </div>

                {/* Log table */}
                {log.length > 0 && (
                    <div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                            История обновлений ({log.length}):
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table
                                style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            color: '#64748b',
                                            borderBottom: '1px solid rgba(148,163,184,0.1)',
                                        }}
                                    >
                                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>
                                            #
                                        </th>
                                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>
                                            Strength
                                        </th>
                                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>
                                            Likelihood
                                        </th>
                                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>
                                            Prior
                                        </th>
                                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>
                                            Posterior
                                        </th>
                                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>
                                            Δ
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {log.map((entry, i) => (
                                        <tr
                                            key={i}
                                            style={{
                                                borderBottom: '1px solid rgba(148,163,184,0.05)',
                                            }}
                                        >
                                            <td style={{ padding: '6px 10px', color: '#64748b' }}>
                                                {i + 1}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '6px 10px',
                                                    fontWeight: 600,
                                                    color:
                                                        entry.strength > 0
                                                            ? '#22c55e'
                                                            : entry.strength < 0
                                                              ? '#ef4444'
                                                              : '#94a3b8',
                                                }}
                                            >
                                                {entry.strength > 0 ? '+' : ''}
                                                {entry.strength.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '6px 10px', color: '#a78bfa' }}>
                                                {entry.likelihood.toFixed(3)}
                                            </td>
                                            <td style={{ padding: '6px 10px', color: '#94a3b8' }}>
                                                {(entry.prior * 100).toFixed(1)}%
                                            </td>
                                            <td
                                                style={{
                                                    padding: '6px 10px',
                                                    fontWeight: 600,
                                                    color:
                                                        entry.posterior > 0.6
                                                            ? '#22c55e'
                                                            : entry.posterior < 0.4
                                                              ? '#ef4444'
                                                              : '#facc15',
                                                }}
                                            >
                                                {(entry.posterior * 100).toFixed(1)}%
                                            </td>
                                            <td
                                                style={{
                                                    padding: '6px 10px',
                                                    color:
                                                        entry.posterior - entry.prior > 0
                                                            ? '#22c55e'
                                                            : '#ef4444',
                                                }}
                                            >
                                                {entry.posterior - entry.prior > 0 ? '+' : ''}
                                                {((entry.posterior - entry.prior) * 100).toFixed(1)}
                                                %
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Info footer */}
            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(124,58,237,0.06)',
                    border: '1px solid rgba(124,58,237,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Байесовская оценка — P1.6 протокол. Использует логистическую функцию (scale=2.5) для
                маппинга силы аргумента в likelihood. Posterior вес в финальной оценке: min(0.5,
                updateCount × 0.1).
            </div>
        </div>
    );
};

export default BayesianJudgePanel;
