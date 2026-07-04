import type { SystemState } from './metrics-types';
import type { EventMap } from './event-map';
import type { ITransaction } from '../contracts/transaction';
import type { ApiKey } from './metrics-types';
import type { PoolStrategy } from '../contracts/pool-selector';
import type { Result } from '../contracts/results';

export interface IEventBus {
    on<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): () => void;
    on(event: string, callback: (data: unknown) => void): () => void;
    off<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
    emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): void;
    emit(event: string, data?: unknown): void;
    onSafe<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): () => void;
    onSafe<T>(event: string, callback: (data: T) => void): () => void;
    subscribeAll(
        callback: (payload: { event: string; data: Record<string, unknown> }) => void,
    ): () => void;
}

export interface IDatabaseService {
    getKv<T>(id: string): Promise<T | null>;
    setKv<T>(id: string, value: T): Promise<void>;
    exportToJson(includeSecrets?: boolean): Promise<Record<string, unknown[]>>;
    importFromJson(data: Record<string, unknown[]>): Promise<void>;
}

/** Data Access Layer — single entry point for all persistent data access */
export interface IDal {
    memory: import('../dal/types').MemoryRepository;
    getKv<T>(id: string): Promise<T | null>;
    setKv<T>(id: string, value: T): Promise<void>;
}

export interface ISecurityService {
    initialize(password: string, userId?: string): Promise<boolean>;
    encrypt(text: string): Promise<string | null>;
    decrypt(base64: string): Promise<string | null>;
    isLocked(): boolean;
    lock(): void;
    changePassword(
        oldPassword: string,
        newPassword: string,
        userId?: string,
        reEncrypt?: (encrypt: (plain: string) => Promise<string | null>) => Promise<boolean>,
    ): Promise<boolean>;
}

export interface IRuntimeManager {
    start(): Promise<boolean>;
    shutdown(): Promise<void>;
    restart(): Promise<boolean>;
    getStatus(): {
        phase: string;
        uptime: number;
        startTime: number;
        servicesReady: number;
        servicesTotal: number;
        lastError: string | null;
        memoryUsage: number;
    };
    getPhase(): string;
    isReady(): boolean;
    markServiceReady(): void;
}

export interface IKernel {
    init(): Promise<void>;
    destroy(): void;
    getState(): SystemState;
    dumpState(): string;
    loadState(json: string): void;
    setExplorationFactor(val: number, tx?: ITransaction): void;
    setSLAMode(mode: string, tx?: ITransaction): void;
    setBaseWeights(
        weights: { ttft: number; tps: number; reliability: number },
        tx?: ITransaction,
    ): void;
    markProviderOffline(provider: string, reason: string, tx?: ITransaction): void;
    resetRuntime(tx?: ITransaction): void;
    resetMetrics(tx?: ITransaction): void;
    getHealthEvents(provider?: string, limit?: number): HealthEvent[];
    getProviderRankings(catalogProviders?: string[]): ProviderRanking[];
    getCollaborativeSuggestions(
        installedProviders?: string[],
    ): Array<{ provider: string; reason: string; matchScore: number }>;
}

export interface IBootstrap {
    init(): Promise<{
        phase: string;
        started: number;
        completed: number;
        duration: number;
        error: string | null;
        services: { name: string; status: string; error?: string }[];
    }>;
    getReport(): {
        phase: string;
        started: number;
        completed: number;
        duration: number;
        error: string | null;
        services: { name: string; status: string; error?: string }[];
    };
    getPhase(): string;
    isReady(): boolean;
    shutdown(): Promise<void>;
}

