import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import pkg from './package.json' with { type: 'json' }

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
      '/proxy/gemini': {
        target: process.env.VITE_PROXY_GEMINI || 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/gemini/, ''),
        secure: true,
      },
      '/proxy/openrouter': {
        target: process.env.VITE_PROXY_OPENROUTER || 'https://openrouter.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/openrouter/, ''),
        secure: true,
      },
      '/proxy/nvidia': {
        target: process.env.VITE_PROXY_NVIDIA || 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/nvidia/, '/v1'),
        secure: true,
      },
      '/proxy/groq': {
        target: process.env.VITE_PROXY_GROQ || 'https://api.groq.com/openai/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/groq/, ''),
        secure: true,
      },
      '/proxy/cerebras': {
        target: process.env.VITE_PROXY_CEREBRAS || 'https://api.cerebras.ai/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/cerebras/, ''),
        secure: true,
      },
      '/proxy/cloudflare': {
        target: process.env.VITE_PROXY_CLOUDFLARE || 'https://api.cloudflare.com/client/v4',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/cloudflare/, ''),
        secure: true,
      },
    },
  },
})
