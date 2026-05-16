import type { ILifecycle } from '../contracts/lifecycle';

interface LifecycleEntry {
  name: string;
  service: ILifecycle;
}

export class LifecycleManager {
  private entries: LifecycleEntry[] = [];

  register(name: string, service: ILifecycle): void {
    if (this.entries.some(e => e.name === name)) return;
    this.entries.push({ name, service });
  }

  async initAll(): Promise<void> {
    for (const entry of this.entries) {
      await entry.service.init();
    }
  }

  async startAll(): Promise<void> {
    for (const entry of this.entries) {
      await entry.service.start();
    }
  }

  async shutdown(): Promise<void> {
    for (const entry of this.entries.slice().reverse()) {
      try {
        await entry.service.destroy();
      } catch (e) {
        console.warn(`[LifecycleManager] Error destroying ${entry.name}:`, e);
      }
    }
  }

  getEntries(): ReadonlyArray<LifecycleEntry> {
    return this.entries;
  }
}
