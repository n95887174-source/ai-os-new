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
  const reader = response.body?.getReader();
  if (!reader) throw new LLMError('Response body is null', 'sse');

  const decoder = new TextDecoder();
  let buffer = '';
  let lastChunkTime = Date.now();
  const idleTimeout = options?.idleTimeoutMs ?? 0;

  const abortSignal = options?.signal;
  const onAbort = () => reader.cancel('aborted').catch(() => {});
  abortSignal?.addEventListener('abort', onAbort, { once: true });

  try {
    while (true) {
      if (abortSignal?.aborted) break;

      if (idleTimeout > 0 && Date.now() - lastChunkTime > idleTimeout) {
        throw new LLMError(
          `SSE idle timeout after ${idleTimeout}ms`,
          'sse',
          undefined,
          { cause: new Error('idle timeout') },
        );
      }

      const { done, value } = await reader.read();
      if (done) break;

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
          if (chunk) onChunk(chunk);
          onLine?.(parsed);
        } catch {
          if (import.meta.env.DEV) {
            console.debug('[SSE Parser] Non-JSON or meta line:', cleaned);
          }
        }
      }
    }
  } finally {
    abortSignal?.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }
}
