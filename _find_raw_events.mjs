import fs from 'fs';
import path from 'path';

const eventsContent = fs.readFileSync('src/kernel/events/event-names.ts', 'utf8');

// Collect all EVENTS.* constant definitions and their string values
const eventConstToValue = {};
const eventValueSet = new Set();
const re = /export const (\w+)\s*=\s*['"]((?:[^'"]|\\['"])+)['"]/g;
let m;
while ((m = re.exec(eventsContent)) !== null) {
  eventConstToValue[m[1]] = m[2];
  eventValueSet.add(m[2]);
}

console.log('Known EVENTS constants:', Object.keys(eventConstToValue).length);
console.log('Known event string values:', eventValueSet.size);

// Also scan other event files in src/kernel/events/
const eventsDir = 'src/kernel/events';
for (const f of fs.readdirSync(eventsDir)) {
  if (!f.endsWith('.ts') || f === 'event-names.ts') continue;
  const fpath = path.join(eventsDir, f);
  if (fs.statSync(fpath).isFile()) {
    const content = fs.readFileSync(fpath, 'utf8');
    const re2 = /(?:export\s+)?const\s+(\w+)\s*=\s*['"]((?:[^'"]|\\['"])+)['"]/g;
    let m2;
    while ((m2 = re2.exec(content)) !== null) {
      eventConstToValue[m2[1]] = m2[2];
      eventValueSet.add(m2[2]);
    }
  }
}

console.log('After scanning event dir, known values:', eventValueSet.size);

// Find raw event strings across src/
function searchDir(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
        results.push(...searchDir(fullPath));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx') || entry.name.endsWith('.d.ts')) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Check for eventBus.emit or eventBus.on with string literal
          const emitMatch = line.match(/eventBus\.(emit|on)\s*\(\s*(['"])([^'"]+)\2/);
          if (emitMatch) {
            const eventStr = emitMatch[3];
            if (!eventValueSet.has(eventStr)) {
              results.push({
                file: path.relative('src', fullPath),
                line: i + 1,
                raw: eventStr,
                text: line.trim().substring(0, 120)
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('Error scanning', dir, e.message);
  }
  return results;
}

const results = searchDir('src');
console.log('\n=== RAW EVENT STRINGS NOT IN EVENTS.* ===');
for (const r of results) {
  console.log(r.file + ':' + r.line + ' -> "' + r.raw + '"  ' + r.text);
}
console.log('\nTotal raw event strings:', results.length);
