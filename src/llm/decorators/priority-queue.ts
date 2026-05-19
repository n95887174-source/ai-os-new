import type { LLMProviderAdapter, ChatMessage, ProviderResponse, HealthCheckResult } from '../core/types';

export type Priority = 'high' | 'normal' | 'low';

interface QueueItem {
  messages: ChatMessage[];
  model: string;
  apiKey: string;
  signal?: AbortSignal;
  priority: Priority;
  resolve: (value: ProviderResponse) => void;
  reject: (reason: unknown) => void;
}

interface StreamQueueItem {
  messages: ChatMessage[];
  model: string;
  apiKey: string;
  onChunk: (chunk: string, meta?: unknown) => void;
  signal?: AbortSignal;
  priority: Priority;
  resolve: () => void;
  reject: (reason: unknown) => void;
}

export interface PriorityQueueConfig {
  maxConcurrency: number;
  lowPriorityDelayMs: number;
}

const DEFAULT_CONFIG: PriorityQueueConfig = {
  maxConcurrency: 4,
  lowPriorityDelayMs: 200,
};

export class PriorityQueueDecorator implements LLMProviderAdapter {
  private config: PriorityQueueConfig;
  private sendQueue: QueueItem[] = [];
  private streamQueue: StreamQueueItem[] = [];
  private activeSends = 0;
  private activeStreams = 0;
  private highPriorityStreak = 0;

  readonly #inner: LLMProviderAdapter;

  constructor(
    inner: LLMProviderAdapter,
    config?: Partial<PriorityQueueConfig>,
  ) {
    this.#inner = inner;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get id(): string {
    return `${this.#inner.id}[pq]`;
  }

