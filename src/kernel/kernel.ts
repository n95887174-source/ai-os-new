import type { SystemState, DecisionTrace, SLAMode, RuntimeAggregate, BudgetAggregate } from './types/metrics-types';
import type { IKernel, KernelDeps, IProviderTracker } from './types/interfaces';
import type { ITransaction } from './contracts/transaction';
import { TransactionContext } from './services/transaction';
import { updateAdaptiveWeights as updateWeights } from './WeightOptimizer';

const STORAGE_KEY = 'super_agents_kernel_state';
const DB_TIMEOUT = 5_000;
const VALID_SLA_MODES: SLAMode[] = ['LOW_LATENCY', 'HIGH_QUALITY', 'BALANCED', 'ECONOMY', 'FREE_FIRST'];

export class SystemKernel implements IKernel {
  private static readonly MAX_EVENTS = 1_000;
  private static readonly EVENT_LOG_TTL = 3_600_000;
  private readonly deps: KernelDeps;
  private state: SystemState = this.getInitialState();
  private eventLog: Array<{ id: string; type: string; payload: unknown; timestamp: number }> = [];
  private eventLogCursor = 0;
  private eventSeq = 0;
  private isDirty = false;
  private unsubs: Array<() => void> = [];
  #beforeUnloadHandler: (() => void) | null = null;

  constructor(deps: KernelDeps) {
    this.deps = deps;
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    if (typeof window !== 'undefined' && this.#beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.#beforeUnloadHandler);
      this.#beforeUnloadHandler = null;
    }
  }

  async transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T> {
    const tx = new TransactionContext('kernel');
    try {
      const result = await fn(tx);
      await tx.commit(this.deps.eventBus);
      return result;
    } catch (e) {
      await tx.rollback(this.deps.eventBus);
      throw e;
    }
  }

