import type { ApiKey } from '../types/metrics-types';

export type ProviderFleetStatus =
  | 'no_adapter'
  | 'unconfigured'
  | 'ready'
  | 'degraded'
  | 'broken';

export interface ProviderFleetSummary {
  status: ProviderFleetStatus;
  readyCount: number;
  totalCount: number;
  hint?: string;
}

const BROKEN_STATUSES = new Set<ApiKey['status']>([
  'error',
  'invalid',
  'quarantined',
  'compromised',
  'duplicate',
]);

const DEGRADED_STATUSES = new Set<ApiKey['status']>([
  'quota_exhausted',
  'probation',
  'inactive',
  'checking',
  'pending',
]);

function isReadyKey(key: ApiKey): boolean {
  return key.status === 'active';
}

export function summarizeProviderFleet(
  providerId: string,
  keys: ApiKey[],
  hasAdapter: boolean,
): ProviderFleetSummary {
  if (!hasAdapter) {
    return { status: 'no_adapter', readyCount: 0, totalCount: 0, hint: 'No adapter registered' };
  }

  const providerKeys = keys.filter(
    (k) => k.provider.toLowerCase() === providerId.toLowerCase(),
  );
  if (providerKeys.length === 0) {
    return { status: 'unconfigured', readyCount: 0, totalCount: 0, hint: 'Add an API key to enable' };
  }

  const readyCount = providerKeys.filter(isReadyKey).length;
  const brokenCount = providerKeys.filter((k) => BROKEN_STATUSES.has(k.status)).length;
  const degradedCount = providerKeys.filter((k) => DEGRADED_STATUSES.has(k.status)).length;

  if (readyCount > 0) {
    return {
      status: readyCount === providerKeys.length ? 'ready' : 'degraded',
      readyCount,
      totalCount: providerKeys.length,
      hint: readyCount === providerKeys.length
        ? 'All keys healthy'
        : `${readyCount}/${providerKeys.length} keys active`,
    };
  }

  if (brokenCount === providerKeys.length) {
    return {
      status: 'broken',
      readyCount: 0,
      totalCount: providerKeys.length,
      hint: 'All keys failed — re-probe or replace keys',
    };
  }

  return {
    status: 'degraded',
    readyCount: 0,
    totalCount: providerKeys.length,
    hint: degradedCount > 0
      ? 'Keys limited or exhausted — check probe results'
      : 'No active keys — run Quick Test',
  };
}

export function summarizeAllProviders(
  providerIds: string[],
  keys: ApiKey[],
  hasAdapter: (id: string) => boolean,
): Map<string, ProviderFleetSummary> {
  const map = new Map<string, ProviderFleetSummary>();
  for (const id of providerIds) {
    map.set(id.toLowerCase(), summarizeProviderFleet(id, keys, hasAdapter(id)));
  }
  return map;
}
