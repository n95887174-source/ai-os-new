import { AuthError, RetryableError, LLMError } from '../core/errors';
export { sanitizeObject, sanitizeError, sanitizeApiKey } from '../../kernel/utils/sanitize';

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
            // LLM-H12: keepalive: true causes response truncation on large LLM payloads (>64KB per spec).
            // Remove it for regular API calls. Use only for beacon/analytics where response doesn't matter.
        });

        // MED-5: If signal was aborted just after fetch() resolved, cancel the response body
        // to prevent a leaked ReadableStream (TOCTOU race between abort and fetch resolution).
        if (signal?.aborted) {
            res.body?.cancel()?.catch(() => {});
            throw new DOMException('Aborted', 'AbortError');
        }

        if (res.status === 401 || res.status === 403) {
            res.body?.cancel()?.catch(() => {});
            throw new AuthError(this.#provider);
        }
        if (res.status === 402) {
            res.body?.cancel()?.catch(() => {});
            throw new LLMError('Payment Required', this.#provider, 402);
        }
        if (res.status === 429) {
            res.body?.cancel()?.catch(() => {});
            const retryAfter = parseRetryAfter(res);
            throw new RetryableError(`Rate limited`, this.#provider, 429, undefined, retryAfter);
        }
        if (res.status >= 500) {
            res.body?.cancel()?.catch(() => {});
            const retryAfter = parseRetryAfter(res);
            throw new RetryableError(
                `Server error ${res.status}`,
                this.#provider,
                res.status,
                undefined,
                retryAfter,
            );
        }
        if (!res.ok) {
            res.body?.cancel()?.catch(() => {});
            throw new LLMError(`HTTP ${res.status}`, this.#provider, res.status);
        }

        let data: Record<string, unknown>;
        try {
            data = await res.json();
        } catch {
            const text = await res.text().catch(() => '');
            throw new LLMError(
                `Invalid JSON response from ${this.#provider}: ${text.slice(0, 200)}`,
                this.#provider,
                res.status,
            );
        }
        const latency = Date.now() - start;
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
            // LLM-H12: keepalive: true causes response truncation on large LLM payloads (>64KB per spec).
        });

        // MED-5: cancel body if signal was aborted just after fetch resolved
        if (signal?.aborted) {
            res.body?.cancel()?.catch(() => {});
            throw new DOMException('Aborted', 'AbortError');
        }

        if (res.status === 401 || res.status === 403) {
            res.body?.cancel()?.catch(() => {});
            throw new AuthError(this.#provider);
        }
        if (res.status === 402) {
            res.body?.cancel()?.catch(() => {});
            throw new LLMError('Payment Required', this.#provider, 402);
        }
        if (res.status === 429) {
            res.body?.cancel()?.catch(() => {});
            const retryAfter = parseRetryAfter(res);
            throw new RetryableError(`Rate limited`, this.#provider, 429, undefined, retryAfter);
        }
        if (!res.ok) {
            res.body?.cancel()?.catch(() => {});
            throw new LLMError(`HTTP ${res.status}`, this.#provider, res.status);
        }

        let data: Record<string, unknown>;
        try {
            data = await res.json();
        } catch {
            const text = await res.text().catch(() => '');
            throw new LLMError(
                `Invalid JSON response from ${this.#provider}: ${text.slice(0, 200)}`,
                this.#provider,
                res.status,
            );
        }
        const latency = Date.now() - start;
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
            // LLM-H12: keepalive: true causes response truncation on large LLM payloads (>64KB per spec).
        });

        // MED-5: cancel body if signal was aborted just after fetch resolved
        if (signal?.aborted) {
            res.body?.cancel()?.catch(() => {});
            throw new DOMException('Aborted', 'AbortError');
        }

        if (res.status === 401 || res.status === 403) {
            res.body?.cancel()?.catch(() => {});
            throw new AuthError(this.#provider);
        }
        if (res.status === 402) {
            res.body?.cancel()?.catch(() => {});
            throw new LLMError('Payment Required', this.#provider, 402);
        }
        if (res.status === 429) {
            res.body?.cancel()?.catch(() => {});
            const retryAfter = parseRetryAfter(res);
            throw new RetryableError(`Rate limited`, this.#provider, 429, undefined, retryAfter);
        }
        if (!res.ok) {
            res.body?.cancel()?.catch(() => {});
            throw new LLMError(`HTTP ${res.status}`, this.#provider, res.status);
        }

        return res;
    }
}

export function parseRetryAfterHeader(header: string | null): number | undefined {
    if (!header) return undefined;
    const seconds = parseInt(header, 10);
    if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
    const parsed = Date.parse(header);
    if (!isNaN(parsed)) return Math.max(0, parsed - Date.now());
    return 5000;
}

function parseRetryAfter(res: Response): number | undefined {
    return parseRetryAfterHeader(res.headers.get('Retry-After'));
}
