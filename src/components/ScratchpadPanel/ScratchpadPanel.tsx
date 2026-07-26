import React, { useState, useCallback } from 'react';
import { FileText, Info, Brain, Shield, Target, MessageSquare } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { ScratchpadAnalysis } from '../../kernel/contracts/debate-scratchpad';

const TECHNIQUE_ID = 'scratchpad';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'Scratchpad',
    nameRu: 'Тактический черновик',
    description:
        'Pre-generation tactical analysis — identify weaknesses, opportunities, and focus before writing',
    descriptionRu:
        'Пред-генерационный тактический анализ: слабости оппонента, возможности, фокус — до написания аргумента',
    category: 'P2',
    defaultEnabled: true,
};

const HISTORY = [
    {
        agentId: 'agent-1',
        agentName: 'Афина',
        content:
            'Искусственный интеллект должен быть открытым, потому что прозрачность — единственный способ обеспечить безопасность.',
        round: 1,
    },
    {
        agentId: 'agent-2',
        agentName: 'Гермес',
        content:
            'Закрытые системы безопаснее, так как ограничивают доступ злоумышленников к модели.',
        round: 1,
    },
    {
        agentId: 'agent-1',
        agentName: 'Афина',
        content: 'История показывает, что открытые стандарты (интернет, Linux) побеждают закрытые.',
        round: 2,
    },
    {
        agentId: 'agent-2',
        agentName: 'Гермес',
        content:
            'Открытый исходный код не гарантирует безопасности — Heartbleed был в открытом OpenSSL.',
        round: 2,
    },
    {
        agentId: 'agent-1',
        agentName: 'Афина',
        content: 'Регуляция должна быть, но не ценой полной секретности. Нужен баланс.',
        round: 3,
    },
];

const simulateAnalysis = (): ScratchpadAnalysis => ({
    weaknesses: [
        'Оппонент использует единичный контрпример (Heartbleed) для опровержения общего правила',
        'Оппонент не предложил альтернативного механизма обеспечения безопасности',
    ],
    opportunities: [
        'Утверждение оппонента о безопасности закрытых систем осталось без эмпирического обоснования',
        'Контраргумент про Heartbleed можно парировать указанием на быстроту исправления в open-source',
    ],
    tacticalFocus:
        'Атаковать эмпирическую базу оппонента: потребовать статистику уязвимостей в открытых vs закрытых системах.',
    promptBlock:
        'Тактический анализ: оппонент использует единичный контрпример (Heartbleed) для опровержения статистически значимого паттерна. Запросите мета-анализ уязвимостей. Используйте аргумент: "скорость исправления в open-source выше, чем в проприетарном ПО".',
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

export const ScratchpadPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const analysis = simulateAnalysis();

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
                    <FileText size={22} color="#06b6d4" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(6,182,212,0.15)',
                            color: '#06b6d4',
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
                    border: '1px solid rgba(6,182,212,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#22d3ee" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Brain size={20} />,
                            title: 'Анализ истории',
                            desc: 'Сканируются все предыдущие аргументы: ищутся неоспоренные утверждения, внутренние противоречия и паттерны.',
                        },
                        {
                            icon: <Target size={20} />,
                            title: 'Слабости и возможности',
                            desc: 'Формируются списки weaknesses (уязвимости оппонента) и opportunities (неиспользованные возможности для атаки).',
                        },
                        {
                            icon: <MessageSquare size={20} />,
                            title: 'Tactical Focus',
                            desc: 'Определяется фокус для текущего раунда — на чём агент должен сконцентрироваться.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(6,182,212,0.1)',
                            }}
                        >
                            <div style={{ color: '#22d3ee', marginBottom: 8 }}>{card.icon}</div>
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
                    border: '1px solid rgba(6,182,212,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <FileText size={18} color="#22d3ee" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: тактический анализ
                    </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {HISTORY.map((a, i) => (
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
                            <span style={{ fontWeight: 600, color: '#93c5fd' }}>{a.agentName}</span>{' '}
                            (R{a.round}): {a.content}
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                        marginBottom: 16,
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#ef4444',
                                marginBottom: 6,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <Shield size={12} /> Слабости оппонента
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {analysis.weaknesses.map((w, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: 6,
                                        background: 'rgba(239,68,68,0.06)',
                                        border: '1px solid rgba(239,68,68,0.15)',
                                        fontSize: 11,
                                        color: '#cbd5e1',
                                    }}
                                >
                                    {w}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#22c55e',
                                marginBottom: 6,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <Target size={12} /> Возможности
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {analysis.opportunities.map((o, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: 6,
                                        background: 'rgba(34,197,94,0.06)',
                                        border: '1px solid rgba(34,197,94,0.15)',
                                        fontSize: 11,
                                        color: '#cbd5e1',
                                    }}
                                >
                                    {o}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 8,
                        background: 'rgba(6,182,212,0.06)',
                        border: '1px solid rgba(6,182,212,0.2)',
                    }}
                >
                    <div
                        style={{ fontSize: 11, fontWeight: 600, color: '#22d3ee', marginBottom: 4 }}
                    >
                        Tactical Focus
                    </div>
                    <div style={{ fontSize: 11, color: '#cbd5e1' }}>{analysis.tacticalFocus}</div>
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(6,182,212,0.06)',
                    border: '1px solid rgba(6,182,212,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Scratchpad — P2.11 протокол. Не требует LLM-вызовов. Анализ на основе
                keyword/pattern matching по истории аргументов.
            </div>
        </div>
    );
};

export default ScratchpadPanel;
