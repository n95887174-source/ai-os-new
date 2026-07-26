import React, { useState, useCallback } from 'react';
import {
    Scale,
    Info,
    Search,
    UserCheck,
    BookOpen,
    MessageSquare,
    FlaskConical,
} from 'lucide-react';
import { getAllSettings, setSetting } from '../../kernel/instances';
import type { QualityTechnique } from '../../kernel/contracts/debate-quality-settings';
import type { ExpertWitness } from '../../kernel/contracts/debate-expert-witness';

const TECHNIQUE_ID = 'expert-witness';

const TECHNIQUE: QualityTechnique = {
    id: TECHNIQUE_ID,
    name: 'ExpertWitness',
    nameRu: 'Эксперт-свидетель',
    description: 'Summon domain experts for authoritative testimony on specialized topics',
    descriptionRu:
        'Призывает экспертов в предметной области для дачи авторитетных показаний по специализированным вопросам',
    category: 'P1',
    defaultEnabled: true,
};

const EXPERTS: ExpertWitness[] = [
    {
        id: 'econ',
        domain: 'economics',
        title: 'Д-р Наталья Вольф, экономист',
        credential: 'Профессор экономики, 20 лет исследований в области технологических рынков',
        perspective: 'Рыночные механизмы могут решить проблему, но требуют регулирования',
    },
    {
        id: 'climate',
        domain: 'climate',
        title: 'Проф. Алексей Вернер, климатолог',
        credential: 'Ведущий автор IPCC, 30 лет исследований изменения климата',
        perspective: 'Необходимы срочные меры, основанные на научном консенсусе',
    },
    {
        id: 'ai',
        domain: 'artificial intelligence',
        title: 'Д-р Елена Соколова, ИИ-исследователь',
        credential: 'PhD в области ИИ, автор 50+ публикаций по безопасности ИИ',
        perspective: 'Прозрачность и контроль необходимы для безопасного развития ИИ',
    },
    {
        id: 'ethics',
        domain: 'ethics',
        title: 'Проф. Михаил Кант, этик',
        credential: 'Профессор этики, специалист по технологической этике',
        perspective: 'Этические принципы должны быть основой любого технологического решения',
    },
    {
        id: 'law',
        domain: 'law',
        title: 'Д-р Анна Петрова, юрист',
        credential: 'Доктор юридических наук, эксперт по цифровому праву',
        perspective:
            'Законодательство должно адаптироваться к новым технологиям, а не блокировать их',
    },
];

const TOPICS = ['artificial intelligence', 'climate change', 'economics', 'ethics', 'law'];

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

export const ExpertWitnessPanel: React.FC = () => {
    const [settings, setSettingsState] = useState(() => getAllSettings());
    const enabled = settings[TECHNIQUE_ID] ?? TECHNIQUE.defaultEnabled;
    const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
    const [summoned, setSummoned] = useState<Set<string>>(new Set());

    const handleToggle = useCallback(() => {
        const next = !enabled;
        setSetting(TECHNIQUE_ID, next);
        setSettingsState(getAllSettings());
    }, [enabled]);

    const foundExpert = EXPERTS.find((e) => e.domain === selectedTopic) || EXPERTS[2];

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
                            icon: <Search size={20} />,
                            title: 'Поиск эксперта',
                            desc: 'По теме или запросу находится подходящий эксперт из встроенной базы (10 доменов).',
                        },
                        {
                            icon: <UserCheck size={20} />,
                            title: 'Отслеживание вызовов',
                            desc: 'Каждый эксперт может быть призван только 1 раз за сессию — предотвращает повторные вызовы.',
                        },
                        {
                            icon: <MessageSquare size={20} />,
                            title: 'Генерация показаний',
                            desc: 'Экспертное заключение генерируется на основе credentials и perspective эксперта и внедряется в промпт.',
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
                    <FlaskConical size={18} color="#fbbf24" />
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>
                        Демо: поиск эксперта
                    </h3>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>Тема:</span>
                    <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
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
                        {TOPICS.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>

                <div
                    style={{
                        padding: 16,
                        borderRadius: 12,
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.25)',
                    }}
                >
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}
                    >
                        <BookOpen size={16} color="#fbbf24" />
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#fde68a' }}>
                            {foundExpert.title}
                        </span>
                        {summoned.has(foundExpert.id) && (
                            <span
                                style={{
                                    fontSize: 10,
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: 'rgba(16,185,129,0.2)',
                                    color: '#34d399',
                                    fontWeight: 600,
                                }}
                            >
                                ПРИЗВАН
                            </span>
                        )}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                        Credentials: {foundExpert.credential}
                    </div>
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 8 }}>
                        Перспектива: {foundExpert.perspective}
                    </div>
                    <div
                        style={{
                            padding: 10,
                            borderRadius: 8,
                            background: 'rgba(15,23,42,0.4)',
                            fontSize: 12,
                            color: '#94a3b8',
                            fontStyle: 'italic',
                            marginBottom: 12,
                        }}
                    >
                        Показание эксперта: «{foundExpert.perspective} На основе моего опыта, подход
                        к {selectedTopic} требует учёта множества факторов — как научных, так и
                        социальных.»
                    </div>
                    {!summoned.has(foundExpert.id) && (
                        <button
                            type="button"
                            onClick={() => setSummoned(new Set(summoned).add(foundExpert.id))}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                border: '1px solid rgba(245,158,11,0.3)',
                                background: 'rgba(245,158,11,0.1)',
                                color: '#fbbf24',
                                fontSize: 12,
                                cursor: 'pointer',
                            }}
                        >
                            Призвать эксперта
                        </button>
                    )}
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
                Expert Witness — P1.14 протокол. Не требует LLM-вызовов. База из 10 экспертов,
                подбор по ключевым словам темы.
            </div>
        </div>
    );
};

export default ExpertWitnessPanel;
