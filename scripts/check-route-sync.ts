/**
 * check-route-sync.ts — CI validation for Epic 8
 *
 * Since primary routes are generated from NAV_SECTIONS in routes.tsx at runtime,
 * this script validates:
 * 1. No duplicate nav IDs in the registry
 * 2. All nav IDs use valid URL-safe characters
 * 3. All static route paths in routes.tsx are known overrides
 * 4. No nav item ID collides with an override path
 *
 * Usage: npx tsx scripts/check-route-sync.ts
 * Exit code: 0 = all synced, 1 = issues found
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname!, '..');
function read(file: string): string {
  return readFileSync(resolve(ROOT, file), 'utf-8');
}

// Known override paths (routes without nav entries)
const KNOWN_OVERRIDES = new Set([
  '/',
  '/events',
  '/message-search',
  '/chat-export',
  '/debate-runtime',
  '/topic-suggester',
  '/debates/arena', '/debates/live', '/debates/replay',
  '/debates/tournament', '/debates/history', '/debates/analysis',
  '/debates/graph', '/debates/topics',
  '/diagnostics/logs', '/diagnostics/health', '/diagnostics/system',
  '/diagnostics/traces', '/diagnostics/memory', '/diagnostics/aquarium',
  '/services/keys', '/services/groups', '/services/connectors', '/services/mcp',
  '/chat-admin', '/timeline',
  '*',
]);

let exitCode = 0;

// ---- 1. Extract nav IDs from registry ----
const registry = read('src/routes.tsx');
const rawIds = [...registry.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
const navIds = rawIds.filter(id => !id.startsWith('section-'));
const navPaths = new Set(navIds.map(id => `/${id}`));

// ---- 2. Check for duplicate IDs ----
const seen = new Map<string, number>();
for (const id of navIds) {
  seen.set(id, (seen.get(id) ?? 0) + 1);
}
const dupes = [...seen.entries()].filter(([, c]) => c > 1).map(([id]) => id);
if (dupes.length > 0) {
  console.error(`ERROR: Duplicate nav IDs: ${dupes.join(', ')}`);
  exitCode = 1;
} else {
  console.log(`OK: No duplicate nav IDs (${navIds.length} unique).`);
}

// ---- 3. Check nav IDs are URL-safe ----
const badIds = navIds.filter(id => !/^[a-z][a-z0-9-]*$/.test(id));
if (badIds.length > 0) {
  console.error(`ERROR: Non-URL-safe nav IDs: ${badIds.join(', ')}`);
  exitCode = 1;
} else {
  console.log('OK: All nav IDs are URL-safe.');
}

// ---- 4. Check nav paths don't collide with override paths (would shadow) ----
const collisions = [...navPaths].filter(p => KNOWN_OVERRIDES.has(p));
if (collisions.length > 0) {
  console.error(`ERROR: Nav paths that shadow KNOWN_OVERRIDES: ${collisions.join(', ')}`);
  exitCode = 1;
} else {
  console.log('OK: No nav/override path collisions.');
}

// ---- 5. Parse static route paths from routes.tsx ----
const routes = read('src/routes.tsx');
const staticRoutePaths = [...routes.matchAll(/path="([^"]+)"/g)].map(m => m[1]);

// ---- 6. Check every static route path is known ----
const unknownRoutes = staticRoutePaths.filter(p => !KNOWN_OVERRIDES.has(p) && !navPaths.has(p));
if (unknownRoutes.length > 0) {
  console.error(`\nERROR: ${unknownRoutes.length} static route paths unknown:`);
  for (const p of unknownRoutes) console.error(`  ${p}`);
  exitCode = 1;
} else {
  console.log(`OK: All ${staticRoutePaths.length} static route paths are known.`);
}

// ---- 7. Count lazy vs eager nav items (informational) ----
const lazyItemCount = (registry.match(/lazy:\s*true/g) || []).length;
const lazyImportCount = (routes.match(/React\.lazy/g) || []).length;
console.log(`INFO: ${lazyItemCount} lazy nav items, ${lazyImportCount} React.lazy imports.`);

// ---- Summary ----
if (exitCode === 0) {
  console.log('\n\u2713 Route sync verified — all clear.');
} else {
  console.error(`\n\u2717 Route sync FAILED. Fix issues above.`);
}
process.exit(exitCode);
