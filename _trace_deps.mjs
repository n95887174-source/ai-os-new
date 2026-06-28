import fs from 'fs';
import path from 'path';

const root = 'src/kernel';

function findImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = [];
    const re = /from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (!m[1].startsWith('.')) continue;
      const resolved = path.resolve(path.dirname(filePath), m[1]);
      let r = path.relative(root, resolved).replace(/\\/g, '/');
      let fullPath = resolved + '.ts';
      if (fs.existsSync(fullPath)) r = r + '.ts';
      else {
        fullPath = resolved + '.tsx';
        if (fs.existsSync(fullPath)) r = r + '.tsx';
        else {
          fullPath = path.join(resolved, 'index.ts');
          if (fs.existsSync(fullPath)) r = r + '/index.ts';
        }
      }
      imports.push(r);
    }
    return imports;
  } catch (e) {
    return [];
  }
}

// Check config-registry imports
const configReg = 'config-registry.ts';
const configImports = findImports(path.join(root, configReg));
console.log('config-registry.ts imports:', configImports);

// Recursively check
for (const imp of configImports) {
  const sub = findImports(path.join(root, imp));
  if (sub.some(s => s.includes('event-bus') || s.includes('logger'))) {
    console.log(imp, 'imports:', sub);
  }
}

// Also check logger-service imports
const loggerService = 'services/logger-service.ts';
const loggerImports = findImports(path.join(root, loggerService));
console.log('\nlogger-service.ts imports:', loggerImports);

// Check what config-registry re-exports eventually hit event-bus
// Check kernel/index.ts barrel
const kernelIndex = findImports(path.join(root, 'index.ts'));
console.log('\nkernel/index.ts imports:', kernelIndex);
for (const imp of kernelIndex) {
  const sub = findImports(path.join(root, imp));
  if (sub.some(s => s.includes('event-bus') || s.includes('logger') || s.includes('config'))) {
    console.log(imp, 'imports:', sub);
  }
}

// Check runtime.ts imports chain
const runtime = 'runtime.ts';
const runtimeImports = findImports(path.join(root, runtime));
console.log('\nruntime.ts imports:', runtimeImports);
for (const imp of runtimeImports) {
  try {
    const sub = findImports(path.join(root, imp));
    if (sub.some(s => s.includes('event-bus'))) {
      console.log(imp, '-> event-bus via:', sub);
    }
  } catch(e) {}
}
