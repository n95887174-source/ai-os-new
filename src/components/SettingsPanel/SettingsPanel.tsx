import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Globe, Bell, Shield, Database, Info, 
  Settings, Zap, AlertCircle, Trash2, Cpu,
  MessageSquare, HardDrive, Sliders, Lock, BookText,
  Activity, Terminal, AlertTriangle, Webhook, Key
} from 'lucide-react';
import { keyService, featureFlagService } from '../../kernel/instances';
import { securityService } from '../../core/SecurityService';
import { eventBus } from '../../core/events';
import { EVENTS } from '../../kernel/events/event-names';
import { settingsService } from '../../kernel/instances';
import { notificationWebhookService } from '../../kernel/instances';
import { externalSecretsService } from '../../kernel/instances';
import type { SystemSettings } from '../../kernel/instances';
import type { WebhookConfig, WebhookProvider, WebhookEventType } from '../../kernel/instances';
import type { BackendType, BackendStatus } from '../../kernel/instances';
import { CONFIG } from '../../kernel/services/config-registry';
import { configService } from '../../kernel/instances';
import { APP_VERSION } from '../../utils/version';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import PromptsTab from './PromptsTab';
import { canonicalHealthColor, canonicalHealthLabel } from '../Common/status-vocabulary';

import { amberBtn, dangerBtn, detailsContainer, detailsSummary, errorBannerLg, flexBetween, flexCenterGap2, flexColGap3, flexGap2, flexJustifyBetween, sectionTitleLarge, settingSelect, textMutedSm, textSecondary, webhookInput } from '../../styles/common';
type SettingsTab = 'general' | 'writing' | 'reading' | 'alerts' | 'prompts' | 'advanced';

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

