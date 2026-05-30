import type { ApiKey } from '../../types/metrics-types';
import type { IRotationService } from '../../contracts/key-rotation';
import { CONFIG } from '../config-registry';

export type LifecycleState = 'active' | 'probation' | 'degraded' | 'quarantined' | 'recovering';

export interface LifecycleTransition {
  from: LifecycleState;
  to: LifecycleState;
  reason: string;
  timestamp: number;
}

export interface LifecycleConfig {
  probationErrorThreshold: number;
  degradedErrorThreshold: number;
  quarantineErrorThreshold: number;
  recoverySuccessCount: number;
  recoveryCheckIntervalMs: number;
  autoRecoveryEnabled: boolean;
}

const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  probationErrorThreshold: 2,
  degradedErrorThreshold: 5,
  quarantineErrorThreshold: 10,
  recoverySuccessCount: 3,
  recoveryCheckIntervalMs: 60000,
  autoRecoveryEnabled: true,
};

export interface KeyLifecycleDeps {
  getKey: (id: string) => ApiKey | undefined;
  saveKeys: () => Promise<void>;
  notify: () => void;
  rotationService?: IRotationService;
}

export class KeyLifecycle {
  private rotationTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private lifecycleStates = new Map<string, LifecycleState>();
  private transitions: LifecycleTransition[] = [];
  private errorCounters = new Map<string, number>();
  private successCounters = new Map<string, number>();
  private config: LifecycleConfig;
  private recoveryTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private deps: KeyLifecycleDeps, config?: Partial<LifecycleConfig>) {
    this.config = { ...DEFAULT_LIFECYCLE_CONFIG, ...config };
  }

  setKeyTTL(id: string, ttlHours: number, autoRotate = false): void {
    if (this.deps.rotationService) {
      this.deps.rotationService.setKeyTTL(id, ttlHours, autoRotate);
    }
  }

  clearKeyTTL(id: string): void {
    if (this.deps.rotationService) {
      this.deps.rotationService.setKeyTTL(id, 0);
    }
  }

  async requestKeyRotation(id: string): Promise<boolean> {
    return this.deps.rotationService?.rotateNow(id) ?? false;
  }

  applySLA(key: ApiKey, mode: string): void {
    if (!key.stats?.extended) return;
    const ext = key.stats.extended;
    ext.activeSLA = mode as NonNullable<ApiKey['stats']['extended']>['activeSLA'];

    const profile = CONFIG.keys.slaProfiles[mode] ?? CONFIG.keys.slaProfiles.DEFAULT;
    ext.rules.timeoutMs = profile.timeoutMs;
    ext.rules.slaThresholds.latencyP95 = profile.latencyP95;
  }

  async setGlobalSLA(keys: ApiKey[], mode: string, saveKeys: () => Promise<void>, notify: () => void): Promise<void> {
    keys.forEach(k => this.applySLA(k, mode));
    await saveKeys();
    notify();
  }

  startAutoRecovery(): void {
    if (!this.config.autoRecoveryEnabled || this.recoveryTimer) return;
    this.recoveryTimer = setInterval(() => this.checkRecovery(), this.config.recoveryCheckIntervalMs);
  }

  stopAutoRecovery(): void {
    if (this.recoveryTimer) { clearInterval(this.recoveryTimer); this.recoveryTimer = null; }
  }

  onError(id: string): LifecycleState {
    const current = this.lifecycleStates.get(id) || 'active';
    const errors = (this.errorCounters.get(id) || 0) + 1;
    this.errorCounters.set(id, errors);
    this.successCounters.delete(id);

    let next: LifecycleState = current;
    if (errors >= this.config.quarantineErrorThreshold) next = 'quarantined';
    else if (errors >= this.config.degradedErrorThreshold) next = 'degraded';
    else if (errors >= this.config.probationErrorThreshold) next = 'probation';

    if (next !== current) {
      this.transition(id, current, next, `Error count ${errors}/${this.config.quarantineErrorThreshold}`);
    }
    return next;
  }

  onSuccess(id: string): LifecycleState {
    const current = this.lifecycleStates.get(id) || 'active';
    if (current === 'active' || current === 'recovering') {
      const successes = (this.successCounters.get(id) || 0) + 1;
      this.successCounters.set(id, successes);
      if (current === 'recovering' && successes >= this.config.recoverySuccessCount) {
        this.transition(id, 'recovering', 'active', `Recovery: ${successes} consecutive successes`);
        this.errorCounters.delete(id);
      }
      return current;
    }

    this.successCounters.set(id, (this.successCounters.get(id) || 0) + 1);
    return current;
  }

  getState(id: string): LifecycleState {
    return this.lifecycleStates.get(id) || 'active';
  }

  getTransitions(id?: string): LifecycleTransition[] {
    return id ? this.transitions.filter(t => t.from === id || t.to === id) : [...this.transitions];
  }

  isRoutable(state: LifecycleState): boolean {
    return state !== 'quarantined';
  }

  getWeightMultiplier(state: LifecycleState): number {
    switch (state) {
      case 'active': return 1;
      case 'probation': return 0.7;
      case 'degraded': return 0.4;
      case 'recovering': return 0.5;
      case 'quarantined': return 0;
    }
  }

  destroy(): void {
    this.stopAutoRecovery();
    this.rotationTimers.forEach(t => clearTimeout(t));
    this.rotationTimers.clear();
    this.lifecycleStates.clear();
    this.transitions = [];
    this.errorCounters.clear();
    this.successCounters.clear();
  }

  private transition(id: string, from: LifecycleState, to: LifecycleState, reason: string): void {
    const timestamp = Date.now();
    this.lifecycleStates.set(id, to);
    this.transitions.push({ from, to, reason, timestamp });
    if (this.transitions.length > 100) this.transitions.shift();
  }

  private checkRecovery(): void {
    for (const [id, state] of this.lifecycleStates) {
      if (state === 'quarantined' || state === 'degraded') {
        const errors = this.errorCounters.get(id) || 0;
        if (state === 'quarantined' && errors < this.config.quarantineErrorThreshold * 0.5) {
          this.transition(id, state, 'recovering', 'Auto: error rate dropped');
        } else if (state === 'degraded' && errors < this.config.degradedErrorThreshold * 0.5) {
          this.transition(id, 'degraded', 'probation', 'Auto: error rate improving');
        }
      }
    }
  }
}
