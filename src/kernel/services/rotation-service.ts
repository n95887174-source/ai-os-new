import type { ApiKey, RotationEvent } from '../types/metrics-types';
import type { IKeyRotationManager, IRotationService } from '../contracts/key-rotation';
import type { IAdapterRegistry } from '../contracts/provider-adapter';
import { EVENTS } from '../events/event-names';
import type { ILogger } from '../contracts/logger';
import type { IGroupManager } from '../contracts/group-manager';

interface RotationTimer {
  keyId: string;
  expiresAt: number;
  timer: ReturnType<typeof setTimeout>;
  notifiedAt: Set<number>;
}

export interface RotationServiceDeps {
  keyManager: IKeyRotationManager;
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  adapterRegistry?: IAdapterRegistry;
  logger?: ILogger;
  groupManager?: IGroupManager;
}

export class RotationService implements IRotationService {
  private timers = new Map<string, RotationTimer>();
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private unsubs: Array<() => void> = [];
  private deps: RotationServiceDeps;

  constructor(deps: RotationServiceDeps) {
    this.deps = deps;
  }

  destroy() {
    for (const t of this.timers.values()) clearTimeout(t.timer);
    this.timers.clear();
    if (this.monitorInterval) { clearInterval(this.monitorInterval); this.monitorInterval = null; }
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  async init(): Promise<void> {
    this.setupListeners();
    this.restoreTimers();
    this.monitorInterval = setInterval(() => this.tick(), 60000);
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on('key:added', () => this.restoreTimers()),
      this.deps.eventBus.on('key:removed', (id: unknown) => this.cancelRotation(String(id))),
    );
  }

  private tick() {
    const now = Date.now();
    for (const [keyId, rt] of this.timers) {
      const key = this.deps.keyManager.getKeys().find(k => k.id === keyId);
      if (!key?.rotationConfig || key.rotationConfig.ttlHours <= 0) {
        this.cancelRotation(keyId);
        continue;
      }

      const msLeft = rt.expiresAt - now;

      if (msLeft > 0) {
        const hoursLeft = msLeft / 3600000;
        const notifyHours = key.rotationConfig.notifyBefore
          .split(',')
          .map(s => parseFloat(s.trim()))
          .filter(n => !isNaN(n) && n > 0);

        for (const nh of notifyHours) {
          if (hoursLeft <= nh && !rt.notifiedAt.has(nh)) {
            rt.notifiedAt.add(nh);
            this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
              message: `Key "${key.label}" expires in ${nh}h — ${key.rotationConfig.autoRotate ? 'auto-rotation scheduled' : 'rotation needed'}`,
              type: 'warning',
            });
          }
        }
      }

