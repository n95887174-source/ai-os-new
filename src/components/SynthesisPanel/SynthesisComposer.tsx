import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { lensEngine } from '../../kernel/instances';
import type { Lens } from '../../kernel/types/lens-types';
import type { SynthesisDepth, SynthesisInput } from '../../kernel/types/synthesis-types';

interface SynthesisComposerProps {
    synthesizing: boolean;
    onSynthesize: (input: SynthesisInput) => void;
}

const DEPTHS: SynthesisDepth[] = ['quick', 'standard', 'deep'];

const ROLE_SUGGESTIONS: Array<{ id: string; name: string }> = [
    { id: 'arch', name: 'Архитектор' },
    { id: 'llm', name: 'LLM-инженер' },
    { id: 'economist', name: 'Экономист' },
    { id: 'security', name: 'Аналитик безопасности' },
    { id: 'governance', name: 'Специалист по управлению' },
    { id: 'philosopher', name: 'Философ' },
    { id: 'engineer', name: 'Инженер' },
    { id: 'product', name: 'Продакт-менеджер' },
];

/**
 * SynthesisComposer — input form: question, roles, lenses, depth, preserveDissent.
 */
const SynthesisComposer: React.FC<SynthesisComposerProps> = ({ synthesizing, onSynthesize }) => {
    const { t } = useTranslation();
    const [question, setQuestion] = useState('');
    const [roleIds, setRoleIds] = useState<string[]>(['arch', 'llm']);
    const [lensOptions, setLensOptions] = useState<Lens[]>([]);
    const [lensIds, setLensIds] = useState<string[]>([]);
    const [depth, setDepth] = useState<SynthesisDepth>('standard');
    const [preserveDissent, setPreserveDissent] = useState(true);
    const [roleInput, setRoleInput] = useState('');

    React.useEffect(() => {
        const all = lensEngine.listLenses();
        setLensOptions(all.filter((l) => l.id.startsWith('lens:meta') || l.id === 'lens:critical'));
    }, []);

    const toggleRole = (id: string): void => {
        setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
    };
    const addRoleInput = (): void => {
        const id = roleInput.trim();
        if (id && !roleIds.includes(id)) setRoleIds((prev) => [...prev, id]);
        setRoleInput('');
    };
    const toggleLens = (id: string): void => {
        setLensIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]));
    };

    const submit = (): void => {
        if (!question.trim() || roleIds.length === 0 || lensIds.length === 0) return;
        onSynthesize({
            question: question.trim(),
            roleIds,
            lensIds,
            depth,
            preserveDissent,
        });
    };

    return (
        <div
            style={{
                border: '1px solid rgba(255,255,255,0.08)',
                background: '#0b1220',
                borderRadius: 10,
                padding: '0.85rem 1rem',
                marginBottom: 12,
            }}
        >
            <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('synthesis.question_placeholder')}
                rows={2}
                style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    fontSize: '0.8rem',
                    padding: '0.55rem 0.7rem',
                    resize: 'none',
                }}
            />

            <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>
                    {t('synthesis.roles')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                    {ROLE_SUGGESTIONS.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => toggleRole(r.id)}
                            style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: 6,
                                border: roleIds.includes(r.id)
                                    ? '1px solid #8b5cf6'
                                    : '1px solid rgba(255,255,255,0.12)',
                                background: roleIds.includes(r.id) ? '#8b5cf622' : 'transparent',
                                color: roleIds.includes(r.id) ? '#c4b5fd' : '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                            }}
                        >
                            {r.name}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                    <input
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addRoleInput();
                            }
                        }}
                        placeholder="custom role id…"
                        style={{
                            flex: 1,
                            background: '#0f172a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            color: '#e2e8f0',
                            fontSize: '0.7rem',
                            padding: '0.3rem 0.6rem',
                        }}
                    />
                    <button
                        onClick={addRoleInput}
                        style={{
                            padding: '0.3rem 0.7rem',
                            borderRadius: 6,
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'transparent',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: 4 }}>
                    {t('synthesis.lenses')}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {lensOptions.map((l) => (
                        <button
                            key={l.id}
                            onClick={() => toggleLens(l.id)}
                            style={{
                                padding: '0.25rem 0.6rem',
                                borderRadius: 6,
                                border: lensIds.includes(l.id)
                                    ? '1px solid #f59e0b'
                                    : '1px solid rgba(255,255,255,0.12)',
                                background: lensIds.includes(l.id) ? '#f59e0b22' : 'transparent',
                                color: lensIds.includes(l.id) ? '#fcd34d' : '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '0.7rem',
                            }}
                        >
                            {l.name}
                        </button>
                    ))}
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    marginTop: 10,
                    flexWrap: 'wrap',
                }}
            >
                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                    }}
                >
                    {t('synthesis.depth')}
                    <select
                        value={depth}
                        onChange={(e) => setDepth(e.target.value as SynthesisDepth)}
                        style={{
                            background: '#0f172a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            color: '#e2e8f0',
                            fontSize: '0.7rem',
                            padding: '0.25rem 0.5rem',
                        }}
                    >
                        {DEPTHS.map((d) => (
                            <option key={d} value={d}>
                                {t(`synthesis.depth_${d}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <label
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                    }}
                >
                    <input
                        type="checkbox"
                        checked={preserveDissent}
                        onChange={(e) => setPreserveDissent(e.target.checked)}
                    />
                    {t('synthesis.preserve_dissent')}
                </label>
                <button
                    onClick={submit}
                    disabled={
                        synthesizing ||
                        !question.trim() ||
                        roleIds.length === 0 ||
                        lensIds.length === 0
                    }
                    style={{
                        marginLeft: 'auto',
                        padding: '0.45rem 1rem',
                        borderRadius: 7,
                        border: 'none',
                        background: '#f59e0b',
                        color: '#0b1220',
                        cursor: synthesizing ? 'wait' : 'pointer',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        opacity: synthesizing ? 0.7 : 1,
                    }}
                >
                    {synthesizing ? t('synthesis.synthesizing') : t('synthesis.synthesize')}
                </button>
            </div>
        </div>
    );
};

export default SynthesisComposer;
