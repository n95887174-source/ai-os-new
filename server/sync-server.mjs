import http from 'node:http';
import { WebSocketServer } from 'ws';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'shared-db.bin');

// BLD-10: SYNC_SECRET is required — fail fast at startup. No fallback to empty string.
// In Docker, pass via: docker run -e SYNC_SECRET=<strong-random-token>
const AUTH_TOKEN = process.env.SYNC_SECRET;
if (!AUTH_TOKEN) {
  console.error('[sync-server] FATAL: SYNC_SECRET environment variable is required.');
  console.error('[sync-server] Set via: SYNC_SECRET=<your-secret> node sync-server.mjs');
  process.exit(1);
}
// Expose AUTH_TOKEN for use by verifyClient (avoids shadowing duplicate declaration)
const SYNC_SECRET = AUTH_TOKEN;

const ALLOWED_ORIGINS = (process.env.SYNC_ORIGINS || 'http://localhost:5173').split(',');

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*');
}

function hasAuth(req) {
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
        // C-8: Never expose raw Error objects — sanitize before sending to client
        console.error('[sync-server] GET /db error:', err);
        res.writeHead(500);
        res.end('Internal server error');
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
            // C-8: Never expose raw Error objects to client
            console.error('[sync-server] PUT /db error:', err);
            writeJson(res, 500, { error: 'Internal server error' });
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

// SYNC_SECRET is already validated at startup (above) — guard is unreachable.
const wss = new WebSocketServer({
  server,
  verifyClient: (info, callback) => {
    // SECURITY FIX: Check Sec-WebSocket-Protocol header first (preferred), then Authorization, then query param (deprecated fallback)
    // Sec-WebSocket-Protocol: first value is subprotocol name, second (if any) is the token
    const protocols = info.req.headers['sec-websocket-protocol'];
    if (protocols) {
      const parts = protocols.split(',').map(p => p.trim());
      // Format: "sync-token,<token>" or just "sync-token" without token
      if (parts[0] === 'sync-token' && parts[1] === SYNC_SECRET) {
        callback(true);
        return;
      }
      // If no token provided, reject (no anonymous connections)
      if (parts[0] === 'sync-token' && !parts[1]) {
        callback(false, 4001, 'Authentication required');
        return;
      }
    }
    // Fallback: Authorization header for HTTP API clients
    const auth = info.req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ') && auth.slice(7) === SYNC_SECRET) {
      callback(true);
      return;
    }
    // Extract ?token= from the URL path (used by SharedDbChannel WS client)
    try {
      const url = new URL(info.req.url || '/', 'http://localhost');
      const urlToken = url.searchParams.get('token');
      if (urlToken === SYNC_SECRET) {
        callback(true);
        return;
      }
    } catch { /* ignore parse errors */ }
    // CRIT-11: Reject WebSocket connections from disallowed origins
    const wsOrigin = info.origin || info.req.headers['origin'] || '';
    if (wsOrigin && !isAllowedOrigin(wsOrigin)) {
      callback(false, 403, 'Origin not allowed');
      return;
    }
    callback(false, 401, 'Unauthorized');
  }
});

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
