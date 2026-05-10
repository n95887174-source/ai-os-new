import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';

import { adapterRegistry } from './providers/AdapterRegistry';

class HealthCheckService {
  private adapters = adapterRegistry.getAllAdapters();

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    eventBus.on(EVENTS.CHECK_HEALTH, (id) => this.checkKey(id));
    eventBus.on(EVENTS.CHECK_ALL_HEALTH, () => this.checkAll());
  }

  async checkAll() {
    const keys = keyService.getKeys();
    await Promise.all(keys.map(key => this.checkKey(key.id)));
  }

  async checkKey(id: string) {
    const key = keyService.getKeys().find(k => k.id === id);
    if (!key) return;

    // Set to checking status
    keyService.updateKeyStatus(id, 'checking');

    const adapter = this.adapters[key.provider.toLowerCase()];
    if (!adapter) {
      keyService.handleProviderError(key.provider, `Adapter for ${key.provider} not found`);
      return;
    }

    try {
      const result = await adapter.checkHealth(key.key);
      
      if (result.status === 'active') {
        keyService.updateKeyStatus(id, 'active', result.latency);
        keyService.updateAvailableModels(id, result.models);
      } else {
        keyService.handleProviderError(key.provider, result.error || 'Health check failed');
      }
    } catch (e: unknown) {
      keyService.handleProviderError(key.provider, e instanceof Error ? e.message : String(e));
    }
  }
}

export const healthCheckService = new HealthCheckService();
