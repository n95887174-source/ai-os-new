import { spawn } from 'node:child_process';

// Start sync server
const sync = spawn('node', ['server/sync-server.mjs'], {
  stdio: 'pipe',
});
sync.stdout.on('data', (d) => process.stdout.write(`[sync] ${d}`));
sync.stderr.on('data', (d) => process.stderr.write(`[sync] ${d}`));

// Start Vite dev server
const vite = spawn('npx', ['vite', '--host'], {
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  sync.kill();
  vite.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  sync.kill();
  vite.kill();
  process.exit(0);
});
