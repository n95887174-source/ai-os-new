export async function fetchWithRetry(url: string | URL | Request, options: RequestInit = {}, maxRetries = 3): Promise<Response> {
  const timeoutMs = 30000;
  for (let i = 0; i < maxRetries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    const onAbort = () => controller.abort();
    if (options.signal) {
      options.signal.addEventListener('abort', onAbort);
    }

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (options.signal) options.signal.removeEventListener('abort', onAbort);

      if (res.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (e: any) {
      clearTimeout(id);
      if (options.signal) options.signal.removeEventListener('abort', onAbort);
      
      if (e.name === 'AbortError' && options.signal?.aborted) {
        throw e; // User aborted
      }
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Max retries reached');
}
