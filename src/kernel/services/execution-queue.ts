import { EventBus, EVENTS } from '../events/event-bus';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('ExecutionQueue');

export type QueuePriority = 'critical' | 'high' | 'normal' | 'low' | 'background';


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
  private totalEnqueued = 0;
  private totalProcessed = 0;
  private totalErrors = 0;

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
    this.totalEnqueued++;
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
      this.processor(task)
        .then(() => {
          this.totalProcessed++;
        })
        .catch((err) => {
          this.totalErrors++;
          LOGGER.error('ExecutionQueue', 'Task failed', { taskId: task.id, priority: task.priority, age: Date.now() - task.enqueuedAt, error: err });
          EventBus.emit(EVENTS.QUEUE_TASK_FAILED, { taskId: task.id, priority: task.priority, error: String(err), timestamp: Date.now() });
        })
        .finally(() => {
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

  getStats() {
    return {
      pending: this.pending,
      active: this.inFlight,
      totalEnqueued: this.totalEnqueued,
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors,
    };
  }

  getQueuedTasks(): { id: string; priority: QueuePriority; age: number }[] {
    const now = Date.now();
    return Object.entries(this.queues).flatMap(([_p, tasks]) =>
      tasks.map(t => ({ id: t.id, priority: t.priority, age: now - t.enqueuedAt }))
    );
  }

  clear() {
    for (const q of Object.values(this.queues)) q.length = 0;
  }
}
