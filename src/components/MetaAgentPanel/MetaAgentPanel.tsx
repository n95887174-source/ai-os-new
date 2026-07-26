import React, { useState, useCallback } from 'react';
import {
    UserCog,
    Info,
    Swords,
    Puzzle,
    Lightbulb,
    Compass,
    Sparkles,
    Search,
    MessageSquare,
} from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { TacticalRole, TacticalDirective } from '../../kernel/contracts/debate-meta-agent';

const TECHNIQUE_ID = 'meta-agent';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'MetaAgent',
    nameRu: 'Мета-агент',
    description: 'Per-round tactical role assignment — heuristic posture switching for each agent',
    descriptionRu:
        'Назначение тактической роли агенту каждый раунд: адвокат дьявола, синтезатор, сборщик доказательств и т.д.',
    category: 'P0',
    defaultEnabled: true,
};

const ROLES: { value: TacticalRole; label: string; icon: React.ReactNode; desc: string }[] = [
    {
        value: 'standard',
        label: 'Стандарт',
        icon: <UserCog size={16} />,
        desc: 'Продолжать текущую линию аргументации',
    },
    {
        value: 'devils_advocate',
        label: 'Адвокат дьявола',
        icon: <Swords size={16} />,
        desc: 'Атаковать слабые места даже в сильных аргументах оппонента',
    },
    {
        value: 'synthesizer',
        label: 'Синтезатор',
        icon: <Puzzle size={16} />,
        desc: 'Искать общую почву и объединять позиции',
    },
    {
        value: 'evidence_harvester',
        label: 'Сборщик',
        icon: <Search size={16} />,
        desc: 'Запрашивать конкретные доказательства и примеры',
    },
    {
        value: 'rhetoric_optimizer',
        label: 'Ритор',
        icon: <MessageSquare size={16} />,
        desc: 'Усилить убедительность и риторический вес аргументов',
    },
];

const simulateDirective = (agentId: string, round: number): TacticalDirective => {
    const roles: TacticalRole[] = [
        'standard',
        'devils_advocate',
        'synthesizer',
        'evidence_harvester',
        'rhetoric_optimizer',
    ];
    const instructions: Record<TacticalRole, string> = {
        standard:
            'Продолжайте развивать свою основную линию аргументации, опираясь на предыдущие раунды.',
        devils_advocate:
            'Атакуйте самые сильные утверждения оппонента — найдите скрытые слабости и внутренние противоречия.',
        synthesizer:
            'Найдите точки соприкосновения и предложите синтез позиций, выходящий за рамки текущей дихотомии.',
        evidence_harvester:
            'Запросите конкретные данные, статистику или примеры у оппонента — проверьте эмпирическую базу его утверждений.',
        rhetoric_optimizer:
            'Усильте убедительность: используйте яркие аналогии, риторические вопросы и эмоционально окрашенные примеры.',
    };
    const emphases: Record<TacticalRole, string> = {
        standard: 'основная линия',
        devils_advocate: 'критический анализ',
        synthesizer: 'синтез и интеграция',
        evidence_harvester: 'факт-чекинг',
        rhetoric_optimizer: 'риторика',
    };
    const idx = (round + (agentId === 'agent-1' ? 0 : 2)) % roles.length;
    const role = roles[idx];
    return { agentId, role, instruction: instructions[role], emphasis: emphases[role] };
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

export const MetaAgentPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedAgent, setSelectedAgent] = useState('agent-1');
    const [selectedRound, setSelectedRound] = useState(3);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const directive = simulateDirective(selectedAgent, selectedRound);

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
                    <UserCog size={22} color="#8b5cf6" />
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
                            icon: <Compass size={20} />,
                            title: 'Анализ контекста',
                            desc: 'Оценивается состояние дебатов: сколько раундов прошло, баланс атак и защит, центральность узлов в графе аргументов.',
                        },
                        {
                            icon: <Lightbulb size={20} />,
                            title: 'Выбор роли',
                            desc: 'На основе анализа выбирается тактическая роль из 5 вариантов — от адвоката дьявола до ритора.',
                        },
                        {
                            icon: <Sparkles size={20} />,
                            title: 'Инструкция в промпт',
                            desc: 'В промпт агента добавляется инструкция с ролью и акцентом — агент меняет стиль аргументации.',
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
                    <Compass size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: назначение тактической роли
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Агент:</span>
                    <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
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
                        <option value="agent-1">Афина</option>
                        <option value="agent-2">Гермес</option>
                    </select>
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
                        {[2, 3, 4, 5].map((r) => (
                            <option key={r} value={r}>
                                Раунд {r}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {ROLES.map((r) => (
                        <div
                            key={r.value}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 10px',
                                borderRadius: 8,
                                background:
                                    directive.role === r.value
                                        ? 'rgba(139,92,246,0.2)'
                                        : 'rgba(15,23,42,0.4)',
                                border:
                                    directive.role === r.value
                                        ? '1px solid rgba(139,92,246,0.4)'
                                        : '1px solid rgba(148,163,184,0.08)',
                                fontSize: 11,
                                color: directive.role === r.value ? '#c4b5fd' : '#94a3b8',
                                fontWeight: directive.role === r.value ? 600 : 400,
                            }}
                        >
                            {r.icon}
                            {r.label}
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
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
                    >
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#c4b5fd' }}>
                            Директива для {selectedAgent === 'agent-1' ? 'Афины' : 'Гермеса'}
                        </span>
                        <span
                            style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: 'rgba(139,92,246,0.15)',
                                color: '#a78bfa',
                                fontWeight: 600,
                            }}
                        >
                            раунд {selectedRound}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Роль:</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                            {ROLES.find((r) => r.value === directive.role)?.label}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b', marginLeft: 16 }}>
                            Акцент:
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#a78bfa' }}>
                            {directive.emphasis}
                        </span>
                    </div>
                    <div
                        style={{
                            fontSize: 12,
                            color: '#cbd5e1',
                            lineHeight: 1.5,
                            fontStyle: 'italic',
                        }}
                    >
                        {directive.instruction}
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
                Meta-Agent — P0.8 протокол. Не требует LLM-вызовов, работает на эвристиках графа
                аргументов. Роль пересчитывается каждый раунд на основе текущего состояния дебатов.
            </div>
        </div>
    );
};

export default MetaAgentPanel;
