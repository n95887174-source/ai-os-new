import React from 'react';
import { Moon, Globe, Bell, Activity, HardDrive, Zap, MessageSquare, Sliders, Waves } from 'lucide-react';
import { CONFIG } from '../../kernel/services/config-registry';
import { setFeatureFlag } from '../../kernel/services/config-mutations';
import { settingsService } from '../../kernel/instances';
import type { SystemSettings } from '../../kernel/instances';
import { useTranslation } from '../../i18n/useTranslation';
import { detailsContainer, detailsSummary, sectionTitleLarge, settingSelect } from '../../styles/common';
import { SettingRow, Toggle } from './settings-shared';

interface GeneralTabProps {
  settings: SystemSettings;
  featureFlags: Record<string, boolean>;
  updateSetting: (key: keyof SystemSettings, val: boolean | string | number) => void;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  setFeatureFlags: (flags: Record<string, boolean>) => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({
  settings,
  featureFlags,
  updateSetting,
  setSettings,
  setFeatureFlags,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div style={sectionTitleLarge}>{t('settings.general')}</div>
      <SettingRow icon={<Moon size={20} aria-hidden="true" />} title={t('settings.interface_theme')} description={t('settings.theme_desc')}>
        <select
          value={settings.theme}
          onChange={(e) => updateSetting('theme', e.target.value)}
          style={settingSelect}
          aria-label={t('settings.interface_theme')}
        >
          <option value="dark">{t('settings.theme_dark')}</option>
          <option value="light">{t('settings.theme_light')}</option>
        </select>
      </SettingRow>
      <SettingRow icon={<Activity size={20} aria-hidden="true" />} title={t('settings.high_contrast')} description={t('settings.high_contrast_desc')}>
        <Toggle
          checked={settings.themeConfig?.highContrast ?? false}
          onChange={(v) => {
            try {
              const next = { ...settings.themeConfig, highContrast: v };
              setSettings((prev) => ({ ...prev, themeConfig: next }));
              settingsService.updateSettings({ themeConfig: next });
            } catch (e) {
              console.warn('[SettingsPanel] Failed to update highContrast:', e);
            }
          }}
          accent="#f97316"
        />
      </SettingRow>
      <SettingRow icon={<Globe size={20} aria-hidden="true" />} title={t('settings.language')} description={t('settings.language_desc')}>
        <select
          value={settings.language}
          onChange={(e) => updateSetting('language', e.target.value)}
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
            <Toggle
              checked={featureFlags['memory.enabled'] ?? true}
              onChange={(v) => {
                setFeatureFlag('memory.enabled', v);
                setFeatureFlags(                JSON.parse(JSON.stringify(CONFIG.featureFlags)));
              }}
              accent="#10b981"
            />
          </SettingRow>
          <SettingRow icon={<Activity size={20} aria-hidden="true" />} title={t('settings.semantic_search')} description={t('settings.semantic_search_desc')}>
            <Toggle
              checked={featureFlags['memory.semantic'] ?? true}
              onChange={(v) => {
                setFeatureFlag('memory.semantic', v);
                setFeatureFlags(                JSON.parse(JSON.stringify(CONFIG.featureFlags)));
              }}
              accent="#8b5cf6"
            />
          </SettingRow>
          <SettingRow icon={<Zap size={20} aria-hidden="true" />} title={t('settings.rag_on_chat')} description={t('settings.rag_on_chat_desc')}>
            <Toggle
              checked={featureFlags['memory.ragOnChat'] ?? true}
              onChange={(v) => {
                setFeatureFlag('memory.ragOnChat', v);
                setFeatureFlags(                JSON.parse(JSON.stringify(CONFIG.featureFlags)));
              }}
              accent="#f59e0b"
            />
          </SettingRow>
          <SettingRow icon={<MessageSquare size={20} aria-hidden="true" />} title={t('settings.auto_store_memory')} description={t('settings.auto_store_memory_desc')}>
            <Toggle
              checked={featureFlags['memory.autoStore'] ?? true}
              onChange={(v) => {
                setFeatureFlag('memory.autoStore', v);
                setFeatureFlags(                JSON.parse(JSON.stringify(CONFIG.featureFlags)));
              }}
              accent="#3b82f6"
            />
          </SettingRow>
          <SettingRow icon={<Activity size={20} aria-hidden="true" />} title={t('settings.debate_runtime_engine')} description={t('settings.debate_runtime_engine_desc')}>
            <Toggle
              checked={featureFlags['debate.runtimeEngine'] ?? false}
              onChange={(v) => {
                setFeatureFlag('debate.runtimeEngine', v);
                setFeatureFlags(                JSON.parse(JSON.stringify(CONFIG.featureFlags)));
              }}
              accent="#ec4899"
            />
          </SettingRow>
          <SettingRow icon={<Waves size={20} aria-hidden="true" />} title="Experimental visuals" description="Show Aquarium and Hive in the sidebar (same metrics as Health)">
            <Toggle
              checked={featureFlags['ui.experimentalVisuals'] ?? false}
              onChange={(v) => {
                setFeatureFlag('ui.experimentalVisuals', v);
                setFeatureFlags(                JSON.parse(JSON.stringify(CONFIG.featureFlags)));
              }}
              accent="#06b6d4"
            />
          </SettingRow>
        </div>
      </details>
    </>
  );
};

export default GeneralTab;
