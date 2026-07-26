import React, { useState, useCallback } from 'react';
import { Target, Info, Search, AlertTriangle, Crosshair } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type {
    VulnerabilityType,
    VulnerabilityTarget,
} from '../../kernel/contracts/debate-vulnerability';

const TECHNIQUE_ID = 'vulnerability-targeting';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'VulnerabilityTargeting',
    nameRu: 'Поиск уязвимостей',
    description:
        'Find opponent weak claims via graph analysis — orphan nodes, abandoned positions, overextended claims',
    descriptionRu:
        'Находит слабые утверждения оппонента через графовый анализ: осиротевшие узлы, брошенные позиции, перегруженные утверждения',
    category: 'P0',
    defaultEnabled: true,
};

const VULN_LABELS: Record<VulnerabilityType, { label: string; color: string; desc: string }> = {
    orphan: { label: 'Осиротевший', color: '#ef4444', desc: 'Атакован, но ни разу не защищён' },
    abandoned: {
        label: 'Брошенный',
        color: '#f97316',
        desc: 'Раннее утверждение, которое агент больше не упоминал',
    },
    overextended: {
        label: 'Перегруженный',
        color: '#f59e0b',
        desc: 'Высокое соотношение атак к поддержке',
    },
    weak_centrality: {
        label: 'Слабая связь',
        color: '#8b5cf6',
        desc: 'Низкая центральность в графе аргументов',
    },
    unchallenged: {
        label: 'Без ответа',
        color: '#ec4899',
        desc: 'Утверждение оппонента, никем не оспоренное',
    },
};

const TARGETS: VulnerabilityTarget[] = [
    {
        type: 'abandoned',
        targetClaimId: 'c1',
        targetClaimText:
            'ИИ должен быть открытым, потому что прозрачность — единственный способ обеспечить безопасность',
        opponentId: 'agent-1',
        opponentName: 'Афина',
        score: 0.85,
        detail: 'Утверждение сделано в раунде 1, но агент больше его не защищал. Уязвимо для атаки.',
    },
    {
        type: 'overextended',
        targetClaimId: 'c3',
        targetClaimText:
            'История показывает, что открытые стандарты (интернет, Linux) побеждают закрытые',
        opponentId: 'agent-1',
        opponentName: 'Афина',
        score: 0.72,
        detail: 'Утверждение атаковано 2 раза, защищено 1 раз. Соотношение 2:1.',
    },
    {
        type: 'unchallenged',
        targetClaimId: 'c5',
        targetClaimText:
            'Коммерческие компании не могут рисковать, открывая свои модели конкурентам',
        opponentId: 'agent-2',
        opponentName: 'Гермес',
        score: 0.65,
        detail: 'Утверждение осталось без ответа 2 раунда.',
    },
    {
        type: 'weak_centrality',
        targetClaimId: 'c4',
        targetClaimText: 'Открытый исходный код не гарантирует безопасности — Heartbleed',
        opponentId: 'agent-2',
        opponentName: 'Гермес',
        score: 0.58,
        detail: 'Низкая центральность в графе (0.12). Изолированный узел.',
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

export const VulnTargetingPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const sorted = [...TARGETS].sort((a, b) => b.score - a.score);

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
                    <Target size={22} color="#ef4444" />
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
                            icon: <Search size={20} />,
                            title: 'Сканирование графа',
                            desc: 'Анализируется граф аргументов: центральность узлов, соотношение атак/поддержки, осиротевшие и брошенные узлы.',
                        },
                        {
                            icon: <AlertTriangle size={20} />,
                            title: '5 типов уязвимостей',
                            desc: 'orphan (атакован без защиты), abandoned (брошен), overextended (перегружен), weak_centrality, unchallenged.',
                        },
                        {
                            icon: <Crosshair size={20} />,
                            title: 'Выбор цели',
                            desc: 'Уязвимости сортируются по score. Топ-N передаются в buildTargetingPrompt для внедрения в промпт.',
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
                        Демо: уязвимости оппонента
                    </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sorted.map((t, i) => {
                        const info = VULN_LABELS[t.type];
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 10,
                                    background:
                                        i === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(15,23,42,0.4)',
                                    border:
                                        i === 0
                                            ? '1px solid rgba(239,68,68,0.3)'
                                            : '1px solid rgba(148,163,184,0.08)',
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
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            background: `${info.color}22`,
                                            color: info.color,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {info.label}
                                    </span>
                                    <span
                                        style={{ fontWeight: 600, fontSize: 12, color: '#93c5fd' }}
                                    >
                                        {t.opponentName}
                                    </span>
                                    {i === 0 && (
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color: '#ef4444',
                                                fontWeight: 600,
                                                marginLeft: 'auto',
                                            }}
                                        >
                                            ПРИОРИТЕТ
                                        </span>
                                    )}
                                    <span
                                        style={{
                                            marginLeft: i === 0 ? 0 : 'auto',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color:
                                                t.score > 0.7
                                                    ? '#ef4444'
                                                    : t.score > 0.5
                                                      ? '#facc15'
                                                      : '#f97316',
                                        }}
                                    >
                                        {t.score.toFixed(2)}
                                    </span>
                                </div>
                                <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 4 }}>
                                    {'«'}
                                    {t.targetClaimText}
                                    {'»'}
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.detail}</div>
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
                Vulnerability Targeting — P0.4 протокол. Требует IArgumentGraphService. Анализирует
                5 типов уязвимостей через граф аргументов.
            </div>
        </div>
    );
};

export default VulnTargetingPanel;
