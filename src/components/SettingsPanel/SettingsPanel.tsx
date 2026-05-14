import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Globe, Bell, Shield, Database, Info, 
  Settings, Zap, AlertCircle, Trash2, Cpu,
  MessageSquare, HardDrive, Sliders, Lock,
  Activity, Terminal, AlertTriangle, Webhook
} from 'lucide-react';
import { keyService } from '../../services/KeyService';
import { securityService } from '../../core/SecurityService';
import { eventBus, EVENTS } from '../../core/events';
import { settingsService } from '../../services/SettingsService';
import { notificationWebhookService } from '../../services/NotificationWebhookService';
import type { SystemSettings } from '../../services/SettingsService';
import type { WebhookConfig, WebhookProvider, WebhookEventType } from '../../services/NotificationWebhookService';
import { APP_VERSION } from '../../utils/version';

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
      width: 50, height: 28, borderRadius: 14, border: `1px solid ${checked ? accent : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer',
      background: checked ? accent : 'rgba(0,0,0,0.3)',
      position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: checked ? `0 0 15px ${accent}40` : 'inset 0 2px 4px rgba(0,0,0,0.3)'
    }}
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

const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<SystemSettings>(settingsService.getSettings());
  const [vaultPassword, setVaultPassword] = useState('');
  const [isVaultActive, setIsVaultActive] = useState(!securityService.isLocked());
  const [error, setError] = useState<string | null>(null);

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
      clearErrorAfterDelay();
      return;
    }
    try {
      if (isVaultActive) {
        await securityService.initialize(vaultPassword);
        await keyService.unlockVault(vaultPassword);
        if (isMountedRef.current) {
          setIsVaultActive(true);
          setVaultPassword('');
          eventBus.emit(EVENTS.NOTIFICATION, { message: 'Vault re-encrypted successfully.', type: 'success' });
          setError(null);
        }
      } else {
        const ok = await securityService.initialize(vaultPassword);
        if (ok && isMountedRef.current) {
          const success = await keyService.unlockVault(vaultPassword);
          if (success) {
            setIsVaultActive(true);
            setVaultPassword('');
            eventBus.emit(EVENTS.NOTIFICATION, { message: 'Vault encryption enabled successfully.', type: 'success' });
            setError(null);
          } else {
            throw new Error('Failed to unlock vault');
          }
        } else if (isMountedRef.current) {
          throw new Error('Failed to initialize security service');
        }
      }
    } catch (err) {
      console.warn('[SettingsPanel] Vault action failed:', err);
      if (isMountedRef.current) {
        setError(isVaultActive ? 'Failed to update vault password' : 'Failed to enable vault encryption');
        clearErrorAfterDelay();
      }
    }
  }, [vaultPassword, isVaultActive, clearErrorAfterDelay]);

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

  const EVENT_OPTIONS: WebhookEventType[] = ['system:notification', 'key:quota-exceeded', 'policy:violation', 'key:state-changed', 'chat:stream:error'];

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflow: 'hidden' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sliders size={28} color="#3b82f6" aria-hidden="true" /> System Configuration
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Fine-tune kernel parameters, telemetry, and environment preferences.</p>
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
            { id: 'general', label: 'General Settings', icon: <Settings size={18} aria-hidden="true" /> },
            { id: 'writing', label: 'Interaction & Memory', icon: <MessageSquare size={18} aria-hidden="true" /> },
            { id: 'reading', label: 'Routing Engine', icon: <Cpu size={18} aria-hidden="true" /> },
            { id: 'alerts', label: 'Alerts & Webhooks', icon: <Bell size={18} aria-hidden="true" /> },
            { id: 'advanced', label: 'Security & Vault', icon: <Lock size={18} aria-hidden="true" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as SettingsTab)}
              role="tab"
              aria-selected={activeTab === t.id}
              aria-controls={`settings-tab-${t.id}`}
              style={{
                background: activeTab === t.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === t.id ? 'rgba(59,130,246,0.2)' : 'transparent',
                padding: '0.8rem 1rem', cursor: 'pointer', borderRadius: 12,
                color: activeTab === t.id ? '#3b82f6' : 'var(--text-muted)',
                fontSize: '0.9rem', fontWeight: activeTab === t.id ? 700 : 600,
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem',
                textAlign: 'left'
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}

          <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'rgba(59,130,246,0.05)', borderRadius: 16, border: '1px solid rgba(59,130,246,0.1)' }}>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
              <Info size={16} color="#3b82f6" aria-hidden="true" /> OS Telemetry
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Version:</span> <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>v{APP_VERSION}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Build ID:</span> <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>a9f3b2c</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Kernel:</span> <span style={{ color: '#10b981', fontWeight: 700 }}>ONLINE</span></div>
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
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>General Preferences</div>
                  <SettingRow icon={<Moon size={20} aria-hidden="true" />} title="Interface Theme" description="Select the visual style. The Deep Space theme is optimized for extended use.">
                    <select
                      value={settings.theme}
                      onChange={e => updateSetting('theme', e.target.value)}
                      style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
                      aria-label="Interface theme"
                    >
                      <option value="dark">Dark (Deep Space)</option>
                      <option value="light">Light (Coming Soon)</option>
                    </select>
                  </SettingRow>
                  <SettingRow icon={<Globe size={20} aria-hidden="true" />} title="System Language" description="Select the interface language for OS tools and documentation.">
                    <select
                      value={settings.language}
                      onChange={e => updateSetting('language', e.target.value)}
                      style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
                      aria-label="System language"
                    >
                      <option value="en">English (US)</option>
                      <option value="ru">Russian (RU)</option>
                    </select>
                  </SettingRow>
                  <SettingRow icon={<Bell size={20} aria-hidden="true" />} title="System Notifications" description="Receive push notifications about task completions, limits, and system health.">
                    <Toggle checked={settings.notifications} onChange={(v) => updateSetting('notifications', v)} />
                  </SettingRow>
                </>
              )}

              {activeTab === 'writing' && (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>Interaction & Memory</div>
                  <SettingRow icon={<MessageSquare size={20} aria-hidden="true" />} title="Default Chat Strategy" description="Select the routing strategy for new conversational interfaces.">
                    <select
                      value={settings.defaultMode}
                      onChange={e => updateSetting('defaultMode', e.target.value as 'broadcast' | 'single' | 'smart')}
                      style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
                      aria-label="Default chat strategy"
                    >
                      <option value="smart">Auto-Routing (Recommended)</option>
                      <option value="broadcast">Swarm Broadcast</option>
                      <option value="single">Fixed Single Agent</option>
                    </select>
                  </SettingRow>
                  <SettingRow icon={<Zap size={20} aria-hidden="true" />} title="Token Streaming" description="Enable WebSockets/SSE for real-time text generation chunks.">
                    <Toggle checked={settings.streamingEnabled} onChange={(v) => updateSetting('streamingEnabled', v)} accent="#10b981" />
                  </SettingRow>
                  <SettingRow icon={<HardDrive size={20} aria-hidden="true" />} title="Persistent History" description="Automatically persist chat sessions to indexedDB for cold-starts.">
                    <Toggle checked={settings.historyPersistence} onChange={(v) => updateSetting('historyPersistence', v)} accent="#a855f7" />
                  </SettingRow>
                </>
              )}

              {activeTab === 'reading' && (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>Agent Routing Engine</div>
                  <SettingRow icon={<Cpu size={20} aria-hidden="true" />} title="Reinforcement Router (UCB1)" description="AI core uses reinforcement learning to balance exploration vs. exploitation of providers.">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <input
                        type="range" min="0" max="50"
                        value={Math.round(settings.explorationFactor * 100)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) / 100;
                          updateSetting('explorationFactor', val);
                        }}
                        style={{ width: 140, accentColor: '#3b82f6', cursor: 'pointer' }}
                        aria-label="Exploration factor"
                      />
                      <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 800, width: 80, textAlign: 'right', textTransform: 'uppercase' }}>
                        {settings.explorationFactor < 0.05 ? 'Greedy' : settings.explorationFactor > 0.3 ? 'Explore' : 'Balanced'}
                      </span>
                    </div>
                  </SettingRow>
                  <SettingRow icon={<AlertCircle size={20} aria-hidden="true" />} title="Fallback Chains" description="Automatically redirect 429/500 errors to the next best provider in the cluster.">
                    <Toggle checked={settings.fallbackEnabled} onChange={(v) => updateSetting('fallbackEnabled', v)} />
                  </SettingRow>
                  <SettingRow icon={<Activity size={20} aria-hidden="true" />} title="Heartbeat Monitoring" description="Periodic background pings to verify latency and uptime of all connected nodes.">
                    <Toggle checked={settings.autoHealthCheck} onChange={(v) => updateSetting('autoHealthCheck', v)} accent="#10b981" />
                  </SettingRow>
                  <SettingRow icon={<Sliders size={20} aria-hidden="true" />} title="SLA Mode" description="Set the service-level objective: balance cost, performance, or optimize for throughput.">
                    <select
                      value={settings.slaMode}
                      onChange={e => updateSetting('slaMode', e.target.value)}
                      style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
                      aria-label="SLA mode"
                    >
                      <option value="BALANCED">Balanced (Default)</option>
                      <option value="PERFORMANCE">Performance</option>
                      <option value="COST">Cost-Saving</option>
                    </select>
                  </SettingRow>
                </>
              )}

              {activeTab === 'alerts' && (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>Webhook Notifications</div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                    Configure webhook URLs to receive real-time alerts in Slack, Telegram, or any HTTP endpoint.
                  </div>
                  {notificationWebhookService.getWebhooks().map(wh => (
                    <SettingRow key={wh.id} icon={<Webhook size={20} />} title={wh.name} description={`${wh.provider} — ${wh.events.length} event(s)`}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Toggle checked={wh.enabled} onChange={(v) => { notificationWebhookService.updateWebhook(wh.id, { enabled: v }); setSettings({ ...settings }); }} />
                        <button
                          style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '0.4rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', cursor: 'pointer' }}
                          onClick={() => { notificationWebhookService.removeWebhook(wh.id); setSettings({ ...settings }); }}
                        >
                          Remove
                        </button>
                      </div>
                    </SettingRow>
                  ))}
                  {notificationWebhookService.getWebhooks().length === 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '2rem', fontStyle: 'italic' }}>
                      No webhooks configured. Add a Slack or Telegram webhook below.
                    </div>
                  )}
                  <div style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>Add New Webhook</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input id="wh-name" placeholder="Webhook name (e.g. Team Slack)" value={webhookForm.name} onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })}
                        style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '0.85rem', outline: 'none' }} />
                      <input id="wh-url" placeholder="Webhook URL" value={webhookForm.url} onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })}
                        style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '0.85rem', outline: 'none' }} />
                      <select value={webhookForm.provider} onChange={e => setWebhookForm({ ...webhookForm, provider: e.target.value as WebhookProvider })}
                        style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', cursor: 'pointer' }}>
                        <option value="slack">Slack</option>
                        <option value="telegram">Telegram</option>
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
                        Add Webhook
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'advanced' && (
                <>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>Security & Core Access</div>
                  <SettingRow icon={<Shield size={20} aria-hidden="true" />} accent="#10b981" title="Vault Master Key" description="Encrypt your API keys locally using AES-256. Keys never leave the browser.">
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="password"
                        placeholder={isVaultActive ? 'New master password' : 'Master password'}
                        value={vaultPassword}
                        onChange={(e) => setVaultPassword(e.target.value)}
                        style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '0.85rem', width: 180, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#10b981'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        aria-label="Master password"
                      />
                      <button
                        style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem', borderRadius: 8, background: isVaultActive ? '#3b82f6' : '#10b981', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                        onClick={handleVaultAction}
                        aria-label={isVaultActive ? 'Update vault password' : 'Enable vault encryption'}
                      >
                        {isVaultActive ? 'Update' : 'Encrypt'}
                      </button>
                    </div>
                  </SettingRow>
                  <SettingRow icon={<Terminal size={20} aria-hidden="true" />} accent="#a855f7" title="Kernel Debug Output" description="Pipe verbose execution logs directly into the developer console.">
                    <Toggle checked={settings.debugMode} onChange={(v) => updateSetting('debugMode', v)} accent="#a855f7" />
                  </SettingRow>
                  <SettingRow icon={<Settings size={20} aria-hidden="true" />} accent="#f59e0b" title="Reset Settings" description="Revert all system settings to their factory defaults.">
                    <button
                      style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', padding: '0.6rem 1.25rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer' }}
                      onClick={handleResetDefaults}
                      aria-label="Reset settings to defaults"
                    >
                      Reset Defaults
                    </button>
                  </SettingRow>
                  <SettingRow icon={<Database size={20} aria-hidden="true" />} accent="#ef4444" title="Factory Reset" description="Permanently delete all browser data, including keys, logs, and memories.">
                    <button
                      style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', padding: '0.6rem 1.25rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={handlePurgeData}
                      aria-label="Purge all data"
                    >
                      <Trash2 size={16} aria-hidden="true" /> Purge Data
                    </button>
                  </SettingRow>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
