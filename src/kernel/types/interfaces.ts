import type { SystemState } from './metrics-types';
import type { ICostCalculator } from '../contracts/pricing';
import type { ProviderState } from './metrics-types';
import type { EventMap } from './event-map';

export interface IEventBus {
  on<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): () => void;
  off<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): void;
  emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): void;
  onSafe<T>(event: string, callback: (data: T) => void): () => void;
  subscribeAll(callback: (payload: { event: string; data: Record<string, unknown> }) => void): () => void;
  reset(): void;
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
  getStatus(): { phase: string; uptime: number; startTime: number; servicesReady: number; servicesTotal: number; lastError: string | null; memoryUsage: number };
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
  setExplorationFactor(val: number): void;
  setSLAMode(mode: string): void;
  setBaseWeights(weights: { ttft: number; tps: number; reliability: number }): void;
  markProviderOffline(provider: string, reason: string): void;
  resetRuntime(): void;
  resetMetrics(): void;
  getHealthEvents(provider?: string, limit?: number): HealthEvent[];
  getProviderRankings(catalogProviders?: string[]): ProviderRanking[];
  getCollaborativeSuggestions(installedProviders?: string[]): Array<{ provider: string; reason: string; matchScore: number }>;
}

export interface IBootstrap {
  init(): Promise<{ phase: string; started: number; completed: number; duration: number; error: string | null; services: { name: string; status: string; error?: string }[] }>;
  getReport(): { phase: string; started: number; completed: number; duration: number; error: string | null; services: { name: string; status: string; error?: string }[] };
  getPhase(): string;
  isReady(): boolean;
  shutdown(): Promise<void>;
}

export interface IKeyService {
  init(): Promise<void>;
  destroy(): void;
}

export interface IRouterService {
  init(): Promise<void>;
  destroy(): void;
}

export type KernelDeps = {
  eventBus: IEventBus;
  database: IDatabaseService;
  providerTracker: IProviderTracker;
};

import type { HealthEvent } from '../services/provider-tracker';

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

export interface IProviderTracker {
  updateProviderMetric(state: SystemState, data: { provider: string; tokens?: number; fullContent?: string; latency: number; ttft?: number; model?: string }): void;
  updateProviderError(state: SystemState, data: { provider: string }): void;
  calculateSelectionRates(state: SystemState): void;
  getHealthEvents(provider?: string, limit?: number): HealthEvent[];
  getProviderRankings(state: SystemState, catalogProviders?: string[]): ProviderRanking[];
  getCollaborativeSuggestions(state: SystemState, installedProviders?: string[]): Array<{ provider: string; reason: string; matchScore: number }>;
  hydrateState?(state: SystemState): Promise<void>;
  persistProviderMetrics?(state: SystemState): void;
}
