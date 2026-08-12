import React from 'react';
import type { ScenarioStatus } from '../../kernel/contracts/conversation/scenario';
import { useTranslation } from '../../i18n/useTranslation';

const STATUS_COLORS: Record<ScenarioStatus, string> = {
    draft: '#94a3b8',
    active: '#10b981',
    archived: '#64748b',
};

const STATUS_KEYS: Record<ScenarioStatus, string> = {
    draft: 'director.scenario.status.draft',
    active: 'director.scenario.status.active',
    archived: 'director.scenario.status.archived',
};

const ScenarioStatusBadge: React.FC<{ status: ScenarioStatus }> = ({ status }) => {
    const { t } = useTranslation();
    return (
        <span
            style={{
                display: 'inline-block',
                padding: '0.1rem 0.45rem',
                borderRadius: 6,
                fontSize: '0.7rem',
                fontWeight: 600,
                color: STATUS_COLORS[status],
                border: `1px solid ${STATUS_COLORS[status]}`,
                opacity: status === 'archived' ? 0.7 : 1,
            }}
        >
            {t(STATUS_KEYS[status])}
        </span>
    );
};

export default ScenarioStatusBadge;
