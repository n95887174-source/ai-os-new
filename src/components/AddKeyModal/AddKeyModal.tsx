import React, { useState } from 'react';
import { X, Key, Eye, EyeOff, Shield, CheckCircle2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, EVENTS } from '../../core/events';
import ProviderIcon from '../ProviderIcon/ProviderIcon';

interface Props {
  onClose: () => void;
}

const PROVIDERS = [
  { id: 'OpenRouter', name: 'OpenRouter', desc: 'Access to hundreds of models' },
  { id: 'Gemini', name: 'Google Gemini', desc: 'Powerful multimodal models' },
  { id: 'Groq', name: 'Groq Cloud', desc: 'Llama 3 at extreme speeds' },
  { id: 'NVIDIA', name: 'NVIDIA NIM', desc: 'Optimized inference for enterprise' },
  { id: 'Anthropic', name: 'Anthropic', desc: 'Direct access to Claude models' },
  { id: 'OpenAI', name: 'OpenAI', desc: 'GPT-4 and other models' },
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

    eventBus.emit(EVENTS.KEY_ADDED, {
      provider,
      label: label.trim(),
      key: apiKey.trim(),
      status: 'inactive' as const,
    });

    setLoading(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(6px)',
          zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 700,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 32px 100px rgba(0,0,0,0.9)',
            display: 'flex'
          }}
        >
          {/* Left Sidebar Wizard Info */}
          <div style={{ width: 220, background: 'rgba(0,0,0,0.2)', padding: '2.5rem 1.5rem', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.5rem' }}>
              <div style={{ background: '#3b82f6', padding: '0.4rem', borderRadius: 8 }}>
                <Key size={18} color="white" />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.02em' }}>CONNECTION</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: step === 1 ? 1 : 0.4 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: step >= 1 ? '#3b82f6' : 'transparent', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                  {step > 1 ? <CheckCircle2 size={14} /> : '1'}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: step === 1 ? 700 : 500 }}>Provider</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: step === 2 ? 1 : 0.4 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: step === 2 ? '#3b82f6' : 'transparent', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                  2
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: step === 2 ? 700 : 500 }}>Details</span>
              </div>
            </div>

            <div style={{ marginTop: 'auto', background: 'rgba(59,130,246,0.1)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(59,130,246,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#60a5fa' }}>
                <Shield size={14} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>SECURE</span>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                Keys are encrypted and stored only in your browser.
              </p>
            </div>
          </div>

          {/* Right Main Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {step === 1 ? 'Select AI Provider' : `Configure ${provider}`}
              </h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '2rem', flex: 1, overflowY: 'auto', maxHeight: '70vh' }}>
              {step === 1 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setProvider(p.id); setStep(2); if(!label) setLabel(`${p.name} Key`); }}
                      style={{
                        padding: '1.25rem', borderRadius: 14, background: provider === p.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${provider === p.id ? '#3b82f6' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = provider === p.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)'}
                    >
                      <ProviderIcon provider={p.id} size={24} />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: provider === p.id ? '#60a5fa' : 'var(--text-main)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{p.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                      Connection Name
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      placeholder="e.g. My Work Key"
                      style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Choose a name for easy identification.</p>
                  </div>

                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>API Key</span>
                      <a href="#" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <HelpCircle size={12} /> Where to find the key?
                      </a>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        style={{ width: '100%', padding: '0.8rem 3rem 0.8rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-main)', fontSize: '0.95rem', fontFamily: 'monospace', outline: 'none' }}
                      />
                      <button type="button" onClick={() => setShowKey(!showKey)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: '0.85rem' }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setStep(1)} className="btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
                      Back
                    </button>
                    <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem 1.25rem' }} disabled={loading}>
                      {loading ? 'Verifying...' : 'Connect Provider'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Step Indicator */}
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: step === 1 ? '#3b82f6' : 'rgba(255,255,255,0.2)' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: step === 2 ? '#3b82f6' : 'rgba(255,255,255,0.2)' }} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddKeyModal;
