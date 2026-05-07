import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, Sun, Globe, Bell, Shield, Database, Info, 
  Settings, Zap, AlertCircle, Trash2, Cpu, Eye, EyeOff,
  Sliders, MessageSquare, HardDrive
} from 'lucide-react';
import { keyService } from '../../services/KeyService';
import { kernel } from '../../core/Kernel';
import { securityService } from '../../core/SecurityService';

type SettingsTab = 'general' | 'writing' | 'reading' | 'advanced';

const SETTINGS_KEY = 'super_agents_os_settings';

const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [theme] = useState<'dark' | 'light'>('dark');
  
  // Settings with persistence
  const [notifications, setNotifications] = useState(true);
  const [autoHealthCheck, setAutoHealthCheck] = useState(true);
  const [defaultMode, setDefaultMode] = useState<'broadcast' | 'single' | 'smart'>('broadcast');
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [historyPersistence, setHistoryPersistence] = useState(true);
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  
  const [explorationFactor, setExplorationFactor] = useState(kernel.getState().explorationFactor);
  const [vaultPassword, setVaultPassword] = useState('');
  const [isVaultActive, setIsVaultActive] = useState(!securityService.isLocked());

  // Load settings
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.notifications !== undefined) setNotifications(parsed.notifications);
        if (parsed.autoHealthCheck !== undefined) setAutoHealthCheck(parsed.autoHealthCheck);
        if (parsed.defaultMode !== undefined) setDefaultMode(parsed.defaultMode);
        if (parsed.streamingEnabled !== undefined) setStreamingEnabled(parsed.streamingEnabled);
        if (parsed.historyPersistence !== undefined) setHistoryPersistence(parsed.historyPersistence);
        if (parsed.fallbackEnabled !== undefined) setFallbackEnabled(parsed.fallbackEnabled);
        if (parsed.debugMode !== undefined) setDebugMode(parsed.debugMode);
      } catch (e) { console.error('Failed to load settings', e); }
    }
  }, []);

  // Save settings
  useEffect(() => {
    const settings = {
      notifications, autoHealthCheck, defaultMode, streamingEnabled, 
      historyPersistence, fallbackEnabled, debugMode
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [notifications, autoHealthCheck, defaultMode, streamingEnabled, historyPersistence, fallbackEnabled, debugMode]);
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Settings size={28} color="#3b82f6" /> Настройки системы
        </h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Конфигурация среды Super-Agents OS и пользовательские предпочтения.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)', padding: '0 0.5rem' }}>
        {[
          { id: 'general', label: 'Общие', icon: <Settings size={16} /> },
          { id: 'writing', label: 'Чат и взаимодействие', icon: <MessageSquare size={16} /> },
          { id: 'reading', label: 'Инференс и роутинг', icon: <Zap size={16} /> },
          { id: 'advanced', label: 'Система и безопасность', icon: <Shield size={16} /> },
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
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, x: -10 }}
          style={{ maxWidth: 850 }}
        >
          {activeTab === 'general' && (
            <motion.div variants={itemVariants}>
              <SettingRow icon={<Moon size={18} />} title="Тема интерфейса" description="Выберите стиль оформления. По умолчанию используется системная тема.">
                <select style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', outline: 'none' }}>
                  <option>Темная (По умолчанию)</option>
                  <option>Светлая (Скоро)</option>
                </select>
              </SettingRow>
              <SettingRow icon={<Globe size={18} />} title="Язык системы" description="Выберите язык интерфейса и справочных руководств.">
                <select style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', outline: 'none' }}>
                  <option>Русский (RU)</option>
                  <option>English (US)</option>
                </select>
              </SettingRow>
              <SettingRow icon={<Bell size={18} />} title="Уведомления" description="Получать push-уведомления о системных событиях, результатах проверок и лимитах.">
                <Toggle checked={notifications} onChange={setNotifications} />
              </SettingRow>
            </motion.div>
          )}

          {activeTab === 'writing' && (
            <motion.div variants={itemVariants}>
              <SettingRow icon={<MessageSquare size={18} />} title="Стратегия чата по умолчанию" description="Выберите стратегию маршрутизации для новых окон чата.">
                <select
                  value={defaultMode}
                  onChange={e => setDefaultMode(e.target.value as 'broadcast' | 'single' | 'smart')}
                  style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', outline: 'none' }}
                >
                  <option value="broadcast">Все сразу</option>
                  <option value="single">Выбрать одного</option>
                  <option value="smart">✨ Авто (Рекомендуется)</option>
                </select>
              </SettingRow>
              <SettingRow icon={<Zap size={18} />} title="Стриминг токенов" description="Включите потоковую передачу ответов для более живого взаимодействия.">
                <Toggle checked={streamingEnabled} onChange={setStreamingEnabled} />
              </SettingRow>
              <SettingRow icon={<HardDrive size={18} />} title="Автосохранение истории" description="Автоматически сохранять сессии чата в локальную базу данных.">
                <Toggle checked={historyPersistence} onChange={setHistoryPersistence} />
              </SettingRow>
            </motion.div>
          )}

          {activeTab === 'reading' && (
            <motion.div variants={itemVariants}>
              <SettingRow icon={<Cpu size={18} />} title="Бандитский роутинг (UCB1)" description="Ядро ИИ использует обучение с подкреплением для выбора лучшего провайдера.">
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
                    {explorationFactor < 0.05 ? 'Консервативно' : explorationFactor > 0.3 ? 'Агрессивно' : 'Сбалансировано'}
                  </span>
                </div>
              </SettingRow>
              <SettingRow icon={<AlertCircle size={18} />} title="Цепочки Fallback" description="Если основной провайдер недоступен (429/500), запрос будет перенаправлен следующему лучшему.">
                <Toggle checked={fallbackEnabled} onChange={setFallbackEnabled} />
              </SettingRow>
              <SettingRow icon={<Shield size={18} />} title="Непрерывный мониторинг" description="Периодическая проверка доступности и задержки подключенных провайдеров.">
                <Toggle checked={autoHealthCheck} onChange={setAutoHealthCheck} />
              </SettingRow>
            </motion.div>
          )}

          {activeTab === 'advanced' && (
            <motion.div variants={itemVariants}>
              <SettingRow icon={<Shield size={18} />} title="Шифрование хранилища" description="Защитите ваши API-ключи мастер-паролем. После включения ключи будут зашифрованы в браузере.">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="password" 
                    placeholder="Новый мастер-пароль"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'white', fontSize: '0.8rem' }}
                  />
                  <button 
                    className="btn-primary" 
                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                    onClick={async () => {
                      if (!vaultPassword) return;
                      // To ENABLE encryption: initialize service with password, then tell KeyService to encrypt everything
                      const ok = await securityService.initialize(vaultPassword);
                      if (ok) {
                        const success = await keyService.unlockVault(vaultPassword); // This will trigger encryption of plaintext keys
                        if (success) {
                          setIsVaultActive(true);
                          setVaultPassword('');
                          alert('Шифрование включено. Теперь ваши ключи под защитой!');
                        }
                      }
                    }}
                  >
                    {isVaultActive ? 'Сменить пароль' : 'Включить'}
                  </button>
                </div>
              </SettingRow>
              <SettingRow icon={<Database size={18} />} title="Локальное хранилище" description="Ваши ключи и логи хранятся только у вас. Очистка удалит все данные из браузера.">
                <button className="btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => keyService.clearAllData()}>
                  <Trash2 size={14} /> Сбросить данные ОС
                </button>
              </SettingRow>
              <SettingRow icon={<Zap size={18} />} title="Режим отладки ядра" description="Вывод расширенных логов в консоль браузера для анализа работы EventBus.">
                <Toggle checked={debugMode} onChange={setDebugMode} />
              </SettingRow>
              <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(59,130,246,0.05)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.1)' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={16} color="#3b82f6" /> Системная информация
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div>Версия ОС: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>v3.1.0 (Stable)</span></div>
                  <div>Статус ядра: <span style={{ color: '#10b981', fontWeight: 600 }}>НОМИНАЛЬНЫЙ</span></div>
                  <div>Платформа: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Браузер/Клиент</span></div>
                  <div>Среда: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Production</span></div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div style={{ marginTop: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', opacity: 0.5 }}>
        Super-Agents OS · Работает на базе событийно-ориентированного ядра (Kernel)
      </div>
    </div>
  );
};

export default SettingsPanel;
