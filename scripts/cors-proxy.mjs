import http from 'http';
import https from 'https';
import { URL } from 'url';
import net from 'net';

const PORT = 3001;

function isPrivateHost(hostname) {
  const parsed = new URL(`http://${hostname}`);
  const h = parsed.hostname;
  return net.isIP(h) ? (
    h.startsWith('127.') || h.startsWith('10.') ||
    h.startsWith('192.168.') || h.startsWith('172.16.') ||
    h === '0.0.0.0' || h === 'localhost' || h === '::1'
  ) : (
    h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || h.endsWith('.internal')
  );
}

const ALLOWED_DOMAINS = [
  'openrouter.ai',
  'generativelanguage.googleapis.com',
  'integrate.api.nvidia.com',
  'api.groq.com',
  'api.cerebras.ai',
  'api.cloudflare.com',
  'api.openai.com',
];

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const target = url.searchParams.get('url');

  if (!target) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing ?url= parameter' }));
    return;
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid URL' }));
    return;
  }

  if (isPrivateHost(parsed.host)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Blocked: private IP' }));
    return;
  }

  const allowed = ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  if (!allowed) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Blocked: ${parsed.hostname} not in allowlist` }));
    return;
  }

  const client = parsed.protocol === 'https:' ? https : http;

  client.get(target, (proxyRes) => {
    const body = [];
    proxyRes.on('data', (chunk) => body.push(chunk));
    proxyRes.on('end', () => {
      const contentType = proxyRes.headers['content-type'] || 'application/octet-stream';
      res.writeHead(proxyRes.statusCode || 200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end(Buffer.concat(body));
    });
  }).on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  });
});

server.listen(PORT, () => {
  console.log(`[cors-proxy] Listening on http://localhost:${PORT}`);
  console.log(`[cors-proxy] Allowed: ${ALLOWED_DOMAINS.join(', ')}`);
});
