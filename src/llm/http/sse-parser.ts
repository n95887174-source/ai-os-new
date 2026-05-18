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
  const idleTimeout = options?.idleTimeoutMs ?? 0;

  const abortSignal = options?.signal;
  const onAbort = () => bodyReader.cancel('aborted').catch(() => {});
  abortSignal?.addEventListener('abort', onAbort, { once: true });

  const stream = new ReadableStream<string>({
    async pull(controller) {
      if (abortSignal?.aborted) {
        controller.close();
        return;
      }

      if (idleTimeout > 0 && Date.now() - lastChunkTime > idleTimeout) {
        const err = new LLMError(`SSE idle timeout after ${idleTimeout}ms`, 'sse', undefined, { cause: new Error('idle timeout') });
        controller.error(err);
        return;
      }

      try {
        const { done, value } = await bodyReader.read();
        if (done) {
          controller.close();
          return;
        }

        lastChunkTime = Date.now();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleaned = line.replace(/^data: /, '').trim();
          if (!cleaned || cleaned === '[DONE]') continue;

          try {
            const parsed = JSON.parse(cleaned);
            const chunk = extractor(parsed);
            onLine?.(parsed);
            if (chunk) controller.enqueue(chunk);
          } catch {
            if (import.meta.env.DEV) {
              console.debug('[SSE Parser] Non-JSON or meta line:', cleaned);
            }
          }
        }
        
        // If we processed chunks but didn't enqueue anything (e.g. metadata-only chunks),
        // we should pull again if desiredSize is positive to ensure stream continues flowing.
        if (controller.desiredSize && controller.desiredSize > 0 && !done) {
          // Returning Promise resolves, letting the browser loop to call pull() again.
        }
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      bodyReader.cancel();
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
  } finally {
    reader.releaseLock();
    abortSignal?.removeEventListener('abort', onAbort);
  }
}
