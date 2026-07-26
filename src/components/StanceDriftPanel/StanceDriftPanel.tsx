import React, { useState, useCallback } from 'react';
import { Activity, Info, BarChart3 } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';

const TECHNIQUE_ID = 'stance-drift';

const DIMENSIONS = [
    {
        id: 'prescription',
        label: 'Prescription',
        labelRu: 'Конкретность',
        high: 'конкретное решение',
        low: 'абстрактная проблема',
    },
    {
        id: 'certainty',
        label: 'Certainty',
        labelRu: 'Уверенность',
        high: 'абсолютная',
        low: 'осторожная',
    },
    { id: 'urgency', label: 'Urgency', labelRu: 'Срочность', high: 'срочно', low: 'взвешенно' },
    { id: 'scope', label: 'Scope', labelRu: 'Охват', high: 'системный', low: 'индивидуальный' },
    {
        id: 'activism',
        label: 'Activism',
        labelRu: 'Активность',
        high: 'призыв к действию',
        low: 'пассивный анализ',
    },
];

const HIGH_KEYWORDS: Record<string, string[]> = {
    prescription: [
        'must',
        'should',
        'need to',
        'require',
        'implement',
        'solution',
        'policy',
        'regulation',
        'ban',
        'mandate',
    ],
    certainty: [
        'certainly',
        'undoubtedly',
        'definitely',
        'absolutely',
        'without doubt',
        'clearly',
        'obviously',
        'always',
        'never',
    ],
    urgency: [
        'urgent',
        'immediately',
        'now',
        "before it's too late",
        'critical',
        'deadline',
        'race',
        'crisis',
        'emergency',
    ],
    scope: [
        'everyone',
        'all',
        'global',
        'universal',
        'systemic',
        'whole',
        'comprehensive',
        'widespread',
        'entire',
    ],
    activism: [
        'we must',
        'join',
        'act now',
        'demand',
        'call to action',
        'protest',
        'vote',
        'support',
        'oppose',
        ' boycott',
    ],
};

const LOW_KEYWORDS: Record<string, string[]> = {
    prescription: [
        'consider',
        'maybe',
        'perhaps',
        'option',
        'alternative',
        'discuss',
        'think about',
        'explore',
        'suggest',
    ],
    certainty: [
        'maybe',
        'perhaps',
        'might',
        'could',
        'possibly',
        'i think',
        'it seems',
        'appears',
        'uncertain',
    ],
    urgency: [
        'gradually',
        'eventually',
        'in time',
        'long-term',
        'sustainable',
        'patient',
        'measured',
        'careful',
    ],
    scope: [
        'some',
        'few',
        'individual',
        'specific',
        'local',
        'particular',
        'certain cases',
        'sometimes',
    ],
    activism: [
        'consider',
        'reflect',
        'analyze',
        'study',
        'research',
        'evaluate',
        'understand',
        'observe',
    ],
};

const extractStance = (text: string): number[] => {
    const lower = text.toLowerCase();
    return DIMENSIONS.map((d) => {
        const high = (HIGH_KEYWORDS[d.id] || []).reduce(
            (s, kw) => s + (lower.includes(kw) ? 1 : 0),
            0,
        );
        const low = (LOW_KEYWORDS[d.id] || []).reduce(
            (s, kw) => s + (lower.includes(kw) ? 1 : 0),
            0,
        );
        return high + low > 0 ? high / (high + low) : 0.5;
    });
};

const cosineSimilarity = (a: number[], b: number[]): number => {
    let dot = 0,
        magA = 0,
        magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const mag = Math.sqrt(magA) * Math.sqrt(magB);
    return mag > 0 ? dot / mag : 1;
};

const classifyDrift = (similarity: number): { type: string; color: string; label: string } => {
    if (similarity < 0.35)
        return { type: 'goalpost_shift', color: '#ef4444', label: 'Смена критериев' };
    if (similarity < 0.65)
        return { type: 'strategic_pivot', color: '#f59e0b', label: 'Стратегический разворот' };
    return { type: 'legitimate_evolution', color: '#22c55e', label: 'Легитимная эволюция' };
};

