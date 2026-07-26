import React, { useState, useCallback } from 'react';
import { Star, BarChart3, Globe } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';

const TECHNIQUE_ID = 'credibility-scoring';

const DOMAIN_TIERS: Array<{ pattern: RegExp; tier: number; label: string; baseScore: number }> = [
    { pattern: /\.(edu|gov|int)\b/i, tier: 1, label: 'Academic/Gov', baseScore: 0.9 },
    {
        pattern: /\b(reuters|bbc|nature|science)\b/i,
        tier: 2,
        label: 'Major News/Research',
        baseScore: 0.75,
    },
    { pattern: /\b(forbes|wired|theguardian)\b/i, tier: 3, label: 'Major Media', baseScore: 0.6 },
    {
        pattern: /\b(medium|substack|techcrunch)\b/i,
        tier: 4,
        label: 'Blog/Tech News',
        baseScore: 0.4,
    },
    {
        pattern: /\b(reddit|quora|wikipedia)\b/i,
        tier: 5,
        label: 'Social/Forum/Wiki',
        baseScore: 0.2,
    },
];

const TIER_COLORS: Record<number, string> = {
    1: '#22c55e',
    2: '#86efac',
    3: '#facc15',
    4: '#f97316',
    5: '#ef4444',
};

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

const SAMPLE_SOURCES = [
    'According to a 2024 study published in Nature (vol. 589, pp. 234-245)',
    'As reported by Reuters on March 15, 2025',
    'A blog post on Medium argues that...',
    'According to a Reddit thread in r/science...',
    'Research from nih.gov shows a 30% increase',
    'A Forbes article from 2019 claimed...',
];

