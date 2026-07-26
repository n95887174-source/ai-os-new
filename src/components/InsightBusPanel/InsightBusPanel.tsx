import React, { useState, useCallback } from 'react';
import { Lightbulb, Info, Brain, Sparkles, Eye } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';

const TECHNIQUE_ID = 'insight-bus';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'InsightBus',
    nameRu: 'Шина инсайтов',
    description:
        'Cross-round insight accumulation — surface contradictions, surprises, and hidden premises',
    descriptionRu:
        'Накопление инсайтов между раундами: выявляет противоречия, неожиданные аргументы и скрытые предпосылки',
    category: 'P1',
    defaultEnabled: true,
};

type InsightType = 'contradiction' | 'surprise' | 'premise';

interface Insight {
    type: InsightType;
    text: string;
    quote: string;
    round: number;
    significance: number;
}

const SAMPLE_ARGS = [
    {
        agentId: 'agent-1',
        content:
            'ИИ должен быть открытым, потому что прозрачность — единственный способ обеспечить безопасность и доверие общества.',
        agentName: 'Афина',
        round: 1,
    },
    {
        agentId: 'agent-2',
        content:
            'Закрытые системы безопаснее, так как ограничивают доступ злоумышленников к модели.',
        agentName: 'Гермес',
        round: 1,
    },
    {
        agentId: 'agent-1',
        content: 'История показывает, что открытые стандарты (интернет, Linux) побеждают закрытые.',
        agentName: 'Афина',
        round: 2,
    },
    {
        agentId: 'agent-2',
        content:
            'Открытый исходный код не гарантирует безопасности — Heartbleed был в открытом OpenSSL.',
        agentName: 'Гермес',
        round: 2,
    },
    {
        agentId: 'agent-1',
        content: 'Регуляция должна быть, но не ценой полной секретности. Нужен баланс.',
        agentName: 'Афина',
        round: 3,
    },
];

const simulateInsights = (): Insight[] => [
    {
        type: 'contradiction',
        text: 'Обе стороны согласны, что безопасность критична, но расходятся в методах её достижения',
        quote: 'безопасность и доверие общества vs ограничивают доступ злоумышленников',
        round: 1,
        significance: 0.85,
    },
    {
        type: 'surprise',
        text: 'Историческая аналогия: открытые стандарты (Linux) побеждают проприетарные',
        quote: 'открытые стандарты (интернет, Linux) побеждают закрытые',
        round: 2,
        significance: 0.72,
    },
    {
        type: 'premise',
        text: 'Обе стороны неявно принимают, что безопасность — первичная ценность, а не, например, скорость инноваций',
        quote: 'нужен баланс между регуляцией и секретностью',
        round: 3,
        significance: 0.64,
    },
];

const INSIGHT_COLORS: Record<InsightType, { bg: string; border: string; text: string }> = {
    contradiction: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' },
    surprise: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b' },
    premise: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6' },
};

const INSIGHT_LABELS: Record<InsightType, string> = {
    contradiction: 'Противоречие',
    surprise: 'Неожиданность',
    premise: 'Предпосылка',
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

export const InsightBusPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const insights = simulateInsights();

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
                    <Lightbulb size={22} color="#f59e0b" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
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
                    border: '1px solid rgba(245,158,11,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#fbbf24" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Brain size={20} />,
                            title: 'Сбор инсайтов',
                            desc: 'После каждого раунда анализируются все аргументы — ищутся противоречия, неожиданные ходы и скрытые предпосылки.',
                        },
                        {
                            icon: <Sparkles size={20} />,
                            title: 'Оценка значимости',
                            desc:
                                'Каждый инсайт получает score значимости 0–1. Инсайты с score {' <
                                '} 0.3 отбрасываются как шум.',
                        },
                        {
                            icon: <Eye size={20} />,
                            title: 'Инъекция в промпт',
                            desc: 'Активные инсайты (последние 3 раунда) форматируются и добавляются в промпт агентов, чтобы дебаты строились на накопленном понимании.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(245,158,11,0.1)',
                            }}
                        >
                            <div style={{ color: '#fbbf24', marginBottom: 8 }}>{card.icon}</div>
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
                    border: '1px solid rgba(245,158,11,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Sparkles size={18} color="#fbbf24" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: извлечение инсайтов
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
                    Извлечённые инсайты:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {insights.map((ins, i) => {
                        const colors = INSIGHT_COLORS[ins.type];
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 10,
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
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
                                            background: colors.bg,
                                            color: colors.text,
                                            fontWeight: 600,
                                            border: `1px solid ${colors.border}`,
                                        }}
                                    >
                                        {INSIGHT_LABELS[ins.type]}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#64748b' }}>
                                        раунд {ins.round}
                                    </span>
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: ins.significance > 0.7 ? '#22c55e' : '#facc15',
                                        }}
                                    >
                                        sig: {ins.significance.toFixed(2)}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 4 }}>
                                    {ins.text}
                                </div>
                                <div
                                    style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}
                                >
                                    {'«'}
                                    {ins.quote}
                                    {'»'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                InsightBus — P1.21 протокол. Не требует LLM-вызовов, работает на эвристиках и
                регулярных выражениях. Хранит до 20 последних инсайтов, активны — последние 3
                раунда.
            </div>
        </div>
    );
};

export default InsightBusPanel;
