import { LLMError } from '../core/errors';

export interface SSCOptions {
  idleTimeoutMs?: number;
  signal?: AbortSignal;
}

export async function parseSSEStream(
  response: Response,
  onChunk: (chunk: string) => void,
  extractor: (parsed: Record<string, unknown>) => string | undefined | null,
  onLine?: (parsed: Record<string, unknown>) => void,
  options?: SSCOptions,
): Promise<void> {
  const bodyReader = response.body?.getReader();
  if (!bodyReader) throw new LLMError('Response body is null', 'sse');

  const decoder = new TextDecoder();
  let buffer = '';
  let lastChunkTime = Date.now();
  const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // H-09: 10MB max buffer to prevent OOM
  const idleTimeout = options?.idleTimeoutMs ?? 0;

  const abortSignal = options?.signal;
  // M10-04 (SSE): cancel() may throw during abort — expected, swallow it
  const onAbort = () => bodyReader.cancel('aborted').catch(() => {});
  abortSignal?.addEventListener('abort', onAbort, { once: true });

  const stream = new ReadableStream<string>({
    async pull(controller) {
      if (abortSignal?.aborted) {
        controller.close();
        return;
      }

      // H-14: Reset idle timer on pull — consumer is ready for more data
      lastChunkTime = Date.now();

      try {
        let readResult: ReadableStreamReadResult<Uint8Array>;

        if (idleTimeout > 0) {
          // L9-02: Race read() against an abortable sleep so idle timeout fires
          const idleTimer = new AbortController();
          const timeoutId = setTimeout(() => idleTimer.abort(), Math.max(0, idleTimeout - (Date.now() - lastChunkTime)));

          const timeoutPromise = new Promise<never>((_, reject) => {
            idleTimer.signal.addEventListener('abort', () => {
              reject(new Error('idle timeout'));
            }, { once: true });
          });
          timeoutPromise.catch(() => {}); // prevent unhandled rejection
          try {
            readResult = await Promise.race([
              bodyReader.read(),
              timeoutPromise,
            ]);
          } finally {
            clearTimeout(timeoutId);
          }
        } else {
          readResult = await bodyReader.read();
        }

        const { done, value } = readResult;
        if (done) {
          controller.close();
          return;
        }

        lastChunkTime = Date.now();
        buffer += decoder.decode(value, { stream: true });

        // H-09: Prevent OOM from unbounded buffer growth (malformed response)
        if (buffer.length > MAX_BUFFER_SIZE) {
          throw new LLMError(`SSE buffer exceeded ${MAX_BUFFER_SIZE} bytes — possible malformed response`, 'sse');
        }

        // L9-17: Accumulate data lines across consecutive reads for multi-line fields
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        // L9-17: Group consecutive data: lines into a single event
        let dataAccumulator = '';
        for (const line of lines) {
          if (line === '') {
            if (dataAccumulator) {
              try {
                const parsed = JSON.parse(dataAccumulator);
                const chunk = extractor(parsed);
                onLine?.(parsed);
                if (chunk) controller.enqueue(chunk);
              } catch { /* skip */ }
              dataAccumulator = '';
            }
            continue;
          }
          // L9-18: Skip non-data lines
          if (!line.startsWith('data:')) continue;

          const dataContent = line.slice(5).trim();
          if (dataContent === '[DONE]') {
            if (dataAccumulator) {
              try {
                const parsed = JSON.parse(dataAccumulator);
                const chunk = extractor(parsed);
                onLine?.(parsed);
                if (chunk) controller.enqueue(chunk);
              } catch { /* skip */ }
              dataAccumulator = '';
            }
            controller.close();
            return;
          }

          if (dataAccumulator) {
            dataAccumulator += dataContent;
          } else {
            dataAccumulator = dataContent;
          }
        }

        if (dataAccumulator) {
          try {
            const parsed = JSON.parse(dataAccumulator);
            const chunk = extractor(parsed);
            onLine?.(parsed);
            if (chunk) controller.enqueue(chunk);
          } catch {
            console.warn('[SSE Parser] Non-JSON data:', dataAccumulator.slice(0, 200));
          }
        }
      } catch (e) {
        // L9-03: Cancel bodyReader before erroring on idle timeout
        if (e instanceof Error && e.message === 'idle timeout') {
          // M10-04 (SSE): cancel() may throw during abort — expected, swallow it
          await bodyReader.cancel('idle timeout').catch(() => {});
        }
        controller.error(e);
      }
    },
    cancel() {
      // M10-04 (SSE): cancel() expected to throw during abort — swallow it
      bodyReader.cancel().catch(() => {});
      abortSignal?.removeEventListener('abort', onAbort);
    }
  });

  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) onChunk(value);
    }
  } catch (e) {
    bodyReader.cancel().catch(() => {});
    throw e;
  } finally {
    reader.releaseLock();
    abortSignal?.removeEventListener('abort', onAbort);
  }
}