export const CredibilityPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? true;
    const [customSource, setCustomSource] = useState('');
    const [result, setResult] = useState<{ tier: number; label: string; score: number } | null>(
        null,
    );

    const handleToggle = useCallback(() => {
        setSetting(TECHNIQUE_ID, !enabled);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const scoreSource = (source: string) => {
        const s = source.slice(0, 200).toLowerCase();
        let tier = 5,
            label = 'Unknown/Unverified',
            baseScore = 0.2;
        for (const d of DOMAIN_TIERS) {
            if (d.pattern.test(s)) {
                tier = d.tier;
                label = d.label;
                baseScore = d.baseScore;
                break;
            }
        }
        let score = baseScore;
        const yearMatch = s.match(/\b(19\d{2}|20[012]\d|202[0-6])\b/);
        if (yearMatch) {
            const year = parseInt(yearMatch[1], 10);
            const age = 2026 - year;
            if (age <= 2) score += 0.1;
            else if (age <= 5) score += 0.05;
            else if (age > 15) score -= 0.1;
        }
        if (/\bvol\.?\s*\d+|\(\d{4}\)\s*,\s*\d+\s*[–-]\s*\d+|pp?\.\s*\d+/i.test(source))
            score += 0.1;
        return { tier, label, score: Math.max(0, Math.min(1, score)) };
    };

    const handleAnalyze = useCallback(() => {
        if (customSource.trim()) setResult(scoreSource(customSource.trim()));
    }, [customSource]);

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
                    <Star size={22} color="#f59e0b" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        Оценка достоверности
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
                    Оценивай надёжность источников каждого участника. Доменные уровни от Tier 1
                    (академия/правительство) до Tier 5 (соцсети/форумы). Бонус за свежесть и
                    академический формат.
                </p>
            </div>

            {/* Domain tiers */}
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
                    <Globe size={18} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Уровни доменов
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((tier) => {
                        const info = DOMAIN_TIERS.find((d) => d.tier === tier)!;
                        return (
                            <div
                                key={tier}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 10,
                                    background: 'rgba(15,23,42,0.4)',
                                    border: `1px solid ${TIER_COLORS[tier]}20`,
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
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: TIER_COLORS[tier],
                                        }}
                                    >
                                        Tier {tier}
                                    </span>
                                    <span
                                        style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}
                                    >
                                        {info.label}
                                    </span>
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: TIER_COLORS[tier],
                                        }}
                                    >
                                        {(info.baseScore * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div
                                    style={{
                                        height: 4,
                                        borderRadius: 2,
                                        background: 'rgba(255,255,255,0.06)',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${info.baseScore * 100}%`,
                                            height: '100%',
                                            borderRadius: 2,
                                            background: TIER_COLORS[tier],
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Interactive demo */}
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
                    <BarChart3 size={18} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Проверка источников
                    </h3>
                </div>

                {/* Sample sources */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {SAMPLE_SOURCES.map((src, i) => {
                        const r = scoreSource(src);
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    background: 'rgba(15,23,42,0.4)',
                                    border: '1px solid rgba(148,163,184,0.08)',
                                    fontSize: 12,
                                    color: '#cbd5e1',
                                    cursor: 'pointer',
                                }}
                                onClick={() => {
                                    setCustomSource(src);
                                    setResult(scoreSource(src));
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: 2,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 10,
                                            color: TIER_COLORS[r.tier],
                                            fontWeight: 600,
                                        }}
                                    >
                                        Tier {r.tier}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#64748b' }}>
                                        {r.label}
                                    </span>
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color:
                                                r.score > 0.7
                                                    ? '#22c55e'
                                                    : r.score > 0.4
                                                      ? '#facc15'
                                                      : '#ef4444',
                                        }}
                                    >
                                        {r.score.toFixed(2)}
                                    </span>
                                </div>
                                {src}
                            </div>
                        );
                    })}
                </div>

                {/* Custom input */}
                <div
                    style={{
                        padding: 12,
                        borderRadius: 10,
                        background: 'rgba(15,23,42,0.4)',
                        border: '1px solid rgba(148,163,184,0.08)',
                    }}
                >
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            value={customSource}
                            onChange={(e) => setCustomSource(e.target.value)}
                            placeholder="Введите источник для проверки..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAnalyze();
                            }}
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: 8,
                                fontSize: 12,
                                background: 'rgba(15,23,42,0.6)',
                                color: '#e2e8f0',
                                border: '1px solid rgba(148,163,184,0.2)',
                                outline: 'none',
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleAnalyze}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 8,
                                border: 'none',
                                background: 'rgba(245,158,11,0.2)',
                                color: '#fbbf24',
                                fontSize: 12,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Оценить
                        </button>
                    </div>

                    {result && (
                        <div
                            style={{
                                marginTop: 12,
                                padding: 12,
                                borderRadius: 8,
                                background: `rgba(15,23,42,0.5)`,
                                border: `1px solid ${TIER_COLORS[result.tier]}20`,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div
                                        style={{
                                            fontSize: 24,
                                            fontWeight: 700,
                                            color: TIER_COLORS[result.tier],
                                        }}
                                    >
                                        Tier {result.tier}
                                    </div>
                                    <div style={{ fontSize: 10, color: '#64748b' }}>
                                        {result.label}
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            height: 8,
                                            borderRadius: 4,
                                            background: 'rgba(255,255,255,0.06)',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: `${result.score * 100}%`,
                                                height: '100%',
                                                borderRadius: 4,
                                                background:
                                                    result.score > 0.7
                                                        ? '#22c55e'
                                                        : result.score > 0.4
                                                          ? '#facc15'
                                                          : '#ef4444',
                                                transition: 'width 0.3s',
                                            }}
                                        />
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: 18,
                                        fontWeight: 700,
                                        color:
                                            result.score > 0.7
                                                ? '#22c55e'
                                                : result.score > 0.4
                                                  ? '#facc15'
                                                  : '#ef4444',
                                    }}
                                >
                                    {result.score.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Info footer */}
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
                Оценка достоверности — P0.12 протокол. Чисто эвристический, без LLM. Проверяет
                домен, свежесть (year), и формат цитирования (vol./pp.).
            </div>
        </div>
    );
};

export default CredibilityPanel;
