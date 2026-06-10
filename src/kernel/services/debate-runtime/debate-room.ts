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
}

// ── DebateRoom Container ───────────────────────────────────────────

export class DebateRoom {
  private overrides = new Map<string, DebateOverride[]>();
  private injectedEvents = new Map<string, InjectedEvent[]>();
  private roomStates = new Map<string, { phase: DebatePhase; startedAt: number; updatedAt: number }>();
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

    const prev = this.roomStates.get(sessionId);
    this.roomStates.set(sessionId, {
      phase: 'active',
      startedAt: Date.now(),
      updatedAt: Date.now(),
    });

    try {
      await engine.startSession(sessionId);
      this.updateRoomState(sessionId, 'active');
    } catch (e) {
      // DR-9: Rollback room state on engine failure
      if (prev) this.roomStates.set(sessionId, prev);
      else this.roomStates.delete(sessionId);
      throw e;
    }
  }

  pause(sessionId: string): void {
    const engine = this.deps?.getEngine();
    if (!engine) throw new Error('DebateRoom not initialized with engine');

    engine.pauseSession(sessionId);
    this.updateRoomState(sessionId, 'paused');
  }

  async resume(sessionId: string): Promise<void> {
    const engine = this.deps?.getEngine();
    if (!engine) throw new Error('DebateRoom not initialized with engine');

    const prev = this.roomStates.get(sessionId);
    this.updateRoomState(sessionId, 'active');

    try {
      await engine.resumeSession(sessionId);
    } catch (e) {
      if (prev) this.roomStates.set(sessionId, prev);
      else this.roomStates.delete(sessionId);
      throw e;
    }
  }

  stop(sessionId: string): void {
    const engine = this.deps?.getEngine();
    if (!engine) throw new Error('DebateRoom not initialized with engine');

    engine.cancelSession(sessionId);
    this.updateRoomState(sessionId, 'cancelled');
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
      id: `override-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      appliedAt: Date.now(),
    };
    const list = this.overrides.get(override.sessionId) || [];
    list.push(full);
    this.overrides.set(override.sessionId, list);
    this._onOverrideApplied?.(override.sessionId, full);
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
      id: `inject-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    return injected;
  }

  getInjectedEvents(sessionId: string): InjectedEvent[] {
    return this.injectedEvents.get(sessionId) || [];
  }

  // ── Snapshot / Restore ─────────────────────────────────────────

  getSnapshot(sessionId: string): DebateRoomSnapshot | null {
    const state = this.roomStates.get(sessionId);
    if (!state) return null;

    const engine = this.deps?.getEngine();
    const session = engine?.getSession(sessionId);

    return {
      sessionId,
      phase: state.phase,
      round: session?.round ?? 0,
      overrides: this.getOverrides(sessionId),
      injectedEvents: this.getInjectedEvents(sessionId),
      startedAt: state.startedAt,
      updatedAt: state.updatedAt,
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

    this.roomStates.set(sessionId, {
      phase: session.phase,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
    });

    return this.getSnapshot(sessionId);
  }

  // ── Query ──────────────────────────────────────────────────────

  getPhase(sessionId: string): DebatePhase | undefined {
    return this.roomStates.get(sessionId)?.phase;
  }

  listRooms(): string[] {
    return [...this.roomStates.keys()];
  }

  getTimeline(sessionId: string): TimelineEntry[] {
    return this.deps?.getEngine()?.getTimeline(sessionId) ?? [];
  }

  // ── Internal ───────────────────────────────────────────────────

  private updateRoomState(sessionId: string, phase: DebatePhase): void {
    const existing = this.roomStates.get(sessionId);
    if (existing) {
      this.roomStates.set(sessionId, { ...existing, phase, updatedAt: Date.now() });
    }
  }

  destroy(): void {
    this.overrides.clear();
    this.injectedEvents.clear();
    this.roomStates.clear();
    this._onOverrideApplied = undefined;
    this._onEventInjected = undefined;
  }
}
