import type { ChatMessage, ProviderResponse, SendMessageOptions } from './types';

export interface CommandState {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'failed';
  model: string;
  error?: string;
  timestamp: number;
}

export interface ILLMCommand<T = ProviderResponse> {
  readonly id: string;
  execute(apiKey: string): Promise<T>;
  cancel(): void;
  getStatus(): CommandState['status'];
  getState(): CommandState;
}

export class GenerateMessageCommand implements ILLMCommand<ProviderResponse> {
  readonly id: string;
  private status: CommandState['status'] = 'idle';
  private abortController: AbortController | null = null;
  private error?: string;
  private response?: ProviderResponse;

  constructor(
    private readonly sender: (
      messages: ChatMessage[],
      model: string,
      apiKey: string,
      signal?: AbortSignal,
      options?: SendMessageOptions,
    ) => Promise<ProviderResponse>,
    private readonly messages: ChatMessage[],
    private readonly model: string,
    private readonly options?: SendMessageOptions,
  ) {
    this.id = `cmd_${Math.random().toString(36).substring(2, 11)}`;
  }

  async execute(apiKey: string): Promise<ProviderResponse> {
    if (this.status === 'running') throw new Error('Command is already running');
    this.status = 'running';
    this.abortController = new AbortController();

    try {
      this.response = await this.sender(
        this.messages,
        this.model,
        apiKey,
        this.abortController.signal,
        this.options,
      );
      this.status = 'completed';
      return this.response;
    } catch (err: unknown) {
      const errObj = err as { name?: string; message?: string } | null;
      if (this.status === 'cancelled' || errObj?.name === 'AbortError') {
        this.status = 'cancelled';
        this.error = 'Execution cancelled by user';
        throw new Error(this.error);
      }
      this.status = 'failed';
      this.error = errObj?.message || String(err);
      throw err;
    }
  }

  cancel(): void {
    if (this.status !== 'running') return;
    this.status = 'cancelled';
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  getStatus(): CommandState['status'] {
    return this.status;
  }

  getState(): CommandState {
    return {
      id: this.id,
      status: this.status,
      model: this.model,
      error: this.error,
      timestamp: Date.now(),
    };
  }
}

export class LLMCommandQueue {
  private queue: ILLMCommand<unknown>[] = [];
  private active: Set<ILLMCommand<unknown>> = new Set();
  private history: CommandState[] = [];
  private static readonly MAX_HISTORY = 1000;

  constructor(private readonly maxConcurrency = 3) {}

  add(command: ILLMCommand<unknown>): void {
    this.queue.push(command);
    this.history.push(command.getState());
    this.trimHistory();
  }

  private trimHistory(): void {
    if (this.history.length > LLMCommandQueue.MAX_HISTORY) {
      this.history = this.history.slice(-LLMCommandQueue.MAX_HISTORY);
    }
  }

  getHistory(): CommandState[] {
    return [...this.history];
  }

  getActiveCount(): number {
    return this.active.size;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  async processNext(apiKey: string): Promise<void> {
    if (this.active.size >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const command = this.queue.shift()!;
    this.active.add(command);
    this.updateHistoryState(command);

    try {
      await command.execute(apiKey);
    } catch (e) {
      console.warn('[LLMCommandQueue] Command execution failed:', e);
    } finally {
      this.active.delete(command);
      this.updateHistoryState(command);
      // Process next recursively
      this.processNext(apiKey);
    }
  }

  private updateHistoryState(command: ILLMCommand<any>): void {
    const idx = this.history.findIndex(h => h.id === command.id);
    if (idx !== -1) {
      this.history[idx] = command.getState();
    }
  }
}
