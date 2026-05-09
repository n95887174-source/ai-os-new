import { eventBus } from './events';
import type { 
  ProviderState, 
  SystemState,
  SLAMode
} from '../types/metrics';

class SystemKernel {
  private state: SystemState = this.getInitialState();
  private readonly ALPHA = 0.15;
  private readonly MAX_DRIFT = 0.15;
  private readonly RELIABILITY_FLOOR = 0.4; // Safety invariant
  private eventLog: any[] = [];
  private isDirty = false;

  constructor() {
    this.loadFromStorage();
    this.setupListeners();
    
    // Auto-save every 10 seconds if dirty
    setInterval(() => {
      if (this.isDirty) this.saveToStorage();
    }, 10000);
  }

  private loadFromStorage() {
    const saved = localStorage.getItem('super_agents_kernel_state');
    if (saved) {
      this.loadState(saved);
    }
  }

  private saveToStorage() {
    localStorage.setItem('super_agents_kernel_state', this.dumpState());
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
    eventBus.on('chat:stream:end', (data) => this.reduce('METRIC_UPDATE', data));
    eventBus.on('chat:stream:error', (data) => this.reduce('METRIC_ERROR', data));
    eventBus.on('system:decision', (data) => this.reduce('DECISION_MADE', data));
    eventBus.on('router:signal', (data) => this.reduce('LEARNING_SIGNAL', data));
  }

  private reduce(type: string, payload: any) {
    this.eventLog.push({ type, payload, timestamp: Date.now() });
    if (this.eventLog.length > 500) this.eventLog.shift(); // Fix Bug #13
    const nextState = { ...this.state };

    switch (type) {
      case 'METRIC_UPDATE':
        this.updateProviderMetric(nextState, payload);
        break;
      case 'METRIC_ERROR':
        this.updateProviderError(nextState, payload);
        break;
      case 'DECISION_MADE':
        nextState.decisions = [payload, ...nextState.decisions].slice(0, 50);
        this.calculateSelectionRates(nextState);
        break;
      case 'LEARNING_SIGNAL':
        this.updateAdaptiveWeights(nextState, payload);
        break;
    }

    // ENFORCE SYSTEM INVARIANTS (The Safety Contract)
    this.enforceSafetyContract(nextState);

    this.state = nextState;
    this.isDirty = true;
    eventBus.emit('kernel:updated', this.state);
  }

  private enforceSafetyContract(state: SystemState) {
    const violations: string[] = [];

    // 1. Reliability Floor Contract
    Object.values(state.providers).forEach(p => {
      if (p.reliability < this.RELIABILITY_FLOOR && p.status !== 'offline') {
        p.status = 'offline';
        violations.push(`Provider ${p.id} breached reliability floor (${p.reliability.toFixed(2)})`);
      }
    });

    // 2. Weight Sum Invariant
    const sum = state.weights.effective.ttft + state.weights.effective.tps + state.weights.effective.reliability;
    if (Math.abs(sum - 1.0) > 0.001) {
      violations.push(`Weight sum invariant breached: ${sum.toFixed(4)}`);
      // Auto-fix
      const norm = 1.0 / sum;
      state.weights.effective.ttft *= norm;
      state.weights.effective.tps *= norm;
      state.weights.effective.reliability *= norm;
    }

    // 3. Adaptive Drift Boundary
    const d = state.weights.adaptiveDelta;
    if (Math.abs(d.ttft) > this.MAX_DRIFT || Math.abs(d.reliability) > this.MAX_DRIFT) {
      violations.push(`Adaptive drift boundary exceeded. Clamping.`);
      d.ttft = Math.max(-this.MAX_DRIFT, Math.min(this.MAX_DRIFT, d.ttft));
      d.reliability = Math.max(-this.MAX_DRIFT, Math.min(this.MAX_DRIFT, d.reliability));
    }

    if (violations.length > 0) {
      state.violations = [...state.violations, ...violations].slice(-20);
      violations.forEach(v => console.warn(`[Kernel Safety] ${v}`));
    }
  }

  private updateProviderMetric(state: SystemState, data: any) {
    const p = data.provider.toLowerCase();
    const prev = state.providers[p] || this.getDefaultProvider(data.provider);
    const tokens = Math.ceil(data.fullContent.length / 4);
    const genTime = (data.latency - (data.ttft || 0)) / 1000;
    const currentTPS = genTime > 0 ? tokens / genTime : prev.avgTPS;

    prev.avgTTFT = data.ttft ? (this.ALPHA * data.ttft) + (1 - this.ALPHA) * prev.avgTTFT : prev.avgTTFT;
    prev.avgTPS = (this.ALPHA * currentTPS) + (1 - this.ALPHA) * prev.avgTPS;
    prev.reliability = (this.ALPHA * 1) + (1 - this.ALPHA) * prev.reliability;
    
    // Advanced stability tracking
    prev.stabilityIndex = Math.min(1.0, (this.ALPHA * 1.0) + (1 - this.ALPHA) * prev.stabilityIndex);
    prev.reputationScore = Math.min(100, (this.ALPHA * 100) + (1 - this.ALPHA) * prev.reputationScore);
    
    prev.status = prev.reliability > 0.8 ? 'healthy' : prev.reliability > 0.4 ? 'degraded' : 'offline';
    prev.totalRequests++;
    state.providers[p] = { ...prev };
    state.totalRequests++;
    state.totalTokens += tokens;
    
    // More accurate cost estimation (based on real pricing for popular models)
    const model = (data.model || '').toLowerCase();
    let costPerMillion = 1.0; // default $1/1M
    if (model.includes('gpt-4o')) costPerMillion = 5.0;
    if (model.includes('gpt-4o-mini')) costPerMillion = 0.15;
    if (model.includes('gemini-2.0-flash')) costPerMillion = 0.10;
    if (model.includes('llama-3.3-70b')) costPerMillion = 0.60;
    if (model.includes('claude-3-5-sonnet')) costPerMillion = 3.0;

    state.estimatedCost += (tokens / 1000000) * costPerMillion;

    // Update history
    const now = Date.now();
    state.history.push({ timestamp: now, ttft: prev.avgTTFT, tps: prev.avgTPS, reliability: prev.reliability });
    if (state.history.length > 100) state.history.shift();
  }

