import type { Result } from './results';
import type { ProviderError } from './errors';

/**
 * Canonical system-level health status. Single source of truth.
 * Used across all observability contracts, state, events, and services.
 */
export type CanonicalHealthStatus = 'healthy' | 'degraded' | 'critical';

/**
 * Map binary check results (active/error) to CanonicalHealthStatus.
 */
export function checkToHealth(ok: boolean): CanonicalHealthStatus {
  return ok ? 'healthy' : 'critical';
}

export function normalizeHealthStatus(status: string | boolean | null | undefined): CanonicalHealthStatus {
  if (typeof status === 'boolean') return checkToHealth(status);
  const value = String(status ?? '').toLowerCase();
  if (value === 'healthy' || value === 'active' || value === 'online' || value === 'ok' || value === 'ready') {
    return 'healthy';
  }
  if (value === 'degraded' || value === 'unstable' || value === 'warning' || value === 'checking') {
    return 'degraded';
  }
  return 'critical';
}

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
