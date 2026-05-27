import { PENDING_TTL } from '../contracts/session-affinity';
import { EVENTS } from '../events/event-names';
import type { ISessionAffinityStore, SessionBinding } from '../contracts/session-affinity';
import type { ILifecycle } from '../contracts/lifecycle';
import type { IEventBus } from '../types/interfaces';
import type { IKeyStateStore } from '../contracts/key-state';
import { getHealthBand } from '../contracts/key-state';

export class SessionAffinityStore implements ISessionAffinityStore, ILifecycle {
  private bindings = new Map<string, SessionBinding>();
  private eventBus?: IEventBus;
  private keyStateStore?: IKeyStateStore;
  private _onStateChanged?: (data: unknown) => void;

  constructor(eventBus?: IEventBus, keyStateStore?: IKeyStateStore) {
    this.eventBus = eventBus;
    this.keyStateStore = keyStateStore;
  }

  async init(): Promise<void> {}
  async start(): Promise<void> {
    if (!this.eventBus) return;
    this._onStateChanged = (data: unknown) => {
      const id = typeof data === 'object' && data !== null && 'id' in data
        ? String((data as { id?: unknown }).id ?? '')
        : '';
      if (id) this.handleStateChange(id);
    };
    this.eventBus.on(EVENTS.KEY_STATE_CHANGED, this._onStateChanged);
  }
  destroy(): void {
    if (this.eventBus && this._onStateChanged) {
      this.eventBus.off(EVENTS.KEY_STATE_CHANGED, this._onStateChanged);
    }
    this.bindings.clear();
  }

  private reapExpired(): void {
    const now = Date.now();
    for (const [k, b] of this.bindings) {
      if (b.pendingEviction && b.pendingEvictionAt && now - b.pendingEvictionAt > PENDING_TTL) {
        this.bindings.delete(k);
        this.eventBus?.emit(EVENTS.SESSION_BINDING_EXPIRED, {
          sessionId: b.sessionId,
          keyId: b.keyId,
          provider: b.provider,
          participantId: b.participantId,
          boundAt: b.boundAt,
          evictedAt: now,
          reason: 'ttl',
        });
      }
    }
  }

  private key(sessionId: string, participantId?: string): string {
    return participantId ? `${sessionId}::${participantId}` : sessionId;
  }

  bind(sessionId: string, keyId: string, provider: string, participantId?: string): void {
    this.bindings.set(this.key(sessionId, participantId), {
      sessionId, keyId, participantId, provider, boundAt: Date.now(),
    });
  }

  getBoundKey(sessionId: string, participantId?: string): SessionBinding | undefined {
    this.reapExpired();
    return this.bindings.get(this.key(sessionId, participantId));
  }

  isSessionBound(sessionId: string): boolean {
    this.reapExpired();
    for (const b of this.bindings.values()) {
      if (b.sessionId === sessionId) return true;
    }
    return false;
  }

  unbind(sessionId: string, participantId?: string): void {
    if (participantId) {
      this.bindings.delete(this.key(sessionId, participantId));
    } else {
      for (const [k, b] of this.bindings) {
        if (b.sessionId === sessionId) this.bindings.delete(k);
      }
    }
  }

  unbindAll(): void {
    this.bindings.clear();
  }

  getAllBindings(): SessionBinding[] {
    this.reapExpired();
    return [...this.bindings.values()];
  }

  evictUnhealthy(isHealthy: (keyId: string) => boolean): string[] {
    this.reapExpired();
    const evicted: string[] = [];
    const now = Date.now();
    for (const [k, b] of this.bindings) {
      if (!isHealthy(b.keyId)) {
        this.bindings.delete(k);
        evicted.push(b.keyId);
        this.eventBus?.emit(EVENTS.SESSION_BINDING_EXPIRED, {
          sessionId: b.sessionId,
          keyId: b.keyId,
          provider: b.provider,
          participantId: b.participantId,
          boundAt: b.boundAt,
          evictedAt: now,
          reason: 'unhealthy',
        });
      }
    }
    return evicted;
  }

  handleStateChange(keyId: string): void {
    this.reapExpired();
    const state = this.keyStateStore?.get(keyId);
    if (!state) return;

    const band = getHealthBand(state.healthScore);

    for (const [k, b] of this.bindings) {
      if (b.keyId !== keyId) continue;

      if (band === 'dead') {
        this.bindings.delete(k);
        this.eventBus?.emit(EVENTS.SESSION_BINDING_EXPIRED, {
          sessionId: b.sessionId,
          keyId: b.keyId,
          provider: b.provider,
          participantId: b.participantId,
          boundAt: b.boundAt,
          evictedAt: Date.now(),
          reason: 'health_dead',
        });
      } else if (band === 'cooling' || band === 'degraded') {
        b.pendingEviction = true;
        b.pendingEvictionAt = Date.now();
      } else if (band === 'healthy' || band === 'warm') {
        b.pendingEviction = false;
        b.pendingEvictionAt = undefined;
      }
    }
  }
}
