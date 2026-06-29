import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Bot,
    Activity,
    AlertTriangle,
    Zap,
    Shield,
    CheckCircle,
    X,
    RefreshCw,
    Cpu,
    TrendingUp,
    Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../../i18n/translations';
import {
    metricCardCenter,
    labelMetricSub,
    emptyStateCenter,
    emptyStateTitle,
    flexAlignCenterGap2Mb03,
} from '../../styles/common';
import { advisorService } from '../../kernel/instances';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import type { OptimizationSuggestion } from '../../kernel/instances';

type SREAlert = {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: number;
};

const SEVERITY_CONFIG = {
    critical: {
        icon: <AlertTriangle size={16} />,
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.1)',
        border: 'rgba(239,68,68,0.3)',
    },
    warning: {
        icon: <Zap size={16} />,
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.1)',
        border: 'rgba(245,158,11,0.3)',
    },
    info: {
        icon: <Activity size={16} />,
        color: '#3b82f6',
        bg: 'rgba(59,130,246,0.1)',
        border: 'rgba(59,130,246,0.3)',
    },
};

const IMPACT_COLORS = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6',
};

const SREAgentPanel: React.FC = () => {
    const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
    const [alerts, setAlerts] = useState<SREAlert[]>([]);
    const [metrics, setMetrics] = useState<{
        avgLatency?: number;
        errorRate?: number;
        costPerRequest?: number;
    } | null>(null);
    const [activeTab, setActiveTab] = useState<'suggestions' | 'alerts' | 'whatif'>('suggestions');
    const [whatIfResults, setWhatIfResults] = useState<Array<{
        scenario: string;
        improvement: string;
        details: string;
        impact: string;
    }> | null>(null);
    const [cachingAdvice, setCachingAdvice] = useState<{
        cacheable?: boolean;
        reuseCount?: number;
        estimatedSavings?: string;
        details?: string;
    } | null>(null);
    const [autoFixEnabled, setAutoFixEnabled] = useState(false);
    const [executingId, setExecutingId] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const execTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        return () => {
            if (execTimeoutRef.current) clearTimeout(execTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        let retryCount = 0;
        const MAX_RETRIES = 20;

        const tryRefresh = () => {
            try {
                setSuggestions(advisorService.getSuggestions());
                setAlerts(advisorService.getSREAlerts());
                setMetrics(advisorService.getMetrics());
                setWhatIfResults(advisorService.getWhatIfAnalysis());
                setCachingAdvice(advisorService.getPromptCachingAdvice());
                const cfg = advisorService.getConfig?.() ?? { enableAutoFix: false };
                setAutoFixEnabled(cfg.enableAutoFix ?? false);
            } catch (e) {
                retryCount++;
                if (retryCount > MAX_RETRIES) {
                    console.warn('[SREAgentPanel] Max retries reached, giving up', e);
                    return;
                }
                if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = setTimeout(tryRefresh, Math.min(500 * retryCount, 5000));
            }
        };

        const refresh = () => {
            try {
                setSuggestions(advisorService.getSuggestions());
                setAlerts(advisorService.getSREAlerts());
                setMetrics(advisorService.getMetrics());
                setWhatIfResults(advisorService.getWhatIfAnalysis());
                setCachingAdvice(advisorService.getPromptCachingAdvice());
                const cfg = advisorService.getConfig?.() ?? { enableAutoFix: false };
                setAutoFixEnabled(cfg.enableAutoFix ?? false);
            } catch {
                /* already logged by resolver */
            }
        };

        const unsub1 = eventBus.on(EVENTS.ADVISOR_SUGGESTION, refresh);
        const unsub2 = eventBus.on(EVENTS.ADVISOR_SUGGESTION_EXECUTED, refresh);
        const unsub3 = eventBus.on(EVENTS.ADVISOR_SUGGESTION_DISMISSED, refresh);
        const interval = setInterval(refresh, 5000);
        tryRefresh();

        return () => {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            unsub1();
            unsub2();
            unsub3();
            clearInterval(interval);
        };
    }, []);

    const handleExecute = useCallback((id: string) => {
        setExecutingId(id);
        if (execTimeoutRef.current) clearTimeout(execTimeoutRef.current);
        execTimeoutRef.current = setTimeout(() => {
            execTimeoutRef.current = undefined;
            try {
                advisorService.executeFix(id);
            } catch {
                /* resolver logged */
            }
            setExecutingId(null);
        }, 500);
    }, []);

    const handleDismiss = useCallback((id: string) => {
        try {
            advisorService.dismissSuggestion(id);
        } catch {
            /* resolver logged */
        }
    }, []);

    const handleAutoFixToggle = useCallback(() => {
        try {
            const cfg = advisorService.getConfig?.() ?? { enableAutoFix: false };
            advisorService.updateConfig({ enableAutoFix: !cfg.enableAutoFix });
            setAutoFixEnabled(!cfg.enableAutoFix);
        } catch {
            /* resolver logged */
        }
    }, []);

    const sreAlerts = alerts;
    const criticalCount = (sreAlerts || []).filter((a) => a.severity === 'critical').length;
    const warningCount = (sreAlerts || []).filter((a) => a.severity === 'warning').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
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
                        <h1
                            style={{
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                margin: 0,
                                color: '#f8fafc',
                            }}
                        >
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
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                        {t('sre.subtitle')}
                    </p>
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
                        <button
                            onClick={handleAutoFixToggle}
                            style={{
                                width: 36,
                                height: 20,
                                borderRadius: 10,
                                border: 'none',
                                background: autoFixEnabled ? '#10b981' : '#52525b',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'background 0.2s',
                            }}
                            role="switch"
                            aria-checked={autoFixEnabled}
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
                                    left: autoFixEnabled ? 18 : 2,
                                }}
                            />
                        </button>
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

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                }}
            >
                <div style={metricCardCenter}>
                    <div style={labelMetricSub}>{t('sre.metric.avg_latency')}</div>
                    <div
                        style={{
                            fontSize: '1.3rem',
                            fontWeight: 800,
                            color:
                                (metrics?.avgLatency ?? 0) < 1000
                                    ? '#10b981'
                                    : (metrics?.avgLatency ?? 0) < 3000
                                      ? '#f59e0b'
                                      : '#ef4444',
                        }}
                    >
                        {Math.round(metrics?.avgLatency ?? 0)}
                        <span style={{ fontSize: '0.7rem' }}>ms</span>
                    </div>
                </div>
                <div style={metricCardCenter}>
                    <div style={labelMetricSub}>{t('sre.metric.error_rate')}</div>
                    <div
                        style={{
                            fontSize: '1.3rem',
                            fontWeight: 800,
                            color:
                                (metrics?.errorRate ?? 0) < 0.05
                                    ? '#10b981'
                                    : (metrics?.errorRate ?? 0) < 0.15
                                      ? '#f59e0b'
                                      : '#ef4444',
                        }}
                    >
                        {((metrics?.errorRate ?? 0) * 100).toFixed(1)}%
                    </div>
                </div>
                <div style={metricCardCenter}>
                    <div style={labelMetricSub}>{t('sre.metric.cost_per_req')}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
                        ${(metrics?.costPerRequest ?? 0).toFixed(4)}
                    </div>
                </div>
                <div style={metricCardCenter}>
                    <div style={labelMetricSub}>{t('sre.metric.suggestions')}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#a78bfa' }}>
                        {suggestions.length}
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '0.5rem',
                }}
            >
                {(['suggestions', 'alerts', 'whatif'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 8,
                            border: 'none',
                            background: activeTab === tab ? 'rgba(139,92,246,0.15)' : 'transparent',
                            color: activeTab === tab ? '#a78bfa' : '#64748b',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        {tab === 'suggestions' ? (
                            <Cpu size={14} />
                        ) : tab === 'alerts' ? (
                            <Shield size={14} />
                        ) : (
                            <TrendingUp size={14} />
                        )}
                        {tab === 'suggestions'
                            ? t('sre.tab.suggestions')
                            : tab === 'alerts'
                              ? t('sre.tab.alerts')
                              : t('sre.tab.what_if')}{' '}
                        {tab === 'alerts' && alerts.length > 0 && `(${alerts.length})`}
                    </button>
                ))}
            </div>

            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                }}
            >
                {activeTab === 'suggestions' ? (
                    suggestions.length > 0 ? (
                        <AnimatePresence>
                            {suggestions.map((s) => (
                                <motion.div
                                    key={s.id}
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
                                            <div
                                                style={{
                                                    fontSize: '0.8rem',
                                                    color: '#94a3b8',
                                                    lineHeight: 1.5,
                                                }}
                                            >
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
                                                                String(
                                                                    Math.round(
                                                                        s.estimatedSavings.latency,
                                                                    ),
                                                                ),
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
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '0.4rem',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <button
                                                onClick={() => handleExecute(s.id)}
                                                disabled={executingId === s.id}
                                                style={{
                                                    padding: '0.5rem 0.8rem',
                                                    borderRadius: 8,
                                                    border: '1px solid rgba(16,185,129,0.3)',
                                                    background:
                                                        executingId === s.id
                                                            ? 'rgba(16,185,129,0.2)'
                                                            : 'rgba(16,185,129,0.1)',
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
                                                    <RefreshCw
                                                        size={12}
                                                        className="provider-spin"
                                                    />
                                                ) : (
                                                    <CheckCircle size={12} />
                                                )}
                                                {t('sre.execute')}
                                            </button>
                                            <button
                                                onClick={() => handleDismiss(s.id)}
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
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div style={emptyStateCenter}>
                            <Bot size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                            <div style={emptyStateTitle}>{t('sre.suggestions.empty')}</div>
                            <div style={{ fontSize: '0.85rem' }}>
                                {t('sre.suggestions.empty_desc')}
                            </div>
                        </div>
                    )
                ) : activeTab === 'whatif' ? (
                    <>
                        {whatIfResults && whatIfResults.length > 0 ? (
                            whatIfResults.map((w, _i) => (
                                <div
                                    key={w.scenario}
                                    style={{
                                        padding: '1rem 1.25rem',
                                        borderRadius: 12,
                                        background: 'rgba(0,0,0,0.2)',
                                        border: `1px solid ${w.impact === 'high' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                        borderLeft: `4px solid ${w.impact === 'high' ? '#ef4444' : '#f59e0b'}`,
                                    }}
                                >
                                    <div style={flexAlignCenterGap2Mb03}>
                                        <TrendingUp
                                            size={14}
                                            color={w.impact === 'high' ? '#ef4444' : '#f59e0b'}
                                        />
                                        <span
                                            style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 700,
                                                color: '#f8fafc',
                                            }}
                                        >
                                            {w.scenario}
                                        </span>
                                        <span
                                            style={{
                                                marginLeft: 'auto',
                                                fontSize: '0.6rem',
                                                fontWeight: 800,
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: 4,
                                                background:
                                                    w.impact === 'high'
                                                        ? 'rgba(239,68,68,0.15)'
                                                        : 'rgba(245,158,11,0.15)',
                                                color: w.impact === 'high' ? '#ef4444' : '#f59e0b',
                                            }}
                                        >
                                            {w.impact}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.8rem',
                                            color: '#10b981',
                                            fontWeight: 600,
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        {w.improvement}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            color: '#94a3b8',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {w.details}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={emptyStateCenter}>
                                <TrendingUp
                                    size={48}
                                    style={{ opacity: 0.3, marginBottom: '1rem' }}
                                />
                                <div style={emptyStateTitle}>{t('sre.what_if.empty')}</div>
                                <div style={{ fontSize: '0.85rem' }}>
                                    {t('sre.what_if.empty_desc')}
                                </div>
                            </div>
                        )}
                        {cachingAdvice && (
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
                                    <span
                                        style={{
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            color: '#f8fafc',
                                        }}
                                    >
                                        {t('sre.caching_title')}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.8rem',
                                        color: '#10b981',
                                        fontWeight: 600,
                                        marginBottom: '0.25rem',
                                    }}
                                >
                                    {cachingAdvice.estimatedSavings}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    {cachingAdvice.details}
                                </div>
                            </div>
                        )}
                    </>
                ) : alerts.length > 0 ? (
                    alerts.slice(0, 50).map((a) => {
                        const cfg = SEVERITY_CONFIG[a.severity];
                        return (
                            <div
                                key={a.id}
                                style={{
                                    display: 'flex',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: 10,
                                    background: cfg.bg,
                                    border: `1px solid ${cfg.border}`,
                                    alignItems: 'flex-start',
                                }}
                            >
                                <span style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }}>
                                    {cfg.icon}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            fontSize: '0.8rem',
                                            color: '#e2e8f0',
                                            fontWeight: 600,
                                        }}
                                    >
                                        {a.message}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.65rem',
                                            color: '#64748b',
                                            marginTop: '0.2rem',
                                        }}
                                    >
                                        {new Date(a.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={emptyStateCenter}>
                        <Shield size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                            {t('sre.alerts.empty')}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>{t('sre.alerts.empty_desc')}</div>
                    </div>
                )}
            </div>
            <ModuleInfo moduleKey="sre" />
        </div>
    );
};

export default SREAgentPanel;
