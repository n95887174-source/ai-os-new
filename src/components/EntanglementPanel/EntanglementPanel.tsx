import React, { useState, useCallback } from 'react';
import { Link2, Info, Crosshair, CheckCircle, Target, Shuffle } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type {
    EntanglementResponseType,
    EntanglementConstraint,
} from '../../kernel/contracts/debate-entanglement';

const TECHNIQUE_ID = 'entanglement';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'Entanglement',
    nameRu: 'Зацепление аргументов',
    description:
        'Cross-examination protocol — forces agents to directly engage with specific opponent claims',
    descriptionRu:
        'Принудительное зацепление: агент обязан ответить на конкретное утверждение оппонента, а не уходить в сторону',
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

const simulateConstraint = (targetAgent: string): EntanglementConstraint => {
    const isAthena = targetAgent === 'agent-1';
    return {
        mustQuoteOpponent: true,
        targetClaimId: isAthena ? 'a2' : 'a1',
        targetClaimText: isAthena
            ? 'Закрытые системы безопаснее, так как ограничивают доступ злоумышленников к модели.'
            : 'ИИ должен быть открытым, потому что прозрачность — единственный способ обеспечить безопасность и доверие общества.',
        opponentId: isAthena ? 'agent-2' : 'agent-1',
        opponentName: isAthena ? 'Гермес' : 'Афина',
        responseType: 'rebut' as EntanglementResponseType,
        contextPhrase: isAthena
            ? 'относительно безопасности закрытых систем'
            : 'относительно необходимости открытости',
    };
};

const RESPONSE_LABELS: Record<EntanglementResponseType, string> = {
    rebut: 'Опровержение',
    support: 'Поддержка',
    refine: 'Уточнение',
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

export const EntanglementPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [targetAgent, setTargetAgent] = useState('agent-2');

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const constraint = simulateConstraint(targetAgent);

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
                    <Link2 size={22} color="#10b981" />
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
                            icon: <Target size={20} />,
                            title: 'Выбор цели',
                            desc: 'Алгоритм выбирает самое важное неотвеченное утверждение оппонента на основе центральности в графе аргументов.',
                        },
                        {
                            icon: <Crosshair size={20} />,
                            title: 'Формирование ограничения',
                            desc: 'Создаётся约束: агент обязан процитировать оппонента, указать targetClaimId и выбрать тип ответа (опровержение/поддержка/уточнение).',
                        },
                        {
                            icon: <CheckCircle size={20} />,
                            title: 'Валидация ответа',
                            desc: 'После генерации ответ проверяется: действительно ли агент engaged с указанным утверждением, или ушёл в сторону.',
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
                    <Shuffle size={18} color="#34d399" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: генерация зацепления
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Агент:</span>
                    <select
                        value={targetAgent}
                        onChange={(e) => setTargetAgent(e.target.value)}
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
                        <option value="agent-2">Гермес (получает)</option>
                        <option value="agent-1">Афина (получает)</option>
                    </select>
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
                                {a.id === constraint.targetClaimId && (
                                    <span
                                        style={{
                                            fontSize: 10,
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            background: 'rgba(16,185,129,0.2)',
                                            color: '#34d399',
                                            fontWeight: 600,
                                            marginLeft: 'auto',
                                        }}
                                    >
                                        ЦЕЛЬ
                                    </span>
                                )}
                            </div>
                            {a.content}
                        </div>
                    ))}
                </div>

                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    Сгенерированное ограничение:
                </div>
                <div
                    style={{
                        padding: 16,
                        borderRadius: 12,
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.25)',
                    }}
                >
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
                    >
                        <span
                            style={{
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(16,185,129,0.15)',
                                color: '#34d399',
                                fontWeight: 600,
                            }}
                        >
                            {RESPONSE_LABELS[constraint.responseType]}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                            → {constraint.opponentName}
                        </span>
                        {constraint.mustQuoteOpponent && (
                            <span
                                style={{
                                    fontSize: 10,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: 'rgba(245,158,11,0.15)',
                                    color: '#f59e0b',
                                    fontWeight: 500,
                                }}
                            >
                                обязательная цитата
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 6 }}>
                        Контекст: {constraint.contextPhrase}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                        Целевое утверждение: {'«'}
                        {constraint.targetClaimText}
                        {'»'}
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
                Entanglement — P0.1 протокол перекрёстного допроса. Не требует LLM-вызовов.
                Валидация ответа использует cosine similarity между ответом и целевым утверждением.
            </div>
        </div>
    );
};

export default EntanglementPanel;
