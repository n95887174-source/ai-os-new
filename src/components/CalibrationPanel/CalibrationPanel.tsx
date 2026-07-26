import React, { useState, useCallback } from 'react';
import { SlidersHorizontal, Info, BarChart3, Check, X } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';

const TECHNIQUE_ID = 'epistemic-calibration';

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

const scoreSingleClaim = (text: string) => {
    const hasCitation = /\b(according to|\d{4}|et al\.|\[\d+\]|doi)\b/i.test(text);
    const hasData = /\d+%|\d+\s+(million|billion|times|percent)|p\s*[<>=]/i.test(text);
    const hasAbsolute = /\b(always|never|undoubtedly|certainly|everyone|no one)\b/i.test(text);
    const hasHedge = /\b(i think|maybe|perhaps|seems|possibly|might be)\b/i.test(text);
    let score = 0.35;
    if (hasCitation) score += 0.25;
    if (hasData) score += 0.15;
    if (hasAbsolute) score -= 0.2;
    if (hasHedge) score -= 0.1;
    return { score: Math.max(0, Math.min(1, score)), hasCitation, hasData, hasAbsolute, hasHedge };
};

const SAMPLE_CLAIMS = [
    'According to a 2024 study in Nature, 97% of climate scientists agree on anthropogenic warming.',
    'Everyone knows that this is undoubtedly the best solution — it always works perfectly.',
    'I think the data might suggest a correlation, but there could be other factors at play.',
    'Analysis of 1,200 patients (p < 0.01) shows a 45% reduction in symptoms.',
    'This approach never fails and always produces optimal results in every case.',
];

export const CalibrationPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? true;
    const handleToggle = useCallback(() => {
        setSetting(TECHNIQUE_ID, !enabled);
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
                    <SlidersHorizontal size={22} color="#06b6d4" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        Эпистемическая калибровка
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
                    Штрафуй за излишнюю или недостаточную уверенность. Эвристическая оценка:
                    citation +0.25, data +0.15, absolute language -0.20, hedging -0.10. Базовый
                    score: 0.35.
                </p>
            </div>

            {/* Scoring demo */}
            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(6,182,212,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <BarChart3 size={18} color="#22d3ee" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: оценка утверждений
                    </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SAMPLE_CLAIMS.map((claim, i) => {
                        const r = scoreSingleClaim(claim);
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 10,
                                    background: 'rgba(15,23,42,0.4)',
                                    border: '1px solid rgba(148,163,184,0.08)',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 6,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color:
                                                r.score > 0.6
                                                    ? '#22c55e'
                                                    : r.score > 0.3
                                                      ? '#facc15'
                                                      : '#f97316',
                                        }}
                                    >
                                        {r.score.toFixed(2)}
                                    </span>
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: 10,
                                            display: 'flex',
                                            gap: 6,
                                            color: '#64748b',
                                        }}
                                    >
                                        {r.hasCitation ? (
                                            <Check size={12} color="#22c55e" />
                                        ) : (
                                            <X size={12} color="#6b7280" />
                                        )}{' '}
                                        citation
                                        {r.hasData ? (
                                            <Check size={12} color="#22c55e" />
                                        ) : (
                                            <X size={12} color="#6b7280" />
                                        )}{' '}
                                        data
                                        {r.hasAbsolute ? (
                                            <span style={{ color: '#ef4444' }}>absolute</span>
                                        ) : null}
                                        {r.hasHedge ? (
                                            <span style={{ color: '#f59e0b' }}>hedge</span>
                                        ) : null}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: '#cbd5e1' }}>{claim}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Violation rules */}
            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(6,182,212,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#22d3ee" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Правила
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                        {
                            title: 'Overconfident',
                            desc: '|statedConfidence - heuristic| > 0.3, при stated > heuristic',
                            color: '#ef4444',
                        },
                        {
                            title: 'Underconfident',
                            desc: '|statedConfidence - heuristic| > 0.3, при heuristic > stated',
                            color: '#f59e0b',
                        },
                        {
                            title: 'Наказание',
                            desc: 'При >= 2 overconfident нарушений — strong warning в промпт',
                            color: '#a78bfa',
                        },
                        {
                            title: 'Miscue reminder',
                            desc: '1 нарушение → mild reminder: "Be careful not to overstate"',
                            color: '#22d3ee',
                        },
                    ].map((rule, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 12,
                                borderRadius: 10,
                                background: 'rgba(15,23,42,0.4)',
                                border: `1px solid ${rule.color}15`,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: rule.color,
                                    marginBottom: 2,
                                }}
                            >
                                {rule.title}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{rule.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(6,182,212,0.06)',
                    border: '1px solid rgba(6,182,212,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Эпистемическая калибровка — P1.27 протокол. Чисто эвристический, без LLM.
                Активируется с round {'>'} 1.
            </div>
        </div>
    );
};
export default CalibrationPanel;
