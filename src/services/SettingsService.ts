import { container } from '../core/Container';
import { SettingsService as KernelSettingsService } from '../kernel/services/settings-service';

export type {
  SystemSettings, ThemeConfig, NotificationPreferences,
  DataManagementSettings, SettingsProfile, SettingsListener
} from '../kernel/services/settings-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const settingsService = new Proxy({} as KernelSettingsService, {
  get: (_target, prop) => {
    // 1. Try to get the real instance from the container
    try {
      if (container.has('settingsService')) {
        const instance = container.get<KernelSettingsService>('settingsService');
        const val = (instance as any)[prop];
        if (typeof val === 'function') return val.bind(instance);
        return val;
      }
    } catch (e) {
      // Fall through to mock/placeholder logic
    }

    // 2. Safe fallbacks for early access (e.g. during first render/useEffect)
    if (prop === 'getSettings') {
      return () => ({
        theme: 'dark',
        language: 'en',
        notifications: true,
        themeConfig: { mode: 'dark', primaryColor: '#3b82f6' }
      });
    }
    if (prop === 'subscribe') return () => (() => {});

    // 3. For other methods, return a lazy wrapper that tries again at call-time
    const protoVal = (KernelSettingsService.prototype as any)[prop];
    if (typeof protoVal === 'function') {
      return (...args: any[]) => {
        try {
          const instance = container.get<any>('settingsService');
          return instance[prop](...args);
        } catch (err) {
          console.warn(`[Proxy] Service not ready for method call: settingsService.${String(prop)}`);
          return undefined;
        }
      };
    }
    return protoVal;
  }
});

export { KernelSettingsService as SettingsService };