const Toggle = ({ checked, onChange, accent = '#3b82f6', ariaLabel = 'Toggle setting' }: { checked: boolean; onChange: (v: boolean) => void; accent?: string; ariaLabel?: string }) => (
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
    aria-label={ariaLabel}
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

interface ConfigInputProps { label: string; value: number; onChange: (v: number) => void; step?: string; min?: number; max?: number; defaultValue?: number; }
const ConfigInput = ({ label, value, onChange, step = '1', min = 0, max = Infinity, defaultValue = 0 }: ConfigInputProps) => {
  const [error, setError] = useState<string | null>(null);
  const handleChange = (raw: string) => {
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) {
      setError('Invalid number');
      onChange(defaultValue);
      return;
    }
    if (parsed < min) {
      setError(`Min ${min}`);
      onChange(min);
      return;
    }
    if (parsed > max) {
      setError(`Max ${max}`);
      onChange(max);
      return;
    }
    setError(null);
    onChange(parsed);
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
      <label style={{ color: '#94a3b8', fontSize: '0.78rem' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {error && <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>{error}</span>}
        <input type="number" value={value} step={step}
          onChange={e => handleChange(e.target.value)}
          style={{ width: 100, padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.3)', border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color: '#e2e8f0', textAlign: 'right', fontSize: '0.78rem', outline: 'none' }} />
      </div>
    </div>
  );
};

const SettingsPanel: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<SystemSettings>(() => { try { return settingsService.getSettings(); } catch { return {} as SystemSettings; } });
  const [vaultPassword, setVaultPassword] = useState('');
  const [isVaultActive, setIsVaultActive] = useState(() => { try { return !securityService.isLocked(); } catch { return true; } });
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
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>(() => featureFlagService.getAll());

  const isMountedRef = useRef(true);

  const clearError = useAutoClearError(setError);

  useEffect(() => {
    isMountedRef.current = true;
    const unsubSettings = settingsService.subscribe((newSettings) => {
      if (isMountedRef.current) setSettings(newSettings);
    });

    const unsubFlags = featureFlagService.onChange((flag) => {
      if (isMountedRef.current) setFeatureFlags(featureFlagService.getAll());
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
      unsubFlags();
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
      setError(t('settings.error_update'));
      clearError();
    }
  }, [settings, clearError, t]);

  const handleVaultAction = useCallback(async () => {
    if (!vaultPassword.trim()) {
      setError(t('settings.error_vault_password'));
      clearError(); return;
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
      setError(t('settings.error_vault_operation'));
      clearError();
    }
    setVaultPassword('');
  }, [vaultPassword, isVaultActive, clearError, t]);

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
      setError(t('settings.error_save_config'));
      clearError();
    }
  };

  const handleResetDefaults = useCallback(() => {
    if (!window.confirm(t('settings.reset_confirm'))) return;
    try {
      settingsService.reset();
      eventBus.emit(EVENTS.NOTIFICATION, { message: t('settings.reset_success_notification'), type: 'success' });
      setError(null);
    } catch (err) {
      console.warn('[SettingsPanel] Failed to reset settings:', err);
      setError(t('settings.error_reset'));
      clearError();
    }
  }, [clearError, t]);

  const webhookConfig = (() => { try { return configService.getWebhooks() || CONFIG.webhooks; } catch { return CONFIG.webhooks; } })();
  const EVENT_OPTIONS = (webhookConfig.eventOptions || CONFIG.webhooks.eventOptions) as WebhookEventType[];
  const PROVIDER_OPTIONS = (webhookConfig.providers || CONFIG.webhooks.providers) as WebhookProvider[];

  const [webhookForm, setWebhookForm] = useState<{ name: string; url: string; provider: WebhookProvider; events: WebhookEventType[] }>(() => ({
    name: '', url: '', provider: PROVIDER_OPTIONS[0] as WebhookProvider, events: [EVENT_OPTIONS[0] as WebhookEventType],
  }));

  // t is declared at the top of the component scope

  const handlePurgeData = useCallback(async () => {
    if (!window.confirm(t('settings.purge_confirm'))) return;
    try {
      await keyService.clearAllData();
      eventBus.emit(EVENTS.NOTIFICATION, { message: t('settings.purge_success_notification'), type: 'success' });
      setError(null);
    } catch (err) {
      console.warn('[SettingsPanel] Failed to purge data:', err);
      setError(t('settings.error_purge'));
      clearError();
    }
  }, [clearError, t]);

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
            style={errorBannerLg}
            role="alert"
            aria-live="polite"
          >
            <AlertTriangle size={18} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }} aria-label="Dismiss error">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: '2rem', height: '100%', minHeight: 0, flexWrap: 'wrap' }}>

        <div style={{ width: 260, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }} role="tablist" aria-label="Settings categories">
          {[
            { id: 'general', label: t('settings.general'), icon: <Settings size={18} aria-hidden="true" /> },
            { id: 'writing', label: t('settings.interaction'), icon: <MessageSquare size={18} aria-hidden="true" /> },
            { id: 'reading', label: t('nav.routing_ai'), icon: <Cpu size={18} aria-hidden="true" /> },
            { id: 'alerts', label: t('settings.tab.alerts'), icon: <Bell size={18} aria-hidden="true" /> },
            { id: 'prompts', label: t('settings.tab.prompts'), icon: <BookText size={18} aria-hidden="true" /> },
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
              <Info size={16} color="#3b82f6" aria-hidden="true" /> {t('settings.telemetry')}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <div style={flexJustifyBetween}><span>{t('settings.version_label')}</span> <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>v{APP_VERSION}</span></div>
              <div style={flexJustifyBetween}><span>{t('settings.build_id')}</span> <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>{CONFIG.buildId}</span></div>
              <div style={flexJustifyBetween}><span>{t('settings.kernel_label')}</span> <span style={{ color: canonicalHealthColor('ready'), fontWeight: 700 }}>{canonicalHealthLabel('ready')}</span></div>
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
                  <div style={sectionTitleLarge}>{t('settings.general')}</div>
                  <SettingRow icon={<Moon size={20} aria-hidden="true" />} title={t('settings.interface_theme')} description={t('settings.theme_desc')}>
                    <select
                      value={settings.theme}
                      onChange={e => updateSetting('theme', e.target.value)}
                      style={settingSelect}
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
                      style={settingSelect}
                      aria-label={t('settings.language')}
                    >
                      <option value="en">{t('settings.lang_en')}</option>
                      <option value="ru">{t('settings.lang_ru')}</option>
                    </select>
                  </SettingRow>
                  <SettingRow icon={<Bell size={20} aria-hidden="true" />} title={t('settings.notifications')} description={t('settings.notifications_desc')}>
                    <Toggle checked={settings.notifications} onChange={(v) => updateSetting('notifications', v)} />
                  </SettingRow>

                  <details style={detailsContainer}>
                    <summary style={detailsSummary}>
                      <Sliders size={16} color="#10b981" /> {t('settings.feature_flags')}
                    </summary>
                    <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <SettingRow icon={<HardDrive size={20} aria-hidden="true" />} title={t('settings.memory_system')} description={t('settings.memory_system_desc')}>
                        <Toggle checked={featureFlags['memory.enabled'] ?? true} onChange={(v) => { featureFlagService.setEnabled('memory.enabled', v); setFeatureFlags(featureFlagService.getAll()); }} accent="#10b981" />
                      </SettingRow>
                      <SettingRow icon={<Activity size={20} aria-hidden="true" />} title={t('settings.semantic_search')} description={t('settings.semantic_search_desc')}>
                        <Toggle checked={featureFlags['memory.semantic'] ?? true} onChange={(v) => { featureFlagService.setEnabled('memory.semantic', v); setFeatureFlags(featureFlagService.getAll()); }} accent="#8b5cf6" />
                      </SettingRow>
                      <SettingRow icon={<Zap size={20} aria-hidden="true" />} title={t('settings.rag_on_chat')} description={t('settings.rag_on_chat_desc')}>
                        <Toggle checked={featureFlags['memory.ragOnChat'] ?? true} onChange={(v) => { featureFlagService.setEnabled('memory.ragOnChat', v); setFeatureFlags(featureFlagService.getAll()); }} accent="#f59e0b" />
                      </SettingRow>
                      <SettingRow icon={<MessageSquare size={20} aria-hidden="true" />} title={t('settings.auto_store_memory')} description={t('settings.auto_store_memory_desc')}>
                        <Toggle checked={featureFlags['memory.autoStore'] ?? true} onChange={(v) => { featureFlagService.setEnabled('memory.autoStore', v); setFeatureFlags(featureFlagService.getAll()); }} accent="#3b82f6" />
                      </SettingRow>
                    </div>
                  </details>
                </>
              )}

              {activeTab === 'writing' && (
                <>
                  <div style={sectionTitleLarge}>{t('settings.interaction')}</div>
                  <SettingRow icon={<MessageSquare size={20} aria-hidden="true" />} title={t('settings.chat_strategy')} description={t('settings.chat_strategy_desc')}>
                    <select
                      value={settings.defaultMode}
                      onChange={e => updateSetting('defaultMode', e.target.value as 'broadcast' | 'single' | 'smart')}
                      style={settingSelect}
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
                  <div style={sectionTitleLarge}>{t('nav.routing_ai')}</div>
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
                  <details style={detailsContainer}>
                    <summary style={detailsSummary}>
                      <Shield size={16} color="#3b82f6" /> {t('settings.fallback_chains')}
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
                  <details style={detailsContainer}>
                    <summary style={detailsSummary}>
                      <Sliders size={16} color="#a855f7" /> {t('settings.model_downgrade')}
                    </summary>
                    <div style={{ padding: '0 1.5rem 1.5rem' }}>
                      {Object.entries(settings.modelDowngradeChains || {}).map(([model, chain]) => (
                        <div key={model} style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', minWidth: 120 }}>{model}</span>
                          <span style={textSecondary}>→</span>
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
                  <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={16} /> {t('settings.system')}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
                      {t('settings.restart_desc')}
                    </div>
                    <button
                      onClick={() => { window.location.hash = '#restart'; window.location.reload(); }}
                      style={{ padding: '0.6rem 1.25rem', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                      aria-label={t('settings.restart_aria')}
                    >
                      {t('settings.restart_button')}
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'alerts' && (
                <>
                  <div style={sectionTitleLarge}>{t('settings.webhooks_title')}</div>
                  <div style={textMutedSm}>
                    {t('settings.webhooks_desc')}
                  </div>
                  {(Array.isArray(webhooks) ? webhooks : []).map(wh => (
                    <SettingRow key={wh.id} icon={<Webhook size={20} />} title={wh.name} description={`${wh.provider} — ${wh.events.length} event(s)`}>
                      <div style={flexCenterGap2}>
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
                    <div style={flexColGap3}>
                      <input id="wh-name" placeholder={t('settings.webhooks_name_placeholder')} value={webhookForm.name} onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })}
                        style={webhookInput} />
                      <input id="wh-url" placeholder={t('settings.webhooks_url_placeholder')} value={webhookForm.url} onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })}
                        style={webhookInput} />
                      <select value={webhookForm.provider} onChange={e => setWebhookForm({ ...webhookForm, provider: e.target.value as WebhookProvider })}
                        style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', cursor: 'pointer' }}>
                        {PROVIDER_OPTIONS.map(prov => (
                          <option key={prov} value={prov}>
                            {prov === 'slack' ? t('settings.webhooks_type_slack') : prov === 'telegram' ? t('settings.webhooks_type_telegram') : prov}
                          </option>
                        ))}
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
                          setWebhookForm({
                            name: '',
                            url: '',
                            provider: (PROVIDER_OPTIONS[0] || 'slack') as WebhookProvider,
                            events: [(EVENT_OPTIONS[0] || 'system:notification') as WebhookEventType]
                          });
                          setSettings({ ...settings });
                        }}
                      >
                        {t('settings.webhooks_add')}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'prompts' && (
                <PromptsTab />
              )}

              {activeTab === 'advanced' && (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>{t('settings.security')}</div>

                  <details style={{ marginBottom: '1.5rem' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa', padding: '0.5rem 0', userSelect: 'none' }}>
                      {t('settings.runtime_config')}
                    </summary>
                    {configForm && (
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, marginTop: '0.5rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>{t('settings.monitoring')}</div>
                        <ConfigInput label={t('settings.health_stale_interval')} value={configForm.healthCheckStaleIntervalMs} onChange={v => setConfigForm(f => f ? { ...f, healthCheckStaleIntervalMs: v } : f)} min={1000} max={3600000} defaultValue={30000} />
                        <ConfigInput label={t('settings.latency_penalty_threshold')} value={configForm.latencyPenaltyThresholdMs} onChange={v => setConfigForm(f => f ? { ...f, latencyPenaltyThresholdMs: v } : f)} min={0} max={60000} defaultValue={1000} />
                        <ConfigInput label={t('settings.error_rate_penalty')} value={configForm.errorRatePenaltyThreshold} onChange={v => setConfigForm(f => f ? { ...f, errorRatePenaltyThreshold: v } : f)} step="0.01" min={0} max={1} defaultValue={0.1} />
                        <ConfigInput label={t('settings.success_rate_penalty')} value={configForm.successRatePenaltyFloor} onChange={v => setConfigForm(f => f ? { ...f, successRatePenaltyFloor: v } : f)} step="0.01" min={0} max={1} defaultValue={0.5} />
                        <ConfigInput label={t('settings.alert_penalty')} value={configForm.alertPenaltyPerAlert} onChange={v => setConfigForm(f => f ? { ...f, alertPenaltyPerAlert: v } : f)} min={0} max={100} defaultValue={5} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a855f7' }}>{t('settings.metrics')}</div>
                        <ConfigInput label={t('settings.history_limit')} value={configForm.metricsHistoryLimit} onChange={v => setConfigForm(f => f ? { ...f, metricsHistoryLimit: v } : f)} min={10} max={100000} defaultValue={100} />
                        <ConfigInput label={t('settings.collection_interval')} value={configForm.metricsInterval} onChange={v => setConfigForm(f => f ? { ...f, metricsInterval: v } : f)} min={1000} max={3600000} defaultValue={60000} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>{t('settings.traces_label')}</div>
                        <ConfigInput label={t('settings.max_entries')} value={configForm.tracesMaxEntries} onChange={v => setConfigForm(f => f ? { ...f, tracesMaxEntries: v } : f)} min={10} max={100000} defaultValue={1000} />
                        <ConfigInput label={t('settings.db_load_limit')} value={configForm.tracesDbLoadLimit} onChange={v => setConfigForm(f => f ? { ...f, tracesDbLoadLimit: v } : f)} min={1} max={10000} defaultValue={100} />
                        <ConfigInput label={t('settings.token_estimate_divisor')} value={configForm.tracesTokenEstimateDivisor} onChange={v => setConfigForm(f => f ? { ...f, tracesTokenEstimateDivisor: v } : f)} min={1} max={10000} defaultValue={1000} />
                        <button onClick={handleSaveConfig} style={{ alignSelf: 'flex-end', padding: '0.6rem 1.5rem', borderRadius: 8, background: '#10b981', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                          {t('settings.save_config')}
                        </button>
                      </div>
                    )}
                  </details>

                  <SettingRow icon={<Shield size={20} aria-hidden="true" />} accent="#10b981" title={t('settings.vault_title')} description={t('settings.vault_desc')}>
                    <div style={flexGap2}>
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
                  <SettingRow icon={<Key size={20} aria-hidden="true" />} accent="#8b5cf6" title={t('settings.secrets_backends')} description={t('settings.secrets_backends_desc', { backend: secretsBackends.find(b => b.active)?.label || t('common.not_available') })}>
                    <button onClick={() => setShowSecretsDetail(v => !v)}
                      style={{ color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.3)', padding: '0.4rem 1rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: showSecretsDetail ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.3)', cursor: 'pointer' }}>
                      {showSecretsDetail ? t('settings.hide') : t('settings.manage')}
                    </button>
                  </SettingRow>
                  {showSecretsDetail && (
                    <div style={{ marginTop: '-0.5rem', marginBottom: '1rem', marginLeft: '3rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 10, fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {secretsBackends.length === 0 && <span style={textSecondary}>{t('settings.no_backends')}</span>}
                      {secretsBackends.map(b => (
                        <div key={b.type} style={flexBetween}>
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
                              {t('settings.activate')}
                            </button>
                          )}
                          {b.active && <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase' }}>{t('common.active')}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <SettingRow icon={<Terminal size={20} aria-hidden="true" />} accent="#a855f7" title={t('settings.debug')} description={t('settings.debug_desc')}>
                    <Toggle checked={settings.debugMode} onChange={(v) => updateSetting('debugMode', v)} accent="#a855f7" />
                  </SettingRow>
                  <SettingRow icon={<Settings size={20} aria-hidden="true" />} accent="#f59e0b" title={t('settings.reset_title')} description={t('settings.reset_desc')}>
                    <button
                      style={amberBtn}
                      onClick={handleResetDefaults}
                      aria-label={t('settings.reset_aria')}
                    >
                      {t('settings.reset_button')}
                    </button>
                  </SettingRow>
                  <SettingRow icon={<Database size={20} aria-hidden="true" />} accent="#ef4444" title={t('settings.factory_reset')} description={t('settings.factory_reset_desc')}>
                    <button
                      style={{ ...dangerBtn, display: 'flex', alignItems: 'center', gap: 6 }}
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
