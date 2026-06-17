/**
 * Resumable Stream — Streaming 2.0
 * Handles network interruptions with automatic reconnection and provider fallback
 */

import { rootLogger } from '../../kernel/services/logger-service';
import { eventBus } from '../../kernel/events/event-bus';
import { EVENTS } from '../../kernel/events/event-names';

const LOGGER = rootLogger.child('ResumableStream');

export interface StreamConfig {
  provider: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  url: string;
  headers?: Record<string, string>;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  maxBufferSize?: number;
}

export interface StreamChunk {
  index: number;
  content: string;
  timestamp: number;
  provider?: string;
}

export interface StreamState {
  streamId: string;
  provider: string;
  model: string;
  lastIndex: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  startTime: number;
  error?: string;
  abortController?: AbortController;
}

export type StreamEventType = 'chunk' | 'error' | 'reconnecting' | 'provider_switch' | 'completed';

const DEFAULT_CONFIG: Partial<StreamConfig> = {
  timeout: 60000,
  maxRetries: 3,
  retryDelay: 1000,
  maxBufferSize: 500,
};

class ResumableStream {
  private streams: Map<string, StreamState> = new Map();
  private chunkBuffer: Map<string, StreamChunk[]> = new Map();
  constructor() {
    setInterval(() => this.cleanup(300000), 300000); // 5min cleanup
  }

