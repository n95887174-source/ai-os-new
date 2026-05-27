import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Key, Eye, EyeOff, Shield, CheckCircle2, HelpCircle, Loader2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../../core/events';
import { useKeyStore } from '../../stores/useKeyStore';
import { keyService, adapterRegistry } from '../../kernel/instances';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { useTranslation } from '../../i18n/useTranslation';
import { flexColGap6, flexColGap4, grid2, textXsMutedAuto, btnMdPadding, flexCenterGap8Full, flexBetweenFont08 } from '../../styles/common';
import { useKeyIntelligence } from '../../stores/useKeyIntelligence';
import type { ParsedKeyResult, AccountGroup } from '../../kernel/contracts/key-intelligence';

interface Props {
  onClose: () => void;
  defaultProvider?: string;
}

interface BulkImportReport {
  added: number;
  duplicates: number;
  invalid: number;
  total: number;
  breakdown: Record<string, { added: number; duplicates: number; invalid: number }>;
  groups: AccountGroup[];
  healthIssues: { provider: string; issue: string }[];
}

const PROVIDER_META: Record<string, { name: string; desc: string; docsUrl: string | null }> = {
  OpenRouter: { name: 'OpenRouter', desc: 'Access to hundreds of models', docsUrl: 'https://openrouter.ai/keys' },
  OpenAI: { name: 'OpenAI', desc: 'GPT-4 and other models', docsUrl: 'https://platform.openai.com/api-keys' },
  Gemini: { name: 'Google Gemini', desc: 'Powerful multimodal models', docsUrl: 'https://aistudio.google.com/app/apikey' },
  Anthropic: { name: 'Anthropic', desc: 'Direct access to Claude models', docsUrl: 'https://console.anthropic.com/settings/keys' },
  Groq: { name: 'Groq Cloud', desc: 'Llama 3 at extreme speeds', docsUrl: 'https://console.groq.com/keys' },
  Mistral: { name: 'Mistral AI', desc: 'Fast and efficient models', docsUrl: 'https://console.mistral.ai/api-keys/' },
  Together: { name: 'Together AI', desc: 'Open-source models at scale', docsUrl: 'https://api.together.xyz/settings/api-keys' },
  Fireworks: { name: 'Fireworks AI', desc: 'High-performance inference', docsUrl: 'https://fireworks.ai/account/api-keys' },
  DeepSeek: { name: 'DeepSeek', desc: 'Chinese AI models', docsUrl: 'https://platform.deepseek.com/api_keys' },
  Cohere: { name: 'Cohere', desc: 'Enterprise NLP models', docsUrl: 'https://dashboard.cohere.com/api-keys' },
  HuggingFace: { name: 'HuggingFace', desc: 'Open-source models', docsUrl: 'https://huggingface.co/settings/tokens' },
  NVIDIA: { name: 'NVIDIA NIM', desc: 'Optimized inference for enterprise', docsUrl: 'https://build.nvidia.com/explore/discover' },
  Cerebras: { name: 'Cerebras', desc: '1M tok/day free, 2000 tok/s', docsUrl: 'https://inference.cerebras.ai/' },
  Cloudflare: { name: 'Cloudflare Workers AI', desc: '300 RPM free, many open models', docsUrl: 'https://developers.cloudflare.com/workers-ai/' },
  Azure: { name: 'Azure OpenAI', desc: 'Microsoft Azure AI', docsUrl: 'https://portal.azure.com/' },
  Custom: { name: 'Custom / Proxy', desc: 'Your own server or alternative API', docsUrl: null },
};

