import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import pkg from './package.json' with { type: 'json' }
import type { ProxyOptions } from 'vite'

function withProxyErrorHandler(opts: ProxyOptions): ProxyOptions {
  return {
    ...opts,
    configure: (proxy) => {
      proxy.on('error', (err, _req, res) => {
        if ('writeHead' in res && !res.headersSent) {
          try {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Proxy error', message: err.message, code: 'PROXY_ERROR' }));
          } catch { /* ignore write errors after connection close */ }
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/proxy/gemini': withProxyErrorHandler({
        target: process.env.VITE_PROXY_GEMINI || 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/gemini/, ''),
        secure: true,
      }),
      '/proxy/openrouter': withProxyErrorHandler({
        target: process.env.VITE_PROXY_OPENROUTER || 'https://openrouter.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/openrouter/, ''),
        secure: true,
      }),
      '/proxy/nvidia': withProxyErrorHandler({
        target: process.env.VITE_PROXY_NVIDIA || 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/nvidia/, ''),
        secure: true,
      }),
      '/proxy/groq': withProxyErrorHandler({
        target: process.env.VITE_PROXY_GROQ || 'https://api.groq.com/openai/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/groq/, ''),
        secure: true,
      }),
      '/proxy/cerebras': withProxyErrorHandler({
        target: process.env.VITE_PROXY_CEREBRAS || 'https://api.cerebras.ai/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/cerebras/, ''),
        secure: true,
      }),
      '/proxy/cloudflare': withProxyErrorHandler({
        target: process.env.VITE_PROXY_CLOUDFLARE || 'https://api.cloudflare.com/client/v4',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/cloudflare/, ''),
        secure: true,
      }),
    },
  },
})
