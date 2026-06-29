import { CONFIG } from '../config-registry';
import type { ApiKey } from '../../types/metrics-types';
import { EVENTS } from '../../events/event-names';
import { sanitizeError } from '../../../llm/http/llm-http-client';
import type { IHealthCheckService } from '../../contracts/health-check';

export interface KeyHealthDeps {
    eventBus: {
        emit: (event: string, data?: unknown) => void;
    };
    onStateChanged: (id: string, provider: string, newState: string, previousState: string) => void;
    addAlert: (keyId: string, alert: { type: string; severity: string; message: string }) => void;
    saveKeys: () => Promise<void>;
    notify: () => void;
    getKey: (id: string) => ApiKey | undefined;
    getActiveKeys: () => ApiKey[];
}

export class KeyHealth implements IHealthCheckService {
    private rateLimitHistory: Map<string, number[]> = new Map();
    private retryCounts: Map<string, number> = new Map();
    private backoffMap = new Map<string, number>();
    private backoffStartedAt = new Map<string, number>();

    constructor(private deps: KeyHealthDeps) {}

    getBackoffRemaining(keyId: string): number | null {
        const startedAt = this.backoffStartedAt.get(keyId);
        if (!startedAt) return null;
        const nextBackoff = this.backoffMap.get(keyId);
        const currentDuration = nextBackoff ? nextBackoff / 2 : CONFIG.keys.initialBackoffMs;
        const elapsed = Date.now() - startedAt;
        const remaining = currentDuration - elapsed;
        return Math.max(0, Math.round(remaining));
    }

