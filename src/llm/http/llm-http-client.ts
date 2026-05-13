import { AuthError, RetryableError, LLMError } from '../core/errors';

export interface HttpResult {
  data: unknown;
  latency: number;
  response: Response;
}

export class LLMHttpClient {
  readonly #baseUrl: string;
  readonly #defaultHeaders: Record<string, string>;

  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string> = {},
  ) {
    this.#baseUrl = baseUrl;
    this.#defaultHeaders = defaultHeaders;
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
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal,
    });

    const latency = Date.now() - start;

    if (res.status === 401 || res.status === 403) throw new AuthError(path);
    if (res.status === 429) throw new RetryableError(`Rate limited`, path, 429);
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
        'x-goog-api-key': apiKey,
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
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (res.status === 401 || res.status === 403) throw new AuthError(path);
    if (res.status === 429) throw new RetryableError(`Rate limited`, path, 429);
    if (!res.ok) {
      const text = await res.text();
      throw new LLMError(`HTTP ${res.status}: ${text.slice(0, 200)}`, path, res.status);
    }

    return res;
  }
}
