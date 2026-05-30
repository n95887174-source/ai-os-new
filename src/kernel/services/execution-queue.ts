import { EVENTS } from '../events/event-names';

export type QueuePriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

const PRIORITY_ORDER: Record<QueuePriority, number> = {
  critical: 0, high: 1, normal: 2, low: 3, background: 4,
};

interface QueueTask {
  id: string;
  priority: QueuePriority;
  payload: unknown;
  enqueuedAt: number;
}

export class ExecutionQueue {
  private queues: Record<QueuePriority, QueueTask[]> = {
    critical: [], high: [], normal: [], low: [], background: [],
  };
  private inFlight = 0;
  private maxConcurrency: number;
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;
  private processor: (task: QueueTask) => Promise<void>;

  constructor(
    processor: (task: QueueTask) => Promise<void>,
    maxConcurrency = 3,
  ) {
    this.processor = processor;
    this.maxConcurrency = maxConcurrency;
  }

  enqueue(priority: QueuePriority, payload: unknown): string {
    const id = `q-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;
    this.queues[priority].push({ id, priority, payload, enqueuedAt: Date.now() });
    this.schedule();
    return id;
  }

  private schedule() {
    if (this.schedulerTimer) return;
    this.schedulerTimer = setTimeout(() => {
      this.schedulerTimer = null;
      this.drain();
    }, 0);
  }

  private drain() {
    while (this.inFlight < this.maxConcurrency) {
      const task = this.dequeueHighest();
      if (!task) break;
      this.inFlight++;
      this.processor(task).finally(() => {
        this.inFlight--;
        this.drain();
      });
    }
  }

  private dequeueHighest(): QueueTask | undefined {
    for (const level of ['critical', 'high', 'normal', 'low', 'background'] as QueuePriority[]) {
      if (this.queues[level].length > 0) return this.queues[level].shift();
    }
    return undefined;
  }

  get pending(): number {
    return Object.values(this.queues).reduce((sum, q) => sum + q.length, 0);
  }

  get active(): number {
    return this.inFlight;
  }

  getQueuedTasks(): { id: string; priority: QueuePriority; age: number }[] {
    const now = Date.now();
    return Object.entries(this.queues).flatMap(([p, tasks]) =>
      tasks.map(t => ({ id: t.id, priority: t.priority, age: now - t.enqueuedAt }))
    );
  }

  clear() {
    for (const q of Object.values(this.queues)) q.length = 0;
  }
}
