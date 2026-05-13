import { dexieDb } from '../core/DatabaseService';
import { eventBus, EVENTS } from '../core/events';
import { keyService } from './KeyService';

export interface VirtualKey {
  id: string;
  realKeyId: string;
  provider: string;
  agentId?: string;
  label: string;
  createdAt: number;
  lastUsedAt?: number;
  active: boolean;
}

class VirtualKeyService {
  private cache: Map<string, VirtualKey> = new Map();
  private loaded = false;

  async load() {
    if (this.loaded) return;
    try {
      const stored = await dexieDb.keyValue.get('virtual_keys');
      if (stored?.value) {
        const keys = stored.value as VirtualKey[];
        for (const k of keys) {
          this.cache.set(k.id, k);
        }
      }
      this.loaded = true;
    } catch {
      console.warn('[VirtualKeyService] DB not ready, using memory only');
    }
  }

  async create(realKeyId: string, label: string, agentId?: string): Promise<VirtualKey> {
    await this.load();
    const id = `vk_${crypto.randomUUID().slice(0, 12)}`;
    const vk: VirtualKey = {
      id, realKeyId, label,
      provider: '',
      agentId, createdAt: Date.now(), active: true,
    };
    const keyData = this.getRealKey(realKeyId);
    if (keyData) vk.provider = keyData.provider;
    this.cache.set(id, vk);
    await this.persist();
    eventBus.emit(EVENTS.NOTIFICATION, { message: `Virtual key "${label}" created`, type: 'success' });
    return vk;
  }

  resolve(id: string): VirtualKey | undefined {
    const vk = this.cache.get(id);
    if (vk && vk.active) {
      vk.lastUsedAt = Date.now();
      this.persist();
      return vk;
    }
    return undefined;
  }

  async revoke(id: string) {
    const vk = this.cache.get(id);
    if (vk) {
      vk.active = false;
      await this.persist();
      eventBus.emit(EVENTS.NOTIFICATION, { message: `Virtual key "${vk.label}" revoked`, type: 'info' });
    }
  }

  list(): VirtualKey[] {
    return Array.from(this.cache.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  listActive(): VirtualKey[] {
    return this.list().filter(k => k.active);
  }

  private getRealKey(realKeyId: string): { provider: string } | undefined {
    try {
      const key = keyService.getKeys().find(k => k.id === realKeyId);
      return key ? { provider: key.provider } : undefined;
    } catch {
      return undefined;
    }
  }

  private async persist() {
    try {
      await dexieDb.keyValue.put({ id: 'virtual_keys', value: this.list(), createdAt: Date.now() });
    } catch {
      console.warn('[VirtualKeyService] Failed to persist');
    }
  }
}

export const virtualKeyService = new VirtualKeyService();
