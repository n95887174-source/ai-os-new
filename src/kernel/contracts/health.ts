import type { Result } from './results';
import type { ProviderError } from './errors';

export interface HealthCheckResult {
  keyId: string;
  provider: string;
  status: 'active' | 'error';
  latency: number;
  timestamp: number;
  models?: string[];
  error?: string;
}

export interface HealthSummary {
  total: number;
  active: number;
  error: number;
  checking: number;
  inactive: number;
  avgLatency: number;
  lastRun: number;
  results: HealthCheckResult[];
}

export interface IHealthService {
  setCheckInterval(ms: number): void;
  destroy(): void;
  getResult(keyId: string): HealthCheckResult | undefined;
  getAllResults(): HealthCheckResult[];
  getSummary(): HealthSummary;
  checkAll(): Promise<void>;
  checkKey(keyId: string): Promise<HealthCheckResult | null>;
  startScheduledChecks(): void;
  stopScheduledChecks(): void;
  tryCheckKey?(keyId: string): Result<HealthCheckResult, ProviderError>;
  tryCheckAll?(): Result<void, ProviderError>;
}
