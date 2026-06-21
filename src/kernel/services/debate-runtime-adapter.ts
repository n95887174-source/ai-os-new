import { EVENTS } from '../events/event-names';
import { FEATURE_FLAGS } from '../contracts/feature-flags';
import type {
  DebateConfig,
  DebateParticipant,
  DebateSession,
  DebateServiceDeps,
  DebateStrategy,
} from '../contracts/debate-types';
import type { IDebateEngine } from '../contracts/debate-runtime';
import { DebateRuntimeEvents } from '../events/debate-runtime-events';
import {
  buildRoundtableTopology,
  participantsToConfig,
  snapshotToSession,
  type SnapshotBridgeContext,
} from './debate-runtime/debate-bridge';
import type { DebateInterpreter } from './debate-interpreter';
import {
  computeGraphMetrics,
  computeActivityMetrics,
  computeQualityMetrics,
} from './debate-metrics';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('DebateRuntimeAdapter');

export interface DebateRuntimeAdapterHooks {
  getActiveSession: () => DebateSession | null;
  setActiveSession: (session: DebateSession | null) => void;
  persistSession: () => void;
  saveToHistory: () => void;
}

export class DebateRuntimeAdapter {
  private engine: IDebateEngine | null = null;
  private sessionId: string | null = null;
  private bridgeCtx: SnapshotBridgeContext | null = null;
  private unsubs: Array<() => void> = [];

  constructor(
    private deps: Pick<DebateServiceDeps, 'eventBus' | 'getFeatureFlagService'>,
    private hooks: DebateRuntimeAdapterHooks,
    private interpreter: DebateInterpreter,
  ) {}

  setEngine(engine: IDebateEngine): void {
    this.engine = engine;
  }

  isEnabled(): boolean {
    if (!this.engine) return false;
    return this.deps.getFeatureFlagService?.().isEnabled(FEATURE_FLAGS.DEBATE_RUNTIME_ENGINE) ?? false;
  }

  isActive(): boolean {
    return this.sessionId !== null && this.engine !== null;
  }

  clearListeners(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
  }

  private syncSession(): void {
    if (!this.engine || !this.sessionId || !this.bridgeCtx) return;
    const engine = this.engine as {
      exportLegacySession?: (id: string, ctx: Omit<SnapshotBridgeContext, 'timeline'>) => DebateSession | null;
    };
    const prev = this.hooks.getActiveSession();
    const prevArgCount = prev?.arguments.length ?? 0;
    const bridged = engine.exportLegacySession?.(this.sessionId, this.bridgeCtx)
      ?? (() => {
        const snapshot = this.engine!.getSession(this.sessionId!);
        if (!snapshot) return null;
        const timeline = this.engine!.getTimeline(this.sessionId!);
        return snapshotToSession(snapshot, { ...this.bridgeCtx!, timeline });
      })();
    if (!bridged) return;
    this.hooks.setActiveSession(bridged);
    const newArgs = bridged.arguments.slice(prevArgCount);
    for (const arg of newArgs) {
      this.deps.eventBus.emit(EVENTS.DEBATE_ARGUMENT, arg);
    }
    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, bridged);
    this.hooks.persistSession();
  }

  private setupListeners(runtimeId: string): void {
    this.clearListeners();
    const syncIfOurs = (payload: unknown) => {
      const p = payload as { sessionId?: string };
      if (p.sessionId !== runtimeId) return;
      this.syncSession();
    };
    const events = [
      DebateRuntimeEvents.SESSION_STARTED,
      DebateRuntimeEvents.SESSION_PAUSED,
      DebateRuntimeEvents.SESSION_RESUMED,
      DebateRuntimeEvents.AGENT_RESPONDED,
      DebateRuntimeEvents.PHASE_CHANGED,
      DebateRuntimeEvents.ROUND_STARTED,
      DebateRuntimeEvents.ROUND_ENDED,
      DebateRuntimeEvents.SESSION_COMPLETED,
      DebateRuntimeEvents.SESSION_FAILED,
      DebateRuntimeEvents.SESSION_CANCELLED,
    ];
    for (const event of events) {
      this.unsubs.push(this.deps.eventBus.on(event, syncIfOurs));
    }
  }

  private finalize(): void {
    const session = this.hooks.getActiveSession();
    if (!session) return;
    const metrics = computeGraphMetrics(session.arguments, session.strategy);
    if (metrics) session.graphMetrics = metrics;
    const activity = computeActivityMetrics(session.arguments, session.participants);
    if (activity) session.activityMetrics = activity;
    const quality = computeQualityMetrics(session.arguments, session.topic);
    if (quality) session.qualityMetrics = quality;
    session.interpretation = this.interpreter.interpret(session);
    this.hooks.saveToHistory();
    this.deps.eventBus.emit(EVENTS.DEBATE_UPDATED, session);
    this.hooks.persistSession();
    this.clearListeners();
    this.sessionId = null;
    this.bridgeCtx = null;
  }

  async startDebate(
    topic: string,
    participants: DebateParticipant[],
    strategy: DebateStrategy,
    maxRounds: number,
    sessionConfig: DebateConfig,
  ): Promise<DebateSession> {
    const engine = this.engine!;
    const runtimeId = engine.createSession(buildRoundtableTopology(participants), topic, participantsToConfig(participants));
    this.sessionId = runtimeId;
    this.bridgeCtx = { participants, strategy, maxRounds, config: sessionConfig };
    this.setupListeners(runtimeId);
    this.syncSession();
    const session = this.hooks.getActiveSession()!;
    this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Debate started (runtime): ${topic} with ${participants.length} agents`,
      type: 'info',
    });
    this.deps.eventBus.emit(EVENTS.DEBATE_STARTED, session);
    this.hooks.persistSession();
    void engine.startSession(runtimeId)
      .then(() => this.finalize())
      .catch((e) => {
        LOGGER.warn('DebateRuntimeAdapter', 'Runtime debate failed', { error: e });
        this.syncSession();
        this.finalize();
      });
    return session;
  }

  pause(): void {
    if (!this.engine || !this.sessionId) return;
    this.engine.pauseSession(this.sessionId);
    this.syncSession();
  }

  resume(): void {
    if (!this.engine || !this.sessionId) return;
    this.engine.resumeSession(this.sessionId);
    this.syncSession();
  }

  stop(): void {
    if (!this.engine || !this.sessionId) return;
    const snap = this.engine.getSession(this.sessionId);
    if (snap && snap.phase !== 'completed' && snap.phase !== 'failed' && snap.phase !== 'cancelled') {
      this.engine.cancelSession(this.sessionId);
    }
    this.syncSession();
    this.finalize();
  }

  syncIfActive(): void {
    if (this.isActive()) this.syncSession();
  }

  destroy(): void {
    this.stop();
    this.engine = null;
    this.sessionId = null;
  }
}
