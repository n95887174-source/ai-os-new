import React, { useState, useCallback } from 'react';
import { Scale, Info, CheckCircle, ListTodo, UserCheck, TrendingUp } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { BurdenEntry } from '../../kernel/contracts/debate-bop';

const TECHNIQUE_ID = 'burden-of-proof';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'BurdenOfProof',
    nameRu: 'Бремя доказательства',
    description:
        'Track which claims have assigned burden of proof — penalize unmet burdens in verdict',
    descriptionRu:
        'Отслеживает, на каких утверждениях лежит бремя доказательства — наказывает невыполненные обязательства при вердикте',
    category: 'P0',
    defaultEnabled: true,
};

const AGENTS = [
    { id: 'agent-1', name: 'Афина' },
    { id: 'agent-2', name: 'Гермес' },
];

const SAMPLE_ENTRIES: BurdenEntry[] = [
    {
        claimId: 'c1',
        agentId: 'agent-1',
        agentName: 'Афина',
        claimText:
            'ИИ должен быть открытым, потому что прозрачность — единственный способ обеспечить безопасность',
        round: 1,
        status: 'met',
    },
    {
        claimId: 'c2',
        agentId: 'agent-2',
        agentName: 'Гермес',
        claimText: 'Закрытые системы безопаснее, так как ограничивают доступ злоумышленников',
        round: 1,
        status: 'met',
    },
    {
        claimId: 'c3',
        agentId: 'agent-1',
        agentName: 'Афина',
        claimText: 'Открытые стандарты (интернет, Linux) побеждают закрытые',
        round: 2,
        status: 'unmet',
    },
    {
        claimId: 'c4',
        agentId: 'agent-2',
        agentName: 'Гермес',
        claimText: 'Открытый код не гарантирует безопасности — Heartbleed был в открытом OpenSSL',
        round: 2,
        status: 'unmet',
    },
    {
        claimId: 'c5',
        agentId: 'agent-1',
        agentName: 'Афина',
        claimText: 'Регуляция должна быть, но не ценой полной секретности',
        round: 3,
        status: 'assigned',
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

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    assigned: { label: 'НАЗНАЧЕНО', color: '#f59e0b' },
    met: { label: 'ВЫПОЛНЕНО', color: '#22c55e' },
    unmet: { label: 'НЕ ВЫПОЛНЕНО', color: '#ef4444' },
};

export const BoPTrackerPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedAgent, setSelectedAgent] = useState('all');

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const filtered =
        selectedAgent === 'all'
            ? SAMPLE_ENTRIES
            : SAMPLE_ENTRIES.filter((e) => e.agentId === selectedAgent);
    const metCount = filtered.filter((e) => e.status === 'met').length;
    const totalBurden = filtered.filter((e) => e.status !== 'assigned').length;
    const ratio = totalBurden > 0 ? metCount / totalBurden : 0;

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
                    <Scale size={22} color="#f59e0b" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(245,158,11,0.15)',
                            color: '#f59e0b',
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
                    border: '1px solid rgba(245,158,11,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#fbbf24" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <ListTodo size={20} />,
                            title: 'Назначение бремени',
                            desc: 'Каждое новое утверждение автоматически получает burden of proof — автор обязан его доказать.',
                        },
                        {
                            icon: <CheckCircle size={20} />,
                            title: 'Отслеживание',
                            desc: 'Burden может быть met (доказано), unmet (не доказано) или assigned (ожидает). Unmet burden понижают score в вердикте.',
                        },
                        {
                            icon: <UserCheck size={20} />,
                            title: 'Per-agent статистика',
                            desc: 'Для каждого агента отслеживается metRatio — доля выполненных обязательств.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(245,158,11,0.1)',
                            }}
                        >
                            <div style={{ color: '#fbbf24', marginBottom: 8 }}>{card.icon}</div>
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
                    border: '1px solid rgba(245,158,11,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <TrendingUp size={18} color="#fbbf24" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: бремя доказательства
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
                        <option value="all">Все</option>
                        {AGENTS.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    <div
                        style={{
                            flex: 1,
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(34,197,94,0.06)',
                            border: '1px solid rgba(34,197,94,0.2)',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>
                            {metCount}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Выполнено</div>
                    </div>
                    <div
                        style={{
                            flex: 1,
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>
                            {totalBurden - metCount}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Не выполнено</div>
                    </div>
                    <div
                        style={{
                            flex: 1,
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(59,130,246,0.06)',
                            border: '1px solid rgba(59,130,246,0.2)',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>
                            {(ratio * 100).toFixed(0)}%
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Met Ratio</div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {filtered.map((e, i) => {
                        const st = STATUS_LABEL[e.status];
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    background: 'rgba(15,23,42,0.4)',
                                    border: `1px solid ${st.color}22`,
                                    fontSize: 12,
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
                                        style={{ fontWeight: 600, color: '#93c5fd', fontSize: 11 }}
                                    >
                                        {e.agentName}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#64748b' }}>
                                        раунд {e.round}
                                    </span>
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: 10,
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            background: `${st.color}22`,
                                            color: st.color,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {st.label}
                                    </span>
                                </div>
                                <div style={{ color: '#cbd5e1' }}>{e.claimText}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Burden of Proof Tracker — P0.10 протокол. Не требует LLM-вызовов. Consensus Engine
                использует metRatio для взвешивания аргументов в вердикте.
            </div>
        </div>
    );
};

export default BoPTrackerPanel;