export interface IKeyService {
    init(): Promise<void>;
    destroy(): void;
    getKeys(): ApiKey[];
    getKey(id: string): ApiKey | undefined;
    getKeysByProvider(provider: string): ApiKey[];
    getActiveKeys(): ApiKey[];
    getPoolKeys(provider: string): ApiKey[];
    getDefaultKeys(): ApiKey[];
    addKey(data: Omit<ApiKey, 'id' | 'stats'>): Promise<ApiKey | undefined>;
    removeKey(id: string): Promise<void>;
    updateKey(id: string, data: Partial<ApiKey>): void;
    selectFromPool(provider: string, strategy?: PoolStrategy): ApiKey | null;
    selectWithBurst(provider: string, strategy?: PoolStrategy): ApiKey | null;
    recordUsage(
        keyIdOrProvider: string,
        latency: number,
        tokens?: number,
        model?: string,
        extra?: Record<string, unknown>,
    ): void;
    handleProviderError(keyId: string, error: string): void;
    updateKeyStatus(id: string, status: ApiKey['status'], latency?: number): void;
    canUseKey(id: string): { can: boolean; reason?: string };
    isKeyInBackoff(keyId: string): { backoff: boolean; remainingMs: number };
    isProviderCircuitOpen(provider: string): boolean;
    isProviderRateLimited(provider: string): boolean;
    updateAvailableModels(id: string, models: string[]): void;
    setLatencyThreshold(threshold: number): Promise<void>;
    clearAllData(): Promise<void>;
}

export interface IRouterService {
    init(): Promise<void>;
    destroy(): void;
    getRankedProviders(
        strategy: string,
        prompt: string,
        priority?: string,
        agentId?: string,
        probeResults?: Map<string, unknown>,
        overrideState?: SystemState,
        suppressEmit?: boolean,
        origin?: string,
        sessionId?: string,
    ): ApiKey[];
    getRaceCandidateDetails(
        prompt: string,
    ): Array<{ provider: string; model: string; keyId: string }>;
    getDeepDowngradedModel(model: string, levels: number): string | null;
    getDowngradedModel(model: string): string | null;
    getDowngradeChain(model: string): string[];
    getActiveProfile(): {
        name: string;
        ttft: number;
        tps: number;
        reliability: number;
        description?: string;
    };
    getConfig(): Record<string, unknown>;
    updateConfig(partial: Record<string, unknown>): Promise<void>;
    getProfileNames(): string[];
    setActiveProfile(name: string): Promise<boolean>;
    updateActiveProfileWeights(weights: {
        ttft: number;
        tps: number;
        reliability: number;
    }): Promise<void>;
    getProviderAvgLatency(provider: string): number;
    classifyRequest(prompt: string): {
        complexity: string;
        isCode: boolean;
        isLong: boolean;
        isMultimodal: boolean;
        intent: string;
        language: string;
    };
    trySelectProvider(
        prompt: string,
    ): Result<
        { provider: string; model: string; confidence: number; reasoning: string },
        { code: string; message: string }
    >;
    getSelectionTrace(keyId?: string): readonly unknown[];
    stopMonitoring(): void;
}

export type KernelDeps = {
    eventBus: IEventBus;
    database: IDatabaseService;
    providerTracker: IProviderTracker;
};

export type HealthEventType =
    'latency_spike' | 'error_burst' | 'status_change' | 'rate_limit' | 'recovery';

export interface HealthEvent {
    provider: string;
    type: HealthEventType;
    detail: string;
    timestamp: number;
}

export type ProviderRanking = {
    provider: string;
    score: number;
    reliability: number;
    avgLatency: number;
    requests: number;
    costPerRequest: number;
    recommendation: 'recommended' | 'good' | 'fair' | 'avoid';
    installed: boolean;
};

export interface KeyEntry {
    id: string;
    provider: string;
    label?: string;
    status?: string;
    latency?: number;
    model?: string;
    stats?: {
        extended?: {
            usageToday?: { requests: number; tokens: number };
            rules?: { quota?: { requestsPerDay: number; tokensPerDay: number } };
            errorBreakdown?: { rateLimit?: number };
            rateLimitPressure?: number;
        };
    };
}

export interface AlertEntry {
    keyId: string;
    message: string;
    timestamp?: number;
    type?: string;
}

export interface IProviderTracker {
    start(eventBus: IEventBus): void;
    getHealthEvents(provider?: string, limit?: number): HealthEvent[];
    getMetrics(
        provider: string,
        keyId: string,
    ): {
        errors: number;
        totalRequests: number;
        avgLatency: number;
        quotaRemaining: number;
        quotaLimit: number;
        reputation: number;
        lastUsed: number;
    } | null;
    getProviderRankings(catalogProviders?: string[]): ProviderRanking[];
    getCollaborativeSuggestions(
        installedProviders?: string[],
    ): Array<{ provider: string; reason: string; matchScore: number }>;
    destroy(): void;
}
