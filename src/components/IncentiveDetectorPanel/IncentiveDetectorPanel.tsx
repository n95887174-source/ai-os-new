import React, { useState, useCallback } from 'react';
import { DollarSign, Info, Search, Users, Eye, TrendingUp } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { IncentiveAnalysis } from '../../kernel/contracts/debate-incentives';

const TECHNIQUE_ID = 'hidden-incentives';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'IncentiveDetector',
    nameRu: 'Детектор стимулов',
    description: 'Analyze hidden incentives and conflicts of interest behind stated positions',
    descriptionRu: 'Анализирует скрытые стимулы и конфликты интересов за декларируемыми позициями',
    category: 'P0',
    defaultEnabled: true,
};

const SAMPLE_ANALYSIS: IncentiveAnalysis = {
    agentId: 'agent-1',
    agentName: 'Корпоративный представитель',
    profiles: [
        {
            stakeholder: 'Корпоративные акционеры',
            stake: 'Рост прибыли и дивидендов',
            direction: 'for',
            estimatedValue: 'Высокая',
            credibilityImpact: 0.3,
        },
        {
            stakeholder: 'Госорганы',
            stake: 'Контроль и надзор',
            direction: 'against',
            estimatedValue: 'Средняя',
            credibilityImpact: 0.2,
        },
        {
            stakeholder: 'Конкуренты',
            stake: 'Рыночная доля',
            direction: 'neutral',
            estimatedValue: 'Высокая',
            credibilityImpact: 0.15,
        },
    ],
    conflictOfInterest: true,
    disclosurePrompt:
        'Следует раскрыть: представляя интересы отрасли, докладчик может недооценивать риски регулирования.',
};

const TOPICS = [
    { topic: 'Регулирование ИИ', analysis: SAMPLE_ANALYSIS },
    {
        topic: 'Открытый исходный код',
        analysis: {
            agentId: 'agent-2',
            agentName: 'Разработчик ПО',
            profiles: [
                {
                    stakeholder: 'Open-source сообщество',
                    stake: 'Доступ к технологиям',
                    direction: 'for',
                    estimatedValue: 'Высокая',
                    credibilityImpact: 0.4,
                },
                {
                    stakeholder: 'Поставщики облачных услуг',
                    stake: 'Монетизация',
                    direction: 'neutral',
                    estimatedValue: 'Средняя',
                    credibilityImpact: 0.2,
                },
            ],
            conflictOfInterest: false,
            disclosurePrompt: 'Явных конфликтов интересов не обнаружено.',
        },
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

export const IncentiveDetectorPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedIdx, setSelectedIdx] = useState(0);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const current = TOPICS[selectedIdx];
    const { analysis } = current;

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
                    <DollarSign size={22} color="#10b981" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(16,185,129,0.15)',
                            color: '#10b981',
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
                    border: '1px solid rgba(16,185,129,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#34d399" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Users size={20} />,
                            title: 'Определение стейкхолдеров',
                            desc: '12 групп стейкхолдеров (корпорации, госорганы, сообщества и т.д.) с паттернами для определения вовлечённости по тексту аргумента.',
                        },
                        {
                            icon: <Search size={20} />,
                            title: 'Анализ стимулов',
                            desc: 'Для каждой группы определяется: направление (за/против/нейтрально), оценочная ценность и влияние на достоверность.',
                        },
                        {
                            icon: <Eye size={20} />,
                            title: 'Прозрачность',
                            desc: 'Генерируется disclosurePrompt — агент раскрывает потенциальный конфликт интересов перед аргументацией.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(16,185,129,0.1)',
                            }}
                        >
                            <div style={{ color: '#34d399', marginBottom: 8 }}>{card.icon}</div>
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
                    border: '1px solid rgba(16,185,129,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <TrendingUp size={18} color="#34d399" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: анализ стимулов
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Сценарий:</span>
                    <select
                        value={selectedIdx}
                        onChange={(e) => setSelectedIdx(Number(e.target.value))}
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
                        {TOPICS.map((t, i) => (
                            <option key={i} value={i}>
                                {t.topic}
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
                    Агент:{' '}
                    <span style={{ fontWeight: 600, color: '#93c5fd' }}>{analysis.agentName}</span>
                    {analysis.conflictOfInterest && (
                        <span
                            style={{
                                marginLeft: 12,
                                fontSize: 10,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'rgba(245,158,11,0.2)',
                                color: '#f59e0b',
                                fontWeight: 600,
                            }}
                        >
                            КОНФЛИКТ ИНТЕРЕСОВ
                        </span>
                    )}
                </div>

                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    Стейкхолдеры и стимулы:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {analysis.profiles.map((p, i) => (
                        <div
                            key={i}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 10,
                                background: 'rgba(16,185,129,0.06)',
                                border: '1px solid rgba(16,185,129,0.2)',
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
                                <span style={{ fontWeight: 600, fontSize: 12, color: '#34d399' }}>
                                    {p.stakeholder}
                                </span>
                                <span
                                    style={{
                                        fontSize: 10,
                                        padding: '1px 5px',
                                        borderRadius: 3,
                                        background:
                                            p.direction === 'for'
                                                ? 'rgba(16,185,129,0.15)'
                                                : p.direction === 'against'
                                                  ? 'rgba(239,68,68,0.15)'
                                                  : 'rgba(148,163,184,0.15)',
                                        color:
                                            p.direction === 'for'
                                                ? '#34d399'
                                                : p.direction === 'against'
                                                  ? '#f87171'
                                                  : '#94a3b8',
                                        fontWeight: 600,
                                    }}
                                >
                                    {p.direction === 'for'
                                        ? 'ЗА'
                                        : p.direction === 'against'
                                          ? 'ПРОТИВ'
                                          : 'НЕЙТРАЛЬНО'}
                                </span>
                                <span
                                    style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}
                                >
                                    Ценность: {p.estimatedValue}
                                </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>Ставка: {p.stake}</div>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 8,
                        background: 'rgba(245,158,11,0.06)',
                        border: '1px solid rgba(245,158,11,0.2)',
                    }}
                >
                    <div
                        style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}
                    >
                        Промпт раскрытия
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                        {analysis.disclosurePrompt}
                    </div>
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Incentive Detector — P0.17 протокол. Не требует LLM-вызовов. 12 групп стейкхолдеров,
                сопоставление по ключевым словам.{' '}
            </div>
        </div>
    );
};

export default IncentiveDetectorPanel;
