import { eventBus } from './events';
import type { SystemState, DecisionTrace } from '../types/metrics';
import { updateProviderMetric, updateProviderError, calculateSelectionRates } from './ProviderTracker';
import { updateAdaptiveWeights, setSLAMode as applySLAMode, setExplorationFactor as applyExploration, recalculateEffectiveWeights } from './WeightOptimizer';
import { enforceSafetyContract } from './SafetyContract';
import { SystemStateSchema } from '../types/schemas';
import { db } from './DatabaseService';

class SystemKernel {
  private state: SystemState = this.getInitialState();
  private eventLog: { type: string; payload: unknown; timestamp: number }[] = [];
  private isDirty = false;
  private unsubs: Array<() => void> = [];
  private saveInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupListeners();
    this.saveInterval = setInterval(() => {
      if (this.isDirty) this.saveToStorage();
    }, 10000);
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
    await this.loadFromStorage();
  }

  private async loadFromStorage() {
    try {
      const saved = await db.getKv<string>('super_agents_kernel_state');
      if (saved) {
        this.loadState(saved);
      }
    } catch (e) {
      console.error('[Kernel] Failed to load state from DB', e);
    }
  }

  private saveToStorage() {
    db.setKv('super_agents_kernel_state', this.dumpState()).catch(e => console.error(e));
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
      eventBus.on('chat:stream:end', (data) => this.reduce('METRIC_UPDATE', data)),
      eventBus.on('chat:stream:error', (data) => this.reduce('METRIC_ERROR', data)),
      eventBus.on('system:decision', (data) => this.reduce('DECISION_MADE', data)),
      eventBus.on('router:signal', (data) => this.reduce('LEARNING_SIGNAL', data))
    );
  }

  private reduce(type: string, payload: unknown) {
    this.eventLog.push({ type, payload, timestamp: Date.now() });
    if (this.eventLog.length > 500) this.eventLog.shift();

    switch (type) {
      case 'METRIC_UPDATE':
        updateProviderMetric(this.state, payload as { provider: string; tokens?: number; fullContent?: string; latency: number; ttft?: number; model?: string });
        break;
      case 'METRIC_ERROR':
        updateProviderError(this.state, payload as { provider: string });
        break;
      case 'DECISION_MADE':
        this.state.decisions = [payload as DecisionTrace, ...this.state.decisions].slice(0, 50);
        calculateSelectionRates(this.state);
        break;
      case 'LEARNING_SIGNAL':
        updateAdaptiveWeights(this.state, payload as { provider: string; success: boolean; wasRaceWinner: boolean; wasFallback: boolean; ttft?: number });
        break;
    }

    enforceSafetyContract(this.state);
    this.isDirty = true;
    eventBus.emit('kernel:updated', this.state);
  }

  dumpState() { return JSON.stringify({ state: this.state, eventLog: this.eventLog, version: '2.1.0-safety' }, null, 2); }
  loadState(json: string) {
    try {
      const data = JSON.parse(json);
      const merged = { ...this.getInitialState(), ...data.state };
      this.state = SystemStateSchema.parse(merged) as SystemState;
      this.eventLog = data.eventLog || [];
      eventBus.emit('kernel:updated', this.state);
    } catch (e) { console.error('[Kernel] Load or validation failed:', e); }
  }
  getState() { return this.state; }

  setExplorationFactor(val: number) {
    applyExploration(this.state, val);
    this.isDirty = true;
    eventBus.emit('kernel:updated', this.state);
  }

  setSLAMode(mode: string) {
    applySLAMode(this.state, mode);
    this.isDirty = true;
    eventBus.emit('kernel:updated', this.state);
  }

  setBaseWeights(weights: { ttft: number; tps: number; reliability: number }) {
    this.state.weights.base = weights;
    recalculateEffectiveWeights(this.state);
    this.isDirty = true;
    eventBus.emit('kernel:updated', this.state);
  }
}

export const kernel = new SystemKernel();
