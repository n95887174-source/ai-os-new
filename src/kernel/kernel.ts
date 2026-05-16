import type { SystemState, DecisionTrace } from '../types/metrics';
import type { IKernel, KernelDeps, IProviderTracker } from './types/interfaces';

export class SystemKernel implements IKernel {
  private state: SystemState = this.getInitialState();
  private eventLog: { type: string; payload: unknown; timestamp: number }[] = [];
  private isDirty = false;
  private unsubs: Array<() => void> = [];
  private saveInterval: ReturnType<typeof setInterval> | null = null;
  private deps: KernelDeps;

  constructor(deps: KernelDeps) {
    this.deps = deps;
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  async init() {
    this.setupListeners();
    await this.loadFromStorage();
    if (!this.saveInterval) {
      this.saveInterval = setInterval(() => {
        if (this.isDirty) this.saveToStorage();
      }, 10000);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToStorage();
      });
    }
  }

  private async loadFromStorage() {
    try {
      const saved = await this.deps.database.getKv<string>('super_agents_kernel_state');
      if (saved) {
        this.loadState(saved);
      }
    } catch (e) {
      console.error('[Kernel] Failed to load state from DB', e);
    }
  }

  private saveToStorage() {
    this.deps.database.setKv('super_agents_kernel_state', this.dumpState()).catch(e => console.warn('[Kernel] Failed to persist state:', e));
    this.isDirty = false;
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
      this.deps.eventBus.on('router:signal', (data) => this.reduce('LEARNING_SIGNAL', data))
    );
  }

  private get tracker(): IProviderTracker {
    return this.deps.providerTracker!;
  }

  private reduce(type: string, payload: unknown) {
    this.eventLog.push({ type, payload, timestamp: Date.now() });
    if (this.eventLog.length > 500) this.eventLog.shift();

    switch (type) {
      case 'METRIC_UPDATE':
        this.tracker.updateProviderMetric(this.state, payload as Parameters<IProviderTracker['updateProviderMetric']>[1]);
        break;
      case 'METRIC_ERROR':
        this.tracker.updateProviderError(this.state, payload as { provider: string });
        break;
      case 'DECISION_MADE':
        this.state.decisions = [payload as DecisionTrace, ...this.state.decisions].slice(0, 50);
        this.tracker.calculateSelectionRates(this.state);
        break;
      case 'LEARNING_SIGNAL':
        this.updateAdaptiveWeights(payload as { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number });
        break;
    }

    this.isDirty = true;
    this.deps.eventBus.emit('kernel:updated', this.state);
  }

  private updateAdaptiveWeights(signal: { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number }) {
    const delta = this.state.weights.adaptiveDelta;
    if (signal.success) {
      delta.reliability = Math.min(0.3, delta.reliability + 0.02);
      if (signal.ttft !== undefined && signal.ttft < 1000) delta.ttft = Math.min(0.3, delta.ttft + 0.01);
      if (signal.wasRaceWinner) delta.ttft = Math.min(0.3, delta.ttft + 0.03);
    } else {
      delta.reliability = Math.max(-0.3, delta.reliability - 0.05);
      if (signal.wasFallback) delta.reliability = Math.max(-0.3, delta.reliability - 0.02);
    }
    this.state.weights.effective = {
      ttft: Math.max(0, this.state.weights.base.ttft + delta.ttft),
      tps: Math.max(0, this.state.weights.base.tps + delta.tps),
      reliability: Math.max(0, this.state.weights.base.reliability + delta.reliability),
    };
  }

  dumpState() { return JSON.stringify({ state: this.state, eventLog: this.eventLog, version: '2.1.0-safety' }, null, 2); }

  loadState(json: string) {
    try {
      const data = JSON.parse(json);
      const merged = { ...this.getInitialState(), ...data.state };
      this.state = merged as SystemState;
      this.eventLog = data.eventLog || [];
      this.deps.eventBus.emit('kernel:updated', this.state);
    } catch (e) { console.error('[Kernel] Load failed:', e); }
  }

  getState() { return this.state; }

  setExplorationFactor(val: number) {
    this.isDirty = true;
    this.deps.eventBus.emit('kernel:updated', this.state);
  }

  setSLAMode(mode: string) {
    this.state.activeSLA = mode as SystemState['activeSLA'];
    this.isDirty = true;
    this.deps.eventBus.emit('kernel:updated', this.state);
  }

  setBaseWeights(weights: { ttft: number; tps: number; reliability: number }) {
    this.state.weights.base = weights;
    this.state.weights.effective = {
      ttft: Math.max(0, weights.ttft + this.state.weights.adaptiveDelta.ttft),
      tps: Math.max(0, weights.tps + this.state.weights.adaptiveDelta.tps),
      reliability: Math.max(0, weights.reliability + this.state.weights.adaptiveDelta.reliability),
    };
    this.isDirty = true;
    this.deps.eventBus.emit('kernel:updated', this.state);
  }

  markProviderOffline(provider: string, reason: string) {
    const id = provider.toLowerCase();
    const existing = this.state.providers[id];
    if (existing) {
      existing.status = 'offline';
      existing.reliability = 0;
      this.state.violations = [...this.state.violations, `Provider ${provider} marked offline: ${reason}`].slice(-50);
    }
    this.isDirty = true;
    this.deps.eventBus.emit('kernel:updated', this.state);
  }

  resetRuntime() {
    const init = this.getInitialState();
    this.state.history = init.history;
    this.state.decisions = init.decisions;
    this.state.totalRequests = init.totalRequests;
    this.state.totalTokens = init.totalTokens;
    this.eventLog = [];
    this.isDirty = true;
    this.deps.eventBus.emit('kernel:updated', this.state);
  }

  resetMetrics() {
    const init = this.getInitialState();
    this.state.totalRequests = init.totalRequests;
    this.state.totalTokens = init.totalTokens;
    this.state.estimatedCost = init.estimatedCost;
    this.isDirty = true;
    this.deps.eventBus.emit('kernel:updated', this.state);
  }
}
