import type {
  DebatePhase,
  AgentPhase,
  AgentStateEntry,
  DebateTopology,
  ParticipantConfig,
  DebateSessionSnapshot,
  IDebateSession,
} from '../../contracts/debate-runtime';
import type { ITransaction } from '../../contracts/transaction';
import { rootLogger } from '../logger-service';

const LOGGER = rootLogger.child('DebateSession');

const VALID_TRANSITIONS: Record<DebatePhase, DebatePhase[]> = {
  created: ['queued', 'failed', 'cancelled'],
  queued: ['initializing', 'cancelled'],
  initializing: ['active', 'failed', 'cancelled'],
  active: ['deliberating', 'paused', 'failed', 'cancelled'],
  deliberating: ['deliberating', 'consensus', 'paused', 'failed', 'cancelled'],
  paused: ['queued', 'deliberating', 'failed', 'cancelled'],
  consensus: ['summarizing', 'deliberating', 'failed', 'cancelled'],
  summarizing: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: ['created'],
  cancelled: ['created'],
};

export class DebateSession implements IDebateSession {
  readonly id: string;
  readonly topic: string;
  readonly topology: DebateTopology;
  readonly createdAt: number;
  readonly participants: ParticipantConfig[];

  private _phase: DebatePhase = 'created';
  private _round = 0;
  private _agentStates = new Map<string, AgentStateEntry>();
  private _totalTokens = 0;
  private _totalCost = 0;
  private _startedAt = 0;
  private _phaseListeners: Array<(from: DebatePhase, to: DebatePhase) => void> = [];

  readonly language: string;
  private _failedProviders = new Set<string>();

  hasProviderFailed(provider: string): boolean {
    return this._failedProviders.has(provider);
  }

  markProviderFailed(provider: string): void {
    this._failedProviders.add(provider);
  }

  constructor(id: string, topic: string, topology: DebateTopology, participants: ParticipantConfig[], language = 'Russian') {
    this.id = id;
    this.topic = topic;
    this.topology = topology;
    this.participants = participants;
    this.language = language;
    this.createdAt = Date.now();

    for (const p of participants) {
      this._agentStates.set(p.agentId, {
        agentId: p.agentId,
        nodeId: p.nodeId,
        phase: 'idle',
        round: 0,
        tokensUsed: 0,
        latency: 0,
        lastActiveAt: Date.now(),
      });
    }
  }

  get phase(): DebatePhase { return this._phase; }
  get round(): number { return this._round; }
  get agentStates(): Map<string, AgentStateEntry> { return new Map(this._agentStates); }
  get totalTokens(): number { return this._totalTokens; }
  get totalCost(): number { return this._totalCost; }

  onPhaseChange(cb: (from: DebatePhase, to: DebatePhase) => void): () => void {
    this._phaseListeners.push(cb);
    return () => { this._phaseListeners = this._phaseListeners.filter(l => l !== cb); };
  }

  transition(to: DebatePhase, tx?: ITransaction): boolean {
    const allowed = VALID_TRANSITIONS[this._phase];
    if (!allowed.includes(to)) {
      const msg = `Invalid transition: ${this._phase} -> ${to}`;
      LOGGER.warn('DebateSession', msg);
      if (tx && 'deferEmit' in tx) {
        (tx as unknown as { deferEmit: (e: string, d: unknown) => void }).deferEmit('debate:transition:invalid', { from: this._phase, to, sessionId: this.id });
      }
      return false;
    }
    const from = this._phase;
    this._phase = to;
    if (to === 'active' && !this._startedAt) this._startedAt = Date.now();
    for (const cb of this._phaseListeners) cb(from, to);
    return true;
  }

  incrementRound(): void {
    this._round++;
  }

  setAgentPhase(agentId: string, phase: AgentPhase, _tx?: ITransaction): void {
    const existing = this._agentStates.get(agentId);
    if (!existing) return;
    this._agentStates.set(agentId, {
      ...existing,
      phase,
      lastActiveAt: Date.now(),
    });
  }

  recordUsage(agentId: string, tokens: number, cost: number, latency: number): void {
    const existing = this._agentStates.get(agentId);
    if (!existing) return;
    this._agentStates.set(agentId, {
      ...existing,
      tokensUsed: existing.tokensUsed + tokens,
      latency: existing.latency === 0 ? latency : (existing.latency + latency) / 2,
      round: this._round,
    });
    this._totalTokens += tokens;
    this._totalCost += cost;
  }

  setAgentError(agentId: string, error: string): void {
    const existing = this._agentStates.get(agentId);
    if (!existing) return;
    this._agentStates.set(agentId, { ...existing, error, phase: 'errored', lastActiveAt: Date.now() });
  }

  snapshot(): DebateSessionSnapshot {
    return {
      id: this.id,
      topic: this.topic,
      topology: structuredClone(this.topology),
      phase: this._phase,
      round: this._round,
      agentStates: Array.from(this._agentStates.values()),
      totalTokens: this._totalTokens,
      totalCost: this._totalCost,
      startedAt: this._startedAt || this.createdAt,
      updatedAt: Date.now(),
      language: this.language,
    };
  }

  destroy(): void {
    this._agentStates.clear();
    this._phaseListeners = [];
    this._failedProviders.clear();
  }

  restoreInternalState(snapshot: DebateSessionSnapshot): void {
    this._phase = snapshot.phase;
    this._round = snapshot.round;
    this._totalTokens = snapshot.totalTokens;
    this._totalCost = snapshot.totalCost;
    this._startedAt = snapshot.startedAt;
    (this as { language: string }).language = snapshot.language;
    
    this._agentStates.clear();
    for (const as of snapshot.agentStates) {
      this._agentStates.set(as.agentId, as);
    }
  }
}
