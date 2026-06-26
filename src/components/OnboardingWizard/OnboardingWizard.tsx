import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Bot, Zap, X, ChevronRight, ChevronLeft, Check, Key, Globe, Shield } from 'lucide-react';
import { keyService } from '../../kernel/instances';
import type { TranslationKey } from '../../i18n/translations';

const ONBOARDING_KEY = 'mavis:onboarding_completed';

interface WelcomeStepProps { t: (key: TranslationKey) => string; }

const WelcomeStep: React.FC<WelcomeStepProps> = ({ t }) => (
  <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
    <div style={{
      width: 64, height: 64, borderRadius: 16,
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto 1.25rem', boxShadow: '0 8px 32px rgba(59,130,246,0.4)',
    }}>
      <MessageSquare size={32} color="white" />
    </div>
    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
      {t('onboarding.welcome_title')}
    </h2>
    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
      {t('onboarding.welcome_subtitle')}
    </p>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'left', marginBottom: '1.5rem' }}>
      {[
        { icon: <MessageSquare size={16} />, label: t('onboarding.feature_chat'), color: '#10b981' },
        { icon: <Bot size={16} />, label: t('onboarding.feature_debates'), color: '#a855f7' },
        { icon: <Zap size={16} />, label: t('onboarding.feature_agents'), color: '#f59e0b' },
        { icon: <Shield size={16} />, label: t('onboarding.feature_private'), color: '#3b82f6' },
      ].map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.6rem 0.75rem',
          background: `${f.color}12`,
          border: `1px solid ${f.color}30`,
          borderRadius: 8,
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ color: f.color, flexShrink: 0 }}>{f.icon}</span>
          {f.label}
        </div>
      ))}
    </div>

    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
      {t('onboarding.welcome_skip_hint')}
    </p>
  </div>
);

interface AddConnectionStepProps {
  t: (key: TranslationKey) => string;
  selectedProvider: string;
  setSelectedProvider: (v: string) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  error: string;
  setError: (v: string) => void;
}

const AddConnectionStep: React.FC<AddConnectionStepProps> = ({ t, selectedProvider, setSelectedProvider, apiKey, setApiKey, error, setError }) => {
  const providers = [
    { id: 'groq', label: 'Groq', color: '#f97316', desc: 'Fast inference, free tier' },
    { id: 'openrouter', label: 'OpenRouter', color: '#a855f7', desc: '100+ models, unified API' },
    { id: 'gemini', label: 'Google Gemini', color: '#4285f4', desc: 'Powerful reasoning' },
    { id: 'nvidia', label: 'NVIDIA NIM', color: '#76b900', desc: 'Enterprise-grade' },
  ];

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'rgba(59,130,246,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 0.75rem',
        }}>
          <Key size={24} color="#3b82f6" />
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
          {t('onboarding.add_connection_title')}
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
          {t('onboarding.add_connection_subtitle')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
        {providers.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedProvider(p.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem',
              padding: '0.65rem 0.75rem',
              background: selectedProvider === p.id ? `${p.color}20` : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${selectedProvider === p.id ? p.color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: selectedProvider === p.id ? p.color : 'var(--text-primary)' }}>{p.label}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.desc}</span>
          </button>
        ))}
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          <Globe size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {t('onboarding.api_key_label')}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={e => { setApiKey(e.target.value); setError(''); }}
          placeholder={t('onboarding.api_key_placeholder')}
          style={{
            width: '100%',
            padding: '0.6rem 0.75rem',
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {error && <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '0.35rem 0 0' }}>{error}</p>}
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
        {t('onboarding.api_key_hint')}
      </p>
    </div>
  );
};

interface DoneStepProps {
  t: (key: TranslationKey) => string;
  navigate: ReturnType<typeof useNavigate>;
}

const DoneStep: React.FC<DoneStepProps> = ({ t, navigate }) => (
  <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1.25rem', boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
      }}
    >
      <Check size={32} color="white" />
    </motion.div>
    <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
      {t('onboarding.done_title')}
    </h2>
    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
      {t('onboarding.done_subtitle')}
    </p>
    <button
      onClick={() => { try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* ignore */ } navigate('/chat'); }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        border: 'none', borderRadius: 10,
        color: 'white', fontWeight: 600, fontSize: '0.9rem',
        cursor: 'pointer', boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
      }}
    >
      {t('onboarding.start_chatting')}
      <ChevronRight size={18} />
    </button>
  </div>
);

interface OnboardingWizardProps {
  t: (key: TranslationKey) => string;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ t }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=welcome, 1=add-connection, 2=done
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Check if already completed
  const [completed, setCompleted] = useState(() => {
    try { return localStorage.getItem(ONBOARDING_KEY) === '1'; }
    catch { return false; }
  });

  const totalSteps = 3;

  const skip = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* ignore */ }
    setCompleted(true);
  };

  // ─── Save connection ──────────────────────────────────────────────────────────
  const handleSaveConnection = async () => {
    if (!selectedProvider) { setError(t('onboarding.error_select_provider')); return; }
    if (!apiKey.trim()) { setError(t('onboarding.error_enter_key')); return; }

    // Check vault status before attempting to add key
    if (keyService.vaultService?.isLocked()) {
      setError('Vault is locked. Please unlock the vault in Settings → Advanced first.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await keyService.addKey({
        provider: selectedProvider,
        key: apiKey.trim(),
        label: `${selectedProvider} (onboarding)`,
        status: 'pending' as const,
      });
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('onboarding.error_generic'));
    } finally {
      setSaving(false);
    }
  };

  // ─── Navigation ──────────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (step === 0) { setStep(1); return; }
    if (step === 1) { await handleSaveConnection(); return; }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  // ─── Don't render if completed ─────────────────────────────────────────────
  if (completed) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{
          width: '100%', maxWidth: 440,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 16,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
        }}>
          {/* Progress */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                width: i === step ? 20 : 8,
                height: 6, borderRadius: 3,
                background: i <= step ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.25s',
              }} />
            ))}
          </div>
          <button
            onClick={skip}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.78rem',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {t('onboarding.skip')}
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && <WelcomeStep t={t} />}
              {step === 1 && <AddConnectionStep t={t} selectedProvider={selectedProvider} setSelectedProvider={setSelectedProvider} apiKey={apiKey} setApiKey={setApiKey} error={error} setError={setError} />}
              {step === 2 && <DoneStep t={t} navigate={navigate} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== 2 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.875rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            gap: '0.75rem',
          }}>
            {step > 0 ? (
              <button
                onClick={handleBack}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.55rem 1rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, cursor: 'pointer',
                  color: 'var(--text-secondary)', fontSize: '0.85rem',
                }}
              >
                <ChevronLeft size={15} />
                {t('onboarding.back')}
              </button>
            ) : <div />}

            <button
              onClick={handleNext}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1.25rem',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none', borderRadius: 8, cursor: saving ? 'wait' : 'pointer',
                color: 'white', fontWeight: 600, fontSize: '0.85rem',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? t('onboarding.saving') : step === 0 ? t('onboarding.get_started') : t('onboarding.save_connect')}
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
