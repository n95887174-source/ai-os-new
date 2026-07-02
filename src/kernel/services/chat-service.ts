import type { ILLMClientService } from '../contracts/provider-adapter';
import type { QueuedRequest } from '../types/chat-types';
import { EVENTS } from '../events/event-names';
import type { ILogger } from '../contracts/logger';
import type { RaceExecutor } from './race-executor';
import type { ProviderMetrics, DowngradeCandidate } from './downgrade-strategy';
import type { ApiKey } from '../types/metrics-types';
import { ChatExecutor } from './chat-executor';

export interface ChatServiceDeps {
    eventBus: {
        on: (event: string, cb: (...args: unknown[]) => void) => () => void;
        onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
        emit: (event: string, data?: unknown) => void;
    };
    keyService: {
        selectFromPool: (provider: string) => ApiKey | null | undefined;
        selectWithBurst?: (provider: string) => ApiKey | null | undefined;
        getKeys: () => ApiKey[];
        getKey?: (id: string) => ApiKey | null | undefined;
        recordUsage: (
            keyIdOrProvider: string,
            latency: number,
            tokens?: number,
            model?: string,
            extra?: Record<string, unknown>,
        ) => void;
        handleProviderError: (keyId: string, error: string) => void;
        updateKeyStatus: (id: string, status: ApiKey['status'], latency?: number) => void;
    };
    virtualKeyService: {
        resolve: (id: string) => { realKeyId: string } | undefined;
    };
    settingsService: {
        getSettings: () => { streamingEnabled: boolean };
    };
    routerService: {
        getRankedProviders: (
            strategy: string,
            prompt: string,
            priority?: string,
            agentId?: string,
        ) => Array<{ provider: string; key: { id: string }; score?: number }>;
        getRaceCandidateDetails: (
            prompt: string,
        ) => Array<{ provider: string; model: string; keyId: string }>;
        getDeepDowngradedModel: (model: string, levels: number) => string | null;
        getDowngradedModel: (model: string) => string | null;
        resolveWithFallback: (
            strategy: string,
            excludeProviders?: Set<string> | string,
            excludeKeyId?: string,
        ) => { provider: string; key: { id: string } } | null;
    };
    raceExecutor?: RaceExecutor;
    routingPolicyService?: {
        getDowngradedModel: (model: string) => string | null;
        getDeepDowngradedModel: (model: string, steps: number) => string | null;
        smartDowngradeDeep?: (
            model: string,
            metrics: ProviderMetrics,
            maxSteps?: number,
        ) => DowngradeCandidate | null;
    };
    getProviderState?: (provider: string) => { avgTTFT: number } | undefined;
    cacheService: {
        generateKey: (
            messages: Array<{ role: string; content: string }>,
            model: string,
        ) => Promise<string>;
        get: (key: string) => {
            response: string;
            model: string;
            promptTokens: number;
            completionTokens: number;
        } | null;
        set: (
            key: string,
            response: string,
            model: string,
            provider: string,
            promptTokens: number,
            completionTokens: number,
            ttl?: number,
        ) => void;
    };
    policyService: {
        checkAgentPolicy: (
            agentId: string,
            provider: string,
            model?: string,
        ) => { allowed: boolean; reason?: string };
    };
    budgetService?: {
        recordSpend: (agentId: string | null, provider: string, amount: number) => void;
    };
    freeTierLimits: Record<string, { requestsPerDay: number; tokensPerDay: number }>;
    executionGovernor?: {
        start(spec: { type: string; timeoutMs: number; metadata?: Record<string, unknown> }): {
            complete(): void;
            fail(e: Error): void;
        };
    };
    providerRuntime?: {
        createSession: (
            instanceId: string,
            provider: string,
            model: string,
        ) => {
            id: string;
            instanceId: string;
            provider: string;
            status: string;
            activate: () => void;
            complete: (latency: number) => void;
            fail: (error: string) => void;
            recordTokens: (input: number, output: number) => void;
            recordCost: (cost: number) => void;
        };
        getOrCreateInstance: (key: { id: string; key: string; provider: string }) => { id: string };
        getInstance: (instanceId: string) => { id: string } | undefined;
    };
    logger: ILogger;
    llmClient: ILLMClientService;
}

export class ChatService {
    private deps: ChatServiceDeps;
    private executor: ChatExecutor;
    private unsubs: Array<() => void> = [];

    constructor(deps: ChatServiceDeps) {
        this.deps = deps;
        this.executor = new ChatExecutor(deps, deps.llmClient);
    }

    async init() {
        this.setupListeners();
    }

    destroy() {
        this.executor.destroy();
        this.unsubs.forEach((u) => u());
        this.unsubs = [];
    }

    private setupListeners() {
        this.unsubs.push(
            this.deps.eventBus.on(EVENTS.SEND_MESSAGE, (req) => {
                const r = req as QueuedRequest;
                this.executor.handleMessage(r);
            }),
            this.deps.eventBus.onSafe<{ requestId?: string }>(EVENTS.CANCEL_MESSAGE, (d) => {
                if (d && typeof d.requestId === 'string') this.executor.cancelRequest(d.requestId);
            }),
        );
    }
}