    handleProviderError(key: ApiKey, error: string): void {
        const previousState = key.status;
        key.status = 'error';
        if (!key.stats)
            key.stats = {
                successCount: 0,
                errorCount: 0,
                totalTokens: 0,
                avgLatency: 0,
                minLatency: 0,
                maxLatency: 0,
            };
        key.stats.lastError = { message: error, timestamp: new Date().toISOString() };

        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Error ${key.provider}: ${sanitizeError(error).substring(0, 60)}...`,
            type: 'error',
        });
        this.deps.eventBus.emit(EVENTS.KEY_STATE_CHANGED, {
            id: key.id,
            provider: key.provider,
            state: 'error',
            previousState,
        });
    }

    check429Spike(keyId: string): void {
        const now = Date.now();
        const window = now - CONFIG.keys.rateLimitSpikeWindowMs;
        const timestamps = (this.rateLimitHistory.get(keyId) || []).filter((t) => t > window);
        timestamps.push(now);
        this.rateLimitHistory.set(keyId, timestamps);
        if (timestamps.length >= CONFIG.keys.rateLimitSpikeThreshold) {
            this.deps.addAlert(keyId, {
                type: 'quota_exceeded',
                severity: 'high',
                message: `429 spike: ${timestamps.length} rate limits in 60s`,
            });
        }
    }

    getBackoffMs(keyId: string): number {
        const current = this.backoffMap.get(keyId) || CONFIG.keys.initialBackoffMs;
        const next = Math.min(current * 2, CONFIG.keys.maxBackoffMs);
        this.backoffMap.set(keyId, next);
        this.backoffStartedAt.set(keyId, Date.now());
        return current;
    }

    cleanupKey(keyId: string): void {
        this.rateLimitHistory.delete(keyId);
        this.retryCounts.delete(keyId);
        this.backoffMap.delete(keyId);
        this.backoffStartedAt.delete(keyId);
    }

    resetRetryCount(keyId: string): void {
        this.retryCounts.delete(keyId);
    }

    transitionState(key: ApiKey, newState: string): void {
        if (!key.stats?.extended) return;
        const oldState = key.stats.extended.state;
        if (oldState === newState) return;
        key.stats.extended.state = newState as NonNullable<ApiKey['stats']['extended']>['state'];
        this.deps.onStateChanged(key.id, key.provider, newState, oldState);
    }

    async checkHealth(
        keyId: string,
    ): Promise<{ id: string; provider: string; status: string; latency: number }> {
        const keyRef = this.deps.getKey(keyId);
        if (!keyRef) return { id: 'none', provider: 'none', status: 'error', latency: 0 };

        // Capture version before async work — if user toggles status while
        // health check is in-flight, skip the status update to avoid TOCTOU race.
        const versionAtStart = keyRef.statusVersion ?? 0;

        const start = performance.now();
        const healthUrl = this.getHealthUrl(keyRef.provider, keyRef.key);
        try {
            const response = await fetch(healthUrl, {
                signal: AbortSignal.timeout(CONFIG.keys.healthCheckTimeoutMs),
            });
            const latency = performance.now() - start;
            if (!response.ok) {
                response.body?.cancel();
                this._healthCache.set(keyId, Date.now());
            }
            const protectedStatuses = new Set(['compromised', 'quarantined']);
            const newStatus = protectedStatuses.has(keyRef.status)
                ? keyRef.status
                : response.ok
                  ? 'active'
                  : 'error';
            // Only apply status if version hasn't changed (user didn't toggle during check)
            if ((keyRef.statusVersion ?? 0) === versionAtStart) {
                Object.assign(keyRef, { latency, status: newStatus });
            } else {
                Object.assign(keyRef, { latency });
            }
            if (response.ok && keyRef.stats) {
                keyRef.stats.avgLatency = keyRef.stats.avgLatency * 0.7 + latency * 0.3;
            }
            await this.deps.saveKeys();
            this.deps.notify();
            return { id: keyRef.id, provider: keyRef.provider, status: keyRef.status, latency };
        } catch {
            const latency = performance.now() - start;
            this._healthCache.set(keyId, Date.now());
            // Only apply status if version hasn't changed
            if ((keyRef.statusVersion ?? 0) === versionAtStart) {
                Object.assign(keyRef, { status: 'error' as const, latency });
            } else {
                Object.assign(keyRef, { latency });
            }
            await this.deps.saveKeys();
            this.deps.notify();
            return { id: keyRef.id, provider: keyRef.provider, status: keyRef.status, latency: -1 };
        }
    }

    private _healthCache = new Map<string, number>(); // keyId → timestamp of last failure
    private static HEALTH_RETRY_MS = 300_000; // 5min retry after failure

    async checkAllHealth(): Promise<
        { id: string; provider: string; status: string; latency: number }[]
    > {
        const activeKeys = this.deps.getActiveKeys();
        for (const k of activeKeys) this.deps.eventBus.emit(EVENTS.KEY_HEALTH_CHECK_STARTED, k.id);
        // Sequential (not parallel) to avoid memory burst
        const results: Array<{ id: string; provider: string; status: string; latency: number }> =
            [];
        for (const k of activeKeys) {
            const lastFail = this._healthCache.get(k.id);
            if (lastFail && Date.now() - lastFail < KeyHealth.HEALTH_RETRY_MS) {
                results.push({ id: k.id, provider: k.provider, status: 'error', latency: -1 });
                continue;
            }
            results.push(await this.checkHealth(k.id));
            // 50ms delay between checks to let GC breathe
            await new Promise((r) => setTimeout(r, 50));
        }
        this.deps.eventBus.emit(EVENTS.KEY_HEALTH_CHECK_COMPLETED);
        return results;
    }

    private getHealthUrl(provider: string, apiKey?: string): string {
        const isGemini = provider.toLowerCase() === 'gemini';
        if (isGemini && apiKey) {
            return `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
        }
        const urls: Record<string, string> = {
            OpenAI: 'https://api.openai.com/v1/models',
            Gemini: 'https://generativelanguage.googleapis.com/v1/models',
            Groq: 'https://api.groq.com/v1/models',
            OpenRouter: 'https://openrouter.ai/api/v1/models',
            NVIDIA: 'https://api.nvcf.nvidia.com/v2/models',
            DeepSeek: 'https://api.deepseek.com/v1/models',
            Cohere: 'https://api.cohere.ai/v1/models',
            Anthropic: 'https://api.anthropic.com/v1/models',
            Mistral: 'https://api.mistral.ai/v1/models',
            Cloudflare: 'https://api.cloudflare.com/client/v4/accounts',
            Cerebras: 'https://api.cerebras.ai/v1/models',
        };
        return urls[provider] || `https://api.openai.com/v1/models`;
    }

    updateKeyStatus(key: ApiKey, status: ApiKey['status'], latency?: number): void {
        key.status = status;
        if (latency !== undefined) key.latency = latency;
    }

    updateAvailableModels(key: ApiKey, models: string[]): void {
        key.availableModels = models;
    }

    toggleKeyStatus(key: ApiKey): void {
        if (key.status === 'active') {
            key.status = 'inactive';
        } else if (key.status === 'inactive' || key.status === 'error') {
            key.status = 'active';
        }
        // Other states (quarantined, compromised) are not toggleable — user must use explicit recovery flow
    }

    enableAllKeys(keys: ApiKey[]): void {
        keys.forEach((k) => (k.status = 'active'));
    }

    disableAllKeys(keys: ApiKey[]): void {
        keys.forEach((k) => (k.status = 'inactive'));
    }

    quarantineKey(key: ApiKey, source: string): boolean {
        key.status = 'quarantined' as ApiKey['status'];
        this.deps.addAlert(key.id, {
            type: 'security',
            severity: 'critical',
            message: `Key "${key.label}" quarantined — suspected compromise (source: ${source})`,
        });
        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Key "${key.label}" quarantined due to suspected compromise (${source})`,
            type: 'error',
        });
        return true;
    }

    compromiseKey(key: ApiKey, source: string): void {
        const prevStatus = key.status;
        key.status = 'compromised' as ApiKey['status'];
        // Wipe the key material entirely instead of leaving a sentinel
        // string in place. Previously we wrote `key.key = '[COMPROMISED]'`
        // and left `isEncrypted: false`, which (a) got re-encrypted on the
        // next save (vault.encryptAllKeys sees non-empty key + not encrypted
        // and encrypts the sentinel), and (b) could leak into LLM requests
        // if any code path forgot to filter on status === 'compromised'.
        key.key = '';
        key.isEncrypted = true;

        this.deps.addAlert(key.id, {
            type: 'compromise',
            severity: 'critical',
            message: `Key "${key.label}" marked COMPROMISED — revoked from rotation (source: ${source})`,
        });

        this.transitionState(key, 'DISABLED');

        this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
            message: `Key "${key.label}" COMPROMISED via ${source} — revoked from all pools`,
            type: 'error',
        });

        this.deps.eventBus.emit(EVENTS.KEY_STATE_CHANGED, {
            id: key.id,
            provider: key.provider,
            state: 'compromised',
            previousState: prevStatus,
        });
    }
}
