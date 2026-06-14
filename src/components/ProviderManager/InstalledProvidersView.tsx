import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Package, CheckCircle2, AlertTriangle, Loader2, Shield, RefreshCw, Terminal, ArrowUpDown, ArrowUp, ArrowDown, Layers, Power, PowerOff, Send, GripVertical, Sun, Moon, Trash2, Activity, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import type { ApiKey } from '../../types/metrics';
import { getStatusColor, repColor, TagPill, activeToggleStyle } from '../Common/status-vocabulary';
import { settingsService, probeService, keyService, keyStateStore } from '../../kernel/instances';
import { getHealthBand, HEALTH_THRESHOLDS } from '../../kernel/contracts/key-state';
import type { ProbeResult } from '../../kernel/contracts/probe';

import { errorBox, flexBetweenSuccessLabel, flexCenterGap2Mb075, flexCenterGap6px, flexColGap4, flexWrapGap2, gap2, iconBtn36, infoIcon, posRelative, selectSmall, successBox, textErrorContent, textErrorLabel, textResultBox, textSecondary, textSecondaryItalic, textXs } from '../../styles/common';
import { useTranslation } from '../../i18n/useTranslation';
interface InstalledProvidersViewProps {
  keys: ApiKey[];
  onSelect: (key: ApiKey, tab: 'overview' | 'sandbox') => void;
  onCheckHealth: (keyId: string) => void;
  onToggleStatus: (keyId: string) => void;
  onRemoveKey: (keyId: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  onReorder?: (keyId: string, targetIndex: number) => void;
  checkingIds: Set<string>;
}

function statusBadge(status: string): { label: string; labelKey: string; color: string; bg: string; icon: React.ReactNode } {
  const color = getStatusColor(status);
  const ICONS: Record<string, React.ReactNode> = {
    active: <CheckCircle2 size={14} />,
    error: <AlertTriangle size={14} />,
    checking: <Loader2 size={14} className="provider-spin" />,
    pending: <Loader2 size={14} />,
  };
  const LABELS: Record<string, string> = {
    active: 'Active', error: 'Error', checking: 'Checking', inactive: 'Inactive',
    pending: 'Testing', quota_exhausted: 'Quota Exhausted', invalid: 'Invalid',
    duplicate: 'Duplicate', quarantined: 'Quarantined', probation: 'Probation',
    unknown: 'Unchecked',
  };
  const LABEL_KEYS: Record<string, string> = {
    active: 'provider.status.active', error: 'provider.status.error', checking: 'provider.status.checking',
    inactive: 'provider.status.inactive', pending: 'provider.status.pending', quota_exhausted: 'provider.status.quota_exhausted',
    invalid: 'provider.status.invalid', duplicate: 'provider.status.duplicate', quarantined: 'provider.status.quarantined',
    probation: 'provider.status.probation', unknown: 'provider.status.unknown',
  };
  return { label: LABELS[status] || status, labelKey: LABEL_KEYS[status] || status, color, bg: `${color}18`, icon: ICONS[status] || <Shield size={14} /> };
}

interface ProviderRowProps {
  apiKey: ApiKey;
  onSelect: (key: ApiKey, tab: 'overview' | 'sandbox') => void;
  onCheckHealth: (keyId: string) => void;
  onToggleStatus: (keyId: string) => void;
  onRemoveKey: (keyId: string) => void;
  isChecking: boolean;
  searchQuery: string;
  rowIndex?: number;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}

// repColor imported from status-vocabulary

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="provider-highlight">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

type SortColumn = 'label' | 'status' | 'accountId' | 'group' | 'latency' | 'tps' | 'reliability' | 'reputation' | 'models';
type SortDir = 'asc' | 'desc';

const ProviderTableRow: React.FC<ProviderRowProps & { isExpanded?: boolean; onToggleExpand?: () => void }> = ({ apiKey, onSelect, onCheckHealth, onToggleStatus, onRemoveKey, isChecking, searchQuery, isExpanded, onToggleExpand, rowIndex, isDragging, isDragOver, onDragStart, onDragOver, onDrop }) => {
  const { t } = useTranslation();
  const status = statusBadge(apiKey.status);
  const reputation = apiKey.stats?.extended?.reputationScore || 0;
  const modelCount = apiKey.availableModels?.length || 0;

  const [testPrompt, setTestPrompt] = useState('');
  const [testModel, setTestModel] = useState('');
  const [testTemperature, setTestTemperature] = useState(0.7);
  const [testMaxTokens, setTestMaxTokens] = useState(1024);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<{ content: string; latency?: number; model?: string } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const isMountedRef = useRef(true);
  const testPromptRef = React.useRef(testPrompt);
  testPromptRef.current = testPrompt;

  const handleTest = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (!testPrompt.trim() || testStatus === 'loading') return;
    setTestStatus('loading');
    setTestResult(null);
    setTestError(null);
  };

