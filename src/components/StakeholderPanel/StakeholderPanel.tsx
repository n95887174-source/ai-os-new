import React, { useState, useCallback } from 'react';
import { Users, Info, Search, Globe, Heart, TrendingUp } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { Stakeholder } from '../../kernel/contracts/debate-stakeholder';

const TECHNIQUE_ID = 'stakeholder';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'StakeholderMapper',
    nameRu: 'Карта стейкхолдеров',
    description:
        'Identify affected stakeholders from debate topic — force agents to address their perspectives',
    descriptionRu:
        'Определяет затронутых стейкхолдеров по теме дебатов и обязывает агентов учитывать их перспективы',
    category: 'P1',
    defaultEnabled: true,
};

const TOPICS: { topic: string; stakeholders: Stakeholder[] }[] = [
    {
        topic: 'Открытый vs закрытый ИИ',
        stakeholders: [
            {
                id: 's1',
                label: 'Пользователи',
                relevanceScore: 0.9,
                keyConcern: 'Безопасность и конфиденциальность их данных',
            },
            {
                id: 's2',
                label: 'Разработчики',
                relevanceScore: 0.85,
                keyConcern: 'Доступ к технологиям и монетизация',
            },
            {
                id: 's3',
                label: 'Госорганы',
                relevanceScore: 0.75,
                keyConcern: 'Контроль и регулирование',
            },
            {
                id: 's4',
                label: 'Бизнес',
                relevanceScore: 0.8,
                keyConcern: 'Конкурентоспособность и рыночная доля',
            },
            {
                id: 's5',
                label: 'Научное сообщество',
                relevanceScore: 0.7,
                keyConcern: 'Прозрачность и воспроизводимость',
            },
        ],
    },
    {
        topic: 'Энергетический переход',
        stakeholders: [
            {
                id: 's1',
                label: 'Работники угольной отрасли',
                relevanceScore: 0.9,
                keyConcern: 'Потеря рабочих мест',
            },
            {
                id: 's2',
                label: 'Потребители энергии',
                relevanceScore: 0.85,
                keyConcern: 'Стоимость энергии',
            },
            {
                id: 's3',
                label: 'Экологические организации',
                relevanceScore: 0.8,
                keyConcern: 'Снижение выбросов',
            },
            {
                id: 's4',
                label: 'Энергетические компании',
                relevanceScore: 0.75,
                keyConcern: 'Инвестиции в новые технологии',
            },
        ],
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

export const StakeholderPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedIdx, setSelectedIdx] = useState(0);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const current = TOPICS[selectedIdx];

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
                    <Users size={22} color="#3b82f6" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(59,130,246,0.15)',
                            color: '#3b82f6',
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
                    border: '1px solid rgba(59,130,246,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#60a5fa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Search size={20} />,
                            title: 'Анализ темы',
                            desc: 'По теме дебатов определяются релевантные стейкхолдеры через сопоставление ключевых слов с 10 шаблонами.',
                        },
                        {
                            icon: <Heart size={20} />,
                            title: 'Ключевые интересы',
                            desc: 'Для каждого стейкхолдера определяется keyConcern — что именно его волнует в данном вопросе.',
                        },
                        {
                            icon: <Globe size={20} />,
                            title: 'Интеграция в промпт',
                            desc: 'Стейкхолдеры с их интересами форматируются и добавляются в промпт — агенты обязаны учитывать их перспективы.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(59,130,246,0.1)',
                            }}
                        >
                            <div style={{ color: '#60a5fa', marginBottom: 8 }}>{card.icon}</div>
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
                    border: '1px solid rgba(59,130,246,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <TrendingUp size={18} color="#60a5fa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: стейкхолдеры темы
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Тема:</span>
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
                        {TOPICS.map((t, i) => (
                            <option key={i} value={i}>
                                {t.topic}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    Затронутые стейкхолдеры:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {current.stakeholders.map((s, i) => (
                        <div
                            key={i}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 10,
                                background: 'rgba(59,130,246,0.06)',
                                border: '1px solid rgba(59,130,246,0.2)',
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
                                <span style={{ fontWeight: 600, fontSize: 12, color: '#60a5fa' }}>
                                    {s.label}
                                </span>
                                <span
                                    style={{
                                        marginLeft: 'auto',
                                        fontSize: 11,
                                        color: s.relevanceScore > 0.8 ? '#22c55e' : '#facc15',
                                        fontWeight: 500,
                                    }}
                                >
                                    релевантность: {s.relevanceScore.toFixed(2)}
                                </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.keyConcern}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(59,130,246,0.06)',
                    border: '1px solid rgba(59,130,246,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Stakeholder Mapper — P1.24 протокол. Не требует LLM-вызовов. 10 шаблонов
                стейкхолдеров, сопоставление по ключевым словам темы.
            </div>
        </div>
    );
};

export default StakeholderPanel;
