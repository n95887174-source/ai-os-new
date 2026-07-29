import React, { useState, useCallback } from 'react';
import { MessageSquare, Info, BookOpen, Zap, Repeat, FileText } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';

const TECHNIQUE_ID = 'rhetorical-device';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'RhetoricalDevice',
    nameRu: 'Риторические приёмы',
    description:
        'Select and inject rhetorical devices (socratic irony, pathos, analogy, etc.) into agent prompts',
    descriptionRu:
        'Выбирает и внедряет риторические приёмы (сократовская ирония, пафос, аналогия и т.д.) в промпты агентов',
    category: 'P2',
    defaultEnabled: true,
};

const DEVICES = [
    {
        id: 'socratic_irony',
        name: 'Сократовская ирония',
        desc: 'Притворное непонимание для выявления противоречий',
        instruction:
            'Используйте сократовский метод: задавайте вопросы, притворяясь непонимающим, чтобы оппонент сам раскрыл противоречия в своей позиции.',
    },
    {
        id: 'reductio',
        name: 'Reductio ad absurdum',
        desc: 'Доведение аргумента оппонента до абсурда',
        instruction:
            'Возьмите утверждение оппонента и доведите его до логического абсурда, показав нежелательные следствия.',
    },
    {
        id: 'anaphora',
        name: 'Анафора',
        desc: 'Повтор в начале предложений для усиления',
        instruction:
            'Используйте анафору — повторяйте ключевую фразу в начале последовательных предложений для эмоционального усиления.',
    },
    {
        id: 'pathos',
        name: 'Пафос',
        desc: 'Эмоциональное обращение к аудитории',
        instruction:
            'Используйте эмоционально заряженный язык: личные истории, яркие образы, обращения к ценностям аудитории.',
    },
    {
        id: 'logos',
        name: 'Логос',
        desc: 'Логическая аргументация с данными',
        instruction:
            'Сфокусируйтесь на логике и фактах: используйте статистику, исследования, причинно-следственные связи.',
    },
    {
        id: 'analogy',
        name: 'Аналогия',
        desc: 'Сравнение с известной ситуацией',
        instruction:
            'Используйте аналогию: сравните текущую ситуацию с хорошо известным историческим или бытовым примером.',
    },
    {
        id: 'rhetorical_question',
        name: 'Риторический вопрос',
        desc: 'Вопрос, не требующий ответа',
        instruction:
            'Задайте риторический вопрос, который направляет мышление оппонента в нужное русло.',
    },
    {
        id: 'concession',
        name: 'Уступка и опровержение',
        desc: 'Сначала согласиться, потом опровергнуть',
        instruction:
            'Начните с согласия с частью аргумента оппонента, затем опровергните остальное с более сильной позиции.',
    },
    {
        id: 'precedent',
        name: 'Исторический прецедент',
        desc: 'Ссылка на исторический пример',
        instruction: 'Сошлитесь на исторический прецедент, который подтверждает вашу позицию.',
    },
    {
        id: 'rule_of_three',
        name: 'Правило трёх',
        desc: 'Три пункта для запоминания',
        instruction:
            'Структурируйте аргумент как три пункта — тройные перечисления легче запоминаются и убеждают.',
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

export const RhetoricPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedDevice, setSelectedDevice] = useState(DEVICES[0]);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

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
                    <MessageSquare size={22} color="#8b5cf6" />
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
                            icon: <BookOpen size={20} />,
                            title: 'Библиотека приёмов',
                            desc: '10 встроенных риторических приёмов с описанием, инструкцией и подходящими ролями (pro/con/neutral).',
                        },
                        {
                            icon: <Zap size={20} />,
                            title: 'Выбор по контексту',
                            desc: 'Приём выбирается детерминированно: на основе round, роли агента и его предыдущих использованных приёмов.',
                        },
                        {
                            icon: <FileText size={20} />,
                            title: 'Инъекция в промпт',
                            desc: 'Инструкция выбранного приёма добавляется в системный промпт агента, меняя его стиль аргументации.',
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
                    <Repeat size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: риторические приёмы
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Приём:</span>
                    <select
                        value={selectedDevice.id}
                        onChange={(e) =>
                            setSelectedDevice(
                                DEVICES.find((d) => d.id === e.target.value) || DEVICES[0],
                            )
                        }
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
                        {DEVICES.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {DEVICES.slice(0, 5).map((d) => (
                        <div
                            key={d.id}
                            onClick={() => setSelectedDevice(d)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedDevice(d);
                                }
                            }}
                            style={{
                                padding: '6px 10px',
                                borderRadius: 8,
                                background:
                                    selectedDevice.id === d.id
                                        ? 'rgba(139,92,246,0.2)'
                                        : 'rgba(15,23,42,0.4)',
                                border:
                                    selectedDevice.id === d.id
                                        ? '1px solid rgba(139,92,246,0.4)'
                                        : '1px solid rgba(148,163,184,0.08)',
                                fontSize: 11,
                                color: selectedDevice.id === d.id ? '#c4b5fd' : '#94a3b8',
                                cursor: 'pointer',
                                fontWeight: selectedDevice.id === d.id ? 600 : 400,
                            }}
                        >
                            {d.name}
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        padding: 16,
                        borderRadius: 12,
                        background: 'rgba(139,92,246,0.08)',
                        border: '1px solid rgba(139,92,246,0.25)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#c4b5fd' }}>
                            {selectedDevice.name}
                        </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                        {selectedDevice.desc}
                    </div>
                    <div
                        style={{
                            padding: 10,
                            borderRadius: 8,
                            background: 'rgba(15,23,42,0.4)',
                            fontSize: 12,
                            color: '#cbd5e1',
                            fontStyle: 'italic',
                        }}
                    >
                        Инструкция: {selectedDevice.instruction}
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
                Rhetorical Device Selector — P2.6 протокол. Не требует LLM-вызовов. 10 приёмов,
                детерминированный выбор на основе round и роли.
            </div>
        </div>
    );
};

export default RhetoricPanel;