  React.useEffect(() => {
    if (testStatus !== 'loading') return;
    isMountedRef.current = true;

    const prompt = testPromptRef.current;
    if (!prompt.trim()) return;

    const reqId = `quick-test-tbl-${apiKey.id}-${crypto.randomUUID().slice(0,6)}`;
    let start = Date.now();
    let isDone = false;

    let defaultModel = 'auto';
    const p = apiKey.provider.toLowerCase();
    if (p === 'groq') defaultModel = 'llama-3.1-8b-instant';
      else if (p === 'openrouter') defaultModel = 'openrouter/auto';
    else if (p === 'gemini') defaultModel = 'gemini-3.1-flash-lite';
    else if (p === 'anthropic') defaultModel = 'claude-3-haiku-20240307';
    else if (p === 'openai') defaultModel = 'gpt-4o-mini';

    const resolvedModel = testModel || apiKey.availableModels?.[0] || defaultModel;

    eventBus.emit(EVENTS.SEND_MESSAGE, {
      provider: p,
      model: resolvedModel,
      messages: [{ role: 'user', content: prompt }],
      requestId: reqId,
      keyId: apiKey.id,
      options: { temperature: testTemperature, maxTokens: testMaxTokens },
    });

    const subResp = eventBus.on(EVENTS.MESSAGE_RESPONSE, (res) => {
      if (!isMountedRef.current) return;
      if (res.requestId === reqId && !isDone) {
        isDone = true;
        if (res.status === 'error') {
          setTestStatus('error');
          setTestError(res.error || 'Unknown error');
        } else {
          setTestStatus('success');
          setTestResult({ content: res.content, latency: Date.now() - start, model: resolvedModel });
        }
      }
    });
    
    const subStreamEnd = eventBus.on('chat:stream:end', ({ requestId, fullContent }) => {
      if (!isMountedRef.current) return;
      if (requestId === reqId && !isDone) {
        isDone = true;
        setTestStatus('success');
        setTestResult({ content: fullContent, latency: Date.now() - start, model: resolvedModel });
      }
    });

    const subStreamErr = eventBus.on('chat:stream:error', ({ requestId, error }) => {
      if (!isMountedRef.current) return;
      if (requestId === reqId && !isDone) {
        isDone = true;
        setTestStatus('error');
        setTestError(error || 'Stream error');
      }
    });

    const timeout = setTimeout(() => {
      if (!isMountedRef.current) return;
      if (!isDone) {
        isDone = true;
        setTestStatus('error');
        setTestError('Request timed out');
      }
    }, 15000);

    return () => {
      isMountedRef.current = false;
      subResp(); subStreamEnd(); subStreamErr(); clearTimeout(timeout);
    };
  }, [testStatus, apiKey.id, apiKey.availableModels, testModel, testTemperature, testMaxTokens]);

