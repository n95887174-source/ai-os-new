import fs from 'fs';
import path from 'path';

function extractKeys(content) {
    const regex = /t\([']([^']+)['"]/g;
    const keys = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        keys.push(match[1]);
    }
    return keys;
}

const enContent = fs.readFileSync('src/i18n/translations/en.ts', 'utf-8');
const definedRegex = /'([\w.]+)'\s*:/g;
const definedKeys = new Set();
let m;
while ((m = definedRegex.exec(enContent)) !== null) {
    definedKeys.add(m[1]);
}
console.log('Keys in en.ts:', definedKeys.size);

const allKeys = new Set();
function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (
            entry.isDirectory() &&
            !entry.name.startsWith('node_modules') &&
            !entry.name.startsWith('dist') &&
            !entry.name.startsWith('.git')
        ) {
            walkDir(full);
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
            const content = fs.readFileSync(full, 'utf-8');
            const keys = extractKeys(content);
            for (const k of keys) allKeys.add(k);
        }
    }
}
walkDir('src');

console.log('Unique t() keys used:', allKeys.size);

const missing = [];
for (const k of allKeys) {
    if (!definedKeys.has(k)) missing.push(k);
}
missing.sort();
console.log('Missing keys:', missing.length);

const ns = {};
for (const k of missing) {
    const prefix = k.split('.')[0];
    ns[prefix] = (ns[prefix] || 0) + 1;
}
const sorted = Object.entries(ns).sort((a, b) => b[1] - a[1]);
console.log('\nTop 25 missing namespaces:');
for (const [name, count] of sorted.slice(0, 25)) {
    console.log('  ' + name + ': ' + count);
}

fs.writeFileSync('missing_keys_list.txt', missing.join('\n'), 'utf-8');
console.log('\nFull list written to missing_keys_list.txt');
