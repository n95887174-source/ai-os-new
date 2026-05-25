import type { ProbeResult } from './probe';

export type KeyStatus = 'ready' | 'limited' | 'broken' | 'degraded' | 'unknown';

export interface KeyProbeSnapshot {
  status: KeyStatus;
  latency: number;
  error?: string;
  errorCode?: number;
  timestamp: number;
}

export interface KeyHealthSnapshot {
  errorRate: number;
  successRate: number;
  consecutiveErrors: number;
  lastSuccessAt?: number;
}

export interface KeyQuotaSnapshot {
  usedTokens: number;
  limitTokens: number;
  usedRequests: number;
  limitRequests: number;
  resetAt?: number;
}

export interface KeyRoutingState {
  weight: number;
  blocked: boolean;
}

export interface KeyState {
  id: string;
  status: KeyStatus;
  provider: string;
  label: string;
  model?: string;
  lastProbe: KeyProbeSnapshot;
  health: KeyHealthSnapshot;
  quota: KeyQuotaSnapshot;
  routing: KeyRoutingState;
  flags: {
    circuitOpen: boolean;
    rateLimited: boolean;
    authFailed: boolean;
  };
  updatedAt: number;
}

export type KeyStateEvent = 'keystate:updated' | 'keystate:removed';

export interface IKeyStateStore {
  get(id: string): KeyState | undefined;
  getAll(): KeyState[];
  getReady(): KeyState[];
  getForRouting(): KeyState[];
  update(id: string, patch: Partial<KeyState>): void;
  remove(id: string): void;
  ingestProbe(id: string, result: ProbeResult): void;
  on(cb: (event: { type: KeyStateEvent; id: string; state?: KeyState }) => void): () => void;
}
