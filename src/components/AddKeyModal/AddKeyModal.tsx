import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, Shield, CheckCircle2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../../core/events';
import ProviderIcon from '../ProviderIcon/ProviderIcon';

interface Props {
  onClose: () => void;
}

const PROVIDERS = [
  { id: 'OpenRouter', name: 'OpenRouter', desc: 'Access to hundreds of models' },
  { id: 'OpenAI', name: 'OpenAI', desc: 'GPT-4 and other models' },
  { id: 'Gemini', name: 'Google Gemini', desc: 'Powerful multimodal models' },
  { id: 'Anthropic', name: 'Anthropic', desc: 'Direct access to Claude models' },
  { id: 'Groq', name: 'Groq Cloud', desc: 'Llama 3 at extreme speeds' },
  { id: 'Mistral', name: 'Mistral AI', desc: 'Fast and efficient models' },
  { id: 'Together', name: 'Together AI', desc: 'Open-source models at scale' },
  { id: 'Fireworks', name: 'Fireworks AI', desc: 'High-performance inference' },
  { id: 'DeepSeek', name: 'DeepSeek', desc: 'Chinese AI models' },
  { id: 'Cohere', name: 'Cohere', desc: 'Enterprise NLP models' },
  { id: 'HuggingFace', name: 'HuggingFace', desc: 'Open-source models' },
  { id: 'NVIDIA', name: 'NVIDIA NIM', desc: 'Optimized inference for enterprise' },
  { id: 'Azure', name: 'Azure OpenAI', desc: 'Microsoft Azure AI' },
  { id: 'Custom', name: 'Custom / Proxy', desc: 'Your own server or alternative API' },
];

const AddKeyModal: React.FC<Props> = ({ onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState('OpenRouter');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !apiKey.trim()) {
      setError('Label and API key are required.');
      return;
    }
    setLoading(true);
    setError('');
    eventBus.emit('system:notification', {
      message: `Adding key for ${provider}...`,
      type: 'info'
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add API key"
      >
        <motion.div key="modal" initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          onClick={e => e.stopPropagation()} className="modal-panel"
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
              <h3 className="modal-body-title">{step === 1 ? 'Select AI Provider' : `Configure ${provider}`}</h3>
              <button onClick={onClose} className="modal-close-btn" aria-label="Close"><X size={20} /></button>
            </div>

            <div className="modal-content">
              {step === 1 ? (
                <div className="modal-provider-grid">
                  {PROVIDERS.map((p) => (
                    <button key={p.id} onClick={() => { setProvider(p.id); setStep(2); if(!label) setLabel(`${p.name} Key`); }}
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
              ) : (
                <form onSubmit={handleSubmit} className="modal-form">
                  <div>
                    <label className="modal-field-label">Connection Name</label>
                    <input type="text" autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. My Work Key" className="modal-input" aria-label="Connection name" />
                    <p className="modal-input-hint">Choose a name for easy identification.</p>
                  </div>
                  <div>
                    <div className="modal-field-row">
                      <label className="modal-field-label">API Key</label>
                      <a href="#" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={e => { e.preventDefault(); eventBus.emit('system:notification', { message: 'Consult provider documentation for API key location.', type: 'info' }); }}>
                        <HelpCircle size={12} /> Where to find the key?
                      </a>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..."
                        className="modal-input modal-input--mono" aria-label="API key" />
                      <button type="button" onClick={() => setShowKey(!showKey)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label={showKey ? 'Hide key' : 'Show key'}>
                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  {error && <div className="modal-error" role="alert">{error}</div>}
                  <div className="modal-actions">
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>Back</button>
                    <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem 1.25rem' }} disabled={loading}>
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
