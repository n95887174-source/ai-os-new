import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Loader2,
    AlertTriangle,
    Trash2,
    Terminal,
    RefreshCw,
    PowerOff,
    Power,
    Send,
    CheckCircle2,
    Activity,
    Layers,
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import type { ApiKey } from '../../types/metrics';
import { repColor, TagPill } from '../Common/status-vocabulary';
import { probeService, keyService, keyStateStore } from '../../kernel/instances';
import { getHealthBand } from '../../kernel/contracts/key-state';
import type { ProbeResult } from '../../kernel/contracts/probe';
import {
    errorBox,
    flexBetweenSuccessLabel,
    flexCenterGap6px,
    flexWrapGap2,
    iconBtn36,
    infoIcon,
    posRelative,
    selectSmall,
    successBox,
    textErrorContent,
    textErrorLabel,
    textResultBox,
    textSecondary,
    textXs,
} from '../../styles/common';
import { useTranslation } from '../../i18n/useTranslation';
import { useNow } from '../../hooks/useNow';
import { statusBadge, highlightText } from './provider-utils';

export interface ProviderCardProps {
    apiKey: ApiKey;
    onSelect: (key: ApiKey, tab: 'overview' | 'sandbox') => void;
    onCheckHealth: (keyId: string) => void;
    onToggleStatus: (keyId: string) => void;
    onRemoveKey: (keyId: string) => void;
    isChecking: boolean;
    searchQuery: string;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
    apiKey,
    onSelect,
    onCheckHealth,
    onToggleStatus,
    onRemoveKey,
    isChecking,
    searchQuery,
}) => {
    const { t } = useTranslation();
    const now = useNow();
    const [testPrompt, setTestPrompt] = useState('');
    const [testModel, setTestModel] = useState('');
    const [testTemperature] = useState(0.7);
    const [testMaxTokens] = useState(1024);
    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [testResult, setTestResult] = useState<{
        content: string;
        latency?: number;
        model?: string;
    } | null>(null);
    const [testError, setTestError] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
    const [probeLoading, setProbeLoading] = useState(false);
    const [probeExpanded, setProbeExpanded] = useState(false);
    const status = statusBadge(apiKey.status);
    const reputation = apiKey.stats?.extended?.reputationScore || 0;
    const modelCount = apiKey.availableModels?.length || 0;

    useEffect(() => {
        if (!confirmRemove) return;
        const timer = setTimeout(() => setConfirmRemove(false), 5000);
        return () => clearTimeout(timer);
    }, [confirmRemove]);

    const cardIsMountedRef = useRef(true);
    const cardTestInitiatedRef = useRef(false);
    const testPromptRef = useRef(testPrompt);
    useEffect(() => {
        testPromptRef.current = testPrompt;
    }, [testPrompt]);
    const availableModelsRef = useRef(apiKey.availableModels);
    useEffect(() => {
        availableModelsRef.current = apiKey.availableModels;
    }, [apiKey.availableModels]);
    const testModelRef = useRef(testModel);
    useEffect(() => {
        testModelRef.current = testModel;
    }, [testModel]);
    const apiKeyIdRef = useRef(apiKey.id);
    useEffect(() => {
        apiKeyIdRef.current = apiKey.id;
    }, [apiKey.id]);

    const handleTest = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        if (!testPrompt.trim() || testStatus === 'loading') return;
        setTestStatus('loading');
        setTestResult(null);
        setTestError(null);
    };

    const handleProbe = useCallback(
        async (e: React.MouseEvent) => {
            e.stopPropagation();
            setProbeLoading(true);
            setProbeResult(null);
            try {
                const results = await probeService.probeForDebate([
                    { id: apiKey.id, provider: apiKey.provider, modelId: apiKey.model },
                ]);
                setProbeResult(results.get(apiKey.id) || null);
            } finally {
                setProbeLoading(false);
            }
        },
        [apiKey.id, apiKey.provider, apiKey.model],
    );

    useEffect(() => {
        if (testStatus !== 'loading') {
            cardTestInitiatedRef.current = false;
        }
    }, [testStatus]);

    useEffect(() => {
        cardIsMountedRef.current = true;
        if (testStatus !== 'loading') return;
        if (cardTestInitiatedRef.current) return;
        cardTestInitiatedRef.current = true;

        const prompt = testPromptRef.current;
        if (!prompt.trim()) return;

        const keyId = apiKeyIdRef.current;
        const resolvedTestModel = testModelRef.current;
        const reqId = `quick-test-${keyId}-${crypto.randomUUID().slice(0, 6)}`;
        const start = Date.now();
        let isDone = false;

        let defaultModel = 'auto';
        const p = apiKey.provider.toLowerCase();
        if (p === 'groq') defaultModel = 'llama-3.1-8b-instant';
        else if (p === 'openrouter') defaultModel = 'openrouter/auto';
        else if (p === 'gemini') defaultModel = 'gemini-3.1-flash-lite';
        else if (p === 'anthropic') defaultModel = 'claude-3-haiku-20240307';
        else if (p === 'openai') defaultModel = 'gpt-4o-mini';

        const resolvedModel = resolvedTestModel || availableModelsRef.current?.[0] || defaultModel;

        eventBus.emit(EVENTS.SEND_MESSAGE, {
            provider: p,
            model: resolvedModel,
            messages: [{ role: 'user', content: prompt }],
            requestId: reqId,
            keyId,
            options: { temperature: testTemperature, maxTokens: testMaxTokens },
        });

        const subResp = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
            if (!cardIsMountedRef.current) return;
            if (res.requestId === reqId && !isDone) {
                isDone = true;
                if (res.status === 'error') {
                    setTestStatus('error');
                    setTestError(res.error || 'Unknown error');
                } else {
                    setTestStatus('success');
                    setTestResult({
                        content: res.content,
                        latency: Date.now() - start,
                        model: resolvedModel,
                    });
                }
            }
        });

        const subStreamEnd = eventBus.on(EVENTS.STREAM_END, ({ requestId, fullContent }) => {
            if (!cardIsMountedRef.current) return;
            if (requestId === reqId && !isDone) {
                isDone = true;
                setTestStatus('success');
                setTestResult({
                    content: fullContent,
                    latency: Date.now() - start,
                    model: resolvedModel,
                });
            }
        });

        const timeout = setTimeout(() => {
            if (!cardIsMountedRef.current) return;
            if (!isDone) {
                isDone = true;
                setTestStatus('error');
                setTestError('Request timed out');
            }
        }, 15000);

        return () => {
            cardIsMountedRef.current = false;
            cardTestInitiatedRef.current = false;
            subResp();
            subStreamEnd();
            clearTimeout(timeout);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [testStatus]);

    return (
        <motion.div
            onClick={() => onSelect(apiKey, 'overview')}
            className="glass-panel provider-card-item"
            style={posRelative}
            whileHover={{ scale: 1.01, borderColor: 'rgba(59,130,246,0.3)' }}
            whileTap={{ scale: 0.98 }}
        >
            {isChecking && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'inherit',
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                    }}
                >
                    <Loader2 size={20} className="provider-spin" color="#3b82f6" />
                </div>
            )}
            <div
                className="provider-inline-flex"
                style={{
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '1rem',
                }}
            >
                <div className="provider-inline-flex" style={{ gap: '1rem' }}>
                    <div className="provider-card-icon-box">
                        <ProviderIcon provider={apiKey.provider} size={20} />
                    </div>
                    <div>
                        <div className="provider-card-title">
                            {highlightText(apiKey.label, searchQuery)}
                        </div>
                        <div className="provider-name-sub" style={textXs}>
                            {highlightText(apiKey.provider, searchQuery)}
                        </div>
                    </div>
                </div>
                <div className="provider-card-end">
                    <span
                        className="provider-status-badge"
                        style={{ color: status.color, background: status.bg }}
                        title={
                            apiKey.status === 'error' && apiKey.stats?.lastError?.message
                                ? apiKey.stats.lastError.message
                                : t(status.labelKey)
                        }
                    >
                        {status.icon} {t(status.labelKey)}
                        {apiKey.status === 'error' && apiKey.stats?.lastError?.message && (
                            <span style={infoIcon} title={apiKey.stats.lastError.message}>
                                ⓘ
                            </span>
                        )}
                    </span>
                    {(() => {
                        const ks = keyStateStore?.get?.(apiKey.id);
                        if (!ks) return null;
                        const band = getHealthBand(ks.healthScore);
                        const bandColors: Record<string, string> = {
                            healthy: '#10b981',
                            warm: '#f59e0b',
                            degraded: '#f97316',
                            cooling: '#ef4444',
                            dead: '#dc2626',
                        };
                        const c = bandColors[band] || '#64748b';
                        return (
                            <span
                                style={{
                                    marginLeft: 4,
                                    padding: '1px 6px',
                                    borderRadius: 8,
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    color: c,
                                    background: `${c}18`,
                                    textTransform: 'uppercase',
                                }}
                                title={`Health score: ${ks.healthScore}/100 — ${band}`}
                            >
                                {band} {ks.healthScore}
                            </span>
                        );
                    })()}
                    {apiKey.expiresAt && (
                        <span
                            style={{
                                fontSize: '0.65rem',
                                padding: '2px 6px',
                                borderRadius: 4,
                                marginTop: 4,
                                display: 'inline-block',
                                background:
                                    apiKey.expiresAt < now
                                        ? 'rgba(239,68,68,0.15)'
                                        : apiKey.expiresAt < now + 7 * 86400000
                                          ? 'rgba(245,158,11,0.15)'
                                          : 'rgba(255,255,255,0.05)',
                                color:
                                    apiKey.expiresAt < now
                                        ? '#ef4444'
                                        : apiKey.expiresAt < now + 7 * 86400000
                                          ? '#f59e0b'
                                          : '#94a3b8',
                            }}
                        >
                            {apiKey.expiresAt < now
                                ? `${t('provider.expired')}: `
                                : `${t('provider.expires')}: `}
                            {new Date(apiKey.expiresAt).toLocaleDateString()}
                        </span>
                    )}
                    {apiKey.tags && apiKey.tags.length > 0 && (
                        <div
                            style={{
                                display: 'flex',
                                gap: '0.25rem',
                                flexWrap: 'wrap',
                                marginTop: '0.25rem',
                            }}
                        >
                            {apiKey.tags.map((tag) => (
                                <TagPill key={tag} tag={tag} />
                            ))}
                        </div>
                    )}
                    {(() => {
                        const alerts = keyService.getAlerts().filter((a) => a.keyId === apiKey.id);
                        if (alerts.length === 0) return null;
                        return (
                            <span
                                style={{
                                    marginLeft: 8,
                                    fontSize: '0.65rem',
                                    color: '#f59e0b',
                                    fontWeight: 700,
                                }}
                                title={alerts.map((a) => a.message).join('; ')}
                            >
                                ⚠ {alerts.length}
                            </span>
                        );
                    })()}
                    <div
                        className="provider-inline-flex"
                        style={{ gap: '0.4rem', marginTop: '0.25rem' }}
                    >
                        <div className="provider-rep-bar">
                            <div
                                className="provider-rep-fill"
                                style={{
                                    width: `${reputation}%`,
                                    background: repColor(reputation),
                                }}
                            />
                        </div>
                        <span
                            className="provider-rep-text"
                            style={{ fontSize: '0.65rem', color: repColor(reputation) }}
                        >
                            {reputation} REP
                        </span>
                    </div>
                    {(apiKey.group || apiKey.account || apiKey.accountId) && (
                        <div
                            style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}
                        >
                            {apiKey.group && <span style={{ opacity: 0.6 }}>{apiKey.group}/</span>}
                            {apiKey.account || apiKey.accountId}
                        </div>
                    )}
                </div>
            </div>

            <div className="provider-card-metric-grid">
                <div className="provider-card-metric-cell">
                    <div className="provider-metric-label">{t('provider.latency_label')}</div>
                    <div className="provider-metric-value">
                        {apiKey.stats?.avgLatency
                            ? `${Math.round(apiKey.stats.avgLatency)}ms`
                            : '\u2014'}
                    </div>
                </div>
                <div className="provider-card-metric-cell provider-card-metric-cell--bordered">
                    <div className="provider-metric-label">{t('provider.tps_label')}</div>
                    <div className="provider-metric-value">
                        {typeof apiKey.stats?.extended?.latencyBreakdown?.tokensPerSec === 'number'
                            ? apiKey.stats.extended.latencyBreakdown.tokensPerSec.toFixed(1)
                            : '\u2014'}
                    </div>
                </div>
                <div className="provider-card-metric-cell">
                    <div className="provider-metric-label">{t('provider.reliability_label')}</div>
                    <div className="provider-metric-value">
                        {apiKey.stats?.successCount || apiKey.stats?.errorCount
                            ? `${Math.round((apiKey.stats.successCount / (apiKey.stats.successCount + apiKey.stats.errorCount)) * 100)}%`
                            : 'N/A'}
                    </div>
                </div>
            </div>

            {(() => {
                const ks = keyStateStore?.get?.(apiKey.id);
                if (!ks) return null;
                const band = getHealthBand(ks.healthScore);
                const bandColors: Record<string, string> = {
                    healthy: '#10b981',
                    warm: '#f59e0b',
                    degraded: '#f97316',
                    cooling: '#ef4444',
                    dead: '#dc2626',
                };
                const c = bandColors[band] || '#64748b';
                return (
                    <div
                        style={{
                            marginTop: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.6rem',
                                color: '#64748b',
                                minWidth: 48,
                                fontWeight: 700,
                            }}
                        >
                            HEALTH
                        </span>
                        <div
                            style={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                background: 'rgba(255,255,255,0.06)',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    width: `${Math.min(100, ks.healthScore)}%`,
                                    height: '100%',
                                    borderRadius: 3,
                                    background: c,
                                }}
                            />
                        </div>
                        <span
                            style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                color: c,
                                minWidth: 28,
                                textAlign: 'right',
                            }}
                        >
                            {ks.healthScore}
                        </span>
                    </div>
                );
            })()}

            {(() => {
                const stats = apiKey.stats?.extended;
                const usage = stats?.usageToday;
                if (!usage?.requests && !usage?.tokens) return null;
                const reqLimit = stats?.rules?.quota?.requestsPerDay;
                const tokLimit = stats?.rules?.quota?.tokensPerDay;
                return (
                    <div
                        style={{
                            marginTop: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                        }}
                    >
                        {reqLimit && reqLimit > 0 && (
                            <div style={flexCenterGap6px}>
                                <span
                                    style={{ fontSize: '0.6rem', color: '#64748b', minWidth: 48 }}
                                >
                                    {usage.requests}/{reqLimit}
                                </span>
                                <div
                                    style={{
                                        flex: 1,
                                        height: 4,
                                        borderRadius: 2,
                                        background: 'rgba(255,255,255,0.06)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${Math.min(100, (usage.requests / reqLimit) * 100)}%`,
                                            height: '100%',
                                            borderRadius: 2,
                                            background:
                                                usage.requests / reqLimit > 0.8
                                                    ? '#ef4444'
                                                    : usage.requests / reqLimit > 0.5
                                                      ? '#f59e0b'
                                                      : '#3b82f6',
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        {tokLimit && tokLimit > 0 && (
                            <div style={flexCenterGap6px}>
                                <span
                                    style={{ fontSize: '0.6rem', color: '#64748b', minWidth: 48 }}
                                >
                                    {(usage.tokens / 1000).toFixed(0)}k/
                                    {(tokLimit / 1000).toFixed(0)}k
                                </span>
                                <div
                                    style={{
                                        flex: 1,
                                        height: 4,
                                        borderRadius: 2,
                                        background: 'rgba(255,255,255,0.06)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${Math.min(100, (usage.tokens / tokLimit) * 100)}%`,
                                            height: '100%',
                                            borderRadius: 2,
                                            background:
                                                usage.tokens / tokLimit > 0.8
                                                    ? '#ef4444'
                                                    : usage.tokens / tokLimit > 0.5
                                                      ? '#f59e0b'
                                                      : '#10b981',
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            <div
                className="provider-inline-flex"
                style={{ justifyContent: 'space-between', marginTop: '0.75rem' }}
            >
                {modelCount > 0 && (
                    <span className="provider-model-badge">
                        <Layers size={12} /> {modelCount} model{modelCount > 1 ? 's' : ''}
                    </span>
                )}
                <div className="provider-action-group" style={{ marginLeft: 'auto' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(apiKey.id);
                        }}
                        className={`provider-action-btn ${apiKey.status === 'active' ? 'provider-action-btn--active' : 'provider-action-btn--inactive'}`}
                        title={
                            apiKey.status === 'active'
                                ? t('provider.disable')
                                : t('provider.enable')
                        }
                    >
                        {apiKey.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>
                    <button
                        onClick={handleProbe}
                        className="provider-action-btn"
                        disabled={probeLoading}
                        title={t('provider.tooltip_probe')}
                    >
                        {probeLoading ? (
                            <Loader2 size={14} className="provider-spin" />
                        ) : (
                            <Activity size={14} color="#a855f7" />
                        )}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isChecking) onCheckHealth(apiKey.id);
                        }}
                        className={`provider-action-btn${isChecking ? ' provider-action-btn--checking' : ''}`}
                        disabled={isChecking}
                        title={
                            isChecking ? t('provider.checking_health') : t('provider.check_health')
                        }
                    >
                        <RefreshCw size={14} className={isChecking ? 'provider-spin' : ''} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(apiKey, 'sandbox');
                        }}
                        className="provider-action-btn provider-action-btn--sandbox"
                        title={t('provider.tooltip_open_sandbox')}
                    >
                        <Terminal size={14} />
                    </button>
                    {confirmRemove ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveKey(apiKey.id);
                            }}
                            className="provider-action-btn provider-action-btn--danger"
                            title={t('provider.tooltip_confirm_remove')}
                        >
                            <AlertTriangle size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmRemove(true);
                            }}
                            className="provider-action-btn provider-action-btn--remove"
                            title={t('provider.tooltip_remove')}
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
            {confirmRemove && (
                <div
                    style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 8,
                        fontSize: '0.75rem',
                        color: '#fca5a5',
                        textAlign: 'center',
                    }}
                >
                    {t('provider.confirm_remove')}{' '}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setConfirmRemove(false);
                        }}
                        style={{
                            color: '#94a3b8',
                            textDecoration: 'underline',
                            marginLeft: 8,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                        }}
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            )}
            {probeResult && (
                <div>
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setProbeExpanded(!probeExpanded);
                        }}
                        style={{
                            marginTop: '0.5rem',
                            padding: '0.4rem 0.6rem',
                            borderRadius: 8,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            background:
                                probeResult.status === 'ready'
                                    ? 'rgba(16,185,129,0.08)'
                                    : probeResult.status === 'broken'
                                      ? 'rgba(239,68,68,0.08)'
                                      : 'rgba(245,158,11,0.08)',
                        }}
                    >
                        <div
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background:
                                    probeResult.status === 'ready'
                                        ? '#10b981'
                                        : probeResult.status === 'broken'
                                          ? '#ef4444'
                                          : '#f59e0b',
                                flexShrink: 0,
                            }}
                        />
                        <span
                            style={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                fontSize: '0.68rem',
                                color:
                                    probeResult.status === 'ready'
                                        ? '#10b981'
                                        : probeResult.status === 'broken'
                                          ? '#ef4444'
                                          : '#f59e0b',
                            }}
                        >
                            {probeResult.status}
                        </span>
                        {probeResult.latency > 0 && (
                            <span style={textSecondary}>{probeResult.latency}ms</span>
                        )}
                        <span style={textSecondary}>
                            quota: {probeResult.quotaRemaining ?? '?'}
                        </span>
                        {probeResult.error && (
                            <span
                                style={{ color: '#ef4444', marginLeft: 'auto', fontSize: '0.7rem' }}
                            >
                                {probeResult.error.slice(0, 40)}
                            </span>
                        )}
                        {probeResult.status === 'ready' && (
                            <CheckCircle2
                                size={12}
                                color="#10b981"
                                style={{ marginLeft: 'auto' }}
                            />
                        )}
                        <span
                            style={{
                                color: '#475569',
                                fontSize: '0.65rem',
                                marginLeft: probeResult.error ? 4 : 'auto',
                            }}
                        >
                            {probeExpanded ? '▲' : '▼'}
                        </span>
                    </div>
                    {probeExpanded && probeResult.responseContent && (
                        <div
                            style={{
                                marginTop: '0.25rem',
                                padding: '0.5rem 0.7rem',
                                borderRadius: 8,
                                background: 'rgba(0,0,0,0.15)',
                                fontSize: '0.78rem',
                                color: '#cbd5e1',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: 150,
                                overflowY: 'auto',
                                lineHeight: 1.4,
                            }}
                        >
                            {probeResult.responseContent}
                        </div>
                    )}
                </div>
            )}

            <div
                style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#94a3b8',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase',
                    }}
                >
                    {t('provider.quick_test')}
                </div>
                <div style={flexWrapGap2}>
                    <textarea
                        value={testPrompt}
                        onChange={(e) => setTestPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleTest(e);
                            }
                        }}
                        placeholder={t('provider.enter_prompt')}
                        rows={1}
                        style={{
                            flex: 1,
                            minWidth: 120,
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#fff',
                            resize: 'none',
                            fontSize: '0.85rem',
                            outline: 'none',
                        }}
                    />
                    {apiKey.availableModels && apiKey.availableModels.length > 0 && (
                        <select
                            value={testModel}
                            onChange={(e) => setTestModel(e.target.value)}
                            style={selectSmall}
                            aria-label={t('provider.select_model')}
                        >
                            <option value="">{t('provider.default_model')}</option>
                            {apiKey.availableModels.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={handleTest}
                        disabled={!testPrompt.trim() || testStatus === 'loading'}
                        className="btn-primary"
                        style={iconBtn36}
                    >
                        {testStatus === 'loading' ? (
                            <Loader2 size={16} className="provider-spin" />
                        ) : (
                            <Send size={16} />
                        )}
                    </button>
                </div>

                {testStatus === 'success' && testResult && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={successBox}
                    >
                        <div style={flexBetweenSuccessLabel}>
                            <span>{testResult.model}</span>
                            <span>{testResult.latency}ms</span>
                        </div>
                        <div style={textResultBox}>{testResult.content}</div>
                    </motion.div>
                )}
                {testStatus === 'error' && testError && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={errorBox}
                    >
                        <div style={textErrorLabel}>{t('common.error').toUpperCase()}</div>
                        <div style={textErrorContent}>{testError}</div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default ProviderCard;
