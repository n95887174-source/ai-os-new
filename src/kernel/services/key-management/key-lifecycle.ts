import type { ApiKey } from '../../types/metrics-types';
import type { IRotationService } from '../../contracts/key-rotation';

export interface KeyLifecycleDeps {
  getKey: (id: string) => ApiKey | undefined;
  saveKeys: () => Promise<void>;
  notify: () => void;
  rotationService?: IRotationService;
}

export class KeyLifecycle {
  private rotationTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(private deps: KeyLifecycleDeps) {}

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
    ext.activeSLA = mode as ApiKey['stats']['extended']['activeSLA'];

    switch (mode) {
      case 'LOW_LATENCY':
        ext.rules.timeoutMs = 5000;
        ext.rules.slaThresholds.latencyP95 = 1200;
        break;
      case 'HIGH_QUALITY':
      case 'FREE_FIRST':
        ext.rules.timeoutMs = 60000;
        ext.rules.slaThresholds.latencyP95 = 5000;
        break;
      default:
        ext.rules.timeoutMs = 30000;
        ext.rules.slaThresholds.latencyP95 = 2000;
        break;
    }
  }

  async setGlobalSLA(keys: ApiKey[], mode: string, saveKeys: () => Promise<void>, notify: () => void): Promise<void> {
    keys.forEach(k => this.applySLA(k, mode));
    await saveKeys();
    notify();
  }
}
