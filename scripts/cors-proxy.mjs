import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = 3001;

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const target = url.searchParams.get('url');

  if (!target) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing ?url= parameter' }));
    return;
  }

  const parsed = new URL(target);
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
  console.log(`[cors-proxy] Usage: http://localhost:${PORT}/fetch?url=https://example.com`);
});
