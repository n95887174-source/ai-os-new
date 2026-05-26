import type { ISystemStatusService, SystemStatusReport, SystemStatusValue } from '../contracts/system-status';
import type { IGroupManager } from '../contracts/group-manager';
import type { IKeyStateStore } from '../contracts/key-state';
import type { KeyService } from './key-management/key-service';

export interface SystemStatusServiceDeps {
  groupManager: IGroupManager;
  keyService: KeyService;
  keyStateStore?: IKeyStateStore;
}

/**
 * Computes system status from live data — never stores state, never introduces new truth.
 * Aggregates GroupManager.ready, key count, passport coverage, and projection sync.
 */
export class SystemStatusService implements ISystemStatusService {
  private deps: SystemStatusServiceDeps;

  constructor(deps: SystemStatusServiceDeps) {
    this.deps = deps;
  }

  getStatus(): SystemStatusReport {
    const { groupManager, keyService, keyStateStore } = this.deps;
    const warnings: string[] = [];

    // Area: GroupManager
    const gmReady = groupManager.ready;
    const areaGroupManager: 'ready' | 'loading' = gmReady ? 'ready' : 'loading';

    // Area: Keys
    const allKeys = gmReady ? groupManager.getAllKeys() : [];
    const rawKeys = keyService.getKeys();
    const totalKeys = allKeys.length;
    const totalRawKeys = rawKeys.length;
    const activeKeys = allKeys.filter(k => k.status === 'active').length;
    const brokenKeys = allKeys.filter(k => k.status === 'error' || k.status === 'broken').length;

    let areaKeys: 'populated' | 'empty' | 'partial' | 'degraded';
    if (totalKeys === 0) {
      areaKeys = 'empty';
    } else if (brokenKeys === totalKeys) {
      areaKeys = 'degraded';
    } else if (activeKeys < totalKeys) {
      areaKeys = 'partial';
    } else {
      areaKeys = 'populated';
    }

    // Area: Passports
    let passportsFullCoverage = 0;
    for (const k of rawKeys) {
      if (groupManager.getPassport(k.id)) passportsFullCoverage++;
    }
    let areaPassports: 'full' | 'partial' | 'missing';
    if (totalRawKeys === 0) {
      areaPassports = 'missing';
    } else if (passportsFullCoverage === totalRawKeys) {
      areaPassports = 'full';
    } else if (passportsFullCoverage > 0) {
      areaPassports = 'partial';
      warnings.push(`${totalRawKeys - passportsFullCoverage} key(s) without passport`);
    } else {
      areaPassports = 'missing';
      warnings.push('No keys have passports');
    }

    // Area: Projections
    let areaProjections: 'synced' | 'stale' | 'unavailable';
    const projSnapshot = keyStateStore?.getAll();
    if (!projSnapshot) {
      areaProjections = 'unavailable';
    } else if (projSnapshot.length === totalKeys) {
      areaProjections = 'synced';
    } else {
      areaProjections = 'stale';
      warnings.push(`Projection has ${projSnapshot.length} entries, expected ${totalKeys}`);
    }

    // Overall status
    let status: SystemStatusValue;
    let summary: string;

    if (!gmReady) {
      status = 'LOADING';
      summary = 'System initializing — GroupManager not ready';
    } else if (totalKeys === 0) {
      status = 'EMPTY';
      summary = 'No API keys configured';
    } else if (areaPassports === 'missing' || areaKeys === 'degraded') {
      status = 'DEGRADED';
      summary = `System running with issues: ${warnings.length} warning(s)`;
    } else if (areaPassports === 'partial' || areaProjections === 'stale') {
      status = 'DEGRADED';
      summary = `System partially consistent: ${warnings.length} warning(s)`;
    } else {
      status = 'READY';
      summary = `${totalKeys} key(s), ${activeKeys} active, all passports synced`;
    }

    return {
      status,
      summary,
      areas: {
        groupManager: areaGroupManager,
        keys: areaKeys,
        passports: areaPassports,
        projections: areaProjections,
      },
      warnings,
      timestamp: Date.now(),
    };
  }
}
