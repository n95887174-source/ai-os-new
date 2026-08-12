import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';

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

    const update = (cb: (p: ParticipantInput, i: number) => ParticipantInput) =>
        onChange(value.map((p, i) => cb(p, i)));
    const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
    const add = () => onChange([...value, { id: `p${value.length + 1}`, role: '' }]);

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
                        onChange={(e) =>
                            update((cur, i) => (i === idx ? { ...cur, id: e.target.value } : cur))
                        }
                        placeholder={t('director.configure.participant_id')}
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
            <button onClick={add} style={btnStyle('#3b82f6')}>
                {t('director.configure.add_participant')}
            </button>
        </div>
    );
};

export default ParticipantsField;
