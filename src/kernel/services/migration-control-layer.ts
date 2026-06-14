/**
 * Storage Migration Control Layer
 * 
 * Manages the transition from StorageAdapter (legacy) to DAL.
 * 
 * PHASES:
 * 1. INVENTORY LOCK   — No new StorageAdapter usage, visibility layer active
 * 2. DUAL-READ        — Read from both sources, prefer DAL
 * 3. DUAL-WRITE       — Write to both sources (forward migration)
 * 4. CUTOVER          — Delete legacy when DAL has all data
 * 
 * ARCHITECTURE:
 * 
 *   Service Request
 *        │
 *        ▼
 *   StorageAdapter
 *        │
 *        ▼
 *   ┌─────────────────────────────────────┐
 *   │      MigrationControlLayer           │
 *   │                                     │
 *   │  hasNamespace(ns) ?                 │
 *   │    ├── YES → DAL (migrated)         │
 *   │    └── NO  → Legacy StorageAdapter  │
 *   │                                     │
 *   └─────────────────────────────────────┘
 *        │
 *        ▼
 *   Data Returned
 * 
 * USAGE:
 *   const mcl = getMigrationControlLayer();
 *   await mcl.migrateNamespace('research-scheduler');
 *   const status = await mcl.getMigrationStatus();
 */

import type { DataAccessLayer } from '../dal/types';

// =============================================================================
// Namespace Registry — tracks migration state per namespace
// =============================================================================

export type MigrationPhase = 'legacy' | 'dual-read' | 'dual-write' | 'migrated' | 'cutover';

export interface NamespaceMigrationState {
  namespace: string;
  phase: MigrationPhase;
  dalReady: boolean;
  legacyKeyCount: number;
  dalKeyCount: number;
  lastMigratedAt: number | null;
  migratedBy: string; // 'auto' | 'manual'
}

/** Namespace registry — stored in localStorage for persistence */
const REGISTRY_KEY = 'superagents:migration:registry';

class NamespaceRegistry {
  private states: Map<string, NamespaceMigrationState> = new Map();
  private initialized = false;

  private async ensureInit(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const raw = localStorage.getItem(REGISTRY_KEY);
      if (raw) {
        const data = JSON.parse(raw) as NamespaceMigrationState[];
        for (const state of data) {
          this.states.set(state.namespace, state);
        }
      }
    } catch {
      // ignore, start fresh
    }
    this.initialized = true;
  }

  private async persist(): Promise<void> {
    const data = Array.from(this.states.values());
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(data));
  }

  async getState(namespace: string): Promise<NamespaceMigrationState | null> {
    await this.ensureInit();
    return this.states.get(namespace) || null;
  }

  async setState(state: NamespaceMigrationState): Promise<void> {
    await this.ensureInit();
    this.states.set(state.namespace, state);
    await this.persist();
  }

  async getAllStates(): Promise<NamespaceMigrationState[]> {
    await this.ensureInit();
    return Array.from(this.states.values());
  }

  async markMigrated(namespace: string, dalKeyCount: number): Promise<void> {
    await this.setState({
      namespace,
      phase: 'migrated',
      dalReady: true,
      legacyKeyCount: 0,
      dalKeyCount,
      lastMigratedAt: Date.now(),
      migratedBy: 'auto',
    });
  }

  async markCutover(namespace: string): Promise<void> {
    const state = await this.getState(namespace);
    if (state) {
      state.phase = 'cutover';
      await this.persist();
    }
  }
}

export const namespaceRegistry = new NamespaceRegistry();

// =============================================================================
// Migration Control Layer
// =============================================================================

export interface MigrationControlLayer {
  /** Check if namespace is migrated to DAL */
  hasNamespace(namespace: string): Promise<boolean>;
  
  /** Get migration status for all namespaces */
  getMigrationStatus(): Promise<NamespaceMigrationState[]>;
  
  /** Migrate a single namespace (dual-write phase) */
  migrateNamespace(namespace: string): Promise<void>;
  
