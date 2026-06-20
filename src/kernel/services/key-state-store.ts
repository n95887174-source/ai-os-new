import type { IEventBus } from '../types/interfaces';
import type { ILifecycle } from '../contracts/lifecycle';
import type { IKeyStateStore, KeyState, KeyStatus, KeyStateEvent, KeyProbeSnapshot, KeyHealthSnapshot, KeyQuotaSnapshot } from '../contracts/key-state';
import { RECOVERY_RATE_PER_MIN } from '../contracts/key-state';
import type { ProbeResult } from '../contracts/probe';
import type { ApiKey } from '../contracts/storage/storage-layer';
import { EVENTS } from '../events/event-names';
import type { QuotaExceededPayload } from '../events/provider-events';
import { rootLogger } from './logger-service';

const DEFAULT_HEALTH: KeyHealthSnapshot = { errorRate: 0, successRate: 1, consecutiveErrors: 0 };
const DEFAULT_QUOTA: KeyQuotaSnapshot = { usedTokens: 0, limitTokens: 0, usedRequests: 0, limitRequests: 0 };

/**
 * STATE-M9: Authoritative key state store for routing decisions.
 * KeyStateProjection (projections/) is a separate event-sourced read model
 * for UI display only. Both reduce the same events but serve different
 * purposes: this store feeds getForRouting(), Projection feeds getState().
 */
export class KeyStateStore implements IKeyStateStore, ILifecycle {
  private states = new Map<string, KeyState>();
  private listeners = new Set<(event: { type: KeyStateEvent; id: string; state?: KeyState }) => void>();
  private eventBus?: IEventBus;
  private unsubs: Array<() => void> = [];
  private database?: { getKv: <T>(id: string) => Promise<T | null>; setKv: <T>(id: string, value: T) => Promise<void> };
  private persistPromise: Promise<void> | null = null;
  private _persistDirty = false;
  private _started = false;

  constructor(eventBus?: IEventBus, database?: { getKv: <T>(id: string) => Promise<T | null>; setKv: <T>(id: string, value: T) => Promise<void> }) {
    this.eventBus = eventBus;
    this.database = database;
  }

  async init(): Promise<void> {}

  private async loadPersisted(): Promise<void> {
    if (!this.database) return;
    try {
      const data = await this.database.getKv<Array<{ id: string; state: KeyState }>>('keystate_store_states');
      if (data) {
        for (const { id, state } of data) {
          if (!this.states.has(id)) {
            this.states.set(id, state);
          }
        }
      }
    } catch (e) {
      rootLogger.warn('KeyStateStore', 'Failed to load persisted states', { error: e });
    }
  }

  private persist(): void {
    if (!this.database) return;
    if (this.persistPromise) {
      this._persistDirty = true;
      return;
    }
    this.persistPromise = (async () => {
      try {
        this._persistDirty = false;
        const data = Array.from(this.states.entries()).map(([id, state]) => ({ id, state }));
        await this.database!.setKv('keystate_store_states', data);
      } catch (e) {
        rootLogger.warn('KeyStateStore', 'Failed to persist states', { error: e });
      } finally {
        this.persistPromise = null;
        if (this._persistDirty) this.persist();
      }
    })();
  }

