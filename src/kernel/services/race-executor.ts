import type { ChatMessage, ProviderResponse, SendMessageOptions } from '../../llm/core/types';
import type { IAdapterRegistry } from '../contracts/provider-adapter';
import type { AdapterMessage } from '../contracts/provider-adapter';

export interface RaceCandidate {
    provider: string;
    model: string;
    keyId: string;
}

export interface RaceOptions {
    signal?: AbortSignal;
    adapterOptions?: SendMessageOptions;
    timeoutMs?: number;
    keyResolver?: (keyId: string) => string | undefined;
}

export interface RaceResult {
    winner: RaceCandidate;
    response: ProviderResponse;
    latency: number;
    failures: Array<{ candidate: RaceCandidate; error: string }>;
}

export class RaceExecutor {
    constructor(private adapterRegistry: IAdapterRegistry) {}

    async race(
        messages: ChatMessage[],
        candidates: RaceCandidate[],
        options?: RaceOptions,
    ): Promise<RaceResult> {
        const failures: RaceResult['failures'] = [];
        const controllers = new Map<number, AbortController>();
        const timeout = options?.timeoutMs ?? 15000;
        const resolveKey = options?.keyResolver;

        const makeCall = async (
            c: RaceCandidate,
            idx: number,
        ): Promise<{ candidate: RaceCandidate; response: ProviderResponse }> => {
            const adapter = this.adapterRegistry.getAdapter(c.provider);
            if (!adapter) throw new Error(`No adapter for ${c.provider}`);

            const controller = new AbortController();
            controllers.set(idx, controller);

            const combinedSignal = options?.signal
                ? combineSignals(options.signal, controller.signal)
                : controller.signal;

            const apiKey = resolveKey ? resolveKey(c.keyId) : undefined;
            if (!apiKey) throw new Error(`No API key resolved for keyId ${c.keyId}`);

            const start = Date.now();
            const adapterMessages: AdapterMessage[] = messages
                .filter((m) => m.role !== 'tool')
                .map((m) => ({
                    role: m.role as AdapterMessage['role'],
                    content: typeof m.content === 'string' ? m.content : String(m.content),
                }));
            const response = await adapter.sendMessage(
                adapterMessages,
                c.model,
                apiKey,
                combinedSignal,
                options?.adapterOptions,
            );
            response.latency = Date.now() - start;
            return { candidate: c, response };
        };

        let timeoutId: ReturnType<typeof setTimeout> = null as unknown as ReturnType<
            typeof setTimeout
        >;
        const timeoutPromise = new Promise<never>((_, reject) => {
            if (options?.signal?.aborted) {
                reject(new Error('Aborted'));
                return;
            }
            timeoutId = setTimeout(() => {
                controllers.forEach((c) => c.abort());
                clearTimeout(timeoutId);
                reject(new Error(`Race timed out after ${timeout}ms`));
            }, timeout);
            if (options?.signal) {
                options.signal.addEventListener(
                    'abort',
                    () => {
                        clearTimeout(timeoutId);
                        controllers.forEach((c) => c.abort());
                        reject(new Error('Race aborted'));
                    },
                    { once: true },
                );
            }
        });

        try {
            const result = await this.firstSuccess(
                candidates.map((c, i) => makeCall(c, i)),
                candidates,
                timeoutPromise,
                failures,
                controllers,
            );
            return {
                winner: result.candidate,
                response: result.response,
                latency: result.response.latency || 0,
                failures,
            };
        } finally {
            clearTimeout(timeoutId);
            controllers.clear();
        }
    }

    private async firstSuccess(
        promises: Promise<{ candidate: RaceCandidate; response: ProviderResponse }>[],
        candidates: RaceCandidate[],
        timeoutPromise: Promise<never>,
        failures: RaceResult['failures'],
        controllers: Map<number, AbortController>,
    ): Promise<{ candidate: RaceCandidate; response: ProviderResponse }> {
        const results: Array<{ candidate: RaceCandidate; response: ProviderResponse } | Error> =
            new Array(promises.length).fill(null);
        let winnerIdx = -1;

        // Abort all losers immediately when a winner is found
        const onWinner = (idx: number) => {
            controllers.forEach((ctrl, ci) => {
                if (ci !== idx) ctrl.abort();
            });
        };

        // Shared notification: resolved when any promise settles with success
        let winnerResolve!: (value: {
            candidate: RaceCandidate;
            response: ProviderResponse;
        }) => void;
        const winnerPromise = new Promise<{ candidate: RaceCandidate; response: ProviderResponse }>(
            (resolve) => {
                winnerResolve = resolve;
            },
        );

        promises.forEach((p, i) => {
            p.then(
                (v) => {
                    results[i] = v;
                    if (winnerIdx === -1) {
                        winnerIdx = i;
                        onWinner(i);
                        winnerResolve(v);
                    }
                },
                (err) => {
                    const error = err instanceof Error ? err : new Error(String(err));
                    results[i] = error;
                    failures.push({ candidate: candidates[i], error: error.message });
                },
            );
        });

        try {
            await Promise.race([winnerPromise, timeoutPromise]);
        } catch {
            // Timeout or abort — scan for any already-resolved non-error result
        }

        // Return the winner
        if (winnerIdx >= 0) {
            return results[winnerIdx] as { candidate: RaceCandidate; response: ProviderResponse };
        }

        // Timeout/winners-never-resolved path — scan for any non-error result
        for (let i = 0; i < promises.length; i++) {
            const r = results[i];
            if (r && !(r instanceof Error)) return r;
        }

        const last = failures[failures.length - 1];
        throw new Error(
            last
                ? `All race candidates failed. Last: ${last.candidate.provider} — ${last.error}`
                : 'All race candidates failed',
        );
    }
}

function combineSignals(s1: AbortSignal, s2: AbortSignal): AbortSignal {
    if (
        typeof AbortSignal !== 'undefined' &&
        typeof (AbortSignal as unknown as { any?: unknown }).any === 'function'
    ) {
        try {
            return (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any(
                [s1, s2],
            );
        } catch {
            /* fall through */
        }
    }
    if (s1.aborted) return AbortSignal.abort(s1.reason);
    if (s2.aborted) return AbortSignal.abort(s2.reason);
    const controller = new AbortController();
    const onAbort = (reason?: unknown) => {
        controller.abort(reason);
    };
    s1.addEventListener('abort', () => onAbort(s1.reason), { once: true });
    s2.addEventListener('abort', () => onAbort(s2.reason), { once: true });
    return controller.signal;
}