const SAMPLE_EVOLUTION = [
    {
        round: 1,
        text: 'We should consider carefully whether AI regulation is needed. There are many factors to evaluate.',
    },
    {
        round: 2,
        text: 'I think some light regulation might be appropriate in certain high-risk areas.',
    },
    {
        round: 3,
        text: 'We must implement comprehensive AI regulation immediately — this is an urgent crisis.',
    },
];

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
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

export const StanceDriftPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? true;
    const handleToggle = useCallback(() => {
        setSetting(TECHNIQUE_ID, !enabled);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const vectors = SAMPLE_EVOLUTION.map((s) => ({ ...s, vector: extractStance(s.text) }));
    const drifts: Array<{
        from: number;
        to: number;
        similarity: number;
        classification: ReturnType<typeof classifyDrift>;
    }> = [];
    for (let i = 1; i < vectors.length; i++) {
        const sim = cosineSimilarity(vectors[i - 1].vector, vectors[i].vector);
        drifts.push({
            from: vectors[i - 1].round,
            to: vectors[i].round,
            similarity: sim,
            classification: classifyDrift(sim),
        });
    }

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
                    <Activity size={22} color="#ef4444" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        Дрейф позиции
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
                        P1
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
                    Замечай тихую смену позиции между раундами. 5-мерный stance vector:
                    prescription, certainty, urgency, scope, activism. Cosine similarity {'<'} 0.35
                    = goalpost_shift (штраф {'*'}0.7), {'<'} 0.65 = strategic_pivot (штраф {'*'}
                    0.85).
                </p>
            </div>

            {/* Demo */}
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
                    <BarChart3 size={18} color="#f87171" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: эволюция позиции
                    </h3>
                </div>

                {vectors.map((v, i) => (
                    <div key={i} style={{ marginBottom: i < vectors.length - 1 ? 4 : 0 }}>
                        <div
                            style={{
                                padding: '10px 14px',
                                borderRadius: 8,
                                background: 'rgba(15,23,42,0.4)',
                                border: '1px solid rgba(148,163,184,0.08)',
                                fontSize: 12,
                                color: '#cbd5e1',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 2,
                                }}
                            >
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#f87171' }}>
                                    Раунд {v.round}
                                </span>
                            </div>
                            {v.text}
                            <div
                                style={{
                                    marginTop: 4,
                                    display: 'flex',
                                    gap: 8,
                                    fontSize: 10,
                                    color: '#64748b',
                                }}
                            >
                                {DIMENSIONS.map((d, di) => (
                                    <span
                                        key={d.id}
                                        style={{
                                            color:
                                                v.vector[di] > 0.6
                                                    ? '#22c55e'
                                                    : v.vector[di] < 0.4
                                                      ? '#f97316'
                                                      : '#94a3b8',
                                        }}
                                    >
                                        {d.labelRu}: {v.vector[di].toFixed(2)}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {i < drifts.length && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 14px',
                                    margin: '2px 0',
                                }}
                            >
                                <div
                                    style={{
                                        flex: 1,
                                        height: 1,
                                        background: 'rgba(148,163,184,0.15)',
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: 10,
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        background: `${drifts[i].classification.color}15`,
                                        color: drifts[i].classification.color,
                                    }}
                                >
                                    {drifts[i].classification.label} (sim:{' '}
                                    {drifts[i].similarity.toFixed(2)})
                                </span>
                                <div
                                    style={{
                                        flex: 1,
                                        height: 1,
                                        background: 'rgba(148,163,184,0.15)',
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Dimensions explanation */}
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
                        Измерения stance vector
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {DIMENSIONS.map((d) => (
                        <div
                            key={d.id}
                            style={{
                                padding: 10,
                                borderRadius: 8,
                                background: 'rgba(15,23,42,0.4)',
                                border: '1px solid rgba(148,163,184,0.08)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#e2e8f0',
                                    marginBottom: 2,
                                }}
                            >
                                {d.labelRu}
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>
                                Высокий: {d.high} · Низкий: {d.low}
                            </div>
                        </div>
                    ))}
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
                Stance Drift — P1.8 протокол. Чисто эвристический, без LLM. Штрафы: goalpost_shift
                ×0.7, strategic_pivot ×0.85.
            </div>
        </div>
    );
};
export default StanceDriftPanel;
