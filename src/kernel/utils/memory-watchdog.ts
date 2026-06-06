/**
 * Lightweight memory watchdog — logs heap usage every N seconds.
 * Warns if heap grows more than a threshold within the interval.
 *
 * Usage:
 *   import { MemoryWatchdog } from '../utils/memory-watchdog';
 *   const watchdog = new MemoryWatchdog({ intervalMs: 5000, thresholdMB: 100 });
 *   watchdog.start();
 *   // later: watchdog.stop();
 */

export interface WatchdogOptions {
  /** How often to log (ms). Default: 5000 */
  intervalMs?: number;
  /** Heap delta (MB) to trigger warning. Default: 100 */
  thresholdMB?: number;
}

export class MemoryWatchdog {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastHeapMB = 0;
  private readonly intervalMs: number;
  private readonly thresholdMB: number;
  private enabled: boolean;

  constructor(opts?: WatchdogOptions) {
    this.intervalMs = opts?.intervalMs ?? 5000;
    this.thresholdMB = opts?.thresholdMB ?? 100;
    this.enabled = typeof performance !== 'undefined' && 'memory' in performance;
  }

  start(): void {
    if (!this.enabled || this.timer) return;
    this.lastHeapMB = this.currentMB();
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private currentMB(): number {
    if (!this.enabled) return 0;
    const mem = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
    return mem.usedJSHeapSize / (1024 * 1024);
  }

  private tick(): void {
    try {
      const current = this.currentMB();
      const delta = current - this.lastHeapMB;
      this.lastHeapMB = current;

      console.debug(
        `[MemWatch] heap=${current.toFixed(1)}MB delta=${delta >= 0 ? '+' : ''}${delta.toFixed(1)}MB`,
      );

      if (delta > this.thresholdMB) {
        console.warn(
          `[OOM risk] heap grew ${delta.toFixed(1)}MB in ${this.intervalMs}ms (now ${current.toFixed(1)}MB)`,
        );
      }
    } catch {
      // performance.memory may throw in restricted contexts
    }
  }
}
