import type { KeyState } from '../../contracts/key-state';
import type { ProjectedKeyState } from './key-state-projection';

export interface DiffEntry {
  keyId: string;
  field: string;
  legacy: unknown;
  projection: unknown;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface DiffReport {
  driftScore: number;
  totalKeys: number;
  matchedKeys: number;
  missingInProjection: string[];
  missingInLegacy: string[];
  mismatches: DiffEntry[];
  criticalCount: number;
}

const CRITICAL_FIELDS = new Set(['status', 'rateLimited', 'authFailed']);
const HIGH_FIELDS = new Set(['quotaUsed', 'latency']);
const QUOTA_TOLERANCE = 0.1;

export function compareKeyState(
  legacyKeys: KeyState[],
  projectionMap: Map<string, ProjectedKeyState>,
): DiffReport {
  const mismatches: DiffEntry[] = [];
  const missingInProjection: string[] = [];
  const missingInLegacy: string[] = [];

  const projectedIds = new Set(projectionMap.keys());
  const legacyMap = new Map(legacyKeys.map(k => [k.id, k]));

  for (const [legacyId, legacy] of legacyMap) {
    const projected = projectionMap.get(legacyId);
    if (!projected) {
      missingInProjection.push(legacyId);
      continue;
    }

    compareField(mismatches, legacyId, 'status', legacy.status, projected.status, CRITICAL_FIELDS);
    compareField(mismatches, legacyId, 'latency', legacy.lastProbe.latency, projected.latency, HIGH_FIELDS);
    compareField(mismatches, legacyId, 'rateLimited', legacy.flags.rateLimited, projected.rateLimited, CRITICAL_FIELDS);
    compareField(mismatches, legacyId, 'authFailed', legacy.flags.authFailed, projected.authFailed, CRITICAL_FIELDS);

    if (Math.abs(legacy.quota.usedTokens - projected.quotaUsed) / (legacy.quota.limitTokens || 1) > QUOTA_TOLERANCE) {
      mismatches.push({
        keyId: legacyId,
        field: 'quotaUsed',
        legacy: legacy.quota.usedTokens,
        projection: projected.quotaUsed,
        severity: 'high',
      });
    }
  }

  for (const projId of projectedIds) {
    if (!legacyMap.has(projId)) {
      missingInLegacy.push(projId);
    }
  }

  const criticalCount = mismatches.filter(m => m.severity === 'critical').length;
  const totalKeys = Math.max(legacyKeys.length, projectedIds.size);
  const matchedKeys = totalKeys - missingInProjection.length - missingInLegacy.length;
  const driftScore = totalKeys > 0
    ? Math.round((criticalCount * 30 + mismatches.length * 10) / Math.max(totalKeys, 1))
    : 0;

  return {
    driftScore: Math.min(100, driftScore),
    totalKeys,
    matchedKeys,
    missingInProjection,
    missingInLegacy,
    mismatches,
    criticalCount,
  };
}

function compareField(
  mismatches: DiffEntry[],
  keyId: string,
  field: string,
  legacy: unknown,
  projection: unknown,
  severityMap: Set<string>,
): void {
  if (String(legacy) !== String(projection)) {
    mismatches.push({
      keyId,
      field,
      legacy,
      projection,
      severity: severityMap.has(field) ? 'critical' : 'medium',
    });
  }
}
