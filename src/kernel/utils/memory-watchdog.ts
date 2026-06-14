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

import { eventBus } from '../events/event-bus';
import { EVENTS } from '../events/event-names';

export interface WatchdogOptions {
  /** How often to log (ms). Default: 5000 */
  intervalMs?: number;
  /** Heap delta (MB) to trigger warning. Default: 100 */
  thresholdMB?: number;
  /** Absolute heap threshold (MB) to trigger warning. Default: 500 */
  absoluteThresholdMB?: number;
}

export class MemoryWatchdog {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastHeapMB = 0;
  private readonly intervalMs: number;
  private readonly thresholdMB: number;
  private readonly absoluteThresholdMB: number;
  private enabled: boolean;

  constructor(opts?: WatchdogOptions) {
    this.intervalMs = opts?.intervalMs ?? 5000;
    this.thresholdMB = opts?.thresholdMB ?? 100;
    this.absoluteThresholdMB = opts?.absoluteThresholdMB ?? 500;
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

  getStats(): { currentMB: number; deltaMB: number; enabled: boolean } {
    return { currentMB: this.currentMB(), deltaMB: this.currentMB() - this.lastHeapMB, enabled: this.enabled };
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
        const msg = `heap grew ${delta.toFixed(1)}MB in ${this.intervalMs}ms (now ${current.toFixed(1)}MB)`;
        console.warn(`[OOM risk] ${msg}`);
        eventBus.emit(EVENTS.NOTIFICATION, { message: `[MemoryWatchdog] ${msg}`, type: 'warning' });
      }

      if (current > this.absoluteThresholdMB) {
        const msg = `heap at ${current.toFixed(1)}MB exceeds absolute threshold ${this.absoluteThresholdMB}MB`;
        console.warn(`[OOM risk] ${msg}`);
        eventBus.emit(EVENTS.NOTIFICATION, { message: `[MemoryWatchdog] ${msg}`, type: 'error' });
      }
    } catch {
      // performance.memory may throw in restricted contexts
    }
  }
}
