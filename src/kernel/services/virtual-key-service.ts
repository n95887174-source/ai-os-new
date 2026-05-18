import type { IVirtualKeyService, VirtualKey } from '../contracts/virtual-key';

export interface VirtualKeyServiceDeps {
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
  eventBus: {
    emit: (event: string, data?: unknown) => void;
  };
  keyService: {
    getKeys: () => Array<{ id: string; provider: string }>;
  };
}

export class VirtualKeyService implements IVirtualKeyService {
  private cache = new Map<string, VirtualKey>();
  private loaded = false;
  private deps: VirtualKeyServiceDeps;

  constructor(deps: VirtualKeyServiceDeps) {
    this.deps = deps;
  }

  destroy() {
    this.cache.clear();
    this.loaded = false;
  }

  async init(): Promise<void> {
    if (this.loaded) return;
    try {
      const stored = await this.deps.database.getKv<VirtualKey[]>('virtual_keys');
      if (stored) {
        for (const k of stored) {
          this.cache.set(k.id, k);
        }
      }
      this.loaded = true;
    } catch {
      console.warn('[VirtualKeyService] DB not ready, using memory only');
    }
  }

  async create(realKeyId: string, label: string, agentId?: string): Promise<VirtualKey> {
    await this.init();
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
    this.deps.eventBus.emit('virtual-key:created', { virtualKey: vk });
    return vk;
  }

  resolve(id: string): VirtualKey | undefined {
    const vk = this.cache.get(id);
    if (vk && vk.active) {
      vk.lastUsedAt = Date.now();
      this.persist();
      this.deps.eventBus.emit('virtual-key:resolved', { virtualKeyId: id });
      return vk;
    }
    return undefined;
  }

  async revoke(id: string): Promise<void> {
    const vk = this.cache.get(id);
    if (vk) {
      vk.active = false;
      await this.persist();
      this.deps.eventBus.emit('virtual-key:revoked', { virtualKeyId: id });
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
      const key = this.deps.keyService.getKeys().find(k => k.id === realKeyId);
      return key ? { provider: key.provider } : undefined;
    } catch {
      return undefined;
    }
  }

  private async persist() {
    try {
      await this.deps.database.setKv('virtual_keys', this.list());
    } catch {
      console.warn('[VirtualKeyService] Failed to persist');
    }
  }
}
