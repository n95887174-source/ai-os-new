import type { TimelineEntry, IDebateQueryEngine } from '../../contracts/debate-types';
import type { DebateSession } from '../../contracts/debate-types';
import type { IAdapterRegistry } from '../../contracts/provider-adapter';

const NON_CHAT_PREFIXES = [
    'text-',
    'davinci',
    'curie',
    'babbage',
    'ada',
    'code-',
    'gemini-2.5-pro-exp',
    'imagen-',
    'veo-',
    'gemma-',
    'claude-instant-',
];

const NON_CHAT_PATTERNS = [/^gpt-3\.5-turbo-instruct/, /^text-davinci/, /^code-davinci/];

export const DEBATE_MODEL_PRIORITY: Record<string, string[]> = {
    gemini: ['gemini-2.0-flash', 'gemini-2.5-flash'],
    groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
    openrouter: ['openrouter/auto', 'openrouter/free'],
    nvidia: ['meta/llama-3.3-70b-instruct', 'meta/llama-3.1-8b-instruct'],
};

export function isChatModel(model: string): boolean {
    const m = model.toLowerCase();
    for (const p of NON_CHAT_PREFIXES) {
        if (m.startsWith(p)) return false;
    }
    for (const re of NON_CHAT_PATTERNS) {
        if (re.test(model)) return false;
    }
    return true;
}

export function getAllModelsForProvider(key: {
    provider: string;
    availableModels?: string[];
}): string[] {
    const provider = key.provider.toLowerCase();
    const priority = (DEBATE_MODEL_PRIORITY[provider] ?? []).filter((m) => isChatModel(m));
    const available = (key.availableModels ?? []).filter((m) => isChatModel(m));
    const models = new Set([...priority, ...available]);
    if (models.size === 0) {
        for (const m of priority) models.add(m);
    }
    return [...models];
}

export function isModelCompatibleWithProvider(model: string, provider: string): boolean {
    const p = provider.toLowerCase();
    if (p === 'openrouter' && !model.startsWith('openrouter/')) return false;
    if (p === 'nvidia' && !model.startsWith('meta/')) return false;
    return true;
}

export function pickBestModelForDebate(
    provider: string,
    availableModels: string[],
    requestedModel?: string,
    skipModels?: Set<string>,
): string | undefined {
    const p = provider.toLowerCase();
    if (requestedModel && requestedModel !== 'auto') {
        if (isModelCompatibleWithProvider(requestedModel, provider)) {
            if (!availableModels.length || availableModels.includes(requestedModel)) {
                if (!skipModels?.has(requestedModel)) return requestedModel;
            }
        }
    }
    const priorities = DEBATE_MODEL_PRIORITY[p];
    if (priorities) {
        for (const model of priorities) {
            if (
                (!availableModels.length || availableModels.includes(model)) &&
                !skipModels?.has(model)
            )
                return model;
        }
    }
    return undefined;
}

export interface ProviderResolveResult {
    key: { id: string; key: string; provider: string; availableModels?: string[] };
    modelId: string;
}

export interface ProviderResolverDeps {
    keyService: {
        getKeys(): Array<{
            id: string;
            key: string;
            provider: string;
            status: string;
            model?: string;
            availableModels?: string[];
        }>;
        recordUsage(
            keyId: string,
            latency: number,
            tokens: number,
            modelId: string,
            metadata?: Record<string, unknown>,
        ): void;
        updateKeyStatus(keyId: string, status: string): void;
    };
    routerService: {
        getDebateProviders(count: number): Array<{
            provider: string;
            key: {
                id: string;
                provider: string;
                key: string;
                status?: string;
                availableModels?: string[];
            };
        }>;
        getRankedProviders(
            strategy: string,
            prompt: string,
        ): Array<{ id: string; provider: string; key: string; availableModels?: string[] }>;
    };
    adapterRegistry: IAdapterRegistry;
    getKeyStateStore?: () => {
        get(
            id: string,
        ):
            | { flags: { authFailed: boolean; circuitOpen: boolean; rateLimited: boolean } }
            | undefined;
        update(id: string, patch: { flags: Record<string, boolean> }): void;
    };
}

export interface SessionProviderState {
    hasProviderFailed(provider: string): boolean;
    markProviderFailed(provider: string): void;
}

export class DebateProviderResolver {
    private participantProviderMap = new Map<string, string>();
    private llmFailureCount = new Map<string, number>();

    constructor(private deps: ProviderResolverDeps) {}

    providerKey(sessionId: string, agentId: string): string {
        return `${sessionId}:${agentId}`;
    }

    isKeyAuthFailed(keyId: string): boolean {
        const kss = this.deps.getKeyStateStore?.();
        if (!kss) return false;
        const state = kss.get(keyId);
        return state?.flags.authFailed === true;
    }

    providerCanBeUsed(provider: string, session: SessionProviderState): boolean {
        if (session.hasProviderFailed(provider)) return false;
        try {
            const registry = this.deps.adapterRegistry;
            const cb = registry.getCircuitBreakerState(provider);
            if (cb === 'open') return false;
        } catch {
            /* best-effort */
        }
        return true;
    }

