import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Database, Wallet, TrendingUp,
  Activity, AlertCircle, Clock, Cpu, Copy, RotateCcw, Check, Power, PowerOff, AlertTriangle, X,
  BarChart3, Bug, Gauge, Hash, Play, Loader2
} from 'lucide-react';
import { keyService } from '../../kernel/instances';
import { eventBus, EVENTS } from '../../core/events';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import type { ApiKey } from '../../types/metrics';

import { btnGhostWithBorder, dismissBtn, errorBanner, flexBetweenMb1, flexBetweenTextSm, flexCenterGap2, flexCenterGap2Mb1, flexColGap6, flexGap2, glassCard, grid2, progressBar6, textWeight600Muted } from '../../styles/common';
const Sparkline = ({ data, emptyLabel = 'Insufficient data' }: { data: number[]; emptyLabel?: string }) => {
  if (data.length < 2) return <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emptyLabel}</div>;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 40 }}>
      <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={points} />
    </svg>
  );
};

const SparklineMemo = React.memo(Sparkline);

interface OverviewTabProps {
  apiKey: ApiKey;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ apiKey }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearError = useAutoClearError(setError);

  const [modelTestResults, setModelTestResults] = useState<Record<string, { status: string; latency: number; error?: string }> | null>(null);
  const [modelTesting, setModelTesting] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);

  const refreshModelList = useCallback(async () => {
    setRefreshingModels(true);
    try {
      await keyService.refreshModels(apiKey.id);
    } catch (e) {
      console.warn('[OverviewTab] Failed to refresh models:', e);
    }
    if (isMountedRef.current) setRefreshingModels(false);
  }, [apiKey.id]);

  const testAllModels = useCallback(async () => {
    const models = apiKey.availableModels;
    if (!models || models.length === 0) return;
    setModelTesting(true);
    setModelTestResults(null);
    const results: Record<string, { status: string; latency: number; error?: string }> = {};
    for (const model of models) {
      if (!isMountedRef.current) break;
      const reqId = `mmtest-${apiKey.id}-${model.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
      const start = Date.now();
      results[model] = { status: 'testing', latency: 0 };
      setModelTestResults({ ...results });

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => { cleanup(); reject(new Error('Timed out')); }, 10000);
          let done = false;
          const subResp = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res: any) => {
            if (res.requestId === reqId && !done) {
              done = true; clearTimeout(timeout); cleanup();
              const lat = Date.now() - start;
              results[model] = res.status === 'error'
                ? { status: 'error', latency: lat, error: res.error || 'Unknown' }
                : { status: 'ok', latency: lat };
              setModelTestResults({ ...results });
              resolve();
            }
          });
          const subStreamEnd = eventBus.on('chat:stream:end', (res: any) => {
            if (res.requestId === reqId && !done) {
              done = true; clearTimeout(timeout); cleanup();
              const lat = Date.now() - start;
              results[model] = { status: 'ok', latency: lat };
              setModelTestResults({ ...results });
              resolve();
            }
          });
          const subErr = eventBus.on('chat:stream:error', (res: any) => {
            if (res.requestId === reqId && !done) {
              done = true; clearTimeout(timeout); cleanup();
              const lat = Date.now() - start;
              results[model] = { status: 'error', latency: lat, error: res.error || 'Stream error' };
              setModelTestResults({ ...results });
              resolve();
            }
          });
          const cleanup = () => { subResp(); subStreamEnd(); subErr(); };
          eventBus.emit(EVENTS.SEND_MESSAGE, {
            provider: apiKey.provider,
            model,
            messages: [{ role: 'user', content: 'hi' }],
            requestId: reqId,
            keyId: apiKey.id,
            options: { temperature: 0.7, maxTokens: 64 },
          });
        });
      } catch (e: unknown) {
        const lat = Date.now() - start;
        results[model] = { status: 'error', latency: lat, error: e instanceof Error ? e.message : 'Unknown' };
        setModelTestResults({ ...results });
      }
    }
    if (isMountedRef.current) setModelTesting(false);
  }, [apiKey]);

  const hasWorkingModel = modelTestResults && Object.values(modelTestResults).some(r => r.status === 'ok');

  const stats = apiKey.stats?.extended;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  if (!stats) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        {t('overview.empty_state')}
      </div>
    );
  }

  const reputationColor = (stats.reputationScore || 0) >= 80 ? '#10b981' : (stats.reputationScore || 0) >= 50 ? '#f59e0b' : '#ef4444';
  const formatMs = (ms: number) => `${Math.round(ms)}ms`;

  const handleCopyKey = async () => {
    try {
      if (apiKey.key) {
        await navigator.clipboard.writeText(apiKey.key);
        if (isMountedRef.current) setCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) setCopied(false);
        }, 2000);
      }
    } catch (e) {
      console.warn('[OverviewTab] Failed to copy API key:', e);
      if (isMountedRef.current) {
        setError(t('overview.error_copy'));
        clearError();
      }
    }
  };

  const handleResetMetrics = async () => {
    setResetting(true);
    try {
      if (typeof keyService.resetStats === 'function') {
        await keyService.resetStats(apiKey.id);
      } else {
        eventBus.emit(EVENTS.NOTIFICATION, { message: t('overview.reset_requested'), type: 'info' });
      }
      eventBus.emit(EVENTS.NOTIFICATION, { message: t('overview.reset_success'), type: 'success' });
      if (isMountedRef.current) setError(null);
    } catch (e) {
      console.warn('[OverviewTab] Failed to reset metrics:', e);
      if (isMountedRef.current) {
        setError(t('overview.error_reset'));
        clearError();
      }
    } finally {
      if (isMountedRef.current) setResetting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const { groupManager } = await import('../../kernel/instances');
      await groupManager.syncKeyStatus(apiKey.id, apiKey.status === 'active' ? 'inactive' : 'active');
      if (isMountedRef.current) setError(null);
    } catch (e) {
      console.warn('[OverviewTab] Failed to toggle key status:', e);
      if (isMountedRef.current) {
        setError(t('overview.error_toggle'));
        clearError();
      }
    }
  };

  const handleSetSLA = (sla: string) => {
    try {
      keyService.setSLA(apiKey.id, sla);
      if (isMountedRef.current) setError(null);
    } catch (e) {
      console.warn('[OverviewTab] Failed to set SLA:', e);
      if (isMountedRef.current) {
        setError(t('overview.error_sla'));
        clearError();
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={flexColGap6}>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={errorBanner}
            role="alert"
          >
            <AlertTriangle size={14} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} style={dismissBtn} aria-label={t('overview.dismiss_error')}>
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ 
            padding: '0.3rem 0.8rem', 
            background: stats.state === 'HEALTHY' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
            color: stats.state === 'HEALTHY' ? '#10b981' : '#ef4444', 
            borderRadius: 100, fontSize: '0.65rem', fontWeight: 800,
            border: `1px solid ${stats.state === 'HEALTHY' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
          }}>
            {stats.state === 'HEALTHY' ? 'HEALTHY' : stats.state}
          </span>
          <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '1rem' }}>
            {[
              { id: 'LOW_LATENCY', labelKey: 'overview.sla_low_latency' },
              { id: 'HIGH_QUALITY', labelKey: 'overview.sla_high_quality' },
              { id: 'BALANCED', labelKey: 'overview.sla_balanced' },
              { id: 'FREE_FIRST', labelKey: 'overview.sla_free_first' }
            ].map(mode => (
              <button 
                key={mode.id} 
                onClick={() => handleSetSLA(mode.id)}
                style={{ 
                  padding: '0.2rem 0.5rem', fontSize: '0.6rem', 
                  background: stats.activeSLA === mode.id ? 'rgba(96,165,250,0.2)' : 'transparent', 
                  color: stats.activeSLA === mode.id ? '#60a5fa' : 'var(--text-muted)',
                  border: `1px solid ${stats.activeSLA === mode.id ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 4, cursor: 'pointer'
                }}
                aria-label={t('overview.set_sla_aria', { mode: t(mode.labelKey) })}
              >
                {t(mode.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <div style={flexGap2}>
          <button 
            onClick={handleToggleStatus}
            style={btnGhostWithBorder}
            aria-label={t(apiKey.status === 'active' ? 'overview.disable_provider' : 'overview.enable_provider')}
          >
            {apiKey.status === 'active' ? <PowerOff size={16} aria-hidden="true" /> : <Power size={16} aria-hidden="true" />}
            {t(apiKey.status === 'active' ? 'overview.disable' : 'overview.enable')}
          </button>
          <button 
            onClick={handleCopyKey}
            style={btnGhostWithBorder}
            aria-label={t('overview.copy_key_aria')}
          >
            {copied ? <Check size={16} color="#10b981" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} 
            {copied ? t('overview.copied') : t('overview.copy_key')}
          </button>
          <button 
            onClick={handleResetMetrics}
            style={btnGhostWithBorder}
            disabled={resetting}
            aria-label={t('overview.reset_metrics_aria')}
          >
            {resetting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <RotateCcw size={16} aria-hidden="true" />
              </motion.div>
            ) : (
              <RotateCcw size={16} aria-hidden="true" />
            )}
            {t('overview.reset_metrics')}
          </button>
        </div>
      </div>

      <div style={grid2}>
        <div style={glassCard}>
          <div style={flexBetweenMb1}>
            <span style={textWeight600Muted}>{t('overview.reputation')}</span>
            <Shield size={16} color={reputationColor} aria-hidden="true" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: reputationColor }}>{Math.round(stats.reputationScore || 0)}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>

        <div style={glassCard}>
          <div style={flexBetweenMb1}>
            <span style={textWeight600Muted}>{t('overview.concurrency')}</span>
            <Database size={16} color="#3b82f6" aria-hidden="true" />
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>{stats.currentConcurrentRequests || 0}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {stats.rules?.maxConcurrentRequests || 5}</span></div>
        </div>
      </div>

        <div style={glassCard}>
        <div style={flexBetweenMb1}>
          <div style={flexCenterGap2}>
            <Cpu size={14} color="#a855f7" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t('overview.available_models')}</span>
          </div>
          <div style={flexCenterGap2}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t('overview.models_count', { count: apiKey.availableModels?.length || 0 })}</span>
            <button
              onClick={refreshModelList}
              disabled={refreshingModels}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', borderRadius: 6, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: refreshingModels ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
              title="Refresh model list from provider API"
            >
              {refreshingModels ? <Loader2 size={12} className="provider-spin" /> : <RotateCcw size={12} />}
            </button>
            <button
              onClick={testAllModels}
              disabled={modelTesting || !apiKey.availableModels?.length}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', borderRadius: 6, background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)', color: '#a855f7', cursor: modelTesting ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
              title="Quick Test All Models"
            >
              {modelTesting ? <Loader2 size={12} className="provider-spin" /> : <Play size={12} />}
              {modelTesting ? 'Testing...' : 'Test All'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(apiKey.availableModels || []).slice(0, 8).map(m => {
            const mr = modelTestResults?.[m];
            const borderColor = mr ? (mr.status === 'ok' ? '#10b981' : mr.status === 'testing' ? '#a855f7' : '#ef4444') : 'rgba(255,255,255,0.05)';
            return (
              <span key={m} style={{ padding: '0.2rem 0.5rem', background: mr ? (mr.status === 'ok' ? 'rgba(16,185,129,0.1)' : mr.status === 'testing' ? 'rgba(168,85,247,0.1)' : 'rgba(239,68,68,0.1)') : 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: '0.65rem', color: mr ? (mr.status === 'ok' ? '#10b981' : mr.status === 'testing' ? '#a855f7' : '#ef4444') : 'var(--text-muted)', border: `1px solid ${borderColor}`, transition: 'all 0.2s' }} title={mr?.error ? mr.error : mr ? `${mr.latency}ms` : m}>
                {m.split('/').pop()}
                {mr && mr.status === 'testing' && <span style={{ marginLeft: 4 }}>⋯</span>}
                {mr && mr.status === 'ok' && <span style={{ marginLeft: 4, opacity: 0.6 }}>{mr.latency}ms</span>}
                {mr && mr.status === 'error' && <span style={{ marginLeft: 4 }}>✕</span>}
              </span>
            );
          })}
          {(apiKey.availableModels?.length || 0) > 8 && (
            <span style={{ fontSize: '0.65rem', color: '#3b82f6', alignSelf: 'center' }}>{t('overview.models_more', { count: apiKey.availableModels!.length - 8 })}</span>
          )}
        </div>
        {modelTestResults && !modelTesting && (
          <div style={{ marginTop: 8, fontSize: '0.7rem', color: hasWorkingModel ? '#10b981' : '#ef4444' }}>
            {hasWorkingModel
              ? `${Object.values(modelTestResults).filter(r => r.status === 'ok').length}/${Object.keys(modelTestResults).length} models working`
              : 'All models failed'}
          </div>
        )}
      </div>

      <div style={grid2}>
        <div style={glassCard}>
          <div style={flexCenterGap2Mb1}>
            <Wallet size={14} color="#10b981" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t('overview.daily_limits')}</span>
          </div>
          <div style={progressBar6}>
            <div style={{ width: `${Math.min(100, ((stats.usageToday?.tokens || 0) / (stats.rules?.quota?.tokensPerDay || 100000)) * 100)}%`, height: '100%', background: '#10b981' }} />
          </div>
          <div style={flexBetweenTextSm}>
            <span>{t('overview.tokens_used', { count: stats.usageToday?.tokens || 0 })}</span>
            <span>{Math.round(((stats.usageToday?.tokens || 0) / (stats.rules?.quota?.tokensPerDay || 100000)) * 100)}%</span>
          </div>
        </div>

        <div style={glassCard}>
          <div style={flexCenterGap2Mb1}>
            <TrendingUp size={14} color="#a855f7" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t('overview.monthly_spend')}</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${(stats.usageMonthly?.estimatedCost || 0).toFixed(2)}</div>
          {stats.rules?.quota?.monthlyBudget && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('overview.of_budget', { budget: stats.rules.quota.monthlyBudget })}</div>
          )}
        </div>
      </div>

      <div style={glassCard}>
        <div style={flexBetweenMb1}>
          <div style={flexCenterGap2}>
            <Activity size={14} color="#3b82f6" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t('overview.latency_history')}</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700 }}>{t('overview.latency_avg', { value: formatMs(stats.fourSignals?.latency || 0) })}</span>
        </div>
        <SparklineMemo data={(stats.throughputHistory || []).map(h => typeof h === 'number' ? h : (h?.latency || 0))} emptyLabel={t('overview.insufficient_data')} />
      </div>

      {stats.alerts && stats.alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <AlertCircle size={14} color="#ef4444" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t('overview.active_alerts')}</span>
          </div>
          {stats.alerts.map(alert => (
            <div key={alert.id} style={{ 
              padding: '0.75rem', 
              background: alert.severity === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
              borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
              <AlertCircle size={16} color={alert.severity === 'critical' ? '#ef4444' : '#f59e0b'} aria-hidden="true" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{alert.message}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{new Date(alert.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={glassCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Clock size={14} color="#3b82f6" aria-hidden="true" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t('overview.ttft_breakdown')}</span>
        </div>
        {stats.latencyBreakdown && stats.latencyBreakdown.total > 0 ? (
          <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${((stats.latencyBreakdown.dns || 0) / stats.latencyBreakdown.total) * 100}%`, background: '#3b82f6' }} title="DNS" />
            <div style={{ width: `${((stats.latencyBreakdown.tls || 0) / stats.latencyBreakdown.total) * 100}%`, background: '#a855f7' }} title="TLS" />
            <div style={{ width: `${((stats.latencyBreakdown.connect || 0) / stats.latencyBreakdown.total) * 100}%`, background: '#ec4899' }} title="Connect" />
            <div style={{ width: `${(Math.max(0, stats.latencyBreakdown.ttft - ((stats.latencyBreakdown.dns || 0) + (stats.latencyBreakdown.tls || 0) + (stats.latencyBreakdown.connect || 0))) / stats.latencyBreakdown.total) * 100}%`, background: '#10b981' }} title="Processing" />
          </div>
        ) : (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>{t('overview.no_latency_data')}</div>
        )}
      </div>

      <div style={grid2}>
        <div style={glassCard}>
          <div style={flexCenterGap2Mb1}>
            <BarChart3 size={14} color="#f59e0b" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t('overview.request_quota')}</span>
          </div>
          <div style={progressBar6}>
            <div style={{ width: `${Math.min(100, ((stats.usageToday?.requests || 0) / (stats.rules?.quota?.requestsPerDay || 1000)) * 100)}%`, height: '100%', background: '#f59e0b' }} />
          </div>
          <div style={flexBetweenTextSm}>
            <span>{t('overview.requests_used', { count: stats.usageToday?.requests || 0 })}</span>
            <span>{Math.round(((stats.usageToday?.requests || 0) / (stats.rules?.quota?.requestsPerDay || 1000)) * 100)}%</span>
          </div>
        </div>

        <div style={glassCard}>
          <div style={flexCenterGap2Mb1}>
            <Bug size={14} color="#ef4444" aria-hidden="true" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t('overview.error_breakdown')}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
            { labelKey: 'overview.error_rate_limit', value: stats.errorBreakdown?.rateLimit || 0, color: '#ef4444' },
            { labelKey: 'overview.error_timeout', value: stats.errorBreakdown?.timeout || 0, color: '#f59e0b' },
            { labelKey: 'overview.error_server', value: stats.errorBreakdown?.serverError || 0, color: '#ec4899' },
            { labelKey: 'overview.error_validation', value: stats.errorBreakdown?.validationError || 0, color: '#a855f7' },
            ].map(e => (
              <div key={e.labelKey} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t(e.labelKey)}</span>
                <span style={{ color: e.color, fontWeight: 700 }}>{e.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={glassCard}>
        <div style={flexCenterGap2Mb1}>
          <Gauge size={14} color="#10b981" aria-hidden="true" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t('overview.four_signals')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[
            { labelKey: 'overview.signal_latency', value: `${Math.round(stats.fourSignals?.latency || 0)}ms`, color: '#3b82f6' },
            { labelKey: 'overview.signal_throughput', value: `${Math.round(stats.fourSignals?.throughput || 0)} t/s`, color: '#10b981' },
            { labelKey: 'overview.signal_error_rate', value: `${(stats.fourSignals?.errorRate || 0).toFixed(2)}%`, color: stats.fourSignals?.errorRate && stats.fourSignals.errorRate > 5 ? '#ef4444' : '#94a3b8' },
            { labelKey: 'overview.signal_saturation', value: `${Math.round((stats.fourSignals?.saturation || 0) * 100)}%`, color: stats.fourSignals?.saturation && stats.fourSignals.saturation > 0.7 ? '#ef4444' : '#94a3b8' },
          ].map(s => (
            <div key={s.labelKey} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t(s.labelKey)}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={glassCard}>
        <div style={flexCenterGap2Mb1}>
          <Hash size={14} color="#64748b" aria-hidden="true" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{t('overview.key_metadata')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_id')}</div><div style={{ fontWeight: 600 }}>{apiKey.id}</div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_provider')}</div><div style={{ fontWeight: 600 }}>{apiKey.provider}</div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_key')}</div>
          <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            {apiKey.key.length > 12 ? `${apiKey.key.slice(0, 4)}...${apiKey.key.slice(-4)}` : '****'}
            <button
              onClick={handleCopyKey}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
              aria-label="Copy API key"
              title={t('overview.copy_to_clipboard')}
            >
              {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
            </button>
          </div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_sla_mode')}</div><div style={{ fontWeight: 600 }}>{stats.activeSLA || t('overview.sla_balanced')}</div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_state')}</div><div style={{ fontWeight: 600, color: stats.state === 'HEALTHY' ? '#10b981' : '#ef4444' }}>{stats.state}</div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_stability')}</div><div style={{ fontWeight: 600 }}>{stats.stabilityForecast || '--'}</div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_group')}</div><div style={{ fontWeight: 600 }}>{apiKey.group || '\u2014'}</div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_account')}</div><div style={{ fontWeight: 600 }}>{apiKey.account || apiKey.accountId || '\u2014'}</div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_fingerprint')}</div><div style={{ fontWeight: 600, fontSize: '0.65rem', fontFamily: 'monospace' }}>{(stats.fingerprint || '--').slice(0, 16)}</div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_tags')}</div><div style={{ fontWeight: 600 }}>{(apiKey.tags || []).join(', ') || t('overview.meta_none')}</div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_history')}</div><div style={{ fontWeight: 600 }}>{t('overview.meta_history_count', { count: (apiKey.history || []).length })}</div>
          <div style={{ color: 'var(--text-muted)' }}>{t('overview.meta_expires')}</div>
          <div style={{ fontWeight: 600, color: apiKey.expiresAt && apiKey.expiresAt < Date.now() ? '#ef4444' : apiKey.expiresAt && apiKey.expiresAt < Date.now() + 7 * 86400000 ? '#f59e0b' : 'inherit' }}>
            {apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleDateString() : '\u2014'}
            {apiKey.expiresAt && apiKey.expiresAt < Date.now() ? t('overview.expired') : apiKey.expiresAt && apiKey.expiresAt < Date.now() + 7 * 86400000 ? t('overview.expiring_soon') : ''}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OverviewTab;
