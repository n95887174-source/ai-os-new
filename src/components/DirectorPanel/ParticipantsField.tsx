import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { agentService } from '../../kernel/instances/services-core';

export interface ParticipantInput {
    id: string;
    role: string;
}

const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: 'inherit',
    padding: '0.35rem 0.5rem',
    fontSize: '0.8rem',
};

const btnStyle = (color: string): React.CSSProperties => ({
    background: 'none',
    border: `1px solid ${color}`,
    color,
    cursor: 'pointer',
    padding: '0.25rem 0.55rem',
    borderRadius: 4,
    fontSize: '0.72rem',
});

const ParticipantsField: React.FC<{
    value: ParticipantInput[];
    onChange: (next: ParticipantInput[]) => void;
}> = ({ value, onChange }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState('');

    const agents = agentService.getAgents();
    const available = agents.filter((a) => !value.some((p) => p.id === a.id));

    const update = (cb: (p: ParticipantInput, i: number) => ParticipantInput) =>
        onChange(value.map((p, i) => cb(p, i)));
    const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
    const addSelected = () => {
        const agent = agents.find((a) => a.id === selected);
        if (!agent) return;
        onChange([...value, { id: agent.id, role: agent.role }]);
        setSelected('');
    };

    return (
        <div>
            <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>
                {t('director.configure.participants')}
            </div>
            {value.map((p, idx) => (
                <div
                    key={idx}
                    style={{
                        display: 'flex',
                        gap: '0.4rem',
                        marginBottom: '0.4rem',
                        alignItems: 'center',
                    }}
                >
                    <input
                        aria-label={t('director.configure.participant_id')}
                        value={p.id}
                        readOnly
                        style={{ ...inputStyle, width: 120 }}
                    />
                    <input
                        aria-label={t('director.configure.participant_role')}
                        value={p.role}
                        onChange={(e) =>
                            update((cur, i) => (i === idx ? { ...cur, role: e.target.value } : cur))
                        }
                        placeholder={t('director.configure.participant_role')}
                        style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                        onClick={() => remove(idx)}
                        aria-label={t('director.configure.remove')}
                        style={btnStyle('#ef4444')}
                    >
                        {t('director.configure.remove')}
                    </button>
                </div>
            ))}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                <select
                    aria-label={t('director.configure.select_agent')}
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    <option value="">{t('director.configure.select_agent')}</option>
                    {available.map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.name} — {a.role}
                        </option>
                    ))}
                </select>
                <button onClick={addSelected} disabled={!selected} style={btnStyle('#3b82f6')}>
                    {t('director.configure.add_participant')}
                </button>
            </div>
            {agents.length === 0 && (
                <p style={{ color: '#f59e0b', fontSize: '0.75rem', margin: '0.4rem 0 0' }}>
                    {t('director.configure.no_agents')}
                </p>
            )}
        </div>
    );
};

export default ParticipantsField;
