import type { ApiKey } from '../types/metrics-types';
import type { IKeyStateStore } from '../contracts/key-state';
import type { RouterDecisionRecorder } from './router-decision-recorder';

export interface DebateSelectorDeps {
    keyService: {
        getKeys: () => ApiKey[];
        isProviderCircuitOpen: (provider: string) => boolean;
        isProviderRateLimited: (provider: string) => boolean;
        isKeyInBackoff: (keyId: string) => { backoff: boolean; remainingMs: number };
    };
    kernel: {
        getState: () => {
            providers: Record<
                string,
                {
                    avgTTFT: number;
                    avgTPS: number;
                    reliability: number;
                    totalRequests: number;
                    selectionRate: number;
                    status: string;
                }
            >;
        };
    };
    keyStateStore?: IKeyStateStore;
    decisionRecorder: RouterDecisionRecorder;
}

export class RouterDebateSelector {
    private deps: DebateSelectorDeps;

    constructor(deps: DebateSelectorDeps) {
        this.deps = deps;
    }

    getDebateProviders(count: number): Array<{ provider: string; key: ApiKey }> {
        const allKeys = this.deps.keyService.getKeys();
        let activeKeys = allKeys.filter((k) => {
            const ks = this.deps.keyStateStore?.get(k.id);
            if (ks) {
                if (ks.flags.authFailed) {
                    this.deps.decisionRecorder.logDebateSkip(
                        k,
                        `Auth failed — key unauthorized`,
                        'status',
                    );
                    return false;
                }
                if (ks.healthScore < 75) {
                    this.deps.decisionRecorder.logDebateSkip(
                        k,
                        `Health score: ${ks.healthScore}/100`,
                        'status',
                    );
                    return false;
                }
            } else {
                if (k.status !== 'active') {
                    this.deps.decisionRecorder.logDebateSkip(k, `Status: ${k.status}`, 'status');
                    return false;
                }
                if (this.deps.keyService.isProviderCircuitOpen(k.provider)) {
                    this.deps.decisionRecorder.logDebateSkip(k, 'Circuit breaker open', 'circuit');
                    return false;
                }
                if (this.deps.keyService.isProviderRateLimited(k.provider)) {
                    this.deps.decisionRecorder.logDebateSkip(k, 'Rate limited', 'ratelimit');
                    return false;
                }
            }
            return true;
        });
        if (activeKeys.length === 0) {
            activeKeys = allKeys.filter((k) => {
                const ks = this.deps.keyStateStore?.get(k.id);
                if (ks) {
                    if (ks.flags.authFailed) {
                        this.deps.decisionRecorder.logDebateSkip(
                            k,
                            `Fallback skipped — auth failed`,
                            'status',
                        );
                        return false;
                    }
                    if (ks.healthScore < 25) {
                        this.deps.decisionRecorder.logDebateSkip(
                            k,
                            `Fallback skipped — health score ${ks.healthScore}/100`,
                            'status',
                        );
                        return false;
                    }
                } else {
                    if (k.status === 'error') {
                        this.deps.decisionRecorder.logDebateSkip(
                            k,
                            `Fallback skipped — Status: ${k.status}`,
                            'status',
                        );
                        return false;
                    }
                    const backoff = this.deps.keyService.isKeyInBackoff(k.id);
                    if (backoff.backoff) {
                        this.deps.decisionRecorder.logDebateSkip(
                            k,
                            `Fallback skipped — backoff ${backoff.remainingMs}ms`,
                            'backoff',
                        );
                        return false;
                    }
                }
                return true;
            });
        }
        const uniqueProviders = new Map<string, ApiKey>();
        for (const k of activeKeys) {
            if (!uniqueProviders.has(k.provider)) {
                uniqueProviders.set(k.provider, k);
            }
        }
        const PRIORITY = [
            'groq',
            'gemini',
            'openrouter',
            'nvidia',
            'cerebras',
            'cloudflare',
            'deepseek',
            'cohere',
            'scaleway',
            'github',
            'blackboxapi',
            'cometapi',
        ];
        const sorted = Array.from(uniqueProviders.entries()).sort(([a], [b]) => {
            const ia = PRIORITY.indexOf(a);
            const ib = PRIORITY.indexOf(b);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
        return sorted
            .slice(0, Math.min(count, sorted.length))
            .map(([provider, key]) => ({ provider, key }));
    }

    getProviderStats() {
        const state = this.deps.kernel.getState();
        return Object.entries(state.providers).map(([id, p]) => ({
            id,
            avgTTFT: p.avgTTFT,
            avgTPS: p.avgTPS,
            reliability: p.reliability,
            totalRequests: p.totalRequests,
            selectionRate: p.selectionRate,
            status: p.status,
        }));
    }
}
