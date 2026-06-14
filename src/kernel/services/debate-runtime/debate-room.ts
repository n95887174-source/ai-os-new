import { genId } from '../../../utils/gen-id';
import { EVENTS } from '../../events/event-names';
import type { DebateSessionSnapshot, DebatePhase, TimelineEntry } from '../../contracts/debate-runtime';

// ── Types ──────────────────────────────────────────────────────────

export interface DebateOverride {
  id: string;
  sessionId: string;
  type: 'temperature' | 'model' | 'prompt' | 'pause_agent' | 'resume_agent' | 'skip_round';
  target?: string;
  value: unknown;
  appliedAt: number;
  appliedBy: 'human' | 'system';
}

export interface DebateRoomSnapshot {
  readonly sessionId: string;
  readonly phase: DebatePhase;
  readonly round: number;
  readonly overrides: DebateOverride[];
  readonly injectedEvents: InjectedEvent[];
  readonly startedAt: number;
  readonly updatedAt: number;
}

export interface InjectedEvent {
  readonly id: string;
  readonly sessionId: string;
  readonly type: string;
  readonly target?: string;
  readonly content: string;
  readonly injectedAt: number;
}

export interface DebateRoomDeps {
  getEngine: () => {
    getSession(id: string): DebateSessionSnapshot | undefined;
    startSession(id: string): Promise<void>;
    pauseSession(id: string): void;
    resumeSession(id: string): void;
    cancelSession(id: string): void;
    saveSnapshot(id: string): Promise<void>;
    restoreSession(id: string): Promise<DebateSessionSnapshot | null>;
    getTimeline(id: string): TimelineEntry[];
  } | undefined;
  eventBus?: {
    emit: (event: string, data?: unknown) => void;
  };
}

// ── DebateRoom Container ───────────────────────────────────────────

export class DebateRoom {
  private overrides = new Map<string, DebateOverride[]>();
  private injectedEvents = new Map<string, InjectedEvent[]>();
  private roomIds = new Set<string>();
  private _onOverrideApplied?: (sessionId: string, override: DebateOverride) => void;
  private _onEventInjected?: (sessionId: string, event: InjectedEvent) => void;
  private deps: DebateRoomDeps | undefined;

  constructor(deps?: DebateRoomDeps) {
    this.deps = deps;
  }

  // ── Lifecycle ──────────────────────────────────────────────────

  async start(sessionId: string): Promise<void> {
    const engine = this.deps?.getEngine();
    if (!engine) throw new Error('DebateRoom not initialized with engine');

    this.roomIds.add(sessionId);

    try {
      await engine.startSession(sessionId);
    } catch (e) {
      this.roomIds.delete(sessionId);
      throw e;
    }
  }

  pause(sessionId: string): void {
    const engine = this.deps?.getEngine();
    if (!engine) throw new Error('DebateRoom not initialized with engine');

    engine.pauseSession(sessionId);
    this.deps?.eventBus?.emit(EVENTS.DEBATE_SESSION_PAUSED, { sessionId });
  }

  async resume(sessionId: string): Promise<void> {
    const engine = this.deps?.getEngine();
    if (!engine) throw new Error('DebateRoom not initialized with engine');

    await engine.resumeSession(sessionId);
    this.deps?.eventBus?.emit(EVENTS.DEBATE_SESSION_RESUMED, { sessionId });
  }

  stop(sessionId: string): void {
    const engine = this.deps?.getEngine();
    if (!engine) throw new Error('DebateRoom not initialized with engine');

    engine.cancelSession(sessionId);
    this.deps?.eventBus?.emit(EVENTS.DEBATE_SESSION_CANCELLED, { sessionId });
  }

  async step(sessionId: string): Promise<void> {
    const engine = this.deps?.getEngine();
    if (!engine) throw new Error('DebateRoom not initialized with engine');

    const snap = engine.getSession(sessionId);
    if (!snap) throw new Error(`Session not found: ${sessionId}`);

    if (snap.phase === 'paused') {
      void this.resume(sessionId).catch(e => console.warn('[DebateRoom] Resume failed:', e));
    }
  }

