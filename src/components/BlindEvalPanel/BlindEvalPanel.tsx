import React, { useState, useCallback } from 'react';
import { Eye, Info, BarChart3, Shield, FileText, Hash } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';

const TECHNIQUE_ID = 'blind-evaluation';

const REBUTTAL_PATTERNS = [
    /\b(however|nevertheless|on the contrary|on the other hand|that said)\b/i,
    /\b(but|although|though)\b.*\b(argue|claim|point|argument|reason|evidence|wrong|incorrect|flaw|mistake|disagree|agree|oppose|rebut|refute|counter)\b/i,
    /\b(однако|тем не менее|напротив|с другой стороны)\b/i,
    /\b(но |хотя)\b.*\b(утвержд|аргумент|довод|доказательств|ошибк|неправ|неверн|опроверг|соглас|возража)\b/i,
];

const EVIDENCE_PATTERNS = [
    /\b(according to|study|research|data|evidence|statistics|survey|analysis)\b/i,
    /\b(согласно|исследовани|данные|доказательств|статистик|анализ)\b/i,
];

const countRebuttals = (text: string): number => {
    let c = 0;
    for (const p of REBUTTAL_PATTERNS) {
        const m = text.match(p);
        if (m) c += m.length;
    }
    return c;
};

const hasEvidence = (text: string): boolean => EVIDENCE_PATTERNS.some((p) => p.test(text));
const hasNumbers = (text: string): boolean => /\d+/.test(text);
const sentenceCount = (text: string): number => text.split(/[.!?]+/).filter(Boolean).length;

const scoreClaim = (
    text: string,
    confidence: number,
): {
    normalizedLen: number;
    evidenceScore: number;
    rebuttalScore: number;
    structureScore: number;
    numbersScore: number;
    confidenceScore: number;
    total: number;
} => {
    const normalizedLen = Math.min(0.3, text.length / 3000);
    const evidenceScore = hasEvidence(text) ? 0.2 : 0;
    const rebuttalScore = Math.min(0.25, countRebuttals(text) * 0.08);
    const structScore = Math.min(0.1, sentenceCount(text) / 25);
    const numScore = hasNumbers(text) ? 0.05 : 0;
    const confScore = confidence * 0.1;
    return {
        normalizedLen,
        evidenceScore,
        rebuttalScore,
        structureScore: structScore,
        numbersScore: numScore,
        confidenceScore: confScore,
        total: Math.min(
            1,
            normalizedLen + evidenceScore + rebuttalScore + structScore + numScore + confScore,
        ),
    };
};

