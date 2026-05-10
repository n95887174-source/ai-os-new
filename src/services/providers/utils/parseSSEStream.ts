export async function parseSSEStream(
  response: Response,
  onChunk: (chunk: string) => void,
  extractor: (parsed: any) => string | undefined | null
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is null');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

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
        } catch {
          if (import.meta.env.DEV) {
            console.debug('[SSE Parser] Non-JSON or meta line:', cleaned);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