  /** Run automatic migration for all pending namespaces */
  runAutoMigration(): Promise<MigrationReport>;
  
  /** Check if namespace is ready for cutover */
  isCutoverReady(namespace: string): Promise<boolean>;
  
  /** Perform cutover (delete legacy, DAL only) */
  cutoverNamespace(namespace: string): Promise<void>;
  
  /** Get namespace stats */
  getNamespaceStats(namespace: string): Promise<{
    legacyKeys: number;
    dalKeys: number;
    phase: MigrationPhase;
  }>;
}

export interface MigrationReport {
  totalNamespaces: number;
  migratedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: string[];
  durationMs: number;
}

// =============================================================================
// DAL Registry — maps namespace to DAL repository
// =============================================================================

/** Maps StorageAdapter namespace to DAL repository */
const DAL_NAMESPACE_MAP: Record<string, keyof DataAccessLayer> = {
  // Core domains already in DAL
  'memory': 'memory',
  'sessions': 'session',
  'api-keys': 'keys',
  'key-notes': 'notes',
  'roles': 'roles',
  'debate-sessions': 'debate',
  'traces': 'trace',
  'cognitive': 'cognitive',
  
  // Note: These don't have DAL equivalents yet
  // 'research-scheduler': '???',
  // 'personas': '???',
  // etc.
};

/** Check if namespace has DAL equivalent */
function hasDalEquivalent(namespace: string): boolean {
  return namespace in DAL_NAMESPACE_MAP;
}

// =============================================================================
// Migration Control Layer Implementation
// =============================================================================