const AddKeyModal: React.FC<Props> = ({ onClose, defaultProvider }) => {
  const { addKey, keys } = useKeyStore();
  const [step, setStep] = useState<1 | 2 | 3>(defaultProvider ? 2 : 1);
  const [provider, setProvider] = useState(defaultProvider || 'OpenRouter');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkReport, setBulkReport] = useState<BulkImportReport | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [group, setGroup] = useState('');
  const [account, setAccount] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const pipeline = useKeyIntelligence();

  const { t } = useTranslation();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const providers = useMemo(() => {
    const fromRegistry = adapterRegistry.getAllProviders();
    const all = new Set(fromRegistry);
    Object.keys(PROVIDER_META).forEach(k => all.add(k));
    return Array.from(all).map(id => ({
      id,
      name: PROVIDER_META[id]?.name || id,
      desc: PROVIDER_META[id]?.desc || '',
      docsUrl: PROVIDER_META[id]?.docsUrl || null,
    }));
  }, []);

  const generateAlias = (prov: string) => {
    const providerName = providers.find(p => p.id === prov)?.name || prov;
    const existingCount = keys.filter(k => k.provider === prov).length;
    return `${providerName.toLowerCase().replace(/\s+/g, '-')}-${String(existingCount + 1).padStart(2, '0')}`;
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    setStep(2);
    setError('');
    setLabel(generateAlias(newProvider));
  };

  const handleKeyChange = (value: string) => {
    setApiKey(value);
    if (value.trim()) {
      const detected = keyService.detectProvider(value);
      if (detected && detected !== provider && isMountedRef.current) {
        setProvider(detected);
        setLabel(generateAlias(detected));
      }
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      setError('');
      return;
    }
    setStep(1);
    setError('');
    setBulkMode(false);
    setBulkReport(null);
    setBulkInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !apiKey.trim()) {
      setError(t('add_key.error_required'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = await keyService.verifyKey(provider, apiKey);
      if (!isMountedRef.current) return;
      if (!isValid) {
        throw new Error(t('add_key.error_invalid_format'));
      }

      const extractedAccountId = keyService.extractAccountId(provider, apiKey.trim());
      setAccountId(extractedAccountId);

      const { adapterRegistry } = await import('../../kernel/instances');
      const adapter = adapterRegistry.getAdapter(provider);
      let models: string[] = [];
      if (adapter) {
        try {
          models = await adapter.getAvailableModels(apiKey.trim());
        } catch {
          // model fetch is non-critical
        }
      }

      if (!isMountedRef.current) return;
      setAvailableModels(models);
      setStep(3);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const errMsg = err instanceof Error ? err.message : 'Failed to validate API key. Please try again.';
      setError(errMsg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleFinalize = (selectedModel?: string) => {
    addKey({
      provider,
      label: label.trim(),
      key: apiKey.trim(),
      status: 'pending',
      group: group.trim() || undefined,
      account: account.trim() || undefined,
      accountId,
      model: selectedModel || undefined,
      availableModels: availableModels.length > 0 ? availableModels : undefined,
    });

    eventBus.emit('system:notification', {
      message: `${provider} key added — ${availableModels.length > 0 ? availableModels.length + ' models available' : 'health check pending'}${selectedModel ? ', default: ' + selectedModel : ''}`,
      type: 'success',
    });

    onClose();
  };

  const checkDuplicateKey = useCallback(async (keyValue: string): Promise<string | null> => {
    try {
      const fp = await keyService.fingerprintKey(keyValue);
      for (const k of keys) {
        const existingFp = await keyService.fingerprintKey(k.key);
        if (existingFp === fp) return k.label;
      }
    } catch { /* fingerprint failure is non-blocking */ }
    return null;
  }, [keys]);

  const handleSaveAndClose = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!label.trim() || !apiKey.trim()) {
      setError(t('add_key.error_required'));
      return;
    }
    const dup = await checkDuplicateKey(apiKey.trim());
    if (dup) {
      setError(t('add_key.error_duplicate').replace('{0}', dup));
      return;
    }
    handleFinalize();
  };

  const handleSkipModel = () => handleFinalize();

  const handleBulkImport = useCallback(async () => {
    if (!bulkInput.trim()) {
      setError(t('add_key.error_paste'));
      return;
    }

    setLoading(true);
    setError('');
    setBulkReport(null);

    try {
      const existingFps = await Promise.all(keys.map(async k => ({
        fingerprint: await keyService.fingerprintKey(k.key),
        provider: k.provider,
        label: k.label,
      })));

      await pipeline.runPipeline({ rawText: bulkInput, existingKeys: existingFps });
      const r = pipeline.report;
      if (!r) { throw new Error('Pipeline returned no report'); }

      const healthIssuesList: { provider: string; issue: string }[] = [];
      const report: BulkImportReport = {
        added: r.added, duplicates: r.duplicates, invalid: r.invalid, total: r.totalInput,
        breakdown: {},
        groups: r.groups,
        healthIssues: healthIssuesList,
      };

      for (const p of r.parsed) {
        const prov = p.provider || 'Custom';
        if (!report.breakdown[prov]) report.breakdown[prov] = { added: 0, duplicates: 0, invalid: 0 };
        if (p.isValid) report.breakdown[prov].added++;
        else report.breakdown[prov].invalid++;
      }

      for (const risk of r.riskAssessments) {
        const critical = risk.factors.find(f => f.severity === 'critical');
        if (critical) healthIssuesList.push({ provider: risk.provider || 'Unknown', issue: critical.description });
      }

      if (!isMountedRef.current) return;
      setBulkReport(report);

      if (r.added > 0) {
        const parsedByFp = new Map<string, ParsedKeyResult>();
        for (const p of r.parsed) {
          if (p.isValid) parsedByFp.set(p.fingerprint, p);
        }

        const rawKeys = bulkInput.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 0);
        setBulkProgress({ current: 0, total: rawKeys.length });
        const addedFps = new Set<string>();
        let processed = 0;
        for (const raw of rawKeys) {
          processed++;
          if (processed % 3 === 0) setBulkProgress({ current: processed, total: rawKeys.length });
          const fp = await keyService.fingerprintKey(raw);
          const prov = keyService.detectProvider(raw) || 'Custom';
          if (!(await keyService.verifyKey(prov, raw))) continue;
          if (addedFps.has(fp)) continue;
          addedFps.add(fp);
          const parsedEntry = parsedByFp.get(fp);
          const existingCount = keys.filter(k => k.provider === prov).length;
          const alias = `${prov.toLowerCase()}-${String(existingCount + addedFps.size).padStart(2, '0')}`;
          addKey({
            provider: prov,
            label: alias,
            key: raw,
            status: 'pending',
            group: group.trim() || parsedEntry?.accountId || undefined,
            account: account.trim() || parsedEntry?.accountId || undefined,
            accountId: parsedEntry?.accountId,
          });
        }
        setBulkProgress(null);
      }

      eventBus.emit('system:notification', {
        message: `Bulk import complete: ${r.added} pending, ${r.duplicates} duplicates, ${r.invalid} invalid${healthIssuesList.length > 0 ? ' — ' + healthIssuesList.length + ' key(s) failed health check' : ''}`,
        type: r.added > 0 ? (healthIssuesList.length > 0 ? 'warning' : 'success') : 'warning',
      });
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Bulk import failed.');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [bulkInput, addKey, keys, pipeline]);

  const currentProvider = providers.find(p => p.id === provider);
  const docsUrl = currentProvider?.docsUrl;

  const handleDocsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (docsUrl) {
      window.open(docsUrl, '_blank', 'noopener,noreferrer');
    } else {
      eventBus.emit('system:notification', {
        message: 'No official documentation link available for this provider.',
        type: 'info',
      });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={t('add_key.dialog_aria')}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="modal-panel"
        >
          <div className="modal-sidebar">
            <div className="modal-sidebar-header">
              <div className="modal-sidebar-header-icon"><Key size={18} color="white" /></div>
              <span className="modal-sidebar-header-text">{t('add_key.section_connection')}</span>
            </div>
            <div style={flexColGap6}>
                <div className="modal-step" style={{ opacity: step === 1 ? 1 : 0.4 }}>
                <div className="modal-step-number" style={{ background: step >= 1 ? '#3b82f6' : 'transparent' }}>
                  {step > 1 ? <CheckCircle2 size={14} /> : '1'}
                </div>
                <span className="modal-step-label" style={{ fontWeight: step === 1 ? 700 : 500 }}>{t('add_key.step_provider')}</span>
                <span style={textXsMutedAuto}>{step === 1 ? '1/3' : ''}</span>
              </div>
              <div className="modal-step" style={{ opacity: step === 2 ? 1 : 0.4 }}>
                <div className="modal-step-number" style={{ background: step >= 2 ? '#3b82f6' : 'transparent' }}>
                  {step > 2 ? <CheckCircle2 size={14} /> : '2'}
                </div>
                <span className="modal-step-label" style={{ fontWeight: step === 2 ? 700 : 500 }}>{t('add_key.step_details')}</span>
                <span style={textXsMutedAuto}>{step === 2 ? '2/3' : ''}</span>
              </div>
              <div className="modal-step" style={{ opacity: step === 3 ? 1 : 0.4 }}>
                <div className="modal-step-number" style={{ background: step === 3 ? '#3b82f6' : 'transparent' }}>3</div>
                <span className="modal-step-label" style={{ fontWeight: step === 3 ? 700 : 500 }}>Default Model</span>
                <span style={textXsMutedAuto}>{step === 3 ? '3/3' : ''}</span>
              </div>
            </div>
            <div className="modal-sidebar-footer">
              <div className="modal-sidebar-footer-title"><Shield size={14} /> {t('add_key.section_secure')}</div>
              <p className="modal-sidebar-footer-text">{t('add_key.section_secure_desc')}</p>
            </div>
          </div>

          <div className="modal-body">
            <div className="modal-body-header">
              <h3 className="modal-body-title">
                {step === 1 ? t('add_key.title_provider') : step === 3 ? 'Select Default Model' : bulkMode ? t('add_key.title_bulk') : t('add_key.title_configure').replace('{0}', provider)}
              </h3>
              <button onClick={onClose} className="modal-close-btn" aria-label={t('add_key.close_aria')}><X size={20} /></button>
            </div>

            <div className="modal-content">
              {step === 1 ? (
                <div className="modal-provider-grid">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProviderChange(p.id)}
                      className={`modal-provider-btn${provider === p.id ? ' modal-provider-btn--active' : ''}`}
                      aria-pressed={provider === p.id}
                    >
                      <ProviderIcon provider={p.id} size={24} />
                      <div>
                        <div className={`modal-provider-name${provider === p.id ? ' modal-provider-name--active' : ''}`}>{p.name}</div>
                        <div className="modal-provider-desc">{p.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : step === 3 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    Key for <strong style={{ color: '#e2e8f0' }}>{provider}</strong> verified successfully.
                    {availableModels.length > 0
                      ? ` Choose a default model for new conversations:`
                      : ' No models were fetched — you can set a default model later.'}
                  </div>
                  {availableModels.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 280, overflowY: 'auto' }}>
                      {availableModels.map((m) => (
                        <button
                          key={m}
                          onClick={() => handleFinalize(m)}
                          className="modal-provider-btn"
                          style={{ textAlign: 'left', padding: '0.6rem 0.75rem' }}
                        >
                          <div className="modal-provider-name">{m}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
                    <button onClick={handleSkipModel} className="btn-primary" style={{ flex: 1, padding: '0.75rem 1.25rem' }}>
                      {availableModels.length > 0 ? 'Skip — use default' : 'Done'}
                    </button>
                  </div>
                </div>
              ) : bulkMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {bulkReport ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        Import complete — {bulkReport.total} keys processed
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{bulkReport.added}</div>
                          <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>{t('add_key.stat_added')}</div>
                        </div>
                        <div style={{ padding: '0.75rem', borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{bulkReport.duplicates}</div>
                          <div style={{ fontSize: '0.7rem', color: '#fde68a' }}>{t('add_key.stat_duplicates')}</div>
                        </div>
                        <div style={{ padding: '0.75rem', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{bulkReport.invalid}</div>
                          <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>{t('add_key.stat_invalid')}</div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', marginTop: '0.25rem' }}>Accounts</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {bulkReport.groups.map((g) => (
                          <div key={g.accountId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{g.label}</span>
                            <span style={{ color: '#94a3b8' }}>{g.keyCount} key{g.keyCount > 1 ? 's' : ''} @ {g.provider}</span>
                          </div>
                        ))}
                      </div>

                      {bulkReport.healthIssues.length > 0 && (
                        <>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', marginTop: '0.25rem' }}>
                            Health Check Failures
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {bulkReport.healthIssues.map((h, i) => (
                              <div key={i} style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8 }}>
                                <span style={{ fontWeight: 600, color: '#ef4444' }}>{h.provider}</span>
                                <span style={{ color: '#fca5a5', marginLeft: '0.5rem' }}>{h.issue}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', marginTop: '0.25rem' }}>Per Provider</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {Object.entries(bulkReport.breakdown).map(([prov, stats]) => (
                          <div key={prov} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{prov}</span>
                            <span style={{ color: '#94a3b8' }}>+{stats.added} / {stats.duplicates} dup / {stats.invalid} inv</span>
                          </div>
                        ))}
                      </div>

                      <button onClick={onClose} className="btn-primary" style={{ padding: '0.75rem', width: '100%', marginTop: '0.25rem' }}>
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        {t('add_key.bulk_instruction')}
                      </div>
                      <textarea
                        value={bulkInput}
                        onChange={e => setBulkInput(e.target.value)}
                        placeholder={t('add_key.bulk_placeholder')}
                        rows={10}
                        className="modal-input"
                        style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical', minHeight: 160 }}
                        aria-label="Bulk API keys input"
                      />
                      {bulkProgress && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                            <span>Importing keys...</span>
                            <span>{bulkProgress.current} / {bulkProgress.total}</span>
                          </div>
                          <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <div style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%`, height: '100%', borderRadius: 3, background: '#3b82f6', transition: 'width 0.3s ease' }} />
                          </div>
                        </div>
                      )}
                      {error && (
                        <div className="modal-error" role="alert" aria-live="polite">
                          {error}
                        </div>
                      )}
                      <div className="modal-actions">
                        <button type="button" onClick={handleBack} className="btn-secondary" style={{ padding: '0.75rem 1.25rem' }} disabled={loading}>
                          {t('add_key.back')}
                        </button>
                        <button type="button" onClick={handleBulkImport} className="btn-primary" style={{ flex: 1, padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={loading}>
                          {loading ? <Loader2 size={18} className="spinning" aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
                          {loading ? t('add_key.importing') : t('add_key.import_all')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="modal-form" noValidate>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => { setBulkMode(true); setError(''); }}
                      style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Upload size={14} /> {t('add_key.bulk_import')}
                    </button>
                  </div>
                  <div>
                    <label className="modal-field-label" htmlFor="connectionName">{t('add_key.name_label')}</label>
                    <input
                      id="connectionName"
                      type="text"
                      autoFocus
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      placeholder={t('add_key.name_placeholder')}
                      className="modal-input"
                      aria-label="Connection name"
                      aria-invalid={error && error.includes('Label') ? 'true' : undefined}
                      aria-describedby={error ? 'key-error' : undefined}
                    />
                    <p className="modal-input-hint">{t('add_key.name_hint')}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="modal-field-label" htmlFor="keyGroup">Group</label>
                      <input
                        id="keyGroup"
                        type="text"
                        value={group}
                        onChange={e => setGroup(e.target.value)}
                        placeholder="e.g. Personal, Work, Client-A"
                        className="modal-input"
                        aria-label="Key group"
                      />
                    </div>
                    <div>
                      <label className="modal-field-label" htmlFor="keyAccount">Account</label>
                      <input
                        id="keyAccount"
                        type="text"
                        value={account}
                        onChange={e => setAccount(e.target.value)}
                        placeholder="e.g. alice@gmail.com"
                        className="modal-input"
                        aria-label="Account identifier"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="modal-field-row">
                      <label className="modal-field-label" htmlFor="apiKey">{t('add_key.key_label')}</label>
                      <a
                        href="#"
                        style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={handleDocsClick}
                        aria-label="Open documentation to find API key"
                      >
                        <HelpCircle size={12} aria-hidden="true" /> {t('add_key.key_help')}
                      </a>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="apiKey"
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={e => handleKeyChange(e.target.value)}
                        placeholder={t('add_key.key_placeholder')}
                        className="modal-input modal-input--mono"
                        aria-label="API key"
                        aria-invalid={error && error.includes('API key') ? 'true' : undefined}
                        aria-describedby={error ? 'key-error' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        aria-label={showKey ? t('add_key.hide_aria') : t('add_key.show_aria')}
                      >
                        {showKey ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div id="key-error" className="modal-error" role="alert" aria-live="polite">
                      {error}
                    </div>
                  )}

                  <div className="modal-actions">
                    <button type="button" onClick={handleBack} className="btn-secondary" style={{ padding: '0.75rem 1.25rem' }} disabled={loading}>
                      {t('add_key.back')}
                    </button>
                    <button type="button" onClick={handleSaveAndClose} className="btn-secondary" style={{ padding: '0.75rem 1.25rem', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }} disabled={loading}>
                      {t('add_key.save_close')}
                    </button>
                    <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={loading}>
                      {loading ? <Loader2 size={18} className="spinning" aria-hidden="true" /> : null}
                      {loading ? t('add_key.verifying') : t('add_key.add')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="modal-footer-dots">
              <div className={`modal-dot${step === 1 ? ' modal-dot--active' : ''}`} />
              <div className={`modal-dot${step === 2 ? ' modal-dot--active' : ''}`} />
              <div className={`modal-dot${step === 3 ? ' modal-dot--active' : ''}`} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddKeyModal;
