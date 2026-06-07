const fs = require('fs');
const path = process.argv[2];
if (!path) { console.error('usage: node find-dupes.js <file>'); process.exit(1); }
const text = fs.readFileSync(path, 'utf8');
const lines = text.split('\n');
const keyCount = new Map();
const keyLines = new Map();
lines.forEach((line, i) => {
  const m = line.match(/^\s+'([a-zA-Z0-9_.]+)':/);
  if (!m) return;
  const k = m[1];
  keyCount.set(k, (keyCount.get(k) ?? 0) + 1);
  if (!keyLines.has(k)) keyLines.set(k, []);
  keyLines.get(k).push(i + 1);
});
const dups = [...keyCount.entries()].filter(([, c]) => c > 1).sort();
console.log(`File: ${path}`);
console.log(`Total unique keys: ${keyCount.size}, duplicate keys: ${dups.length}`);
for (const [k, c] of dups) {
  console.log(`  ${c}x ${k} @ lines ${keyLines.get(k).join(', ')}`);
}
