export interface QueueTask<T = unknown> {
  id: string;
  execute: (signal?: AbortSignal) => Promise<T>;
  priority: number;
  timeout: number;
  retries: number;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  throughput1m: number;
}

interface InternalTask<T = unknown> {
  task: QueueTask<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  addedAt: number;
  abortController: AbortController;
}

export class TaskQueue {
  private queue: InternalTask[] = [];
  private running = 0;
  private completed = 0;
  private failed = 0;
  private cancelled = 0;
  private maxConcurrency: number;
  private throttleMs: number;
  private lastRun = 0;
  private throughputWindow: number[] = [];
  private processing = false;

  constructor(maxConcurrency = 4, throttleMs = 0) {
    this.maxConcurrency = maxConcurrency;
    this.throttleMs = throttleMs;
  }

  setMaxConcurrency(n: number) {
    this.maxConcurrency = Math.max(1, n);
  }

  setThrottle(ms: number) {
    this.throttleMs = Math.max(0, ms);
  }

  enqueue<T>(task: QueueTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const item = { task, resolve, reject, addedAt: Date.now(), abortController: new AbortController() } as InternalTask;
      const idx = this.queue.findIndex(i => i.task.priority < task.priority);
      if (idx === -1) this.queue.push(item); else this.queue.splice(idx, 0, item);
      this.processNext();
    });
  }

  cancel(taskId: string): boolean {
    const idx = this.queue.findIndex(i => i.task.id === taskId);
    if (idx !== -1) {
      const item = this.queue.splice(idx, 1)[0];
      item.abortController.abort();
      item.reject(new Error(`Task '${taskId}' cancelled`));
      this.cancelled++;
      return true;
    }
    return false;
  }

  private async processNext() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.running < this.maxConcurrency) {
      const now = Date.now();
      const elapsed = now - this.lastRun;
      if (elapsed < this.throttleMs) {
        await new Promise(r => setTimeout(r, this.throttleMs - elapsed));
      }

      const item = this.queue.shift();
      if (!item) break;

      this.running++;
      this.lastRun = Date.now();

      this.executeWithRetry(item).finally(() => {
        this.running--;
        this.processNext();
      });
    }

    this.processing = false;
  }

  private async executeWithRetry<T>(item: InternalTask<T>): Promise<void> {
    const { task, resolve, reject, abortController } = item;
    let lastError: unknown;

    for (let attempt = 0; attempt <= task.retries; attempt++) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeoutPromise = new Promise<T>((_, rejectTimeout) => {
          timer = setTimeout(() => rejectTimeout(new Error(`Task '${task.id}' timed out after ${task.timeout}ms`)), task.timeout);
        });
        const result = await Promise.race([task.execute(abortController.signal), timeoutPromise]);
        clearTimeout(timer);
        this.completed++;
        this.throughputWindow.push(Date.now());
        resolve(result);
        return;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        if (attempt < task.retries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 200));
        }
      }
    }

    this.failed++;
    reject(lastError);
  }

  getStats(): QueueStats {
    const now = Date.now();
    this.throughputWindow = this.throughputWindow.filter(t => now - t < 60000);
    return {
      pending: this.queue.length,
      running: this.running,
      completed: this.completed,
      failed: this.failed,
      cancelled: this.cancelled,
      throughput1m: this.throughputWindow.length,
    };
  }

  clear() {
    const remaining = this.queue.splice(0);
    for (const item of remaining) {
      item.reject(new Error('Queue cleared'));
    }
  }

  get pending(): number {
    return this.queue.length;
  }
}

export const globalTaskQueue = new TaskQueue(4, 0);
