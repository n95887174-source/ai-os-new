import React, { useState, useCallback } from 'react';
import { GitBranch, Info, Network, Brain, BarChart4, Sparkles } from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { GoTBranchType, GoTResult } from '../../kernel/contracts/debate-got';

const TECHNIQUE_ID = 'graph-of-thoughts';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'GoTDeliberation',
    nameRu: 'Graph-of-Thoughts',
    description:
        'Generate multiple reasoning branches internally, synthesize strongest into public argument',
    descriptionRu:
        'Генерирует несколько внутренних ветвей рассуждений (дедукция, индукция, аналогия и т.д.) и синтезирует сильнейшую в публичный аргумент',
    category: 'P1',
    defaultEnabled: true,
};

const BRANCH_LABELS: Record<GoTBranchType, string> = {
    deductive: 'Дедукция',
    inductive: 'Индукция',
    abductive: 'Абдукция',
    analogical: 'Аналогия',
    consequentialist: 'Консеквенциализм',
};

const BRANCH_DESCS: Record<GoTBranchType, string> = {
    deductive: 'От общего к частному — если A=B и B=C, то A=C',
    inductive: 'От частного к общему — на основе наблюдений',
    abductive: 'Поиск наилучшего объяснения для наблюдаемых фактов',
    analogical: 'Сравнение со структурно похожей ситуацией',
    consequentialist: 'Анализ последствий каждого варианта',
};

const simulateResult = (): GoTResult => ({
    branches: [
        {
            type: 'deductive',
            premise: 'Безопасность ИИ требует контроля доступа',
            reasoning:
                'Все системы с контролем доступа безопаснее открытых. Закрытый ИИ — система с контролем доступа.',
            conclusion: 'Закрытый ИИ безопаснее открытого.',
            confidence: 0.85,
            novelty: 0.3,
        },
        {
            type: 'inductive',
            premise: 'Исторические данные по уязвимостям',
            reasoning:
                'Heartbleed (OpenSSL), Log4j — критические уязвимости в открытом ПО. В проприетарном ПО аналогичных масштабных инцидентов меньше.',
            conclusion: 'Открытое ПО имеет больше критических уязвимостей.',
            confidence: 0.72,
            novelty: 0.5,
        },
        {
            type: 'abductive',
            premise: 'Почему компании выбирают закрытые модели?',
            reasoning:
                'Наилучшее объяснение: коммерческие риски открытости перевешивают выгоды. Компании защищают интеллектуальную собственность.',
            conclusion: 'Закрытость — рациональный выбор в текущих условиях.',
            confidence: 0.68,
            novelty: 0.7,
        },
        {
            type: 'analogical',
            premise: 'Linux vs Windows в 1990-х',
            reasoning:
                'Linux был открытым, Windows — закрытым. Linux победил на серверах, Windows — на десктопах. Оба подхода выжили в разных нишах.',
            conclusion: 'Открытость и закрытость сосуществуют в разных нишах.',
            confidence: 0.8,
            novelty: 0.6,
        },
        {
            type: 'consequentialist',
            premise: 'Прогноз последствий открытости',
            reasoning:
                'Открытый ИИ: быстрые инновации, но риск злоупотреблений. Закрытый ИИ: медленнее, но безопаснее. Net-эффект зависит от стадии развития технологии.',
            conclusion: 'На ранних стадиях — открытость, на зрелых — контролируемая открытость.',
            confidence: 0.75,
            novelty: 0.8,
        },
    ],
    selectedType: 'consequentialist',
    synthesis:
        'Наиболее сильный аргумент — консеквенциалистский: на разных стадиях развития ИИ оптимальный баланс открытости и закрытости меняется. Ранние стадии выигрывают от открытости (инновации), зрелые требуют контроля (безопасность).',
    diversityScore: 0.76,
});

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

export const GotDeliberationPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const result = simulateResult();
    const sortedBranches = [...result.branches].sort((a, b) => b.confidence - a.confidence);

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
                    <GitBranch size={22} color="#8b5cf6" />
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
                            icon: <Brain size={20} />,
                            title: '5 ветвей рассуждения',
                            desc: 'Агент генерирует 3-5 ветвей рассуждения: дедукция, индукция, абдукция, аналогия, консеквенциализм.',
                        },
                        {
                            icon: <Network size={20} />,
                            title: 'Оценка ветвей',
                            desc: 'Каждая ветвь получает confidence (0-1) и novelty (0-1). Лучшая выбирается для публичного аргумента.',
                        },
                        {
                            icon: <Sparkles size={20} />,
                            title: 'Синтез',
                            desc: 'Выбранная ветвь синтезируется в финальный аргумент. diversityScore показывает разнообразие всех ветвей.',
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
                    <BarChart4 size={18} color="#a78bfa" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: ветви рассуждений
                    </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {sortedBranches.map((b, i) => {
                        const isSelected = b.type === result.selectedType;
                        return (
                            <div
                                key={i}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 10,
                                    background: isSelected
                                        ? 'rgba(139,92,246,0.1)'
                                        : 'rgba(15,23,42,0.4)',
                                    border: isSelected
                                        ? '1px solid rgba(139,92,246,0.3)'
                                        : '1px solid rgba(148,163,184,0.08)',
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
                                        style={{
                                            fontWeight: 600,
                                            fontSize: 12,
                                            color: isSelected ? '#c4b5fd' : '#e2e8f0',
                                        }}
                                    >
                                        {BRANCH_LABELS[b.type]}
                                    </span>
                                    {isSelected && (
                                        <span
                                            style={{
                                                fontSize: 10,
                                                padding: '1px 6px',
                                                borderRadius: 4,
                                                background: 'rgba(139,92,246,0.2)',
                                                color: '#a78bfa',
                                                fontWeight: 600,
                                            }}
                                        >
                                            ВЫБРАНА
                                        </span>
                                    )}
                                    <span
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: 10,
                                            color: '#64748b',
                                        }}
                                    >
                                        conf: {b.confidence.toFixed(2)} novelty:{' '}
                                        {b.novelty.toFixed(2)}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: '#94a3b8',
                                        fontStyle: 'italic',
                                        marginBottom: 4,
                                    }}
                                >
                                    {BRANCH_DESCS[b.type]}
                                </div>
                                <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>
                                    Посылка: {b.premise}
                                </div>
                                <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>
                                    Рассуждение: {b.reasoning}
                                </div>
                                <div style={{ fontSize: 11, color: '#a78bfa' }}>
                                    Вывод: {b.conclusion}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div
                    style={{
                        padding: 14,
                        borderRadius: 10,
                        background: 'rgba(139,92,246,0.08)',
                        border: '1px solid rgba(139,92,246,0.25)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Sparkles size={14} color="#a78bfa" />
                        <span style={{ fontWeight: 600, fontSize: 12, color: '#c4b5fd' }}>
                            Синтез ({BRANCH_LABELS[result.selectedType]})
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>
                            diversity: {result.diversityScore.toFixed(2)}
                        </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1' }}>{result.synthesis}</div>
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
                Graph-of-Thoughts — P1.28 протокол. Требует LLM-вызов для генерации ветвей. 5 типов
                рассуждений, оценка по confidence/novelty.
            </div>
        </div>
    );
};

export default GotDeliberationPanel;