  return (
    <>
    <tr 
      draggable={true}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => onSelect(apiKey, 'overview')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(apiKey, 'overview'); } }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${apiKey.label}`}
      style={{ opacity: isDragging ? 0.4 : 1, borderBottom: isDragOver ? '2px solid #3b82f6' : undefined, cursor: 'grab' }}
    >
      <td style={{ width: 32, textAlign: 'center', cursor: 'grab' }}>
        <GripVertical size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
      </td>
      <td>
        <div className="provider-inline-flex" style={{ gap: '0.75rem' }}>
          <ProviderIcon provider={apiKey.provider} size={18} />
          <div>
            <div className="provider-name-label">{highlightText(apiKey.label, searchQuery)}</div>
            <div className="provider-name-sub">{highlightText(apiKey.provider, searchQuery)}</div>
          </div>
        </div>
      </td>
      <td>
        <span className="provider-status-badge" style={{ color: status.color, background: status.bg }}
          title={apiKey.status === 'error' && apiKey.stats?.lastError?.message ? apiKey.stats.lastError.message : t(status.labelKey)}>
          {status.icon} {t(status.labelKey)}
          {apiKey.status === 'error' && apiKey.stats?.lastError?.message && (
            <span style={infoIcon}>ⓘ</span>
          )}
        </span>
        {(() => {
          const ks = keyStateStore?.get?.(apiKey.id);
          if (!ks) return null;
          const band = getHealthBand(ks.healthScore);
          const bandColors: Record<string, string> = { healthy: '#10b981', warm: '#f59e0b', degraded: '#f97316', cooling: '#ef4444', dead: '#dc2626' };
          const c = bandColors[band] || '#64748b';
          return <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 8, fontSize: '0.6rem', fontWeight: 700, color: c, background: `${c}18`, textTransform: 'uppercase' }} title={`Health score: ${ks.healthScore}/100 — ${band}`}>{band} {ks.healthScore}</span>;
        })()}
        {apiKey.expiresAt && (
          <span style={{ marginLeft: 4, fontSize: '0.6rem', padding: '1px 4px', borderRadius: 4, background: apiKey.expiresAt < Date.now() ? 'rgba(239,68,68,0.15)' : apiKey.expiresAt < Date.now() + 7 * 86400000 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', color: apiKey.expiresAt < Date.now() ? '#ef4444' : apiKey.expiresAt < Date.now() + 7 * 86400000 ? '#f59e0b' : '#94a3b8' }}>
            {new Date(apiKey.expiresAt).toLocaleDateString()}
          </span>
        )}
      </td>
      <td style={posRelative}>
        <div className="provider-action-group">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleStatus(apiKey.id); }}
            className={`provider-action-btn ${apiKey.status === 'active' ? 'provider-action-btn--active' : 'provider-action-btn--inactive'}`}
            title={apiKey.status === 'active' ? t('provider.disable') : t('provider.enable')}
          >
            {apiKey.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if (!isChecking) onCheckHealth(apiKey.id); }}
            className={`provider-action-btn${isChecking ? ' provider-action-btn--checking' : ''}`}
            disabled={isChecking}
            title={isChecking ? t('provider.checking_health') : t('provider.check_health')}
          >
            <RefreshCw size={14} className={isChecking ? 'provider-spin' : ''} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleExpand && onToggleExpand(); }}
            className={`provider-action-btn ${isExpanded ? 'provider-action-btn--active' : ''}`}
            title={t('provider.tooltip_quick_test')}
          >
            <Terminal size={14} />
          </button>
          {confirmRemove ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveKey(apiKey.id); }}
              className="provider-action-btn provider-action-btn--danger"
              title={t('provider.tooltip_confirm_remove')}
            >
              <AlertTriangle size={14} />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmRemove(true); }}
              className="provider-action-btn provider-action-btn--remove"
              title={t('provider.tooltip_remove')}
            >
              <Trash2 size={14} />
            </button>
          )}
          {confirmRemove && (
            <div style={{ position: 'absolute', top: '100%', right: 0, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: '#fca5a5', whiteSpace: 'nowrap', zIndex: 10, marginTop: 4 }}>
              {t('provider.confirm_remove')} <button onClick={(e) => { e.stopPropagation(); setConfirmRemove(false); }} style={{ color: '#94a3b8', textDecoration: 'underline', marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>{t('common.cancel')}</button>
            </div>
          )}
        </div>
      </td>
      <td style={{ fontSize: '0.72rem', verticalAlign: 'middle' }}>
        {(() => {
          const usage = apiKey.stats?.extended?.usageToday;
          const quota = apiKey.stats?.extended?.rules?.quota;
          const tokensUsed = usage?.tokens || 0;
          const tokensLimit = quota?.tokensPerDay || 0;
          if (!tokensLimit) return '\u2014';
          const pct = tokensUsed / tokensLimit;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600 }}>
                <span>{t('provider.tokens_short')}</span>
                <span style={{ color: pct > 0.8 ? '#ef4444' : pct > 0.5 ? '#f59e0b' : '#10b981' }}>
                  {tokensUsed.toLocaleString()}/{tokensLimit.toLocaleString()}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, pct * 100)}%`, borderRadius: 2, background: pct > 0.8 ? '#ef4444' : pct > 0.5 ? '#f59e0b' : '#10b981' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 600, marginTop: 1 }}>
                <span>{t('provider.requests_short')}</span>
                <span style={{ color: (usage?.requests || 0) > (quota?.requestsPerDay || 0) ? '#ef4444' : '#94a3b8' }}>
                  {(usage?.requests || 0).toLocaleString()}/{Math.min(quota?.requestsPerDay || 0, tokensLimit).toLocaleString()}
                </span>
              </div>
            </div>
          );
        })()}
      </td>
      <td className="provider-table-cell-value">
        {apiKey.group || apiKey.account || apiKey.accountId ? (
          <span className="provider-account-badge" title={`${apiKey.group ? apiKey.group + ' / ' : ''}${apiKey.account || apiKey.accountId || ''}`}>
            {apiKey.group && <span style={{ opacity: 0.6 }}>{apiKey.group}/</span>}{apiKey.account || apiKey.accountId || '—'}
          </span>
        ) : (
          <span className="provider-empty-cell">—</span>
        )}
      </td>
      <td className="provider-table-cell-value">
        {apiKey.stats?.avgLatency ? `${Math.round(apiKey.stats.avgLatency)}ms` : '\u2014'}
      </td>
      <td className="provider-table-cell-value">
        {typeof apiKey.stats?.extended?.latencyBreakdown?.tokensPerSec === 'number' 
          ? apiKey.stats.extended.latencyBreakdown.tokensPerSec.toFixed(1) 
          : '\u2014'}
      </td>
      <td className="provider-table-cell-value">
        {apiKey.stats?.successCount || apiKey.stats?.errorCount 
          ? `${Math.round((apiKey.stats.successCount / (apiKey.stats.successCount + apiKey.stats.errorCount)) * 100)}%`
          : 'N/A'}
      </td>
      <td>
        <div className="provider-inline-flex">
          <div className="provider-rep-bar">
            <div className="provider-rep-fill" style={{ width: `${reputation}%`, background: repColor(reputation) }} />
          </div>
          <span className="provider-rep-text" style={{ color: repColor(reputation) }}>{reputation}</span>
        </div>
      </td>
      <td>
        {modelCount > 0 && (
          <span className="provider-model-badge" title={`${modelCount} model${modelCount > 1 ? 's' : ''}`}>
            <Layers size={12} /> {modelCount}
          </span>
        )}
      </td>
      <td style={textXs}>
        {apiKey.notes && apiKey.notes.length > 0 ? (
          <span style={{ color: '#94a3b8', cursor: 'default' }} title={apiKey.notes.map(n => n.text).join(' | ')}>
            {apiKey.notes.length}
          </span>
        ) : '\u2014'}
      </td>
      <td>
        {apiKey.tags && apiKey.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              {apiKey.tags.map(tag => (
                <TagPill key={tag} tag={tag} />
              ))}
          </div>
        )}
      </td>
    </tr>
    {isExpanded && (
      <tr>
        <td colSpan={14} style={{ padding: '1rem', background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <textarea
              value={testPrompt}
              onChange={e => setTestPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTest(e); } }}
              placeholder={t('provider.test_prompt_placeholder', { label: apiKey.label })}
              rows={1}
              style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', resize: 'none', fontSize: '0.85rem', outline: 'none' }}
            />
            {apiKey.availableModels && apiKey.availableModels.length > 0 && (
              <select
                value={testModel}
                onChange={e => setTestModel(e.target.value)}
                style={selectSmall}
                aria-label={t('provider.select_model')}
              >
                <option value="">{t('provider.default_model')}</option>
                {apiKey.availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
            <button 
              onClick={handleTest} 
              disabled={!testPrompt.trim() || testStatus === 'loading'} 
              className="btn-primary" 
              style={iconBtn36}
            >
              {testStatus === 'loading' ? <Loader2 size={16} className="provider-spin" /> : <Send size={16} />}
            </button>
          </div>
          {testStatus === 'success' && testResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={successBox}>
              <div style={flexBetweenSuccessLabel}>
                <span>{testResult.model}</span>
                <span>{testResult.latency}ms</span>
              </div>
              <div style={textResultBox}>
                {testResult.content}
              </div>
            </motion.div>
          )}
          {testStatus === 'error' && testError && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={errorBox}>
              <div style={textErrorLabel}>{t('common.error').toUpperCase()}</div>
              <div style={textErrorContent}>{testError}</div>
            </motion.div>
          )}
          {apiKey.notes && apiKey.notes.length > 0 && (
            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: '0.75rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{t('common.notes')}</div>
              {apiKey.notes.map(n => (
                <div key={n.id} style={{ color: '#94a3b8', marginBottom: '0.15rem' }}>
                  <span style={{ color: '#64748b', fontSize: '0.65rem' }}>{new Date(n.timestamp).toLocaleDateString()}</span>
                  {' '}{n.text}
                </div>
              ))}
            </div>
          )}
        </td>
      </tr>
    )}
    </>
  );
};

