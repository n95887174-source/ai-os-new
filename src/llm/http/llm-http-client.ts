import { AuthError, RetryableError, LLMError } from '../core/errors';

export function sanitizeError(text: string): string {
  return text.replace(/(sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|gsk_[a-zA-Z0-9]{30,}|nvapi-[a-zA-Z0-9_-]{30,}|hf_[a-zA-Z0-9]{30,})/g, '[KEY REDACTED]');
}

export function sanitizeApiKey(key: string): string {
  if (!key || key.length < 8) return '[INVALID]';
  return key.slice(0, 4) + '***' + key.slice(-4);
}

export interface HttpResult {
  data: unknown;
  latency: number;
  response: Response;
}

export class LLMHttpClient {
  readonly #baseUrl: string;
  readonly #defaultHeaders: Record<string, string>;
  readonly #authHeaderName: string;
  readonly #provider: string;

  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string> = {},
    authHeaderName = 'x-goog-api-key',
    provider = 'unknown',
  ) {
    this.#baseUrl = baseUrl;
    this.#defaultHeaders = defaultHeaders;
    this.#authHeaderName = authHeaderName;
    this.#provider = provider;
  }

  async post(
    path: string,
    body: unknown,
    apiKey: string,
    signal?: AbortSignal,
  ): Promise<HttpResult> {
    const start = Date.now();
    const res = await fetch(`${this.#baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.#defaultHeaders,
        [this.#authHeaderName]: apiKey,
      },
      body: JSON.stringify(body),
      signal,
      keepalive: true,
    });

    const latency = Date.now() - start;

    if (res.status === 401 || res.status === 403) throw new AuthError(this.#provider);
    if (res.status === 429) {
      const retryAfter = parseRetryAfter(res);
      throw new RetryableError(`Rate limited`, this.#provider, 429, undefined, retryAfter);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new LLMError(`HTTP ${res.status}: ${sanitizeError(text.slice(0, 200))}`, this.#provider, res.status);
    }

    const data = await res.json();
    return { data, latency, response: res };
  }

  async get(path: string, apiKey: string, signal?: AbortSignal): Promise<HttpResult> {
    const start = Date.now();
    const res = await fetch(`${this.#baseUrl}${path}`, {
      method: 'GET',
      headers: {
        ...this.#defaultHeaders,
        [this.#authHeaderName]: apiKey,
      },
      signal,
      keepalive: true,
    });

    const latency = Date.now() - start;

    if (res.status === 401 || res.status === 403) throw new AuthError(this.#provider);
    if (res.status === 429) {
      const retryAfter = parseRetryAfter(res);
      throw new RetryableError(`Rate limited`, this.#provider, 429, undefined, retryAfter);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new LLMError(`HTTP ${res.status}: ${sanitizeError(text.slice(0, 200))}`, this.#provider, res.status);
    }

    const data = await res.json();
    return { data, latency, response: res };
  }

  async streamPost(
    path: string,
    body: unknown,
    apiKey: string,
    signal?: AbortSignal,
  ): Promise<Response> {
    const res = await fetch(`${this.#baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.#defaultHeaders,
        [this.#authHeaderName]: apiKey,
      },
      body: JSON.stringify(body),
      signal,
      keepalive: true,
    });

    if (res.status === 401 || res.status === 403) throw new AuthError(this.#provider);
    if (res.status === 429) {
      const retryAfter = parseRetryAfter(res);
      throw new RetryableError(`Rate limited`, this.#provider, 429, undefined, retryAfter);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new LLMError(`HTTP ${res.status}: ${sanitizeError(text.slice(0, 200))}`, this.#provider, res.status);
    }

    return res;
  }
}

function parseRetryAfter(res: Response): number | undefined {
  const header = res.headers.get('Retry-After');
  if (!header) return undefined;
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
  const parsed = Date.parse(header);
  if (!isNaN(parsed)) return Math.max(0, parsed - Date.now());
  return undefined;
}
