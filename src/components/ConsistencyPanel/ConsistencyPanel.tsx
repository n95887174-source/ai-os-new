import React, { useState, useCallback } from 'react';
import { CheckSquare, BarChart3, AlertTriangle } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';

const TECHNIQUE_ID = 'consistency-check';

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

const CONTRADICTION_MARKERS = [
    /\b(on the other hand|conversely|in contrast)\b/i,
    /\b(however|nevertheless|that said)\b/i,
    /\b(с другой стороны|однако|тем не менее|напротив)\b/i,
];

const computeSimilarity = (a: string, b: string): number => {
    const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
    const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
    const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
    const union = new Set([...wordsA, ...wordsB]);
    return union.size > 0 ? intersection.size / union.size : 0;
};

const SAMPLE_HISTORY = [
    {
        id: 'p1',
        agentId: 'agent-1',
        content:
            'I believe that AI regulation is essential for safety. Government oversight is the only way to ensure responsible development.',
        round: 1,
    },
    {
        id: 'p2',
        agentId: 'agent-1',
        content:
            'On the other hand, excessive regulation could stifle innovation. The market should self-regulate.',
        round: 3,
    },
];

const SAMPLE_CURRENT =
    'However, I still maintain that government oversight is necessary — but maybe with a lighter touch.';

export const ConsistencyPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? true;
    const handleToggle = useCallback(() => {
        setSetting(TECHNIQUE_ID, !enabled);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const similarities = SAMPLE_HISTORY.map((h) => ({
        ...h,
        similarity: computeSimilarity(h.content, SAMPLE_CURRENT),
        hasContradictionMarker: CONTRADICTION_MARKERS.some((p) => p.test(SAMPLE_CURRENT)),
        isDirectContradiction:
            computeSimilarity(h.content, SAMPLE_CURRENT) > 0.2 &&
            CONTRADICTION_MARKERS.some((p) => p.test(SAMPLE_CURRENT)),
    }));

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
                    <CheckSquare size={22} color="#a855f7" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        Проверка согласованности
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(239,68,68,0.15)',
                            color: '#ef4444',
                            fontWeight: 600,
                        }}
                    >
                        P0
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
                    Находи самопротиворечия между раундами. Использует Jaccard similarity + маркеры
                    противоречий. Оценивает consistencyRatio = 1 - (contradictions / totalChecks).
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
                    border: '1px solid rgba(168,85,247,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <BarChart3 size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: поиск противоречий
                    </h3>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                        Текущее утверждение (раунд 3):
                    </div>
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: 'rgba(168,85,247,0.08)',
                            border: '1px solid rgba(168,85,247,0.15)',
                            fontSize: 12,
                            color: '#cbd5e1',
                        }}
                    >
                        {SAMPLE_CURRENT}
                    </div>
                </div>

                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                    История агента:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {similarities.map((h) => (
                        <div
                            key={h.id}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 10,
                                background: h.isDirectContradiction
                                    ? 'rgba(239,68,68,0.08)'
                                    : 'rgba(15,23,42,0.4)',
                                border: h.isDirectContradiction
                                    ? '1px solid rgba(239,68,68,0.25)'
                                    : '1px solid rgba(148,163,184,0.08)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 4,
                                }}
                            >
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa' }}>
                                    Агент
                                </span>
                                <span style={{ fontSize: 10, color: '#64748b' }}>
                                    раунд {h.round}
                                </span>
                                {h.isDirectContradiction && (
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: 10,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            background: 'rgba(239,68,68,0.15)',
                                            color: '#ef4444',
                                            fontWeight: 600,
                                        }}
                                    >
                                        <AlertTriangle
                                            size={10}
                                            style={{ display: 'inline', marginRight: 2 }}
                                        />{' '}
                                        ПРОТИВОРЕЧИЕ
                                    </span>
                                )}
                                <span
                                    style={{
                                        marginLeft: h.isDirectContradiction ? undefined : 'auto',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: h.similarity > 0.3 ? '#facc15' : '#94a3b8',
                                    }}
                                >
                                    Jaccard: {h.similarity.toFixed(2)}
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1' }}>{h.content}</div>
                            <div style={{ marginTop: 4, fontSize: 10, color: '#64748b' }}>
                                Маркер противоречия: {h.hasContradictionMarker ? '✅' : '❌'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(168,85,247,0.06)',
                    border: '1px solid rgba(168,85,247,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Проверка согласованности — P0 протокол. Использует Jaccard similarity + маркеры
                идентичности и противоречий (EN + RU).
            </div>
        </div>
    );
};
export default ConsistencyPanel;
