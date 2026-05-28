import http from 'node:http';
import { WebSocketServer } from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'shared-db.bin');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Serialize writes to the file
let writeQueue = Promise.resolve();

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/db') {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(data);
      } else {
        res.writeHead(404);
        res.end('No DB yet');
      }
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
    return;
  }

  if (req.method === 'PUT' && req.url === '/api/db') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      writeQueue = writeQueue.then(() => {
        try {
          fs.writeFileSync(DB_FILE, Buffer.concat(chunks));
          const msg = JSON.stringify({ type: 'db_changed', timestamp: Date.now() });
          for (const client of wss.clients) {
            if (client.readyState === 1) {
              client.send(msg);
            }
          }
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('ok');
        } catch (err) {
          res.writeHead(500);
          res.end(String(err));
        }
      });
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
});

// Clean up disconnected clients every 30s
setInterval(() => {
  for (const client of wss.clients) {
    if (client.readyState !== 1) {
      try { client.terminate(); } catch { /* ignore */ }
    }
  }
}, 30_000);

server.listen(PORT, () => {
  console.log(`[SyncServer] running on http://localhost:${PORT}`);
  console.log(`[SyncServer] storing DB at ${DB_FILE}`);
});
