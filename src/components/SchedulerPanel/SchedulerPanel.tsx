/**
 * Cognitive-aux / research panel (Experimental).
 * Scheduler surface — research-grade, not production surface (P1.21).
 */
import React, { useState, useCallback } from 'react';
import { Calendar, Info, Clock, Plus, RefreshCw, ListTodo } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';

const TECHNIQUE_ID = 'scheduler';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'Scheduler',
    nameRu: 'Планировщик',
    description:
        'Cron-based task scheduler — schedule agent debates, reports, and maintenance jobs',
    descriptionRu:
        'Планировщик задач на основе cron — запуск дебатов, отчётов и задач обслуживания по расписанию',
    category: 'P1',
    defaultEnabled: true,
};

const SCHEDULES = [
    {
        id: 's1',
        name: 'Ежедневный дайджест',
        agentId: 'agent-1',
        frequency: 'daily',
        cronExpression: '0 9 * * *',
        enabled: true,
        nextRun: '2026-07-27 09:00',
        taskParams: { type: 'report', topic: 'ИИ безопасность' },
    },
    {
        id: 's2',
        name: 'Еженедельные дебаты',
        agentId: 'agent-2',
        frequency: 'weekly',
        cronExpression: '0 10 * * 1',
        enabled: true,
        nextRun: '2026-07-28 10:00',
        taskParams: { type: 'debate', topic: 'Этика ИИ' },
    },
    {
        id: 's3',
        name: 'Мониторинг здоровья',
        agentId: '',
        frequency: 'hourly',
        cronExpression: '0 * * * *',
        enabled: false,
        nextRun: '2026-07-26 13:00',
        taskParams: { type: 'health_check' },
    },
    {
        id: 's4',
        name: 'Ночная оптимизация',
        agentId: 'agent-3',
        frequency: 'custom',
        cronExpression: '0 3 * * *',
        enabled: true,
        nextRun: '2026-07-27 03:00',
        taskParams: { type: 'maintenance' },
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

export const SchedulerPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;

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
                    <Calendar size={22} color="#3b82f6" />
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
                            icon: <Plus size={20} />,
                            title: 'Создание расписания',
                            desc: 'Задача создаётся с name, agentId, frequency (daily/weekly/hourly/custom) и cronExpression.',
                        },
                        {
                            icon: <RefreshCw size={20} />,
                            title: 'Cron-движок',
                            desc: 'Каждую минуту проверяются due schedules. При совпадении задача запускается через trigger().',
                        },
                        {
                            icon: <ListTodo size={20} />,
                            title: 'Управление',
                            desc: 'Расписания можно включать/отключать, редактировать, удалять. История запусков отслеживается.',
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
                    <Clock size={18} color="#60a5fa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: расписания
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: 'rgba(34,197,94,0.15)',
                            color: '#22c55e',
                            fontWeight: 500,
                        }}
                    >
                        {SCHEDULES.filter((s) => s.enabled).length} активных
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SCHEDULES.map((s) => (
                        <div
                            key={s.id}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 10,
                                background: s.enabled ? 'rgba(15,23,42,0.4)' : 'rgba(15,23,42,0.2)',
                                border: `1px solid ${s.enabled ? 'rgba(59,130,246,0.2)' : 'rgba(148,163,184,0.08)'}`,
                                opacity: s.enabled ? 1 : 0.5,
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
                                <span style={{ fontWeight: 600, fontSize: 12, color: '#e2e8f0' }}>
                                    {s.name}
                                </span>
                                <span
                                    style={{
                                        fontSize: 10,
                                        padding: '1px 5px',
                                        borderRadius: 3,
                                        background: 'rgba(99,102,241,0.15)',
                                        color: '#818cf8',
                                        fontWeight: 500,
                                    }}
                                >
                                    {s.frequency}
                                </span>
                                <span style={{ fontSize: 10, color: '#64748b' }}>
                                    {s.cronExpression}
                                </span>
                                {!s.enabled && (
                                    <span
                                        style={{
                                            fontSize: 10,
                                            padding: '1px 5px',
                                            borderRadius: 3,
                                            background: 'rgba(239,68,68,0.15)',
                                            color: '#ef4444',
                                            fontWeight: 500,
                                            marginLeft: 'auto',
                                        }}
                                    >
                                        ОТКЛЮЧЕНО
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                Тип: {s.taskParams.type} | Агент: {s.agentId || 'система'} | След.
                                запуск: {s.nextRun}
                            </div>
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
                Scheduler — core сервис. Использует Dexie для персистенции расписаний. Cron-парсер
                поддерживает стандартные 5-польные выражения.
            </div>
        </div>
    );
};

export default SchedulerPanel;
