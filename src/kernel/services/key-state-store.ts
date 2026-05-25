import type { IEventBus } from '../types/interfaces';
import type { ILifecycle } from '../contracts/lifecycle';
import type { IKeyStateStore, KeyState, KeyStatus, KeyStateEvent, KeyProbeSnapshot, KeyHealthSnapshot, KeyQuotaSnapshot } from '../contracts/key-state';
import type { ProbeResult } from '../contracts/probe';
import { EVENTS } from '../events/event-names';
import type { QuotaExceededPayload } from '../events/provider-events';

const DEFAULT_HEALTH: KeyHealthSnapshot = { errorRate: 0, successRate: 1, consecutiveErrors: 0 };
const DEFAULT_QUOTA: KeyQuotaSnapshot = { usedTokens: 0, limitTokens: 0, usedRequests: 0, limitRequests: 0 };

export class KeyStateStore implements IKeyStateStore, ILifecycle {
  private states = new Map<string, KeyState>();
  private listeners = new Set<(event: { type: KeyStateEvent; id: string; state?: KeyState }) => void>();
  private eventBus?: IEventBus;
  private unsubs: Array<() => void> = [];

  constructor(eventBus?: IEventBus) {
    this.eventBus = eventBus;
  }

  async init(): Promise<void> {}
  async start(): Promise<void> {
    if (!this.eventBus) return;

    this.unsubs.push(
      this.eventBus.onSafe<QuotaExceededPayload>(EVENTS.KEY_QUOTA_EXCEEDED, (payload) => {
        const prev = this.states.get(payload.id);
        const quotaUsed = payload.current ?? 0;
        const quotaLimit = payload.limit ?? 0;
        this.update(payload.id, {
          quota: {
            ...prev?.quota ?? DEFAULT_QUOTA,
            usedTokens: payload.quotaType === 'tokens' ? quotaUsed : (prev?.quota.usedTokens ?? 0),
            limitTokens: payload.quotaType === 'tokens' ? quotaLimit : (prev?.quota.limitTokens ?? 0),
            usedRequests: payload.quotaType === 'requests' ? quotaUsed : (prev?.quota.usedRequests ?? 0),
            limitRequests: payload.quotaType === 'requests' ? quotaLimit : (prev?.quota.limitRequests ?? 0),
            resetAt: payload.resetAt ?? prev?.quota.resetAt,
          },
          flags: { ...prev?.flags ?? { circuitOpen: false, rateLimited: false, authFailed: false }, rateLimited: true },
        });
        this.recomputeRouting(payload.id);
      }),
    );

    this.unsubs.push(
      this.eventBus.onSafe<{ id: string; provider: string; error: string }>(EVENTS.KEY_HEALTH_FAILED, (payload) => {
        const prev = this.states.get(payload.id);
        const ce = (prev?.health.consecutiveErrors ?? 0) + 1;
        this.update(payload.id, {
          health: { ...prev?.health ?? DEFAULT_HEALTH, consecutiveErrors: ce, errorRate: Math.min(1, ce / 10) },
        });
        this.recomputeRouting(payload.id);
      }),
    );

    this.unsubs.push(
      this.eventBus.onSafe<{ id: string; provider: string; state: string; previousState: string }>(EVENTS.KEY_STATE_CHANGED, (payload) => {
        const flags = { ...this.states.get(payload.id)?.flags ?? { circuitOpen: false, rateLimited: false, authFailed: false } };
        if (payload.state === 'broken' || payload.state === 'error') flags.authFailed = true;
        if (payload.state === 'limited') flags.rateLimited = true;
        this.update(payload.id, { flags });
        this.recomputeRouting(payload.id);
      }),
    );
  }
  destroy(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.listeners.clear();
    this.states.clear();
  }

  get(id: string): KeyState | undefined {
    return this.states.get(id);
  }

  getAll(): KeyState[] {
    return [...this.states.values()];
  }

  getReady(): KeyState[] {
    return this.getAll().filter(k => k.status === 'ready');
  }

  getForRouting(): KeyState[] {
    return this.getAll()
      .filter(k => !k.routing.blocked)
      .sort((a, b) => b.routing.weight - a.routing.weight);
  }

  update(id: string, patch: Partial<KeyState>): void {
    const prev = this.states.get(id);
    const next: KeyState = prev
      ? { ...prev, ...patch, updatedAt: Date.now() }
      : {
          id,
          status: 'unknown',
          provider: '',
          label: '',
          lastProbe: { status: 'unknown', latency: 0, timestamp: Date.now() },
          health: { ...DEFAULT_HEALTH },
          quota: { ...DEFAULT_QUOTA },
          routing: { weight: 0, blocked: false },
          flags: { circuitOpen: false, rateLimited: false, authFailed: false },
          updatedAt: Date.now(),
          ...patch,
        };

    // Preserve routing default if patch omitted it
    if (!patch.routing) {
      next.routing = prev?.routing ?? { weight: 0, blocked: false };
    }
    this.states.set(id, next);
    this.emit('keystate:updated', id, next);
  }

  remove(id: string): void {
    this.states.delete(id);
    this.emit('keystate:removed', id);
  }

  on(cb: (event: { type: KeyStateEvent; id: string; state?: KeyState }) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(type: KeyStateEvent, id: string, state?: KeyState): void {
    for (const cb of this.listeners) cb({ type, id, state });
    this.eventBus?.emit(type, { id, state });
  }

  ingestProbe(id: string, result: ProbeResult): void {
    const probeSnapshot: KeyProbeSnapshot = {
      status: result.status,
      latency: result.latency,
      error: result.error,
      errorCode: result.statusCode,
      timestamp: result.timestamp,
    };

    let status: KeyStatus = result.status;
    const flags = {
      circuitOpen: result.circuitOpen,
      rateLimited: result.rateLimited,
      authFailed: false,
    };

    if (result.error?.includes('401') || result.error?.includes('Authentication failed') || result.error?.includes('Invalid API Key')) {
      flags.authFailed = true;
    }

    this.update(id, {
      provider: result.provider,
      label: result.keyLabel,
      model: result.model,
      lastProbe: probeSnapshot,
      status,
      flags,
    });
    this.recomputeRouting(id);
  }

  private recomputeRouting(id: string): void {
    const state = this.states.get(id);
    if (!state) return;

    let weight = 1;
    if (state.status === 'limited') weight = 0.3;
    else if (state.status === 'degraded') weight = 0.5;
    else if (state.status === 'broken') weight = 0;
    else if (state.status === 'unknown') weight = 0.1;

    if (state.health.consecutiveErrors > 3) weight *= 0.5;
    if (state.flags.authFailed) weight = 0;

    this.states.set(id, {
      ...state,
      routing: { weight, blocked: weight === 0 },
      updatedAt: Date.now(),
    });
  }
}
