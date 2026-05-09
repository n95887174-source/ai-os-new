import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Globe, Bell, Shield, Database, Info, 
  Settings, Zap, AlertCircle, Trash2, Cpu,
  MessageSquare, HardDrive, Sliders, Lock
} from 'lucide-react';
import { keyService } from '../../services/KeyService';
import { kernel } from '../../core/Kernel';
import { securityService } from '../../core/SecurityService';

type SettingsTab = 'general' | 'writing' | 'reading' | 'advanced';

import { settingsService } from '../../services/SettingsService';
import type { SystemSettings } from '../../services/SettingsService';

const SettingRow = ({ icon, title, description, children, accent = '#3b82f6' }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode; accent?: string }) => (
  <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', marginBottom: '1rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flex: 1 }}>
      <div style={{ background: `${accent}15`, border: `1px solid ${accent}30`, padding: '0.75rem', borderRadius: 12, color: accent, boxShadow: `inset 0 0 10px ${accent}20` }}>
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
  const [explorationFactor, setExplorationFactor] = useState(kernel.getState().explorationFactor);
  const [vaultPassword, setVaultPassword] = useState('');
  const [isVaultActive, setIsVaultActive] = useState(!securityService.isLocked());

  const updateSetting = (key: keyof SystemSettings, val: any) => {
    const newSettings = { ...settings, [key]: val };
    setSettings(newSettings);
    settingsService.updateSettings({ [key]: val });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sliders size={28} color="#3b82f6" /> System Configuration
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Fine-tune kernel parameters, telemetry, and environment preferences.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', height: '100%', minHeight: 0 }}>
        
        {/* Navigation Sidebar */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { id: 'general', label: 'General Settings', icon: <Settings size={18} /> },
            { id: 'writing', label: 'Interaction & Memory', icon: <MessageSquare size={18} /> },
            { id: 'reading', label: 'Routing Engine', icon: <Cpu size={18} /> },
            { id: 'advanced', label: 'Security & Vault', icon: <Lock size={18} /> },
          ].map((t) => (
            <button 
              key={t.id}
              onClick={() => setActiveTab(t.id as SettingsTab)}
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
              <Info size={16} color="#3b82f6" /> OS Telemetry
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Version:</span> <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>v4.0.0-rc</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Build ID:</span> <span style={{ color: '#e2e8f0', fontWeight: 600, fontFamily: 'monospace' }}>a9f3b2c</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Kernel:</span> <span style={{ color: '#10b981', fontWeight: 700 }}>ONLINE</span></div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem', paddingBottom: '2rem' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { staggerChildren: 0.05 } }}
              exit={{ opacity: 0, y: -10 }}
            >
              {activeTab === 'general' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>General Preferences</div>
                  
                  <SettingRow icon={<Moon size={20} />} title="Interface Theme" description="Select the visual style. The Deep Space theme is optimized for extended use.">
                    <select style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontWeight: 600, cursor: 'pointer' }}>
                      <option>Dark (Deep Space)</option>
                      <option>Light (Coming Soon)</option>
                    </select>
                  </SettingRow>
                  
                  <SettingRow icon={<Globe size={20} />} title="System Language" description="Select the interface language for OS tools and documentation.">
                    <select style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontWeight: 600, cursor: 'pointer' }}>
                      <option>English (US)</option>
                      <option>Russian (RU)</option>
                    </select>
                  </SettingRow>
                  
                  <SettingRow icon={<Bell size={20} />} title="System Notifications" description="Receive push notifications about task completions, limits, and system health.">
                    <Toggle checked={settings.notifications} onChange={(v) => updateSetting('notifications', v)} />
                  </SettingRow>
                </motion.div>
              )}

              {activeTab === 'writing' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>Interaction & Memory</div>
                  
                  <SettingRow icon={<MessageSquare size={20} />} title="Default Chat Strategy" description="Select the routing strategy for new conversational interfaces.">
                    <select
                      value={settings.defaultMode}
                      onChange={e => updateSetting('defaultMode', e.target.value as 'broadcast' | 'single' | 'smart')}
                      style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', outline: 'none', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <option value="smart">Auto-Routing (Recommended)</option>
                      <option value="broadcast">Swarm Broadcast</option>
                      <option value="single">Fixed Single Agent</option>
                    </select>
                  </SettingRow>
                  
                  <SettingRow icon={<Zap size={20} />} title="Token Streaming" description="Enable WebSockets/SSE for real-time text generation chunks.">
                    <Toggle checked={settings.streamingEnabled} onChange={(v) => updateSetting('streamingEnabled', v)} accent="#10b981" />
                  </SettingRow>
                  
                  <SettingRow icon={<HardDrive size={20} />} title="Persistent History" description="Automatically persist chat sessions to indexedDB for cold-starts.">
                    <Toggle checked={settings.historyPersistence} onChange={(v) => updateSetting('historyPersistence', v)} accent="#a855f7" />
                  </SettingRow>
                </motion.div>
              )}

              {activeTab === 'reading' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>Agent Routing Engine</div>
                  
                  <SettingRow icon={<Cpu size={20} />} title="Reinforcement Router (UCB1)" description="AI core uses reinforcement learning to balance exploration vs. exploitation of providers.">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <input 
                        type="range" min="0" max="50" 
                        value={explorationFactor * 100} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value) / 100;
                          setExplorationFactor(val);
                          kernel.setExplorationFactor(val);
                        }}
                        style={{ width: 140, accentColor: '#3b82f6', cursor: 'pointer' }} 
                      />
                      <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 800, width: 80, textAlign: 'right', textTransform: 'uppercase' }}>
                        {explorationFactor < 0.05 ? 'Greedy' : explorationFactor > 0.3 ? 'Explore' : 'Balanced'}
                      </span>
                    </div>
                  </SettingRow>
                  
                  <SettingRow icon={<AlertCircle size={20} />} title="Fallback Chains" description="Automatically redirect 429/500 errors to the next best provider in the cluster.">
                    <Toggle checked={settings.fallbackEnabled} onChange={(v) => updateSetting('fallbackEnabled', v)} />
                  </SettingRow>
                  
                  <SettingRow icon={<Activity size={20} />} title="Heartbeat Monitoring" description="Periodic background pings to verify latency and uptime of all connected nodes.">
                    <Toggle checked={settings.autoHealthCheck} onChange={(v) => updateSetting('autoHealthCheck', v)} accent="#10b981" />
                  </SettingRow>
                </motion.div>
              )}

              {activeTab === 'advanced' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>Security & Core Access</div>
                  
                  <SettingRow icon={<Shield size={20} />} accent="#10b981" title="Vault Master Key" description="Encrypt your API keys locally using AES-256. Keys never leave the browser.">
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="password" 
                        placeholder={isVaultActive ? '••••••••' : 'New master password'}
                        value={vaultPassword}
                        onChange={(e) => setVaultPassword(e.target.value)}
                        style={{ padding: '0.6rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '0.85rem', width: 180, outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = '#10b981'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                      <button 
                        className="btn-primary" 
                        style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem', borderRadius: 8, background: isVaultActive ? '#3b82f6' : '#10b981', color: isVaultActive ? 'white' : '#064e3b' }}
                        onClick={async () => {
                          if (!vaultPassword) return;
                          const ok = await securityService.initialize(vaultPassword);
                          if (ok) {
                            const success = await keyService.unlockVault(vaultPassword);
                            if (success) {
                              setIsVaultActive(true);
                              setVaultPassword('');
                              eventBus.emit(EVENTS.NOTIFICATION, { message: 'Vault encryption enabled successfully.', type: 'success' });
                            }
                          }
                        }}
                      >
                        {isVaultActive ? 'Update' : 'Encrypt'}
                      </button>
                    </div>
                  </SettingRow>
                  
                  <SettingRow icon={<Terminal size={20} />} accent="#a855f7" title="Kernel Debug Output" description="Pipe verbose execution logs directly into the developer console.">
                    <Toggle checked={settings.debugMode} onChange={(v) => updateSetting('debugMode', v)} accent="#a855f7" />
                  </SettingRow>

                  <SettingRow icon={<Database size={20} />} accent="#ef4444" title="Factory Reset" description="Permanently delete all browser data, including keys, logs, and memories.">
                    <button 
                      className="btn-secondary" 
                      style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', padding: '0.6rem 1.25rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700 }} 
                      onClick={() => { if (window.confirm('CRITICAL WARNING: This will permanently wipe all local OS state. Proceed?')) keyService.clearAllData(); }}
                    >
                      <Trash2 size={16} style={{ marginRight: 6 }} /> Purge Data
                    </button>
                  </SettingRow>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
