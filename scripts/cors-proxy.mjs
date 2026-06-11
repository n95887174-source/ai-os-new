import http from 'http';
import https from 'https';
import { URL } from 'url';
import net from 'net';

const PORT = 3002;

function isPrivateHost(hostname) {
  const parsed = new URL(`http://${hostname}`);
  const h = parsed.hostname;
  if (!net.isIP(h)) {
    return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || h.endsWith('.internal');
  }
  return isPrivateIP(h);
}

function isPrivateIP(ip) {
  // IPv6
  if (ip.includes(':')) {
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
    if (ip.startsWith('fe80:') || ip.startsWith('fd') || ip.startsWith('fc')) return true;
    return false;
  }
  // IPv4 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
  if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  // 172.16.0.0/12 = 172.16.0.0 - 172.31.255.255
  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  if (ip.startsWith('100.')) {
    const secondOctet = parseInt(ip.split('.')[1], 10);
    if (secondOctet >= 64 && secondOctet <= 127) return true; // CGNAT 100.64.0.0/10
  }
  return ip === '0.0.0.0';
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

  const MAX_SIZE = 100 * 1024 * 1024; // 100MB limit — N-08

  client.get(target, (proxyRes) => {
    let size = 0;
    const body = [];
    proxyRes.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_SIZE) { res.destroy(); return; }  // N-08: abort on oversized response
      body.push(chunk);
    });
    proxyRes.on('end', () => {
      const contentType = proxyRes.headers['content-type'] || 'application/octet-stream';
      res.writeHead(proxyRes.statusCode || 200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end(Buffer.concat(body));
    });
    res.on('error', () => {/* client disconnected */});
  }).on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:5173' });
    res.end(JSON.stringify({ error: err.message }));
  });
});

server.listen(PORT, () => {
  console.log(`[cors-proxy] Listening on http://localhost:${PORT}`);
  console.log(`[cors-proxy] Allowed: ${ALLOWED_DOMAINS.join(', ')}`);
});
