// Run: node import-keys.mjs
// Loads api-keys-backup.json and writes importable script to import-keys-console.js
import { readFileSync, writeFileSync } from 'fs';

const keys = JSON.parse(readFileSync('api-keys-backup.json', 'utf8'));

const apiKeys = keys.map((k, i) => ({
  id: `imported-${Date.now()}-${i}`,
  provider: k.provider,
  label: k.label,
  key: k.key,
  status: 'active',
  addedAt: Date.now(),
  stats: { requests: 0, errors: 0, totalTokens: 0, extended: { reputationScore: 0 } },
  history: [],
  availableModels: [],
}));

const script = `
// Paste this into browser DevTools console while app is running:
(async () => {
  const keys = ${JSON.stringify(apiKeys, null, 2)};
  const db = window.__DexieDB || (await import('/src/kernel/services/database-service.ts')).dexieDb;
  if (!db) { console.error('Cannot access Dexie DB'); return; }
  await db.apiKeys.bulkPut(keys);
  console.log('Imported', keys.length, 'keys into Dexie. Reload the page.');
})();
`;

writeFileSync('import-keys-console.js', script);
console.log(`Generated import-keys-console.js with ${apiKeys.length} keys.`);
console.log('Open browser DevTools Console and paste the contents.');
