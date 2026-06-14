// keep-vite-alive.js - starts vite and keeps it running
const { spawn } = require('child_process');
const path = require('path');

const vite = spawn('npx', ['vite'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  detached: false,
  shell: true
});

vite.on('error', (err) => {
  console.error('Vite failed to start:', err.message);
  process.exit(1);
});

vite.on('exit', (code) => {
  console.log('Vite exited with code:', code);
  process.exit(code);
});

// Keep the process alive
process.stdin.resume();