    getLlmFailureCount(key: string): number {
        return this.llmFailureCount.get(key) || 0;
    }

    incrementLlmFailureCount(key: string): number {
        const count = this.getLlmFailureCount(key) + 1;
        this.llmFailureCount.set(key, count);
        return count;
    }

    deleteLlmFailureCount(key: string): void {
        this.llmFailureCount.delete(key);
    }

    clearSession(sessionId: string): void {
        const prefix = sessionId + ':';
        for (const [key] of this.participantProviderMap) {
            if (key.startsWith(prefix)) this.participantProviderMap.delete(key);
        }
        for (const [key] of this.llmFailureCount) {
            if (key.startsWith(prefix)) this.llmFailureCount.delete(key);
        }
    }

    clearAll(): void {
        this.participantProviderMap.clear();
        this.llmFailureCount.clear();
    }

    clearProviderCache(sessionId: string, agentId: string): void {
        this.participantProviderMap.delete(this.providerKey(sessionId, agentId));
        this.llmFailureCount.delete(this.providerKey(sessionId, agentId));
    }

    resolveProvider(
        session: SessionProviderState,
        participant: { agentId: string; provider?: string; nodeId: string; modelId?: string },
        sessionId: string,
        triedModels: Set<string>,
        _triedKeys: Set<string>,
    ): {
        key: { id: string; key: string; provider: string; availableModels?: string[] };
        modelId: string;
    } | null {
        const keyService = this.deps.keyService;
        const routerService = this.deps.routerService;

        let resolvedKey:
            { id: string; key: string; provider: string; availableModels?: string[] } | undefined;
        let modelId = 'auto';

        const pKey = this.providerKey(sessionId, participant.agentId);

        if (participant.provider && this.providerCanBeUsed(participant.provider, session)) {
            const keys = keyService.getKeys();
            resolvedKey = keys.find(
                (k) =>
                    k.provider === participant.provider &&
                    k.status === 'active' &&
                    !this.isKeyAuthFailed(k.id),
            );
        }

        if (!resolvedKey && this.participantProviderMap.has(pKey)) {
            const cachedProvider = this.participantProviderMap.get(pKey)!;
            if (this.providerCanBeUsed(cachedProvider, session)) {
                const keys = keyService.getKeys();
                resolvedKey = keys.find(
                    (k) =>
                        k.provider === cachedProvider &&
                        k.status === 'active' &&
                        !this.isKeyAuthFailed(k.id),
                );
            }
        }

        if (!resolvedKey) {
            const providerKeys = routerService.getDebateProviders(0);
            const available = providerKeys.find(
                (pk) =>
                    this.providerCanBeUsed(pk.key.provider, session) &&
                    pk.key.status === 'active' &&
                    !this.isKeyAuthFailed(pk.key.id),
            );
            if (available) {
                this.participantProviderMap.set(pKey, available.key.provider);
                resolvedKey = available.key;
            }
        }

        if (!resolvedKey) {
            const ranked = routerService.getRankedProviders('performance', 'debate');
            const allKeys = keyService.getKeys();
            const available = ranked.find((k) => {
                if (!this.providerCanBeUsed(k.provider, session)) return false;
                const key = allKeys.find((key) => key.id === k.id);
                return key?.status === 'active' && !this.isKeyAuthFailed(k.id);
            });
            if (available) resolvedKey = available;
        }

        if (!resolvedKey) {
            const allKeys = keyService.getKeys();
            const anyAvailable = allKeys.find(
                (k) =>
                    this.providerCanBeUsed(k.provider, session) &&
                    k.status === 'active' &&
                    !this.isKeyAuthFailed(k.id),
            );
            if (anyAvailable) resolvedKey = anyAvailable;
        }

        if (!resolvedKey) return null;

        const avail = resolvedKey.availableModels ?? [];
        modelId =
            pickBestModelForDebate(resolvedKey.provider, avail, participant.modelId, triedModels) ||
            (avail.length > 0 ? avail.find((m) => !triedModels.has(m)) : undefined) ||
            (DEBATE_MODEL_PRIORITY[resolvedKey.provider.toLowerCase()] ?? []).find(
                (m) => !triedModels.has(m),
            ) ||
            'auto';

        return { key: resolvedKey, modelId };
    }
}

export class DebateQueryEngine implements IDebateQueryEngine {
    query(
        session: DebateSession,
        criteria: {
            agentId?: string;
            round?: number;
            type?: string;
            confidenceMin?: number;
        },
    ): TimelineEntry[] {
        const entries: TimelineEntry[] =
            (session.arguments?.map((arg) => ({
                type: 'agent:responded',
                payload: arg,
                timestamp: arg.timestamp,
            })) as TimelineEntry[]) ?? [];

        return entries.filter((e) => {
            const arg = e.payload as { agentId?: string; round?: number; confidence?: number };
            if (criteria.agentId && arg.agentId !== criteria.agentId) return false;
            if (criteria.round !== undefined && arg.round !== criteria.round) return false;
            if (
                criteria.confidenceMin !== undefined &&
                (arg.confidence ?? 0) < criteria.confidenceMin
            )
                return false;
            return true;
        });
    }
}
