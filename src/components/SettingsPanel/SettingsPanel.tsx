import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Globe, Bell, Shield, Database, Info, 
  Settings, Zap, AlertCircle, Trash2, Cpu,
  MessageSquare, HardDrive, Sliders, Lock,
  Activity, Terminal, AlertTriangle, Webhook, Key
} from 'lucide-react';
import { keyService } from '../../services/KeyService';
import { securityService } from '../../core/SecurityService';
import { eventBus, EVENTS } from '../../core/events';
import { settingsService } from '../../services/SettingsService';
import { notificationWebhookService } from '../../services/NotificationWebhookService';
import { externalSecretsService } from '../../services/ExternalSecretsService';
import type { SystemSettings } from '../../services/SettingsService';
import type { WebhookConfig, WebhookProvider, WebhookEventType } from '../../services/NotificationWebhookService';
import type { BackendType, BackendStatus } from '../../services/ExternalSecretsService';
import { CONFIG } from '../../kernel/services/config-registry';
import { configService } from '../../services/ConfigService';
import { APP_VERSION } from '../../utils/version';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import { canonicalHealthColor, canonicalHealthLabel } from '../Common/status-vocabulary';

type SettingsTab = 'general' | 'writing' | 'reading' | 'alerts' | 'advanced';

const SettingRow = ({ icon, title, description, children, accent = '#3b82f6' }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode; accent?: string }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.5rem', marginBottom: '1rem', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)'
  }}>
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flex: 1 }}>
      <div style={{
        background: `${accent}15`, border: `1px solid ${accent}30`,
        padding: '0.75rem', borderRadius: 12, color: accent,
        boxShadow: `inset 0 0 10px ${accent}20`
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem', color: '#f8fafc' }}>{title}</div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: 450 }}>{description}</div>
      </div>
    </div>
    <div style={{ marginLeft: '2rem', flexShrink: 0 }}>{children}</div>
  </div>
);

const Toggle = ({ checked, onChange, accent = '#3b82f6' }: { checked: boolean; onChange: (v: boolean) => void; accent?: string }) => (
  <button
    role="switch"
    aria-checked={checked}

    onClick={() => onChange(!checked)}
    style={{
      width: 48, height: 26, borderRadius: 13, position: 'relative',
      background: checked ? accent : 'rgba(255,255,255,0.1)',
      border: 'none', cursor: 'pointer', transition: 'background 0.3s',
      boxShadow: checked ? `0 0 12px ${accent}40` : 'none',
      flexShrink: 0
    }}
    aria-label="Toggle"
  >
    <div style={{
      width: 20, height: 20, borderRadius: '50%', background: 'white',
      position: 'absolute', top: 3,
      left: checked ? 25 : 3,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: '0 2px 5px rgba(0,0,0,0.4)'
    }} />
  </button>
);

const ConfigInput = ({ label, value, onChange, step = '1' }: { label: string; value: number; onChange: (v: number) => void; step?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
    <label style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{label}</label>
    <input type="number" value={value} step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      style={{ width: 100, padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', textAlign: 'right', fontSize: '0.78rem', outline: 'none' }} />
  </div>
);

const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<SystemSettings>(settingsService.getSettings());
  const [vaultPassword, setVaultPassword] = useState('');
  const [isVaultActive, setIsVaultActive] = useState(!securityService.isLocked());
  const [error, setError] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<{
    healthCheckStaleIntervalMs: number; latencyPenaltyThresholdMs: number;
    errorRatePenaltyThreshold: number; successRatePenaltyFloor: number;
    alertPenaltyPerAlert: number; metricsHistoryLimit: number;
    metricsInterval: number; tracesMaxEntries: number;
    tracesDbLoadLimit: number; tracesTokenEstimateDivisor: number;
  } | null>(null);
  const [secretsBackends, setSecretsBackends] = useState<BackendStatus[]>([]);
  const [showSecretsDetail, setShowSecretsDetail] = useState(false);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);

  const isMountedRef = useRef(true);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearErrorAfterDelay = useCallback(() => {
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) setError(null);
    }, 5000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const unsubSettings = settingsService.subscribe((newSettings) => {
      if (isMountedRef.current) setSettings(newSettings);
    });

    setIsVaultActive(!securityService.isLocked());

    // Initialize config form from ConfigService
    const m = configService.getMonitoring();
    const me = configService.getMetrics();
    const t = configService.getTraces();
    setConfigForm({
      healthCheckStaleIntervalMs: m.healthCheckStaleIntervalMs,
      latencyPenaltyThresholdMs: m.latencyPenalty.thresholdMs,
      errorRatePenaltyThreshold: m.errorRatePenalty.threshold,
      successRatePenaltyFloor: m.successRatePenalty.floor,
      alertPenaltyPerAlert: m.alertPenalty.perAlert,
      metricsHistoryLimit: me.maxHistoryPoints,
      metricsInterval: me.autoCaptureIntervalMs,
      tracesMaxEntries: t.maxEntries,
      tracesDbLoadLimit: t.dbLoadLimit,
      tracesTokenEstimateDivisor: t.tokenEstimateDivisor,
    });

    externalSecretsService.getStatus().then(setSecretsBackends).catch(() => {});

    const loadWebhooks = () => {
      try {
        const wh = notificationWebhookService.getWebhooks();
        if (Array.isArray(wh) && isMountedRef.current) {
          setWebhooks(wh);
          return true;
        }
      } catch {}
      return false;
    };
    if (!loadWebhooks()) {
      const interval = setInterval(() => { if (loadWebhooks() || !isMountedRef.current) clearInterval(interval); }, 500);
      setTimeout(() => clearInterval(interval), 10000);
    }

    return () => {
      isMountedRef.current = false;
      unsubSettings();
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      setVaultPassword('');
    };
  }, []);

  const updateSetting = useCallback((key: keyof SystemSettings, val: boolean | string | number) => {
    if (!isMountedRef.current) return;
    try {
      const newSettings = { ...settings, [key]: val };
      setSettings(newSettings);
      settingsService.updateSettings({ [key]: val });
      setError(null);
    } catch (err) {
      console.warn('[SettingsPanel] Failed to update setting:', err);
      setError('Failed to update setting');
      clearErrorAfterDelay();
    }
  }, [settings, clearErrorAfterDelay]);

  const handleVaultAction = useCallback(async () => {
    if (!vaultPassword.trim()) {
      setError('Please enter a master password');
      clearErrorAfterDelay(); return;
    }
    try {
      if (!isVaultActive) {
        await securityService.initialize(vaultPassword);
        setIsVaultActive(true);
        setError(null);
      } else {
        await securityService.initialize(vaultPassword);
        setError(null);
      }
    } catch (err) {
      setError('Vault operation failed');
      clearErrorAfterDelay();
    }
    setVaultPassword('');
  }, [vaultPassword, isVaultActive, clearErrorAfterDelay]);

  const handleSaveConfig = async () => {
    if (!configForm) return;
    try {
      await configService.updateMonitoring({
        healthCheckStaleIntervalMs: configForm.healthCheckStaleIntervalMs,
        latencyPenalty: { thresholdMs: configForm.latencyPenaltyThresholdMs, divisor: CONFIG.monitoring.latencyPenalty.divisor, cap: CONFIG.monitoring.latencyPenalty.cap },
        errorRatePenalty: { threshold: configForm.errorRatePenaltyThreshold, multiplier: CONFIG.monitoring.errorRatePenalty.multiplier, cap: CONFIG.monitoring.errorRatePenalty.cap },
        successRatePenalty: { floor: configForm.successRatePenaltyFloor, multiplier: CONFIG.monitoring.successRatePenalty.multiplier },
        alertPenalty: { perAlert: configForm.alertPenaltyPerAlert, cap: CONFIG.monitoring.alertPenalty.cap },
      });
      await configService.updateMetrics({
        maxHistoryPoints: configForm.metricsHistoryLimit,
        autoCaptureIntervalMs: configForm.metricsInterval,
      });
      await configService.updateTraces({
        maxEntries: configForm.tracesMaxEntries,
        dbLoadLimit: configForm.tracesDbLoadLimit,
        tokenEstimateDivisor: configForm.tracesTokenEstimateDivisor,
      });
      setError(null);
    } catch (err) {
      setError('Failed to save config');
      clearErrorAfterDelay();
    }
  };

  const handleResetDefaults = useCallback(() => {
    if (!window.confirm('Reset all settings to defaults?')) return;
    try {
      settingsService.reset();
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'Settings reset to defaults.', type: 'success' });
      setError(null);
    } catch (err) {
      console.warn('[SettingsPanel] Failed to reset settings:', err);
      setError('Failed to reset settings');
      clearErrorAfterDelay();
    }
  }, [clearErrorAfterDelay]);

  const [webhookForm, setWebhookForm] = useState<{ name: string; url: string; provider: WebhookProvider; events: WebhookEventType[] }>({
    name: '', url: '', provider: 'slack', events: ['system:notification'],
  });

  const EVENT_OPTIONS: WebhookEventType[] = [
    EVENTS.NOTIFICATION,
    EVENTS.KEY_QUOTA_EXCEEDED,
    'policy:violation',
    EVENTS.KEY_STATE_CHANGED,
    EVENTS.STREAM_ERROR,
  ];

  const { t } = useTranslation();

  const handlePurgeData = useCallback(async () => {
    if (!window.confirm('CRITICAL WARNING: This will permanently wipe all local OS state. Proceed?')) return;
    try {
      await keyService.clearAllData();
      eventBus.emit(EVENTS.NOTIFICATION, { message: 'All local data cleared.', type: 'success' });
      setError(null);
    } catch (err) {
      console.warn('[SettingsPanel] Failed to purge data:', err);
      setError('Failed to purge data');
      clearErrorAfterDelay();
    }
  }, [clearErrorAfterDelay]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sliders size={28} color="#3b82f6" aria-hidden="true" /> {t('nav.settings')}
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>{t('settings.general')}</p>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: '0.9rem' }}
            role="alert"
            aria-live="polite"
          >
            <AlertTriangle size={18} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }} aria-label="Dismiss error">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: '2rem', height: '100%', minHeight: 0 }}>

        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: '0.5rem' }} role="tablist" aria-label="Settings categories">
          {[
            { id: 'general', label: t('settings.general'), icon: <Settings size={18} aria-hidden="true" /> },
            { id: 'writing', label: t('settings.interaction'), icon: <MessageSquare size={18} aria-hidden="true" /> },
            { id: 'reading', label: t('nav.routing_ai'), icon: <Cpu size={18} aria-hidden="true" /> },
            { id: 'alerts', label: 'Alerts & Webhooks', icon: <Bell size={18} aria-hidden="true" /> },
            { id: 'advanced', label: t('settings.security'), icon: <Lock size={18} aria-hidden="true" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`settings-tab-${tab.id}`}
              style={{
                background: activeTab === tab.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === tab.id ? 'rgba(59,130,246,0.2)' : 'transparent',
                padding: '0.8rem 1rem', cursor: 'pointer', borderRadius: 12,
                color: activeTab === tab.id ? '#3b82f6' : 'var(--text-muted)',
                fontSize: '0.9rem', fontWeight: activeTab === tab.id ? 700 : 600,
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem',
                textAlign: 'left'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}

          <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'rgba(59,130,246,0.05)', borderRadius: 16, border: '1px solid rgba(59,130,246,0.1)' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
              <Info size={16} color="#3b82f6" aria-hidden="true" /> OS Telemetry
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Version:</span> <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>v{APP_VERSION}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Build ID:</span> <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>a9f3b2c</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Kernel:</span> <span style={{ color: canonicalHealthColor('ready'), fontWeight: 700 }}>{canonicalHealthLabel('ready')}</span></div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', paddingBottom: '2rem' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="tabpanel"
              id={`settings-tab-${activeTab}`}
              aria-labelledby={`settings-tab-${activeTab}`}
            >
              {activeTab === 'general' && (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>{t('settings.general')}</div>
                  <SettingRow icon={<Moon size={20} aria-hidden="true" />} title={t('settings.interface_theme')} description={t('settings.theme_desc')}>
                    <select
                      value={settings.theme}
                      onChange={e => updateSetting('theme', e.target.value)}
                      style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
                      aria-label={t('settings.interface_theme')}
                    >
                      <option value="dark">{t('settings.theme_dark')}</option>
                      <option value="light">{t('settings.theme_light')}</option>
                    </select>
                  </SettingRow>
                  <SettingRow icon={<Activity size={20} aria-hidden="true" />} title={t('settings.high_contrast')} description={t('settings.high_contrast_desc')}>
                    <Toggle checked={settings.themeConfig?.highContrast ?? false} onChange={(v) => { try { const next = { ...settings.themeConfig, highContrast: v }; setSettings(prev => ({ ...prev, themeConfig: next })); settingsService.updateSettings({ themeConfig: next }); } catch (e) { console.warn('[SettingsPanel] Failed to update highContrast:', e); } }} accent="#f97316" />
                  </SettingRow>
                  <SettingRow icon={<Globe size={20} aria-hidden="true" />} title={t('settings.language')} description={t('settings.language_desc')}>
                    <select
                      value={settings.language}
                      onChange={e => updateSetting('language', e.target.value)}
                      style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
                      aria-label={t('settings.language')}
                    >
                      <option value="en">{t('settings.lang_en')}</option>
                      <option value="ru">{t('settings.lang_ru')}</option>
                    </select>
                  </SettingRow>
                  <SettingRow icon={<Bell size={20} aria-hidden="true" />} title={t('settings.notifications')} description={t('settings.notifications_desc')}>
                    <Toggle checked={settings.notifications} onChange={(v) => updateSetting('notifications', v)} />
                  </SettingRow>
                </>
              )}

              {activeTab === 'writing' && (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>{t('settings.interaction')}</div>
                  <SettingRow icon={<MessageSquare size={20} aria-hidden="true" />} title={t('settings.chat_strategy')} description={t('settings.chat_strategy_desc')}>
                    <select
                      value={settings.defaultMode}
                      onChange={e => updateSetting('defaultMode', e.target.value as 'broadcast' | 'single' | 'smart')}
                      style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
                      aria-label={t('settings.chat_strategy_aria')}
                    >
                      <option value="smart">{t('settings.strategy_auto')}</option>
                      <option value="broadcast">{t('settings.strategy_swarm')}</option>
                      <option value="single">{t('settings.strategy_fixed')}</option>
                    </select>
                  </SettingRow>
                  <SettingRow icon={<Zap size={20} aria-hidden="true" />} title={t('settings.streaming')} description={t('settings.streaming_desc')}>
                    <Toggle checked={settings.streamingEnabled} onChange={(v) => updateSetting('streamingEnabled', v)} accent="#10b981" />
                  </SettingRow>
                  <SettingRow icon={<HardDrive size={20} aria-hidden="true" />} title={t('settings.history')} description={t('settings.history_desc')}>
                    <Toggle checked={settings.historyPersistence} onChange={(v) => updateSetting('historyPersistence', v)} accent="#a855f7" />
                  </SettingRow>
                </>
              )}

              {activeTab === 'reading' && (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>{t('nav.routing_ai')}</div>
                  <SettingRow icon={<Cpu size={20} aria-hidden="true" />} title={t('settings.router_title')} description={t('settings.router_desc')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <input
                        type="range" min="0" max="50"
                        value={Math.round(settings.explorationFactor * 100)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) / 100;
                          updateSetting('explorationFactor', val);
                        }}
                        style={{ width: 140, accentColor: '#3b82f6', cursor: 'pointer' }}
                        aria-label={t('settings.exploration_aria')}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 800, width: 80, textAlign: 'right', textTransform: 'uppercase' }}>
                        {settings.explorationFactor < 0.05 ? t('settings.exploration_greedy') : settings.explorationFactor > 0.3 ? t('settings.exploration_explore') : t('settings.exploration_balanced')}
                      </span>
                    </div>
                  </SettingRow>
                  <SettingRow icon={<AlertCircle size={20} aria-hidden="true" />} title={t('settings.fallback')} description={t('settings.fallback_desc')}>
                    <Toggle checked={settings.fallbackEnabled} onChange={(v) => updateSetting('fallbackEnabled', v)} />
                  </SettingRow>
                  <SettingRow icon={<Activity size={20} aria-hidden="true" />} title={t('settings.auto_health')} description={t('settings.auto_health_desc')}>
                    <Toggle checked={settings.autoHealthCheck} onChange={(v) => updateSetting('autoHealthCheck', v)} accent="#10b981" />
                  </SettingRow>
                  <details style={{ marginBottom: '1rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
                    <summary style={{ padding: '1rem 1.5rem', cursor: 'pointer', fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Shield size={16} color="#3b82f6" /> Fallback Chains
                    </summary>
                    <div style={{ padding: '0 1.5rem 1.5rem' }}>
                      {Object.entries(settings.fallbackChains || {}).map(([strategy, chain]) => (
                        <div key={strategy} style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{strategy}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {(chain as Array<{provider:string;model?:string}>).map((link, i) => (
                              <span key={i} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd', fontSize: '0.8rem' }}>
                                {link.provider}{link.model ? ` / ${link.model}` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                  <details style={{ marginBottom: '1rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
                    <summary style={{ padding: '1rem 1.5rem', cursor: 'pointer', fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sliders size={16} color="#a855f7" /> Model Downgrade Chains
                    </summary>
                    <div style={{ padding: '0 1.5rem 1.5rem' }}>
                      {Object.entries(settings.modelDowngradeChains || {}).map(([model, chain]) => (
                        <div key={model} style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', minWidth: 120 }}>{model}</span>
                          <span style={{ color: '#64748b' }}>→</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {(Array.isArray(chain) ? chain : []).map((m, i) => (
                              <span key={i} style={{ padding: '0.2rem 0.5rem', borderRadius: 5, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#d8b4fe', fontSize: '0.75rem' }}>
                                {m as string}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </>
              )}

              {activeTab === 'alerts' && (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>{t('settings.webhooks_title')}</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                    {t('settings.webhooks_desc')}
                  </div>
                  {(Array.isArray(webhooks) ? webhooks : []).map(wh => (
                    <SettingRow key={wh.id} icon={<Webhook size={20} />} title={wh.name} description={`${wh.provider} — ${wh.events.length} event(s)`}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Toggle checked={wh.enabled} onChange={(v) => { notificationWebhookService.updateWebhook(wh.id, { enabled: v }); setSettings({ ...settings }); }} />
                        <button
                          style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '0.4rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', cursor: 'pointer' }}
                          onClick={() => { notificationWebhookService.removeWebhook(wh.id); setSettings({ ...settings }); }}
                        >
                          {t('settings.webhooks_remove')}
                        </button>
                      </div>
                    </SettingRow>
                  ))}
                  {(Array.isArray(webhooks) ? webhooks : []).length === 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '2rem', fontStyle: 'italic' }}>
                      {t('settings.webhooks_empty')}
                    </div>
                  )}
                  <div style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>{t('settings.webhooks_form_title')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input id="wh-name" placeholder={t('settings.webhooks_name_placeholder')} value={webhookForm.name} onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })}
                        style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '0.85rem', outline: 'none' }} />
                      <input id="wh-url" placeholder={t('settings.webhooks_url_placeholder')} value={webhookForm.url} onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })}
                        style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '0.85rem', outline: 'none' }} />
                      <select value={webhookForm.provider} onChange={e => setWebhookForm({ ...webhookForm, provider: e.target.value as WebhookProvider })}
                        style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', cursor: 'pointer' }}>
                        <option value="slack">{t('settings.webhooks_type_slack')}</option>
                        <option value="telegram">{t('settings.webhooks_type_telegram')}</option>
                      </select>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {EVENT_OPTIONS.map(evt => (
                          <label key={evt} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: webhookForm.events.includes(evt) ? '#60a5fa' : '#64748b', cursor: 'pointer' }}>
                            <input type="checkbox" checked={webhookForm.events.includes(evt)} onChange={() => {
                              setWebhookForm({
                                ...webhookForm,
                                events: webhookForm.events.includes(evt) ? webhookForm.events.filter(e => e !== evt) : [...webhookForm.events, evt]
                              });
                            }} style={{ accentColor: '#3b82f6' }} />
                            {evt.replace(/:/g, ' ')}
                          </label>
                        ))}
                      </div>
                      <button
                        style={{ alignSelf: 'flex-start', padding: '0.6rem 1.5rem', borderRadius: 8, background: '#3b82f6', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                        onClick={() => {
                          if (!webhookForm.name || !webhookForm.url) return;
                          notificationWebhookService.addWebhook({
                            provider: webhookForm.provider,
                            name: webhookForm.name,
                            webhookUrl: webhookForm.url,
                            enabled: true,
                            events: webhookForm.events,
                          });
                          setWebhookForm({ name: '', url: '', provider: 'slack', events: ['system:notification'] });
                          setSettings({ ...settings });
                        }}
                      >
                        {t('settings.webhooks_add')}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'advanced' && (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>{t('settings.security')}</div>

                  <details style={{ marginBottom: '1.5rem' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', padding: '0.5rem 0', userSelect: 'none' }}>
                      Runtime Configuration (editable)
                    </summary>
                    {configForm && (
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, marginTop: '0.5rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>Monitoring</div>
                        <ConfigInput label="Health stale interval (ms)" value={configForm.healthCheckStaleIntervalMs} onChange={v => setConfigForm(f => f ? { ...f, healthCheckStaleIntervalMs: v } : f)} />
                        <ConfigInput label="Latency penalty threshold (ms)" value={configForm.latencyPenaltyThresholdMs} onChange={v => setConfigForm(f => f ? { ...f, latencyPenaltyThresholdMs: v } : f)} />
                        <ConfigInput label="Error rate penalty threshold" value={configForm.errorRatePenaltyThreshold} onChange={v => setConfigForm(f => f ? { ...f, errorRatePenaltyThreshold: v } : f)} step="0.01" />
                        <ConfigInput label="Success rate penalty floor" value={configForm.successRatePenaltyFloor} onChange={v => setConfigForm(f => f ? { ...f, successRatePenaltyFloor: v } : f)} step="0.01" />
                        <ConfigInput label="Alert per-alert penalty" value={configForm.alertPenaltyPerAlert} onChange={v => setConfigForm(f => f ? { ...f, alertPenaltyPerAlert: v } : f)} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a855f7' }}>Metrics</div>
                        <ConfigInput label="History limit (points)" value={configForm.metricsHistoryLimit} onChange={v => setConfigForm(f => f ? { ...f, metricsHistoryLimit: v } : f)} />
                        <ConfigInput label="Collection interval (ms)" value={configForm.metricsInterval} onChange={v => setConfigForm(f => f ? { ...f, metricsInterval: v } : f)} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>Traces</div>
                        <ConfigInput label="Max entries" value={configForm.tracesMaxEntries} onChange={v => setConfigForm(f => f ? { ...f, tracesMaxEntries: v } : f)} />
                        <ConfigInput label="DB load limit" value={configForm.tracesDbLoadLimit} onChange={v => setConfigForm(f => f ? { ...f, tracesDbLoadLimit: v } : f)} />
                        <ConfigInput label="Token estimate divisor" value={configForm.tracesTokenEstimateDivisor} onChange={v => setConfigForm(f => f ? { ...f, tracesTokenEstimateDivisor: v } : f)} />
                        <button onClick={handleSaveConfig} style={{ alignSelf: 'flex-end', padding: '0.6rem 1.5rem', borderRadius: 8, background: '#10b981', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                          Save Config
                        </button>
                      </div>
                    )}
                  </details>

                  <SettingRow icon={<Shield size={20} aria-hidden="true" />} accent="#10b981" title={t('settings.vault_title')} description={t('settings.vault_desc')}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="password"
                        placeholder={t('settings.vault_password_aria')}
                        value={vaultPassword}
                        onChange={(e) => setVaultPassword(e.target.value)}
                        style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '0.85rem', width: 180, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#10b981'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        aria-label={t('settings.vault_password_aria')}
                      />
                      <button
                        style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem', borderRadius: 8, background: isVaultActive ? '#3b82f6' : '#10b981', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                        onClick={handleVaultAction}
                        aria-label={t('settings.vault_update_aria')}
                      >
                        {isVaultActive ? t('settings.vault_update') : t('settings.vault_encrypt')}
                      </button>
                    </div>
                  </SettingRow>
                  <SettingRow icon={<Key size={20} aria-hidden="true" />} accent="#8b5cf6" title="Secrets Backends" description="Active secret storage backend — currently {secretsBackends.find(b => b.active)?.label || 'none'}">
                    <button onClick={() => setShowSecretsDetail(v => !v)}
                      style={{ color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.3)', padding: '0.4rem 1rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: showSecretsDetail ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.3)', cursor: 'pointer' }}>
                      {showSecretsDetail ? 'Hide' : 'Manage'}
                    </button>
                  </SettingRow>
                  {showSecretsDetail && (
                    <div style={{ marginTop: '-0.5rem', marginBottom: '1rem', marginLeft: '3rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {secretsBackends.length === 0 && <span style={{ color: '#64748b' }}>No backends configured</span>}
                      {secretsBackends.map(b => (
                        <div key={b.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{b.label}</span>
                            <span style={{ marginLeft: '0.5rem', color: '#64748b' }}>({b.type})</span>
                            <span style={{ marginLeft: '0.5rem', color: b.healthy ? '#10b981' : '#ef4444' }}>
                              {b.healthy ? '✓' : '✗'}
                            </span>
                          </div>
                          {!b.active && (
                            <button onClick={async () => {
                              await externalSecretsService.activateBackend(b.type, { type: b.type, label: b.label });
                              const status = await externalSecretsService.getStatus();
                              setSecretsBackends(status);
                            }}
                              style={{ padding: '0.3rem 0.75rem', borderRadius: 6, background: '#8b5cf6', border: 'none', color: 'white', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}>
                              Activate
                            </button>
                          )}
                          {b.active && <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>Active</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <SettingRow icon={<Terminal size={20} aria-hidden="true" />} accent="#a855f7" title={t('settings.debug')} description={t('settings.debug_desc')}>
                    <Toggle checked={settings.debugMode} onChange={(v) => updateSetting('debugMode', v)} accent="#a855f7" />
                  </SettingRow>
                  <SettingRow icon={<Settings size={20} aria-hidden="true" />} accent="#f59e0b" title={t('settings.reset_title')} description={t('settings.reset_desc')}>
                    <button
                      style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', padding: '0.6rem 1.25rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer' }}
                      onClick={handleResetDefaults}
                      aria-label={t('settings.reset_aria')}
                    >
                      {t('settings.reset_button')}
                    </button>
                  </SettingRow>
                  <SettingRow icon={<Database size={20} aria-hidden="true" />} accent="#ef4444" title={t('settings.factory_reset')} description={t('settings.factory_reset_desc')}>
                    <button
                      style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', padding: '0.6rem 1.25rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={handlePurgeData}
                      aria-label={t('settings.factory_aria')}
                    >
                      <Trash2 size={16} aria-hidden="true" /> {t('settings.factory_button')}
                    </button>
                  </SettingRow>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ModuleInfo moduleKey="settings" />
    </div>
  );
};

export default SettingsPanel;
