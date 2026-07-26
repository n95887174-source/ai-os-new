import React, { useState, useCallback } from 'react';
import { TrendingUp, Info, BarChart4, Target, Shield, ArrowRight } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { ArgumentVariant, ForecastResult } from '../../kernel/contracts/debate-forecaster';

const TECHNIQUE_ID = 'outcome-forecaster';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'OutcomeForecaster',
    nameRu: 'Прогноз результатов',
    description:
        'Predict judge score impact for argument variants — select max-expected-value option',
    descriptionRu:
        'Прогнозирует влияние аргументов на оценку судьи: генерирует варианты, оценивает ожидаемый score, риск и уверенность',
    category: 'P1',
    defaultEnabled: true,
};

const SCENARIOS: {
    id: string;
    label: string;
    scores: number[];
    role: string;
    strengths: string[];
    topic: string;
}[] = [
    {
        id: 'ethics',
        label: 'Этика ИИ',
        scores: [0.6, 0.65, 0.72, 0.58],
        role: 'Сторонник открытого ИИ',
        strengths: ['Прозрачность', 'Исторические прецеденты', 'Доверие общества'],
        topic: 'Открытый vs закрытый ИИ',
    },
    {
        id: 'climate',
        label: 'Климат',
        scores: [0.55, 0.48, 0.62, 0.7],
        role: 'Сторонник зелёной энергетики',
        strengths: ['Научный консенсус', 'Экономика', 'Здоровье'],
        topic: 'Энергетический переход',
    },
    {
        id: 'privacy',
        label: 'Приватность',
        scores: [0.7, 0.68, 0.75, 0.72],
        role: 'Защитник приватности',
        strengths: ['Права человека', 'Законодательство', 'История нарушений'],
        topic: 'Слежка vs приватность',
    },
];

const simulateForecast = (scenario: (typeof SCENARIOS)[0]): ForecastResult => {
    const avgScore = scenario.scores.reduce((a, b) => a + b, 0) / scenario.scores.length;
    const variants: ArgumentVariant[] = [
        {
            variantId: 'v1',
            label: 'Этический',
            angle: 'Акцент на моральных принципах и ценностях',
            expectedScore: avgScore + 0.12,
            confidence: 0.7,
            riskFactor: 0.6,
        },
        {
            variantId: 'v2',
            label: 'Прагматический',
            angle: 'Фокус на практических последствиях и выгодах',
            expectedScore: avgScore + 0.08,
            confidence: 0.8,
            riskFactor: 0.3,
        },
        {
            variantId: 'v3',
            label: 'Исторический',
            angle: 'Использование исторических аналогий и прецедентов',
            expectedScore: avgScore + 0.15,
            confidence: 0.6,
            riskFactor: 0.7,
        },
        {
            variantId: 'v4',
            label: 'Эмоциональный',
            angle: 'Личные истории и эмоциональная вовлечённость',
            expectedScore: avgScore + 0.05,
            confidence: 0.5,
            riskFactor: 0.8,
        },
        {
            variantId: 'v5',
            label: 'Логический',
            angle: 'Сухая логика и формальные рассуждения',
            expectedScore: avgScore + 0.1,
            confidence: 0.85,
            riskFactor: 0.2,
        },
    ];
    const best = variants.reduce((a, b) => (a.expectedScore > b.expectedScore ? a : b));
    return {
        variants,
        recommendedLabel: best.label,
        recommendedAngle: best.angle,
        expectedScoreGain: Math.round((best.expectedScore - avgScore) * 100),
    };
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

export const OutcomeForecasterPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const forecast = simulateForecast(selectedScenario);
    const sortedVariants = [...forecast.variants].sort((a, b) => b.expectedScore - a.expectedScore);

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
                    <TrendingUp size={22} color="#f97316" />
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
                            icon: <BarChart4 size={20} />,
                            title: 'Анализ истории',
                            desc: 'Анализируются прошлые оценки судьи (previousScores) для выявления паттернов и трендов.',
                        },
                        {
                            icon: <Target size={20} />,
                            title: 'Генерация вариантов',
                            desc: 'Создаются 5+ вариантов аргументации с разными углами: этический, прагматический, исторический и т.д.',
                        },
                        {
                            icon: <Shield size={20} />,
                            title: 'Оценка риск-доходность',
                            desc: 'Каждый вариант получает expectedScore, confidence и riskFactor. Выбирается вариант с максимальной ожидаемой ценностью.',
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
                        Демо: прогноз вариантов
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Сценарий:</span>
                    <select
                        value={selectedScenario.id}
                        onChange={(e) =>
                            setSelectedScenario(SCENARIOS.find((s) => s.id === e.target.value)!)
                        }
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
                        {SCENARIOS.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    Роль:{' '}
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                        {selectedScenario.role}
                    </span>{' '}
                    | Сильные стороны: {selectedScenario.strengths.join(', ')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {sortedVariants.map((v) => {
                        const isBest = v.label === forecast.recommendedLabel;
                        return (
                            <div
                                key={v.variantId}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 10,
                                    background: isBest
                                        ? 'rgba(249,115,22,0.1)'
                                        : 'rgba(15,23,42,0.4)',
                                    border: isBest
                                        ? '1px solid rgba(249,115,22,0.3)'
                                        : '1px solid rgba(148,163,184,0.08)',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 6,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: isBest ? '#fb923c' : '#e2e8f0',
                                        }}
                                    >
                                        {v.label}
                                    </span>
                                    {isBest && (
                                        <span
                                            style={{
                                                fontSize: 10,
                                                padding: '1px 6px',
                                                borderRadius: 4,
                                                background: 'rgba(249,115,22,0.2)',
                                                color: '#fb923c',
                                                fontWeight: 600,
                                            }}
                                        >
                                            РЕКОМЕНДУЕТСЯ
                                        </span>
                                    )}
                                    <div style={{ flex: 1 }} />
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        Ожидаемый score:
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color:
                                                v.expectedScore > 0.75
                                                    ? '#22c55e'
                                                    : v.expectedScore > 0.55
                                                      ? '#facc15'
                                                      : '#f97316',
                                        }}
                                    >
                                        {v.expectedScore.toFixed(3)}
                                    </span>
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                                    {v.angle}
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
                                        Уверенность:{' '}
                                        <span style={{ color: '#818cf8', fontWeight: 500 }}>
                                            {(v.confidence * 100).toFixed(0)}%
                                        </span>
                                    </span>
                                    <span>
                                        Риск:{' '}
                                        <span
                                            style={{
                                                color: v.riskFactor > 0.6 ? '#ef4444' : '#facc15',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {(v.riskFactor * 100).toFixed(0)}%
                                        </span>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div
                    style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'rgba(249,115,22,0.08)',
                        border: '1px solid rgba(249,115,22,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    <ArrowRight size={18} color="#fb923c" />
                    <span style={{ fontSize: 12, color: '#cbd5e1' }}>
                        Рекомендуемая стратегия:{' '}
                        <span style={{ color: '#fb923c', fontWeight: 600 }}>
                            {forecast.recommendedLabel}
                        </span>{' '}
                        — {forecast.recommendedAngle}
                    </span>
                    <span
                        style={{
                            marginLeft: 'auto',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#22c55e',
                        }}
                    >
                        +{forecast.expectedScoreGain}% к score
                    </span>
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
                Outcome Forecaster — P1.30 протокол. Не требует LLM-вызовов. Использует взвешенную
                сумму previousScores, исторических трендов и анализа сильных сторон оппонента.
            </div>
        </div>
    );
};

export default OutcomeForecasterPanel;
