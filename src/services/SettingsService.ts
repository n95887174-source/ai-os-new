import { eventBus } from '../core/events';
import { routerService } from './RouterService';
import { kernel } from '../core/Kernel';
import { db } from '../core/DatabaseService';
import { SettingsService as KernelSettingsService } from '../kernel/services/settings-service';

export type {
  SystemSettings, ThemeConfig, NotificationPreferences,
  DataManagementSettings, SettingsProfile, SettingsListener
} from '../kernel/services/settings-service';

export class SettingsService extends KernelSettingsService {
  constructor() {
    super({
      eventBus,
      routerService: routerService as any,
      kernel: kernel as any,
      database: db,
    });
  }
}

export const settingsService = new SettingsService();