const ProviderCard: React.FC<ProviderRowProps> = ({ apiKey, onSelect, onCheckHealth, onToggleStatus, onRemoveKey, isChecking, searchQuery }) => {
  const { t } = useTranslation();
  const [testPrompt, setTestPrompt] = useState('');
  const [testModel, setTestModel] = useState('');
  const [testTemperature, setTestTemperature] = useState(0.7);
  const [testMaxTokens, setTestMaxTokens] = useState(1024);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<{ content: string; latency?: number; model?: string } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeExpanded, setProbeExpanded] = useState(false);
  const status = statusBadge(apiKey.status);
  const reputation = apiKey.stats?.extended?.reputationScore || 0;
  const modelCount = apiKey.availableModels?.length || 0;

  const cardIsMountedRef = useRef(true);
  const testPromptRef = React.useRef(testPrompt);
  testPromptRef.current = testPrompt;

  const handleTest = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    if (!testPrompt.trim() || testStatus === 'loading') return;
    setTestStatus('loading');
    setTestResult(null);
    setTestError(null);
  };

  React.useEffect(() => {
    if (testStatus !== 'loading') return;
    cardIsMountedRef.current = true;

    const prompt = testPromptRef.current;
    if (!prompt.trim()) return;

    const reqId = `quick-test-${apiKey.id}-${crypto.randomUUID().slice(0,6)}`;
    let start = Date.now();
    let isDone = false;

    let defaultModel = 'auto';
    const p = apiKey.provider.toLowerCase();
    if (p === 'groq') defaultModel = 'llama-3.1-8b-instant';
      else if (p === 'openrouter') defaultModel = 'openrouter/auto';
    else if (p === 'gemini') defaultModel = 'gemini-3.1-flash-lite';
    else if (p === 'anthropic') defaultModel = 'claude-3-haiku-20240307';
    else if (p === 'openai') defaultModel = 'gpt-4o-mini';

    const resolvedModel = testModel || apiKey.availableModels?.[0] || defaultModel;

    eventBus.emit(EVENTS.SEND_MESSAGE, {
      provider: p,
      model: resolvedModel,
      messages: [{ role: 'user', content: prompt }],
      requestId: reqId,
      keyId: apiKey.id,
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
          setTestResult({ content: res.content, latency: Date.now() - start, model: resolvedModel });
        }
      }
    });
    
    const subStreamEnd = eventBus.on('chat:stream:end', ({ requestId, fullContent }) => {
      if (!cardIsMountedRef.current) return;
      if (requestId === reqId && !isDone) {
        isDone = true;
        setTestStatus('success');
        setTestResult({ content: fullContent, latency: Date.now() - start, model: resolvedModel });
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
      subResp(); subStreamEnd(); clearTimeout(timeout);
    };
  }, [testStatus, apiKey.id, apiKey.availableModels, testModel]);

  return (
    <motion.div
      onClick={() => onSelect(apiKey, 'overview')}
      className="glass-panel provider-card-item"
      style={posRelative}
      whileHover={{ scale: 1.01, borderColor: 'rgba(59,130,246,0.3)' }}
      whileTap={{ scale: 0.98 }}
    >
      {isChecking && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <Loader2 size={20} className="provider-spin" color="#3b82f6" />
        </div>
      )}
      <div className="provider-inline-flex" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div className="provider-inline-flex" style={{ gap: '1rem' }}>
          <div className="provider-card-icon-box">
            <ProviderIcon provider={apiKey.provider} size={20} />
          </div>
          <div>
            <div className="provider-card-title">{highlightText(apiKey.label, searchQuery)}</div>
            <div className="provider-name-sub" style={textXs}>{highlightText(apiKey.provider, searchQuery)}</div>
          </div>
        </div>
        <div className="provider-card-end">
            <span className="provider-status-badge" style={{ color: status.color, background: status.bg }}
              title={apiKey.status === 'error' && apiKey.stats?.lastError?.message ? apiKey.stats.lastError.message : t(status.labelKey)}>
              {status.icon} {t(status.labelKey)}
            {apiKey.status === 'error' && apiKey.stats?.lastError?.message && (
              <span style={infoIcon} title={apiKey.stats.lastError.message}>ⓘ</span>
            )}
          </span>
          {(() => {
            const ks = keyStateStore?.get?.(apiKey.id);
            if (!ks) return null;
            const band = getHealthBand(ks.healthScore);
            const bandColors: Record<string, string> = { healthy: '#10b981', warm: '#f59e0b', degraded: '#f97316', cooling: '#ef4444', dead: '#dc2626' };
            const c = bandColors[band] || '#64748b';
            return <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 8, fontSize: '0.6rem', fontWeight: 700, color: c, background: `${c}18`, textTransform: 'uppercase' }} title={`Health score: ${ks.healthScore}/100 — ${band}`}>{band} {ks.healthScore}</span>;
          })()}
          {apiKey.expiresAt && (
            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block', background: apiKey.expiresAt < Date.now() ? 'rgba(239,68,68,0.15)' : apiKey.expiresAt < Date.now() + 7 * 86400000 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', color: apiKey.expiresAt < Date.now() ? '#ef4444' : apiKey.expiresAt < Date.now() + 7 * 86400000 ? '#f59e0b' : '#94a3b8' }}>
              {apiKey.expiresAt < Date.now() ? `${t('provider.expired')}: ` : `${t('provider.expires')}: `}{new Date(apiKey.expiresAt).toLocaleDateString()}
            </span>
          )}
          {apiKey.tags && apiKey.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {apiKey.tags.map(tag => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>
          )}
          {(() => {
            const alerts = keyService.getAlerts().filter(a => a.keyId === apiKey.id);
            if (alerts.length === 0) return null;
            return <span style={{ marginLeft: 8, fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }} title={alerts.map(a => a.message).join('; ')}>⚠ {alerts.length}</span>;
          })()}
          <div className="provider-inline-flex" style={{ gap: '0.4rem', marginTop: '0.25rem' }}>
            <div className="provider-rep-bar">
              <div className="provider-rep-fill" style={{ width: `${reputation}%`, background: repColor(reputation) }} />
            </div>
            <span className="provider-rep-text" style={{ fontSize: '0.65rem', color: repColor(reputation) }}>{reputation} REP</span>
          </div>
          {(apiKey.group || apiKey.account || apiKey.accountId) && (
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {apiKey.group && <span style={{ opacity: 0.6 }}>{apiKey.group}/</span>}{apiKey.account || apiKey.accountId}
            </div>
          )}
        </div>
      </div>

      <div className="provider-card-metric-grid">
        <div className="provider-card-metric-cell">
          <div className="provider-metric-label">{t('provider.latency_label')}</div>
          <div className="provider-metric-value">{apiKey.stats?.avgLatency ? `${Math.round(apiKey.stats.avgLatency)}ms` : '\u2014'}</div>
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

      {/* Health bar */}
      {(() => {
        const ks = keyStateStore?.get?.(apiKey.id);
        if (!ks) return null;
        const band = getHealthBand(ks.healthScore);
        const bandColors: Record<string, string> = { healthy: '#10b981', warm: '#f59e0b', degraded: '#f97316', cooling: '#ef4444', dead: '#dc2626' };
        const c = bandColors[band] || '#64748b';
        return (
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.6rem', color: '#64748b', minWidth: 48, fontWeight: 700 }}>HEALTH</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, ks.healthScore)}%`, height: '100%', borderRadius: 3, background: c }} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: c, minWidth: 28, textAlign: 'right' }}>{ks.healthScore}</span>
          </div>
        );
      })()}

      {/* Usage bar */}
      {(() => {
        const stats = apiKey.stats?.extended;
        const usage = stats?.usageToday;
        if (!usage?.requests && !usage?.tokens) return null;
        const reqLimit = stats?.rules?.quota?.requestsPerDay;
        const tokLimit = stats?.rules?.quota?.tokensPerDay;
        return (
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {reqLimit && reqLimit > 0 && (
              <div style={flexCenterGap6px}>
                <span style={{ fontSize: '0.6rem', color: '#64748b', minWidth: 48 }}>{usage.requests}/{reqLimit}</span>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (usage.requests / reqLimit) * 100)}%`, height: '100%', borderRadius: 2, background: usage.requests / reqLimit > 0.8 ? '#ef4444' : usage.requests / reqLimit > 0.5 ? '#f59e0b' : '#3b82f6' }} />
                </div>
              </div>
            )}
            {tokLimit && tokLimit > 0 && (
              <div style={flexCenterGap6px}>
                <span style={{ fontSize: '0.6rem', color: '#64748b', minWidth: 48 }}>{(usage.tokens / 1000).toFixed(0)}k/{(tokLimit / 1000).toFixed(0)}k</span>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (usage.tokens / tokLimit) * 100)}%`, height: '100%', borderRadius: 2, background: usage.tokens / tokLimit > 0.8 ? '#ef4444' : usage.tokens / tokLimit > 0.5 ? '#f59e0b' : '#10b981' }} />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div className="provider-inline-flex" style={{ justifyContent: 'space-between', marginTop: '0.75rem' }}>
        {modelCount > 0 && (
          <span className="provider-model-badge">
            <Layers size={12} /> {modelCount} model{modelCount > 1 ? 's' : ''}
          </span>
        )}
        <div className="provider-action-group" style={{ marginLeft: 'auto' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleStatus(apiKey.id); }}
            className={`provider-action-btn ${apiKey.status === 'active' ? 'provider-action-btn--active' : 'provider-action-btn--inactive'}`}
            title={apiKey.status === 'active' ? t('provider.disable') : t('provider.enable')}
          >
            {apiKey.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              setProbeLoading(true);
              setProbeResult(null);
              try {
                const results = await probeService.probeForDebate([{ id: apiKey.id, provider: apiKey.provider, modelId: apiKey.model }]);
                setProbeResult(results.get(apiKey.id) || null);
              } finally {
                setProbeLoading(false);
              }
            }}
            className="provider-action-btn"
            disabled={probeLoading}
            title={t('provider.tooltip_probe')}
          >
            {probeLoading ? <Loader2 size={14} className="provider-spin" /> : <Activity size={14} color="#a855f7" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); if (!isChecking) onCheckHealth(apiKey.id); }}
            className={`provider-action-btn${isChecking ? ' provider-action-btn--checking' : ''}`}
            disabled={isChecking}
            title={isChecking ? t('provider.checking_health') : t('provider.check_health')}
          >
            <RefreshCw size={14} className={isChecking ? 'provider-spin' : ''} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(apiKey, 'sandbox'); }}
            className="provider-action-btn provider-action-btn--sandbox"
            title={t('provider.tooltip_open_sandbox')}
          >
            <Terminal size={14} />
          </button>
          {confirmRemove ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveKey(apiKey.id); }}
              className="provider-action-btn provider-action-btn--danger"
              title={t('provider.tooltip_confirm_remove')}
            >
              <AlertTriangle size={14} />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmRemove(true); }}
              className="provider-action-btn provider-action-btn--remove"
              title={t('provider.tooltip_remove')}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      {confirmRemove && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: '0.75rem', color: '#fca5a5', textAlign: 'center' }}>
          {t('provider.confirm_remove')} <button onClick={(e) => { e.stopPropagation(); setConfirmRemove(false); }} style={{ color: '#94a3b8', textDecoration: 'underline', marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>{t('common.cancel')}</button>
        </div>
      )}
      {/* Probe result inline */}
      {probeResult && (
        <div>
          <div
            onClick={(e) => { e.stopPropagation(); setProbeExpanded(!probeExpanded); }}
            style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 8, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: probeResult.status === 'ready' ? 'rgba(16,185,129,0.08)' : probeResult.status === 'broken' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)' }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: probeResult.status === 'ready' ? '#10b981' : probeResult.status === 'broken' ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', color: probeResult.status === 'ready' ? '#10b981' : probeResult.status === 'broken' ? '#ef4444' : '#f59e0b' }}>{probeResult.status}</span>
            {probeResult.latency > 0 && <span style={textSecondary}>{probeResult.latency}ms</span>}
            <span style={textSecondary}>quota: {probeResult.quotaRemaining ?? '?'}</span>
            {probeResult.error && <span style={{ color: '#ef4444', marginLeft: 'auto', fontSize: '0.7rem' }}>{probeResult.error.slice(0, 40)}</span>}
            {probeResult.status === 'ready' && <CheckCircle2 size={12} color="#10b981" style={{ marginLeft: 'auto' }} />}
            <span style={{ color: '#475569', fontSize: '0.65rem', marginLeft: probeResult.error ? 4 : 'auto' }}>{probeExpanded ? '▲' : '▼'}</span>
          </div>
          {probeExpanded && probeResult.responseContent && (
            <div style={{ marginTop: '0.25rem', padding: '0.5rem 0.7rem', borderRadius: 8, background: 'rgba(0,0,0,0.15)', fontSize: '0.78rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 150, overflowY: 'auto', lineHeight: 1.4 }}>
              {probeResult.responseContent}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{t('provider.quick_test')}</div>
        <div style={flexWrapGap2}>
          <textarea
            value={testPrompt}
            onChange={e => setTestPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTest(e); } }}
            placeholder={t('provider.enter_prompt')}
            rows={1}
            style={{ flex: 1, minWidth: 120, padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', resize: 'none', fontSize: '0.85rem', outline: 'none' }}
          />
          {apiKey.availableModels && apiKey.availableModels.length > 0 && (
            <select
              value={testModel}
              onChange={e => setTestModel(e.target.value)}
              style={selectSmall}
              aria-label={t('provider.select_model')}
            >
              <option value="">{t('provider.default_model')}</option>
              {apiKey.availableModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
          <button 
            onClick={handleTest} 
            disabled={!testPrompt.trim() || testStatus === 'loading'} 
            className="btn-primary" 
            style={iconBtn36}
          >
            {testStatus === 'loading' ? <Loader2 size={16} className="provider-spin" /> : <Send size={16} />}
          </button>
        </div>
        
        {testStatus === 'success' && testResult && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={successBox}>
            <div style={flexBetweenSuccessLabel}>
              <span>{testResult.model}</span>
              <span>{testResult.latency}ms</span>
            </div>
            <div style={textResultBox}>
              {testResult.content}
            </div>
          </motion.div>
        )}
        {testStatus === 'error' && testError && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={errorBox}>
            <div style={textErrorLabel}>{t('common.error').toUpperCase()}</div>
            <div style={textErrorContent}>{testError}</div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

type SortFn = (a: ApiKey, b: ApiKey) => number;

const SORT_FNS: Record<SortColumn, (dir: SortDir) => SortFn> = {
  label:      dir => (a, b) => dir === 'asc' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label),
  status:     dir => (a, b) => dir === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status),
  accountId:  dir => (a, b) => dir === 'asc' ? (a.accountId || '').localeCompare(b.accountId || '') : (b.accountId || '').localeCompare(a.accountId || ''),
  group:      dir => (a, b) => dir === 'asc' ? (a.group || '').localeCompare(b.group || '') : (b.group || '').localeCompare(a.group || ''),
  latency:    dir => (a, b) => dir === 'asc' ? (a.stats?.avgLatency || 0) - (b.stats?.avgLatency || 0) : (b.stats?.avgLatency || 0) - (a.stats?.avgLatency || 0),
  tps:        dir => (a, b) => dir === 'asc' ? (a.stats?.extended?.latencyBreakdown?.tokensPerSec || 0) - (b.stats?.extended?.latencyBreakdown?.tokensPerSec || 0) : (b.stats?.extended?.latencyBreakdown?.tokensPerSec || 0) - (a.stats?.extended?.latencyBreakdown?.tokensPerSec || 0),
  reliability: dir => (a, b) => {
    const ra = a.stats?.successCount && a.stats?.errorCount ? a.stats.successCount / (a.stats.successCount + a.stats.errorCount) : 1;
    const rb = b.stats?.successCount && b.stats?.errorCount ? b.stats.successCount / (b.stats.successCount + b.stats.errorCount) : 1;
    return dir === 'asc' ? ra - rb : rb - ra;
  },
  reputation: dir => (a, b) => dir === 'asc' ? (a.stats?.extended?.reputationScore || 0) - (b.stats?.extended?.reputationScore || 0) : (b.stats?.extended?.reputationScore || 0) - (a.stats?.extended?.reputationScore || 0),
  models:     dir => (a, b) => dir === 'asc' ? (a.availableModels?.length || 0) - (b.availableModels?.length || 0) : (b.availableModels?.length || 0) - (a.availableModels?.length || 0),
};

const COLUMNS: { key: string; label: string; labelKey?: string }[] = [
  { key: 'drag', label: '' },
  { key: 'label', label: 'Provider', labelKey: 'provider.column.provider' },
  { key: 'status', label: 'Status', labelKey: 'provider.column.status' },
  { key: 'actions', label: '' },
  { key: 'quota', label: 'Quota', labelKey: 'provider.column.quota' },
  { key: 'group', label: 'Group', labelKey: 'provider.column.group' },
  { key: 'accountId', label: 'Account', labelKey: 'provider.column.account' },
  { key: 'latency', label: 'Latency', labelKey: 'provider.column.latency' },
  { key: 'tps', label: 'TPS', labelKey: 'provider.column.tps' },
  { key: 'reliability', label: 'Reliability', labelKey: 'provider.column.reliability' },
  { key: 'reputation', label: 'Reputation', labelKey: 'provider.column.reputation' },
  { key: 'models', label: 'Models', labelKey: 'provider.column.models' },
  { key: 'notes', label: 'Notes', labelKey: 'provider.column.notes' },
  { key: 'label', label: 'Tags', labelKey: 'provider.column.tags' },
];

const InstalledProvidersView: React.FC<InstalledProvidersViewProps> = React.memo(({ keys, onSelect, onCheckHealth, onToggleStatus, onRemoveKey, onEnableAll, onDisableAll, checkingIds, onReorder }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [sortColumn, setSortColumn] = useState<SortColumn>('label');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isLight, setIsLight] = useState(() => { try { return settingsService.getSettings().theme === 'light'; } catch { return false; } });
  const [batchProbeResults, setBatchProbeResults] = useState<Map<string, ProbeResult> | null>(null);
  const [batchProbeLoading, setBatchProbeLoading] = useState(false);
  const [expandedBatchProbe, setExpandedBatchProbe] = useState<string | null>(null);

  useEffect(() => {
    const unsub = settingsService.subscribe((s) => setIsLight(s.theme === 'light'));
    return () => { unsub(); };
  }, []);

  const toggleTheme = () => {
    settingsService.updateSettings({ theme: isLight ? 'dark' : 'light' });
  };

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  };

  const handleDragStart = (idx: number) => {
    setDragIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx || !onReorder) return;
    const keyId = sortedKeys[dragIndex].id;
    onReorder(keyId, idx);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const uniqueGroups = useMemo(() => {
    const gs = new Set(keys.map(k => k.group).filter(Boolean));
    return Array.from(gs).sort();
  }, [keys]);

  const filteredKeys = useMemo(() => keys.filter(k =>
    (statusFilter === 'all' || k.status === statusFilter) &&
    (groupFilter === 'all' || k.group === groupFilter) &&
    (k.label.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    k.provider.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    (k.group || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    (k.account || k.accountId || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    (k.notes || []).some(n => n.text.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
    (k.tags || []).some(t => t.toLowerCase().includes(debouncedSearch.toLowerCase())))
  ), [keys, debouncedSearch, statusFilter, groupFilter]);

  const sortedKeys = useMemo(() => {
    if (!sortColumn) return filteredKeys;
    return [...filteredKeys].sort(SORT_FNS[sortColumn](sortDir));
  }, [filteredKeys, sortColumn, sortDir]);

  const SortIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div style={flexColGap4}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        <div className="provider-inline-flex" style={{ gap: '1rem', justifyContent: 'space-between' }}>
          <div className="provider-inline-flex" style={{ gap: '1rem' }}>
            <div className="provider-search-wrapper">
              <Search className="provider-search-icon" size={18} />
              <input
                type="text"
                placeholder={t('provider.search_placeholder')}
                aria-label={t('provider.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="provider-search-input"
              />
            </div>
            <div className="provider-view-toggle">
              <button 
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={viewMode === 'table' ? 'provider-view-toggle--active' : 'provider-view-toggle--inactive'}
              >
                {t('provider.table_view')}
              </button>
              <button 
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                className={viewMode === 'cards' ? 'provider-view-toggle--active' : 'provider-view-toggle--inactive'}
              >
                {t('provider.card_view')}
              </button>
            </div>
          </div>
          <div className="provider-inline-flex" style={gap2}>
            <button
              onClick={async () => {
                setBatchProbeLoading(true);
                setBatchProbeResults(null);
                try {
                  const results = await probeService.probeAll();
                  const map = new Map<string, ProbeResult>();
                  for (const r of results) map.set(r.keyId, r);
                  setBatchProbeResults(map);
                } finally {
                  setBatchProbeLoading(false);
                }
              }}
              className="btn-secondary"
              disabled={batchProbeLoading}
              style={{ color: '#3b82f6' }}
            >
              {batchProbeLoading ? <Loader2 size={14} className="provider-spin" /> : <Activity size={14} />}
              {t('provider.quick_test_all')}
            </button>
            <button onClick={onEnableAll} className="btn-secondary">
              <Power size={16} /> {t('provider.enable_all')}
            </button>
            <button onClick={onDisableAll} className="btn-secondary">
              <PowerOff size={16} /> {t('provider.disable_all')}
            </button>
            <button onClick={toggleTheme} className="btn-secondary" title={isLight ? t('common.switch_to_dark') : t('common.switch_to_light')} aria-label={t('common.toggle_theme')}>
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </div>
        <div className="provider-inline-flex" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'active', 'inactive', 'error', 'checking', 'quota_exhausted', 'pending', 'invalid'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                ...activeToggleStyle(statusFilter === status),
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
              }}
            >
              {status === 'all' ? t('provider.filter_all') : t(`provider.status.${status}`)}
            </button>
          ))}
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            style={{ marginLeft: 'auto', padding: '0.3rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: '0.75rem' }}
            aria-label="Filter by group"
          >
            <option value="all">{t('provider.all_groups')}</option>
            {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Batch Quick Test results */}
      {batchProbeResults && batchProbeResults.size > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '0.75rem 1rem', borderRadius: 12, background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.1)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.25rem' }}>
            {t('provider.quick_test_results')}
            <span style={{ marginLeft: 8, color: '#64748b', fontWeight: 400 }}>
              {t('provider.batch_ready_count', { ready: Array.from(batchProbeResults.values()).filter(r => r.status === 'ready').length, total: batchProbeResults.size })}
            </span>
          </div>
          {Array.from(batchProbeResults.entries()).map(([id, r]) => {
            const key = keys.find(k => k.id === id);
            const statusColors: Record<string, string> = { ready: '#10b981', degraded: '#f59e0b', limited: '#f97316', broken: '#ef4444', unknown: '#64748b' };
            const c = statusColors[r.status] || '#64748b';
            const isExpanded = expandedBatchProbe === id;
            const preview = r.responseContent ? r.responseContent.slice(0, 50) + (r.responseContent.length > 50 ? '…' : '') : undefined;
            return (
              <div key={id}>
                <div
                  onClick={() => setExpandedBatchProbe(isExpanded ? null : id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: isExpanded ? '8px 8px 0 0' : 8, background: 'rgba(0,0,0,0.2)', cursor: 'pointer', fontSize: '0.78rem', border: isExpanded ? '1px solid rgba(59,130,246,0.12)' : '1px solid transparent', borderBottom: isExpanded ? 'none' : '1px solid transparent' }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ color: '#e2e8f0', fontWeight: 600, minWidth: 80, flexShrink: 0 }}>{key?.label || r.provider || id}</span>
                  <span style={{ color: c, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', minWidth: 40, flexShrink: 0 }}>{r.status}</span>
                  {r.latency > 0 && <span style={{ color: '#475569', fontSize: '0.7rem', minWidth: 35, flexShrink: 0 }}>{r.latency}ms</span>}
                  {preview ? (
                    <span style={{ color: '#94a3b8', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{preview}</span>
                  ) : r.error ? (
                    <span style={{ color: '#ef4444', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{r.error}</span>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '0.7rem', fontStyle: 'italic', flex: 1, minWidth: 0 }}>{t('provider.no_response')}</span>
                  )}
                  <span style={{ color: '#475569', fontSize: '0.6rem', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
                {isExpanded && (
                  <div style={{ padding: '8px 12px', borderRadius: '0 0 8px 8px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(59,130,246,0.12)', borderTop: 'none', fontSize: '0.78rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 150, overflowY: 'auto', lineHeight: 1.4 }}>
                    {r.responseContent || <span style={textSecondaryItalic}>{t('provider.no_response')}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sortedKeys.length > 0 ? (
        viewMode === 'table' ? (
          <div className="provider-table-wrapper">
            <table className="provider-table">
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.key + '-' + col.label} onClick={() => col.key !== 'drag' ? handleSort(col.key as SortColumn) : undefined} className={col.key !== 'drag' ? 'provider-sort-header' : ''} aria-sort={col.key !== 'drag' && sortColumn === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} style={col.key === 'drag' ? { width: 32, minWidth: 32 } : undefined}>
                      {col.label && (
                        <div className="provider-inline-flex" style={{ gap: '0.3rem' }}>
              {col.labelKey ? t(col.labelKey) : col.label}
                          {sortColumn === col.key ? <SortIcon size={12} /> : <ArrowUpDown size={12} className="provider-sort-icon-inactive" />}
                        </div>
            )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody onDragEnd={handleDragEnd}>
                {sortedKeys.map((k, idx) => (
                  <ProviderTableRow 
                    key={k.id} 
                    apiKey={k} 
                    onSelect={onSelect} 
                    onCheckHealth={onCheckHealth} 
                    onToggleStatus={onToggleStatus} 
                    onRemoveKey={onRemoveKey}
                    isChecking={checkingIds.has(k.id)} 
                    searchQuery={searchQuery} 
                    isExpanded={expandedRowId === k.id}
                    onToggleExpand={() => setExpandedRowId(expandedRowId === k.id ? null : k.id)}
                    rowIndex={idx}
                    isDragging={dragIndex === idx}
                    isDragOver={dragOverIndex === idx}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="provider-card-grid">
            {sortedKeys.map(k => (
              <ProviderCard key={k.id} apiKey={k} onSelect={onSelect} onCheckHealth={onCheckHealth} onToggleStatus={onToggleStatus} onRemoveKey={onRemoveKey} isChecking={checkingIds.has(k.id)} searchQuery={searchQuery} />
            ))}
          </div>
        )
      ) : (
        <div className="glass-panel provider-empty-state">
          <Package size={48} />
          <h3>{t('provider.no_providers_found')}</h3>
          <p>{searchQuery ? t('provider.try_different_search') : t('provider.add_provider_to_start')}</p>
        </div>
      )}
    </div>
  );
});

export default InstalledProvidersView;
