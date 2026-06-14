import type { ILifecycle } from '../contracts/lifecycle';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('LifecycleManager');

function getHeapMB(): number {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : 0;
}

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
        LOGGER.error('LifecycleManager', `Error destroying ${entry.name}`, { error: e });
      }
    }
    this.entries = [];
    this.statuses = [];
  }

  async tryInit(name: string, fn: () => Promise<void> | void, retries = 2): Promise<boolean> {
    const maxAttempts = 1 + retries;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await fn();
        this.statuses.push({ name, status: 'ok' });
        return true;
      } catch (e) {
        if (attempt < retries) {
          LOGGER.warn('LifecycleManager', `${name} init attempt ${attempt}/${retries} failed, retrying...`);
        } else {
          const msg = e instanceof Error ? e.message : String(e);
          this.statuses.push({ name, status: 'error', error: msg });
          LOGGER.error('LifecycleManager', `${name} init failed after ${retries} attempts`, { error: e });
        }
      }
    }
    return false;
  }

  async initAllParallel(names?: string[]): Promise<boolean[]> {
    const toInit = names
      ? this.entries.filter(e => names.includes(e.name))
      : this.entries;

    // Sequential init with per-service memory deltas
    const results: boolean[] = [];
    let prevHeap = getHeapMB();

    for (const entry of toInit) {
      const ok = await this.tryInit(entry.name, () => entry.service.init());
      results.push(ok);

      const nowHeap = getHeapMB();
      const delta = nowHeap - prevHeap;
      const deltaStr = delta > 0 ? `+${delta}MB` : delta < 0 ? `${delta}MB` : '±0MB';
      LOGGER.info('LifecycleManager', `[MEM] ${entry.name}: ${nowHeap}MB total (${deltaStr})`);
      prevHeap = nowHeap;
    }

    return results;
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
