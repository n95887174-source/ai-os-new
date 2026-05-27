import { PENDING_TTL } from '../contracts/session-affinity';
import type { ISessionAffinityStore, SessionBinding } from '../contracts/session-affinity';
import type { ILifecycle } from '../contracts/lifecycle';
import type { IEventBus } from '../contracts/event-bus';
import type { IKeyStateStore } from '../contracts/key-state';
import type { KeyStatus } from '../contracts/key-state';

const CRITICAL: Set<KeyStatus> = new Set(['broken']);
const WARN: Set<KeyStatus> = new Set(['limited', 'degraded']);
const HEALTHY: Set<KeyStatus> = new Set(['ready']);

export class SessionAffinityStore implements ISessionAffinityStore, ILifecycle {
  private bindings = new Map<string, SessionBinding>();
  private eventBus?: IEventBus;
  private keyStateStore?: IKeyStateStore;
  private _onStateChanged?: (data: { id: string }) => void;

  constructor(eventBus?: IEventBus, keyStateStore?: IKeyStateStore) {
    this.eventBus = eventBus;
    this.keyStateStore = keyStateStore;
  }

  async init(): Promise<void> {}
  async start(): Promise<void> {
    if (!this.eventBus) return;
    this._onStateChanged = (data: { id: string }) => {
      this.handleStateChange(data.id);
    };
    this.eventBus.on('key:state:changed', this._onStateChanged);
  }
  destroy(): void {
    if (this.eventBus && this._onStateChanged) {
      this.eventBus.off('key:state:changed', this._onStateChanged);
    }
    this.bindings.clear();
  }

  private reapExpired(): void {
    const now = Date.now();
    for (const [k, b] of this.bindings) {
      if (b.pendingEviction && b.pendingEvictionAt && now - b.pendingEvictionAt > PENDING_TTL) {
        this.bindings.delete(k);
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
    for (const [k, b] of this.bindings) {
      if (!isHealthy(b.keyId)) {
        this.bindings.delete(k);
        evicted.push(b.keyId);
      }
    }
    return evicted;
  }

  handleStateChange(keyId: string): void {
    this.reapExpired();
    const state = this.keyStateStore?.get(keyId);
    if (!state) return;

    for (const [k, b] of this.bindings) {
      if (b.keyId !== keyId) continue;

      if (CRITICAL.has(state.status)) {
        this.bindings.delete(k);
      } else if (WARN.has(state.status)) {
        b.pendingEviction = true;
        b.pendingEvictionAt = Date.now();
      } else if (HEALTHY.has(state.status)) {
        b.pendingEviction = false;
        b.pendingEvictionAt = undefined;
      }
    }
  }
}