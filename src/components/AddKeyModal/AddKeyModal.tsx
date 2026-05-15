import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Key, Eye, EyeOff, Shield, CheckCircle2, HelpCircle, Loader2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../../core/events';
import { useKeyStore } from '../../stores/useKeyStore';
import { keyService } from '../../services/KeyService';
import ProviderIcon from '../ProviderIcon/ProviderIcon';

interface Props {
  onClose: () => void;
}

interface BulkImportReport {
  added: number;
  duplicates: number;
  invalid: number;
  total: number;
  breakdown: Record<string, { added: number; duplicates: number; invalid: number }>;
}

const PROVIDERS = [
  { id: 'OpenRouter', name: 'OpenRouter', desc: 'Access to hundreds of models', docsUrl: 'https://openrouter.ai/keys' },
  { id: 'OpenAI', name: 'OpenAI', desc: 'GPT-4 and other models', docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'Gemini', name: 'Google Gemini', desc: 'Powerful multimodal models', docsUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'Anthropic', name: 'Anthropic', desc: 'Direct access to Claude models', docsUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'Groq', name: 'Groq Cloud', desc: 'Llama 3 at extreme speeds', docsUrl: 'https://console.groq.com/keys' },
  { id: 'Mistral', name: 'Mistral AI', desc: 'Fast and efficient models', docsUrl: 'https://console.mistral.ai/api-keys/' },
  { id: 'Together', name: 'Together AI', desc: 'Open-source models at scale', docsUrl: 'https://api.together.xyz/settings/api-keys' },
  { id: 'Fireworks', name: 'Fireworks AI', desc: 'High-performance inference', docsUrl: 'https://fireworks.ai/account/api-keys' },
  { id: 'DeepSeek', name: 'DeepSeek', desc: 'Chinese AI models', docsUrl: 'https://platform.deepseek.com/api_keys' },
  { id: 'Cohere', name: 'Cohere', desc: 'Enterprise NLP models', docsUrl: 'https://dashboard.cohere.com/api-keys' },
  { id: 'HuggingFace', name: 'HuggingFace', desc: 'Open-source models', docsUrl: 'https://huggingface.co/settings/tokens' },
  { id: 'NVIDIA', name: 'NVIDIA NIM', desc: 'Optimized inference for enterprise', docsUrl: 'https://build.nvidia.com/explore/discover' },
  { id: 'Cerebras', name: 'Cerebras', desc: '1M tok/day free, 2000 tok/s', docsUrl: 'https://inference.cerebras.ai/' },
  { id: 'Cloudflare', name: 'Cloudflare Workers AI', desc: '300 RPM free, many open models', docsUrl: 'https://developers.cloudflare.com/workers-ai/' },
  { id: 'Azure', name: 'Azure OpenAI', desc: 'Microsoft Azure AI', docsUrl: 'https://portal.azure.com/' },
  { id: 'Custom', name: 'Custom / Proxy', desc: 'Your own server or alternative API', docsUrl: null },
];

