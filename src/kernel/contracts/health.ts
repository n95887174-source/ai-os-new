import type { Result } from './results';
import type { ProviderError } from './errors';

export interface KeyHealthCheckResult {
  keyId: string;
  provider: string;
  status: 'active' | 'error';
  latency: number;
  timestamp: number;
  models?: string[];
  error?: string;
}

export interface KeyHealthSummary {
  total: number;
  active: number;
  error: number;
  checking: number;
  inactive: number;
  avgLatency: number;
  lastRun: number;
  results: KeyHealthCheckResult[];
}

export interface IHealthService {
  setCheckInterval(ms: number): void;
  destroy(): void;
  getResult(keyId: string): KeyHealthCheckResult | undefined;
  getAllResults(): KeyHealthCheckResult[];
  getSummary(): KeyHealthSummary;
  checkAll(): Promise<void>;
  checkKey(keyId: string): Promise<KeyHealthCheckResult | null>;
  startScheduledChecks(): void;
  stopScheduledChecks(): void;
  tryCheckKey?(keyId: string): Result<KeyHealthCheckResult, ProviderError>;
  tryCheckAll?(): Result<void, ProviderError>;
}
