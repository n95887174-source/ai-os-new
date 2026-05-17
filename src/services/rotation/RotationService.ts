import { EVENTS, eventBus } from '../../core/events';
import type { ApiKey, RotationEvent } from '../../types/metrics';
import { keyService } from '../KeyService';

interface RotationTimer {
  keyId: string;
  expiresAt: number;
  timer: ReturnType<typeof setTimeout>;
  notifiedAt: Set<number>;
}

class RotationService {
  private timers = new Map<string, RotationTimer>();
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private unsubs: Array<() => void> = [];

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
      eventBus.on(EVENTS.KEY_UPDATED, () => this.restoreTimers()),
      eventBus.on('key:added', () => this.restoreTimers()),
      eventBus.on('key:removed', (id: string) => this.cancelRotation(id as string)),
    );
  }

  private tick() {
    const now = Date.now();
    for (const [keyId, rt] of this.timers) {
      const key = keyService.getKeys().find(k => k.id === keyId);
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
            eventBus.emit(EVENTS.NOTIFICATION, {
              message: `Key "${key.label}" expires in ${nh}h — ${key.rotationConfig.autoRotate ? 'auto-rotation scheduled' : 'rotation needed'}`,
              type: 'warning',
            });
          }
        }
      }

      if (msLeft <= 0) {
        this.handleExpiry(keyId).catch(e =>
          console.warn(`[Rotation] Expiry handler failed for ${keyId}:`, e),
        );
      }
    }
  }

  private async handleExpiry(keyId: string) {
    const key = keyService.getKeys().find(k => k.id === keyId);
    if (!key || !key.rotationConfig) return;

    this.cancelRotation(keyId);

    if (key.rotationConfig.autoRotate) {
      const ok = await this.autoRotateKey(keyId);
      if (ok) return;
    }

    keyService.updateKey(keyId, {
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

    eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Key "${key.label}" TTL expired — rotation needed`,
      type: 'error',
    });
  }

  async autoRotateKey(keyId: string): Promise<boolean> {
    const key = keyService.getKeys().find(k => k.id === keyId);
    if (!key || !key.key) return false;

    try {
      const { adapterRegistry } = await import('../providers/AdapterRegistry');
      const adapter = adapterRegistry.getAdapter(key.provider.toLowerCase());
      if (!adapter || typeof adapter.rotateKey !== 'function') return false;

      const result = await adapter.rotateKey(key.key);
      if (!result) return false;

      const oldKeyRef = key.secretRef || key.id;

      // Add new key via public API
      await keyService.addKey({
        provider: key.provider,
        key: result.newKey,
        label: result.label || `${key.label} (rotated ${new Date().toLocaleDateString()})`,
        tags: [...(key.tags || []), 'auto-rotated'],
      });

      // Retire old key
      keyService.updateKey(keyId, {
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

      eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Key "${key.label}" auto-rotated via ${key.provider} API`,
        type: 'success',
      });

      // Schedule rotation for the new key if TTL is configured
      if (key.rotationConfig) {
        const newKey = keyService.getKeys().find(k => k.key === result.newKey);
        if (newKey) {
          this.scheduleRotation(newKey.id, key.rotationConfig.ttlHours);
        }
      }

      return true;
    } catch (e) {
      console.warn(`[Rotation] autoRotateKey failed for ${keyId}:`, e);
      return false;
    }
  }

  scheduleRotation(keyId: string, ttlHours: number) {
    this.cancelRotation(keyId);
    if (ttlHours <= 0) return;

    const key = keyService.getKeys().find(k => k.id === keyId);
    if (!key) return;

    const expiresAt = Date.now() + ttlHours * 3600000;

    const config = key.rotationConfig || { ttlHours, autoRotate: false, notifyBefore: '24,1' };
    config.ttlHours = ttlHours;
    config.expiresAt = new Date(expiresAt).toISOString();

    keyService.updateKey(keyId, { rotationConfig: config });

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
    const key = keyService.getKeys().find(k => k.id === keyId);
    if (!key) return false;

    keyService.updateKey(keyId, { status: 'checking' });
    const ok = await this.autoRotateKey(keyId);

    if (!ok) {
      keyService.updateKey(keyId, { status: key.status });
    }

    return ok;
  }

  setKeyTTL(keyId: string, ttlHours: number, autoRotate = false) {
    if (ttlHours <= 0) {
      this.cancelRotation(keyId);
      keyService.updateKey(keyId, { rotationConfig: undefined });
      return;
    }

    const key = keyService.getKeys().find(k => k.id === keyId);
    if (!key) return;

    const config = key.rotationConfig || { ttlHours, autoRotate, notifyBefore: '24,1' };
    config.ttlHours = ttlHours;
    config.autoRotate = autoRotate;

    keyService.updateKey(keyId, { rotationConfig: config });
    this.scheduleRotation(keyId, ttlHours);
  }

  getTTLRemaining(keyId: string): number {
    const rt = this.timers.get(keyId);
    return rt ? Math.max(0, rt.expiresAt - Date.now()) : 0;
  }

  getTTLStatus(keyId: string): { remainingMs: number; expiresAt: string | null; active: boolean } {
    const key = keyService.getKeys().find(k => k.id === keyId);
    const rt = this.timers.get(keyId);
    return {
      remainingMs: rt ? Math.max(0, rt.expiresAt - Date.now()) : 0,
      expiresAt: key?.rotationConfig?.expiresAt ?? null,
      active: rt !== undefined,
    };
  }

  private addRotationEvent(keyId: string, partial: Omit<RotationEvent, 'id' | 'keyId' | 'timestamp'>) {
    const key = keyService.getKeys().find(k => k.id === keyId);
    if (!key) return;

    const event: RotationEvent = {
      id: crypto.randomUUID().slice(0, 8),
      keyId,
      timestamp: Date.now(),
      ...partial,
    };

    const history = [...(key.rotationHistory || []), event].slice(-20);
    keyService.updateKey(keyId, { rotationHistory: history });
  }

  private restoreTimers() {
    const keys = keyService.getKeys();
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
    const key = keyService.getKeys().find(k => k.id === keyId);
    return key?.rotationHistory ?? [];
  }
}

let instance: RotationService;
export const rotationService = new Proxy({} as RotationService, {
  get: (_target, prop) => {
    if (!instance) instance = new RotationService();
    const val = (instance as any)[prop];
    if (typeof val === 'function') return val.bind(instance);
    return val;
  }
});
