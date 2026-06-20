import type { IVirtualKeyService, VirtualKey } from '../contracts/virtual-key';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('VirtualKeyService');

export interface VirtualKeyServiceDeps {
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
  eventBus: {
    emit: (event: string, data?: unknown) => void;
    on: (event: string, cb: (data: unknown) => void) => () => void;
  };
  keyService: {
    getKeys: () => Array<{ id: string; provider: string }>;
  };
}

export class VirtualKeyService implements IVirtualKeyService {
  private cache = new Map<string, VirtualKey>();
  private loaded = false;
  private deps: VirtualKeyServiceDeps;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubs: Array<() => void> = [];

  constructor(deps: VirtualKeyServiceDeps) {
    this.deps = deps;
  }

  private async flush(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    await this.doPersist();
  }

  async destroy(): Promise<void> {
    await this.flush();
    this.cache.clear();
    this.loaded = false;
    this.unsubs.forEach(u => u());
    this.unsubs = [];
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
    } catch (e) {
      LOGGER.warn('VirtualKeyService', 'DB not ready, using memory only', { error: String(e) });
    }

    this.unsubs.push(
      this.deps.eventBus.on(EVENTS.KEY_REMOVED, (id: unknown) => {
        if (typeof id === 'string') this.cleanupRealKey(id);
      }),
    );
  }

  cleanupRealKey(realKeyId: string): void {
    for (const [vkId, vk] of this.cache) {
      if (vk.realKeyId === realKeyId) {
        this.cache.delete(vkId);
        this.deps.eventBus.emit(EVENTS.VIRTUAL_KEY_REVOKED, { virtualKeyId: vkId });
      }
    }
    this.debouncedPersist();
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
    if (!keyData) throw new Error(`Cannot create virtual key: real key "${realKeyId}" not found`);
    vk.provider = keyData.provider;
    this.cache.set(id, vk);
    await this.persistNow();
    this.deps.eventBus.emit(EVENTS.VIRTUAL_KEY_CREATED, { virtualKey: vk });
    return { ...vk };
  }

  lookup(id: string): VirtualKey | undefined {
    const vk = this.cache.get(id);
    if (vk && vk.active) {
      return { ...vk };
    }
    return undefined;
  }

  resolve(id: string): VirtualKey | undefined {
    const vk = this.cache.get(id);
    if (vk && vk.active) {
      vk.lastUsedAt = Date.now();
      this.debouncedPersist();
      this.deps.eventBus.emit(EVENTS.VIRTUAL_KEY_RESOLVED, { virtualKeyId: id });
      return { ...vk };
    }
    return undefined;
  }

  async revoke(id: string): Promise<void> {
    const vk = this.cache.get(id);
    if (vk) {
      vk.active = false;
      await this.persistNow();
      this.deps.eventBus.emit(EVENTS.VIRTUAL_KEY_REVOKED, { virtualKeyId: id });
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
    } catch (e) {
      LOGGER.warn('VirtualKeyService', 'Failed to get real key', { realKeyId, error: e });
      return undefined;
    }
  }

  private debouncedPersist() {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.doPersist();
    }, 2000);
  }

  private async persistNow() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    await this.doPersist();
  }

  private async doPersist() {
    try {
      await this.deps.database.setKv('virtual_keys', this.list());
    } catch (e) {
      LOGGER.warn('VirtualKeyService', 'Failed to persist virtual keys', { error: String(e) });
    }
  }
}