  private updateProviderError(state: SystemState, data: any) {
    const p = data.provider.toLowerCase();
    const prev = state.providers[p] || this.getDefaultProvider(data.provider);
    prev.reliability = (this.ALPHA * 0) + (1 - this.ALPHA) * prev.reliability;
    
    // Penalize stability and reputation
    prev.stabilityIndex = Math.max(0, (this.ALPHA * 0) + (1 - this.ALPHA) * prev.stabilityIndex);
    prev.reputationScore = Math.max(0, (this.ALPHA * 0) + (1 - this.ALPHA) * prev.reputationScore);
    
    prev.totalRequests++;
    state.providers[p] = { ...prev };
    state.totalRequests++; // Fix Bug #28
  }

  private updateAdaptiveWeights(state: SystemState, signal: any) {
    const d = state.weights.adaptiveDelta;
    const rate = 0.005;
    if (signal.wasRaceWinner) { d.ttft += rate; d.reliability -= rate / 2; }
    if (signal.wasFallback || !signal.success) { d.reliability += rate * 2; d.ttft -= rate * 2; }
    
    state.weights.adaptiveDelta = { ...d };
    const combined = {
      ttft: state.weights.base.ttft + d.ttft,
      tps: state.weights.base.tps + d.tps,
      reliability: state.weights.base.reliability + d.reliability
    };
    const sum = combined.ttft + combined.tps + combined.reliability;
    state.weights.effective = { ttft: combined.ttft / sum, tps: combined.tps / sum, reliability: combined.reliability / sum };
  }

  private calculateSelectionRates(state: SystemState) {
    const counts: Record<string, number> = {};
    state.decisions.forEach(d => { counts[d.selected] = (counts[d.selected] || 0) + 1; });
    const total = state.decisions.length;
    Object.keys(state.providers).forEach(p => { state.providers[p].selectionRate = (counts[p] || 0) / total; });
  }

  private getDefaultProvider(id: string): ProviderState {
    return { 
      id, 
      avgTTFT: 800, 
      avgTPS: 20, 
      reliability: 1, 
      stabilityIndex: 1.0,
      reputationScore: 100,
      totalRequests: 0, 
      selectionRate: 0, 
      status: 'healthy' 
    };
  }

  dumpState() { return JSON.stringify({ state: this.state, eventLog: this.eventLog, version: '2.1.0-safety' }, null, 2); }
  loadState(json: string) {
    try {
      const data = JSON.parse(json);
      // Merge with initial state to ensure new fields are present
      this.state = { ...this.getInitialState(), ...data.state };
      this.eventLog = data.eventLog || [];
      eventBus.emit('kernel:updated', this.state);
    } catch (e) { console.error('[Kernel] Load failed:', e); }
  }
  getState() { return this.state; }
  
  setExplorationFactor(val: number) {
    this.state.explorationFactor = val;
    this.isDirty = true;
    eventBus.emit('kernel:updated', this.state);
  }

  setSLAMode(mode: string) {
    this.state.activeSLA = mode as SLAMode;
    
    // Adjust base weights based on SLA
    const weights: Record<string, { ttft: number; tps: number; reliability: number }> = {
      'LOW_LATENCY': { ttft: 0.7, tps: 0.1, reliability: 0.2 },
      'HIGH_QUALITY': { ttft: 0.1, tps: 0.2, reliability: 0.7 },
      'BALANCED': { ttft: 0.4, tps: 0.2, reliability: 0.4 },
      'ECONOMY': { ttft: 0.2, tps: 0.6, reliability: 0.2 }
    };

    if (weights[mode]) {
      this.state.weights.base = weights[mode];
      // Recalculate effective weights immediately
      const d = this.state.weights.adaptiveDelta;
      const combined = {
        ttft: this.state.weights.base.ttft + d.ttft,
        tps: this.state.weights.base.tps + d.tps,
        reliability: this.state.weights.base.reliability + d.reliability
      };
      const sum = Math.max(0.01, combined.ttft + combined.tps + combined.reliability);
      this.state.weights.effective = { ttft: combined.ttft / sum, tps: combined.tps / sum, reliability: combined.reliability / sum };
    }

    this.isDirty = true;
    eventBus.emit('kernel:updated', this.state);
  }
}

export const kernel = new SystemKernel();
