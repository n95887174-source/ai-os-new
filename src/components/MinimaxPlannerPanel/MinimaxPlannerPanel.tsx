import React, { useState, useCallback } from 'react';
import { Swords, Info, Target, Zap, ArrowRight, Crosshair, GitBranch } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { MinimaxActionType, MinimaxMove } from '../../kernel/contracts/debate-minimax';

const TECHNIQUE_ID = 'graph-minimax';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'MinimaxPlanner',
    nameRu: 'Минимакс-планировщик',
    description: '2-ply minimax on argument graph — recommend highest-value attack/defense move',
    descriptionRu:
        'Стратегическое планирование ходов: 2-уровневый минимакс на графе аргументов для выбора наилучшей атаки или защиты',
    category: 'P0',
    defaultEnabled: true,
};

const MOVE_LABELS: Record<MinimaxActionType, { label: string; color: string; desc: string }> = {
    attack_high_centrality: {
        label: 'Атака центрального',
        color: '#ef4444',
        desc: 'Атаковать самый центральный узел оппонента',
    },
    attack_low_support: {
        label: 'Атака слабого',
        color: '#f97316',
        desc: 'Атаковать узел оппонента с низкой поддержкой',
    },
    defend_own_weak: {
        label: 'Защита слабого',
        color: '#3b82f6',
        desc: 'Усилить свой узел под атакой',
    },
    support_own_strong: {
        label: 'Поддержка сильного',
        color: '#10b981',
        desc: 'Укрепить свой центральный узел',
    },
    refine_own_claim: {
        label: 'Уточнение',
        color: '#8b5cf6',
        desc: 'Уточнить и переформулировать свой тезис',
    },
    challenge_unattacked: {
        label: 'Бросок без ответа',
        color: '#ec4899',
        desc: 'Атаковать неоспоренное утверждение оппонента',
    },
};

