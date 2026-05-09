import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Globe, Bell, Shield, Database, Info, 
  Settings, Zap, AlertCircle, Trash2, Cpu,
  MessageSquare, HardDrive
} from 'lucide-react';
import { keyService } from '../../services/KeyService';
import { kernel } from '../../core/Kernel';
import { securityService } from '../../core/SecurityService';

type SettingsTab = 'general' | 'writing' | 'reading' | 'advanced';

import { settingsService } from '../../services/SettingsService';
import type { SystemSettings } from '../../services/SettingsService';

const SettingRow = ({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', borderBottom: '1px solid var(--border)' }}>
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flex: 1 }}>
      <div style={{ background: 'rgba(59,130,246,0.08)', padding: '0.6rem', borderRadius: 10, color: '#3b82f6' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.3rem' }}>{title}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 450 }}>{description}</div>
      </div>
    </div>
    <div style={{ marginLeft: '2rem', flexShrink: 0 }}>{children}</div>
  </div>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: checked ? '#3b82f6' : 'rgba(255,255,255,0.1)',
      position: 'relative', transition: 'all 0.2s'
    }}
  >
    <div style={{
      width: 18, height: 18, borderRadius: '50%', background: 'white',
      position: 'absolute', top: 3,
      left: checked ? 23 : 3,
      transition: 'all 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
    }} />
  </button>
);

