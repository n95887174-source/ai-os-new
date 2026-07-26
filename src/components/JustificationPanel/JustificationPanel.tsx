import React, { useState, useCallback } from 'react';
import { GitCommit, Info, Link, AlertTriangle, Layers, List } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type {
    JustificationChain,
    JustificationHop,
} from '../../kernel/contracts/debate-justification';

const TECHNIQUE_ID = 'multi-hop';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'JustificationEnforcer',
    nameRu: 'Контроль обоснований',
    description:
        'Validate arguments contain multi-hop reasoning (claim → warrant → evidence) — enforce justification chains',
    descriptionRu:
        'Проверяет, что аргументы содержат многошаговые цепочки обоснований (утверждение → обоснование → доказательство)',
    category: 'P1',
    defaultEnabled: true,
};

const HOP_LABELS: Record<JustificationHop, string> = {
    claim: 'Утверждение',
    warrant: 'Обоснование',
    evidence: 'Доказательство',
    backing: 'Бэккинг',
};

const simulateChain = (contentIdx: number): JustificationChain => {
    const chains: JustificationChain[] = [
        {
            agentId: 'agent-1',
            round: 2,
            hopCount: 3,
            isValid: true,
            missingTypes: [],
            hops: [
                {
                    type: 'claim',
                    text: 'ИИ должен быть открытым, потому что прозрачность обеспечивает безопасность',
                },
                {
                    type: 'warrant',
                    text: 'Прозрачный код может быть проверен независимыми экспертами на уязвимости',
                },
                {
                    type: 'evidence',
                    text: 'Linux имеет модель краудсорсинга безопасности, и критические уязвимости (CVE) исправляются в среднем за 4 дня',
                },
            ],
        },
        {
            agentId: 'agent-2',
            round: 2,
            hopCount: 1,
            isValid: false,
            missingTypes: ['warrant', 'evidence', 'backing'],
            hops: [
                {
                    type: 'claim',
                    text: 'Закрытые системы безопаснее, так как ограничивают доступ злоумышленников',
                },
            ],
        },
    ];
    return chains[contentIdx] || chains[0];
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

export const JustificationPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedChain, setSelectedChain] = useState(0);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const chain = simulateChain(selectedChain);

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
                    <GitCommit size={22} color="#10b981" />
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
                            icon: <Layers size={20} />,
                            title: '4 уровня обоснования',
                            desc: 'claim (утверждение) → warrant (обоснование) → evidence (доказательство) → backing (бэккинг).',
                        },
                        {
                            icon: <Link size={20} />,
                            title: 'Проверка цепочки',
                            desc: 'Аргумент анализируется на наличие каждого hop. Если hop отсутствует — добавляется в missingTypes.',
                        },
                        {
                            icon: <AlertTriangle size={20} />,
                            title: 'Принуждение',
                            desc:
                                'Если hopCount {' <
                                '} minHops (default 2), в промпт добавляется требование усилить обоснование.',
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
                    <List size={18} color="#34d399" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: цепочка обоснования
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Аргумент:</span>
                    <select
                        value={selectedChain}
                        onChange={(e) => setSelectedChain(Number(e.target.value))}
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
                        <option value={0}>Афина — полная цепочка</option>
                        <option value={1}>Гермес — неполная цепочка</option>
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: chain.isValid ? '#22c55e' : '#ef4444',
                        }}
                    >
                        {chain.isValid ? 'ЦЕПОЧКА ПОЛНА' : 'ЦЕПОЧКА НЕ ПОЛНА'}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Hops: {chain.hopCount}/3</span>
                    {chain.missingTypes.length > 0 && (
                        <span
                            style={{
                                fontSize: 10,
                                padding: '1px 5px',
                                borderRadius: 3,
                                background: 'rgba(239,68,68,0.15)',
                                color: '#ef4444',
                                fontWeight: 500,
                            }}
                        >
                            Отсутствует: {chain.missingTypes.map((t) => HOP_LABELS[t]).join(', ')}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {chain.hops.map((hop, i) => (
                        <div
                            key={i}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 8,
                                background: 'rgba(16,185,129,0.06)',
                                border: '1px solid rgba(16,185,129,0.2)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    marginBottom: 4,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 10,
                                        padding: '1px 5px',
                                        borderRadius: 3,
                                        background: 'rgba(16,185,129,0.15)',
                                        color: '#34d399',
                                        fontWeight: 600,
                                    }}
                                >
                                    {HOP_LABELS[hop.type]}
                                </span>
                                <span style={{ fontSize: 10, color: '#64748b' }}>#{i + 1}</span>
                            </div>
                            <div style={{ fontSize: 11, color: '#cbd5e1' }}>{hop.text}</div>
                        </div>
                    ))}
                </div>

                {!chain.isValid && (
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
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#f59e0b',
                                marginBottom: 4,
                            }}
                        >
                            Multi-Hop Prompt
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                            «Ваш аргумент требует усиления: добавьте обоснование (почему это так?) и
                            доказательство (какие данные это подтверждают?).»
                        </div>
                    </div>
                )}
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
                Multi-Hop Justification Enforcer — P1.23 протокол. Не требует LLM-вызовов. 4 уровня
                обоснования: claim → warrant → evidence → backing.
            </div>
        </div>
    );
};

export default JustificationPanel;
