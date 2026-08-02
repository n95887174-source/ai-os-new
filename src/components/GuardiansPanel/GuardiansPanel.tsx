import React, { useState } from 'react';
import { Shield, Zap, Sparkles, DollarSign, Mountain, Ghost } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import type { GuardianAspect, IGuardian } from '../../kernel/contracts/guardian';
import { bridgeKeeperService } from '../../kernel/instances';
import { usePolling } from '../Common/usePolling';

const ASPECT_ICONS: Record<GuardianAspect, React.ReactNode> = {
    speed: <Zap size={20} />,
    security: <Shield size={20} />,
    power: <Mountain size={20} />,
    routing: <Ghost size={20} />,
    cost: <DollarSign size={20} />,
    local: <Shield size={20} />,
    creativity: <Sparkles size={20} />,
};

const ASPECT_COLORS: Record<GuardianAspect, string> = {
    speed: '#22c55e',
    security: '#3b82f6',
    power: '#ef4444',
    routing: '#a855f7',
    cost: '#f59e0b',
    local: '#92400e',
    creativity: '#ec4899',
};

const bridgeKeeper = bridgeKeeperService;

const GuardianCard: React.FC<{ guardian: IGuardian }> = ({ guardian }) => {
    const { t } = useTranslation();
    const status = guardian.getStatus();
    const accentColor = ASPECT_COLORS[guardian.aspect] || '#64748b';
    const aspectLabel = t(`guardians.aspect_${guardian.aspect}`);

    return (
        <div
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${status.active ? `${accentColor}33` : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 16,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'all 0.2s',
                opacity: status.active ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
                if (status.active) {
                    e.currentTarget.style.borderColor = `${accentColor}66`;
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = `${accentColor}33`;
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: `${accentColor}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: accentColor,
                        fontSize: '1.5rem',
                    }}
                >
                    {ASPECT_ICONS[guardian.aspect]}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1.05rem' }}>
                        {guardian.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: accentColor, fontWeight: 600 }}>
                        {aspectLabel}
                    </div>
                </div>
                <div
                    style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: status.active ? '#22c55e' : '#64748b',
                        boxShadow: status.active ? `0 0 8px ${accentColor}` : 'none',
                    }}
                />
            </div>

            <div
                style={{
                    fontSize: '0.82rem',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                    lineHeight: 1.4,
                }}
            >
                "
                {guardian.aspect === 'speed'
                    ? 'Мгновенно — это единственная скорость'
                    : guardian.aspect === 'security'
                      ? 'Доверяй, но проверяй'
                      : guardian.aspect === 'power'
                        ? 'Нет задач, которые нельзя решить'
                        : guardian.aspect === 'routing'
                          ? 'Все дороги ведут к ответу'
                          : guardian.aspect === 'cost'
                            ? 'Мудрость приходит с ценой'
                            : guardian.aspect === 'local'
                              ? 'Лучший сервер — твой'
                              : 'Вдохновение — точная наука'}
                "
            </div>

            {status.providerCount > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {t('guardians.providers')}:{' '}
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                        {status.providers.join(', ')}
                    </span>
                </div>
            )}

            {status.providerCount === 0 && (
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    No bound providers — watches all
                </div>
            )}

            <div
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '0.25rem',
                    flexWrap: 'wrap',
                }}
            >
                <span
                    style={{
                        padding: '2px 10px',
                        borderRadius: 20,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: status.active ? `${accentColor}22` : 'rgba(255,255,255,0.03)',
                        color: status.active ? accentColor : '#64748b',
                    }}
                >
                    {status.active ? t('guardians.active') : t('guardians.inactive')}
                </span>
            </div>
        </div>
    );
};

const GuardiansPanel: React.FC = () => {
    const { t } = useTranslation();
    const [guardians, setGuardians] = useState<IGuardian[]>(() => bridgeKeeper.getAllGuardians());

    const refreshGuardians = () => setGuardians(bridgeKeeper.getAllGuardians());
    usePolling(refreshGuardians, 15000);

    return (
        <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <div
                    style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: '#e2e8f0',
                        marginBottom: '0.25rem',
                    }}
                >
                    {t('guardians.title')}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    {t('guardians.subtitle')}
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '1rem',
                }}
            >
                {guardians.map((g) => (
                    <GuardianCard key={g.name} guardian={g} />
                ))}
            </div>
        </div>
    );
};

export default GuardiansPanel;