export function createMigrationControlLayer(dal: DataAccessLayer): MigrationControlLayer {
  const registry = namespaceRegistry;

  async function getNamespaceStats(namespace: string): Promise<{
    legacyKeys: number;
    dalKeys: number;
    phase: MigrationPhase;
  }> {
    const state = await registry.getState(namespace);
    
    // Count legacy keys
    let legacyKeys = 0;
    const prefix = `superagents:${namespace}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) legacyKeys++;
    }
    
    // Count DAL keys (if repo exists)
    let dalKeys = 0;
    const dalRepoName = DAL_NAMESPACE_MAP[namespace];
    if (dalRepoName && dal[dalRepoName]) {
      // Repository may have count() method
      const repo = dal[dalRepoName] as { getAll?: () => Promise<unknown[]> };
      if (repo.getAll) {
        const all = await repo.getAll();
        dalKeys = all.length;
      }
    }
    
    return {
      legacyKeys,
      dalKeys,
      phase: state?.phase || 'legacy',
    };
  }

  return {
    async hasNamespace(namespace: string): Promise<boolean> {
      const state = await registry.getState(namespace);
      return state?.dalReady ?? false;
    },

    async getMigrationStatus(): Promise<NamespaceMigrationState[]> {
      return registry.getAllStates();
    },

    async migrateNamespace(namespace: string): Promise<void> {
      const stats = await getNamespaceStats(namespace);
      const dalRepoName = DAL_NAMESPACE_MAP[namespace];
      const dalRepo = dalRepoName ? dal[dalRepoName] : undefined;
      
      // Copy data from localStorage to DAL
      let migratedCount = 0;
      if (dalRepo) {
        const prefix = `superagents:${namespace}:`;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k || !k.startsWith(prefix)) continue;
          try {
            const raw = localStorage.getItem(k);
            if (!raw) continue;
            const value = JSON.parse(raw);
            if ('save' in (dalRepo as object)) {
              await (dalRepo as { save: (v: unknown) => Promise<void> }).save(value);
            } else if ('store' in (dalRepo as object)) {
              await (dalRepo as { store: (v: unknown) => Promise<unknown> }).store(value);
            }
            migratedCount++;
          } catch (e) {
            console.warn(`[Migration] Failed to migrate key "${k}":`, e);
          }
        }
      }
      
      await registry.setState({
        namespace,
        phase: 'dual-write',
        dalReady: hasDalEquivalent(namespace),
        legacyKeyCount: stats.legacyKeys,
        dalKeyCount: migratedCount,
        lastMigratedAt: Date.now(),
        migratedBy: 'manual',
      });
      
      console.log(`[Migration] Namespace '${namespace}' entered dual-write phase (migrated ${migratedCount} keys)`);
    },

    async runAutoMigration(): Promise<MigrationReport> {
      const start = Date.now();
      const errors: string[] = [];
      let migratedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      
      // Get all known storage buckets
      const { KNOWN_BUCKETS } = await import('./storage-adapter');

      for (const namespace of KNOWN_BUCKETS) {
        const state = await registry.getState(namespace);
        
        // Skip already migrated or cutover
        if (state?.phase === 'migrated' || state?.phase === 'cutover') {
          skippedCount++;
          continue;
        }
        
        // Auto-migrate namespaces with DAL equivalents
        if (hasDalEquivalent(namespace)) {
          try {
            const stats = await getNamespaceStats(namespace);
            const dalRepoName = DAL_NAMESPACE_MAP[namespace];
            const dalRepo = dalRepoName ? dal[dalRepoName] : undefined;
            
            // If legacy has data and DAL is empty, migrate
            if (stats.legacyKeys > 0 && stats.dalKeys === 0) {
              let migratedCountThis = 0;
              if (dalRepo) {
                const prefix = `superagents:${namespace}:`;
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (!k || !k.startsWith(prefix)) continue;
                  try {
                    const raw = localStorage.getItem(k);
                    if (!raw) continue;
                    const value = JSON.parse(raw);
                    if ('save' in (dalRepo as object)) {
                      await (dalRepo as { save: (v: unknown) => Promise<void> }).save(value);
                    } else if ('store' in (dalRepo as object)) {
                      await (dalRepo as { store: (v: unknown) => Promise<unknown> }).store(value);
                    }
                    migratedCountThis++;
                  } catch (e) {
                    console.warn(`[Migration] Failed to auto-migrate key "${k}":`, e);
                  }
                }
              }
              
              await registry.setState({
                namespace,
                phase: 'dual-write',
                dalReady: true,
                legacyKeyCount: stats.legacyKeys,
                dalKeyCount: migratedCountThis,
                lastMigratedAt: Date.now(),
                migratedBy: 'auto',
              });
              
              migratedCount++;
              console.log(`[Migration] Auto-migrated: ${namespace} (${migratedCountThis} keys)`);
            }
          } catch (e) {
            failedCount++;
            errors.push(`${namespace}: ${e instanceof Error ? e.message : String(e)}`);
          }
        } else {
          // No DAL equivalent yet, keep as legacy
          skippedCount++;
        }
      }
      
      return {
        totalNamespaces: KNOWN_BUCKETS.length,
        migratedCount,
        failedCount,
        skippedCount,
        errors,
        durationMs: Date.now() - start,
      };
    },

    async isCutoverReady(namespace: string): Promise<boolean> {
      const state = await registry.getState(namespace);
      if (!state || state.phase !== 'migrated') return false;
      
      const stats = await getNamespaceStats(namespace);
      return stats.legacyKeys === 0 && stats.dalKeys > 0;
    },

    async cutoverNamespace(namespace: string): Promise<void> {
      const ready = await this.isCutoverReady(namespace);
      if (!ready) {
        throw new Error(`Namespace '${namespace}' is not ready for cutover`);
      }
      
      await registry.markCutover(namespace);
      console.log(`[Migration] Cutover complete: ${namespace}`);
    },

    async getNamespaceStats(namespace: string) {
      return getNamespaceStats(namespace);
    },
  };
}

// =============================================================================
// Singleton instance (initialized in service-registration)
// =============================================================================

let _mcl: MigrationControlLayer | null = null;

export function initMigrationControlLayer(dal: DataAccessLayer): void {
  _mcl = createMigrationControlLayer(dal);
}

export function getMigrationControlLayer(): MigrationControlLayer {
  if (!_mcl) {
    throw new Error('MigrationControlLayer not initialized. Call initMigrationControlLayer() first.');
  }
  return _mcl;
}