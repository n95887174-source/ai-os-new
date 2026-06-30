import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, RefreshCw, X } from 'lucide-react';
import { t } from '../../i18n/translations';
import { flexAlignCenterGap2Mb03 } from '../../styles/common';
import { IMPACT_COLORS } from './sre-constants';
import type { OptimizationSuggestion } from '../../kernel/instances';

interface Props {
    suggestion: OptimizationSuggestion;
    executingId: string | null;
    onExecute: (id: string) => void;
    onDismiss: (id: string) => void;
}

const SuggestionCard: React.FC<Props> = ({ suggestion: s, executingId, onExecute, onDismiss }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        style={{
            padding: '1rem 1.25rem',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.2)',
            border: `1px solid ${IMPACT_COLORS[s.impact]}20`,
            borderLeft: `4px solid ${IMPACT_COLORS[s.impact]}`,
        }}
    >
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
            }}
        >
            <div style={{ flex: 1 }}>
                <div style={flexAlignCenterGap2Mb03}>
                    <span
                        style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: 4,
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: `${IMPACT_COLORS[s.impact]}20`,
                            color: IMPACT_COLORS[s.impact],
                        }}
                    >
                        {s.impact} · {s.type}
                    </span>
                    {s.autoExecutable && (
                        <span
                            style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: 4,
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                background: 'rgba(16,185,129,0.15)',
                                color: '#10b981',
                            }}
                        >
                            {t('sre.auto_badge')}
                        </span>
                    )}
                </div>
                <div
                    style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#f8fafc',
                        marginBottom: '0.25rem',
                    }}
                >
                    {s.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    {s.description}
                </div>
                {s.estimatedSavings && (
                    <div
                        style={{
                            display: 'flex',
                            gap: '1rem',
                            marginTop: '0.5rem',
                            fontSize: '0.7rem',
                            color: '#10b981',
                        }}
                    >
                        {s.estimatedSavings.latency && (
                            <span>
                                {t('sre.saves_latency').replace(
                                    '{0}',
                                    String(Math.round(s.estimatedSavings.latency)),
                                )}
                            </span>
                        )}
                        {s.estimatedSavings.cost && (
                            <span>
                                {t('sre.saves_cost').replace(
                                    '{0}',
                                    s.estimatedSavings.cost.toFixed(2),
                                )}
                            </span>
                        )}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                <button
                    onClick={() => onExecute(s.id)}
                    disabled={executingId === s.id}
                    style={{
                        padding: '0.5rem 0.8rem',
                        borderRadius: 8,
                        border: '1px solid rgba(16,185,129,0.3)',
                        background:
                            executingId === s.id ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
                        color: '#10b981',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        opacity: executingId === s.id ? 0.6 : 1,
                    }}
                >
                    {executingId === s.id ? (
                        <RefreshCw size={12} className="provider-spin" />
                    ) : (
                        <CheckCircle size={12} />
                    )}
                    {t('sre.execute')}
                </button>
                <button
                    onClick={() => onDismiss(s.id)}
                    style={{
                        padding: '0.5rem',
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    </motion.div>
);

export default SuggestionCard;
