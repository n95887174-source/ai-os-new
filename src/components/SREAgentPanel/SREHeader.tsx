import { Bot } from 'lucide-react';
import { t } from '../../i18n/translations';

interface Props {
    criticalCount: number;
    warningCount: number;
    autoFixEnabled: boolean;
    onAutoFixToggle: () => void;
}

const ToggleSwitch: React.FC<{ enabled: boolean; onToggle: () => void }> = ({
    enabled,
    onToggle,
}) => (
    <button
        onClick={onToggle}
        style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            border: 'none',
            background: enabled ? '#10b981' : '#52525b',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
        }}
        role="switch"
        aria-checked={enabled}
    >
        <div
            style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: 2,
                transition: 'left 0.2s',
                left: enabled ? 18 : 2,
            }}
        />
    </button>
);

const SREHeader: React.FC<Props> = ({
    criticalCount,
    warningCount,
    autoFixEnabled,
    onAutoFixToggle,
}) => (
    <div
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            flexWrap: 'wrap',
        }}
    >
        <div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.25rem',
                }}
            >
                <Bot size={28} color="#8b5cf6" />
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                    {t('sre.title')}
                </h1>
                <span
                    style={{
                        fontSize: '0.65rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 6,
                        background: 'rgba(139,92,246,0.15)',
                        color: '#a78bfa',
                        fontWeight: 700,
                        border: '1px solid rgba(139,92,246,0.2)',
                    }}
                >
                    v2.0
                </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>{t('sre.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                    padding: '0.4rem 0.8rem',
                    borderRadius: 10,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '0.75rem',
                }}
            >
                <span style={{ color: '#64748b' }}>{t('sre.auto_fix')}</span>
                <ToggleSwitch enabled={autoFixEnabled} onToggle={onAutoFixToggle} />
            </div>
            {(criticalCount > 0 || warningCount > 0) && (
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {criticalCount > 0 && (
                        <span
                            style={{
                                padding: '0.3rem 0.6rem',
                                borderRadius: 6,
                                background: 'rgba(239,68,68,0.1)',
                                color: '#ef4444',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                            }}
                        >
                            {criticalCount} {t('sre.badge.critical')}
                        </span>
                    )}
                    {warningCount > 0 && (
                        <span
                            style={{
                                padding: '0.3rem 0.6rem',
                                borderRadius: 6,
                                background: 'rgba(245,158,11,0.1)',
                                color: '#f59e0b',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                            }}
                        >
                            {warningCount} {t('sre.badge.warnings')}
                        </span>
                    )}
                </div>
            )}
        </div>
    </div>
);

export default SREHeader;
