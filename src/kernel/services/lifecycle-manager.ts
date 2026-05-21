import type { ILifecycle } from '../contracts/lifecycle';

export interface InitStatus {
  name: string;
  status: 'ok' | 'error' | 'skipped';
  error?: string;
}

interface LifecycleEntry {
  name: string;
  service: ILifecycle;
}

export class LifecycleManager {
  private entries: LifecycleEntry[] = [];
  private statuses: InitStatus[] = [];

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
      await entry.service.start?.();
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
    this.entries = [];
    this.statuses = [];
  }

  async tryInit(name: string, fn: () => Promise<void> | void, retries = 2): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await fn();
        this.statuses.push({ name, status: 'ok' });
        return true;
      } catch (e) {
        if (attempt < retries) {
          console.warn(`[LifecycleManager] ${name} init attempt ${attempt}/${retries} failed, retrying...`);
        } else {
          const msg = e instanceof Error ? e.message : String(e);
          this.statuses.push({ name, status: 'error', error: msg });
          console.error(`[LifecycleManager] ${name} init failed after ${retries} attempts:`, e);
        }
      }
    }
    return false;
  }

  async initAllParallel(names?: string[]): Promise<boolean[]> {
    const toInit = names
      ? this.entries.filter(e => names.includes(e.name))
      : this.entries;
    return Promise.all(toInit.map(e => this.tryInit(e.name, () => e.service.init())));
  }

  getStatuses(): InitStatus[] {
    return this.statuses;
  }

  clearStatuses(): void {
    this.statuses = [];
  }

  getEntries(): ReadonlyArray<LifecycleEntry> {
    return this.entries;
  }
}
