import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';

import { adapterRegistry } from './providers/AdapterRegistry';

class HealthCheckService {
  private adapters = adapterRegistry.getAllAdapters();
  private unsubs: Array<() => void> = [];

  constructor() {
    this.setupListeners();
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private setupListeners() {
    this.unsubs.push(
      eventBus.on(EVENTS.CHECK_HEALTH, (id) => this.checkKey(id)),
      eventBus.on(EVENTS.CHECK_ALL_HEALTH, () => this.checkAll())
    );
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
      keyService.handleProviderError(id, `Adapter for ${key.provider} not found`);
      return;
    }

    try {
      const result = await adapter.checkHealth(key.key);
      
      if (result.status === 'active') {
        keyService.updateKeyStatus(id, 'active', result.latency);
        keyService.updateAvailableModels(id, result.models);
      } else {
        keyService.handleProviderError(id, result.error || 'Health check failed');
      }
    } catch (e: unknown) {
<<<<<<< HEAD
      keyService.handleProviderError(id, e instanceof Error ? e.message : String(e));
=======
      keyService.handleProviderError(key.provider, e instanceof Error ? e.message : String(e));
>>>>>>> 54e1276a5d5730e4e3edce0bb2038b8d9038b261
    }
  }
}

export const healthCheckService = new HealthCheckService();
