import { AuthError, RetryableError, LLMError } from '../core/errors';

export interface HttpResult {
  data: unknown;
  latency: number;
  response: Response;
}

export class LLMHttpClient {
  readonly #baseUrl: string;
  readonly #defaultHeaders: Record<string, string>;
  readonly #authHeaderName: string;

  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string> = {},
    authHeaderName = 'x-goog-api-key',
  ) {
    this.#baseUrl = baseUrl;
    this.#defaultHeaders = defaultHeaders;
    this.#authHeaderName = authHeaderName;
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
    });

    const latency = Date.now() - start;

    if (res.status === 401 || res.status === 403) throw new AuthError(path);
    if (res.status === 429) {
      const retryAfter = parseRetryAfter(res);
      throw new RetryableError(`Rate limited`, path, 429, undefined, retryAfter);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new LLMError(`HTTP ${res.status}: ${text.slice(0, 200)}`, path, res.status);
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
    });

    const latency = Date.now() - start;

    if (res.status === 401 || res.status === 403) throw new AuthError(path);
    if (!res.ok) {
      const text = await res.text();
      throw new LLMError(`HTTP ${res.status}: ${text.slice(0, 200)}`, path, res.status);
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
    });

    if (res.status === 401 || res.status === 403) throw new AuthError(path);
    if (res.status === 429) {
      const retryAfter = parseRetryAfter(res);
      throw new RetryableError(`Rate limited`, path, 429, undefined, retryAfter);
    }
    if (!res.ok) {
      const text = await res.text();
      throw new LLMError(`HTTP ${res.status}: ${text.slice(0, 200)}`, path, res.status);
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
}