const AddKeyModal: React.FC<Props> = ({ onClose }) => {
  const { addKey, keys } = useKeyStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState('OpenRouter');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [bulkReport, setBulkReport] = useState<BulkImportReport | null>(null);

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

  const generateAlias = (prov: string) => {
    const providerName = PROVIDERS.find(p => p.id === prov)?.name || prov;
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
    setStep(1);
    setError('');
    setBulkMode(false);
    setBulkReport(null);
    setBulkInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !apiKey.trim()) {
      setError('Label and API key are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = await keyService.verifyKey(provider, apiKey);
      if (!isMountedRef.current) return;
      if (!isValid) {
        throw new Error('Invalid API key format. Check the key prefix matches the provider.');
      }

      addKey({
        provider,
        label: label.trim(),
        key: apiKey.trim(),
        status: 'pending',
      });

      if (!isMountedRef.current) return;

      const { adapterRegistry } = await import('../../services/providers/AdapterRegistry');
      const adapter = adapterRegistry.getAdapter(provider);
      if (adapter) {
        const health = await adapter.getAvailableModels(apiKey.trim());
        if (health.length === 0) {
          eventBus.emit('system:notification', {
            message: `${provider} key added but health-check returned no models — check the key manually`,
            type: 'warning',
          });
        } else {
          eventBus.emit('system:notification', {
            message: `Successfully added ${provider} key — ${health.length} models available`,
            type: 'success',
          });
        }
      } else {
        eventBus.emit('system:notification', {
          message: `Successfully added ${provider} key!`,
          type: 'success',
        });
      }

      onClose();
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const errMsg = err instanceof Error ? err.message : 'Failed to add API key. Please try again.';
      eventBus.emit('system:notification', {
        message: `${provider} key added but health-check failed: ${errMsg.slice(0, 80)}`,
        type: 'warning',
      });
      onClose();
    }
  };

  const handleBulkImport = useCallback(async () => {
    if (!bulkInput.trim()) {
      setError('Paste at least one API key.');
      return;
    }

    setLoading(true);
    setError('');
    setBulkReport(null);

    try {
      const rawKeys = bulkInput
        .split(/[\n,;]+/)
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const report: BulkImportReport = {
        added: 0, duplicates: 0, invalid: 0, total: rawKeys.length,
        breakdown: {},
      };

      const existingFingerprints = new Set<string>();
      for (const k of keys) {
        existingFingerprints.add(await keyService.fingerprintKey(k.key));
      }
      const batchFingerprints = new Map<string, string>();

      for (const raw of rawKeys) {
        const detected = keyService.detectProvider(raw);
        const prov = detected || 'Custom';
        if (!report.breakdown[prov]) {
          report.breakdown[prov] = { added: 0, duplicates: 0, invalid: 0 };
        }

        if (!keyService.verifyKey(prov, raw)) {
          report.invalid++;
          report.breakdown[prov].invalid++;
          continue;
        }

        const fp = await keyService.fingerprintKey(raw);
        if (existingFingerprints.has(fp) || batchFingerprints.has(fp)) {
          report.duplicates++;
          report.breakdown[prov].duplicates++;
          continue;
        }
        batchFingerprints.set(fp, raw);
        existingFingerprints.add(fp);

        const existingCount = keys.filter(k => k.provider === prov).length + report.breakdown[prov].added;
        const alias = `${prov.toLowerCase()}-${String(existingCount + 1).padStart(2, '0')}`;

        addKey({ provider: prov, label: alias, key: raw, status: 'pending' });
        report.added++;
        report.breakdown[prov].added++;
      }

      if (!isMountedRef.current) return;

      setBulkReport({
        ...report,
        breakdown: Object.fromEntries(
          Object.entries(report.breakdown).map(([prov, stats]) => [prov, {
            ...stats,
            added: stats.added,
            duplicates: stats.duplicates,
            invalid: stats.invalid,
          }])
        ),
      });
      eventBus.emit('system:notification', {
        message: `Bulk import complete: ${report.added} pending, ${report.duplicates} duplicates, ${report.invalid} invalid`,
        type: report.added > 0 ? 'success' : 'warning',
      });
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Bulk import failed.');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [bulkInput, addKey, keys]);

  const currentProvider = PROVIDERS.find(p => p.id === provider);
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
        aria-label="Add API key"
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
              <span className="modal-sidebar-header-text">CONNECTION</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="modal-step" style={{ opacity: step === 1 ? 1 : 0.4 }}>
                <div className="modal-step-number" style={{ background: step >= 1 ? '#3b82f6' : 'transparent' }}>
                  {step > 1 ? <CheckCircle2 size={14} /> : '1'}
                </div>
                <span className="modal-step-label" style={{ fontWeight: step === 1 ? 700 : 500 }}>Provider</span>
              </div>
              <div className="modal-step" style={{ opacity: step === 2 ? 1 : 0.4 }}>
                <div className="modal-step-number" style={{ background: step === 2 ? '#3b82f6' : 'transparent' }}>2</div>
                <span className="modal-step-label" style={{ fontWeight: step === 2 ? 700 : 500 }}>Details</span>
              </div>
            </div>
            <div className="modal-sidebar-footer">
              <div className="modal-sidebar-footer-title"><Shield size={14} /> SECURE</div>
              <p className="modal-sidebar-footer-text">Keys are encrypted and stored only in your browser.</p>
            </div>
          </div>

          <div className="modal-body">
            <div className="modal-body-header">
              <h3 className="modal-body-title">
                {step === 1 ? 'Select AI Provider' : bulkMode ? 'Bulk Import Keys' : `Configure ${provider}`}
              </h3>
              <button onClick={onClose} className="modal-close-btn" aria-label="Close"><X size={20} /></button>
            </div>

            <div className="modal-content">
              {step === 1 ? (
                <div className="modal-provider-grid">
                  {PROVIDERS.map((p) => (
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
              ) : bulkMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {bulkReport ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        Import complete — {bulkReport.total} keys processed
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{bulkReport.added}</div>
                          <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>Added</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{bulkReport.duplicates}</div>
                          <div style={{ fontSize: '0.7rem', color: '#fde68a' }}>Duplicates</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{bulkReport.invalid}</div>
                          <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>Invalid</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {Object.entries(bulkReport.breakdown).map(([prov, stats]) => (
                          <div key={prov} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{prov}</span>
                            <span style={{ color: '#94a3b8' }}>+{stats.added} / {stats.duplicates} dup / {stats.invalid} inv</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={onClose} className="btn-primary" style={{ padding: '0.75rem', width: '100%' }}>
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Paste keys (one per line, or comma-separated). System auto-detects provider, deduplicates, and validates.
                      </div>
                      <textarea
                        value={bulkInput}
                        onChange={e => setBulkInput(e.target.value)}
                        placeholder={`sk-or-v1-...\nAIza...\ngsk_...\nsk-ant-...`}
                        rows={10}
                        className="modal-input"
                        style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical', minHeight: 160 }}
                        aria-label="Bulk API keys input"
                      />
                      {error && (
                        <div className="modal-error" role="alert" aria-live="polite">
                          {error}
                        </div>
                      )}
                      <div className="modal-actions">
                        <button type="button" onClick={handleBack} className="btn-secondary" style={{ padding: '0.75rem 1.25rem' }} disabled={loading}>
                          Back
                        </button>
                        <button type="button" onClick={handleBulkImport} className="btn-primary" style={{ flex: 1, padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={loading}>
                          {loading ? <Loader2 size={18} className="spinning" aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
                          {loading ? 'Importing...' : 'Import All'}
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
                      <Upload size={14} /> Bulk Import
                    </button>
                  </div>
                  <div>
                    <label className="modal-field-label" htmlFor="connectionName">Connection Name</label>
                    <input
                      id="connectionName"
                      type="text"
                      autoFocus
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      placeholder="e.g. My Work Key"
                      className="modal-input"
                      aria-label="Connection name"
                      aria-invalid={error && error.includes('Label') ? 'true' : undefined}
                      aria-describedby={error ? 'key-error' : undefined}
                    />
                    <p className="modal-input-hint">Choose a name for easy identification.</p>
                  </div>
                  <div>
                    <div className="modal-field-row">
                      <label className="modal-field-label" htmlFor="apiKey">API Key</label>
                      <a
                        href="#"
                        style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={handleDocsClick}
                        aria-label="Open documentation to find API key"
                      >
                        <HelpCircle size={12} aria-hidden="true" /> Where to find the key?
                      </a>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="apiKey"
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={e => handleKeyChange(e.target.value)}
                        placeholder="sk-..."
                        className="modal-input modal-input--mono"
                        aria-label="API key"
                        aria-invalid={error && error.includes('API key') ? 'true' : undefined}
                        aria-describedby={error ? 'key-error' : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        aria-label={showKey ? 'Hide key' : 'Show key'}
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
                      Back
                    </button>
                    <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={loading}>
                      {loading ? <Loader2 size={18} className="spinning" aria-hidden="true" /> : null}
                      {loading ? 'Verifying...' : 'Connect Provider'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="modal-footer-dots">
              <div className={`modal-dot${step === 1 ? ' modal-dot--active' : ''}`} />
              <div className={`modal-dot${step === 2 ? ' modal-dot--active' : ''}`} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddKeyModal;
