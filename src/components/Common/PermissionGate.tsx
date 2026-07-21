import React from 'react';
import { useUiPreferences } from '../../stores/uiPreferencesStore';
import type { UserLevel } from '../../types/routing';
import { useTranslation } from '../../i18n/useTranslation';

const LEVEL_RANK: Record<UserLevel, number> = { L0: 0, L1: 1, L2: 2 };

interface PermissionGateProps {
    requiredLevel?: UserLevel;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const ForbiddenFallback: React.FC<{ requiredLevel: UserLevel }> = ({ requiredLevel }) => {
    const { t } = useTranslation();
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '40vh',
                gap: '1rem',
                padding: '2rem',
                color: '#64748b',
            }}
        >
            <div style={{ fontSize: '3rem', opacity: 0.2 }}>🔒</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#94a3b8' }}>
                {t('permission.forbidden')}
            </div>
            <div style={{ fontSize: '0.85rem', textAlign: 'center', maxWidth: 400 }}>
                {t('permission.required_level', { level: requiredLevel })}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>
                {t('permission.change_in_settings')}
            </div>
        </div>
    );
};

export const PermissionGate: React.FC<PermissionGateProps> = ({
    requiredLevel,
    children,
    fallback,
}) => {
    const { userLevel } = useUiPreferences();

    // Dev-mode bypass: the owner/dev always sees everything, no need to
    // fiddle with the level selector. The progressive-disclosure L0/L1/L2
    // system only matters in production demos, not day-to-day dev work.
    if (import.meta.env.DEV) return <>{children}</>;

    if (!requiredLevel) return <>{children}</>;

    const userRank = LEVEL_RANK[userLevel];
    const requiredRank = LEVEL_RANK[requiredLevel];

    if (userRank >= requiredRank) return <>{children}</>;

    return <>{fallback ?? <ForbiddenFallback requiredLevel={requiredLevel} />}</>;
};
