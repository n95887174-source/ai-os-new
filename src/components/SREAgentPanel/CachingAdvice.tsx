import React from 'react';
import { Layers } from 'lucide-react';
import { t } from '../../i18n/translations';
import { flexAlignCenterGap2Mb03 } from '../../styles/common';

interface Props {
    estimatedSavings?: string;
    details?: string;
}

const CachingAdvice: React.FC<Props> = ({ estimatedSavings, details }) => {
    if (!estimatedSavings && !details) return null;
    return (
        <div
            style={{
                padding: '1rem 1.25rem',
                borderRadius: 12,
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.2)',
            }}
        >
            <div style={flexAlignCenterGap2Mb03}>
                <Layers size={14} color="#10b981" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                    {t('sre.caching_title')}
                </span>
            </div>
            {estimatedSavings && (
                <div
                    style={{
                        fontSize: '0.8rem',
                        color: '#10b981',
                        fontWeight: 600,
                        marginBottom: '0.25rem',
                    }}
                >
                    {estimatedSavings}
                </div>
            )}
            {details && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{details}</div>}
        </div>
    );
};

export default CachingAdvice;