  /**
   * Seed the store with all existing keys before the first probe runs.
   * Call this from bootstrap / after keyService is ready.
   */
  seedFromKeys(keys: ApiKey[]): void {
    for (const key of keys) {
      if (!this.states.has(key.id)) {
        const status: KeyStatus =
          key.status === 'active' ? 'ready' :
          key.status === 'error' ? 'broken' : 'unknown';
        this.states.set(key.id, {
          id: key.id,
          provider: key.provider,
          label: key.label || key.provider,
          status,
          healthScore: status === 'ready' ? 100 : status === 'broken' ? 0 : 25,
          lastProbe: { status, latency: 0, timestamp: Date.now() },
          health: { ...DEFAULT_HEALTH },
          quota: { ...DEFAULT_QUOTA },
          routing: { weight: status === 'ready' ? 1 : 0, blocked: status !== 'ready' },
          flags: { circuitOpen: false, rateLimited: false, authFailed: false },
          lifecycleState: 'active',
          updatedAt: Date.now(),
        });

      }
    }
    this.persist();
  }
  async start(): Promise<void> {
    if (this._started) return;
    this._started = true;
    await this.loadPersisted();
    if (!this.eventBus) return;

    this.unsubs.push(
      this.eventBus.on(EVENTS.KEY_REMOVED, (id: unknown) => {
        if (typeof id === 'string') this.remove(id);
      }),
    );

    this.unsubs.push(
      this.eventBus.onSafe<{ key: { id: string; provider: string; label?: string; status: string } }>(EVENTS.KEY_UPDATED, (payload) => {
        if (!payload?.key?.id) return;
        const s = this.states.get(payload.key.id);
        if (s) {
          const status: KeyStatus =
            payload.key.status === 'active' ? 'ready' :
            payload.key.status === 'error' ? 'broken' : 'unknown';
          this.update(payload.key.id, { status, provider: payload.key.provider, label: payload.key.label ?? payload.key.provider });
          this.recomputeRouting(payload.key.id);
        }
      }),
    );

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

    this.unsubs.push(
      this.eventBus.onSafe<{ provider: string; keyId: string; status: string; failureCount: number; lastFailure: number }>(
        EVENTS.PROVIDER_CIRCUIT_BREAKER_SYNCED, (payload) => {
          for (const [id, state] of this.states) {
            if (state.provider.toLowerCase() === payload.provider.toLowerCase()) {
              this.update(id, {
                flags: { ...state.flags, circuitOpen: payload.status === 'open' },
              });
              this.recomputeRouting(id);
            }
          }
        }),
    );

    this.unsubs.push(
      this.eventBus.onSafe<{ provider: string; keyId: string; remaining: number; resetAt: number }>(
        EVENTS.PROVIDER_RATE_LIMIT_SYNCED, (payload) => {
          for (const [id, state] of this.states) {
            if (state.provider.toLowerCase() === payload.provider.toLowerCase()) {
              this.update(id, {
                flags: { ...state.flags, rateLimited: payload.remaining <= 0 },
              });
              this.recomputeRouting(id);
            }
          }
        }),
    );

    this.unsubs.push(
      this.eventBus.onSafe<{ provider: string; keyId: string; error: string; timestamp: number; statusCode?: number }>(
        EVENTS.PROVIDER_ERROR_SYNCED, (payload) => {
          for (const [id, state] of this.states) {
            if (state.provider.toLowerCase() === payload.provider.toLowerCase()) {
              const ce = (state.health.consecutiveErrors ?? 0) + 1;
              this.update(id, {
                health: { ...state.health, consecutiveErrors: ce, errorRate: Math.min(1, ce / 10) },
              });
              this.recomputeRouting(id);
            }
          }
        }),
    );
  }
  async destroy(): Promise<void> {
    this._started = false;
    if (this.persistPromise) await this.persistPromise;
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.listeners.clear();
    this.states.clear();
  }

  get(id: string): KeyState | undefined {
    const state = this.states.get(id);
    if (!state) return undefined;
    return this.applyRecovery(state);
  }

  private applyRecovery(state: KeyState): KeyState {
    const elapsedMin = (Date.now() - state.updatedAt) / 60000;
    if (elapsedMin <= 0 || state.healthScore >= 100) return state;
    const recovered = Math.min(100, state.healthScore + RECOVERY_RATE_PER_MIN * elapsedMin);
    const hs = recovered;
    let weight = hs >= 75 ? 1 : hs >= 50 ? 0.5 : hs >= 25 ? 0.25 : hs >= 10 ? 0.1 : 0;
    if (state.health.consecutiveErrors > 3) weight *= 0.5;
    if (state.flags.authFailed) weight = 0;
    const hasWorkingModel = state.modelHealth && Object.values(state.modelHealth).some(v => v === 'ok');
    if (hs < 25 && hasWorkingModel) weight = Math.max(weight, 0.25);
    return { ...state, healthScore: recovered, routing: { weight, blocked: weight === 0 } };
  }

  getAll(): KeyState[] {
    return [...this.states.values()].map(s => this.applyRecovery(s));
  }

