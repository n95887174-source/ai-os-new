import { CONFIG } from './config-registry';
import type { ILifecycle } from '../contracts/lifecycle';

export interface WarmupServiceDeps {
  eventBus: { emit: (event: string, data?: unknown) => void };
}

export class WarmupService implements ILifecycle {
  private timer: ReturnType<typeof setInterval> | null = null;
  private deps: WarmupServiceDeps;
  private active = false;

  constructor(deps: WarmupServiceDeps) {
    this.deps = deps;
  }

  init() {
    const cfg = CONFIG?.services?.warmup;
    if (!cfg?.enabled) return;
    this.active = true;
    this.timer = setInterval(() => this.probe(), cfg.probeIntervalMs);
    if (this.timer && typeof this.timer !== 'number') {
      setTimeout(() => this.probe(), 5000);
    }
  }

  destroy() {
    this.active = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private async probe() {
    if (!this.active) return;
    this.deps.eventBus.emit('key:health:check:all');
  }
}
