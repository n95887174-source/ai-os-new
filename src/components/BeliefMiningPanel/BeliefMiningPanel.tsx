import React, { useState, useCallback } from 'react';
import { Brain, Info, Search, AlertTriangle, Siren, GitCompare, Sparkles } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type {
    BeliefType,
    MinedBelief,
    BeliefConflict,
    ConflictType,
} from '../../kernel/contracts/debate-belief-mining';

const TECHNIQUE_ID = 'belief-mining';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'BeliefMining',
    nameRu: 'Майнинг убеждений',
    description: 'Extract implicit beliefs and surface fundamental cross-agent disagreements',
    descriptionRu:
        'Извлекает скрытые убеждения (ценности, допущения, эпистемические позиции) из аргументов и выявляет фундаментальные конфликты между агентами',
    category: 'P0',
    defaultEnabled: true,
};

const SAMPLE_ARGS = [
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
];

const BELIEF_LABELS: Record<BeliefType, string> = {
    value_judgment: 'Ценностное суждение',
    causal_assumption: 'Каузальное допущение',
    epistemic_stance: 'Эпистемическая позиция',
    deontic_claim: 'Деонтическое утверждение',
    ontological_frame: 'Онтологическая рамка',
};

const CONFLICT_LABELS: Record<ConflictType, string> = {
    value_inversion: 'Инверсия ценностей',
    epistemic_divergence: 'Эпистемическое расхождение',
    ontological_mismatch: 'Онтологическое несоответствие',
    causal_contradiction: 'Каузальное противоречие',
};