  // ── Overrides ──────────────────────────────────────────────────

  setOverrideListener(cb: (sessionId: string, override: DebateOverride) => void): void {
    this._onOverrideApplied = cb;
  }

  applyOverride(override: Omit<DebateOverride, 'id' | 'appliedAt'>): DebateOverride {
    const full: DebateOverride = {
      ...override,
      id: genId('override'),
      appliedAt: Date.now(),
    };
    const list = this.overrides.get(override.sessionId) || [];
    list.push(full);
    this.overrides.set(override.sessionId, list);
    this._onOverrideApplied?.(override.sessionId, full);
    this.deps?.eventBus?.emit(EVENTS.DEBATE_UPDATED, { sessionId: override.sessionId, type: 'override', override: full });
    return full;
  }

  getOverrides(sessionId: string): DebateOverride[] {
    return this.overrides.get(sessionId) || [];
  }

  getActiveOverrides(sessionId: string): DebateOverride[] {
    return this.getOverrides(sessionId).filter(o =>
      o.type === 'pause_agent' || o.type === 'temperature' || o.type === 'model'
    );
  }

  clearOverrides(sessionId: string): void {
    this.overrides.delete(sessionId);
  }

  // ── Injected Events ────────────────────────────────────────────

  setEventInjectionListener(cb: (sessionId: string, event: InjectedEvent) => void): void {
    this._onEventInjected = cb;
  }

  injectEvent(sessionId: string, event: { type: string; target?: string; content: string }): InjectedEvent {
    const injected: InjectedEvent = {
      id: genId('inject'),
      sessionId,
      type: event.type,
      target: event.target,
      content: event.content,
      injectedAt: Date.now(),
    };

    const list = this.injectedEvents.get(sessionId) || [];
    list.push(injected);
    this.injectedEvents.set(sessionId, list);

    // Also apply as override for engine consumption
    this.applyOverride({
      sessionId,
      type: 'prompt',
      target: event.target,
      value: `[INJECTED EVENT: ${event.type}] ${event.content}`,
      appliedBy: 'human',
    });

    this._onEventInjected?.(sessionId, injected);
    this.deps?.eventBus?.emit(EVENTS.DEBATE_UPDATED, { sessionId, type: 'injected_event', event: injected });
    return injected;
  }

  getInjectedEvents(sessionId: string): InjectedEvent[] {
    return this.injectedEvents.get(sessionId) || [];
  }

  // ── Snapshot / Restore ─────────────────────────────────────────

  getSnapshot(sessionId: string): DebateRoomSnapshot | null {
    if (!this.roomIds.has(sessionId)) return null;

    const engine = this.deps?.getEngine();
    const session = engine?.getSession(sessionId);
    if (!session) return null;

    return {
      sessionId,
      phase: session.phase,
      round: session.round,
      overrides: this.getOverrides(sessionId),
      injectedEvents: this.getInjectedEvents(sessionId),
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
    };
  }

  async saveSnapshot(sessionId: string): Promise<void> {
    const engine = this.deps?.getEngine();
    if (engine) {
      await engine.saveSnapshot(sessionId);
    }
  }

  async restore(sessionId: string): Promise<DebateRoomSnapshot | null> {
    const engine = this.deps?.getEngine();
    if (!engine) return null;

    const session = await engine.restoreSession(sessionId);
    if (!session) return null;

    this.roomIds.add(sessionId);
    return this.getSnapshot(sessionId);
  }

  // ── Query ──────────────────────────────────────────────────────

  getPhase(sessionId: string): DebatePhase | undefined {
    return this.deps?.getEngine()?.getSession(sessionId)?.phase;
  }

  listRooms(): string[] {
    return [...this.roomIds];
  }

  getTimeline(sessionId: string): TimelineEntry[] {
    return this.deps?.getEngine()?.getTimeline(sessionId) ?? [];
  }

  destroy(): void {
    this.overrides.clear();
    this.injectedEvents.clear();
    this.roomIds.clear();
    this._onOverrideApplied = undefined;
    this._onEventInjected = undefined;
  }
}
