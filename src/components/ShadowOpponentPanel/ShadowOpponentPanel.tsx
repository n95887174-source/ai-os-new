import React, { useState, useCallback } from 'react';
import { UserMinus, Info, Swords, RefreshCw, MessageSquare, Eye } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { ShadowCritique } from '../../kernel/contracts/debate-shadow-opponent';

const TECHNIQUE_ID = 'shadow-opponent';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'ShadowOpponent',
    nameRu: 'Теневой оппонент',
    description:
        'Self-critique loop — agent critiques its own draft as the strongest opponent, then rewrites it stronger',
    descriptionRu:
        'Цикл самокритики: агент критикует свой черновик как сильнейший оппонент, затем переписывает его сильнее',
    category: 'P0',
    defaultEnabled: true,
};

const simulateCritique = (): ShadowCritique => ({
    originalContent:
        'ИИ должен быть открытым, потому что прозрачность — единственный способ обеспечить безопасность и доверие общества.',
    strengthenedContent:
        'ИИ должен быть открытым: прозрачность позволяет сообществу аудировать алгоритмы, находить уязвимости и обеспечивать подотчётность. Как показал опыт Linux и открытых стандартов, краудсорсинг безопасности эффективнее, чем модель «безопасность через неизвестность». При этом открытость не исключает регулирования — она создаёт условия для ответственного контроля.',
    critique:
        'Ваш аргумент уязвим для контраргумента «Heartbleed был в открытом OpenSSL». Вы не предвосхитили этот контраргумент. Также вы не объяснили, почему «прозрачность — единственный способ», а не один из способов. Рекомендуется: (1) признать контраргумент про Heartbleed, (2) указать на скорость исправления в open-source, (3) добавить сравнение с проприетарными инцидентами.',
    latencyMs: 1240,
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

export const ShadowOpponentPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [showCritique, setShowCritique] = useState(false);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const result = simulateCritique();

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
                    <UserMinus size={22} color="#8b5cf6" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(139,92,246,0.15)',
                            color: '#8b5cf6',
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
                    border: '1px solid rgba(139,92,246,0.15)',
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
                            icon: <Swords size={20} />,
                            title: 'Генерация черновика',
                            desc: 'Агент создаёт черновой аргумент в обычном режиме.',
                        },
                        {
                            icon: <Eye size={20} />,
                            title: 'Критика оппонентом',
                            desc: 'Тот же LLM получает промпт: «Ты — сильнейший оппонент. Найди слабые места в этом аргументе».',
                        },
                        {
                            icon: <RefreshCw size={20} />,
                            title: 'Перезапись',
                            desc: 'Агент переписывает аргумент с учётом критики, предвосхищая контраргументы.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(139,92,246,0.1)',
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
                    <MessageSquare size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: цикл самокритики
                    </h3>
                    <div style={{ flex: 1 }} />
                    <button
                        type="button"
                        onClick={() => setShowCritique(!showCritique)}
                        style={{
                            padding: '4px 12px',
                            borderRadius: 6,
                            border: '1px solid rgba(139,92,246,0.3)',
                            background: 'rgba(139,92,246,0.1)',
                            color: '#a78bfa',
                            fontSize: 11,
                            cursor: 'pointer',
                        }}
                    >
                        {showCritique ? 'Скрыть критику' : 'Показать критику'}
                    </button>
                </div>

                <div
                    style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'rgba(59,130,246,0.06)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa', marginBottom: 4 }}
                    >
                        Черновик
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>{result.originalContent}</div>
                </div>

                {showCritique && (
                    <div
                        style={{
                            padding: 14,
                            borderRadius: 10,
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            marginBottom: 12,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#f87171',
                                marginBottom: 4,
                            }}
                        >
                            Критика оппонента
                        </div>
                        <div style={{ fontSize: 12, color: '#cbd5e1' }}>{result.critique}</div>
                        <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                            Latency: {result.latencyMs}ms
                        </div>
                    </div>
                )}

                <div
                    style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'rgba(34,197,94,0.06)',
                        border: '1px solid rgba(34,197,94,0.2)',
                    }}
                >
                    <div
                        style={{ fontSize: 11, fontWeight: 600, color: '#34d399', marginBottom: 4 }}
                    >
                        Усиленный аргумент
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                        {result.strengthenedContent}
                    </div>
                </div>
            </div>

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
                Shadow Opponent — P0.2 протокол. Требует 2 LLM-вызова на аргумент (черновик +
                критика + перезапись). Снижает confirmation bias, добавляет preemptive rebuttals.
            </div>
        </div>
    );
};

export default ShadowOpponentPanel;
