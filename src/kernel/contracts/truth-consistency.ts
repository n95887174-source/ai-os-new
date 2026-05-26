export type DriftSeverity = 'match' | 'minor' | 'major' | 'critical';

export interface DriftEntry {
  provider: string;
  field: string;
  kernelValue: number | string;
  projectionValue: number | string;
  severity: DriftSeverity;
}

export interface ConsistencyReport {
  status: 'OK' | 'DRIFT' | 'CRITICAL';
  driftScore: number;
  mismatches: DriftEntry[];
  checkedAt: number;
  providerCount: number;
}

export interface ITruthConsistencyMonitor {
  /** Compare kernel state vs projection-derived metrics */
  check(
    kernelProviders: Record<string, { avgTTFT: number; reliability: number; status: string }>,
    projectionKeyStates: Record<string, unknown>,
  ): ConsistencyReport;
}