      if (msLeft <= 0) {
        this.handleExpiry(keyId).catch(e =>
          this.deps.logger?.warn('RotationService', `Expiry handler failed for ${keyId}`, { error: String(e), action: 'handleExpiry' }),
        );
      }
    }
  }

  private async handleExpiry(keyId: string) {
    const key = this.deps.keyManager.getKeys().find(k => k.id === keyId);
    if (!key || !key.rotationConfig) return;

    this.cancelRotation(keyId);

    if (key.rotationConfig.autoRotate) {
      const ok = await this.autoRotateKey(keyId);
      if (ok) return;
    }

    this.deps.keyManager.updateKey(keyId, {
      status: 'inactive',
      rotationConfig: { ...key.rotationConfig, lastRotated: new Date().toISOString(), expiresAt: undefined },
    });

    this.addRotationEvent(keyId, {
      type: 'ttl_expired',
      fromStatus: key.status,
      toStatus: 'inactive',
      result: 'failed',
      error: key.rotationConfig.autoRotate ? 'Auto-rotation failed' : 'Auto-rotation not configured',
    });

    this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Key "${key.label}" TTL expired — rotation needed`,
      type: 'error',
    });
  }

  async autoRotateKey(keyId: string): Promise<boolean> {
    const key = this.deps.keyManager.getKeys().find(k => k.id === keyId);
    if (!key || !key.key) return false;

    try {
      const adapter = this.deps.adapterRegistry?.getAdapter(key.provider.toLowerCase());
      if (!adapter || typeof adapter.rotateKey !== 'function') return false;

      const result = await adapter.rotateKey(key.key);
      if (!result) return false;

      const oldKeyRef = key.secretRef || key.id;

      if (this.deps.groupManager) {
        await this.deps.groupManager.createKey({
          provider: key.provider,
          key: result.newKey,
          label: result.label || `${key.label} (rotated ${new Date().toLocaleDateString()})`,
          status: 'active',
          group: key.group,
          account: key.account,
          accountId: key.accountId,
          tags: [...(key.tags || []), 'auto-rotated'],
        }, { source: 'rotation' });
      } else {
        await this.deps.keyManager.addKey({
          provider: key.provider,
          key: result.newKey,
          label: result.label || `${key.label} (rotated ${new Date().toLocaleDateString()})`,
          status: 'active',
          group: key.group,
          account: key.account,
          accountId: key.accountId,
          tags: [...(key.tags || []), 'auto-rotated'],
        });
      }

      this.deps.keyManager.updateKey(keyId, {
        status: 'inactive',
        key: '[ROTATED]',
        rotationConfig: { ...key.rotationConfig!, lastRotated: new Date().toISOString(), expiresAt: undefined },
      });

      this.addRotationEvent(keyId, {
        type: 'auto',
        fromStatus: 'active',
        toStatus: 'inactive',
        oldKeyRef,
        newKeyRef: result.newKey.slice(0, 8),
        result: 'success',
      });

      this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Key "${key.label}" auto-rotated via ${key.provider} API`,
        type: 'success',
      });

      const updatedKey = this.deps.keyManager.getKeys().find(k => k.id === keyId);
      if (updatedKey?.rotationConfig) {
        const newKey = this.deps.keyManager.getKeys().find(k => k.key === result.newKey);
        if (newKey) {
          this.scheduleRotation(newKey.id, updatedKey.rotationConfig.ttlHours);
        }
      }

      return true;
    } catch (e) {
      this.deps.logger?.warn('RotationService', `autoRotateKey failed for ${keyId}`, { error: String(e), action: 'autoRotateKey' });
      return false;
    }
  }

  scheduleRotation(keyId: string, ttlHours: number) {
    this.cancelRotation(keyId);
    if (ttlHours <= 0) return;

    const key = this.deps.keyManager.getKeys().find(k => k.id === keyId);
    if (!key) return;

    const expiresAt = Date.now() + ttlHours * 3600000;

    const config = key.rotationConfig || { ttlHours, autoRotate: false, notifyBefore: '24,1' };
    config.ttlHours = ttlHours;
    config.expiresAt = new Date(expiresAt).toISOString();

    this.deps.keyManager.updateKey(keyId, { rotationConfig: config });

    const timer = setTimeout(() => {
      this.handleExpiry(keyId).catch(() => {});
    }, ttlHours * 3600000);

    this.timers.set(keyId, { keyId, expiresAt, timer, notifiedAt: new Set() });
  }

  cancelRotation(keyId: string) {
    const existing = this.timers.get(keyId);
    if (existing) {
      clearTimeout(existing.timer);
      this.timers.delete(keyId);
    }
  }

  async rotateNow(keyId: string): Promise<boolean> {
    const key = this.deps.keyManager.getKeys().find(k => k.id === keyId);
    if (!key) return false;

    this.deps.keyManager.updateKey(keyId, { status: 'checking' });
    const ok = await this.autoRotateKey(keyId);

    if (!ok) {
      this.deps.keyManager.updateKey(keyId, { status: key.status });
    }

    return ok;
  }

  setKeyTTL(keyId: string, ttlHours: number, autoRotate = false) {
    if (ttlHours <= 0) {
      this.cancelRotation(keyId);
      this.deps.keyManager.updateKey(keyId, { rotationConfig: undefined });
      return;
    }

    const key = this.deps.keyManager.getKeys().find(k => k.id === keyId);
    if (!key) return;

    const config = key.rotationConfig || { ttlHours, autoRotate, notifyBefore: '24,1' };
    config.ttlHours = ttlHours;
    config.autoRotate = autoRotate;

    this.deps.keyManager.updateKey(keyId, { rotationConfig: config });
    this.scheduleRotation(keyId, ttlHours);
  }

  getTTLRemaining(keyId: string): number {
    const rt = this.timers.get(keyId);
    return rt ? Math.max(0, rt.expiresAt - Date.now()) : 0;
  }

  getTTLStatus(keyId: string): { remainingMs: number; expiresAt: string | null; active: boolean } {
    const key = this.deps.keyManager.getKeys().find(k => k.id === keyId);
    const rt = this.timers.get(keyId);
    return {
      remainingMs: rt ? Math.max(0, rt.expiresAt - Date.now()) : 0,
      expiresAt: key?.rotationConfig?.expiresAt ?? null,
      active: rt !== undefined,
    };
  }

  private addRotationEvent(keyId: string, partial: Omit<RotationEvent, 'id' | 'keyId' | 'timestamp'>) {
    const key = this.deps.keyManager.getKeys().find(k => k.id === keyId);
    if (!key) return;

    const event: RotationEvent = {
      id: crypto.randomUUID().slice(0, 8),
      keyId,
      timestamp: Date.now(),
      ...partial,
    };

    const history = [...(key.rotationHistory || []), event].slice(-20);
    this.deps.keyManager.updateKey(keyId, { rotationHistory: history });
  }

  private restoreTimers() {
    const keys = this.deps.keyManager.getKeys();
    for (const key of keys) {
      const cfg = key.rotationConfig;
      if (!cfg || cfg.ttlHours <= 0 || !cfg.expiresAt) {
        this.cancelRotation(key.id);
        continue;
      }

      const expiresAt = new Date(cfg.expiresAt).getTime();
      const msLeft = expiresAt - Date.now();

      if (msLeft <= 0) {
        this.handleExpiry(key.id).catch(() => {});
        continue;
      }

      this.cancelRotation(key.id);
      const timer = setTimeout(() => {
        this.handleExpiry(key.id).catch(() => {});
      }, msLeft);

      this.timers.set(key.id, { keyId: key.id, expiresAt, timer, notifiedAt: new Set() });
    }
  }

  getRotationHistory(keyId: string): RotationEvent[] {
    const key = this.deps.keyManager.getKeys().find(k => k.id === keyId);
    return key?.rotationHistory ?? [];
  }
}
