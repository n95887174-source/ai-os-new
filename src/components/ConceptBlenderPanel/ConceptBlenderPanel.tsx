import React, { useState, useCallback } from 'react';
import { Blend, Info, FlaskConical, Zap, GitBranch, Lightbulb } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { BlendResult, BlendedConcept } from '../../kernel/contracts/debate-blending';

const TECHNIQUE_ID = 'semantic-blending';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'ConceptBlender',
    nameRu: 'Семантическое смешение',
    description: 'When deadlocked, invent new frameworks combining opposing concepts',
    descriptionRu:
        'При тупике в дебатах — создаёт новые концепты, объединяющие противоположные понятия для выхода из дихотомии',
    category: 'P1',
    defaultEnabled: true,
};

const CONCEPT_PAIRS = [
    { a: 'Эффективность', b: 'Равенство' },
    { a: 'Свобода', b: 'Безопасность' },
    { a: 'Централизация', b: 'Децентрализация' },
    { a: 'Приватность', b: 'Прозрачность' },
    { a: 'Инновации', b: 'Регуляция' },
    { a: 'Конкуренция', b: 'Кооперация' },
    { a: 'Традиция', b: 'Прогресс' },
    { a: 'Локальное', b: 'Глобальное' },
    { a: 'Количество', b: 'Качество' },
    { a: 'Теория', b: 'Практика' },
];

const simulateBlend = (pair: (typeof CONCEPT_PAIRS)[0]): BlendResult => {
    const blends: BlendedConcept[] = [
        {
            name: `${pair.a}-${pair.b} Синтез`,
            parentA: pair.a,
            parentB: pair.b,
            synthesis: `Концепция «${pair.a} через ${pair.b}»: ${pair.b} создаёт условия для устойчивого ${pair.a.toLowerCase()}, а ${pair.a.toLowerCase()} даёт ресурсы для ${pair.b.toLowerCase()}.`,
            novelInsight: `Противопоставление ${pair.a.toLowerCase()} и ${pair.b.toLowerCase()} — ложная дихотомия. Они работают как взаимно усиливающие циклы, а не как конкурирующие ценности.`,
            resolutionPath: `Предложить критерий, при котором ${pair.b.toLowerCase()} максимизируется без ущерба для ${pair.a.toLowerCase()}, и наоборот.`,
        },
    ];
    if (Math.random() > 0.5) {
        blends.push({
            name: `Адаптивный ${pair.b}`,
            parentA: pair.a,
            parentB: pair.b,
            synthesis: `${pair.b} с обратной связью от ${pair.a.toLowerCase()}: динамический баланс вместо статического выбора.`,
            novelInsight: `Ключ не в выборе между ${pair.a.toLowerCase()} и ${pair.b.toLowerCase()}, а в создании системы, которая переключается между ними в зависимости от контекста.`,
            resolutionPath: `Разработать метрики, определяющие, когда ${pair.a.toLowerCase()} важнее, а когда — ${pair.b.toLowerCase()}.`,
        });
    }
    return {
        deadlock: {
            present: true,
            intensity: 0.75,
            stalemateRounds: 3,
            clashingConcepts: [pair.a, pair.b],
        },
        blends,
        bestBlendText: blends[0].synthesis,
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

export const ConceptBlenderPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedPair, setSelectedPair] = useState(CONCEPT_PAIRS[0]);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const result = simulateBlend(selectedPair);

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
                    <Blend size={22} color="#ec4899" />
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
                            icon: <Zap size={20} />,
                            title: 'Детекция тупика',
                            desc:
                                'Сканируются последние 6 аргументов на паттерны зацикливания, соломенного чучела и повторения. Если интенсивность {' >
                                '}0.3 — фиксируется deadlock.',
                        },
                        {
                            icon: <GitBranch size={20} />,
                            title: 'Поиск пар',
                            desc: 'Определяются два противоположных понятия, которые зациклили дебаты. Используется 10 предопределённых концептуальных пар.',
                        },
                        {
                            icon: <Lightbulb size={20} />,
                            title: 'Генерация бленда',
                            desc: 'Создаются 1-2 гибридных концепта с синтезом, новым инсайтом и путём разрешения. Лучший бленд добавляется в промпт.',
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
                    <FlaskConical size={18} color="#f472b6" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: смешение концептов
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Концептуальная пара:</span>
                    <select
                        value={`${selectedPair.a}|${selectedPair.b}`}
                        onChange={(e) => {
                            const [a, b] = e.target.value.split('|');
                            setSelectedPair(
                                CONCEPT_PAIRS.find((p) => p.a === a && p.b === b) ||
                                    CONCEPT_PAIRS[0],
                            );
                        }}
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
                        {CONCEPT_PAIRS.map((p) => (
                            <option key={`${p.a}|${p.b}`} value={`${p.a}|${p.b}`}>
                                {p.a} ↔ {p.b}
                            </option>
                        ))}
                    </select>
                </div>

                <div
                    style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'rgba(236,72,153,0.08)',
                        border: '1px solid rgba(236,72,153,0.2)',
                        marginBottom: 16,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Zap size={14} color="#f472b6" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#f472b6' }}>
                            Детекция тупика
                        </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                        Deadlock обнаружен: интенсивность {result.deadlock.intensity.toFixed(2)},
                        зацикленность на {result.deadlock.stalemateRounds} раунда.
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        Сталкивающиеся концепты:{' '}
                        <span style={{ color: '#f472b6', fontWeight: 600 }}>
                            {result.deadlock.clashingConcepts[0]}
                        </span>{' '}
                        vs{' '}
                        <span style={{ color: '#f472b6', fontWeight: 600 }}>
                            {result.deadlock.clashingConcepts[1]}
                        </span>
                    </div>
                </div>

                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    Сгенерированные бленды:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.blends.map((b, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 14,
                                borderRadius: 10,
                                background: 'rgba(236,72,153,0.06)',
                                border: '1px solid rgba(236,72,153,0.2)',
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
                                <Blend size={14} color="#f472b6" />
                                <span style={{ fontWeight: 600, fontSize: 13, color: '#f9a8d4' }}>
                                    {b.name}
                                </span>
                                {i === 0 && (
                                    <span
                                        style={{
                                            fontSize: 10,
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            background: 'rgba(236,72,153,0.2)',
                                            color: '#f472b6',
                                            fontWeight: 600,
                                        }}
                                    >
                                        BEST
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 6 }}>
                                {b.synthesis}
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: '#94a3b8',
                                    marginBottom: 6,
                                    fontStyle: 'italic',
                                }}
                            >
                                Новый инсайт: {b.novelInsight}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                                Путь разрешения: {b.resolutionPath}
                            </div>
                        </div>
                    ))}
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
                Concept Blender — P1.29 протокол. Не требует LLM-вызовов. 10 предопределённых
                концептуальных пар, детекция через регулярные выражения, генерация бленда —
                шаблонная.
            </div>
        </div>
    );
};

export default ConceptBlenderPanel;