const BELIEF_COLORS: Record<string, { bg: string; border: string }> = {
    value_judgment: { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
    causal_assumption: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
    epistemic_stance: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    deontic_claim: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    ontological_frame: { bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.2)' },
};

const simulateBeliefs = (): MinedBelief[] => [
    {
        agentId: 'agent-1',
        agentName: 'Афина',
        type: 'deontic_claim',
        premise: 'ИИ должен быть открытым',
        confidence: 0.85,
        sourceArgumentId: 'a1',
        round: 1,
    },
    {
        agentId: 'agent-1',
        agentName: 'Афина',
        type: 'value_judgment',
        premise: 'Прозрачность — primary ценность для безопасности',
        confidence: 0.78,
        sourceArgumentId: 'a1',
        round: 1,
    },
    {
        agentId: 'agent-2',
        agentName: 'Гермес',
        type: 'causal_assumption',
        premise: 'Закрытость ограничивает доступ злоумышленников = безопаснее',
        confidence: 0.82,
        sourceArgumentId: 'a2',
        round: 1,
    },
    {
        agentId: 'agent-1',
        agentName: 'Афина',
        type: 'epistemic_stance',
        premise: 'Исторические прецеденты доказывают превосходство открытых систем',
        confidence: 0.7,
        sourceArgumentId: 'a3',
        round: 2,
    },
    {
        agentId: 'agent-2',
        agentName: 'Гермес',
        type: 'causal_assumption',
        premise: 'Открытость не гарантирует безопасность (контрпример Heartbleed)',
        confidence: 0.75,
        sourceArgumentId: 'a4',
        round: 2,
    },
];

const simulateConflicts = (): BeliefConflict[] => [
    {
        type: 'value_inversion',
        agentA: 'Афина',
        agentB: 'Гермес',
        beliefA: 'Прозрачность — primary ценность',
        beliefB: 'Безопасность через ограничение доступа',
        severity: 0.9,
        description:
            'Афина ценит прозрачность как первичное благо, Гермес — безопасность через контроль доступа. Ценности инвертированы.',
        round: 2,
    },
    {
        type: 'causal_contradiction',
        agentA: 'Афина',
        agentB: 'Гермес',
        beliefA: 'Открытость ведёт к безопасности через аудит',
        beliefB: 'Открытость создаёт уязвимости',
        severity: 0.7,
        description:
            'Противоположные каузальные модели: Афина верит, что аудит сообщества — защита, Гермес — что открытый код увеличивает поверхность атаки.',
        round: 2,
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

export const BeliefMiningPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const beliefs = simulateBeliefs();
    const conflicts = simulateConflicts();

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
                    <Brain size={22} color="#a855f7" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(168,85,247,0.15)',
                            color: '#a855f7',
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
                    border: '1px solid rgba(168,85,247,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#c084fc" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Search size={20} />,
                            title: 'Извлечение убеждений',
                            desc: 'Каждый аргумент сканируется 5 наборами regex-паттернов (RU+EN) для выявления ценностных суждений, каузальных допущений, эпистемических позиций и т.д.',
                        },
                        {
                            icon: <GitCompare size={20} />,
                            title: 'Детекция конфликтов',
                            desc: 'Парные убеждения одного типа сравниваются через word overlap. Конфликты классифицируются по типу и получают severity score.',
                        },
                        {
                            icon: <Siren size={20} />,
                            title: 'Поверхностный анализ',
                            desc: 'Топ-3 самых серьёзных конфликта внедряются в промпт — агенты видят фундаментальные разногласия, скрытые за поверхностными аргументами.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(168,85,247,0.1)',
                            }}
                        >
                            <div style={{ color: '#c084fc', marginBottom: 8 }}>{card.icon}</div>
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
                    border: '1px solid rgba(168,85,247,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Sparkles size={18} color="#c084fc" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: майнинг убеждений
                    </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {SAMPLE_ARGS.map((a, i) => (
                        <div
                            key={i}
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

                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    Извлечённые убеждения:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {beliefs.map((b, i) => {
                        const colors = BELIEF_COLORS[b.type];
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
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
                                            background: colors.bg,
                                            color: '#e2e8f0',
                                            fontWeight: 500,
                                            border: `1px solid ${colors.border}`,
                                        }}
                                    >
                                        {BELIEF_LABELS[b.type]}
                                    </span>
                                    <span
                                        style={{ fontWeight: 600, color: '#93c5fd', fontSize: 11 }}
                                    >
                                        {b.agentName}
                                    </span>
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: 10,
                                            color: b.confidence > 0.8 ? '#22c55e' : '#facc15',
                                            fontWeight: 500,
                                        }}
                                    >
                                        conf: {b.confidence.toFixed(2)}
                                    </span>
                                </div>
                                <div style={{ color: '#cbd5e1' }}>{b.premise}</div>
                            </div>
                        );
                    })}
                </div>

                <div
                    style={{
                        fontSize: 12,
                        color: '#ef4444',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <AlertTriangle size={14} />
                    Обнаруженные конфликты убеждений:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {conflicts.map((c, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 14,
                                borderRadius: 10,
                                background: 'rgba(239,68,68,0.06)',
                                border: '1px solid rgba(239,68,68,0.2)',
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
                                        fontSize: 10,
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        background: 'rgba(239,68,68,0.15)',
                                        color: '#ef4444',
                                        fontWeight: 600,
                                    }}
                                >
                                    {CONFLICT_LABELS[c.type]}
                                </span>
                                <span
                                    style={{
                                        marginLeft: 'auto',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: c.severity > 0.8 ? '#ef4444' : '#facc15',
                                    }}
                                >
                                    severity: {c.severity.toFixed(2)}
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                                <span style={{ color: '#93c5fd' }}>{c.agentA}</span>: {'«'}
                                {c.beliefA}
                                {'»'} vs <span style={{ color: '#fca5a5' }}>{c.agentB}</span>: {'«'}
                                {c.beliefB}
                                {'»'}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{c.description}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(168,85,247,0.06)',
                    border: '1px solid rgba(168,85,247,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Belief Mining — P0.6 протокол. Не требует LLM-вызовов. Использует 80+ регулярных
                выражений на русском и английском для 5 типов убеждений.
            </div>
        </div>
    );
};

export default BeliefMiningPanel;
