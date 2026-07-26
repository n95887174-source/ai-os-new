import React, { useState, useCallback } from 'react';
import { Shuffle, Info, Users, GitBranch, UserCheck, Palette, Sparkles } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { PersonaMix } from '../../kernel/contracts/debate-persona-mixer';

const TECHNIQUE_ID = 'persona-mixer';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'PersonaMixer',
    nameRu: 'Миксер персон',
    description:
        'Adaptive persona variation — blend traits to increase strategic diversity while maintaining consistency',
    descriptionRu:
        'Адаптивное смешение черт персоны: увеличивает разнообразие стратегий, сохраняя целостность характера',
    category: 'P1',
    defaultEnabled: true,
};

const ARCHETYPES = [
    {
        key: 'primary',
        label: 'Основная',
        desc: 'Базовая persona — стандартная аргументация',
        color: '#3b82f6',
    },
    {
        key: 'skeptic',
        label: 'Скептик',
        desc: 'Подвергает сомнению все утверждения оппонента',
        color: '#ef4444',
    },
    {
        key: 'synthesizer',
        label: 'Синтезатор',
        desc: 'Ищет общую почву и объединяет позиции',
        color: '#10b981',
    },
    {
        key: 'pragmatist',
        label: 'Прагматик',
        desc: 'Фокус на практических последствиях',
        color: '#f59e0b',
    },
    {
        key: 'visionary',
        label: 'Визионер',
        desc: 'Широкие концептуальные рамки и долгосрочное видение',
        color: '#8b5cf6',
    },
    { key: 'critic', label: 'Критик', desc: 'Детальный анализ слабых мест', color: '#f97316' },
    {
        key: 'historian',
        label: 'Историк',
        desc: 'Контекстуализация через исторические примеры',
        color: '#06b6d4',
    },
    {
        key: 'bridge_builder',
        label: 'Миротворец',
        desc: 'Поиск компромиссов и взаимовыгодных решений',
        color: '#ec4899',
    },
];

const simulateMix = (round: number): PersonaMix => {
    const archetypes = ARCHETYPES.slice(1);
    const idx = (round - 1) % archetypes.length;
    const variant = archetypes[idx];
    return {
        variationKey: variant.key,
        personaText: `Вы выступаете в роли «${variant.label}». ${variant.desc}. Сохраняйте базовые убеждения, но используйте ${variant.label.toLowerCase()}-подход к аргументации.`,
        blendedFrom:
            round > 2 ? `черты от: ${archetypes[(idx + 1) % archetypes.length].label}` : undefined,
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

export const PersonaMixerPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedRound, setSelectedRound] = useState(3);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const mix = simulateMix(selectedRound);

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
                    <Shuffle size={22} color="#ec4899" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(236,72,153,0.15)',
                            color: '#ec4899',
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
                    border: '1px solid rgba(236,72,153,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#f472b6" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Users size={20} />,
                            title: 'Архетипы',
                            desc: '8 вариаций персоны: скептик, синтезатор, прагматик, визионер, критик, историк, миротворец + базовая.',
                        },
                        {
                            icon: <GitBranch size={20} />,
                            title: 'Смешение черт',
                            desc: 'C раунда 2+ в persona могут примешиваться черты других участников — увеличивается разнообразие.',
                        },
                        {
                            icon: <UserCheck size={20} />,
                            title: 'Трекинг',
                            desc: 'Каждая использованная вариация записывается — одинаковые archetype не повторяются подряд.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(236,72,153,0.1)',
                            }}
                        >
                            <div style={{ color: '#f472b6', marginBottom: 8 }}>{card.icon}</div>
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
                    border: '1px solid rgba(236,72,153,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Palette size={18} color="#f472b6" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: смешение персоны
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Раунд:</span>
                    <select
                        value={selectedRound}
                        onChange={(e) => setSelectedRound(Number(e.target.value))}
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
                        {[1, 2, 3, 4, 5].map((r) => (
                            <option key={r} value={r}>
                                Раунд {r}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {ARCHETYPES.map((a) => (
                        <div
                            key={a.key}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 10px',
                                borderRadius: 8,
                                background:
                                    mix.variationKey === a.key
                                        ? `${a.color}22`
                                        : 'rgba(15,23,42,0.4)',
                                border:
                                    mix.variationKey === a.key
                                        ? `1px solid ${a.color}44`
                                        : '1px solid rgba(148,163,184,0.08)',
                                fontSize: 11,
                                color: mix.variationKey === a.key ? a.color : '#94a3b8',
                                fontWeight: mix.variationKey === a.key ? 600 : 400,
                            }}
                        >
                            {a.label}
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        padding: 16,
                        borderRadius: 12,
                        background: 'rgba(236,72,153,0.08)',
                        border: '1px solid rgba(236,72,153,0.25)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Sparkles size={14} color="#f472b6" />
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#f9a8d4' }}>
                            Вариация: {ARCHETYPES.find((a) => a.key === mix.variationKey)?.label}
                        </span>
                        {mix.blendedFrom && (
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
                                {mix.blendedFrom}
                            </span>
                        )}
                    </div>
                    <div
                        style={{
                            fontSize: 12,
                            color: '#cbd5e1',
                            lineHeight: 1.5,
                            fontStyle: 'italic',
                        }}
                    >
                        {mix.personaText}
                    </div>
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(236,72,153,0.06)',
                    border: '1px solid rgba(236,72,153,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Persona Mixer — P1.9 протокол. Не требует LLM-вызовов. Линейная интерполяция черт
                персоны + noise для разнообразия.
            </div>
        </div>
    );
};

export default PersonaMixerPanel;
