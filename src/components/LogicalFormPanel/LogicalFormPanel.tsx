import React, { useState, useCallback } from 'react';
import { FileSearch, Info, Search, Brain, Lightbulb, List } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { LogicalFormType } from '../../kernel/contracts/debate-logic';

const TECHNIQUE_ID = 'enthymeme';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'LogicalFormExtractor',
    nameRu: 'Логическая форма',
    description:
        'Extract logical form (major/minor premise + conclusion) from arguments — surface hidden premises',
    descriptionRu:
        'Извлекает логическую форму аргументов (большая/малая посылка + вывод) — выявляет скрытые предпосылки (энтимемы)',
    category: 'P1',
    defaultEnabled: true,
};

const FORM_LABELS: Record<LogicalFormType, string> = {
    syllogism: 'Силлогизм',
    modus_ponens: 'Modus Ponens',
    modus_tollens: 'Modus Tollens',
    disjunctive_syllogism: 'Дизъюнктивный силлогизм',
    hypothetical_syllogism: 'Гипотетический силлогизм',
    categorical_syllogism: 'Категорический силлогизм',
    analogy: 'Аналогия',
    generalization: 'Обобщение',
    cause_effect: 'Причина-следствие',
    authority: 'Апелляция к авторитету',
    unknown: 'Неизвестно',
};

const SAMPLE = [
    {
        arg: 'ИИ должен быть открытым, потому что прозрачность — единственный способ обеспечить безопасность и доверие общества.',
        form: 'syllogism' as LogicalFormType,
        major: 'Всё, что обеспечивает безопасность через прозрачность, должно быть открытым',
        minor: 'Открытый ИИ обеспечивает безопасность через прозрачность',
        conclusion: 'ИИ должен быть открытым',
        hasEnthymeme: true,
        hiddenPremise:
            'Прозрачность — единственный способ обеспечения безопасности (скрытое допущение, что другие способы не работают)',
    },
    {
        arg: 'Закрытые системы безопаснее, так как ограничивают доступ злоумышленников к модели.',
        form: 'cause_effect' as LogicalFormType,
        major: 'Ограничение доступа снижает количество атак',
        minor: 'Закрытые системы ограничивают доступ',
        conclusion: 'Закрытые системы безопаснее',
        hasEnthymeme: false,
        hiddenPremise: '',
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

export const LogicalFormPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedIdx, setSelectedIdx] = useState(0);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const sample = SAMPLE[selectedIdx];

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
                    <FileSearch size={22} color="#8b5cf6" />
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
                            icon: <Brain size={20} />,
                            title: 'Извлечение формы',
                            desc: 'Аргумент разбирается на major premise, minor premise и conclusion через 11 типов логических форм.',
                        },
                        {
                            icon: <Search size={20} />,
                            title: 'Поиск энтимем',
                            desc: 'Если premise неявная (enthymeme) — она реконструируется и добавляется в EnthymemeTarget.',
                        },
                        {
                            icon: <Lightbulb size={20} />,
                            title: 'Поверхностный анализ',
                            desc: 'Обнаруженные скрытые предпосылки форматируются и внедряются в промпт — оппонент атакует их.',
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
                    <List size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: логический разбор
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Аргумент:</span>
                    <select
                        value={selectedIdx}
                        onChange={(e) => setSelectedIdx(Number(e.target.value))}
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
                        {SAMPLE.map((_, i) => (
                            <option key={i} value={i}>
                                #{i + 1}
                            </option>
                        ))}
                    </select>
                </div>

                <div
                    style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(59,130,246,0.08)',
                        border: '1px solid rgba(59,130,246,0.15)',
                        fontSize: 12,
                        color: '#cbd5e1',
                        marginBottom: 16,
                    }}
                >
                    {sample.arg}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(139,92,246,0.15)',
                            color: '#a78bfa',
                            fontWeight: 600,
                        }}
                    >
                        {FORM_LABELS[sample.form]}
                    </span>
                    {sample.hasEnthymeme && (
                        <span
                            style={{
                                fontSize: 10,
                                padding: '1px 5px',
                                borderRadius: 3,
                                background: 'rgba(245,158,11,0.15)',
                                color: '#f59e0b',
                                fontWeight: 500,
                            }}
                        >
                            ЭНТИМЕМА
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                        style={{
                            padding: '10px 12px',
                            borderRadius: 8,
                            background: 'rgba(59,130,246,0.06)',
                            border: '1px solid rgba(59,130,246,0.2)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#60a5fa',
                                marginBottom: 2,
                            }}
                        >
                            БОЛЬШАЯ ПОСЫЛКА
                        </div>
                        <div style={{ fontSize: 11, color: '#cbd5e1' }}>{sample.major}</div>
                    </div>
                    <div
                        style={{
                            padding: '10px 12px',
                            borderRadius: 8,
                            background: 'rgba(139,92,246,0.06)',
                            border: '1px solid rgba(139,92,246,0.2)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#a78bfa',
                                marginBottom: 2,
                            }}
                        >
                            МАЛАЯ ПОСЫЛКА
                        </div>
                        <div style={{ fontSize: 11, color: '#cbd5e1' }}>{sample.minor}</div>
                    </div>
                    <div
                        style={{
                            padding: '10px 12px',
                            borderRadius: 8,
                            background: 'rgba(16,185,129,0.06)',
                            border: '1px solid rgba(16,185,129,0.2)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#34d399',
                                marginBottom: 2,
                            }}
                        >
                            ВЫВОД
                        </div>
                        <div style={{ fontSize: 11, color: '#cbd5e1' }}>{sample.conclusion}</div>
                    </div>
                </div>

                {sample.hasEnthymeme && (
                    <div
                        style={{
                            marginTop: 12,
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(245,158,11,0.06)',
                            border: '1px solid rgba(245,158,11,0.2)',
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
                            <Lightbulb size={14} color="#f59e0b" />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b' }}>
                                Энтимема (скрытая предпосылка)
                            </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#cbd5e1' }}>{sample.hiddenPremise}</div>
                    </div>
                )}
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
                Logical Form Extractor — P1.25 протокол. Не требует LLM-вызовов. 11 типов логических
                форм, детекция энтимем через ключевые слова.
            </div>
        </div>
    );
};

export default LogicalFormPanel;
