import type { SystemState } from './metrics-types';
import type { ICostCalculator } from '../contracts/pricing';
import type { ProviderState } from './metrics-types';

export interface IEventBus {
  on<K extends string>(event: K, callback: (data: unknown) => void): () => void;
  off<K extends string>(event: K, callback: (data: unknown) => void): void;
  emit<K extends string>(event: K, data?: unknown): void;
  onSafe<T>(event: string, callback: (data: T) => void): () => void;
  subscribeAll(callback: (payload: { event: string; data: Record<string, unknown> }) => void): () => void;
  reset(): void;
}

export interface IDatabaseService {
  getKv<T>(id: string): Promise<T | null>;
  setKv<T>(id: string, value: T): Promise<void>;
  exportToJson(): Promise<Record<string, unknown[]>>;
  importFromJson(data: Record<string, unknown[]>): Promise<void>;
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

export interface IProviderTracker {
  updateProviderMetric(state: SystemState, data: { provider: string; tokens?: number; fullContent?: string; latency: number; ttft?: number; model?: string }): void;
  updateProviderError(state: SystemState, data: { provider: string }): void;
  calculateSelectionRates(state: SystemState): void;
  getHealthEvents(provider?: string, limit?: number): HealthEvent[];
}