  private processSendQueue(): void {
    if (this.activeSends >= this.config.maxConcurrency || this.sendQueue.length === 0) return;

    const order: Priority[] = ['high', 'normal', 'low'];
    
    // Предотвращение голодания: если мы отправили 3 high-priority подряд, 
    // принудительно проверяем нормальный приоритет
    const effectiveOrder = (this.highPriorityStreak >= 3 && this.sendQueue.some(q => q.priority === 'normal'))
      ? ['normal', 'high', 'low'] as Priority[]
      : order;

    for (const p of order) {
      const availableItems = this.sendQueue.filter(q => q.priority === p);
      if (availableItems.length === 0) continue;

      if (this.#inner.batchSendMessage && availableItems.length > 1) {
        // Dynamic Batching
        const batchSize = Math.min(availableItems.length, this.config.maxConcurrency - this.activeSends);
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
          const idx = this.sendQueue.indexOf(availableItems[i]);
          batch.push(this.sendQueue.splice(idx, 1)[0]);
        }
        this.activeSends += batch.length;
        if (p === 'high') this.highPriorityStreak += batch.length; else this.highPriorityStreak = 0;
        this.executeSendBatch(batch);
        return;
      }

      // Single item sending
      const idx = this.sendQueue.indexOf(availableItems[0]);
      const item = this.sendQueue.splice(idx, 1)[0];
      this.activeSends++;
      if (p === 'high') this.highPriorityStreak++; else this.highPriorityStreak = 0;
      this.executeSend(item);
      return;
    }
  }

  private async executeSend(item: QueueItem): Promise<void> {
    try {
      const res = await this.#inner.sendMessage(item.messages, item.model, item.apiKey, item.signal);
      item.resolve(res);
    } catch (e) {
      item.reject(e);
    } finally {
      this.activeSends--;
      this.processSendQueue();
    }
  }

  private async executeSendBatch(batch: QueueItem[]): Promise<void> {
    try {
      const results = await this.#inner.batchSendMessage!(batch);
      batch.forEach((item, index) => item.resolve(results[index]));
    } catch (e) {
      batch.forEach(item => item.reject(e));
    } finally {
      this.activeSends -= batch.length;
      this.processSendQueue();
    }
  }

  private processStreamQueue(): void {
    if (this.activeStreams >= this.config.maxConcurrency || this.streamQueue.length === 0) return;

    const order: Priority[] = ['high', 'normal', 'low'];
    for (const p of order) {
      const availableItems = this.streamQueue.filter(q => q.priority === p);
      if (availableItems.length === 0) continue;

      if (this.#inner.batchStreamMessage && availableItems.length > 1) {
        // Dynamic Batching
        const batchSize = Math.min(availableItems.length, this.config.maxConcurrency - this.activeStreams);
        const batch = [];
        for (let i = 0; i < batchSize; i++) {
          const idx = this.streamQueue.indexOf(availableItems[i]);
          batch.push(this.streamQueue.splice(idx, 1)[0]);
        }
        this.activeStreams += batch.length;
        this.executeStreamBatch(batch);
        return;
      }

      // Single item stream
      const idx = this.streamQueue.indexOf(availableItems[0]);
      const item = this.streamQueue.splice(idx, 1)[0];
      this.activeStreams++;
      this.executeStream(item);
      return;
    }
  }

  private async executeStream(item: StreamQueueItem): Promise<void> {
    try {
      await this.#inner.streamMessage!(item.messages, item.model, item.apiKey, item.onChunk, item.signal);
      item.resolve();
    } catch (e) {
      item.reject(e);
    } finally {
      this.activeStreams--;
      this.processStreamQueue();
    }
  }

  private async executeStreamBatch(batch: StreamQueueItem[]): Promise<void> {
    try {
      await this.#inner.batchStreamMessage!(batch);
      batch.forEach(item => item.resolve());
    } catch (e) {
      batch.forEach(item => item.reject(e));
    } finally {
      this.activeStreams -= batch.length;
      this.processStreamQueue();
    }
  }

  private getPriority(apiKey: string, messages: ChatMessage[]): Priority {
    if (apiKey.startsWith('high:')) return 'high';
    if (apiKey.startsWith('low:')) return 'low';
    const urgent = messages.some(m =>
      m.role === 'system' && /urgent|critical|asap/i.test(m.content),
    );
    if (urgent) return 'high';
    return 'normal';
  }

  async sendMessage(messages: ChatMessage[], model: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResponse> {
    const priority = this.getPriority(apiKey, messages);

    if (priority === 'high' && this.activeSends < this.config.maxConcurrency) {
      this.activeSends++;
      try {
        return await this.#inner.sendMessage(messages, model, apiKey, signal);
      } finally {
        this.activeSends--;
        this.processSendQueue();
      }
    }

    if (priority === 'low') {
      await new Promise(r => setTimeout(r, this.config.lowPriorityDelayMs));
    }

    return new Promise<ProviderResponse>((resolve, reject) => {
      this.sendQueue.push({ messages, model, apiKey, signal, priority, resolve, reject });
      this.processSendQueue();
    });
  }

  async streamMessage(
    messages: ChatMessage[],
    model: string,
    apiKey: string,
    onChunk: (chunk: string, meta?: unknown) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const priority = this.getPriority(apiKey, messages);

    if (priority === 'high' && this.activeStreams < this.config.maxConcurrency) {
      this.activeStreams++;
      try {
        return await this.#inner.streamMessage!(messages, model, apiKey, onChunk, signal);
      } finally {
        this.activeStreams--;
        this.processStreamQueue();
      }
    }

    if (priority === 'low') {
      await new Promise(r => setTimeout(r, this.config.lowPriorityDelayMs));
    }

    return new Promise<void>((resolve, reject) => {
      this.streamQueue.push({ messages, model, apiKey, onChunk, signal, priority, resolve, reject });
      this.processStreamQueue();
    });
  }

  async checkHealth(apiKey: string): Promise<HealthCheckResult> {
    return this.#inner.checkHealth(apiKey);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return this.#inner.getAvailableModels(apiKey);
  }

  getQueueStats(): { sendQueue: number; streamQueue: number; activeSends: number; activeStreams: number } {
    return {
      sendQueue: this.sendQueue.length,
      streamQueue: this.streamQueue.length,
      activeSends: this.activeSends,
      activeStreams: this.activeStreams,
    };
  }

  flushAll(): void {
    const error = new Error('Queue flushed');
    for (const item of this.sendQueue.splice(0)) item.reject(error);
    for (const item of this.streamQueue.splice(0)) item.reject(error);
  }
}