  private initialized = false;
  async init() {
    if (this.initialized) return;
    this.initialized = true;
    this.setupListeners();
    await this.loadFromStorage();
    // DISABLED - causes memory issues
    // if (!this.saveInterval) {
    //   this.saveInterval = setInterval(() => {
    //     if (this.isDirty) this.saveToStorage();
    //   }, 10000);
    // }
    if (typeof window !== 'undefined') {
      this.#beforeUnloadHandler = () => this.saveToStorage();
      window.addEventListener('beforeunload', this.#beforeUnloadHandler);
    }
  }

  private async loadFromStorage() {
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const dbPromise = this.deps.database.getKv<string>(STORAGE_KEY);
      dbPromise.catch(() => {}); // prevent unhandled rejection if timeout wins
      const saved = await Promise.race([
        dbPromise,
        new Promise<undefined>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Database timeout')), DB_TIMEOUT);
        }),
      ]);
      clearTimeout(timer);
      if (saved) {
        this.loadState(saved);
      }
      await this.tracker.hydrateState?.(this.state);
    } catch (e) {
      this.deps.eventBus?.emit('kernel:load-failed', { error: e });
    }
  }

  private async saveToStorage() {
    try {
      await this.deps.database.setKv(STORAGE_KEY, this.dumpState());
      this.isDirty = false;
    } catch (e) {
      this.deps.eventBus?.emit('kernel:persist-failed', { error: e });
    }
  }

  private getInitialState(): SystemState {
    return {
      providers: {},
      weights: {
        base: { ttft: 0.4, tps: 0.2, reliability: 0.4 },
        adaptiveDelta: { ttft: 0, tps: 0, reliability: 0 },
        effective: { ttft: 0.4, tps: 0.2, reliability: 0.4 }
      },
      decisions: [],
      totalRequests: 0,
      totalTokens: 0,
      estimatedCost: 0,
      explorationFactor: 0.1,
      history: [],
      violations: [],
      activeSLA: 'BALANCED'
    };
  }

  private setupListeners() {
    this.unsubs.push(
      this.deps.eventBus.on('chat:stream:end', (data) => this.reduce('METRIC_UPDATE', data)),
      this.deps.eventBus.on('chat:stream:error', (data) => this.reduce('METRIC_ERROR', data)),
      this.deps.eventBus.on('system:decision', (data) => this.reduce('DECISION_MADE', data)),
      this.deps.eventBus.on('router:signal', (data) => this.reduce('LEARNING_SIGNAL', data)),
      this.deps.eventBus.on('provider-runtime:state', (data) => this.reduce('PROVIDER_RUNTIME_STATE', data)),
      this.deps.eventBus.on('provider-runtime:budget', (data) => this.reduce('PROVIDER_RUNTIME_BUDGET', data))
    );
  }

  private get tracker(): IProviderTracker {
    return this.deps.providerTracker;
  }

  private logEvent(type: string, payload: unknown) {
    const now = Date.now();
    const id = `${now}-${this.eventSeq++}`;
    const entry = { id, type, payload, timestamp: now };
    if (this.eventLog.length < SystemKernel.MAX_EVENTS) {
      this.eventLog.push(entry);
    } else {
      this.eventLog[this.eventLogCursor] = entry;
      this.eventLogCursor = (this.eventLogCursor + 1) % SystemKernel.MAX_EVENTS;
    }
  }

  private reduce(type: string, payload: unknown) {
    this.logEvent(type, payload);
    this.applyMutation(type, payload);
    this.isDirty = true;
    this.deps.eventBus.emit('kernel:updated', this.state);
  }

  private applyMutation(type: string, payload: unknown): void {
    switch (type) {
      case 'METRIC_UPDATE':
        this.tracker.updateProviderMetric(this.state, payload as Parameters<IProviderTracker['updateProviderMetric']>[1]);
        this.tracker.persistProviderMetrics?.(this.state);
        break;
      case 'METRIC_ERROR':
        this.tracker.updateProviderError(this.state, payload as { provider: string });
        this.tracker.persistProviderMetrics?.(this.state);
        break;
      case 'DECISION_MADE':
        this.state.decisions = [payload as DecisionTrace, ...this.state.decisions].slice(0, 50);
        this.tracker.calculateSelectionRates(this.state);
        break;
      case 'LEARNING_SIGNAL':
        this.updateAdaptiveWeights(payload as { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number });
        break;
      case 'PROVIDER_RUNTIME_STATE': {
        const snap = payload as { instances: unknown[]; totalActive: number; totalDead: number; totalBackoff: number; totalIdle: number; globalErrorRate: number; globalLoadFactor: number; timestamp: number };
        this.state.runtime = {
          totalActive: snap.totalActive,
          totalDead: snap.totalDead,
          totalBackoff: snap.totalBackoff,
          totalIdle: snap.totalIdle,
          globalErrorRate: snap.globalErrorRate,
          globalLoadFactor: snap.globalLoadFactor,
          lastUpdated: snap.timestamp,
        };
        break;
      }
      case 'PROVIDER_RUNTIME_BUDGET': {
        const snap = payload as { global: { totalCost: number; totalTokens: number; totalSessions: number; activeSessions: number }; byProvider: unknown[]; limits: unknown; exhausted: boolean; timestamp: number };
        this.state.budget = {
          totalCost: snap.global.totalCost,
          totalTokens: snap.global.totalTokens,
          totalSessions: snap.global.totalSessions,
          activeSessions: snap.global.activeSessions,
          exhausted: snap.exhausted,
          lastUpdated: snap.timestamp,
        };
        break;
      }
    }
  }

  private markDirtyAndEmit(tx?: ITransaction) {
    if (tx) {
      tx.deferPersist(async () => { this.saveToStorage(); });
      tx.deferEmit('kernel:updated', this.state);
    } else {
      this.isDirty = true;
      this.deps.eventBus.emit('kernel:updated', this.state);
    }
  }

  private updateAdaptiveWeights(signal: { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number }) {
    updateWeights(this.state, signal);
  }

  getHealthEvents(provider?: string, limit?: number) {
    return this.tracker.getHealthEvents(provider, limit);
  }

  getProviderRankings(catalogProviders?: string[]) {
    return this.tracker.getProviderRankings(this.state, catalogProviders);
  }

  getCollaborativeSuggestions(installedProviders?: string[]) {
    return this.tracker.getCollaborativeSuggestions(this.state, installedProviders);
  }

  dumpState() { return JSON.stringify({ state: this.state, eventLog: this.eventLog, eventLogCursor: this.eventLogCursor, version: '2.1.0-safety' }); }

  loadState(json: string) {
    try {
      const data = JSON.parse(json);

      if (!data || typeof data !== 'object') throw new Error('Invalid JSON structure');
      if (data.version !== '2.1.0-safety') {
        this.state = this.getInitialState();
        this.eventLog = [];
        this.eventLogCursor = 0;
        this.eventSeq = 0;
        return;
      }
      if (!data.state || typeof data.state !== 'object') throw new Error('Invalid state structure');

      const parsed = this.validateState(data.state);
      this.state = parsed;
      this.eventLog = Array.isArray(data.eventLog) ? data.eventLog.slice(-SystemKernel.MAX_EVENTS) : [];
      this.eventLogCursor = typeof data.eventLogCursor === 'number' ? data.eventLogCursor : (this.eventLog.length >= SystemKernel.MAX_EVENTS ? 0 : this.eventLog.length);
      this.eventSeq = this.eventLog.length;
      this.deps.eventBus.emit('kernel:updated', this.state);
    } catch (e) {
      this.state = this.getInitialState();
      this.eventLog = [];
      this.eventLogCursor = 0;
      this.eventSeq = 0;
    }
  }

  private validateState(raw: unknown): SystemState {
    if (!raw || typeof raw !== 'object') throw new Error('State must be an object');
    const s = raw as Record<string, unknown>;
    const init = this.getInitialState();
    return {
      providers: s.providers && typeof s.providers === 'object' ? s.providers as SystemState['providers'] : init.providers,
      weights: this.validateWeights(s.weights),
      decisions: Array.isArray(s.decisions) ? s.decisions as DecisionTrace[] : init.decisions,
      totalRequests: typeof s.totalRequests === 'number' ? s.totalRequests : init.totalRequests,
      totalTokens: typeof s.totalTokens === 'number' ? s.totalTokens : init.totalTokens,
      estimatedCost: typeof s.estimatedCost === 'number' ? s.estimatedCost : init.estimatedCost,
      explorationFactor: typeof s.explorationFactor === 'number' ? s.explorationFactor : init.explorationFactor,
      history: Array.isArray(s.history) ? s.history as SystemState['history'] : init.history,
      violations: Array.isArray(s.violations) ? s.violations as string[] : init.violations,
      activeSLA: this.validateSLAMode(s.activeSLA),
      runtime: this.validateRuntimeAggregate(s.runtime),
      budget: this.validateBudgetAggregate(s.budget),
    };
  }

  private validateWeights(raw: unknown): SystemState['weights'] {
    const init = this.getInitialState().weights;
    if (!raw || typeof raw !== 'object') return init;
    const w = raw as Record<string, unknown>;
    const validate = (rw: unknown) => {
      if (!rw || typeof rw !== 'object') return init.base;
      const v = rw as Record<string, unknown>;
      return {
        ttft: typeof v.ttft === 'number' ? Math.max(0, Math.min(1, v.ttft)) : init.base.ttft,
        tps: typeof v.tps === 'number' ? Math.max(0, Math.min(1, v.tps)) : init.base.tps,
        reliability: typeof v.reliability === 'number' ? Math.max(0, Math.min(1, v.reliability)) : init.base.reliability,
      };
    };
    return {
      base: validate(w.base),
      adaptiveDelta: validate(w.adaptiveDelta),
      effective: validate(w.effective),
    };
  }

  private validateSLAMode(raw: unknown): SLAMode {
    if (VALID_SLA_MODES.includes(raw as SLAMode)) return raw as SLAMode;
    return 'BALANCED';
  }

  private validateRuntimeAggregate(raw: unknown): RuntimeAggregate | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const r = raw as Record<string, unknown>;
    if (typeof r.totalActive !== 'number' || typeof r.lastUpdated !== 'number') return undefined;
    return {
      totalActive: r.totalActive,
      totalDead: typeof r.totalDead === 'number' ? r.totalDead : 0,
      totalBackoff: typeof r.totalBackoff === 'number' ? r.totalBackoff : 0,
      totalIdle: typeof r.totalIdle === 'number' ? r.totalIdle : 0,
      globalErrorRate: typeof r.globalErrorRate === 'number' ? r.globalErrorRate : 0,
      globalLoadFactor: typeof r.globalLoadFactor === 'number' ? r.globalLoadFactor : 0,
      lastUpdated: r.lastUpdated,
    };
  }

  private validateBudgetAggregate(raw: unknown): BudgetAggregate | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const b = raw as Record<string, unknown>;
    if (typeof b.totalCost !== 'number' || typeof b.lastUpdated !== 'number') return undefined;
    return {
      totalCost: b.totalCost,
      totalTokens: typeof b.totalTokens === 'number' ? b.totalTokens : 0,
      totalSessions: typeof b.totalSessions === 'number' ? b.totalSessions : 0,
      activeSessions: typeof b.activeSessions === 'number' ? b.activeSessions : 0,
      exhausted: typeof b.exhausted === 'boolean' ? b.exhausted : false,
      lastUpdated: b.lastUpdated,
    };
  }

  private deepFreeze<T>(obj: T, seen = new WeakSet<object>()): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (seen.has(obj)) return obj;   // ← prevent infinite loop on cyclic refs
    seen.add(obj);
    if (Object.isFrozen(obj)) return obj;
    const names = Object.getOwnPropertyNames(obj);
    for (const name of names) {
      const val = (obj as Record<string, unknown>)[name];
      (obj as Record<string, unknown>)[name] = this.deepFreeze(val, seen);
    }
    return Object.freeze(obj);
  }

  getState(): Readonly<SystemState> {
    return this.deepFreeze(structuredClone(this.state));
  }

  /** Mutable clone for Counterfactual simulation — explicit snapshot ABI */
  getStateSnapshot(): SystemState {
    return structuredClone(this.state);
  }

  setExplorationFactor(val: number, tx?: ITransaction) {
    this.state.explorationFactor = val;
    this.markDirtyAndEmit(tx);
  }

  setSLAMode(mode: string, tx?: ITransaction) {
    if (!VALID_SLA_MODES.includes(mode as SLAMode)) {
      return;
    }
    this.state.activeSLA = mode as SLAMode;
    this.markDirtyAndEmit(tx);
  }

  setBaseWeights(weights: { ttft: number; tps: number; reliability: number }, tx?: ITransaction) {
    const clamp = (v: number, name: string) => {
      if (typeof v !== 'number' || isNaN(v)) throw new Error(`${name} must be a number`);
      return Math.max(0, Math.min(1, v));
    };
    const validated = {
      ttft: clamp(weights.ttft, 'ttft'),
      tps: clamp(weights.tps, 'tps'),
      reliability: clamp(weights.reliability, 'reliability'),
    };
    const sum = validated.ttft + validated.tps + validated.reliability;
    if (sum === 0) throw new Error('At least one weight must be > 0');

    this.state.weights.base = validated;
    this.state.weights.effective = {
      ttft: Math.max(0, validated.ttft + this.state.weights.adaptiveDelta.ttft),
      tps: Math.max(0, validated.tps + this.state.weights.adaptiveDelta.tps),
      reliability: Math.max(0, validated.reliability + this.state.weights.adaptiveDelta.reliability),
    };
    this.markDirtyAndEmit(tx);
  }

  markProviderOffline(provider: string, reason: string, tx?: ITransaction) {
    const id = provider.toLowerCase();
    const existing = this.state.providers[id];
    if (existing) {
      existing.status = 'offline';
      existing.reliability = 0;
      this.state.violations = [...this.state.violations, `Provider ${provider} marked offline: ${reason}`].slice(-50);
    }
    this.markDirtyAndEmit(tx);
  }

  resetRuntime(tx?: ITransaction) {
    const init = this.getInitialState();
    this.state.history = init.history;
    this.state.decisions = init.decisions;
    this.state.totalRequests = init.totalRequests;
    this.state.totalTokens = init.totalTokens;
    this.eventLog.length = 0;
    this.eventLogCursor = 0;
    this.eventSeq = 0;
    this.markDirtyAndEmit(tx);
  }

  resetMetrics(tx?: ITransaction) {
    const init = this.getInitialState();
    this.state.totalRequests = init.totalRequests;
    this.state.totalTokens = init.totalTokens;
    this.state.estimatedCost = init.estimatedCost;
    this.markDirtyAndEmit(tx);
  }
}
