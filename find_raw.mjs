import fs from 'fs';
import path from 'path';

function searchDir(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '.git', '__pycache__'].includes(entry.name)) continue;
        results.push(...searchDir(fp));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx') || entry.name.endsWith('.d.ts')) continue;
        const content = fs.readFileSync(fp, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const m = line.match(/eventBus\.(emit|on)\s*\(\s*(['"])([^'"]+)\2/);
          if (m && (m[2] === "'" || m[2] === '"')) {
            results.push({
              file: path.relative('src', fp),
              line: i + 1,
              raw: m[3],
              method: m[1]
            });
          }
        }
      }
    }
  } catch (e) {}
  return results;
}

const all = searchDir('src');
console.log('Total raw event strings found:', all.length);

const byFile = {};
for (const r of all) {
  if (!byFile[r.file]) byFile[r.file] = [];
  byFile[r.file].push(r);
}
for (const [file, items] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
  console.log('\n' + file + ':');
  for (const item of items) {
    console.log('  L' + item.line + ' [' + item.method + '] "' + item.raw + '"');
  }
}
