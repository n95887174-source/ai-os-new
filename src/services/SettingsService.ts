import { resolve } from './service-resolver';
import { SettingsService as KernelSettingsService } from '../kernel/services/settings-service';
export { KernelSettingsService as SettingsService };
export type { SystemSettings, ThemeConfig, NotificationPreferences } from '../kernel/services/settings-service';
export type { DataManagementSettings, SettingsProfile, SettingsListener } from '../kernel/services/settings-service';
export const settingsService = resolve<KernelSettingsService>('settingsService', {
  getSettings: () => ({ theme: 'dark', language: 'en', notifications: true, themeConfig: { mode: 'dark', primaryColor: '#3b82f6' } }),
  subscribe: () => () => {},
});
