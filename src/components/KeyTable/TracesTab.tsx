import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { routerService } from '../../kernel/instances';
import type { RouterDecision, PipelineStep } from '../../kernel/services/provider-router';
import type { ApiKey } from '../../types/metrics';

interface TracesTabProps {
    keyId: string;
    stats: ApiKey['stats']['extended'];
}

const STEP_ICONS: Record<PipelineStep['status'], string> = {
    passed: '\u2713',
    blocked: '\u2717',
    retried: '\u21BB',
    cached: '\u2B50',
    fallback: '\u2192',
};

const STEP_COLORS: Record<PipelineStep['status'], string> = {
    passed: '#22c55e',
    blocked: '#ef4444',
    retried: '#f59e0b',
    cached: '#a855f7',
    fallback: '#3b82f6',
};

const DecisionCard: React.FC<{ decision: RouterDecision; keyId: string }> = ({
    decision: d,
    keyId,
}) => {
    const [expanded, setExpanded] = useState(false);
    const skipEntry = d.skipped.find((s) => s.keyId === keyId);

    const finalState = skipEntry
        ? {
              label:
                  skipEntry.stage === 'status'
                      ? 'Skipped'
                      : skipEntry.stage === 'policy'
                        ? 'Blocked'
                        : skipEntry.stage === 'quota'
                          ? 'Quota'
                          : skipEntry.stage === 'budget'
                            ? 'Budget'
                            : 'Skipped',
              color: '#f59e0b',
              reason: skipEntry.reason,
          }
        : { label: 'Scored', color: '#3b82f6', reason: 'Scored in routing decision' };

    return (
        <div
            style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)',
                overflow: 'hidden',
            }}
        >
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    <span
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            color: '#3b82f6',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {d.requestId}
                    </span>
                    <span
                        style={{
                            fontSize: '0.7rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: `${finalState.color}20`,
                            color: finalState.color,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {finalState.label}
                    </span>
                    <span
                        style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {d.strategy}
                    </span>
                    {d.selected && (
                        <span
                            style={{ fontSize: '0.7rem', color: '#22c55e', whiteSpace: 'nowrap' }}
                        >
                            {d.selected}
                        </span>
                    )}
                    {d.steps.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                            {d.steps.map((s, i) => (
                                <span
                                    key={`${s.name}-${s.provider ?? s.detail ?? i}`}
                                    title={s.detail}
                                    style={{
                                        fontSize: '0.6rem',
                                        padding: '0.1rem 0.3rem',
                                        borderRadius: '3px',
                                        background: `${STEP_COLORS[s.status]}20`,
                                        color: STEP_COLORS[s.status],
                                    }}
                                >
                                    {STEP_ICONS[s.status]} {s.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <span
                    style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}
                >
                    {new Date(d.timestamp).toLocaleTimeString()}
                </span>
                <span
                    style={{
                        marginLeft: '0.5rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        transition: 'transform 0.2s',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                >
                    {'\u25BC'}
                </span>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        <div
                            style={{
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    display: 'grid',
                                    gridTemplateColumns: 'auto 1fr',
                                    gap: '0.25rem 1rem',
                                }}
                            >
                                <span>Request ID:</span>
                                <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>
                                    {d.requestId}
                                </span>
                                <span>Strategy:</span>
                                <span>{d.strategy}</span>
                                <span>Classification:</span>
                                <span>
                                    {d.classification.complexity}
                                    {d.classification.isCode ? ', code' : ''}
                                    {d.classification.isMultimodal ? ', multimodal' : ''}
                                    {d.classification.isLong ? ', long' : ''}
                                </span>
                                <span>Prompt length:</span>
                                <span>{d.promptLength} chars</span>
                                {d.estimatedCost !== undefined && (
                                    <>
                                        <span>Est. cost:</span>
                                        <span>${d.estimatedCost.toFixed(6)}</span>
                                    </>
                                )}
                                <span>Weights:</span>
                                <span>
                                    TTFT {d.weights.ttft.toFixed(2)} / TPS{' '}
                                    {d.weights.tps.toFixed(2)} / Rel{' '}
                                    {d.weights.reliability.toFixed(2)}
                                </span>
                                {d.selected && (
                                    <>
                                        <span>Selected:</span>
                                        <span style={{ color: '#22c55e' }}>{d.selected}</span>
                                    </>
                                )}
                                {d.secondBest && (
                                    <>
                                        <span>2nd best:</span>
                                        <span style={{ color: '#f59e0b' }}>{d.secondBest}</span>
                                    </>
                                )}
                            </div>

                            {d.steps.length > 0 && (
                                <div>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            marginBottom: '0.4rem',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        Pipeline
                                    </div>
                                    {d.steps.map((s, i) => (
                                        <div
                                            key={`${s.name}-${s.provider ?? s.detail ?? i}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.25rem 0',
                                                fontSize: '0.75rem',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: STEP_COLORS[s.status],
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {STEP_ICONS[s.status]}
                                            </span>
                                            <span
                                                style={{
                                                    background: `${STEP_COLORS[s.status]}15`,
                                                    padding: '0.1rem 0.4rem',
                                                    borderRadius: '3px',
                                                    fontSize: '0.65rem',
                                                    color: STEP_COLORS[s.status],
                                                    fontFamily: 'monospace',
                                                    textTransform: 'uppercase',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {s.name}
                                            </span>
                                            {s.provider && (
                                                <span style={{ color: '#60a5fa' }}>
                                                    {s.provider}
                                                </span>
                                            )}
                                            {s.detail && (
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    {s.detail}
                                                </span>
                                            )}
                                            {s.durationMs !== undefined && (
                                                <span
                                                    style={{
                                                        color: 'var(--text-muted)',
                                                        marginLeft: 'auto',
                                                    }}
                                                >
                                                    {s.durationMs}ms
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {d.scores.length > 0 && (
                                <div>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            marginBottom: '0.4rem',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        Scores
                                    </div>
                                    <table
                                        style={{
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                            fontSize: '0.7rem',
                                        }}
                                    >
                                        <thead>
                                            <tr
                                                style={{
                                                    borderBottom:
                                                        '1px solid rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                <th
                                                    style={{
                                                        padding: '0.3rem 0.5rem',
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    Provider
                                                </th>
                                                <th
                                                    style={{
                                                        padding: '0.3rem 0.5rem',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    Score
                                                </th>
                                                <th
                                                    style={{
                                                        padding: '0.3rem 0.5rem',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    Reliability
                                                </th>
                                                <th
                                                    style={{
                                                        padding: '0.3rem 0.5rem',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    TTFT
                                                </th>
                                                <th
                                                    style={{
                                                        padding: '0.3rem 0.5rem',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    TPS
                                                </th>
                                                <th
                                                    style={{
                                                        padding: '0.3rem 0.5rem',
                                                        textAlign: 'right',
                                                    }}
                                                >
                                                    Cost
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {d.scores.map((s) => (
                                                <tr
                                                    key={s.provider}
                                                    style={{
                                                        borderBottom:
                                                            '1px solid rgba(255,255,255,0.02)',
                                                        background:
                                                            s.provider === d.selected
                                                                ? 'rgba(34,197,94,0.05)'
                                                                : undefined,
                                                    }}
                                                >
                                                    <td
                                                        style={{
                                                            padding: '0.3rem 0.5rem',
                                                            fontWeight:
                                                                s.provider === d.selected
                                                                    ? 600
                                                                    : 400,
                                                            color:
                                                                s.provider === d.selected
                                                                    ? '#22c55e'
                                                                    : '#60a5fa',
                                                        }}
                                                    >
                                                        {s.provider}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: '0.3rem 0.5rem',
                                                            textAlign: 'right',
                                                        }}
                                                    >
                                                        {s.score.toFixed(3)}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: '0.3rem 0.5rem',
                                                            textAlign: 'right',
                                                        }}
                                                    >
                                                        {s.components.stabilityBonus?.toFixed(2) ??
                                                            '-'}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: '0.3rem 0.5rem',
                                                            textAlign: 'right',
                                                        }}
                                                    >
                                                        {s.components.latencyPenalty?.toFixed(2) ??
                                                            '-'}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: '0.3rem 0.5rem',
                                                            textAlign: 'right',
                                                        }}
                                                    >
                                                        —
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: '0.3rem 0.5rem',
                                                            textAlign: 'right',
                                                        }}
                                                    >
                                                        {s.components.costPenalty?.toFixed(2) ??
                                                            '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {d.skipped.length > 0 && (
                                <div>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            marginBottom: '0.4rem',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        Skipped Keys ({d.skipped.length})
                                    </div>
                                    {d.skipped.map((s, _i) => (
                                        <div
                                            key={`${s.provider}-${s.keyId}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.2rem 0',
                                                fontSize: '0.7rem',
                                                opacity: s.keyId === keyId ? 1 : 0.6,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    background: '#f59e0b20',
                                                    padding: '0.1rem 0.4rem',
                                                    borderRadius: '3px',
                                                    color: '#f59e0b',
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.65rem',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {s.stage}
                                            </span>
                                            <span style={{ color: '#60a5fa' }}>{s.provider}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>
                                                {s.keyLabel}
                                            </span>
                                            <span
                                                style={{
                                                    color: 'var(--text-muted)',
                                                    marginLeft: 'auto',
                                                }}
                                            >
                                                {s.reason}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TracesTab: React.FC<TracesTabProps> = ({ keyId, stats }) => {
    const decisions = (() => {
        try {
            return routerService.getSelectionTrace(keyId) as RouterDecision[];
        } catch {
            return [];
        }
    })();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
            {decisions.length > 0 && (
                <div>
                    <div
                        style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            marginBottom: '0.75rem',
                            color: 'var(--text-primary)',
                        }}
                    >
                        Router Trace ({decisions.length} decisions)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {decisions.map((d) => (
                            <DecisionCard key={d.requestId} decision={d} keyId={keyId} />
                        ))}
                    </div>
                </div>
            )}

            <div>
                <div
                    style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        marginBottom: '0.75rem',
                        color: 'var(--text-primary)',
                    }}
                >
                    Execution Traces {stats ? `(${(stats.traces || []).length})` : ''}
                </div>
                {stats ? (
                    <table
                        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}
                    >
                        <thead>
                            <tr
                                style={{
                                    textAlign: 'left',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <th style={{ padding: '0.75rem' }}>Trace ID</th>
                                <th style={{ padding: '0.75rem' }}>Task</th>
                                <th style={{ padding: '0.75rem' }}>Region</th>
                                <th style={{ padding: '0.75rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stats.traces || []).map((t) => (
                                <tr
                                    key={t.traceId}
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                                >
                                    <td
                                        style={{
                                            padding: '0.75rem',
                                            color: '#3b82f6',
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        {t.traceId}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>{t.taskType}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                                        {t.region}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        {t.status === 'ok' ? 'success' : t.status}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div
                        style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                        No traces available
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default TracesTab;
