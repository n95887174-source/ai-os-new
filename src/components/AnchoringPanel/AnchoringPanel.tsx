import React, { useState, useCallback } from 'react';
import { Anchor, Info, Shield, GitMerge, FileText, MessageSquare } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { AnchorClaim } from '../../kernel/contracts/debate-entanglement';

const TECHNIQUE_ID = 'agreement-anchoring';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'AgreementAnchoring',
    nameRu: 'Якорение согласия',
    description:
        'Detect unchallenged claims and lock them as common ground — prevent re-arguing agreed points',
    descriptionRu:
        'Находит утверждения, оставшиеся без ответа N+ раундов, и фиксирует их как общую почву — агенты перестают их переспаривать',
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
    {
        id: 'a5',
        agentId: 'agent-2',
        agentName: 'Гермес',
        content:
            'Кроме того, коммерческие компании не могут рисковать, открывая свои модели конкурентам.',
        round: 3,
    },
    {
        id: 'a6',
        agentId: 'agent-1',
        agentName: 'Афина',
        content: 'Регуляция должна быть, но не ценой полной секретности. Нужен баланс.',
        round: 4,
    },
];

const simulateAnchors = (): AnchorClaim[] => [
    {
        claimId: 'a1',
        agentName: 'Афина',
        text: 'Прозрачность — единственный способ обеспечить безопасность и доверие общества',
        roundResolved: 4,
        confidence: 0.85,
    },
    {
        claimId: 'a2',
        agentName: 'Гермес',
        text: 'Закрытые системы безопаснее, так как ограничивают доступ злоумышленников',
        roundResolved: 4,
        confidence: 0.78,
    },
    {
        claimId: 'a3',
        agentName: 'Афина',
        text: 'Открытые стандарты (интернет, Linux) побеждают закрытые',
        roundResolved: 4,
        confidence: 0.72,
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

export const AnchoringPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const anchors = simulateAnchors();

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
                    <Anchor size={22} color="#06b6d4" />
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
                            icon: <Shield size={20} />,
                            title: 'Поиск якорей',
                            desc: 'Сканируются все утверждения, которые остались без ответа в течение N+ раундов (по умолчанию 3). Используется граф аргументов или эвристика word-overlap.',
                        },
                        {
                            icon: <GitMerge size={20} />,
                            title: 'Дедупликация',
                            desc:
                                'Похожие якоря (Jaccard similarity {' >
                                '} 0.35) схлопываются. Возвращается максимум 10 уникальных якорей с confidence score.',
                        },
                        {
                            icon: <FileText size={20} />,
                            title: 'Delta Prompt',
                            desc: 'Генерируется инструкция для агентов: «Следующие пункты уже согласованы — не переспаривайте их». Экономит токены и фокус.',
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
                    <Anchor size={18} color="#22d3ee" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: извлечение якорей
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
                                {anchors.some((anc) => anc.claimId === a.id) && (
                                    <span
                                        style={{
                                            fontSize: 10,
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            background: 'rgba(6,182,212,0.2)',
                                            color: '#22d3ee',
                                            fontWeight: 600,
                                            marginLeft: 'auto',
                                        }}
                                    >
                                        ЯКОРЬ
                                    </span>
                                )}
                            </div>
                            {a.content}
                        </div>
                    ))}
                </div>

                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    Извлечённые якоря (minRoundsForAnchor=3):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {anchors.map((a, i) => (
                        <div
                            key={i}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 10,
                                background: 'rgba(6,182,212,0.08)',
                                border: '1px solid rgba(6,182,212,0.25)',
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
                                <span style={{ fontWeight: 600, fontSize: 12, color: '#67e8f9' }}>
                                    {a.agentName}
                                </span>
                                <span style={{ fontSize: 10, color: '#64748b' }}>
                                    раунд {a.roundResolved}
                                </span>
                                <span
                                    style={{
                                        marginLeft: 'auto',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: a.confidence > 0.8 ? '#22c55e' : '#facc15',
                                    }}
                                >
                                    {a.confidence.toFixed(2)}
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0' }}>{a.text}</div>
                        </div>
                    ))}
                </div>

                {anchors.length > 0 && (
                    <div
                        style={{
                            marginTop: 16,
                            padding: 14,
                            borderRadius: 10,
                            background: 'rgba(6,182,212,0.06)',
                            border: '1px solid rgba(6,182,212,0.15)',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: 8,
                            }}
                        >
                            <MessageSquare size={14} color="#22d3ee" />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#22d3ee' }}>
                                Сгенерированный Delta Prompt
                            </span>
                        </div>
                        <div
                            style={{
                                fontSize: 11,
                                color: '#94a3b8',
                                lineHeight: 1.5,
                                fontStyle: 'italic',
                            }}
                        >
                            Следующие пункты уже согласованы и не требуют повторного обсуждения. Не
                            тратьте токены на их переспаривание: (1) Прозрачность — способ
                            обеспечения безопасности и доверия. (2) Закрытые системы ограничивают
                            доступ злоумышленников. (3) Открытые стандарты имеют исторические
                            прецеденты успеха.
                        </div>
                    </div>
                )}
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
                Agreement Anchoring — P0.5 протокол. Не требует LLM-вызовов. Использует граф
                аргументов (если доступен) или Jaccard similarity для детекции неоспоренных
                утверждений.
            </div>
        </div>
    );
};

export default AnchoringPanel;
