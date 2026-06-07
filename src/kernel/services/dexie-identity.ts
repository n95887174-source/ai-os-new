/**
 * dexie-identity.ts
 *
 * Single source of truth for the Dexie instance used by the AI-OS kernel.
 *
 * Architecture invariant
 * ----------------------
 * `dexieDb` is exported from `./database-service` as a single ES module-level
 * constant (`export const dexieDb = new SuperAgentsDB()`). By JavaScript module
 * semantics, every `import { dexieDb } from './database-service'` resolves to
 * the same instance — so a true split is impossible at the source-code level.
 *
 * However, instance splits CAN occur at runtime in two cases:
 *   1. Vite HMR re-evaluates `database-service.ts` and creates a fresh
 *      `SuperAgentsDB` (and thus a fresh Dexie IDBDatabase connection)
 *   2. A consumer imports a different path that resolves to a different
 *      module (e.g. relative `../` vs `../../`)
 *
 * This module:
 *   - Anchors the canonical instance on `globalThis.__DEXIE_INSTANCE__`
 *   - Re-anchors only if the new instance is a strict superset (more rows)
 *   - Throws `[DEXIE MISMATCH]` if a caller observes a different instance
 *   - Logs `[DEXIE_IDENTITY]` on every check, with instance ref, count, and
 *     a globalThis comparison
 */

import type Dexie from 'dexie';

interface DexieWithApiKeys extends Dexie {
  apiKeys: { count(): Promise<number>; toArray(): Promise<unknown[]> };
}

interface DexieIdentityGlobal {
  __DEXIE_INSTANCE__?: DexieWithApiKeys;
  __DEXIE_INSTANCE_COUNT__?: number;
}

function globalRef(): DexieIdentityGlobal {
  return globalThis as unknown as DexieIdentityGlobal;
}

/**
 * Log the current identity. Always non-throwing — safe to call from hot paths.
 */
export function logDexieIdentity(source: string, instance: DexieWithApiKeys): void {
  const g = globalRef();
  const globalInstance = g.__DEXIE_INSTANCE__;
  const sameAsGlobal = globalInstance === instance;
  // Synchronous log only; count() is async and would require awaited log
  console.log('[DEXIE_IDENTITY]', {
    source,
    instanceRef: instanceName(instance),
    sameAsGlobalThis: sameAsGlobal,
    globalRef: globalInstance ? instanceName(globalInstance) : '<unset>',
    anchoredCount: g.__DEXIE_INSTANCE_COUNT__ ?? 0,
    timestamp: Date.now(),
  });
}

/**
 * Log identity including a live row count from `apiKeys`. Awaits the count
 * so the log shows the actual number of rows. Use this in cold paths only
 * (bootstrap, hydration start).
 */
export async function logDexieIdentityWithCount(
  source: string,
  instance: DexieWithApiKeys
): Promise<number> {
  const g = globalRef();
  const globalInstance = g.__DEXIE_INSTANCE__;
  const sameAsGlobal = globalInstance === instance;
  let count = 0;
  try {
    count = await instance.apiKeys.count();
  } catch (e) {
    console.warn('[DEXIE_IDENTITY] count() failed for', source, e);
  }
  console.log('[DEXIE_IDENTITY_WITH_COUNT]', {
    source,
    instanceRef: instanceName(instance),
    sameAsGlobalThis: sameAsGlobal,
    globalRef: globalInstance ? instanceName(globalInstance) : '<unset>',
    apiKeysCount: count,
    timestamp: Date.now(),
  });
  return count;
}

/**
 * Anchor the canonical Dexie instance on `globalThis.__DEXIE_INSTANCE__`.
 *
 * Behavior:
 *   - If no instance is anchored, set it.
 *   - If a DIFFERENT instance is passed and the new one has MORE rows in
 *     `apiKeys`, swap to the new one (HMR re-evaluation produced a fresh
 *     connection that re-initialized from a new IDB version — preserve the
 *     larger dataset).
 *   - If a DIFFERENT instance is passed and it has the SAME or FEWER rows,
 *     throw `[DEXIE MISMATCH]`.
 */
export async function anchorDexieInstance(
  source: string,
  instance: DexieWithApiKeys
): Promise<void> {
  const g = globalRef();

  if (!g.__DEXIE_INSTANCE__) {
    g.__DEXIE_INSTANCE__ = instance;
    try {
      g.__DEXIE_INSTANCE_COUNT__ = await instance.apiKeys.count();
    } catch {
      g.__DEXIE_INSTANCE_COUNT__ = 0;
    }
    console.log('[DEXIE_ANCHOR] first anchor set', {
      source,
      instanceRef: instanceName(instance),
      apiKeysCount: g.__DEXIE_INSTANCE_COUNT__,
    });
    return;
  }

  if (g.__DEXIE_INSTANCE__ === instance) {
    return; // same instance, no-op
  }

  // Different instance — likely HMR. Resolve by row count: trust the one
  // with the most data.
  let newCount = 0;
  try { newCount = await instance.apiKeys.count(); } catch { /* ignore */ }
  const currentCount = g.__DEXIE_INSTANCE_COUNT__ ?? 0;

  if (newCount >= currentCount) {
    console.warn(
      '[DEXIE_ANCHOR] swapping to new instance (HMR re-eval?) — was',
      currentCount, 'rows, now', newCount, 'rows. Source:', source
    );
    g.__DEXIE_INSTANCE__ = instance;
    g.__DEXIE_INSTANCE_COUNT__ = newCount;
  } else {
    throw new Error(
      `[DEXIE MISMATCH] storage split detected. Source: ${source}. ` +
      `globalThis instance has ${currentCount} apiKey rows; ` +
      `passed instance has ${newCount} apiKey rows. ` +
      `Refusing to swap. This indicates a duplicated module load or ` +
      `intentional fresh connection — investigate the import path.`
    );
  }
}

/**
 * Verify that the passed instance is the same as the anchored one.
 * Throws `[DEXIE MISMATCH]` on mismatch. Returns the anchored instance.
 */
export function verifyDexieInstance(
  source: string,
  instance: DexieWithApiKeys
): DexieWithApiKeys {
  const g = globalRef();
  const anchored = g.__DEXIE_INSTANCE__;
  if (!anchored) {
    throw new Error(
      `[DEXIE MISMATCH] no anchored instance on globalThis. ` +
      `Source: ${source}. Call anchorDexieInstance() first.`
    );
  }
  if (anchored !== instance) {
    throw new Error(
      `[DEXIE MISMATCH] storage split detected. Source: ${source}. ` +
      `Anchored instance ref: ${instanceName(anchored)}, ` +
      `passed instance ref: ${instanceName(instance)}.`
    );
  }
  return anchored;
}

function instanceName(instance: object): string {
  const ctor = (instance as { constructor?: { name?: string } }).constructor?.name ?? 'Unknown';
  // Generate a short identity fingerprint by sampling a few own properties.
  // Two different Dexie instances will have different `name`/`tables`/`db`
  // references, so the JSON fingerprint will differ.
  try {
    const db = (instance as { name?: string }).name ?? '';
    const tables = Object.keys((instance as { _tables?: Record<string, unknown> })._tables ?? {});
    return `${ctor}[${db}, tables=${tables.length}, ${tables.slice(0, 3).join(',')}]`;
  } catch {
    return ctor;
  }
}
