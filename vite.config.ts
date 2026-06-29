import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json' with { type: 'json' };
import type { ProxyOptions } from 'vite';

function withProxyErrorHandler(opts: ProxyOptions): ProxyOptions {
    return {
        ...opts,
        configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
                if ('writeHead' in res && !res.headersSent) {
                    try {
                        res.writeHead(502, { 'Content-Type': 'application/json' });
                        res.end(
                            JSON.stringify({
                                error: 'Proxy error',
                                message: err.message,
                                code: 'PROXY_ERROR',
                            }),
                        );
                    } catch {
                        /* ignore write errors after connection close */
                    }
                }
            });
        },
    };
}

// https://vite.dev/config/
export default defineConfig({
    base: process.env.VITE_BASE_PATH || '/',
    define: {
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            sql: 'sql.js',
        },
    },
    build: {
        target: 'es2023',
        sourcemap: false,
        minify: 'esbuild',
        chunkSizeWarningLimit: 800,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (
                            id.includes('react') ||
                            id.includes('react-dom') ||
                            id.includes('react-router')
                        ) {
                            return 'vendor-react';
                        }
                        if (id.includes('recharts')) {
                            return 'vendor-charts';
                        }
                        if (id.includes('@xyflow')) {
                            return 'vendor-xyflow';
                        }
                        if (
                            id.includes('lucide') ||
                            id.includes('zustand') ||
                            id.includes('zod') ||
                            id.includes('dexie')
                        ) {
                            return 'vendor-utils';
                        }
                        if (
                            id.includes('@huggingface/transformers') ||
                            id.includes('onnxruntime')
                        ) {
                            return 'vendor-ml';
                        }
                        if (id.includes('framer-motion')) {
                            return 'vendor-motion';
                        }
                        if (id.includes('meriyah')) {
                            return 'vendor-ast';
                        }
                        if (id.includes('sql.js')) {
                            return 'vendor-sqlite';
                        }
                    }
                },
            },
        },
    },
    server: {
        headers: {
            'Content-Security-Policy':
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "connect-src 'self' https://api.allorigins.win https://generativelanguage.googleapis.com https://openrouter.ai https://integrate.api.nvidia.com https://api.groq.com https://api.cerebras.ai https://api.cloudflare.com https://api.openai.com; " +
                "worker-src 'self' blob:; " +
                "img-src 'self' data: blob:;",
        },
        proxy: {
            '/proxy/gemini': withProxyErrorHandler({
                target:
                    process.env.VITE_PROXY_GEMINI || 'https://generativelanguage.googleapis.com',
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
            '/proxy/openai': withProxyErrorHandler({
                target: process.env.VITE_PROXY_OPENAI || 'https://api.openai.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/proxy\/openai/, ''),
                secure: true,
            }),
            '/proxy/fetch': {
                target: process.env.VITE_PROXY_FETCH || 'https://api.allorigins.win/get',
                changeOrigin: true,
                secure: true,
            },
            '/api': {
                target: process.env.VITE_API_UPSTREAM || 'https://api.openrouter.ai',
                changeOrigin: true,
                secure: true,
            },
        },
    },
    preview: {
        port: 5173,
        host: true,
    },
});