const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  
  const [settings, setSettings] = useState<SystemSettings>(settingsService.getSettings());
  
  const [explorationFactor, setExplorationFactor] = useState(kernel.getState().explorationFactor);
  const [vaultPassword, setVaultPassword] = useState('');
  const [isVaultActive, setIsVaultActive] = useState(!securityService.isLocked());

  const updateSetting = (key: keyof SystemSettings, val: any) => {
    const newSettings = { ...settings, [key]: val };
    setSettings(newSettings);
    settingsService.updateSettings({ [key]: val });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Settings size={28} color="#3b82f6" /> System Settings
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Configure Super-Agents OS environment and user preferences.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)', padding: '0 0.5rem' }}>
        {[
          { id: 'general', label: 'General', icon: <Settings size={16} /> },
          { id: 'writing', label: 'Chat & Interaction', icon: <MessageSquare size={16} /> },
          { id: 'reading', label: 'Inference & Routing', icon: <Zap size={16} /> },
          { id: 'advanced', label: 'System & Security', icon: <Shield size={16} /> },
        ].map((t) => (
          <button 
            key={t.id}
            onClick={() => setActiveTab(t.id as SettingsTab)}
            style={{ 
              background: 'none', border: 'none', padding: '0.75rem 0', cursor: 'pointer',
              color: activeTab === t.id ? '#3b82f6' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === t.id ? '#3b82f6' : 'transparent'}`,
              fontSize: '0.95rem', fontWeight: activeTab === t.id ? 600 : 500,
              transition: 'all 0.2s', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { staggerChildren: 0.05 } }}
          exit={{ opacity: 0, x: -10 }}
          style={{ maxWidth: 850 }}
        >
          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <SettingRow icon={<Moon size={18} />} title="Interface Theme" description="Select the visual style. Default follows system theme.">
                <select style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', outline: 'none' }}>
                  <option>Dark (Default)</option>
                  <option>Light (Soon)</option>
                </select>
              </SettingRow>
              <SettingRow icon={<Globe size={18} />} title="System Language" description="Select the interface and help documentation language.">
                <select style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', outline: 'none' }}>
                  <option>Russian (RU)</option>
                  <option>English (US)</option>
                </select>
              </SettingRow>
              <SettingRow icon={<Bell size={18} />} title="Notifications" description="Receive push notifications about system events, health checks, and limits.">
                <Toggle checked={settings.notifications} onChange={(v) => updateSetting('notifications', v)} />
              </SettingRow>
            </motion.div>
          )}

          {activeTab === 'writing' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <SettingRow icon={<MessageSquare size={18} />} title="Default Chat Strategy" description="Select the routing strategy for new chat windows.">
                <select
                  value={settings.defaultMode}
                  onChange={e => updateSetting('defaultMode', e.target.value as 'broadcast' | 'single' | 'smart')}
                  style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', outline: 'none' }}
                >
                  <option value="broadcast">All at Once</option>
                  <option value="single">Pick One</option>
                  <option value="smart">✨ Auto (Recommended)</option>
                </select>
              </SettingRow>
              <SettingRow icon={<Zap size={18} />} title="Token Streaming" description="Enable streaming responses for a more interactive experience.">
                <Toggle checked={settings.streamingEnabled} onChange={(v) => updateSetting('streamingEnabled', v)} />
              </SettingRow>
              <SettingRow icon={<HardDrive size={18} />} title="Auto-save History" description="Automatically save chat sessions to local database.">
                <Toggle checked={settings.historyPersistence} onChange={(v) => updateSetting('historyPersistence', v)} />
              </SettingRow>
            </motion.div>
          )}

          {activeTab === 'reading' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <SettingRow icon={<Cpu size={18} />} title="Bandit Routing (UCB1)" description="AI core uses reinforcement learning to select the best provider.">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input 
                    type="range" 
                    min="0" max="50" 
                    value={explorationFactor * 100} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) / 100;
                      setExplorationFactor(val);
                      kernel.setExplorationFactor(val);
                    }}
                    style={{ width: 120, accentColor: '#3b82f6' }} 
                  />
                  <span style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 700 }}>
                    {explorationFactor < 0.05 ? 'Conservative' : explorationFactor > 0.3 ? 'Aggressive' : 'Balanced'}
                  </span>
                </div>
              </SettingRow>
              <SettingRow icon={<AlertCircle size={18} />} title="Fallback Chains" description="If primary provider is unavailable (429/500), request will be redirected to the next best.">
                <Toggle checked={settings.fallbackEnabled} onChange={(v) => updateSetting('fallbackEnabled', v)} />
              </SettingRow>
              <SettingRow icon={<Shield size={18} />} title="Continuous Monitoring" description="Periodic availability and latency checks of connected providers.">
                <Toggle checked={settings.autoHealthCheck} onChange={(v) => updateSetting('autoHealthCheck', v)} />
              </SettingRow>
            </motion.div>
          )}

          {activeTab === 'advanced' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <SettingRow icon={<Shield size={18} />} title="Vault Encryption" description="Protect your API keys with a master password. Keys will be encrypted in-browser.">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="password" 
                    placeholder="New master password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', fontSize: '0.8rem' }}
                  />
                  <button 
                    className="btn-primary" 
                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                    onClick={async () => {
                      if (!vaultPassword) return;
                      const ok = await securityService.initialize(vaultPassword);
                      if (ok) {
                        const success = await keyService.unlockVault(vaultPassword);
                        if (success) {
                          setIsVaultActive(true);
                          setVaultPassword('');
                          alert('Encryption enabled. Your keys are now protected!');
                        }
                      }
                    }}
                  >
                    {isVaultActive ? 'Change Password' : 'Enable'}
                  </button>
                </div>
              </SettingRow>
              <SettingRow icon={<Database size={18} />} title="Local Storage" description="Your keys and logs are stored locally. Clearing will delete all browser data.">
                <button className="btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => { if (window.confirm('WARNING: This will permanently delete all API keys and system state. Continue?')) keyService.clearAllData(); }}>
                  <Trash2 size={14} /> Reset OS Data
                </button>
              </SettingRow>
              <SettingRow icon={<Zap size={18} />} title="Kernel Debug Mode" description="Output extended logs to browser console for EventBus analysis.">
                <Toggle checked={settings.debugMode} onChange={(v) => updateSetting('debugMode', v)} />
              </SettingRow>
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(59,130,246,0.05)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.1)' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={16} color="#3b82f6" /> System Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div>OS Version: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>v3.1.0 (Stable)</span></div>
                  <div>Kernel Status: <span style={{ color: '#10b981', fontWeight: 600 }}>NOMINAL</span></div>
                  <div>Platform: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Browser/Client</span></div>
                  <div>Environment: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Production</span></div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div style={{ marginTop: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.5 }}>
        Super-Agents OS · Powered by event-driven Kernel architecture
      </div>
    </div>
  );
};

export default SettingsPanel;