  getReady(): KeyState[] {
    return this.getAll().filter(k => k.healthScore >= 75);
  }

  getForRouting(): KeyState[] {
    return this.getAll()
      .filter(k => !k.routing.blocked)
      .sort((a, b) => b.routing.weight - a.routing.weight);
  }

  getWorkingModels(keyId: string, availableModels: string[]): string[] {
    const state = this.states.get(keyId);
    if (!state?.modelHealth || Object.keys(state.modelHealth).length === 0) {
      return availableModels;
    }
    return availableModels.filter(m => state.modelHealth![m] !== 'failed');
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
          healthScore: 100,
          lastProbe: { status: 'unknown', latency: 0, timestamp: Date.now() },
          health: { ...DEFAULT_HEALTH },
          quota: { ...DEFAULT_QUOTA },
          routing: { weight: 0, blocked: false },
          flags: { circuitOpen: false, rateLimited: false, authFailed: false },
          lifecycleState: 'active',
          updatedAt: Date.now(),
          ...patch,
        };

    // Preserve healthScore from prev if patch omitted it
    if (patch.healthScore === undefined && prev?.healthScore !== undefined) {
      next.healthScore = prev.healthScore;
    }

    // Preserve routing default if patch omitted it
    if (!patch.routing) {
      next.routing = prev?.routing ?? { weight: 0, blocked: false };
    }
    this.states.set(id, next);
    this.emit(EVENTS.KEYSTATE_UPDATED, id, next);
    this.persist();
  }

  remove(id: string): void {
    this.states.delete(id);
    this.emit(EVENTS.KEYSTATE_REMOVED, id);
    this.persist();
  }

  on(cb: (event: { type: KeyStateEvent; id: string; state?: KeyState }) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(type: KeyStateEvent, id: string, state?: KeyState): void {
    for (const cb of this.listeners) cb({ type, id, state });
    this.eventBus?.emit(type, { id, state });
  }

  private computeHealthScore(status: KeyStatus, prevHealth?: number): number {
    const base: Record<KeyStatus, number> = {
      ready: 100,
      limited: 75,
      degraded: 50,
      broken: 0,
      unknown: 25,
    };
    const score = base[status] ?? 25;
    // Never increase above previous health without recovery time
    const prev = prevHealth ?? score;
    return status === 'ready' ? 100 : Math.min(prev, score);
  }

  ingestProbe(id: string, result: ProbeResult): void {
    const probeSnapshot: KeyProbeSnapshot = {
      status: result.status,
      latency: result.latency,
      error: result.error,
      errorCode: result.statusCode,
      timestamp: result.timestamp,
    };

    const status: KeyStatus = result.status;
    const prev = this.states.get(id);
    const healthScore = this.computeHealthScore(status, prev?.healthScore);
    const now = Date.now();
    const lastHealthyAt = healthScore >= 75 ? now : prev?.lastHealthyAt;
    const degradedSince = healthScore < 75 ? (prev?.degradedSince ?? now) : undefined;

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
      modelHealth: result.modelHealth,
      healthScore,
      lastHealthyAt,
      degradedSince,
      lastProbe: probeSnapshot,
      status,
      flags,
    });
    this.recomputeRouting(id);
  }

  private recomputeRouting(id: string): void {
    const state = this.states.get(id);
    if (!state) return;

    const hs = state.healthScore;
    let weight = hs >= 75 ? 1 : hs >= 50 ? 0.5 : hs >= 25 ? 0.25 : hs >= 10 ? 0.1 : 0;

    if (state.health.consecutiveErrors > 3) weight *= 0.5;
    if (state.flags.authFailed) weight = 0;

    // If key has at least one working model, don't block it entirely
    const hasWorkingModel = state.modelHealth && Object.values(state.modelHealth).some(v => v === 'ok');
    if (hs < 25 && hasWorkingModel) {
      // Key has some working models but low healthScore due to probe failures on other models
      // Allow reduced weight for fallback use
      weight = Math.max(weight, 0.25);
    }

    this.states.set(id, {
      ...state,
      routing: { weight, blocked: weight === 0 },
      updatedAt: Date.now(),
    });
  }
}
