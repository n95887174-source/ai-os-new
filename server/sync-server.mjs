import http from 'node:http';
import { WebSocketServer } from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'shared-db.bin');
const AUTH_TOKEN = process.env.SYNC_SECRET || '';
const ALLOWED_ORIGINS = (process.env.SYNC_ORIGINS || 'http://localhost:5173').split(',');

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*');
}

function hasAuth(req) {
  if (!AUTH_TOKEN) return true; // no token configured = open (legacy)
  const header = req.headers['authorization'] || '';
  return header === `Bearer ${AUTH_TOKEN}`;
}

function writeJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Serialize writes to the file
let writeQueue = Promise.resolve();

const server = http.createServer((req, res) => {
  const origin = req.headers['origin'] || '';
  // CORS
  if (origin && !isAllowedOrigin(origin)) {
    res.writeHead(403);
    res.end('Origin not allowed');
    return;
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    writeJson(res, 200, { status: 'ok', timestamp: Date.now() });
    return;
  }

  if (req.url === '/api/db') {
    if (!hasAuth(req)) {
      writeJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    if (req.method === 'GET') {
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

    if (req.method === 'PUT') {
      let contentLength = 0;
      req.on('data', (chunk) => {
        contentLength += chunk.length;
        if (contentLength > 50 * 1024 * 1024) {
          req.destroy(new Error('Payload too large'));
        }
      });
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
            writeJson(res, 200, { status: 'ok' });
          } catch (err) {
            writeJson(res, 500, { error: String(err) });
          }
        });
      });
      return;
    }
  }

  // REST API: Debate-as-a-Service
  if (req.method === 'GET' && req.url === '/api/debates') {
    writeJson(res, 200, { debates: [], message: 'Debate-as-a-Service API enabled' });
    return;
  }

  writeJson(res, 404, { error: 'Not found' });
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