  /**
   * Create a resumable stream
   */
  async create(
    streamId: string,
    config: StreamConfig,
    signal?: AbortSignal
  ): Promise<AsyncGenerator<StreamChunk, void, unknown>> {
    const state: StreamState = {
      streamId,
      provider: config.provider,
      model: config.model,
      lastIndex: 0,
      status: 'active',
      startTime: Date.now(),
    };
    this.streams.set(streamId, state);
    this.chunkBuffer.set(streamId, []);

    // LLM-17: Auto-cleanup stale streams on each create
    this.cleanup();

    LOGGER.info('ResumableStream', 'Stream created', { streamId, provider: config.provider });

    let retryCount = 0;
    const chunks: StreamChunk[] = [];
    let index = 0;
    const emitCompleted = () => {
      eventBus.emit(EVENTS.STREAM_COMPLETED, {
        requestId: streamId,
        provider: config.provider,
        model: config.model,
        fullContent: chunks.map(chunk => chunk.content).join(''),
        latency: Date.now() - state.startTime,
      });
    };

    const sleep = this.sleep.bind(this);
    const sleepAbortable = this.sleepAbortable.bind(this);
    const chunkBuffer = this.chunkBuffer;
    const stream = (async function* () {
      // LLM-11: Enforce timeout with AbortController
      const timeoutMs = config.timeout ?? DEFAULT_CONFIG.timeout ?? 60000;
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
      // Forward external abort to timeout controller
      const onAbort = () => { timeoutController.abort(); };
      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }
      state.abortController = timeoutController;

      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
      try {
        while (retryCount < (config.maxRetries ?? 3)) {
          try {
            const response = await fetch(config.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...config.headers,
              },
              body: JSON.stringify({
                model: config.model,
                messages: config.messages,
                stream: true,
              }),
              signal: timeoutController.signal,
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            reader = response.body?.getReader() ?? null;
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              // H-12: pause/resume support — hold data flow when paused
              while (state.status === 'paused') {
                await sleep(100);
              }

              // H-13: backpressure — throttle reading when consumer is slow
              const maxBuf = config.maxBufferSize ?? DEFAULT_CONFIG.maxBufferSize ?? 500;
              while (chunks.length > maxBuf) {
                await sleep(50);
              }

              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    state.status = 'completed';
                    chunkBuffer.delete(streamId);
                    emitCompleted();
                    return;
                  }

                  // LLM-10: Parse SSE JSON data to extract actual content
                  let content = data;
                  try {
                    const parsed = JSON.parse(data);
                    content = parsed.choices?.[0]?.delta?.content
                      ?? parsed.choices?.[0]?.message?.content
                      ?? parsed.text
                      ?? parsed.content
                      ?? data;
                  } catch { /* not JSON, use raw data */ }

                  const chunk: StreamChunk = {
                    index: index++,
                    content,
                    timestamp: Date.now(),
                    provider: config.provider,
                  };

                  chunks.push(chunk);
                  // LLM-2: Also push to chunkBuffer for resume support (capped)
                  const buf = chunkBuffer.get(streamId);
                  if (buf) {
                    buf.push(chunk);
                    const maxCap = config.maxBufferSize ?? DEFAULT_CONFIG.maxBufferSize ?? 500;
                    if (buf.length > maxCap) buf.splice(0, buf.length - maxCap);
                  }
                  state.lastIndex = chunk.index;
                  yield chunk;

                  eventBus.emit(EVENTS.STREAM_CHUNK, {
                    requestId: streamId,
                    provider: config.provider,
                    chunk: chunk.content,
                  });
                }
              }
            }

            // Stream completed successfully
            state.status = 'completed';
            emitCompleted();
            return;
          } catch (error) {
            if (signal?.aborted) {
              state.status = 'failed';
              state.error = 'Aborted';
              return;
            }

            retryCount++;
            state.status = 'paused';

            LOGGER.warn('ResumableStream', 'Stream interrupted, retrying', {
              streamId,
              retry: retryCount,
              error,
            });

            eventBus.emit(EVENTS.STREAM_RECONNECTING, { streamId, retry: retryCount, maxRetries: config.maxRetries, lastIndex: state.lastIndex });

            if (retryCount >= (config.maxRetries ?? 3)) {
              state.status = 'failed';
              state.error = String(error);
              eventBus.emit(EVENTS.STREAM_ERROR, {
                requestId: streamId,
                provider: config.provider,
                error: String(error),
              });
              return;
            }

            // Exponential backoff: 1x, 2x, 4x, 8x... (abort-aware)
            const backoffMs = (config.retryDelay ?? 1000) * Math.pow(2, retryCount - 1);
            try {
              await sleepAbortable(backoffMs, timeoutController.signal);
            } catch {
              state.status = 'failed';
              state.error = 'Aborted during backoff';
              return;
            }
          }
        }
        // All retries exhausted
        state.status = 'failed';
        state.error = 'Max retries exceeded';
        eventBus.emit(EVENTS.STREAM_ERROR, {
          requestId: streamId,
          provider: config.provider,
          error: 'Max retries exceeded',
        });
      } finally {
        reader?.cancel('Generator dropped').catch(() => {});
        clearTimeout(timeoutId);
        if (signal) {
          signal.removeEventListener('abort', onAbort);
        }
      }
    })();

    return stream;
  }

  /**
   * Resume an interrupted stream — replays buffered chunks without re-fetching.
   * Providers don't support server-side resume, so re-fetching would duplicate content.
   */
  async resume(streamId: string, _config: StreamConfig, _signal?: AbortSignal): Promise<AsyncGenerator<StreamChunk, void, unknown>> {
    const state = this.streams.get(streamId);
    if (!state) {
      throw new Error(`Stream ${streamId} not found`);
    }

    LOGGER.info('ResumableStream', 'Resuming stream from buffer', { streamId, fromIndex: state.lastIndex });

    const chunkBuffer = this.chunkBuffer;
    const stream = (async function* () {
      const buf = chunkBuffer.get(streamId) || [];
      for (const chunk of buf) {
        if (chunk.index > state.lastIndex) {
          state.lastIndex = chunk.index;
          yield chunk;
        }
      }
      state.status = 'completed';
    })();

    return stream;
  }

  /**
   * Switch to a different provider mid-stream
   */
  async switchProvider(
    streamId: string,
    newProvider: string,
    newConfig: StreamConfig,
    prependTag = true
  ): Promise<AsyncGenerator<StreamChunk, void, unknown>> {
    const state = this.streams.get(streamId);
    if (!state) {
      throw new Error(`Stream ${streamId} not found`);
    }

    LOGGER.info('ResumableStream', 'Switching provider', {
      streamId,
      from: state.provider,
      to: newProvider,
    });

    const oldProvider = state.provider;
    state.provider = newProvider;
    state.status = 'active';

    eventBus.emit(EVENTS.STREAM_PROVIDER_SWITCH, { streamId, fromProvider: oldProvider, toProvider: newProvider, prependTag });

    return this.resume(streamId, newConfig);
  }

  /**
   * Get stream state
   */
  getState(streamId: string): StreamState | undefined {
    return this.streams.get(streamId);
  }

  /**
   * Get chunks for a stream
   */
  getChunks(streamId: string): StreamChunk[] {
    return this.chunkBuffer.get(streamId) || [];
  }

  /**
   * Pause a stream
   */
  pause(streamId: string): void {
    const state = this.streams.get(streamId);
    if (state && state.status === 'active') {
      state.status = 'paused';
      LOGGER.info('ResumableStream', 'Stream paused', { streamId });
    }
  }

  /**
   * Resume a paused stream
   */
  resumePaused(streamId: string): 'active' | undefined {
    const state = this.streams.get(streamId);
    if (state && state.status === 'paused') {
      state.status = 'active';
      LOGGER.info('ResumableStream', 'Stream resumed', { streamId });
      return 'active';
    }
    return undefined;
  }

  /**
   * Abort a stream
   */
  abort(streamId: string): void {
    const state = this.streams.get(streamId);
    if (state && (state.status === 'active' || state.status === 'paused')) {
      // C-05: Abort active HTTP request to stop resource waste
      if (state.abortController && state.status === 'active') {
        state.abortController.abort();
      }
      state.status = 'failed';
      state.error = 'Aborted by user';
      LOGGER.info('ResumableStream', 'Stream aborted', { streamId });
    }
  }

  /**
   * Clean up old streams
   */
  cleanup(maxAgeMs = 3600000): void {
    const now = Date.now();
    for (const [streamId, state] of this.streams.entries()) {
      if (now - state.startTime > maxAgeMs) {
        if (state.status === 'active' && state.abortController) {
          state.abortController.abort();
        }
        this.streams.delete(streamId);
        this.chunkBuffer.delete(streamId);
        LOGGER.debug('ResumableStream', 'Cleaned up old stream', { streamId });
      }
    }
  }

  /**
   * Get stream metrics
   */
  getMetrics(): {
    activeStreams: number;
    completedStreams: number;
    failedStreams: number;
    avgDuration: number;
  } {
    const streams = Array.from(this.streams.values());
    const completed = streams.filter(s => s.status === 'completed');
    const failed = streams.filter(s => s.status === 'failed');

    return {
      activeStreams: streams.filter(s => s.status === 'active').length,
      completedStreams: completed.length,
      failedStreams: failed.length,
      avgDuration: completed.length > 0
        ? completed.reduce((sum, s) => sum + (Date.now() - s.startTime), 0) / completed.length
        : 0,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private sleepAbortable(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new Error('Aborted'));
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => { clearTimeout(timer); reject(new Error('Aborted')); };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }
}

// Singleton
export const resumableStream = new ResumableStream();
