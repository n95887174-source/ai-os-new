import React, { useState, useCallback } from 'react';
import { Shield, Info, Search, Globe, AlertTriangle, CheckCircle } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';

const TECHNIQUE_ID = 'adversarial-source';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'AdversarialSource',
    nameRu: 'Анализ источников',
    description:
        'Verify factual claims against online sources — detect distortions and misrepresentations',
    descriptionRu:
        'Верифицирует фактические утверждения через онлайн-источники — обнаруживает искажения и неверные цитирования',
    category: 'P0',
    defaultEnabled: true,
};

const CLAIMS = [
    {
        text: 'Heartbleed был критической уязвимостью в OpenSSL, затронувшей миллионы серверов.',
        result: {
            claimContext: 'Heartbleed был критической уязвимостью в OpenSSL',
            sourceUrl: 'https://heartbleed.com/',
            sourceExcerpt:
                'Heartbleed — критическая уязвимость в OpenSSL 1.0.1, позволяющая читать защищённую память серверов.',
            matchScore: 0.95,
            isDistorted: false,
            warning: '',
        },
    },
    {
        text: 'Linux используется на 96% серверов в мире, что доказывает превосходство открытого ПО.',
        result: {
            claimContext: 'Linux используется на 96% серверов в мире',
            sourceUrl: 'https://w3techs.com/',
            sourceExcerpt: 'Linux используется на 96.3% веб-серверов (статистика W3Techs).',
            matchScore: 0.88,
            isDistorted: false,
            warning: '',
        },
    },
    {
        text: 'Закрытые системы никогда не имеют критических уязвимостей, в отличие от открытых.',
        result: {
            claimContext: 'Закрытые системы никогда не имеют критических уязвимостей',
            sourceUrl: 'https://cve.mitre.org/',
            sourceExcerpt:
                'Критические уязвимости обнаружены во всех категориях ПО, включая проприетарное.',
            matchScore: 0.72,
            isDistorted: true,
            warning:
                'Утверждение искажено: закрытые системы также имеют критические уязвимости (например, CVE-2021-44228 в Log4j не зависел от лицензии).',
        },
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

export const AdversarialSourcePanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedIdx, setSelectedIdx] = useState(0);

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const claim = CLAIMS[selectedIdx];
    const { result } = claim;

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
                    <Shield size={22} color="#06b6d4" />
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {TECHNIQUE.nameRu}
                    </h2>
                    <span
                        style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'rgba(6,182,212,0.15)',
                            color: '#06b6d4',
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
                    border: '1px solid rgba(6,182,212,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Info size={18} color="#22d3ee" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Как это работает
                    </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                        {
                            icon: <Search size={20} />,
                            title: 'Извлечение фактов',
                            desc: 'Из аргумента извлекаются фактические утверждения для верификации.',
                        },
                        {
                            icon: <Globe size={20} />,
                            title: 'Поиск по источникам',
                            desc: 'Каждое утверждение проверяется через поиск по доверенным источникам. Вычисляется matchScore.',
                        },
                        {
                            icon: <AlertTriangle size={20} />,
                            title: 'Детекция искажений',
                            desc: 'Если matchScore высок, но контекст искажён — isDistorted=true. Генерируется warning с объяснением.',
                        },
                    ].map((card, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 16,
                                borderRadius: 12,
                                background: 'rgba(15,23,42,0.5)',
                                border: '1px solid rgba(6,182,212,0.1)',
                            }}
                        >
                            <div style={{ color: '#22d3ee', marginBottom: 8 }}>{card.icon}</div>
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
                    border: '1px solid rgba(6,182,212,0.15)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Globe size={18} color="#22d3ee" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: верификация факта
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Утверждение:</span>
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
                        {CLAIMS.map((_, i) => (
                            <option key={i} value={i}>
                                #{i + 1}
                            </option>
                        ))}
                    </select>
                </div>

                <div
                    style={{
                        padding: 12,
                        borderRadius: 8,
                        background: 'rgba(59,130,246,0.06)',
                        border: '1px solid rgba(59,130,246,0.15)',
                        fontSize: 12,
                        color: '#cbd5e1',
                        marginBottom: 16,
                    }}
                >
                    {claim.text}
                </div>

                <div
                    style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'rgba(6,182,212,0.06)',
                        border: '1px solid rgba(6,182,212,0.2)',
                        marginBottom: 12,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Globe size={14} color="#22d3ee" />
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#22d3ee' }}>
                            Источник
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>
                            Match: {(result.matchScore * 100).toFixed(0)}%
                        </span>
                    </div>
                    <div
                        style={{
                            fontSize: 11,
                            color: '#94a3b8',
                            marginBottom: 4,
                            wordBreak: 'break-all',
                        }}
                    >
                        {result.sourceUrl}
                    </div>
                    <div style={{ fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' }}>
                        {result.sourceExcerpt}
                    </div>
                </div>

                {result.isDistorted && (
                    <div
                        style={{
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.2)',
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
                            <AlertTriangle size={14} color="#ef4444" />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>
                                Обнаружено искажение
                            </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#cbd5e1' }}>{result.warning}</div>
                    </div>
                )}

                {!result.isDistorted && (
                    <div
                        style={{
                            padding: 12,
                            borderRadius: 8,
                            background: 'rgba(34,197,94,0.06)',
                            border: '1px solid rgba(34,197,94,0.2)',
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
                            <CheckCircle size={14} color="#22c55e" />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>
                                Факт подтверждён
                            </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                            Утверждение соответствует источнику.
                        </div>
                    </div>
                )}
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
                Adversarial Source Verification — P0.3 протокол. Требует доступа к поисковому API.
                Проверяет утверждения по доверенным источникам, детектит искажения контекста.
            </div>
        </div>
    );
};

export default AdversarialSourcePanel;