const SAMPLE_CLAIMS = [
    {
        id: 'c1',
        text: 'Climate change is real and caused by human activity. According to NASA, 97% of climate scientists agree on this.',
        agentId: 'a1',
        confidence: 0.9,
    },
    {
        id: 'c2',
        text: 'However, the correlation between CO2 and temperature does not prove causation. There are other factors at play.',
        agentId: 'a2',
        confidence: 0.7,
    },
    {
        id: 'c3',
        text: 'The data shows a clear trend. Multiple studies confirm the warming pattern.',
        agentId: 'a1',
        confidence: 0.85,
    },
    {
        id: 'c4',
        text: 'I disagree with the methodology. The models have significant flaws in their assumptions.',
        agentId: 'a2',
        confidence: 0.6,
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

export const BlindEvalPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? true;
    const [selectedClaim, setSelectedClaim] = useState<string | null>(null);

    const handleToggle = useCallback(() => {
        setSetting(TECHNIQUE_ID, !enabled);
        setSettingsState(getAllSettings());
    }, [enabled]);

    return (
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
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
                    <Eye size={22} color="#6366f1" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        Слепая оценка
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
                        P2
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
                    Оценивай аргументы, не зная, какой агент их сделал. Устраняет эффект ореола —
                    предвзятость к сильным ораторам. Чисто эвристическая оценка, без LLM.
                </p>
            </div>

            {/* How it works */}
            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(99,102,241,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#818cf8" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <FileText size={20} />,
                            title: 'Длина текста',
                            desc: 'normalizedLen = min(0.3, length / 3000). Аргумент средней длины получает ~0.15.',
                        },
                        {
                            icon: <Shield size={20} />,
                            title: 'Маркеры опровержения',
                            desc: 'rebuttalScore = min(0.25, count × 0.08). "However", "but", "напротив" — до 0.25.',
                        },
                        {
                            icon: <Hash size={20} />,
                            title: 'Цифры + структура',
                            desc: 'hasNumbers: +0.05. sentenceCount / 25: до +0.10 за структурированность.',
                        },
                        {
                            icon: <BarChart3 size={20} />,
                            title: 'Композитный Overall',
                            desc: 'argumentQuality × 0.4 + rebuttalStrength × 0.2 + persuasiveness × 0.2 + factuality × 0.2',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 14,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(99,102,241,0.08)',
                            }}
                        >
                            <div style={{ color: '#818cf8', marginBottom: 6 }}>{card.icon}</div>
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#e2e8f0',
                                    marginBottom: 2,
                                }}
                            >
                                {card.title}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                                {card.desc}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Demo */}
            <div
                className="glass-panel"
                style={{
                    padding: '20px 24px',
                    borderRadius: 16,
                    marginBottom: 20,
                    background: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(99,102,241,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <BarChart3 size={18} color="#818cf8" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: слепая оценка утверждений
                    </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SAMPLE_CLAIMS.map((claim) => {
                        const s = scoreClaim(claim.text, claim.confidence);
                        const isSelected = selectedClaim === claim.id;
                        return (
                            <div
                                key={claim.id}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 10,
                                    background: isSelected
                                        ? 'rgba(99,102,241,0.1)'
                                        : 'rgba(15,23,42,0.4)',
                                    border: isSelected
                                        ? '1px solid rgba(99,102,241,0.3)'
                                        : '1px solid rgba(148,163,184,0.08)',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setSelectedClaim(isSelected ? null : claim.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter')
                                        setSelectedClaim(isSelected ? null : claim.id);
                                }}
                                tabIndex={0}
                                role="button"
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginBottom: 4,
                                    }}
                                >
                                    <span
                                        style={{ fontSize: 11, fontWeight: 600, color: '#818cf8' }}
                                    >
                                        Анонимный агент {claim.agentId}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#64748b' }}>
                                        confidence: {(claim.confidence * 100).toFixed(0)}%
                                    </span>
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontWeight: 600,
                                            fontSize: 13,
                                            color:
                                                s.total > 0.6
                                                    ? '#22c55e'
                                                    : s.total > 0.3
                                                      ? '#facc15'
                                                      : '#f97316',
                                        }}
                                    >
                                        {s.total.toFixed(3)}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: '#cbd5e1' }}>{claim.text}</div>

                                {isSelected && (
                                    <div
                                        style={{
                                            marginTop: 8,
                                            padding: 10,
                                            borderRadius: 8,
                                            background: 'rgba(15,23,42,0.5)',
                                            fontSize: 11,
                                            color: '#94a3b8',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '4px 16px',
                                            }}
                                        >
                                            <span>
                                                Длина ({claim.text.length}):{' '}
                                                {s.normalizedLen.toFixed(3)}
                                            </span>
                                            <span>
                                                Доказательства: {s.evidenceScore.toFixed(2)}
                                            </span>
                                            <span>
                                                Опровержения ({countRebuttals(claim.text)}):{' '}
                                                {s.rebuttalScore.toFixed(3)}
                                            </span>
                                            <span>
                                                Структура ({sentenceCount(claim.text)}):{' '}
                                                {s.structureScore.toFixed(3)}
                                            </span>
                                            <span>Цифры: {s.numbersScore.toFixed(2)}</span>
                                            <span>Уверенность: {s.confidenceScore.toFixed(3)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info footer */}
            <div
                style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'center',
                }}
            >
                Слепая оценка — P2 протокол. Не требует LLM-вызовов. Настройка применяется к новым
                дебатам.
            </div>
        </div>
    );
};

export default BlindEvalPanel;