const SAMPLE_MOVES: MinimaxMove[] = [
    {
        type: 'attack_high_centrality',
        targetNodeId: 'n2',
        targetClaim:
            'Закрытые системы безопаснее, так как ограничивают доступ злоумышленников к модели',
        score: 0.82,
        rationale:
            'Утверждение оппонента имеет высокую центральность (0.45) и соотношение атак/поддержки 1:2 — уязвимо для атаки.',
        expectedDamage: 0.65,
    },
    {
        type: 'attack_low_support',
        targetNodeId: 'n4',
        targetClaim:
            'Открытый исходный код не гарантирует безопасности — Heartbleed был в открытом OpenSSL',
        score: 0.73,
        rationale: 'Коэффициент поддержки 0.33 — слабое место в позиции оппонента.',
        expectedDamage: 0.52,
    },
    {
        type: 'defend_own_weak',
        targetNodeId: 'n3',
        targetClaim:
            'История показывает, что открытые стандарты (интернет, Linux) побеждают закрытые',
        score: 0.68,
        rationale: 'Собственный узел под атакой, центральность 0.38.',
        expectedDamage: 0.45,
    },
    {
        type: 'support_own_strong',
        targetNodeId: 'n1',
        targetClaim: 'ИИ должен быть открытым — прозрачность обеспечивает безопасность и доверие',
        score: 0.61,
        rationale: 'Собственный центральный узел (0.52) можно укрепить дополнительной поддержкой.',
        expectedDamage: 0.38,
    },
    {
        type: 'challenge_unattacked',
        targetNodeId: 'n5',
        targetClaim: 'Коммерческие компании не могут рисковать, открывая свои модели конкурентам',
        score: 0.55,
        rationale: 'Утверждение оппонента осталось без ответа 2 раунда.',
        expectedDamage: 0.42,
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

export const MinimaxPlannerPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedAgent, setSelectedAgent] = useState('agent-1');

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const sortedMoves = [...SAMPLE_MOVES].sort((a, b) => b.score - a.score);
    const bestMove = sortedMoves[0];

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
                    <Swords size={22} color="#ef4444" />
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
                            icon: <GitBranch size={20} />,
                            title: 'Генерация кандидатов',
                            desc: 'Из 5 стратегических категорий генерируются ходы-кандидаты: атака центрального узла, защита слабого, поддержка сильного, бросок без ответа, уточнение.',
                        },
                        {
                            icon: <Zap size={20} />,
                            title: '2-уровневый минимакс',
                            desc: 'Для каждого кандидата симулируется лучший ответ оппонента (1 уровень) и наш контрудар (2 уровень). Оценивается damage оппоненту.',
                        },
                        {
                            icon: <Target size={20} />,
                            title: 'Выбор хода',
                            desc: 'Ход с максимальным minimax value становится рекомендацией. Инструкция внедряется в промпт агента как тактическая директива.',
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
                    <Crosshair size={18} color="#f87171" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: стратегические ходы
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Агент:</span>
                    <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
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
                        <option value="agent-1">Афина</option>
                        <option value="agent-2">Гермес</option>
                    </select>
                </div>

                {bestMove && (
                    <div
                        style={{
                            padding: 16,
                            borderRadius: 12,
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            marginBottom: 16,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 8,
                            }}
                        >
                            <ArrowRight size={16} color="#f87171" />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>
                                Рекомендуемый ход
                            </span>
                            <span
                                style={{
                                    fontSize: 11,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: MOVE_LABELS[bestMove.type]
                                        ? `${MOVE_LABELS[bestMove.type].color}22`
                                        : 'rgba(239,68,68,0.2)',
                                    color: MOVE_LABELS[bestMove.type]?.color || '#f87171',
                                    fontWeight: 600,
                                }}
                            >
                                {MOVE_LABELS[bestMove.type]?.label || bestMove.type}
                            </span>
                            <span
                                style={{
                                    marginLeft: 'auto',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: '#f87171',
                                }}
                            >
                                score: {bestMove.score.toFixed(3)}
                            </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                            Цель: {'«'}
                            {bestMove.targetClaim}
                            {'»'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                            Рациональность: {bestMove.rationale}
                        </div>
                        <div
                            style={{
                                marginTop: 6,
                                fontSize: 11,
                                fontWeight: 500,
                                color: '#f87171',
                            }}
                        >
                            Ожидаемый урон оппоненту: {(bestMove.expectedDamage * 100).toFixed(0)}%
                        </div>
                    </div>
                )}

                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    Все кандидаты (отсортированы по score):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sortedMoves.map((m, i) => {
                        const moveInfo = MOVE_LABELS[m.type];
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    background:
                                        i === 0 ? 'rgba(239,68,68,0.06)' : 'rgba(15,23,42,0.4)',
                                    border:
                                        i === 0
                                            ? '1px solid rgba(239,68,68,0.25)'
                                            : '1px solid rgba(148,163,184,0.08)',
                                    fontSize: 12,
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
                                            background:
                                                i === 0
                                                    ? 'rgba(239,68,68,0.15)'
                                                    : 'rgba(148,163,184,0.1)',
                                            color: moveInfo?.color || '#94a3b8',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {moveInfo?.label || m.type}
                                    </span>
                                    {i === 0 && (
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color: '#f87171',
                                                fontWeight: 600,
                                            }}
                                        >
                                            BEST
                                        </span>
                                    )}
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color:
                                                m.score > 0.7
                                                    ? '#22c55e'
                                                    : m.score > 0.5
                                                      ? '#facc15'
                                                      : '#f97316',
                                        }}
                                    >
                                        {m.score.toFixed(3)}
                                    </span>
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.rationale}</div>
                            </div>
                        );
                    })}
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
                Graph Minimax — P0.7 протокол. Не требует LLM-вызовов. Требует
                IArgumentGraphService. 2-ply minimax симулирует лучший ответ оппонента и контрудар.
            </div>
        </div>
    );
};

export default MinimaxPlannerPanel;
